import fs from 'node:fs';
import path from 'node:path';
import { normalizeImagePath, getTourHeroImage, getTourOverviewImage, getAttractionImage, getHotelImage, getRegionImage, getProvinceImage, getFoodImage, getHubImage, buildGallery, hasRealImage, listPublicImages, PLACEHOLDERS } from './images';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');

type Row = Record<string, any>;

const OPERATING_HUB_SLUGS = new Set([
  'kabul-city',
  'kandahar-city',
  'faizabad-city',
  'jalalabad-city',
  'bamyan-city',
  'herat-city',
  'mazar-e-sharif',
  'mazar-e-sharif-city',
  'ghazni-city',
]);

function slugify(value: any): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const HUB_SLUG_ALIASES: Record<string, string> = {
  'kabul': 'kabul-city',
  'kabul-city': 'kabul-city',

  'bamyan': 'bamyan-city',
  'bamyan-city': 'bamyan-city',

  'ghazni': 'ghazni-city',
  'ghazni-city': 'ghazni-city',

  'herat': 'herat-city',
  'herat-city': 'herat-city',

  'kandahar': 'kandahar-city',
  'kandahar-city': 'kandahar-city',

  'jalalabad': 'jalalabad-city',
  'jalalabad-city': 'jalalabad-city',

  'faizabad': 'faizabad-city',
  'faizabad-city': 'faizabad-city',

  'mazar-e-sharif': 'mazar-e-sharif',
  'mazar-e-sharif-city': 'mazar-e-sharif',
};

function canonicalHubSlug(value: any): string {
  const slug = slugify(value);
  return HUB_SLUG_ALIASES[slug] || slug;
}


function readFileSafe(filePath: string): string {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '"' && inQuotes && n === '"') { field += '"'; i++; continue; }
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { row.push(field); field = ''; continue; }
    if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && n === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    field += c;
  }
  if (field || row.length) { row.push(field); if (row.some((x) => x.trim() !== '')) rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, cleanValue(r[i])])));
}

function cleanValue(value: any): any {
  const v = String(value ?? '').trim();
  if (v === 'TRUE') return true;
  if (v === 'FALSE') return false;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

function readCsv(name: string): Row[] {
  return parseCsv(readFileSafe(path.join(DATA_DIR, name)));
}

function parseFrontmatter(text: string): { data: Row; body: string } {
  if (!text.startsWith('---')) return { data: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: text };
  const raw = text.slice(3, end).trim();
  const body = text.slice(end + 4).trim();
  const data: Row = {};
  raw.split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value: any = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1).split(',').map((x: string) => x.trim()).filter(Boolean);
    data[key] = value;
  });
  return { data, body };
}

function readMarkdownFolder(folder: string): Row[] {
  const dir = path.join(CONTENT_DIR, folder);
  try {
    return fs.readdirSync(dir)
      .filter((file) => file.endsWith('.md') && !file.toLowerCase().startsWith('readme'))
      .map((file) => {
        const full = path.join(dir, file);
        const parsed = parseFrontmatter(readFileSafe(full));
        const slug = parsed.data.slug || parsed.data.tour_slug || parsed.data.attraction_slug || parsed.data.hotel_slug || parsed.data.region_slug || parsed.data.province_slug || parsed.data.hub_slug || slugify(file.replace(/\.md$/, ''));
        // Repo-relative path only — absolute cwd paths break tracked-dist drift across machines.
        return { ...parsed.data, slug, content: parsed.body, file: path.join(folder, file).split(path.sep).join('/') };
      });
  } catch { return []; }
}

function bySlug(rows: Row[], fallbackName = 'name'): Map<string, Row> {
  return new Map(rows.map((r) => [String(r.slug || r.tour_slug || r.attraction_slug || r.hotel_slug || r.region_slug || r.province_slug || r.location_slug || slugify(r[fallbackName] || r.title)), r]));
}

function unique<T>(arr: T[]): T[] { return [...new Set(arr.filter(Boolean))]; }

function active(row: Row): boolean { return String(row.is_active ?? '1') !== '0' && String(row.active ?? '1') !== '0'; }

function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function stripGenericOpeningHeading(text: string): string {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  const first = (lines[0] || '').trim().toLowerCase().replace(/\s+/g, '');
  const generic = new Set(['#overview', '#introduction', '#shortintroduction', '#summary', '#content']);
  if (generic.has(first)) lines.shift();
  return lines.join('\n').trim();
}

