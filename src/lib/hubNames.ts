// t276: hub DISPLAY names only. Slugs, IDs, images, descriptions and province names are unchanged.
// Faizabad, Jalalabad and Mazar-e-Sharif intentionally have no "City" suffix.
export const HUB_DISPLAY_NAMES: Record<string, string> = {
  'bamyan-city': 'Bamyan City',
  'ghazni-city': 'Ghazni City',
  'herat-city': 'Herat City',
  'kabul-city': 'Kabul City',
  'kandahar-city': 'Kandahar City',
  'faizabad-city': 'Faizabad',
  'jalalabad-city': 'Jalalabad',
  'mazar-e-sharif': 'Mazar-e-Sharif',
  'mazar-e-sharif-city': 'Mazar-e-Sharif',
};
export function hubDisplayName(slug: unknown, fallback = ''): string {
  return HUB_DISPLAY_NAMES[String(slug ?? '')] || fallback;
}
