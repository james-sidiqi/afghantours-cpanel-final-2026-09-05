import { parseFrontmatter } from './markdown';

const collections = {
  attractions: import.meta.glob('../content/attractions/*.md', { query: '?raw', import: 'default', eager: true }),
  tours: import.meta.glob('../content/tours/*.md', { query: '?raw', import: 'default', eager: true }),
  hubs: import.meta.glob('../content/hubs/*.md', { query: '?raw', import: 'default', eager: true }),
  provinces: import.meta.glob('../content/provinces/*.md', { query: '?raw', import: 'default', eager: true }),
  regions: import.meta.glob('../content/regions/*.md', { query: '?raw', import: 'default', eager: true }),
  hotels: import.meta.glob('../content/hotels/*.md', { query: '?raw', import: 'default', eager: true }),
  foodDishes: import.meta.glob('../content/food/dishes/*.md', { query: '?raw', import: 'default', eager: true }),
  foodProduce: import.meta.glob('../content/food/produce/*.md', { query: '?raw', import: 'default', eager: true }),
  foodDrinks: import.meta.glob('../content/food/drinks/*.md', { query: '?raw', import: 'default', eager: true }),
  pages: import.meta.glob('../content/pages/*.md', { query: '?raw', import: 'default', eager: true }),
  homepage: import.meta.glob('../content/homepage/*.md', { query: '?raw', import: 'default', eager: true }),
  site: import.meta.glob('../content/site/*.md', { query: '?raw', import: 'default', eager: true })
} as const;

export type ContentEntry = {
  slug: string;
  title: string;
  html: string;
  body: string;
  excerpt: string;
  frontmatter: Record<string, string>;
};

function slugFromPath(path: string): string {
  return path.split('/').pop()?.replace(/\.md$/, '') ?? '';
}

function build(map: Record<string, unknown>): ContentEntry[] {
  return Object.entries(map).map(([path, raw]) => {
    const parsed = parseFrontmatter(String(raw));
    const slug = parsed.frontmatter.slug || parsed.frontmatter.tour_slug || parsed.frontmatter.attraction_slug || parsed.frontmatter.hub_slug || parsed.frontmatter.province_slug || slugFromPath(path);
    return {
      slug,
      title: parsed.frontmatter.title || titleFromSlug(slug),
      html: parsed.html,
      body: parsed.body,
      excerpt: parsed.excerpt,
      frontmatter: parsed.frontmatter
    };
  }).filter((entry) => !entry.slug.toLowerCase().startsWith('readme') && !entry.slug.includes('template'));
}

function titleFromSlug(slug: string): string {
  return slug.split('-').map((s) => s ? s[0].toUpperCase() + s.slice(1) : s).join(' ');
}

export const content = Object.fromEntries(Object.entries(collections).map(([key, value]) => [key, build(value as Record<string, unknown>)])) as Record<string, ContentEntry[]>;

export function findContent(collection: keyof typeof collections, slug: string): ContentEntry | undefined {
  return content[collection]?.find((entry) => entry.slug === slug);
}

export function pageContent(slug: string): ContentEntry | undefined {
  return content.pages?.find((entry) => entry.slug === slug);
}
