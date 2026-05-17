import { useState, useCallback } from 'react';
import {
  validateTOTPCodeFormat,
  checkTwoFARateLimit,
  incrementTwoFAAttempt,
  type TwoFAAttemptTracker,
} from '@/lib/2fa';

interface UseTwoFactorVerificationOptions {
  userId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useTwoFactorVerification(options: UseTwoFactorVerificationOptions) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptTracker, setAttemptTracker] = useState<TwoFAAttemptTracker>({
    userId: options.userId,
    attempts: 0,
    firstAttemptTime: Date.now(),
    locked: false,
  });

  const verifyCode = useCallback(
    async (verificationCode: string) => {
      setError(null);

      // Check rate limiting
      if (!checkTwoFARateLimit(attemptTracker)) {
        const errorMsg = 'Too many failed attempts. Please try again in 15 minutes.';
        setError(errorMsg);
        options.onError?.(errorMsg);
        return false;
      }

      // Validate code format
      if (!validateTOTPCodeFormat(verificationCode)) {
        const errorMsg = 'Invalid code format. Please enter a 6-digit code.';
        setError(errorMsg);
        incrementTwoFAAttempt(attemptTracker);
        setAttemptTracker({ ...attemptTracker });
        return false;
      }

      setIsVerifying(true);

      try {
        // Call your backend endpoint to verify the TOTP code
        const response = await fetch('/api/verify-2fa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('2fa_session_token')}`,
          },
          body: JSON.stringify({
            code: verificationCode.replace(/\s/g, ''),
            userId: options.userId,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          const errorMsg = data.error || 'Verification failed';
          setError(errorMsg);
          incrementTwoFAAttempt(attemptTracker);
          setAttemptTracker({ ...attemptTracker });
          options.onError?.(errorMsg);
          return false;
        }

        // Success
        setCode('');
        setAttemptTracker({
          userId: options.userId,
          attempts: 0,
          firstAttemptTime: Date.now(),
          locked: false,
        });
        options.onSuccess?.();
        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Verification error';
        setError(errorMsg);
        options.onError?.(errorMsg);
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [options, attemptTracker]
  );

  const handleVerify = useCallback(async () => {
    return await verifyCode(code);
  }, [code, verifyCode]);

  return {
    code,
    setCode,
    isVerifying,
    error,
    verifyCode: handleVerify,
    remainingAttempts: 5 - attemptTracker.attempts,
    isLocked: attemptTracker.locked,
  };
}

interface UseTwoFactorSetupOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useTwoFactorSetup(options: UseTwoFactorSetupOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [setupStep, setSetupStep] = useState<'init' | 'scan' | 'confirm' | 'backup' | 'complete'>('init');

  const initiate2FASetup = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/setup-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to initiate 2FA setup');
      }

      const data = await response.json();
      setQrCode(data.qrCode);
      setSetupStep('scan');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Setup failed';
      setError(errorMsg);
      options.onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const confirmSetup = useCallback(
    async (verificationCode: string) => {
      setError(null);
      setIsLoading(true);

      try {
        if (!validateTOTPCodeFormat(verificationCode)) {
          throw new Error('Invalid code format');
        }

        const response = await fetch('/api/confirm-2fa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({
            code: verificationCode.replace(/\s/g, ''),
          }),
        });

        if (!response.ok) {
          throw new Error('Verification code incorrect');
        }

        const data = await response.json();
        setBackupCodes(data.backupCodes);
        setSetupStep('backup');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Confirmation failed';
        setError(errorMsg);
        options.onError?.(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const complete2FASetup = useCallback(() => {
    setSetupStep('complete');
    options.onSuccess?.();
  }, [options]);

  const cancel = useCallback(() => {
    setQrCode(null);
    setBackupCodes(null);
    setSetupStep('init');
    setError(null);
  }, []);

  return {
    initiate2FASetup,
    confirmSetup,
    complete2FASetup,
    cancel,
    isLoading,
    error,
    qrCode,
    backupCodes,
    setupStep,
  };
}
