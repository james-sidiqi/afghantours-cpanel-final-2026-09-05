import culturalHubsRaw from '../../data/cultural_experience_hubs.csv?raw';
import culinaryHubsRaw from '../../data/culinary_experience_hubs.csv?raw';
import activityHubsRaw from '../../data/activity_hubs.csv?raw';
import activitiesRaw from '../../data/activities.csv?raw';
import tourActivityMapRaw from '../../data/tour_activity_map.csv?raw';
import { parseCSV, isActive } from './csv';
import { getActivityImage } from './images';

/** Repo hub page slugs after canonicalization (active operational set). */
export const ACTIVE_HUB_SLUGS = [
  'kabul-city',
  'jalalabad-city',
  'bamyan-city',
  'mazar-e-sharif',
  'faizabad-city',
  'kandahar-city',
  'herat-city',
  'ghazni-city',
] as const;

export type HubSlug = (typeof ACTIVE_HUB_SLUGS)[number];

export type RelationRow = Record<string, any>;

function normalizeHubKey(hubSlug: string): string {
  const s = String(hubSlug || '').trim();
  if (s === 'faizabad') return 'faizabad-city';
  if (s === 'jalalabad') return 'jalalabad-city';
  if (s === 'mazar-e-sharif-city') return 'mazar-e-sharif';
  return s;
}

function hubMatch(rowHub: string, hubSlug: string): boolean {
  const a = normalizeHubKey(rowHub);
  const b = normalizeHubKey(hubSlug);
  if (a === b) return true;
  const ab = a.replace(/-city$/, '');
  const bb = b.replace(/-city$/, '');
  return ab === bb;
}

export function getCulturalExperienceHubs(): RelationRow[] {
  return parseCSV(culturalHubsRaw).filter((r) => isActive(r.is_active));
}

export function getCulinaryExperienceHubs(): RelationRow[] {
  return parseCSV(culinaryHubsRaw).filter((r) => isActive(r.is_active));
}

export function getActivityHubs(): RelationRow[] {
  return parseCSV(activityHubsRaw).filter((r) => isActive(r.is_active));
}

export function getCulturalForHub(hubSlug: string): RelationRow[] {
  return getCulturalExperienceHubs()
    .filter((r) => hubMatch(r.hub_slug, hubSlug))
    .sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));
}

export function getActivityRelationsForHub(hubSlug: string): RelationRow[] {
  return getActivityHubs()
    .filter((r) => hubMatch(r.hub_slug, hubSlug))
    .sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));
}

export function getHubsForCultural(experienceSlug: string): RelationRow[] {
  return getCulturalExperienceHubs()
    .filter((r) => r.experience_slug === experienceSlug)
    .sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));
}

export function getHubsForActivity(activitySlug: string): RelationRow[] {
  const activity = getActivities().find((a) => a.slug === activitySlug);
  // Semantic all-hubs rule: if flagged, expand from ACTIVE_HUB_SLUGS even if CSV incomplete
  if (activity && String(activity.all_active_hubs) === '1') {
    const existing = getActivityHubs().filter((r) => r.activity_slug === activitySlug);
    const byHub = new Map(existing.map((r) => [normalizeHubKey(r.hub_slug), r]));
    return ACTIVE_HUB_SLUGS.map((hub, i) => {
      const found = byHub.get(hub);
      return (
        found || {
          activity_slug: activitySlug,
          hub_slug: hub,
          access_type: 'from-hub',
          availability_note: 'Planned from this active hub when access allows',
          priority: (i + 1) * 10,
          is_active: '1',
          source_rule: 'all_active_hubs',
        }
      );
    });
  }
  return getActivityHubs()
    .filter((r) => r.activity_slug === activitySlug)
    .sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));
}

export function getActivities(): RelationRow[] {
  return parseCSV(activitiesRaw)
    .filter((r) => isActive(r.is_active))
    .map((row) => ({
      ...row,
      image: getActivityImage({ slug: row.slug }),
      href: `/activities/${row.slug}/`,
    }))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

export function getActivityBySlug(slug: string): RelationRow | undefined {
  return getActivities().find((x) => x.slug === slug);
}

export function getActivitiesForHub(hubSlug: string): RelationRow[] {
  const relations = getActivityRelationsForHub(hubSlug);
  const bySlug = new Map(getActivities().map((a) => [a.slug, a]));
  // Also apply all_active_hubs semantic rule
  for (const activity of getActivities()) {
    if (String(activity.all_active_hubs) === '1') {
      if (!relations.some((r) => r.activity_slug === activity.slug)) {
        relations.push({
          activity_slug: activity.slug,
          hub_slug: normalizeHubKey(hubSlug),
          access_type: 'from-hub',
          availability_note: 'Planned from this active hub when access allows',
          priority: Number(activity.sort_order || 99),
          is_active: '1',
          source_rule: 'all_active_hubs',
        });
      }
    }
  }
  const seen = new Set<string>();
  const out: RelationRow[] = [];
  for (const rel of relations.sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0))) {
    const act = bySlug.get(rel.activity_slug);
    if (!act || seen.has(act.slug)) continue;
    seen.add(act.slug);
    out.push({
      ...act,
      access_type: rel.access_type,
      availability_note: rel.availability_note,
      relation_priority: rel.priority,
    });
  }
  return out;
}

export function accessTypeLabel(ctx?: string): string {
  switch (String(ctx || '')) {
    case 'in-hub':
      return 'In hub';
    case 'near-hub':
      return 'Near hub';
    case 'day-trip':
    case 'day-trip / excursion':
      return 'Day trip / excursion';
    case 'excursion':
      return 'Hub excursion';
    case 'event-based':
      return 'Event-based';
    case 'from-hub':
      return 'From hub';
    case 'seasonal':
      return 'Seasonal';
    case 'expedition-base':
      return 'Expedition base';
    default:
      return ctx ? String(ctx) : 'Experience';
  }
}

export function getTourActivityMap(): RelationRow[] {
  return parseCSV(tourActivityMapRaw).filter((r) => isActive(r.is_active));
}

/** Tours with an explicit activity relationship (never inferred from shared hubs). */
export function getToursForActivity(activitySlug: string): RelationRow[] {
  const rows = getTourActivityMap().filter((r) => r.activity_slug === activitySlug);
  // Collapse duplicate tour_codes, prefer earliest day_number then included>optional>possible-on-request
  const rank = (s: string) => ({ included: 0, optional: 1, 'possible-on-request': 2 }[String(s || '').toLowerCase()] ?? 9);
  const byCode = new Map<string, RelationRow>();
  for (const row of rows) {
    const code = String(row.tour_code || '');
    if (!code) continue;
    const prev = byCode.get(code);
    if (!prev) {
      byCode.set(code, { ...row });
      continue;
    }
    const betterStatus = rank(row.status) < rank(prev.status);
    const earlierDay =
      row.day_number && (!prev.day_number || Number(row.day_number) < Number(prev.day_number));
    if (betterStatus || (rank(row.status) === rank(prev.status) && earlierDay)) {
      byCode.set(code, {
        ...prev,
        ...row,
        note: [prev.note, row.note].filter(Boolean).join(' · '),
      });
    } else if (row.note && row.note !== prev.note) {
      byCode.set(code, { ...prev, note: [prev.note, row.note].filter(Boolean).join(' · ') });
    }
  }
  return [...byCode.values()].sort((a, b) => rank(a.status) - rank(b.status));
}
