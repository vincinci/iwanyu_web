type CloudinarySignatureResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export async function getCloudinaryUploadSignature(input?: {
  folder?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  accessToken?: string;
}): Promise<CloudinarySignatureResponse> {
  const supabaseUrl = input?.supabaseUrl ?? import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = input?.supabaseAnonKey ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error("Missing VITE_SUPABASE_URL");
  if (!supabaseAnonKey) throw new Error("Missing VITE_SUPABASE_ANON_KEY");
  if (!input?.accessToken) throw new Error("Missing Supabase access token");

  const runtimeHost = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalHost = runtimeHost === "localhost" || runtimeHost === "127.0.0.1";
  const shouldUseSameOriginApi = Boolean(runtimeHost) && !isLocalHost;

  const signUrl = shouldUseSameOriginApi
    ? "/api/cloudinary-sign"
    : `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/cloudinary-sign`;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${input.accessToken}`,
  };

  // The Supabase Edge Function expects apikey; our Vercel function does not.
  if (!shouldUseSameOriginApi) headers.apikey = supabaseAnonKey;

  const res = await fetch(signUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ folder: input?.folder }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to get Cloudinary signature (${res.status}): ${text}`);
  }

  return (await res.json()) as CloudinarySignatureResponse;
}

export type CloudinaryMediaKind = "image" | "video";

export function getOptimizedCloudinaryUrl(url: string, input?: { kind?: CloudinaryMediaKind; width?: number }) {
  const kind = input?.kind ?? "image";
  const width = Math.max(64, Math.min(1600, Number(input?.width ?? 800)));

  if (!url) return url;
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx < 0) return url;

  const transform =
    kind === "video"
      ? `f_auto,q_auto:good,vc_auto,c_limit,w_${width}`
      : `f_auto,q_auto:good,fl_progressive,c_limit,w_${width}`;

  return `${url.slice(0, idx + marker.length)}${transform}/${url.slice(idx + marker.length)}`;
}

export async function uploadMediaToCloudinary(
  file: File,
  input: {
    kind: CloudinaryMediaKind;
    folder?: string;
    accessToken: string;
    onProgress?: (progress: number) => void;
  }
): Promise<{ url: string; publicId: string }> {
  const sig = await getCloudinaryUploadSignature({ folder: input.folder, accessToken: input.accessToken });

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${input.kind}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && input.onProgress) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        input.onProgress(percentComplete);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { secure_url?: string; public_id?: string };
          if (!data.secure_url || !data.public_id) {
            reject(new Error("Cloudinary response missing secure_url/public_id"));
          } else {
            resolve({ url: data.secure_url, publicId: data.public_id });
          }
        } catch (e) {
          reject(new Error("Failed to parse Cloudinary response"));
        }
      } else {
        reject(new Error(`Cloudinary upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"));
    });

    xhr.open("POST", uploadUrl);
    xhr.send(form);
  });
}

export async function uploadImageToCloudinary(file: File, input: { folder?: string; accessToken: string }) {
  return uploadMediaToCloudinary(file, { kind: "image", folder: input.folder, accessToken: input.accessToken });
}
