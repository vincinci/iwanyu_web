/**
 * Region Detection Service
 * Automatically detects user region and provides appropriate payment methods
 */

import { getSupabaseClient } from "./supabaseClient";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type CountryCode = "RW" | "KE" | "UG" | "NG" | "GH" | "TZ" | "ZM";

export interface CountryInfo {
  code: CountryCode;
  name: string;
  currency: string;
  currencySymbol: string;
  flag: string;
}

export type PaymentProvider = "pawapay";

export interface MobileNetwork {
  id: string;
  name: string;
  shortName: string;
}

export interface CountryPaymentConfig {
  country: CountryInfo;
  providers: PaymentProvider[];
  mobileNetworks: MobileNetwork[];
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  withdrawalFee: number;
}

function normalizeCountryCode(value: unknown): CountryCode | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const upper = normalized.toUpperCase();

  if (upper in COUNTRY_CONFIGS) return upper as CountryCode;

  // ISO-3166 alpha-3
  switch (upper) {
    case "RWA":
      return "RW";
    case "KEN":
      return "KE";
    case "UGA":
      return "UG";
    case "NGA":
      return "NG";
    case "GHA":
      return "GH";
    case "TZA":
      return "TZ";
    case "ZMB":
      return "ZM";
    default:
      break;
  }

  // Common country names (stored in profiles.country)
  switch (upper) {
    case "RWANDA":
      return "RW";
    case "KENYA":
      return "KE";
    case "UGANDA":
      return "UG";
    case "NIGERIA":
      return "NG";
    case "GHANA":
      return "GH";
    case "TANZANIA":
      return "TZ";
    case "ZAMBIA":
      return "ZM";
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Country Configurations
// ─────────────────────────────────────────────────────────────


const COUNTRY_CONFIGS: Record<CountryCode, CountryPaymentConfig> = {
  RW: {
    country: { code: "RW", name: "Rwanda", currency: "RWF", currencySymbol: "RWF", flag: "🇷🇼" },
    providers: ["pawapay"],
    mobileNetworks: [
      { id: "mtn_rw", name: "MTN Rwanda", shortName: "MTN" },
      { id: "airtel_rw", name: "Airtel Rwanda", shortName: "Airtel" },
    ],
    minDeposit: 500,
    maxDeposit: 500000,
    minWithdrawal: 500,
    withdrawalFee: 0,
  },
  KE: {
    country: { code: "KE", name: "Kenya", currency: "KES", currencySymbol: "KSh", flag: "🇰🇪" },
    providers: ["pawapay"],
    mobileNetworks: [
      { id: "mpesa_ke", name: "M-Pesa", shortName: "M-Pesa" },
      { id: "airtel_ke", name: "Airtel Money", shortName: "Airtel" },
    ],
    minDeposit: 100,
    maxDeposit: 500000,
    minWithdrawal: 100,
    withdrawalFee: 0,
  },
  UG: {
    country: { code: "UG", name: "Uganda", currency: "UGX", currencySymbol: "USh", flag: "🇺🇬" },
    providers: ["pawapay"],
    mobileNetworks: [
      { id: "mtn_ug", name: "MTN Uganda", shortName: "MTN" },
      { id: "airtel_ug", name: "Airtel Uganda", shortName: "Airtel" },
    ],
    minDeposit: 500,
    maxDeposit: 500000,
    minWithdrawal: 500,
    withdrawalFee: 0,
  },
  NG: {
    country: { code: "NG", name: "Nigeria", currency: "NGN", currencySymbol: "₦", flag: "🇳🇬" },
    providers: ["pawapay"],
    mobileNetworks: [
      { id: "mtn_ng", name: "MTN Nigeria", shortName: "MTN" },
      { id: "airtel_ng", name: "Airtel Nigeria", shortName: "Airtel" },
      { id: "glo_ng", name: "Glo", shortName: "Glo" },
      { id: "9mobile_ng", name: "9Mobile", shortName: "9Mobile" },
    ],
    minDeposit: 100,
    maxDeposit: 1000000,
    minWithdrawal: 100,
    withdrawalFee: 0,
  },
  GH: {
    country: { code: "GH", name: "Ghana", currency: "GHS", currencySymbol: "₵", flag: "🇬🇭" },
    providers: ["pawapay"],
    mobileNetworks: [
      { id: "mtn_gh", name: "MTN Ghana", shortName: "MTN" },
      { id: "airtel_gh", name: "AirtelTigo", shortName: "AirtelTigo" },
      { id: "vodafone_gh", name: "Vodafone", shortName: "Vodafone" },
    ],
    minDeposit: 1,
    maxDeposit: 50000,
    minWithdrawal: 1,
    withdrawalFee: 0,
  },
  TZ: {
    country: { code: "TZ", name: "Tanzania", currency: "TZS", currencySymbol: "TSh", flag: "🇹🇿" },
    providers: ["pawapay"],
    mobileNetworks: [
      { id: "mtn_tz", name: "MTN Tanzania", shortName: "MTN" },
      { id: "airtel_tz", name: "Airtel Tanzania", shortName: "Airtel" },
      { id: "vodacom_tz", name: "Vodacom", shortName: "Vodacom" },
    ],
    minDeposit: 500,
    maxDeposit: 500000,
    minWithdrawal: 500,
    withdrawalFee: 0,
  },
  ZM: {
    country: { code: "ZM", name: "Zambia", currency: "ZMW", currencySymbol: "ZK", flag: "🇿🇲" },
    providers: ["pawapay"],
    mobileNetworks: [
      { id: "mtn_zm", name: "MTN Zambia", shortName: "MTN" },
      { id: "airtel_zm", name: "Airtel Zambia", shortName: "Airtel" },
    ],
    minDeposit: 1,
    maxDeposit: 50000,
    minWithdrawal: 1,
    withdrawalFee: 0,
  },
};

// ─────────────────────────────────────────────────────────────
// Phone to Country Mapping
// ─────────────────────────────────────────────────────────────

/**
 * Detect country from phone number
 */
export function detectCountryFromPhone(phone: string): CountryCode | null {
  const digits = phone.replace(/\D/g, "");


  if (digits.startsWith("250")) return "RW"; // Rwanda
  if (digits.startsWith("254")) return "KE"; // Kenya
  if (digits.startsWith("256")) return "UG"; // Uganda
  if (digits.startsWith("234") || digits.startsWith("235")) return "NG"; // Nigeria
  if (digits.startsWith("233")) return "GH"; // Ghana
  if (digits.startsWith("255")) return "TZ"; // Tanzania
  if (digits.startsWith("260")) return "ZM"; // Zambia

  return null;
}


/**
 * Detect country from IP address (via IP-API)
 * This is asynchronous and should be called on app init
 */
async function detectCountryFromIP(): Promise<CountryCode | null> {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) return null;


    const data = await response.json();
    const countryCode = data?.country_code as string | null;

    // Map country code to our CountryCode type
    const codeMap: Record<string, CountryCode> = {
      RW: "RW",
      KE: "KE",
      UG: "UG",
      NG: "NG",
      GH: "GH",
      TZ: "TZ",
      ZM: "ZM",
    };


    return codeMap[countryCode ?? ""] ?? null;
  } catch (error) {
    console.error("Failed to detect country from IP:", error);
    return null;
  }
}


