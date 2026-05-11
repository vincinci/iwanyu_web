import { VercelRequest, VercelResponse } from "@vercel/node";

const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
const apiKey = (process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY || "").trim();
const apiSecret = (process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET || "").trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Test endpoint to verify environment variables
  
  const info = {
    cloudName: {
      value: cloudName,
      length: cloudName.length,
      hasNewline: cloudName.includes('\n'),
      charCodes: cloudName.split('').map(c => c.charCodeAt(0))
    },
    apiKey: {
      value: apiKey.substring(0, 8) + '***',
      length: apiKey.length,
      hasNewline: apiKey.includes('\n'),
    },
    apiSecret: {
      value: apiSecret.substring(0, 8) + '***',
      length: apiSecret.length,
      hasNewline: apiSecret.includes('\n'),
    },
    expectedValues: {
      cloudName: 'dtd29j5rx',
      apiKeyStart: '56655782',
      apiSecretStart: 'z9XeFxxs'
    }
  };
  
  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json(info);
}
