import DOMPurify from "dompurify";

// ─────────────────────────────────────────────────────────────
// XSS Protection
// ─────────────────────────────────────────────────────────────

/**
 * Sanitize HTML content to prevent XSS attacks
 * Use this for any user-generated content that might contain HTML
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "a",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "code",
      "pre",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize plain text - removes all HTML tags
 * Use this for content that should never have HTML
 */
export function sanitizeText(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "";
  
  // Only allow http/https URLs
  const allowedProtocols = ["http:", "https:"];
  try {
    const parsed = new URL(url);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return "";
    }
    return url;
  } catch {
    // Try adding https:// prefix
    try {
      const withProtocol = `https://${url}`;
      new URL(withProtocol);
      return withProtocol;
    } catch {
      return "";
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Rate Limiting
// ─────────────────────────────────────────────────────────────

type RateLimitEntry = {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_ATTEMPTS = 5;

/**
 * Check if an action should be rate limited
 * @param key - Unique identifier for the action (e.g., "payment:user123")
 * @param maxAttempts - Maximum attempts allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and remaining attempts
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = RATE_LIMIT_MAX_ATTEMPTS,
  windowMs: number = RATE_LIMIT_WINDOW_MS
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up old entries
  if (entry && now - entry.firstAttempt > windowMs) {
    rateLimitStore.delete(key);
  }

  const current = rateLimitStore.get(key);

  if (!current) {
    rateLimitStore.set(key, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return { allowed: true, remaining: maxAttempts - 1, resetInMs: windowMs };
  }

  // Check if window has expired
  if (now - current.firstAttempt > windowMs) {
    rateLimitStore.set(key, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return { allowed: true, remaining: maxAttempts - 1, resetInMs: windowMs };
  }

  // Increment count
  current.count++;
  current.lastAttempt = now;

  const allowed = current.count <= maxAttempts;
  const remaining = Math.max(0, maxAttempts - current.count);
  const resetInMs = windowMs - (now - current.firstAttempt);

  return { allowed, remaining, resetInMs };
}

/**
 * Clear rate limit for a specific key
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

// ─────────────────────────────────────────────────────────────
// Input Validation
// ─────────────────────────────────────────────────────────────

export const VALIDATION_RULES = {
  // Product
  PRODUCT_TITLE_MIN: 3,
  PRODUCT_TITLE_MAX: 200,
  PRODUCT_DESCRIPTION_MAX: 5000,
  PRODUCT_PRICE_MIN: 100, // RWF
  PRODUCT_PRICE_MAX: 100_000_000, // RWF
  PRODUCT_QUANTITY_MAX: 1_000_000,
  
  // User
  USER_NAME_MIN: 2,
  USER_NAME_MAX: 100,
  USER_EMAIL_MAX: 254,
  USER_PHONE_MIN: 10,
  USER_PHONE_MAX: 15,
  
  // Address
  ADDRESS_MAX: 500,
  CITY_MAX: 100,
  
  // URLs
  URL_MAX: 2048,
  
  // Discount
  DISCOUNT_CODE_MAX: 50,
  DISCOUNT_PERCENTAGE_MAX: 100,
  
  // Media
  MAX_IMAGE_SIZE_MB: 8,
  MAX_VIDEO_SIZE_MB: 50,
  MAX_MEDIA_FILES: 8,
};

/**
 * Validate product title
 */
export function validateProductTitle(title: string): { valid: boolean; error?: string } {
  const trimmed = title.trim();
  
  if (trimmed.length < VALIDATION_RULES.PRODUCT_TITLE_MIN) {
    return { 
      valid: false, 
      error: `Title must be at least ${VALIDATION_RULES.PRODUCT_TITLE_MIN} characters` 
    };
  }
  
  if (trimmed.length > VALIDATION_RULES.PRODUCT_TITLE_MAX) {
    return { 
      valid: false, 
      error: `Title must be less than ${VALIDATION_RULES.PRODUCT_TITLE_MAX} characters` 
    };
  }
  
  // Check for suspicious patterns
  const suspiciousPattern = /<script|javascript:|on\w+=/i;
  if (suspiciousPattern.test(trimmed)) {
    return { valid: false, error: "Title contains invalid characters" };
  }
  
  return { valid: true };
}

/**
 * Validate product description
 */
export function validateProductDescription(description: string): { valid: boolean; error?: string } {
  if (description.length > VALIDATION_RULES.PRODUCT_DESCRIPTION_MAX) {
    return { 
      valid: false, 
      error: `Description must be less than ${VALIDATION_RULES.PRODUCT_DESCRIPTION_MAX} characters` 
    };
  }
  
  return { valid: true };
}

/**
 * Validate price
 */
export function validatePrice(price: number): { valid: boolean; error?: string } {
  if (!Number.isFinite(price) || price <= 0) {
    return { valid: false, error: "Price must be greater than 0" };
  }
  
  if (price < VALIDATION_RULES.PRODUCT_PRICE_MIN) {
    return { 
      valid: false, 
      error: `Price must be at least ${VALIDATION_RULES.PRODUCT_PRICE_MIN} RWF` 
    };
  }
  
  if (price > VALIDATION_RULES.PRODUCT_PRICE_MAX) {
    return { 
      valid: false, 
      error: `Price must be less than ${VALIDATION_RULES.PRODUCT_PRICE_MAX.toLocaleString()} RWF` 
    };
  }
  
  return { valid: true };
}

/**
 * Validate email
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();
  
  if (!trimmed) {
    return { valid: false, error: "Email is required" };
  }
  
  if (trimmed.length > VALIDATION_RULES.USER_EMAIL_MAX) {
    return { valid: false, error: "Email is too long" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address" };
  }
  
  return { valid: true };
}

/**
 * Validate phone number (basic validation)
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const digits = phone.replace(/\D/g, "");
  
  if (digits.length < VALIDATION_RULES.USER_PHONE_MIN) {
    return { valid: false, error: "Phone number is too short" };
  }
  
  if (digits.length > VALIDATION_RULES.USER_PHONE_MAX) {
    return { valid: false, error: "Phone number is too long" };
  }
  
  return { valid: true };
}

/**
 * Validate URL
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: "URL is required" };
  }
  
  if (url.length > VALIDATION_RULES.URL_MAX) {
    return { valid: false, error: "URL is too long" };
  }
  
  const sanitized = sanitizeUrl(url);
  if (!sanitized) {
    return { valid: false, error: "Invalid URL format" };
  }
  
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────
// CSRF Protection
// ─────────────────────────────────────────────────────────────

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Store CSRF token in sessionStorage
 */
export function storeCsrfToken(token: string): void {
  try {
    sessionStorage.setItem("iwanyu:csrf-token", token);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get stored CSRF token
 */
export function getCsrfToken(): string | null {
  try {
    return sessionStorage.getItem("iwanyu:csrf-token");
  } catch {
    return null;
  }
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string): boolean {
  const stored = getCsrfToken();
  if (!stored) return false;
  
  // Constant-time comparison to prevent timing attacks
  if (token.length !== stored.length) return false;
  
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ stored.charCodeAt(i);
  }
  
  return result === 0;
}

// ─────────────────────────────────────────────────────────────
// Secure Storage
// ─────────────────────────────────────────────────────────────

/**
 * Securely store sensitive data with encryption (basic)
 * Note: This is not military-grade encryption, just obfuscation
 */
export function secureStore(key: string, value: string): void {
  try {
    // Simple XOR obfuscation with random key
    const obfuscationKey = generateCsrfToken().slice(0, 16);
    const encoded = btoa(value);
    let obfuscated = "";
    
    for (let i = 0; i < encoded.length; i++) {
      obfuscated += String.fromCharCode(
        encoded.charCodeAt(i) ^ obfuscationKey.charCodeAt(i % obfuscationKey.length)
      );
    }
    
    const payload = btoa(obfuscationKey + "::" + obfuscated);
    sessionStorage.setItem(`iwanyu:secure:${key}`, payload);
  } catch {
    // Fallback to plain storage
    sessionStorage.setItem(`iwanyu:secure:${key}`, value);
  }
}

/**
 * Retrieve securely stored data
 */
export function secureRetrieve(key: string): string | null {
  try {
    const payload = sessionStorage.getItem(`iwanyu:secure:${key}`);
    if (!payload) return null;
    
    const decoded = atob(payload);
    const separatorIndex = decoded.indexOf("::");
    
    if (separatorIndex === -1) {
      // Legacy plain storage
      return decoded;
    }
    
    const obfuscationKey = decoded.slice(0, separatorIndex);
    const obfuscated = decoded.slice(separatorIndex + 2);
    
    let deobfuscated = "";
    for (let i = 0; i < obfuscated.length; i++) {
      deobfuscated += String.fromCharCode(
        obfuscated.charCodeAt(i) ^ obfuscationKey.charCodeAt(i % obfuscationKey.length)
      );
    }
    
    return atob(deobfuscated);
  } catch {
    return null;
  }
}

/**
 * Clear secure storage
 */
export function secureClear(key: string): void {
  try {
    sessionStorage.removeItem(`iwanyu:secure:${key}`);
  } catch {
    // Ignore
  }
}
