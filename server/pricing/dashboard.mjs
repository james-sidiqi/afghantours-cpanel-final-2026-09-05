import { CATEGORIES, calculateQuote } from './engine.mjs';

/**
 * Server-side staff dashboard model. Do not expose this payload through public
 * itinerary APIs: it contains supplier costs and staff margin controls.
 * Caller MUST enforce authenticated staff authorization before invoking.
 */
export function buildStaffDashboard(quoteInput, { authorized = false } = {}) {
  if (!authorized) throw new Error('Staff authorization required');
  const quote = calculateQuote(quoteInput);
  return {
    visibility: 'staff_only',
    approval: { status: 'draft', canSendFinalQuote: false, requiresStaffApproval: true },
    rows: quote.items.map(item => ({
      id: item.id, description: item.description, category: item.category,
      supplierCostUsd: item.supplierUsd, overheadUsd: item.overheadUsd,
      marginPercent: item.margin * 100, sellingPriceUsd: item.priceUsd,
      discountAllocatedUsd: item.discountUsd, profitUsd: item.profitUsd
    })),
    categoryProfit: quote.categories,
    totals: quote.totals,
    supportedCategories: CATEGORIES,
    paymentOptions: ['cash', 'domestic_bank_transfer', 'international_wire', 'hesabpay', 'card', 'other'],
    discountControls: ['percent', 'fixed'],
    warning: 'Estimated rates require supplier and operational verification before final approval.'
  };
}

/** Strictly customer-safe estimate projection; strips all supplier and margin data. */
export function buildPublicEstimate(quoteInput) {
  const quote = calculateQuote(quoteInput);
  return {
    status: quote.status, currency: quote.currency,
    items: quote.items.map(({ id, description, category, priceUsd }) => ({
      id, description, category, estimatedPriceUsd: priceUsd
    })),
    estimatedTotalUsd: quote.totals.payableUsd,
    discountUsd: quote.totals.discountUsd,
    paymentChargesUsd: Math.round((quote.totals.cardFeeUsd + quote.totals.providerFeeUsd + quote.totals.fxUsd) * 100) / 100,
    taxUsd: quote.totals.taxUsd,
    notice: 'Indicative estimate only. Availability, inclusions, and final price require written staff approval.'
  };
}
