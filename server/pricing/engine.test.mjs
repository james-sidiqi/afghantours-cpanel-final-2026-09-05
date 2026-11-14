import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuote } from './engine.mjs';
import { buildStaffDashboard, buildPublicEstimate } from './dashboard.mjs';
const item = (supplierCost = 100) => ({ category: 'Transportation', description: 'SUV', supplierCost, currency: 'USD' });
const quote = (extra = {}) => calculateQuote({ items: [item()], ...extra });
test('8% overhead and 40% margin produce $180 on $100 supplier cost', () => {
  const r = quote();
  assert.equal(r.totals.subtotalUsd, 180);
  assert.equal(r.totals.overheadUsd, 8);
  assert.equal(r.totals.profitUsd, 72);
  assert.equal(r.totals.realizedMargin, 0.4);
});
test('line-item margin overrides work and AFN conversion uses 65', () => {
  const r = calculateQuote({ items: [{...item(6500),currency:'AFN',margin:0.25}] });
  assert.equal(r.totals.subtotalUsd, 144);
});
test('discount reduces realized profit and reconciles categories', () => {
  const r = quote({ discount: {type:'fixed',value:20} });
  assert.equal(r.totals.tourPriceUsd,160);
  assert.equal(r.totals.profitUsd,52);
  assert.equal(r.categories.reduce((sum,x)=>sum+x.profitUsd,0),52);
});
test('card fee only for card, grossed up on amount collected', () => {
  assert.equal(quote({paymentMethod:'cash'}).totals.cardFeeUsd,0);
  assert.equal(quote({paymentMethod:'card'}).totals.cardFeeUsd,4.62);
});
test('FX allowance only on conversion and tax must be approved', () => {
  assert.equal(quote().totals.fxUsd,0);
  assert.equal(quote({currencyConversion:true}).totals.fxUsd,3.6);
  assert.throws(()=>quote({applyProvisionalTax:true}),/not approved/);
});
test('standard 25% deposit, late booking 100%, custom manual terms', () => {
  const normal = quote({tourType:'private',bookingDate:'2027-01-01',departureDate:'2027-03-01'});
  assert.equal(normal.totals.depositUsd,45);
  assert.equal(normal.totals.balanceDueDate,'2027-01-30');
  assert.equal(quote({tourType:'private',bookingDate:'2027-02-10',departureDate:'2027-03-01'}).totals.depositUsd,180);
  assert.equal(quote({tourType:'custom'}).totals.depositUsd,null);
});
test('invalid margins, negative costs, and excessive discounts rejected',()=>{
  assert.throws(()=>calculateQuote({items:[{...item(),margin:1}]}),/Margin/);
  assert.throws(()=>quote({discount:{type:'percent',value:101}}),/Discount/);
  assert.throws(()=>calculateQuote({items:[item(-1)]}),/Negative/);
});
test('dashboard requires staff authorization and public projection hides costs',()=>{
  const input={items:[item()]};
  assert.throws(()=>buildStaffDashboard(input),/authorization/);
  const staff=buildStaffDashboard(input,{authorized:true});
  assert.equal(staff.rows[0].supplierCostUsd,100);
  const publicView=buildPublicEstimate(input);
  assert.equal(publicView.estimatedTotalUsd,180);
  assert.ok(!JSON.stringify(publicView).includes('supplier'));
  assert.ok(!JSON.stringify(publicView).includes('margin'));
});
