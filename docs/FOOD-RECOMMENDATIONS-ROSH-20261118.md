# Food recommendations and Rosh — 18 November 2026

The old related-food selector treated every flat content slug as category food, so unrelated mains and desserts could fill the grid. It also substituted the food hero/banner for missing product photos. Recommendations now require an explicit food pairing or shared province, use source collection paths for category tie-breaking, exclude retired URLs, and only display an actual item image when present. Empty recommendation sections are hidden; genuine text-only recommendations remain usable without a fabricated product image.

Rosh’s selected photo was present on the Food & Culture overview, but the card was intentionally overview-only and the old regional detail page had been retired. Rosh (Rosht) now has a working countrywide dish page at /food-culture/dishes/rosh/, with the latest owner hero and the distinct full-resolution owner platter photo in its explicit gallery. The lower-resolution duplicate platter is not repeated. The card and hospitality links open the new page. Older regional Rosh URLs retain their existing redirect to the dishes index, where the Rosh card now opens the full note; live server redirect rules do not need to change.

Chicken Kabuli is absent from the current active collection and built pages. It remains retired. The screenshot containing it indicates older/stale staging HTML; live staging version could not be checked because both version.json and the page require HTTP authentication (401). No credentials or hosting files were changed.

This is a source/static staging package update, with no production deployment or main merge.
