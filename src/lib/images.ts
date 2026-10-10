import fs from 'node:fs';
import path from 'node:path';

export const PLACEHOLDERS = {
  tour: '/assets/images/placeholders/default-tour.webp',
  attraction: '/assets/images/placeholders/default-attraction.webp',
  hotel: '/assets/images/placeholders/default-hotel.webp',
  region: '/assets/images/placeholders/default-region.webp',
  province: '/assets/images/placeholders/default-province.webp',
  food: '/assets/images/placeholders/default-food.webp',
  hub: '/assets/images/placeholders/default-hub.webp',
  hero: '/assets/images/placeholders/default-hero.webp',
  card: '/assets/images/placeholders/default-card.webp',
  transport: '/assets/images/placeholders/default-transport.webp',
};

function assetExists(publicPath?: string | null): boolean {
  const value = normalizeImagePath(publicPath || '', '');
  if (!value || value.startsWith('http://') || value.startsWith('https://')) return Boolean(value);
  return fs.existsSync(path.join(process.cwd(), 'public', value.replace(/^\//, '')));
}

function firstExisting(paths: Array<string | null | undefined>, fallback: string): string {
  const normalized = paths.map((p) => normalizeImagePath(p || '', '')).filter(Boolean);
  return normalized.find(assetExists) || fallback;
}

export function normalizeImagePath(pathValue?: string | null, fallback = PLACEHOLDERS.card): string {
  const raw = String(pathValue || '').trim();
  if (!raw) return fallback;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  let cleaned = raw.replace(/^public\//, '').replace(/^\.\//, '');
  if (cleaned.startsWith('/')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('assets/')) return `/${cleaned}`;
  if (cleaned.startsWith('images/')) return `/assets/${cleaned}`;
  return `/${cleaned}`;
}


export function listPublicImages(publicFolder?: string | null, recursive = true): string[] {
  const normalized = normalizeImagePath(publicFolder || '', '');
  if (!normalized || normalized.startsWith('http://') || normalized.startsWith('https://')) return [];

  const publicRoot = path.join(process.cwd(), 'public');
  const diskRoot = path.join(publicRoot, normalized.replace(/^\//, ''));

  if (!fs.existsSync(diskRoot)) return [];

  const allowed = new Set(['.webp', '.jpg', '.jpeg', '.png', '.avif']);
  const results: string[] = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (recursive) walk(full);
        continue;
      }

      if (!allowed.has(path.extname(entry.name).toLowerCase())) continue;

      const relative = path.relative(publicRoot, full).split(path.sep).join('/');
      results.push(`/${relative}`);
    }
  };

  walk(diskRoot);

  return [...new Set(results)].sort((a, b) => {
    const aHero = /\/hero\.[^.]+$/i.test(a) ? 0 : 1;
    const bHero = /\/hero\.[^.]+$/i.test(b) ? 0 : 1;
    return aHero - bHero || a.localeCompare(b);
  });
}

export function getTourHeroImage(tour: any): string {
  return firstExisting([
    tour?.hero_image,
    tour?.hero_image_path,
    tour?.thumbnail_image_path,
    tour?.image_path,
    tour?.image,
    tour?.featured_image,
    tour?.slug ? `/assets/images/featured-tours/${tour.slug}/hero.webp` : null,
    tour?.slug ? `/assets/images/custom-tours/${tour.slug}/hero.webp` : null,
  ], PLACEHOLDERS.tour);
}

export function getTourOverviewImage(tour: any): string {
  return firstExisting([
    tour?.overview_image,
    tour?.overview_image_path,
    tour?.secondary_image,
    tour?.slug ? `/assets/images/featured-tours/${tour.slug}/overview.webp` : null,
    tour?.slug ? `/assets/images/custom-tours/${tour.slug}/overview.webp` : null,
    tour?.hero_image,
    tour?.hero_image_path,
  ], PLACEHOLDERS.tour);
}
export function getHotelImage(hotel: any): string {
  return firstExisting([
    hotel?.image_path_property_1,
    hotel?.property_image,
    hotel?.image,
    hotel?.hero_image,
  ], PLACEHOLDERS.hotel);
}

export function getRegionImage(region: any): string {
  const slug = region?.slug || region?.region_slug;
  return firstExisting([
    region?.img_path,
    region?.image_path,
    region?.hero_image,
    slug ? `/assets/images/regions/${slug}.webp` : null,
    slug === 'afghanistan' ? '/assets/maps/afghanistan-map.webp' : null,
  ], PLACEHOLDERS.region);
}

export function getProvinceImage(province: any): string {
  const slug = province?.slug || province?.province_slug;
  return firstExisting([
    province?.cover_image_path,
    province?.square_image_path,
    province?.image_path,
    province?.hero_image,
    slug ? `/assets/images/provinces/${slug}/hero.webp` : null,
    slug ? `/assets/images/provinces/${slug}/hero.webp` : null,
    slug ? `/assets/images/provinces/${slug}.webp` : null,
    slug ? `/assets/images/provinces/${slug}.webp` : null,
  ], PLACEHOLDERS.province);
}

export function getFoodImage(item: any): string {
  const slug = item?.slug || item?.food_slug || item?.dish_slug;
  return firstExisting([
    item?.image_path,
    item?.image,
    item?.hero_image,
    slug ? `/assets/images/food/dishes/${slug}/hero.webp` : null,
    slug ? `/assets/images/food/drinks/${slug}/hero.webp` : null,
    slug ? `/assets/images/food/produce/${slug}/hero.webp` : null,
    slug ? `/assets/images/food/dried-fruit/${slug}/hero.webp` : null,
    slug ? `/assets/images/food/dishes/${slug}.webp` : null,
    slug ? `/assets/images/food/drinks/${slug}.webp` : null,
    slug ? `/assets/images/food/produce/${slug}.webp` : null,
    slug ? `/assets/images/food/${slug}.webp` : null,
  ], PLACEHOLDERS.food);
}

export function hasRealImage(publicPath?: string | null): boolean {
  const normalized = normalizeImagePath(publicPath || '', '');
  return Boolean(normalized && normalized !== PLACEHOLDERS.food && normalized !== PLACEHOLDERS.card && assetExists(normalized));
}

export function getHubImage(hub: any): string {
  const slug = hub?.slug || hub?.location_slug || hub?.destination_slug;
  const base = String(slug || '').replace(/-city$/, '');
  const map: Record<string, string> = {
    'mazar-e-sharif': 'mazar',
    'mazar-e-sharif-city': 'mazar',
    'kabul-city': 'kabul',
    'kandahar-city': 'kandahar',
    'bamyan-city': 'bamyan',
    'herat-city': 'herat',
    'faizabad-city': 'faizabad',
    'jalalabad-city': 'jalalabad',
    'ghazni-city': 'ghazni',
  };
  const short = map[String(slug)] || map[base] || base;
  return firstExisting([
    hub?.image_path,
    hub?.hero_image,
    slug ? `/assets/images/hubs/${slug}/hero.webp` : null,
    slug ? `/assets/images/hubs/${slug}-1.webp` : null,
    short ? `/assets/images/hubs/${short}-1.webp` : null,
  ], PLACEHOLDERS.hub);
}

export function buildGallery(entity: any, fallbackType: keyof typeof PLACEHOLDERS = 'card'): string[] {
  const values = [
    entity?.gallery_image_1,
    entity?.gallery_image_2,
    entity?.gallery_image_3,
    entity?.gallery1,
    entity?.gallery2,
    entity?.gallery3,
    entity?.image_path_property_1,
    entity?.image_path_property_2,
    entity?.image_path_property_3,
  ].filter(Boolean);
  return [...new Set(values.map((v) => normalizeImagePath(v, PLACEHOLDERS[fallbackType])) as string[])];
}

export function getAttractionImage(attraction: any): string {
  const code = String(attraction?.attraction_code || attraction?.code || '').toLowerCase();
  return firstExisting([
    attraction?.image_path,
    attraction?.image,
    attraction?.thumbnail_path,
    attraction?.slug ? `/assets/images/attractions/${attraction.slug}/hero.webp` : null,
    code ? `/assets/images/attractions/${code}/hero.webp` : null,
    code ? `/assets/images/attractions/${code}.webp` : null,
  ], PLACEHOLDERS.attraction);
}

/** Documented experience asset roots (long-term hierarchy). */
export const EXPERIENCE_ASSET_ROOTS = {
  culinary: '/assets/images/experiences/culinary',
  cultural: '/assets/images/experiences/cultural',
  activities: '/assets/images/experiences/activities',
} as const;

export function getCulinaryImage(item: any): string {
  const slug = item?.slug || item?.culinary_slug || item?.experience_slug;
  return firstExisting([
    item?.hero_image,
    item?.image,
    item?.image_path,
    slug ? `${EXPERIENCE_ASSET_ROOTS.culinary}/${slug}/hero.webp` : null,
    slug ? `${EXPERIENCE_ASSET_ROOTS.culinary}/${slug}/thumb.webp` : null,
    // Renamed culinary slug fallback
    slug === 'band-e-amir-quroot-dairy' ? `${EXPERIENCE_ASSET_ROOTS.culinary}/band-e-amir-dairy-market-quroot/hero.webp` : null,
    // Legacy interim locations still present in this repo
    slug ? `/assets/images/experiences/cultural/${slug}/hero.webp` : null,
    slug ? `/assets/images/food/${slug}/hero.webp` : null,
  ], PLACEHOLDERS.food);
}

export function getCulinaryGallery(item: any): string[] {
  const slug = item?.slug || item?.culinary_slug;
  const explicit = [
    ...(Array.isArray(item?.gallery_images) ? item.gallery_images : []),
    item?.gallery_image_1,
    item?.gallery_image_2,
    item?.gallery_image_3,
  ].filter(Boolean).map((v) => normalizeImagePath(v, ''));

  const discovered = slug
    ? [
        ...listPublicImages(`${EXPERIENCE_ASSET_ROOTS.culinary}/${slug}`, true),
        ...listPublicImages(`/assets/images/experiences/cultural/${slug}`, true),
      ]
    : [];

  return [...new Set([...explicit, ...discovered].filter(Boolean))];
}

export function getCulturalExperienceImage(item: any): string {
  const slug = item?.slug || item?.id?.replace(/\.md$/, '');
  return firstExisting([
    item?.hero_image,
    item?.image,
    slug ? `${EXPERIENCE_ASSET_ROOTS.cultural}/${slug}/hero.webp` : null,
    slug ? `/assets/images/experiences/cultural/${slug}/hero.webp` : null,
  ], PLACEHOLDERS.attraction);
}

export function getCulturalExperienceGallery(item: any): string[] {
  const slug = item?.slug || item?.id?.replace(/\.md$/, '');
  const explicit = [
    ...(Array.isArray(item?.gallery_images) ? item.gallery_images : []),
    item?.gallery_image_1,
    item?.gallery_image_2,
    item?.gallery_image_3,
  ].filter(Boolean).map((v) => normalizeImagePath(v, ''));

  const discovered = slug
    ? [
        ...listPublicImages(`${EXPERIENCE_ASSET_ROOTS.cultural}/${slug}`, true),
        ...listPublicImages(`/assets/images/experiences/cultural/${slug}`, true),
      ]
    : [];

  return [...new Set([...explicit, ...discovered].filter(Boolean))];
}

export function getActivityImage(item: any): string {
  const slug = item?.slug || item?.activity_slug;
  // Exact entity assets only — never cross-substitute another activity's hero
  // (e.g. fishing→horse-riding other/01, cycling→hiking).
  return firstExisting([
    item?.hero_image,
    item?.image,
    item?.image_path,
    slug ? `${EXPERIENCE_ASSET_ROOTS.activities}/${slug}/hero.webp` : null,
    slug ? `${EXPERIENCE_ASSET_ROOTS.activities}/${slug}/thumb.webp` : null,
  ], PLACEHOLDERS.card);
}

export function getActivityGallery(item: any): string[] {
  const slug = item?.slug || item?.activity_slug;
  const explicit = [
    ...(Array.isArray(item?.gallery_images) ? item.gallery_images : []),
    item?.gallery_image_1,
    item?.gallery_image_2,
    item?.gallery_image_3,
  ].filter(Boolean).map((v) => normalizeImagePath(v, ''));

  // Entity gallery only — do not pull sibling activity folders or cross-entity page-assets.
  const discovered = slug
    ? [
        ...listPublicImages(`${EXPERIENCE_ASSET_ROOTS.activities}/${slug}`, true),
        ...listPublicImages(`/assets/images/page-assets/activities/${slug}`, true),
      ]
    : [];

  const hero = getActivityImage(item);
  return [...new Set([...explicit, ...discovered].filter((src) => src && src !== hero))];
}

