/** Shared attraction metadata display helpers (modals/cards). */

const FITNESS_LABEL = 'Fitness Level';

const NOTES_REGION_OVERRIDES: Record<string, string> = {
  // Top metadata keeps CSV region (Central); traveler notes show North.
  'ahmad-shah-massoud-mausoleum': 'North',
};

export function cleanMetaValue(value: unknown): string {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function titleCaseMeta(value: unknown): string {
  const raw = cleanMetaValue(value);
  if (!raw) return '';
  return raw.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatFitnessLevel(access: unknown): string {
  const level = titleCaseMeta(access);
  if (!level) return '';
  return `${FITNESS_LABEL}: ${level}`;
}

export function formatVisitDuration(hours: unknown): string {
  const n = Number(hours);
  if (!Number.isFinite(n) || n <= 0) {
    const raw = cleanMetaValue(hours);
    return raw;
  }
  const label = n === 1 ? 'hour' : 'hours';
  // Prefer whole hours when value is integer-like.
  const display = Number.isInteger(n) ? String(n) : String(n);
  return `${display} ${label}`;
}

export function travelerNotesRegion(slug: unknown, region: unknown): string {
  // Keep slug punctuation for lookup (do not run through cleanMetaValue).
  const key = String(slug ?? '').trim().toLowerCase();
  if (key && NOTES_REGION_OVERRIDES[key]) {
    return NOTES_REGION_OVERRIDES[key];
  }
  return titleCaseMeta(region);
}

export function buildAttractionTopMeta(input: {
  category?: unknown;
  region?: unknown;
  access?: unknown;
  access_difficulty?: unknown;
}): string[] {
  const category = titleCaseMeta(input.category);
  const region = titleCaseMeta(input.region);
  const fitness = formatFitnessLevel(
    input.access ?? input.access_difficulty
  );
  return [category, region, fitness].filter(Boolean);
}

export function buildAttractionTravelerNotes(input: {
  slug?: unknown;
  province?: unknown;
  region?: unknown;
  visit_duration_hours?: unknown;
  duration?: unknown;
  /** When true, omit fitness/access (already shown in top meta). */
  omitFitness?: boolean;
  access?: unknown;
  access_difficulty?: unknown;
  season?: unknown;
}): Array<[string, string]> {
  const notes: Array<[string, string]> = [];
  const province = titleCaseMeta(input.province);
  const region = travelerNotesRegion(input.slug, input.region);
  const duration =
    input.visit_duration_hours != null && input.visit_duration_hours !== ''
      ? formatVisitDuration(input.visit_duration_hours)
      : cleanMetaValue(input.duration);

  if (province) notes.push(['Province', province]);
  if (region) notes.push(['Region', region]);
  if (duration) notes.push(['Visit Duration', duration]);

  if (!input.omitFitness) {
    const fitness = formatFitnessLevel(
      input.access ?? input.access_difficulty
    );
    if (fitness) notes.push([FITNESS_LABEL, fitness.replace(/^Fitness Level:\s*/i, '')]);
  }

  const season = cleanMetaValue(input.season);
  if (season) notes.push(['Season', season]);

  return notes;
}
