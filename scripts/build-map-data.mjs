import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const root = process.cwd();
const outDir = path.join(root, "public", "data", "maps");
fs.mkdirSync(outDir, { recursive: true });

function readCsv(relativePath) {
  return parse(fs.readFileSync(path.join(root, relativePath), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const provinces = readCsv("data/provinces.csv").map((p) => ({
  code: p.province_code,
  name: p.province_name,
  slug: p.province_slug,
  region: p.region,
  short_blurb: p.short_blurb,
  center_lat: numberOrNull(p.center_lat),
  center_lon: numberOrNull(p.center_lon),
  cover_image_path: p.cover_image_path,
  map_image_path: p.map_image_path,
  is_featured: ["1", "TRUE", "true", "yes"].includes(String(p.is_featured)),
}));

const attractions = readCsv("data/attractions_master.csv")
  .filter((a) => a.latitude && a.longitude && !["0", "FALSE", "false"].includes(String(a.is_active)))
  .map((a) => ({
    code: a.attraction_code,
    name: a.name,
    slug: a.slug,
    province_code: a.province_code,
    province_slug: a.province_slug,
    location_code: a.location_code,
    category: a.category,
    primary_category: a.primary_category,
    desc_short: a.desc_short,
    latitude: numberOrNull(a.latitude),
    longitude: numberOrNull(a.longitude),
    hero_image: a.hero_image,
    card_image: a.card_image,
    priority_level: a.priority_level,
    tourism_status: a.tourism_status,
    access_difficulty: a.access_difficulty,
    season_start: a.season_start,
    season_end: a.season_end,
  }))
  .filter((a) => a.latitude !== null && a.longitude !== null);

const locations = readCsv("data/locations.csv").map((l) => ({
  code: l.location_code,
  name: l.name,
  type: l.type,
  parent_code: l.parent_code,
  slug: l.slug,
  is_hub: String(l.is_hub).toUpperCase() === "TRUE" || l.is_hub === "1",
  is_active: l.is_active === "1",
  image_path: l.image_path,
  map_image_path: l.map_image_path,
}));

fs.writeFileSync(path.join(outDir, "afghanToursProvinces.json"), JSON.stringify(provinces, null, 2));
fs.writeFileSync(path.join(outDir, "afghanToursAttractions.json"), JSON.stringify(attractions, null, 2));
fs.writeFileSync(path.join(outDir, "afghanToursLocations.json"), JSON.stringify(locations, null, 2));

console.log(`Wrote ${provinces.length} provinces.`);
console.log(`Wrote ${attractions.length} attractions with coordinates.`);
console.log(`Wrote ${locations.length} locations.`);
