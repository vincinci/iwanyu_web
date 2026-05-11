// api/pawapay-test.ts
// Test endpoint to verify PawaPay configuration
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const config = {
    hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasPawapayKey: !!process.env.PAWAPAY_API_KEY,
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'production',
  };

  return res.status(200).json({
    status: 'ok',
    message: 'PawaPay API configuration test',
    config,
    timestamp: new Date().toISOString(),
  });
}
