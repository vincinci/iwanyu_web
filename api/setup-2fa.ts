/**
 * API endpoint to initiate 2FA setup
 * Generates a secret and QR code for the user to scan
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// In production, use: npm install otpauth qrcode
// For now, this provides the framework

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST from authenticated users
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;

    // Check if 2FA is already enabled
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('twoFa_enabled, twoFa_verified')
      .eq('id', userId)
      .single();

    if (profile?.twoFa_enabled && profile?.twoFa_verified) {
      return res.status(400).json({ error: '2FA is already enabled for this account' });
    }

    // Generate a random secret (base32-encoded)
    // In production, use: const secret = speakeasy.generateSecret({ name: `iwanyu (${userEmail})`, issuer: 'iwanyu' }).base32;
    const secret = generateRandomSecret();
    const qrCode = await generateQRCode(userEmail, secret);

    // Store temporary setup state (not yet verified)
    // Use Redis or Supabase for this in production
    const setupToken = crypto.randomUUID();

    // In production, store this in a secure temporary store
    // For now, return to client (client will send it back with verification)
    return res.status(200).json({
      success: true,
      secret,
      qrCode, // Base64-encoded image
      setupToken,
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return res.status(500).json({
      error: 'Failed to initiate 2FA setup',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Generate a random base32 secret for TOTP
 * In production, use the 'speakeasy' library
 */
function generateRandomSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

/**
 * Generate QR code for TOTP setup
 * In production, use the 'qrcode' library to generate an image
 * For now, return the otpauth URI that client can use with a QR library
 */
async function generateQRCode(email: string, secret: string): Promise<string> {
  // This would use: npm install qrcode
  // const QRCode = require('qrcode');
  // const uri = generateOTPAuthURI(email, secret);
  // const qrCode = await QRCode.toDataURL(uri);
  
  // For now, return placeholder
  // Client can use a library like 'qrcode.react' to display
  const uri = `otpauth://totp/iwanyu:${encodeURIComponent(email)}?secret=${secret}&issuer=iwanyu&algorithm=SHA1&digits=6&period=30`;
  return uri;
}
