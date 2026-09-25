import fs from 'node:fs';
import path from 'node:path';
import {
  getHubs,
  getAttractions,
  getHotels,
  getTours,
  getFoodItems,
  getFoodHref,
} from './buildRelations';
import { ACTIVE_HUB_SLUGS, getActivitiesForHub, getCulturalForHub } from './experiences';
import { getCulinaryForHub } from './culinary';
import { listPublicImages } from './images';

type Row = Record<string, any>;
export type HubCatalogItem = {
  slug: string;
  name: string;
  province: string;
  type: string;
  image: string;
  cardImage: string;
  summary: string;
  stats: string[];
  gallery: string[];
  attractions: [string, string, string][];
  hotels: [string, string, string][];
  food: [string, string, string][];
  transport: [string, string, string][];
  tours: [string, string][];
  activities: [string, string][];
  cultural: [string, string][];
  culinary: [string, string][];
};

function readGlance(): Map<string, Row> {
  const file = path.join(process.cwd(), 'data', 'hub_at_a_glance.csv');
  try {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return new Map();
    const headers = lines[0].split(',').map((h) => h.trim());
    const map = new Map<string, Row>();
    for (const line of lines.slice(1)) {
      // naive CSV split is insufficient for quoted fields; use a light parser
      const cols: string[] = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQ = !inQ;
          }
        } else if (ch === ',' && !inQ) {
          cols.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      cols.push(cur);
      const row: Row = {};
      headers.forEach((h, i) => {
        row[h] = (cols[i] || '').trim();
      });
      if (row.hub_slug) map.set(String(row.hub_slug), row);
    }
    return map;
  } catch {
    return new Map();
  }
}

function firstSentence(text: string, fallback: string): string {
  const cleaned = String(text || '')
    .replace(/^#+\s.*$/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return fallback;
  const match = cleaned.match(/^(.{40,280}?[.!?])\s/);
  if (match) return match[1];
  return cleaned.slice(0, 220) + (cleaned.length > 220 ? '…' : '');
}

function hubGallery(slug: string, hero: string, card: string): string[] {
  const dir = `/assets/images/hubs/${slug}`;
  const listed = listPublicImages(dir).filter((p) => /\.(webp|jpe?g|png)$/i.test(p));
  const preferred = [
    `${dir}/01.webp`,
    `${dir}/gallery-1.webp`,
    `${dir}/gallery-2.webp`,
    `${dir}/gallery-3.webp`,
    `${dir}/gallery-4.webp`,
    `${dir}/thumb.webp`,
    card,
    hero,
  ].filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of [...preferred, ...listed]) {
    if (!p || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= 8) break;
  }
  return out.length ? out : [hero];
}

function matchesHub(row: Row, hub: Row): boolean {
  const hubCode = String(hub.location_code || hub.code || hub.destination_code || '').toLowerCase();
  const hubSlug = String(hub.slug || '').toLowerCase();
  const hubName = String(hub.title || hub.name || '').toLowerCase();
  const provinceCode = String(hub.parent_code || hub.province_code || '').toLowerCase();
  const provinceName = String(hub.province || hub.province_name || '').toLowerCase();

  const fields = [
    row.location_code,
    row.requires_location_code,
    row.nearest_hub_code,
    row.hub_code,
    row.destination_code,
    row.city,
    row.hub_name,
  ].map((x) => String(x || '').toLowerCase());

  const provinceFields = [row.province_code, row.province].map((x) => String(x || '').toLowerCase());

  return (
    (hubCode && fields.includes(hubCode))
    || (hubSlug && fields.includes(hubSlug))
    || (hubName && fields.some((f) => f === hubName || f.includes(hubName)))
    || (provinceCode && provinceFields.includes(provinceCode))
    || (provinceName && provinceFields.includes(provinceName))
  );
}

/**
 * Build the interactive /hubs/ index catalog from the same canonical sources
 * used by /hubs/[slug]/ — never a second hard-coded hub list.
 */
