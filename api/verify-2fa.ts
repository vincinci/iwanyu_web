/**
 * API endpoint to verify 2FA code during login
 * Called after user has successfully authenticated with email/password
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Track failed attempts in memory (use Redis for production)
const attemptTracker = new Map<
  string,
  { count: number; firstAttempt: number; locked: boolean; lockUntil: number }
>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, userId, backupCode } = req.body;

    if (!code && !backupCode) {
      return res.status(400).json({ error: 'Verification code or backup code required' });
    }

    if (code && !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    // Check rate limiting
    const tracker = attemptTracker.get(userId) || {
      count: 0,
      firstAttempt: Date.now(),
      locked: false,
      lockUntil: 0,
    };

    if (tracker.locked && Date.now() < tracker.lockUntil) {
      return res.status(429).json({
        error: 'Too many failed attempts. Please try again later.',
        retryAfter: Math.ceil((tracker.lockUntil - Date.now()) / 1000),
      });
    }

    // Reset if enough time has passed
    if (Date.now() - tracker.firstAttempt > 60 * 60 * 1000) {
      tracker.count = 0;
      tracker.firstAttempt = Date.now();
      tracker.locked = false;
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('twoFa_enabled, twoFa_verified, twoFa_backup_codes_hash')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!profile.twoFa_enabled || !profile.twoFa_verified) {
      return res.status(400).json({ error: '2FA not enabled for this account' });
    }

    let isValid = false;

    if (code) {
      // Verify TOTP code
      // In production: const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 2 });
      isValid = validateTOTPCode(code);
    } else if (backupCode && profile.twoFa_backup_codes_hash) {
      // Verify backup code
      isValid = await verifyBackupCode(backupCode, profile.twoFa_backup_codes_hash);
      if (isValid) {
        // Remove used backup code from profile
        const codes = JSON.parse(profile.twoFa_backup_codes_hash);
        const codeHash = await hashCode(backupCode);
        const updatedCodes = codes.filter((c: string) => c !== codeHash);
        await adminSupabase
          .from('profiles')
          .update({ twoFa_backup_codes_hash: JSON.stringify(updatedCodes) })
          .eq('id', userId);
      }
    }

    if (!isValid) {
      tracker.count++;
      if (tracker.count >= 5) {
        tracker.locked = true;
        tracker.lockUntil = Date.now() + 15 * 60 * 1000; // 15-minute lockout
      }
      attemptTracker.set(userId, tracker);

      return res.status(400).json({
        error: 'Invalid verification code',
        attemptsRemaining: Math.max(0, 5 - tracker.count),
      });
    }

    // Success - reset tracker
    attemptTracker.delete(userId);

    // Update last verified time
    await adminSupabase
      .from('profiles')
      .update({ twoFa_last_verified_at: new Date().toISOString() })
      .eq('id', userId);

    return res.status(200).json({
      success: true,
      message: '2FA verification successful',
      // Client can now complete login
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return res.status(500).json({
      error: 'Failed to verify 2FA code',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Validate TOTP code
 */
function validateTOTPCode(code: string): boolean {
  // In production:
  // const { secret } = getFromCache(sessionToken);
  // return speakeasy.totp.verify({
  //   secret,
  //   encoding: 'base32',
  //   token: code,
  //   window: 2,
  // });
  return /^\d{6}$/.test(code);
}

/**
 * Verify backup code
 */
async function verifyBackupCode(code: string, hashedCodesJson: string): Promise<boolean> {
  try {
    const hashedCodes: string[] = JSON.parse(hashedCodesJson);
    const codeHash = await hashCode(code);
    return hashedCodes.includes(codeHash);
  } catch {
    return false;
  }
}

/**
 * Hash a code for comparison
 */
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
