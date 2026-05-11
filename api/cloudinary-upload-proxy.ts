import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
const apiKey = (process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY || "").trim();
const apiSecret = (process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET || "").trim();

// Increase max body size for file uploads (50MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  maxDuration: 60, // 60 seconds max execution
};

function signCloudinaryParams(params: Record<string, string | number>, secret: string) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(sorted + secret).digest("hex");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Proxy request:', req.method, req.url);
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Authenticate user
  const authHeader = req.headers.authorization || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const accessToken = tokenMatch?.[1];
  
  if (!accessToken) {
    return res.status(401).json({ error: "Missing Authorization Bearer token" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid session" });
  }

  try {
    // Parse multipart form data
    const form = formidable({ multiples: false, maxFileSize: 50 * 1024 * 1024 }); // 50MB max
    
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req as any, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const kind = Array.isArray(fields.kind) ? fields.kind[0] : fields.kind || "image";
    const folder = Array.isArray(fields.folder) ? fields.folder[0] : fields.folder || "";
    
    // Generate signature
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signCloudinaryParams({ folder, timestamp }, apiSecret);

    // Upload to Cloudinary
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${kind}/upload`;
    
    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", fs.createReadStream(file.filepath));
    cloudinaryForm.append("api_key", apiKey);
    cloudinaryForm.append("timestamp", String(timestamp));
    cloudinaryForm.append("signature", signature);
    cloudinaryForm.append("folder", folder);

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: cloudinaryForm as any,
    });

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return res.status(uploadResponse.status).json({
        error: "Cloudinary upload failed",
        details: errorText
      });
    }

    const data = await uploadResponse.json();

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({
      url: data.secure_url,
      publicId: data.public_id
    });
    
  } catch (error) {
    console.error("Upload proxy error:", error);
    return res.status(500).json({
      error: "Upload failed",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
