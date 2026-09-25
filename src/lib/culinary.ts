import culinaryRaw from '../../data/culinary_experiences.csv?raw';
import tourCulinaryRaw from '../../data/tour_culinary_map.csv?raw';
import { parseCSV, isActive, splitList } from './csv';
import { getCulinaryImage } from './images';

export type CulinaryRow = Record<string, any>;

/** Restaurant collection slugs whose primary public URL is culinary. */
export const RESTAURANT_TO_CULINARY: Record<string, string> = {
  'adam-khan-chapli-kabob': '/cultural-experiences/culinary/adam-khan-chapli-kabob/',
  'arg-restaurant-herat': '/cultural-experiences/culinary/arg-restaurant-herat/',
  'aziz-bakery': '/cultural-experiences/culinary/aziz-bakery/',
  'bakery-kabul': '/cultural-experiences/culinary/aziz-bakery/',
  'chashma-e-dough': '/cultural-experiences/culinary/chashma-e-dogh/',
};


const FOOD_HREF_FALLBACKS: Record<string, string> = {
  'chapli-kabob': '/food-culture/dishes/chapli-kabob/',
  'kunar-trout': '/food-culture/dishes/kunar-trout/',
  'kandahar-rosht': '/food-culture/dishes/kandahari-rosh/',
  'kandahari-rosh': '/food-culture/dishes/kandahari-rosh/',
  dogh: '/food-culture/drinks/dogh/',
  'qurut-markets-of-bamyan': '/food-culture/produce/qurut-markets-of-bamyan/',
  qurut: '/food-culture/produce/qurut-markets-of-bamyan/',
  quroot: '/food-culture/produce/qurut-markets-of-bamyan/',
  'kabuli-pulao': '/food-culture/dishes/kabuli-pulao/',
  'kabuli-palaw': '/food-culture/dishes/kabuli-pulao/',
};

export function getCulinaryExperiences(): CulinaryRow[] {
  return parseCSV(culinaryRaw)
    .filter((r) => isActive(r.is_active))
    .map((row) => {
      const related = splitList(row.related_food_slugs || '');
      const provinces = splitList(row.provinces || '');
      return {
        ...row,
        related_food_slugs: related,
        provinces,
        image: getCulinaryImage({ ...row, slug: row.slug }),
        href: `/cultural-experiences/culinary/${row.slug}/`,
      };
    })
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

export function getCulinaryBySlug(slug: string): CulinaryRow | undefined {
  return getCulinaryExperiences().find((x) => x.slug === slug);
}

export function getCulinaryForHub(hubSlug: string): CulinaryRow[] {
  const base = String(hubSlug || '').replace(/-city$/, '');
  return getCulinaryExperiences().filter((item) => {
    const hs = String(item.hub_slug || '');
    return hs === hubSlug || hs === `${base}-city` || hs.replace(/-city$/, '') === base;
  });
}

/** Public venue label — never surfaces TBD / needs-venue as primary copy. */
export function publicVenueLabel(item: CulinaryRow): string | null {
  const status = String(item.venue_status || '').toLowerCase();
  const name = String(item.venue_name || '').trim();
  if (!name) return null;
  if (status.includes('needs exact')) return null;
  if (status === 'confirmed' || status.startsWith('operator') || status.includes('confirmed')) {
    return name;
  }
  if (status.includes('market') || status.includes('non-restaurant')) return null;
  return name || null;
}

export function publicVenueTypeLabel(item: CulinaryRow): string | null {
  const type = String(item.venue_type || '').trim();
  if (!type) return null;
  const map: Record<string, string> = {
    restaurant: 'Restaurant experience',
    bakery: 'Bakery stop',
    'roadside-stop': 'Roadside food stop',
    'food-stop': 'Local food stop',
    market: 'Market experience',
  };
  return map[type] || type;
}

export function routeContextLabel(ctx?: string): string {
  switch (ctx) {
    case 'in-hub':
      return 'In hub';
    case 'near-hub':
      return 'Near hub';
    case 'day-trip':
      return 'Day trip from hub';
    case 'excursion':
      return 'Hub excursion';
    default:
      return 'Culinary experience';
  }
}

export function relatedFoodLinks(item: CulinaryRow): Array<{ slug: string; href: string; label: string }> {
  const slugs = Array.isArray(item.related_food_slugs)
    ? item.related_food_slugs
    : splitList(String(item.related_food_slugs || ''));
  return slugs.map((slug: string) => ({
    slug,
    href: FOOD_HREF_FALLBACKS[slug] || `/food-culture/${slug}/`,
    label: slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  }));
}

/** Schema-ready tour↔culinary links — empty until operators assign real rows. */
export function getTourCulinaryLinks(): CulinaryRow[] {
  return parseCSV(tourCulinaryRaw).filter((r) => isActive(r.is_active));
}

export function getCulinaryForTour(tourSlugOrCode: string): CulinaryRow[] {
  const key = String(tourSlugOrCode || '');
  const links = getTourCulinaryLinks().filter(
    (r) => r.tour_slug === key || r.tour_code === key
  );
  const bySlug = new Map(getCulinaryExperiences().map((c) => [c.slug, c]));
  return links.map((l) => bySlug.get(l.culinary_slug)).filter(Boolean) as CulinaryRow[];
}

/** Map Food & Culture slugs → culinary experience slugs for reverse links. */
export const FOOD_TO_CULINARY: Record<string, string[]> = {
  'chapli-kabob': ['adam-khan-chapli-kabob'],
  'kunar-trout': ['kunar-trout'],
  'kandahar-rosht': ['kandahari-rosh'],
  'kandahari-rosh': ['kandahari-rosh'],
  dogh: ['chashma-e-dogh'],
  doogh: ['chashma-e-dogh'],
  'qurut-markets-of-bamyan': ['band-e-amir-dairy-market-quroot'],
  qurut: ['band-e-amir-dairy-market-quroot'],
  'kabuli-pulao': ['ghazni-palaw'],
  'kabuli-palaw': ['ghazni-palaw'],
};

export function culinaryLinksForFoodSlug(foodSlug: string): Array<{ slug: string; href: string; title: string }> {
  const slugs = FOOD_TO_CULINARY[foodSlug] || [];
  const all = new Map(getCulinaryExperiences().map((c) => [c.slug, c]));
  return slugs
    .map((s) => all.get(s))
    .filter(Boolean)
    .map((c) => ({
      slug: c!.slug,
      href: c!.href,
      title: c!.name || c!.title,
    }));
}
