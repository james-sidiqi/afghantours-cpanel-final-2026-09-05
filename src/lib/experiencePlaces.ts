/** Split a cultural-experience markdown body so a "Places within this experience" list can be rendered as attraction cards. */

const PLACES_HEADING =
  /^##\s+Places within this experience\s*$/im;
const ATTRACTION_LINK =
  /\[([^\]]+)\]\(\/attractions\/([a-z0-9-]+)\/?\)/gi;

export function extractAttractionSlugsFromMarkdown(body: string): string[] {
  const slugs: string[] = [];
  const seen = new Set<string>();
  const match = String(body || '').match(PLACES_HEADING);
  if (!match || match.index == null) return slugs;
  const after = String(body).slice(match.index + match[0].length);
  const nextHeading = after.search(/^##\s+/m);
  const section = nextHeading === -1 ? after : after.slice(0, nextHeading);
  for (const link of section.matchAll(ATTRACTION_LINK)) {
    const slug = link[2];
    if (!seen.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  }
  return slugs;
}

export function splitPlacesSection(body: string): { before: string; after: string; hadPlaces: boolean } {
  const text = String(body || '').replace(/\r\n/g, '\n');
  const match = text.match(PLACES_HEADING);
  if (!match || match.index == null) {
    return { before: text.trim(), after: '', hadPlaces: false };
  }
  const before = text.slice(0, match.index).trim();
  const rest = text.slice(match.index + match[0].length);
  const nextHeading = rest.search(/^##\s+/m);
  const after = (nextHeading === -1 ? '' : rest.slice(nextHeading)).trim();
  return { before, after, hadPlaces: true };
}

const PLAN_HEADING = /^##\s+Plan(?:ning)?(?: a visit| the visit)?\s*$/im;

/** When related attractions come from frontmatter, keep planning copy after the cards. */
export function splitIntroAndPlanning(body: string): { before: string; after: string } {
  const places = splitPlacesSection(body);
  if (places.hadPlaces) return { before: places.before, after: places.after };
  const text = String(body || '').replace(/\r\n/g, '\n');
  const match = text.match(PLAN_HEADING);
  if (!match || match.index == null) {
    return { before: text.trim(), after: '' };
  }
  return { before: text.slice(0, match.index).trim(), after: text.slice(match.index).trim() };
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(value: string): string {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** Small markdown subset used in cultural-experience bodies: headings, paragraphs, links, lists. */
export function renderExperienceMarkdown(markdown: string): string {
  const text = String(markdown || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  const blocks = text.split(/\n{2,}/);
  const html: string[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trimEnd());
    if (lines.length === 1 && /^##\s+/.test(lines[0])) {
      html.push(`<h2>${inline(lines[0].replace(/^##\s+/, ''))}</h2>`);
      continue;
    }
    if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
      const items = lines
        .map((line) => `<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`)
        .join('');
      html.push(`<ul>${items}</ul>`);
      continue;
    }
    html.push(`<p>${inline(lines.join(' ').trim())}</p>`);
  }
  return html.join('\n');
}
