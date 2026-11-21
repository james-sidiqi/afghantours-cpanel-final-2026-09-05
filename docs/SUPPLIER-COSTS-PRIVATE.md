# Supplier costs are private — 21 November 2026

On James's instruction (21 November 2026), internal supplier costs and other commercially sensitive costing records are **not** kept in this public website repository.

Removed from the public datasets and documentation:

* `data/hotel_rooms.csv` — the nightly supplier-cost columns. Public hotel names, room categories, occupancy, descriptions and images are unchanged.
* `data/domestic_flights.csv` — the supplier fare column. Routes, airlines and maps are unchanged.
* `data/pricing_reference.csv` — the supplier cost reference table (removed entirely; no website page read it).
* `docs/HOTEL-ROOM-COSTS-20261119.md` and `docs/OPERATING-COST-GAPS-20261119.md` — supplier-cost notes.

The cost records are held outside GitHub for import into the private staff quotation system. Do not add supplier costs, net rates, exchange or fuel assumptions, markups or margins to this repository, its `dist/` build or any release asset. Public "From $X" tour prices and advertised hotel price categories (`$`/`$$`/`$$$`) remain public display data.

Earlier commits on this repository still contain the removed values; history has **not** been rewritten (that requires James's approval).
