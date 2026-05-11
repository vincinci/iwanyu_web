import { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
const apiKey = (process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY || "").trim();
const apiSecret = (process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET || "").trim();

function signCloudinaryParams(params: Record<string, string | number>, secret: string) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(sorted + secret).digest("hex");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const folder = "test";
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signCloudinaryParams({ folder, timestamp }, apiSecret);

    // Create a tiny test image (1x1 red pixel PNG)
    const testImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    const formData = new FormData();
    formData.append("file", testImageBase64);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", folder);

    const startTime = Date.now();
    
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    const elapsed = Date.now() - startTime;
    const responseText = await uploadResponse.text();

    if (!uploadResponse.ok) {
      return res.status(200).json({
        success: false,
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        elapsed: `${elapsed}ms`,
        response: responseText,
        signature: signature.substring(0, 10) + '***',
        timestamp,
        folder,
        uploadUrl
      });
    }

    const data = JSON.parse(responseText);

    return res.status(200).json({
      success: true,
      elapsed: `${elapsed}ms`,
      message: "Server-side upload successful!",
      url: data.secure_url,
      publicId: data.public_id,
      size: data.bytes,
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
