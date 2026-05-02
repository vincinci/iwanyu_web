import { useCallback, useRef, useState } from "react";
import { checkRateLimit, type VALIDATION_RULES } from "@/lib/security";

interface UseRateLimitOptions {
  maxAttempts?: number;
  windowMs?: number;
  key?: string;
}

interface RateLimitState {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
  isRateLimited: boolean;
}

/**
 * Hook for rate limiting actions
 * Prevents users from spamming buttons or making too many requests
 */
export function useRateLimit(options: UseRateLimitOptions = {}) {
  const {
    maxAttempts = 5,
    windowMs = 60 * 1000, // 1 minute
    key: defaultKey = "default",
  } = options;

  const [state, setState] = useState<RateLimitState>({
    allowed: true,
    remaining: maxAttempts,
    resetInMs: windowMs,
    isRateLimited: false,
  });

  const checkAction = useCallback(
    (actionKey?: string): boolean => {
      const key = actionKey || defaultKey;
      const result = checkRateLimit(key, maxAttempts, windowMs);

      setState({
        ...result,
        isRateLimited: !result.allowed,
      });

      return result.allowed;
    },
    [defaultKey, maxAttempts, windowMs]
  );

  const reset = useCallback(() => {
    setState({
      allowed: true,
      remaining: maxAttempts,
      resetInMs: windowMs,
      isRateLimited: false,
    });
  }, [maxAttempts, windowMs]);

  return {
    ...state,
    checkAction,
    reset,
  };
}

/**
 * Hook for debouncing function calls
 * Useful for search inputs, resize handlers, etc.
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * Hook for throttling function calls
 * Ensures function is called at most once per specified period
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const inThrottle = useRef(false);

  return useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args);
        inThrottle.current = true;
        setTimeout(() => {
          inThrottle.current = false;
        }, limit);
      }
    },
    [callback, limit]
  );
}

/**
 * Hook for preventing double-clicks on buttons
 * Returns a wrapped handler that disables for a specified duration
 */
export function usePreventDoubleClick<T extends (...args: unknown[]) => unknown | Promise<unknown>>(
  callback: T,
  cooldownMs: number = 2000
): {
  handler: (...args: Parameters<T>) => Promise<void>;
  isProcessing: boolean;
  timeRemaining: number;
} {
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handler = useCallback(
    async (...args: Parameters<T>) => {
      if (isProcessing) return;

      setIsProcessing(true);
      setTimeRemaining(cooldownMs);

      // Countdown timer
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 100) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 100;
        });
      }, 100);

      try {
        await callback(...args);
      } finally {
        // Keep disabled for cooldown period
        timeoutRef.current = setTimeout(() => {
          setIsProcessing(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }, cooldownMs);
      }
    },
    [callback, cooldownMs, isProcessing]
  );

  return {
    handler,
    isProcessing,
    timeRemaining,
  };
}

/**
 * Hook for form submission with rate limiting
 * Combines rate limiting with loading state
 */
export function useFormSubmit<T extends Record<string, unknown>>(
  onSubmit: (data: T) => Promise<void>,
  options: {
    rateLimitKey?: string;
    maxAttempts?: number;
    cooldownMs?: number;
  } = {}
) {
  const { rateLimitKey = "form-submit", maxAttempts = 3, cooldownMs = 3000 } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(maxAttempts);

  const submit = useCallback(
    async (data: T) => {
      // Check rate limit
      const rateLimitResult = checkRateLimit(rateLimitKey, maxAttempts, 60 * 1000);
      
      if (!rateLimitResult.allowed) {
        const minutes = Math.ceil(rateLimitResult.resetInMs / 60000);
        setError(`Too many attempts. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`);
        return;
      }

      setAttemptsRemaining(rateLimitResult.remaining);
      setIsSubmitting(true);
      setError(null);

      try {
        await onSubmit(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        throw err;
      } finally {
        // Keep submitting state for cooldown
        setTimeout(() => {
          setIsSubmitting(false);
        }, cooldownMs);
      }
    },
    [onSubmit, rateLimitKey, maxAttempts, cooldownMs]
  );

  return {
    submit,
    isSubmitting,
    error,
    attemptsRemaining,
    clearError: () => setError(null),
  };
}
