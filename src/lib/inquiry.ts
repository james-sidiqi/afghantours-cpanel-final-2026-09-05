/**
 * Canonical AfghanTours inquiry URL builders.
 *
 * Canonical query params (new links MUST use these):
 *   flow, entity_type, entity_code, entity_slug, entity_name, product_class
 *
 * Legacy aliases remain readable by the Contact page parser:
 *   type, tour, tour_slug, service, journey, activity, activity_name, interest, …
 */

export type InquiryFlow =
  | 'scheduled'
  | 'private-fixed'
  | 'custom'
  | 'activity'
  | 'specialist'
  | 'return'
  | 'general';

export type InquiryEntity = {
  flow?: string | null;
  entity_type?: string | null;
  entity_code?: string | null;
  entity_slug?: string | null;
  entity_name?: string | null;
  product_class?: string | null;
  /** Free-form extras (hub, dates, journey=add-activity, …) */
  extras?: Record<string, string | undefined | null>;
};

function enc(value: string): string {
  return encodeURIComponent(value);
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeTourProductClass(raw: unknown): 'scheduled' | 'private-fixed' {
  const pc = clean(raw).toLowerCase();
  if (pc === 'scheduled') return 'scheduled';
  if (pc === 'private-fixed' || pc === 'private' || pc === 'fixed') return 'private-fixed';
  // Conservative default for tour packages when class is missing.
  return 'private-fixed';
}

/** Build /contact/?… with canonical params first. */
export function buildInquiryHref(entity: InquiryEntity): string {
  const params = new URLSearchParams();

  const flow = clean(entity.flow).toLowerCase();
  const entityType = clean(entity.entity_type).toLowerCase();
  const entityCode = clean(entity.entity_code);
  const entitySlug = clean(entity.entity_slug);
  const entityName = clean(entity.entity_name);
  const productClass = clean(entity.product_class).toLowerCase();

  if (flow) params.set('flow', flow);
  if (entityType) params.set('entity_type', entityType);
  if (entityCode) params.set('entity_code', entityCode);
  if (entitySlug) params.set('entity_slug', entitySlug);
  if (entityName) params.set('entity_name', entityName);
  if (productClass) params.set('product_class', productClass);

  if (entity.extras) {
    for (const [key, value] of Object.entries(entity.extras)) {
      const v = clean(value);
      if (!v) continue;
      // Never let extras overwrite canonical keys.
      if (params.has(key)) continue;
      params.set(key, v);
    }
  }

  const qs = params.toString();
  return qs ? `/contact/?${qs}` : '/contact/';
}

/**
 * Canonical tour inquiry link.
 * Scheduled → flow=scheduled, product_class=scheduled
 * Private-fixed → flow=private-fixed, product_class=private-fixed
 */
export function buildTourInquiryHref(tour: {
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  tour_code?: string | null;
  code?: string | null;
  product_class?: string | null;
  tour_class?: string | null;
}): string {
  const productClass = normalizeTourProductClass(tour.product_class ?? tour.tour_class);
  const flow: InquiryFlow = productClass === 'scheduled' ? 'scheduled' : 'private-fixed';
  const name = clean(tour.name) || clean(tour.title);
  const code = clean(tour.tour_code) || clean(tour.code);
  const slug = clean(tour.slug);

  return buildInquiryHref({
    flow,
    entity_type: 'tour',
    entity_code: code || undefined,
    entity_slug: slug || undefined,
    entity_name: name || undefined,
    product_class: productClass,
  });
}

export function buildActivityInquiryHref(activity: {
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  activity_code?: string | null;
  code?: string | null;
  extras?: Record<string, string | undefined | null>;
}): string {
  return buildInquiryHref({
    flow: 'activity',
    entity_type: 'activity',
    entity_code: clean(activity.activity_code) || clean(activity.code) || undefined,
    entity_slug: clean(activity.slug) || undefined,
    entity_name: clean(activity.name) || clean(activity.title) || undefined,
    extras: activity.extras,
  });
}

export function buildSpecialistInquiryHref(service: {
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  service_code?: string | null;
  code?: string | null;
}): string {
  return buildInquiryHref({
    flow: 'specialist',
    entity_type: 'specialist',
    entity_code: clean(service.service_code) || clean(service.code) || undefined,
    entity_slug: clean(service.slug) || undefined,
    entity_name: clean(service.name) || clean(service.title) || undefined,
  });
}

export function buildReturnInquiryHref(journey: {
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  journey_code?: string | null;
  code?: string | null;
}): string {
  return buildInquiryHref({
    flow: 'return',
    entity_type: 'return',
    entity_code: clean(journey.journey_code) || clean(journey.code) || undefined,
    entity_slug: clean(journey.slug) || undefined,
    entity_name: clean(journey.name) || clean(journey.title) || undefined,
  });
}

export function buildCustomInquiryHref(opts?: {
  slug?: string | null;
  name?: string | null;
  code?: string | null;
}): string {
  return buildInquiryHref({
    flow: 'custom',
    entity_type: 'custom',
    entity_code: clean(opts?.code) || 'CTME',
    entity_slug: clean(opts?.slug) || 'custom-expedition',
    entity_name: clean(opts?.name) || 'Build My Journey',
  });
}

/** Tiny client-side mirror for inline scripts (FeaturedTours modal). */
export function tourInquiryHrefClientSnippet(): string {
  return `
function buildTourInquiryHref(tour) {
  const clean = (v) => String(v == null ? '' : v).trim();
  let pc = clean(tour.product_class || tour.tour_class).toLowerCase();
  if (pc !== 'scheduled') pc = (pc === 'private' || pc === 'fixed' || pc === 'private-fixed') ? 'private-fixed' : 'private-fixed';
  if (pc !== 'scheduled' && pc !== 'private-fixed') pc = 'private-fixed';
  const flow = pc === 'scheduled' ? 'scheduled' : 'private-fixed';
  const params = new URLSearchParams();
  params.set('flow', flow);
  params.set('entity_type', 'tour');
  const code = clean(tour.tour_code || tour.code);
  const slug = clean(tour.slug);
  const name = clean(tour.name || tour.title);
  if (code) params.set('entity_code', code);
  if (slug) params.set('entity_slug', slug);
  if (name) params.set('entity_name', name);
  params.set('product_class', pc);
  return '/contact/?' + params.toString();
}
`.trim();
}