export function buildHubIndexCatalog(): HubCatalogItem[] {
  const glance = readGlance();
  const allAttractions = getAttractions();
  const allHotels = getHotels();
  const allFood = getFoodItems();
  const allTours = getTours();
  const hubsBySlug = new Map(getHubs().map((h) => [h.slug, h]));

  return ACTIVE_HUB_SLUGS.map((slug) => {
    const hub = hubsBySlug.get(slug) || { slug, title: slug, name: slug };
    const g = glance.get(slug) || {};
    const name = String(hub.title || hub.name || g.display_name || slug);
    const provinceRaw = String(
      hub.province || hub.province_name || ''
    ).trim();
    const province = provinceRaw
      && provinceRaw.toLowerCase() !== name.toLowerCase()
      && provinceRaw.toLowerCase() !== `${name} province`.toLowerCase()
        ? provinceRaw
        : String(name.replace(/\s+City$/i, '') || g.display_name || name);
    const existingHubImages = new Set(listPublicImages(`/assets/images/hubs/${slug}`));
    // Also check short-folder assets used by some hubs (e.g. jalalabad/, faizabad/).
    const short = slug.replace(/-city$/, '');
    if (short !== slug) {
      for (const p of listPublicImages(`/assets/images/hubs/${short}`)) existingHubImages.add(p);
    }
    const imageCandidates = [
      `/assets/images/hubs/${slug}/hero.webp`,
      `/assets/images/hubs/${slug}/01.webp`,
      `/assets/images/hubs/${short}/hero.webp`,
      `/assets/images/hubs/${short}/01.webp`,
      String(hub.image || ''),
    ].filter(Boolean);
    const image =
      imageCandidates.find((p) => existingHubImages.has(p) || (p.includes('/placeholders/') === false && p === hub.image && !String(hub.image || '').includes('placeholder')))
      || imageCandidates.find((p) => existingHubImages.has(p))
      || String(hub.image || `/assets/images/hubs/${slug}/hero.webp`);
    const cardCandidates = [
      `/assets/images/hubs/${slug}/01.webp`,
      `/assets/images/hubs/${slug}/thumb.webp`,
      `/assets/images/hubs/${slug}/gallery-1.webp`,
      `/assets/images/hubs/${short}/01.webp`,
      `/assets/images/hubs/${short}/thumb.webp`,
      image,
    ];
    const cardImage = cardCandidates.find((p) => existingHubImages.has(p)) || image;

    const summary = firstSentence(
      String(hub.content || ''),
      String(g.regional_role || g.famous_for || `${name} is an operational travel hub for AfghanTours journeys.`)
    );

    const stats = [
      g.airport ? `Airport: ${g.airport}` : null,
      g.hotels_summary ? `Hotels: ${g.hotels_summary}` : null,
      g.best_season ? `Best Season: ${g.best_season}` : null,
      g.elevation ? `Elevation: ${g.elevation}` : null,
    ].filter(Boolean) as string[];

    const attractions = allAttractions
      .filter((a) => matchesHub(a, hub))
      .slice(0, 6)
      .map((a): [string, string, string] => [
        String(a.title || a.name || a.slug),
        String(a.image || a.hero_image_path || `/assets/images/attractions/${a.slug}/hero.webp`),
        `/attractions/${a.slug}/`,
      ]);

    const hotels = allHotels
      .filter((h) => matchesHub(h, hub))
      .slice(0, 4)
      .map((h): [string, string, string] => [
        String(h.title || h.name || h.slug),
        String(h.image || h.hero_image_path || `/assets/images/placeholders/default-hotel.webp`),
        h.slug ? `/hotels/${h.slug}/` : '/hotels/',
      ]);

    const food = allFood
      .filter((item) => {
        const fieldValues = [
          item.destination_code,
          item.location_code,
          item.hub_name,
          item.city,
          item.province,
          item.province_code,
          ...(Array.isArray(item.provinces) ? item.provinces : []),
          ...(Array.isArray(item.associated_hubs) ? item.associated_hubs : []),
        ];
        const fields = fieldValues.map((x) => String(x || '').toLowerCase());
        const targets = [hub.location_code, hub.code, name, slug, province]
          .map((x) => String(x || '').toLowerCase())
          .filter(Boolean);
        return targets.some((target) =>
          fields.some((field) => field === target || field.includes(target) || target.includes(field))
        );
      })
      .slice(0, 4)
      .map((item): [string, string, string] => [
        String(item.title || item.name || item.slug),
        String(item.image || `/assets/images/placeholders/default-food.webp`),
        getFoodHref(item) || '/food-culture/',
      ]);

    const tours = allTours
      .filter((tour) => {
        const tourText = [
          tour.route,
          tour.route_summary,
          tour.province,
          tour.provinces,
          tour.region,
          tour.title,
          tour.name,
          tour.primary_location_slug,
        ]
          .join(' ')
          .toLowerCase();
        return (
          tourText.includes(name.toLowerCase())
          || tourText.includes(province.toLowerCase())
          || tourText.includes(slug.toLowerCase())
          || String(tour.primary_location_slug || '') === slug
        );
      })
      .slice(0, 4)
      .map((tour): [string, string] => [
        String(tour.title || tour.name || tour.slug),
        `/tours/${tour.slug}/`,
      ]);

    const activities = getActivitiesForHub(slug)
      .slice(0, 6)
      .map((rel): [string, string] => {
        const aSlug = String(rel.slug || rel.activity_slug);
        const aName = String(rel.name || rel.activity_name || aSlug);
        return [aName, `/activities/${aSlug}/`];
      });

    const cultural = getCulturalForHub(slug)
      .slice(0, 4)
      .map((rel): [string, string] => {
        const cSlug = String(rel.experience_slug);
        return [cSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), `/cultural-experiences/${cSlug}/`];
      });

    const culinary = getCulinaryForHub(slug)
      .slice(0, 4)
      .map((rel): [string, string] => {
        const cSlug = String(rel.slug || rel.experience_slug);
        const cName = String(rel.name || rel.title || cSlug);
        return [cName, `/cultural-experiences/culinary/${cSlug}/`];
      });

    const transport: [string, string, string][] = [];
    if (g.airport) {
      transport.push([
        String(g.airport).split('(')[0].trim() || 'Airport',
        `/assets/images/transport/airports/${slug}/hero.webp`,
        '/transportation/',
      ]);
    }
    transport.push(['Private vehicle routes', '/assets/images/transport/premium/suv/01.webp', '/transportation/']);
    if (g.road_access) {
      transport.push(['Road access', '/assets/images/transport/premium/van/hero.webp', '/transportation/']);
    }

    return {
      slug,
      name,
      province,
      type: String(g.regional_role || 'Travel Hub'),
      image,
      cardImage,
      summary,
      stats: stats.length
        ? stats
        : ['Operational hub', 'Hotels & transport coordinated from Kabul', 'Ask for current access'],
      gallery: hubGallery(slug, image, cardImage),
      attractions,
      hotels,
      food,
      transport: transport.slice(0, 4),
      tours,
      activities,
      cultural,
      culinary,
    };
  });
}
