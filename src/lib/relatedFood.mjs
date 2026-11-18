const key = value => String(value || '').toLowerCase().normalize('NFKD')
  .replace(/[’']/g, '').replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const sourcePath = entry => String(entry.id || '').replace(/\.md$/i, '').replace(/^food\//, '');
const route = value => `/food-culture/${String(value || '').replace(/^\/+|\/+$/g, '')}/`;
const identities = entry => new Set([
  entry.data?.title, entry.data?.food_slug,
  sourcePath(entry).split('/').pop(), String(entry.slug || '').split('/').pop(),
].map(key).filter(Boolean));
const pairsWith = (entry, otherKeys) => (entry.data?.paired_foods || [])
  .some(value => otherKeys.has(key(value)));

/** Only explicit food pairings and shared provinces establish a relationship.
 * A flat URL or a shared category alone must never fill a recommendation grid.
 */
export function selectRelatedFood(current, entries, retiredRoutes = {}, limit = 6) {
  const retired = new Set(Object.keys(retiredRoutes));
  const currentKeys = identities(current);
  const provinces = new Set((current.data?.provinces || []).map(key).filter(Boolean));
  const category = sourcePath(current).split('/')[0];
  return entries.filter(entry => entry.id !== current.id
    && !retired.has(route(entry.slug || sourcePath(entry)))
    && !retired.has(route(sourcePath(entry))))
    .map(candidate => {
      const paired = pairsWith(current, identities(candidate)) || pairsWith(candidate, currentKeys);
      const shared = (candidate.data?.provinces || []).map(key).filter(value => provinces.has(value));
      const related = paired || shared.length > 0;
      const score = (paired ? 10 : 0) + shared.length * 4
        + (related && sourcePath(candidate).split('/')[0] === category ? 2 : 0);
      return { candidate, related, score };
    })
    .filter(item => item.related)
    .sort((a, b) => b.score - a.score || a.candidate.data.title.localeCompare(b.candidate.data.title))
    .slice(0, limit).map(item => item.candidate);
}
