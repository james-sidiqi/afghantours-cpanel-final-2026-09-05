# AfghanTours Cleaned Data Package

Use the CSV files in `/data/` as the working data files for the Astro project.

## Files to save in the project data folder
- attraction_access_classification.csv
- attraction_time_profile.csv
- attractions_master.csv
- dishes.csv
- domestic_flights.csv
- faq.csv
- ground_transport.csv
- hotel_properties.csv
- hotel_rooms.csv
- hub_to_attraction_access.csv
- locations.csv
- pricing_reference.csv
- provinces.csv
- regions.csv
- route_access_classification.csv
- route_group_members.csv
- route_groups.csv
- route_matrix.csv
- site_search_index.csv
- tour_attractions_map.csv
- tour_dates.csv
- tour_inclusions.csv
- tour_itinerary.csv
- tours.csv

## Optional derived/archive files
These are included only for reference. Do not rely on them as primary sources unless the code explicitly imports them.
- attraction_operational_profile.csv
- province_content_summary.csv
- site_data_mapping.csv
- tour_day_operational_map.csv

## Key cleanup decisions
- `attractions_master.csv` now uses `hero_image`, `card_image`, `gallery_folder`, and `map_image`.
- Old attraction image fields such as `thumbnail_path`, `image_path`, `svg_path`, and `map_image_path` were removed from the master file.
- Attraction map paths now follow `/assets/maps/provinces/[province_slug]-map.webp`.
- Attraction hero paths now follow `/assets/images/attractions/[slug]/hero.webp`.
- Wakhan Corridor and Mount Noshaq are the only attraction rows marked `permit_required=TRUE` based on your instruction.
- Province image paths now follow `/assets/images/province/[province_slug]/hero.webp`.
- Province map paths now follow `/assets/maps/provinces/[province_slug]-map.webp`.
- Tour image paths were normalized to `/assets/images/tours/featured/[slug]/...` or `/assets/images/tours/custom/[slug]/...` based on your current folder architecture.
- No JOW/JAW or PTA/PIA code changes were made.

## Immediate manual checks still recommended
- Confirm exact coordinates for BMY-007 Chehel Burj Bamyan Ruins.
- Confirm exact coordinates for NIM-001 Nimroz Citadel.
- Confirm whether any tour pages still expect old `/assets/images/tours/[slug]/hero.webp` paths. If yes, update the Astro image helper to read the new CSV paths.
