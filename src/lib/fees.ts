/**
 * Marketplace fee configuration
 * 
 * Guest service fee: 3% - Added on top of subtotal (customer pays 103%)
 * Host/vendor fee: 7% - Deducted from subtotal (vendor receives 93%)
 * 
 * Example: Item costs 100 RWF
 *   - Customer pays: 100 + 3 = 103 RWF
 *   - Vendor receives: 100 - 7 = 93 RWF
 *   - Platform earns: 3 + 7 = 10 RWF (10% total)
 */

export const GUEST_SERVICE_FEE_RATE = 0.03; // 3%
export const HOST_FEE_RATE = 0.07; // 7%

/**
 * Calculate the guest service fee (3% of subtotal)
 */
export function calculateServiceFee(subtotal: number): number {
  return Math.round(subtotal * GUEST_SERVICE_FEE_RATE);
}

/**
 * Calculate the total amount customer pays (subtotal + 3% service fee)
 */
export function calculateCustomerTotal(subtotal: number): number {
  return Math.round(subtotal * (1 + GUEST_SERVICE_FEE_RATE));
}

/**
 * Calculate the vendor payout (93% of subtotal after 7% host fee)
 */
export function calculateVendorPayout(subtotal: number): number {
  return Math.round(subtotal * (1 - HOST_FEE_RATE));
}

/**
 * Get the full fee breakdown for an order
 */
export function calculateFeeBreakdown(subtotal: number) {
  const serviceFee = calculateServiceFee(subtotal);
  const customerTotal = subtotal + serviceFee;
  const vendorPayout = calculateVendorPayout(subtotal);
  const platformEarnings = subtotal - vendorPayout + serviceFee;

  return {
    subtotal: Math.round(subtotal),
    serviceFee,
    customerTotal,
    vendorPayout,
    platformEarnings,
  };
}
