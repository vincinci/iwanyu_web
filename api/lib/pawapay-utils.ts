// api/lib/pawapay-utils.ts
// PawaPay API Utilities and Helper Functions

const PAWAPAY_API_BASE = 'https://api.pawapay.io';

export interface PawaPay Correspondent {
  code: string;
  name: string;
  country: string;
}

export interface PredictProviderResponse {
  correspondent: string;
  country: string;
  confidence: string;
}

export interface AvailabilityResponse {
  country: string;
  correspondent: string;
  status: string;
  operationType: string;
}

/**
 * Check deposit status
 * GET https://api.pawapay.io/deposits/{depositId}
 */
export async function checkDepositStatus(
  depositId: string,
  apiKey: string
): Promise<any> {
  const response = await fetch(`${PAWAPAY_API_BASE}/deposits/${depositId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to check deposit status: ${error}`);
  }

  return response.json();
}

/**
 * Check payout status
 * GET https://api.pawapay.io/payouts/{payoutId}
 */
export async function checkPayoutStatus(
  payoutId: string,
  apiKey: string
): Promise<any> {
  const response = await fetch(`${PAWAPAY_API_BASE}/payouts/${payoutId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to check payout status: ${error}`);
  }

  return response.json();
}

/**
 * Predict mobile money provider from phone number
 * POST https://api.pawapay.io/predict-provider
 * POST https://api.pawapay.io/v2/predict-provider (v2)
 */
export async function predictProvider(
  phoneNumber: string,
  apiKey: string,
  useV2 = false
): Promise<PredictProviderResponse> {
  const endpoint = useV2 ? `${PAWAPAY_API_BASE}/v2/predict-provider` : `${PAWAPAY_API_BASE}/predict-provider`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ msisdn: phoneNumber }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to predict provider: ${error}`);
  }

  return response.json();
}

/**
 * Check availability for a country/operation type
 * GET https://api.pawapay.io/availability?country={ISO}&operationType=PAYOUT
 */
export async function checkAvailability(
  countryCode: string,
  operationType: 'DEPOSIT' | 'PAYOUT',
  apiKey: string
): Promise<AvailabilityResponse[]> {
  const response = await fetch(
    `${PAWAPAY_API_BASE}/availability?country=${countryCode}&operationType=${operationType}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to check availability: ${error}`);
  }

  return response.json();
}

/**
 * Get correspondent name by code
 */
export function getCorrespondentName(code: string): string {
  const correspondents: Record<string, string> = {
    // Rwanda
    'MTN_MOMO_RWA': 'MTN Mobile Money Rwanda',
    'AIRTEL_RWA': 'Airtel Money Rwanda',
    
    // Kenya
    'MPESA_KEN': 'M-Pesa Kenya',
    
    // Uganda
    'MTN_MOMO_UGA': 'MTN Mobile Money Uganda',
    'AIRTEL_UGA': 'Airtel Money Uganda',
    
    // Tanzania
    'VODACOM_TZA': 'Vodacom M-Pesa Tanzania',
    'TIGO_TZA': 'Tigo Pesa Tanzania',
    'AIRTEL_TZA': 'Airtel Money Tanzania',
    'HALOTEL_TZA': 'Halotel Tanzania',
    
    // Zambia
    'MTN_MOMO_ZMB': 'MTN Mobile Money Zambia',
    'ZAMTEL_ZMB': 'Zamtel Kwacha Zambia',
    
    // Ghana
    'MTN_MOMO_GHA': 'MTN Mobile Money Ghana',
    'VODAFONE_GHA': 'Vodafone Cash Ghana',
    
    // DRC
    'VODACOM_COD': 'Vodacom M-Pesa DRC',
    'AIRTEL_COD': 'Airtel Money DRC',
    'ORANGE_COD': 'Orange Money DRC',
    
    // Cameroon
    'MTN_MOMO_CMR': 'MTN Mobile Money Cameroon',
    'ORANGE_CMR': 'Orange Money Cameroon',
    
    // Senegal
    'ORANGE_SEN': 'Orange Money Senegal',
    'FREE_SEN': 'Free Money Senegal',
    
    // Ivory Coast
    'MTN_MOMO_CIV': 'MTN Mobile Money Ivory Coast',
    'ORANGE_CIV': 'Orange Money Ivory Coast',
    
    // Mozambique
    'VODACOM_MOZ': 'Vodacom M-Pesa Mozambique',
    
    // Malawi
    'AIRTEL_MWI': 'Airtel Money Malawi',
    'TNM_MWI': 'TNM Mpamba Malawi',
  };

  return correspondents[code] || code;
}

/**
 * Get country code from phone number
 */
export function getCountryFromPhone(phoneNumber: string): string | null {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  const countryMap: Record<string, string> = {
    '250': 'RWA', // Rwanda
    '254': 'KEN', // Kenya
    '256': 'UGA', // Uganda
    '255': 'TZA', // Tanzania
    '260': 'ZMB', // Zambia
    '233': 'GHA', // Ghana
    '243': 'COD', // DRC
    '237': 'CMR', // Cameroon
    '221': 'SEN', // Senegal
    '225': 'CIV', // Ivory Coast
    '258': 'MOZ', // Mozambique
    '265': 'MWI', // Malawi
    '257': 'BDI', // Burundi
    '242': 'COG', // Congo-Brazzaville
    '229': 'BEN', // Benin
    '241': 'GAB', // Gabon
    '232': 'SLE', // Sierra Leone
  };

  for (const [prefix, countryCode] of Object.entries(countryMap)) {
    if (cleanPhone.startsWith(prefix)) {
      return countryCode;
    }
  }

  return null;
}

/**
 * Format phone number to international format
 */
export function formatPhoneNumber(phoneNumber: string): string {
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add + if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Must be between 10-15 digits
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false;
  }
  
  // Must start with a valid country code
  return getCountryFromPhone(phoneNumber) !== null;
}
