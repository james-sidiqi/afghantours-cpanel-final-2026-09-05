// t276: display names for the regions. IDs/slugs/data values (North, South, East, West, Central) are unchanged;
// only what visitors read is mapped. Central stays as-is.
const REGION_DISPLAY: Record<string, string> = {
  north: 'Northern Afghanistan',
  south: 'Southern Afghanistan',
  east: 'Eastern Afghanistan',
  west: 'Western Afghanistan',
  'north afghanistan': 'Northern Afghanistan',
  'south afghanistan': 'Southern Afghanistan',
  'east afghanistan': 'Eastern Afghanistan',
  'west afghanistan': 'Western Afghanistan',
};
export function regionDisplayName(value: unknown): string {
  const raw = String(value ?? '').trim();
  return REGION_DISPLAY[raw.toLowerCase()] || raw;
}
