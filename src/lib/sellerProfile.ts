export type SellerProfileCompletenessInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
};

export function getSellerProfileMissingFields(input: SellerProfileCompletenessInput): string[] {
  const missing: string[] = [];

  if (!input.name?.trim()) missing.push("store name");
  if (!input.email?.trim()) missing.push("support email");
  if (!input.phone?.trim()) missing.push("support phone");
  if (!input.location?.trim()) missing.push("store location");
  if (!input.description?.trim()) missing.push("store description");
  if (!input.logo_url?.trim()) missing.push("store logo");
  if (!input.banner_url?.trim()) missing.push("store banner");

  return missing;
}

export function isSellerProfileComplete(input: SellerProfileCompletenessInput): boolean {
  return getSellerProfileMissingFields(input).length === 0;
}
