/**
 * Two-Factor Authentication (2FA) utilities
 * Implements TOTP-based 2FA for enhanced security
 */

// Note: For production, install: npm install otpauth
// This implementation provides the foundation; actual TOTP generation happens server-side

export type TwoFactorSecret = {
  secret: string;
  qrCode: string; // Base64-encoded QR code image
};

export type TwoFactorStatus = {
  enabled: boolean;
  verified: boolean;
  backupCodesGenerated: boolean;
};

/**
 * Interface for 2FA methods on user profiles
 * This would be stored in the profiles table
 */
export interface UserTwoFactorConfig {
  twoFa_enabled: boolean;
  twoFa_method: '2fa_disabled' | 'totp'; // Can extend for SMS, email, etc.
  twoFa_verified: boolean;
  twoFa_backup_codes_hash: string | null; // Hashed backup codes
  twoFa_created_at: string | null;
  twoFa_last_verified_at: string | null;
}

/**
 * Verification result when user submits 2FA code
 */
export interface TwoFactorVerificationResult {
  success: boolean;
  error?: string;
  message?: string;
  sessionToken?: string; // Temporary token to complete login
}

/**
 * Generate backup codes for 2FA recovery
 * These should be stored hashed and shown only once to user
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join('-') || '';
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a backup code for secure storage
 * In production, use bcrypt: npm install bcrypt
 */
export async function hashBackupCode(code: string): Promise<string> {
  // For now, use simple hashing (replace with bcrypt in production)
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a backup code against stored hash
 */
export async function verifyBackupCode(
  code: string,
  storedHash: string
): Promise<boolean> {
  const hash = await hashBackupCode(code);
  // Use constant-time comparison to prevent timing attacks
  return constantTimeEqual(hash, storedHash);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  let result = 0;
  const maxLength = Math.max(a.length, b.length);

  for (let i = 0; i < maxLength; i++) {
    const charA = a.charCodeAt(i) || 0;
    const charB = b.charCodeAt(i) || 0;
    result |= charA ^ charB;
  }

  return result === 0;
}

/**
 * Check if 2FA is enabled for user
 */
export function is2FAEnabled(profile: UserTwoFactorConfig): boolean {
  return profile.twoFa_enabled && profile.twoFa_verified;
}

/**
 * Get 2FA status for user
 */
export function get2FAStatus(profile: UserTwoFactorConfig): TwoFactorStatus {
  return {
    enabled: profile.twoFa_enabled,
    verified: profile.twoFa_verified,
    backupCodesGenerated: !!profile.twoFa_backup_codes_hash,
  };
}

/**
 * Validate TOTP code format (6 digits)
 */
export function validateTOTPCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code.replace(/\s/g, ''));
}

/**
 * Calculate time-based one-time password (TOTP) window
 * Used to validate codes with a time tolerance
 */
export function getTOTPTimeWindow(): { current: number; previous: number; next: number } {
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 30; // TOTP uses 30-second windows

  return {
    current: Math.floor(now / timeStep),
    previous: Math.floor((now - timeStep) / timeStep),
    next: Math.floor((now + timeStep) / timeStep),
  };
}

/**
 * Generate setup QR code URL
 * In production, this is generated server-side and returned to client
 *
 * Format for otpauth library:
 * otpauth://totp/{label}?secret={secret}&issuer={issuer}
 */
export function generateOTPAuthURI(
  email: string,
  secret: string,
  issuer: string = 'iwanyu'
): string {
  const encodedEmail = encodeURIComponent(email);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * 2FA setup wizard state
 */
export interface TwoFASetupState {
  step: 'pending' | 'generating' | 'confirming' | 'backup' | 'complete';
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  temporaryToken?: string;
}

/**
 * Error messages for 2FA
 */
export const TWO_FA_ERRORS = {
  INVALID_CODE: 'Invalid verification code. Please try again.',
  CODE_EXPIRED: 'Code expired. Please enter a new code.',
  NOT_ENABLED: '2FA is not enabled for this account.',
  ALREADY_ENABLED: '2FA is already enabled for this account.',
  SETUP_IN_PROGRESS: '2FA setup already in progress.',
  BACKUP_CODE_EXHAUSTED: 'No backup codes remaining.',
  RATE_LIMITED: 'Too many failed attempts. Please try again later.',
};

/**
 * Track failed 2FA attempts for rate limiting
 */
export interface TwoFAAttemptTracker {
  userId: string;
  attempts: number;
  firstAttemptTime: number;
  locked: boolean;
  lockUntil?: number;
}

/**
 * Check if user is rate limited
 */
export function checkTwoFARateLimit(tracker: TwoFAAttemptTracker): boolean {
  const now = Date.now();
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  // If locked, check if lockout has expired
  if (tracker.locked && tracker.lockUntil) {
    if (now > tracker.lockUntil) {
      tracker.locked = false;
      tracker.attempts = 0;
    } else {
      return false; // Still locked
    }
  }

  // Reset attempts if more than 1 hour has passed
  if (now - tracker.firstAttemptTime > 60 * 60 * 1000) {
    tracker.attempts = 0;
    tracker.firstAttemptTime = now;
  }

  // Check if limit exceeded
  if (tracker.attempts >= MAX_ATTEMPTS) {
    tracker.locked = true;
    tracker.lockUntil = now + LOCKOUT_DURATION;
    return false;
  }

  return true;
}

/**
 * Increment failed attempt counter
 */
export function incrementTwoFAAttempt(tracker: TwoFAAttemptTracker): void {
  tracker.attempts++;
  if (tracker.attempts === 1) {
    tracker.firstAttemptTime = Date.now();
  }
}
