import ownerSelections from '../data/ownerImageSelections.json';
import { isRejectedImage } from '../data/rejectedImages';
import aliases from '../data/imagePathAliases.json';
import galleries from '../data/imageGalleryManifest.json';
import assets from '../data/imageAssetManifest.json';
import fs from 'node:fs';
import path from 'node:path';

export const PLACEHOLDERS = Object.fromEntries(
  ['tour', 'attraction', 'hotel', 'region', 'province', 'food', 'hub', 'hero', 'card', 'transport']
    .map((kind) => [kind, `/assets/images/placeholders/default-${kind}.webp`])
) as Record<'tour' | 'attraction' | 'hotel' | 'region' | 'province' | 'food' | 'hub' | 'hero' | 'card' | 'transport', string>;

export function normalizeImagePath(value?: string | null, fallback = PLACEHOLDERS.card): string {
  const raw = String(value || '').trim().replace(/^['"]+|['"]+$/g, '');
  if (!raw) return fallback;
  if (/^https?:\/\//.test(raw)) return raw;
  let cleaned = raw.replace(/^public\//, '').replace(/^\.\//, '').replace(/^\/+/, '');
  if (cleaned.startsWith('images/')) cleaned = `assets/${cleaned}`;
  let result = `/${cleaned}`;
  // Exact mappings preserve distinct same-name files from the folder merge.
  result = (aliases as Record<string, string>)[result] || result;
  return result.replace('/assets/images/province/', '/assets/images/provinces/')
    .replace('/assets/images/food/dried-fruit/', '/assets/images/food/dried-fruits/')
    .replace('/assets/images/featured-tours/', '/assets/images/tours/featured/')
    .replace('/assets/images/custom-tours/', '/assets/images/tours/custom/');
}

function assetExists(value?: string | null): boolean {
  const src = normalizeImagePath(value, '');
  if (!src) return false;
  if (/^https?:\/\//.test(src)) return true;
  return fs.existsSync(path.join(process.cwd(), 'public', src.replace(/^\//, '')));
}
export function isPlaceholder(src?: string | null): boolean {
  return !src || /\/placeholders\//.test(String(src));
}
export function hasRealImage(src?: string | null): boolean {
  const value = normalizeImagePath(src, '');
  return Boolean(value && !isPlaceholder(value) && !isRejectedImage(value) && assetExists(value));
}
function firstExisting(values: any[], fallback: string): string {
  return values.map((v) => normalizeImagePath(v, '')).find(hasRealImage) || fallback;
}

/** Card and responsive assets never belong in a photo gallery, even if supplied in data. */
export function isGalleryImage(value?: string | null): boolean {
  const src = normalizeImagePath(value, '');
  const pathname = src.split(/[?#]/)[0];
  const name = pathname.split('/').pop() || '';
  return /\.(webp|jpe?g|png|avif)$/i.test(pathname)
    && !/(^|[-_])(thumb(?:nail)?s?|cards?)([-_\d.]|$)/i.test(name)
    && !/\/(sizes|crops|thumbnails|cards)\//i.test(pathname)
    && hasRealImage(src);
}
export function cleanGallery(values: any[]): string[] {
  return [...new Set(values.filter(Boolean).map((v) => normalizeImagePath(v, '')).filter(isGalleryImage))];
}

/** Explicit inventory only: adding files to public/ never silently changes a gallery. */
export function listGalleryImages(folder?: string | null, recursive = true): string[] {
  const root = normalizeImagePath(folder, '').replace(/\/$/, '');
  if (!root || /^https?:/.test(root)) return [];
  const list = Object.entries(galleries as Record<string, string[]>)
    .filter(([dir]) => dir === root || (recursive && dir.startsWith(`${root}/`)))
    .flatMap(([, entries]) => entries);
  return cleanGallery(list);
}
/** General asset lookup uses an explicit inventory too; this is not a gallery API. */
export function listPublicImages(folder?: string | null, recursive = true): string[] {
  const root = normalizeImagePath(folder, '').replace(/\/$/, '');
  if (!root) return [];
  return [...new Set((assets as string[]).filter((src) => src.startsWith(`${root}/`)
    && (recursive || !src.slice(root.length + 1).includes('/')))
    .map((src) => normalizeImagePath(src, '')).filter(hasRealImage))];
}

function entityHero(item: any, candidates: any[], fallback: string): string {
  return firstExisting([item?.hero_image, item?.hero_image_path, ...candidates,
    item?.featured_image, item?.cover_image_path, item?.image_path_property_1,
    item?.property_image, item?.image_path, item?.image, item?.img_path,
    item?.square_image_path, item?.card_image, item?.thumbnail_image_path, item?.thumbnail_path], fallback);
}
export function getPreferredImage(item: any, fallback = PLACEHOLDERS.card): string {
  return entityHero(item, [], fallback);
}
export function getTourHeroImage(tour: any): string {
  return entityHero(tour, ['featured', 'custom', 'general'].map((kind) => tour?.slug
    ? `/assets/images/tours/${kind}/${tour.slug}/hero.webp` : null), PLACEHOLDERS.tour);
}
export function getTourOverviewImage(tour: any): string {
  return firstExisting([tour?.overview_image, tour?.overview_image_path, tour?.secondary_image,
    ...['featured', 'custom', 'general'].map((kind) => tour?.slug ? `/assets/images/tours/${kind}/${tour.slug}/overview.webp` : null),
    getTourHeroImage(tour)], PLACEHOLDERS.tour);
}
export function getHotelImage(hotel: any): string {
  return entityHero(hotel, [hotel?.slug ? `/assets/images/hotels/${hotel.slug}/hero.webp` : null], PLACEHOLDERS.hotel);
}
export function getRegionImage(region: any): string {
  const slug = region?.slug || region?.region_slug;
  region = { ...region, ...((ownerSelections as Record<string, any>)[`regions/${slug}`] || {}) };
  return entityHero(region, [slug ? `/assets/images/regions/${slug}/hero.webp` : null,
    slug ? `/assets/images/regions/${slug}.webp` : null], PLACEHOLDERS.region);
}
export function getProvinceImage(province: any): string {
  const slug = province?.slug || province?.province_slug;
  return entityHero(province, [slug ? `/assets/images/provinces/${slug}/hero.webp` : null,
    slug ? `/assets/images/provinces/${slug}.webp` : null], PLACEHOLDERS.province);
}
export function getFoodImage(item: any): string {
  const slug = item?.slug || item?.food_slug || item?.dish_slug;
  item = { ...item, ...((ownerSelections as Record<string, any>)[`food/${slug}`] || {}) };
  return entityHero(item, [...['dishes', 'drinks', 'produce', 'dried-fruits'].map((kind) => slug
    ? `/assets/images/food/${kind}/${slug}/hero.webp` : null),
    ...['dishes', 'drinks', 'produce', ''].map((kind) => slug ? `/assets/images/food/${kind ? kind + '/' : ''}${slug}.webp` : null)], PLACEHOLDERS.food);
}
export function getHubImage(hub: any): string {
  const slug = hub?.slug || hub?.location_slug || hub?.destination_slug;
  const base = String(slug || '').replace(/-city$/, '');
  const short = base === 'mazar-e-sharif' ? 'mazar' : base;
  return entityHero(hub, [slug ? `/assets/images/hubs/${slug}/hero.webp` : null,
    base ? `/assets/images/hubs/${base}/hero.webp` : null, base ? `/assets/images/hubs/${base}/01.webp` : null,
    slug ? `/assets/images/hubs/${slug}-1.webp` : null, short ? `/assets/images/hubs/${short}-1.webp` : null], PLACEHOLDERS.hub);
}
export function getAttractionImage(item: any): string {
  item = { ...item, ...((ownerSelections as Record<string, any>)[`attractions/${item?.slug}`] || {}) };
  const code = String(item?.attraction_code || item?.code || '').toLowerCase();
  return entityHero(item, [item?.slug ? `/assets/images/attractions/${item.slug}/hero.webp` : null,
    code ? `/assets/images/attractions/${code}/hero.webp` : null, code ? `/assets/images/attractions/${code}.webp` : null,
    item?.slug ? `/assets/images/attractions/${item.slug}/card.webp` : null], PLACEHOLDERS.attraction);
}
export function buildGallery(entity: any, fallbackType: keyof typeof PLACEHOLDERS = 'card'): string[] {
  let supplied = entity?.gallery_images;
  if (typeof supplied === 'string') {
    try { supplied = JSON.parse(supplied); } catch { supplied = supplied.split('|').filter(Boolean); }
  }
  return cleanGallery([...(Array.isArray(supplied) ? supplied : []),
    entity?.gallery_image_1, entity?.gallery_image_2, entity?.gallery_image_3,
    entity?.gallery1, entity?.gallery2, entity?.gallery3,
    entity?.image_path_property_1, entity?.image_path_property_2, entity?.image_path_property_3]);
}
export const EXPERIENCE_ASSET_ROOTS = {
  culinary: '/assets/images/experiences/culinary',
  cultural: '/assets/images/experiences/cultural',
  activities: '/assets/images/experiences/activities',
} as const;
export function getCulinaryImage(item: any): string {
  const slug = item?.slug || item?.culinary_slug || item?.experience_slug;
  item = { ...item, ...((ownerSelections as Record<string, any>)[`culinary/${slug}`] || {}) };
  return entityHero(item, [slug ? `${EXPERIENCE_ASSET_ROOTS.culinary}/${slug}/hero.webp` : null,
    slug === 'band-e-amir-quroot-dairy' ? `${EXPERIENCE_ASSET_ROOTS.culinary}/band-e-amir-dairy-market-quroot/hero.webp` : null,
    slug ? `${EXPERIENCE_ASSET_ROOTS.cultural}/${slug}/hero.webp` : null,
    slug ? `/assets/images/food/${slug}/hero.webp` : null], PLACEHOLDERS.food);
}
/** Card image for culinary tiles. Empty string means render the card with no photo (no placeholder). */
export function getCulinaryCardImage(item: any): string {
  const slug = item?.slug || item?.culinary_slug || item?.experience_slug;
  const merged = { ...item, ...((ownerSelections as Record<string, any>)[`culinary/${slug}`] || {}) };
  if (merged.hide_card_image === true || merged.card_image === '' || merged.card_image === false) return '';
  if (merged.card_image) {
    const src = normalizeImagePath(merged.card_image, '');
    return hasRealImage(src) ? src : '';
  }
  const hero = getCulinaryImage(merged);
  return isPlaceholder(hero) ? '' : hero;
}
export function getCulturalExperienceImage(item: any): string {
  const slug = item?.slug || item?.id?.replace(/\.md$/, '');
  item = { ...item, ...((ownerSelections as Record<string, any>)[`cultural/${slug}`] || {}) };
  return entityHero(item, [slug ? `${EXPERIENCE_ASSET_ROOTS.cultural}/${slug}/hero.webp` : null], PLACEHOLDERS.attraction);
}
export function getActivityImage(item: any): string {
  const slug = item?.slug || item?.activity_slug;
  item = { ...item, ...((ownerSelections as Record<string, any>)[`activities/${slug}`] || {}) };
  return entityHero(item, [slug ? `${EXPERIENCE_ASSET_ROOTS.activities}/${slug}/hero.webp` : null], PLACEHOLDERS.card);
}
function experienceGallery(item: any, roots: string[], hero: string): string[] {
  // Curated lists take precedence; discovery is from explicit manifest entries only.
  const supplied = buildGallery(item);
  const images = cleanGallery(item?.gallery_mode === 'explicit' || supplied.length ? supplied : roots.flatMap((folder) => listGalleryImages(folder)));
  // Default: keep the hero out of the gallery. Set gallery_exclude_hero: false to show it there too.
  if (item?.gallery_exclude_hero === false) return images;
  return images.filter((src) => src !== hero);
}
export function getCulinaryGallery(item: any): string[] {
  const slug = item?.slug || item?.culinary_slug;
  item = { ...item, ...((ownerSelections as Record<string, any>)[`culinary/${slug}`] || {}) };
  return experienceGallery(item, slug ? [`${EXPERIENCE_ASSET_ROOTS.culinary}/${slug}`,
    `${EXPERIENCE_ASSET_ROOTS.cultural}/${slug}`] : [], getCulinaryImage(item));
}
export function getCulturalExperienceGallery(item: any): string[] {
  const slug = item?.slug || item?.id?.replace(/\.md$/, '');
  return experienceGallery(item, slug ? [`${EXPERIENCE_ASSET_ROOTS.cultural}/${slug}`] : [], getCulturalExperienceImage(item));
}
export function getActivityGallery(item: any): string[] {
  const slug = item?.slug || item?.activity_slug;
  item = { ...item, ...((ownerSelections as Record<string, any>)[`activities/${slug}`] || {}) };
  return experienceGallery(item, slug ? [`${EXPERIENCE_ASSET_ROOTS.activities}/${slug}`,
    `/assets/images/page-assets/activities/${slug}`] : [], getActivityImage(item));
}
