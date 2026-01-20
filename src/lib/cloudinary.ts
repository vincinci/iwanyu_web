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

  const signUrl = import.meta.env.PROD
    ? "/api/cloudinary-sign"
    : `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/cloudinary-sign`;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${input.accessToken}`,
  };

  // The Supabase Edge Function expects apikey; our Vercel function does not.
  if (!import.meta.env.PROD) headers.apikey = supabaseAnonKey;

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
  const res = await fetch(uploadUrl, { method: "POST", body: form });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { secure_url?: string; public_id?: string };
  if (!data.secure_url || !data.public_id) throw new Error("Cloudinary response missing secure_url/public_id");

  return { url: data.secure_url, publicId: data.public_id };
}

export async function uploadImageToCloudinary(file: File, input: { folder?: string; accessToken: string }) {
  return uploadMediaToCloudinary(file, { kind: "image", folder: input.folder, accessToken: input.accessToken });
}
