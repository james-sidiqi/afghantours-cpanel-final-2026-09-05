# AfghanTours — operating cost gaps and source reconciliation
**As of 19 November 2026 | Supplier costs only**

The purpose of this register is to complete **direct supplier operating costs** before constructing any retail selling price. Do not apply markup, overhead allocation, gross margin, card commissions, or other final pricing layers here. Amounts are per the operator's latest notes unless a repository source is explicitly identified. Proposed numbers are not supplier confirmations.

## Already recorded as cost inputs (check supplier freshness, not "missing")

- **Hotel rooms:** 43 room entries, 21 properties in eight hub cities in `data/hotel_rooms.csv`; the nightly costs have AFN and USD columns at 65 AFN/USD. Selling-price column removed. Some supplier verification and season/inclusion fields are absent.
- **Local and American guides:** per-day rates by Kabul/outside-Kabul, guide meals and shared outside-Kabul lodging rules previously recorded. One guide per five guests, with guide seats included when calculating vehicles.
- **Client meals and snacks:** per-person/day rates by Kabul/Herat/Kandahar versus other cities and Standard/Premium/Luxury tiers. Budget meal allowances are not approved; a zero in the older `data/pricing_reference.csv` is not evidence that meals are free.
- **Vehicles:** per-vehicle/day supplier rate schedules, vehicle seat capacities, and fuel consumption assumptions previously supplied. Drivers, their meals and their overnight accommodation are included in the quoted supplier vehicle/day cost; exclude fuel and calculate it separately. Never add a second driver-only fee by default. Small and large bus classes were excluded by owner instruction.
- **Fuel, tolls and permits:** last recorded petrol 87 AFN/L, diesel 85 AFN/L; fuel based on approved route distances, vehicle consumption, plus previously discussed operational distance allowance. Provincial tourist permit 1,000 AFN/person/required province; bank payment fee 20 AFN per payment; airport parking 50 AFN/vehicle/hour per event; Salang Tunnel 100 AFN/crossing.
- **Flights:** owner-approved base one-way per-person fares incl. baggage/taxes for KBL–HRT 132 USD, KBL–KDH 86 USD, and KBL–MAZ 61 USD (opposite-direction treatment subject to airline confirmation). 
- **SATCOM:** 1,300 AFN/tour; required for remote/expedition routes where specified. Optional tailored clothing 1,250 AFN/person.

## Missing supplier quotations or service-specific unit costs

| Priority | Cost item | Required unit and what remains open |
| --- | --- | --- |
| P1 | Paid attractions and site access | AFN/person/site and whether admission is free, paid, seasonal, restricted or included in a permit. Do not represent an unquoted fee as zero. |
| P1 | Activities and specialist guides | Fishing equipment/boat/guide, horse and handler, cycling bicycle/helmet/vehicle support, birding expert/binoculars/vehicle; priced per participant, group, hour or day as appropriate. |
| P1 | Skiing | Ski/boot rentals and local ski guide price validation, instructor if separate, lift or slope/access fee if charged, specialist transport and avalanche equipment/guide where relevant. `data/pricing_reference.csv` contains historical $50/person/day ski rental, not a fresh verified supplier quote. |
| P1 | Northern Buzkashi and cultural visits | Any organizer fees, spectator access, event-day coordination, cultural workshop fees, translators and other service charges; record 'no fee' only when confirmed. |
| P1 | Provincial/rural accommodation | Actual supplier/room rates for overnight tour stops beyond the 8 listed hub cities; Parun Nuristan 2,000 AFN/night was noted but is not in the 43-room hotel catalog. Prioritize Wakhan/Ishkashim, Nuristan, Panjshir, Ghor/Minaret of Jam and other planned overnight stops. |
| P1 | Expeditions (Wakhan, Noshaq, Nuristan) | Cook, field staff, porters, yaks/horses, animal handlers, tent/camp/sleeping gear, cooking gas, local food supply, base-camp transport, extra 4x4 days, communications, and emergency transport; price by day, trip, person, load or animal. |
| P1 | Domestic flights outside three confirmed pairs | Actual airline cost/baggage/taxes for Faizabad and any other routes used by published itineraries; verify changes/refunds and whether local guide flights are required. |
| P2 | Room supplier terms | Quote date, supplier, room inventory, breakfast, heating/AC, additional bed, seasonal/weekend changes, lodging tax if charged, cancellation/deposit and whether rates are net for the agency. Also reconcile historical Kandahar Dubai Inn fan/AC and Continental Guesthouse quotes to exact room types. |
| P2 | Route/vehicle operations | Verified manual distances/travel-day assumptions for planned itineraries, local service fees, extra kilometers/hours, out-of-station repositioning, overnight driver/vehicle supplier inclusions, 4Runner fuel-consumption conflict, and fuel-price freshness. Avoid charging driver meals/lodging twice. |
| P2 | Payments tied to supplier service | Local permit processing/printing, bank fees per actual transaction, any documented ticket-issue or non-refundable service charge; separate these from later marketing overhead or selling fees. |
| P2 | Specialized security/medical/communications | Extra paid escorts if actually required and lawful, first-aid/field medical staffing, evacuation arrangements and emergency vehicle hire, field satellite airtime or satellite-equipment rental beyond the flat SATCOM cost. |

## Repository pricing references requiring reconciliation before cost engine use

1. `data/domestic_flights.csv` currently records `cost_usd=90` for all six KBL–HRT, KBL–MAZ and KBL–KDH flight directions. This conflicts with the more recent operator-supplied 132 / 61 / 86 USD route-specific costs. **Do not automatically quote 90 USD**.
2. `data/pricing_reference.csv` contains old approximate USD vehicle rates and airport/permit conversions that do not reliably reflect the approved 65 AFN/USD calculation. Its default driver costs can duplicate driver costs included in rental packages. Treat as a reference requiring reconciliation, not the approved supplier master.
3. `data/ground_transport.csv` still carries a public `bus` class; the owner explicitly removed small/large buses from the cost calculator. Do not import unsupported bus pricing merely because a marketing transport class exists.
4. Province permit processing costs may appear as a separate $15.75/province in the older reference table; do not include a second 1,000 AFN processing fee unless confirmed by an actual supplier or government receipt.

## Suggested cost schema for each remaining item

`category,location_or_hub,supplier_or_source,service_name,unit,currency,base_supplier_cost,applies_when,included_costs,excluded_costs,season,quote_date,verification_status,notes`

States: `operator-provided`, `supplier-verified`, `estimate`, `pending`, `not-applicable`. A missing quote is pending, not `0`.

**Excluded for this stage:** selling prices, markup, overhead, gross-margin targets, payment processing percentages and tax allowances for future retail quoting. Record any genuine direct supplier tax or government fee as cost, but do not calculate retail tax treatment here.
