/**
 * AfghanTours hybrid pricing engine, v1.
 * All money is represented in USD. AFN supplier costs convert using the approved
 * exchange rate. This module must run server-side for actual staff quotations.
 * Never bundle supplier costs, margins or this module into the public site.
 */
export const DEFAULT_POLICY = Object.freeze({
  afnPerUsd: 65, overheadRate: 0.08, margin: 0.40,
  cardRate: 0.025, fxRate: 0.02, provisionalTaxRate: 0.04,
  standardDepositRate: 0.25, balanceDueDays: 30,
});
export const CATEGORIES = Object.freeze([
  'Transportation', 'Accommodation', 'Food & Beverages',
  'Attractions & Activities', 'Staff', 'Administration'
]);
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
const finite = (n, label) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(label + ' must be finite');
  return n;
};
export function calculateQuote(input, policy = DEFAULT_POLICY) {
  if (!input || !Array.isArray(input.items) || !input.items.length) throw new Error('At least one item is required');
  const fx = finite(policy.afnPerUsd, 'AFN/USD');
  if (fx <= 0) throw new Error('AFN/USD must be positive');
  const overheadRate = finite(policy.overheadRate, 'overheadRate');
  if (overheadRate < 0) throw new Error('Negative overhead');
  const rows = input.items.map((item, index) => {
    if (!CATEGORIES.includes(item.category)) throw new Error('Unknown category at item ' + index);
    const cost = finite(item.supplierCost, 'supplierCost');
    const qty = finite(item.quantity ?? 1, 'quantity');
    if (cost < 0 || qty < 0) throw new Error('Negative supplier cost or quantity');
    if (!['USD', 'AFN'].includes(item.currency)) throw new Error('Invalid currency');
    const margin = finite(item.margin ?? policy.margin, 'margin');
    if (margin < 0 || margin >= 1) throw new Error('Margin must be between 0 and 1 (exclusive)');
    const supplierUsd = cost * qty / (item.currency === 'AFN' ? fx : 1);
    const overheadUsd = supplierUsd * overheadRate;
    const priceUsd = (supplierUsd + overheadUsd) / (1 - margin);
    return { id: item.id ?? String(index), description: item.description ?? '',
      category: item.category, quantity: qty, margin, supplierUsd, overheadUsd,
      priceUsd, discountUsd: 0, profitUsd: 0 };
  });
  const subtotal = rows.reduce((s, r) => s + r.priceUsd, 0);
  const discount = input.discount ?? { type: 'fixed', value: 0 };
  const discountValue = finite(discount.value, 'discount');
  if (discountValue < 0) throw new Error('Negative discount');
  if (!['fixed', 'percent'].includes(discount.type)) throw new Error('Invalid discount type');
  if (discount.type === 'percent' && discountValue > 100) throw new Error('Discount exceeds 100%');
  const discountUsd = discount.type === 'percent' ? subtotal * discountValue / 100 : discountValue;
  if (discountUsd > subtotal + 1e-9) throw new Error('Discount exceeds subtotal');
  for (const r of rows) {
    r.discountUsd = subtotal ? discountUsd * r.priceUsd / subtotal : 0;
    r.profitUsd = r.priceUsd - r.discountUsd - r.supplierUsd - r.overheadUsd;
  }
  const netTourPrice = subtotal - discountUsd;
  // Provisional tax is NOT automatically customer-chargeable. Enable only
  // after the legal treatment and tax base are confirmed.
  if (input.applyProvisionalTax && !input.taxApproved) throw new Error('Tax treatment not approved');
  const taxUsd = input.applyProvisionalTax ? netTourPrice * policy.provisionalTaxRate : 0;
  const fxUsd = input.currencyConversion ? netTourPrice * policy.fxRate : 0;
  const payment = input.paymentMethod ?? 'cash';
  const card = payment === 'card';
  const cardRate = card ? policy.cardRate : 0;
  if (cardRate < 0 || cardRate >= 1) throw new Error('Invalid card rate');
  const bankFeeUsd = finite(input.providerFeeUsd ?? 0, 'providerFeeUsd');
  if (bankFeeUsd < 0) throw new Error('Negative provider fee');
  const beforeCard = netTourPrice + taxUsd + fxUsd + bankFeeUsd;
  const cardFeeUsd = card ? beforeCard / (1 - cardRate) - beforeCard : 0;
  const totalPayable = beforeCard + cardFeeUsd;
  const categories = CATEGORIES.map(category => {
    const subset = rows.filter(r => r.category === category);
    const sum = field => subset.reduce((s, r) => s + r[field], 0);
    return { category, supplierUsd: round(sum('supplierUsd')), overheadUsd: round(sum('overheadUsd')),
      salesUsd: round(sum('priceUsd')), discountUsd: round(sum('discountUsd')),
      profitUsd: round(sum('profitUsd')) };
  });
  const supplierUsd = rows.reduce((s, r) => s + r.supplierUsd, 0);
  const overheadUsd = rows.reduce((s, r) => s + r.overheadUsd, 0);
  const profitUsd = netTourPrice - supplierUsd - overheadUsd;
  const departure = input.departureDate ? new Date(input.departureDate + 'T00:00:00Z') : null;
  if (departure && Number.isNaN(departure.getTime())) throw new Error('Invalid departure date');
  const daysUntilDeparture = departure && input.bookingDate
    ? Math.round((departure - new Date(input.bookingDate + 'T00:00:00Z')) / 86400000) : null;
  const special = ['custom', 'specialist'].includes(input.tourType);
  const depositRate = special ? input.depositRate : (daysUntilDeparture !== null && daysUntilDeparture <= 30 ? 1 : policy.standardDepositRate);
  if (depositRate !== undefined && (depositRate < 0 || depositRate > 1)) throw new Error('Invalid deposit rate');
  const depositUsd = depositRate === undefined ? null : round(totalPayable * depositRate);
  const balanceDueDate = !special && departure
    ? new Date(departure.getTime() - policy.balanceDueDays * 86400000).toISOString().slice(0, 10) : null;
  return {
    status: 'estimate_requires_staff_approval', currency: 'USD',
    items: rows.map(r => ({ ...r, supplierUsd: round(r.supplierUsd), overheadUsd: round(r.overheadUsd),
      priceUsd: round(r.priceUsd), discountUsd: round(r.discountUsd), profitUsd: round(r.profitUsd) })),
    categories, totals: {
      supplierUsd: round(supplierUsd), overheadUsd: round(overheadUsd), subtotalUsd: round(subtotal),
      discountUsd: round(discountUsd), tourPriceUsd: round(netTourPrice), taxUsd: round(taxUsd),
      fxUsd: round(fxUsd), providerFeeUsd: round(bankFeeUsd), cardFeeUsd: round(cardFeeUsd),
      payableUsd: round(totalPayable), profitUsd: round(profitUsd),
      realizedMargin: netTourPrice ? profitUsd / netTourPrice : null,
      depositUsd, balanceUsd: depositUsd === null ? null : round(totalPayable - depositUsd),
      balanceDueDate
    }
  };
}