/**
 * Get user's country - first try profile, then IP
 */
export async function getUserCountry(): Promise<CountryCode> {
  const supabase = getSupabaseClient();

  try {
    // First, try to get country from user profile
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, country")
        .eq("id", user.id)
        .maybeSingle();

      // Try detect from phone number
      if (profile?.phone) {
        const phoneCountry = detectCountryFromPhone(profile.phone);
        if (phoneCountry) return phoneCountry;
      }

      // Use explicit country if set (either code or name)
      const profileCountry = normalizeCountryCode((profile as { country?: unknown } | null)?.country);
      if (profileCountry) return profileCountry;
    }
  } catch (error) {
    console.error("Failed to get user country from profile:", error);
  }

  // Fallback to IP-based detection
  const ipCountry = await detectCountryFromIP();
  if (ipCountry) return ipCountry;

  // Default to Rwanda if nothing works
  console.warn("Could not detect user country, defaulting to Rwanda");
  return "RW";
}

/**
 * Get payment configuration for a country
 */
export function getPaymentConfig(countryCode: CountryCode): CountryPaymentConfig {
  return COUNTRY_CONFIGS[countryCode] ?? COUNTRY_CONFIGS.RW;
}

/**
 * Get all supported countries
 */
export function getSupportedCountries(): CountryInfo[] {
  return Object.values(COUNTRY_CONFIGS).map(config => config.country);
}

/**
 * Check if a country is supported for payments
 */
export function isCountrySupported(countryCode: string): boolean {
  return countryCode.toUpperCase() in COUNTRY_CONFIGS;
}

/**
 * Get mobile networks for user's country
 */
export async function getUserMobileNetworks(): Promise<MobileNetwork[]> {
  const country = await getUserCountry();
  return COUNTRY_CONFIGS[country].mobileNetworks;
}