export function markdownToHtml(markdown: any): string {
  const text = stripGenericOpeningHeading(String(markdown || '').trim());
  if (!text) return '';

  const lines = text.split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let listOpen = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listOpen) return;
    html.push('</ul>');
    listOpen = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); closeList(); continue; }

    const heading = line.match(/^(#{1,4})\s*(.+)$/);
    if (heading) {
      flushParagraph(); closeList();
      const level = Math.min(heading[1].length + 1, 4); // keep markdown H1 below page title level
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (!listOpen) { html.push('<ul>'); listOpen = true; }
      html.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph(); closeList();
  return html.join('\n');
}


const csv = {
  tours: () => readCsv('tours.csv'),
  tourItinerary: () => readCsv('tour_itinerary.csv'),
  tourAttractions: () => readCsv('tour_attractions_map.csv'),
  tourDates: () => readCsv('tour_dates.csv'),
  tourInclusions: () => readCsv('tour_inclusions.csv'),
  attractions: () => readCsv('attractions_master.csv'),
  hotels: () => readCsv('hotel_properties.csv'),
  hotelRooms: () => readCsv('hotel_rooms.csv'),
  regions: () => readCsv('regions.csv'),
  provinces: () => readCsv('provinces.csv'),
  locations: () => readCsv('locations.csv'),
  dishes: () => readCsv('dishes.csv'),
};

function normalizeTour(row: Row): Row {
  const slug = row.slug || row.tour_slug || slugify(row.name || row.title || row.tour_name);
  return {
    ...row,
    slug,
    title: row.title || row.name || row.tour_name || slug,
    name: row.name || row.title || row.tour_name || slug,
    hero_image: getTourHeroImage(row),
    overview_image: getTourOverviewImage(row),
    gallery: buildGallery(row, 'tour'),
  };
}

function normalizeAttraction(row: Row): Row {
  const slug = row.slug || row.attraction_slug || slugify(row.name || row.title);
  return { ...row, slug, title: row.title || row.name || slug, name: row.name || row.title || slug, image: getAttractionImage(row) };
}

function normalizeHotel(row: Row): Row {
  const slug = row.slug || row.hotel_slug || slugify(row.hotel_name || row.name);
  return { ...row, slug, title: row.title || row.hotel_name || row.name || slug, name: row.hotel_name || row.name || slug, image: getHotelImage(row), gallery: buildGallery(row, 'hotel') };
}

function normalizeRegion(row: Row): Row {
  const slug = row.slug || row.region_slug || slugify(row.name || row.region_name || row.region);
  return { ...row, slug, title: row.title || row.name || row.region_name || row.region || slug, name: row.name || row.region_name || row.region || slug, image: getRegionImage({ ...row, slug }) };
}

function normalizeProvince(row: Row): Row {
  const slug = row.slug || row.province_slug || slugify(row.name || row.province_name || row.province);
  return { ...row, slug, title: row.title || row.name || row.province_name || row.province || slug, name: row.name || row.province_name || row.province || slug, image: getProvinceImage({ ...row, slug }) };
}

function normalizeHub(row: Row): Row {
  const slug = row.slug || row.location_slug || row.destination_slug || slugify(row.name || row.location_name || row.city);
  return { ...row, slug, title: row.title || row.name || row.location_name || row.city || slug, name: row.name || row.location_name || row.city || slug, image: getHubImage({ ...row, slug }) };
}

function normalizeFood(row: Row): Row {
  const slug = row.slug || row.food_slug || row.dish_slug || slugify(row.name || row.title || row.dish_name);
  const normalized = { ...row, slug, title: row.title || row.name || row.dish_name || slug, name: row.name || row.dish_name || slug };
  return { ...normalized, image: getFoodImage(normalized) };
}

const FOOD_ROUTE_OVERRIDES: Record<string, string> = {
  'green-tea': '/food-culture/drinks/green-tea/',
  'kabuli-palaw': '/food-culture/kabuli-pulao/',
  'kabuli-pulao': '/food-culture/kabuli-pulao/',
  'chapli-kabob': '/food-culture/dishes/chapli-kabob/',
  'ashak': '/food-culture/dishes/aushak/',
  'aushak': '/food-culture/dishes/aushak/',
  'mantu': '/food-culture/dishes/mantu/',
  'bolani': '/food-culture/dishes/bolani/',
  'saffron-tea': '/food-culture/drinks/saffron-tea/',
  'balkh-melon': '/food-culture/produce/balkh-melon/',
  'bamyan-potatoes': '/food-culture/produce/bamyan-potatoes/',
  'herat-saffron': '/food-culture/dried-fruits/herat-saffron/',
  'wardak-apples': '/food-culture/produce/wardak-apples/',
  'balkh-almonds': '/food-culture/dried-fruits/balkh-almonds/',
  'herat-raisins': '/food-culture/dried-fruits/herat-raisins/',
  'kunduz-melon': '/food-culture/produce/kunduz-melon/',
  'panjshir-walnuts': '/food-culture/dried-fruits/panjshir-walnuts/',
  'shola': '/food-culture/dishes/shola/',
  'qorma-e-gosht': '/food-culture/dishes/qorma-e-gosht/',
  'qorma-e-sabzi': '/food-culture/dishes/qorma-e-sabzi/',
  'kandahar-grapes': '/food-culture/produce/kandahar-grapes/',
  'badakhshan-mulberries': '/food-culture/produce/badakhshan-mulberries/',
};

export function getFoodHref(item: Row): string | undefined {
  const slug = String(item?.slug || item?.food_slug || item?.dish_slug || '').trim();
  if (!slug) return undefined;
  return FOOD_ROUTE_OVERRIDES[slug] || `/food-culture/${slug}/`;
}

function mergeContent(entity: Row, contentMap: Map<string, Row>): Row {
  const md = contentMap.get(entity.slug) || contentMap.get(slugify(entity.title));
  if (!md) return { ...entity, content_html: markdownToHtml(entity.content || entity.description || entity.desc_long || entity.full_blurb || '') };
  const content = md.content || entity.content || '';
  return { ...entity, markdown: md, content, content_html: markdownToHtml(content) };
}

export function getAttractions(): Row[] {
  const md = bySlug(readMarkdownFolder('attractions'));
  return csv.attractions().filter(active).map(normalizeAttraction).map((x) => mergeContent(x, md));
}

export function getAttractionBySlug(slug: string): Row | undefined { return getAttractions().find((x) => x.slug === slug); }

export function getHotels(): Row[] {
  const md = bySlug(readMarkdownFolder('hotels'));
  const seen = new Map<string, Row>();

  csv.hotels().filter(active).map(normalizeHotel).forEach((h) => {
    if (!seen.has(h.slug)) seen.set(h.slug, h);
    else seen.set(h.slug, {
      ...seen.get(h.slug),
      rooms: [...(seen.get(h.slug)?.rooms || []), h]
    });
  });

  const roomRows = csv.hotelRooms().filter(active);

  return [...seen.values()].map((rawHotel) => {
    const hotel = mergeContent(rawHotel, md);

    const rooms = roomRows
      .filter((r) =>
        (r.hotel_slug && r.hotel_slug === hotel.slug) ||
        (r.hotel_id && r.hotel_id === hotel.hotel_id)
      )
      .map((room) => {
        let discovered = listPublicImages(room.gallery_folder, true);

        // When typed gallery subfolders are absent, match sibling files in the
        // hero's rooms/ directory by room_type keywords (no unrelated borrowing).
        if ((!discovered || discovered.length === 0) && room.hero_image) {
          const hero = String(room.hero_image);
          const roomsDir = hero.replace(/\/[^/]+$/, '/');
          if (roomsDir.includes('/rooms/')) {
            const roomType = String(room.room_type || '').toLowerCase();
            const aliases: Record<string, string[]> = {
              suite: ['suite'],
              double: ['double-bedroom', 'double_bedroom', 'double-twin', 'double'],
              two_twins: ['two-twin', 'two_twin', 'double-twin'],
              four_twins: ['four-single', 'four_single', 'four-twin'],
              standard: ['standard'],
              triple_twins: ['triple'],
              two_doubles: ['two-double', 'two_double'],
              single_twin: ['single'],
              quad_twins: ['quad', 'four-single', 'four_single'],
              three_twins: ['three'],
            };
            const keys = aliases[roomType] || roomType.replace(/_/g, '-').split('-').filter(Boolean);
            const siblings = listPublicImages(roomsDir, false).filter((src) => {
              const base = String(src).split('/').pop()?.toLowerCase() || '';
              return keys.some((k) => base.includes(k));
            });
            discovered = siblings;
          }
        }

        const galleryImages = unique([
          room.hero_image,
          ...discovered,
        ].filter((src) =>
          src && !String(src).includes('/placeholders/')
        ));

        return {
          ...room,
          image: galleryImages[0] || room.hero_image,
          gallery_images: galleryImages,
        };
      });

    // Discover the complete hotel image folder.
    // Top-level images are property/exterior images.
    // Anything under /rooms/ is treated as a room/interior image,
    // even when a matching room CSV record does not yet exist.
    const discoveredPropertyImages = listPublicImages(
      hotel.gallery_folder,
      false
    );

    const discoveredAllHotelImages = listPublicImages(
      hotel.gallery_folder,
      true
    );

    const discoveredRoomImages = discoveredAllHotelImages.filter((src) =>
      String(src).includes('/rooms/')
    );

    const propertyImages = unique([
      hotel.image,
      ...(Array.isArray(hotel.gallery) ? hotel.gallery : []),
      ...discoveredPropertyImages,
    ].filter((src) =>
      src && !String(src).includes('/placeholders/')
    ));

    const roomImages = unique([
      ...discoveredRoomImages,
      ...rooms.flatMap((room) =>
        Array.isArray(room.gallery_images)
          ? room.gallery_images
          : []
      ),
    ]);

    const allImages = unique([
      ...propertyImages,
      ...roomImages,
    ]);

    return {
      ...hotel,
      rooms,
      property_images: propertyImages,
      room_images: roomImages,
      all_images: allImages,
      gallery: allImages,
      image:
        propertyImages[0] ||
        roomImages[0] ||
        hotel.image,
    };
  });
}

export function getHotelBySlug(slug: string): Row | undefined { return getHotels().find((x) => x.slug === slug); }

export function getRegions(): Row[] {
  const md = bySlug(readMarkdownFolder('regions'));
  return csv.regions().filter(active).map(normalizeRegion).map((x) => mergeContent(x, md));
}

export function getRegionBySlug(slug: string): Row | undefined { return getRegions().find((x) => x.slug === slug); }

export function getProvinces(): Row[] {
  const md = bySlug(readMarkdownFolder('provinces'));

  return csv.provinces()
    .filter(active)
    .map(normalizeProvince)
    .map((province) => {
      const provinceMd =
        md.get(province.slug) ||
        md.get(slugify(province.title));

      const editorialOverrides: Row = {};

      if (provinceMd?.short_blurb) {
        editorialOverrides.short_blurb = provinceMd.short_blurb;
      }

      if (provinceMd?.related_tour_slugs) {
        editorialOverrides.related_tour_slugs = provinceMd.related_tour_slugs;
      }

      return mergeContent(
        {
          ...province,
          ...editorialOverrides,
        },
        md
      );
    });
}

export function getProvinceBySlug(slug: string): Row | undefined { return getProvinces().find((x) => x.slug === slug); }

export function getHubs(): Row[] {
  const markdownRows = readMarkdownFolder('hubs')
    .map(normalizeHub)
    .map((row) => ({
      ...row,
      slug: canonicalHubSlug(row.slug),
    }));

  /*
   * locations.csv intentionally contains some legacy aliases
   * such as "kabul" alongside "kabul-city".
   *
   * Canonicalize those aliases here rather than deleting the
   * source rows, because older relationship data may still use
   * the legacy names.
   */
  const locationRows = csv.locations()
    .filter(active)
    .filter(
      (row) =>
        String(row.is_hub).toLowerCase() === 'true'
        || OPERATING_HUB_SLUGS.has(
          canonicalHubSlug(row.slug)
        )
    )
    .map(normalizeHub)
    .map((row) => ({
      ...row,
      slug: canonicalHubSlug(row.slug),
    }));

  const mdOnly = markdownRows.filter((row) =>
    OPERATING_HUB_SLUGS.has(
      canonicalHubSlug(row.slug)
    )
  );

  /*
   * Merge aliases into ONE real operational hub.
   *
   * Examples:
   *   kabul + kabul-city             -> kabul-city
   *   kandahar + kandahar-city       -> kandahar-city
   *   bamyan + bamyan-city           -> bamyan-city
   *   mazar-e-sharif-city            -> mazar-e-sharif
   */
  const combined = new Map<string, Row>();

  [...locationRows, ...mdOnly].forEach((hub) => {
    const slug = canonicalHubSlug(hub.slug);

    combined.set(slug, {
      ...(combined.get(slug) || {}),
      ...hub,
      slug,
    });
  });

  /*
   * Build the markdown lookup using canonical slugs as well.
   */
  const markdownMap = new Map<string, Row>();

  markdownRows.forEach((row) => {
    markdownMap.set(
      canonicalHubSlug(row.slug),
      row
    );
  });

  return [...combined.values()]
    .map((hub) => mergeContent(hub, markdownMap))
    .sort((a, b) =>
      String(a.title || a.name || a.slug)
        .localeCompare(
          String(b.title || b.name || b.slug)
        )
    );
}

export function getHubBySlug(slug: string): Row | undefined {
  const canonical = canonicalHubSlug(slug);

  return getHubs().find(
    (hub) => hub.slug === canonical
  );
}

export function getFoodItems(): Row[] {
  const mdRows = [
    ...readMarkdownFolder('food/dishes'),
    ...readMarkdownFolder('food/drinks'),
    ...readMarkdownFolder('food/produce'),
    ...readMarkdownFolder('food/cultural-experiences'),
  ];
  const md = bySlug(mdRows);
  const csvRows = csv.dishes().filter(active).map(normalizeFood);
  const combined = new Map<string, Row>();
  [...csvRows, ...mdRows.map(normalizeFood)].forEach((f) => combined.set(f.slug, { ...(combined.get(f.slug) || {}), ...f }));
  return [...combined.values()]
    .map((x) => mergeContent(x, md));
}

export function getFoodItemBySlug(slug: string): Row | undefined { return getFoodItems().find((x) => x.slug === slug); }

export function getTours(): Row[] {
  const md = bySlug(readMarkdownFolder('tours'));
  const attractions = getAttractions();
  const attractionsByCode = new Map(attractions.map((a) => [a.attraction_code || a.code, a]));
  const attractionsBySlug = bySlug(attractions);
  const provinces = getProvinces();
  const provincesByCode = new Map(provinces.map((p) => [p.province_code || p.code, p]));
  const provincesBySlug = bySlug(provinces);
  const itinerary = csv.tourItinerary();
  const tourAttractions = csv.tourAttractions();
  const dates = csv.tourDates();
  const inclusions = csv.tourInclusions();

  return csv.tours().filter(active).map(normalizeTour).map((tour) => {
    const tourKey = tour.tour_code || tour.code || tour.slug;
    const tSlug = tour.slug;
    const linkedAttractionRows = tourAttractions.filter((r) => [r.tour_slug, r.slug, r.tour_code, r.tour_id].includes(tSlug) || [r.tour_slug, r.slug, r.tour_code, r.tour_id].includes(tourKey));
    const linkedAttractions = linkedAttractionRows.map((r) => attractionsByCode.get(r.attraction_code) || attractionsBySlug.get(r.attraction_slug || r.slug)).filter(Boolean);
    const itineraryRows = itinerary.filter((r) => [r.tour_slug, r.slug, r.tour_code, r.tour_id].includes(tSlug) || [r.tour_slug, r.slug, r.tour_code, r.tour_id].includes(tourKey));
    const provinceTokens = unique([tour.province, tour.provinces, tour.primary_province, tour.province_code].join('|').split(/[|;,]/).map((x) => x.trim()).filter(Boolean));
    const linkedProvinces = provinceTokens.map((p) => provincesByCode.get(p) || provincesBySlug.get(slugify(p))).filter(Boolean);

    const tourMd =
      md.get(tSlug) ||
      md.get(slugify(tour.title));

    const editorialOverrides: Row = {};

    for (const key of [
      'hero_subhead',
      'duration_display',
      'style_display',
      'group_display',
    ]) {
      if (tourMd?.[key]) {
        editorialOverrides[key] = tourMd[key];
      }
    }

    return mergeContent({
      ...tour,
      ...editorialOverrides,
      itinerary: itineraryRows,
      attractions: linkedAttractions,
      provinces: linkedProvinces,
      dates: dates.filter((r) => [r.tour_slug, r.slug, r.tour_code, r.tour_id].includes(tSlug) || [r.tour_slug, r.slug, r.tour_code, r.tour_id].includes(tourKey)),
      inclusions: inclusions.filter((r) => [r.tour_slug, r.slug, r.tour_code, r.tour_id].includes(tSlug) || [r.tour_slug, r.slug, r.tour_code, r.tour_id].includes(tourKey)),
    }, md);
  });
}

export function getTourBySlug(slug: string): Row | undefined { return getTours().find((x) => x.slug === slug); }

export function getAttractionsByRegion(region: Row): Row[] {
  const key = String(region.slug || region.region_slug || region.region_code || region.name || '').toLowerCase();
  const label = String(region.name || region.title || region.region_name || '').toLowerCase();
  return getAttractions().filter((x) => {
    const r = String(x.region || x.region_slug || x.region_code || '').toLowerCase();
    return r === key || r === label || r.includes(key) || label.includes(r);
  });
}

export function getProvincesByRegion(region: Row): Row[] {
  const key = String(region.slug || region.region_slug || region.region_code || region.name || '').toLowerCase();
  const label = String(region.name || region.title || region.region_name || '').toLowerCase();
  return getProvinces().filter((x) => {
    const r = String(x.region || x.region_slug || x.region_code || '').toLowerCase();
    return r === key || r === label || r.includes(key) || label.includes(r);
  });
}

export function getHubsByRegion(region: Row): Row[] {
  const provinces = new Set(getProvincesByRegion(region).map((p) => String(p.province_code || p.slug || p.name || '').toLowerCase()));
  return getHubs().filter((h) => provinces.has(String(h.parent_code || h.province_code || '').toLowerCase()) || getAttractionsByRegion(region).some((a) => a.location_code === h.location_code));
}

export function getPages(): Row[] {
  return readMarkdownFolder('pages').map((page) => ({ ...page, title: page.title || page.slug, content_html: markdownToHtml(page.content || '') }));
}

export function getPageContent(slug: string): Row | undefined {
  const page = getPages().find((x) => x.slug === slug || slugify(x.title) === slug);
  return page;
}

export { normalizeImagePath, PLACEHOLDERS };

/** Product-class helpers for Tour / Specialist / Return separation */
export function isItineraryTour(tour: Row): boolean {
  const pc = String(tour.product_class || '').toLowerCase();
  if (pc === 'scheduled' || pc === 'private-fixed') return true;
  // Fallback: genuine tours remaining in tours.csv after separation
  return Boolean(tour.slug) && !['custom', 'specialist', 'return'].includes(pc);
}

export function getItineraryTours(): Row[] {
  return getTours().filter(isItineraryTour);
}

export function getScheduledTours(): Row[] {
  return getItineraryTours().filter((t) => String(t.product_class || '').toLowerCase() === 'scheduled');
}

export function getPrivateFixedTours(): Row[] {
  return getItineraryTours().filter((t) => String(t.product_class || '').toLowerCase() !== 'scheduled');
}

export function getSpecialistServices(): Row[] {
  return readCsv('specialist_services.csv').filter(active).map((row) => ({
    ...row,
    product_kind: 'specialist',
    regions_supported_list: String(row.regions_supported || '')
      .split(/[|;,]/)
      .map((x) => x.trim())
      .filter(Boolean),
  }));
}

export function getSpecialistBySlug(slug: string): Row | undefined {
  return getSpecialistServices().find((x) => x.slug === slug);
}

export function getReturnJourneys(): Row[] {
  return readCsv('return_journeys.csv').filter(active).map((row) => ({
    ...row,
    product_kind: 'return',
  }));
}

export function getReturnJourneyBySlug(slug: string): Row | undefined {
  return getReturnJourneys().find((x) => x.slug === slug);
}

export function getCustomJourneys(): Row[] {
  return readCsv('custom_journeys.csv').filter(active).map((row) => ({
    ...row,
    product_kind: 'custom',
  }));
}

export function getCustomJourneyBySlug(slug: string): Row | undefined {
  return getCustomJourneys().find((x) => x.slug === slug);
}
