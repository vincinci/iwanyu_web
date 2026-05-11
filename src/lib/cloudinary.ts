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
    retries?: number;
  }
): Promise<{ url: string; publicId: string }> {
  const maxRetries = input.retries ?? 3; // Increased to 3 retries
  const timeoutMs = input.kind === "video" ? 180000 : 120000; // Increased: 3 min for video, 2 min for images
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Wait before retry with exponential backoff (2s, 4s, 8s)
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Retrying upload (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const sig = await getCloudinaryUploadSignature({ folder: input.folder, accessToken: input.accessToken });

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${input.kind}/upload`;
      
      // Log upload attempt for debugging
      console.log(`Starting upload attempt ${attempt + 1}/${maxRetries + 1}:`, {
        filename: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: input.kind,
        cloudName: sig.cloudName
      });

      const result = await new Promise<{ url: string; publicId: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let timedOut = false;
        let startTime = Date.now();

        // Set timeout
        const timeoutId = setTimeout(() => {
          timedOut = true;
          xhr.abort();
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          reject(new Error(`Upload timeout after ${elapsed}s (limit: ${timeoutMs/1000}s). The file may be too large, or Cloudinary may be unreachable. Check your internet connection.`));
        }, timeoutMs);

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable && input.onProgress && !timedOut) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            const speed = e.loaded / ((Date.now() - startTime) / 1000); // bytes per second
            const speedMB = (speed / 1024 / 1024).toFixed(2);
            console.log(`Upload progress: ${percentComplete}% (${speedMB}MB/s)`);
            input.onProgress(percentComplete);
          }
        });

        xhr.addEventListener("load", () => {
          clearTimeout(timeoutId);
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText) as { secure_url?: string; public_id?: string };
              if (!data.secure_url || !data.public_id) {
                reject(new Error("Cloudinary response missing secure_url/public_id"));
              } else {
                console.log(`Upload successful in ${elapsed}s`);
                resolve({ url: data.secure_url, publicId: data.public_id });
              }
            } catch (e) {
              reject(new Error("Failed to parse Cloudinary response"));
            }
          } else {
            const errorMsg = xhr.responseText ? ` - ${xhr.responseText}` : '';
            reject(new Error(`Cloudinary upload failed with status ${xhr.status}${errorMsg}`));
          }
        });

        xhr.addEventListener("error", () => {
          clearTimeout(timeoutId);
          if (!timedOut) {
            reject(new Error("Network error connecting to Cloudinary. This could be due to: firewall/proxy blocking api.cloudinary.com, DNS issues, or internet connectivity problems. Please check your network connection."));
          }
        });

        xhr.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          if (!timedOut) {
            reject(new Error("Upload cancelled"));
          }
        });

        xhr.open("POST", uploadUrl);
        xhr.send(form);
      });
      
      return result; // Success!
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (lastError.message.includes("signature") || lastError.message.includes("401") || lastError.message.includes("403")) {
        throw lastError;
      }
      
      // If not last attempt, continue to retry
      if (attempt < maxRetries) {
        console.log(`Upload attempt ${attempt + 1} failed, retrying...`, lastError.message);
      }
    }
  }
  
  // All retries exhausted
  throw new Error(`Upload failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}

export async function uploadImageToCloudinary(file: File, input: { folder?: string; accessToken: string }) {
  return uploadMediaToCloudinary(file, { kind: "image", folder: input.folder, accessToken: input.accessToken });
}

/**
 * Test connectivity to Cloudinary API
 * Returns true if Cloudinary is reachable, false otherwise
 */
export async function testCloudinaryConnectivity(): Promise<{ reachable: boolean; message: string }> {
  try {
    // Try to reach Cloudinary's API with a simple HEAD request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch("https://api.cloudinary.com/", {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store"
    });
    
    clearTimeout(timeoutId);
    
    return {
      reachable: true,
      message: "Cloudinary is reachable"
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        reachable: false,
        message: "Cloudinary API connection timed out after 5s. This may indicate network issues, firewall blocking, or DNS problems."
      };
    }
    return {
      reachable: false,
      message: `Cannot reach Cloudinary API: ${error instanceof Error ? error.message : String(error)}. Check your internet connection or network firewall settings.`
    };
  }
}
