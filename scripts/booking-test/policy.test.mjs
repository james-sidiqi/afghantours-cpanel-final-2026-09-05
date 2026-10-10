// Built-site checks for the Cancellation, Refund & Rescheduling Policy (run after `npm run build`).
// The policy page is the single authoritative source; other pages may only point to it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const DIST = path.join(ROOT, 'dist');
const read = (p) => readFileSync(path.join(DIST, p), 'utf8');
const POLICY = 'cancellation-refund-rescheduling/index.html';
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');
const text = (html) => decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const norm = (s) => s.replace(/[*_#>`]/g, ' ').replace(/\s+/g, ' ').trim();
const policyArticle = () => { const h = read(POLICY); const m = h.match(/<article[^>]*data-policy-document[^>]*>([\s\S]*?)<\/article>/); assert.ok(m, 'policy article present'); return m[1]; };
// Owner's text as received (copied unchanged from specs/policy-2026-09-28-verbatim.txt).
const source = readFileSync(path.join(ROOT, 'scripts/booking-test/policy-2026-09-28-verbatim.txt'), 'utf8');

test('policy route builds publicly', () => assert.ok(existsSync(path.join(DIST, POLICY))));
test('policy page: no noindex, no preview, correct canonical', () => {
  const h = read(POLICY);
  assert.ok(!/<meta name="robots" content="[^"]*noindex/i.test(h), 'no noindex');
  assert.ok(!/STAFF PREVIEW|POLICY_PREVIEW/.test(h), 'no preview marker');
  assert.ok(h.includes('<link rel="canonical" href="https://afghantours.com/cancellation-refund-rescheduling/"'), 'canonical');
});
test('policy is listed in the sitemap', () => assert.ok(read('sitemap.xml').includes('<loc>https://afghantours.com/cancellation-refund-rescheduling/</loc>')));
test('rendered policy matches the owner source word for word (whitespace/markdown ignored)', () => {
  assert.equal(norm(text(policyArticle())), norm(source));
});
test('policy keeps stable anchors', () => {
  const a = policyArticle();
  for (const id of ['scheduled-departures-minimum-group-size', 'payments-currency-refunds', 'traveler-cancellations', 'contact-information']) assert.ok(a.includes(`id="${id}"`), id);
  assert.ok(a.includes('href="mailto:info@afghantours.com"'), 'mailto link');
});
test('policy contains the 6/18, 2, 45-day, 14-day and 100% low-numbers refund sentences', () => {
  const t = text(policyArticle());
  for (const s of [
    'scheduled/shared departures lasting 5 days or more require a minimum of 6 confirmed travelers and normally accept a maximum of 18 travelers;',
    'scheduled/shared departures lasting 4 days or less require a minimum of 2 confirmed travelers',
    'we normally review whether the minimum group size has been reached 45 days before departure.',
    'For scheduled/shared departures lasting 4 days or less, we normally review whether the minimum group size has been reached 14 days before departure.',
    'we will refund 100% of the amount paid to James Tourist & Travel Agency for that tour.',
  ]) assert.ok(t.includes(s), s);
});
const POLICY_CLAUSES = [/refund 100%|100% of the amount paid/i, /administrative fee/i, /\d+% of the tour price/i, /14 days or less before departure/i, /require a minimum of (6|six) confirmed travelers/i, /45 days before departure/i, /exchange rates?/i, /Afghan afghanis|Afghani \(AFN\)/i, /Scheduled Departures and Minimum Group Size<\/h2>/];
test('/terms/ links to the policy and contains no duplicated policy clauses', () => {
  const h = read('terms/index.html');
  assert.ok(h.includes('href="/cancellation-refund-rescheduling/"'), 'terms links to policy');
  assert.ok(/data-policy-pointer/.test(h), 'pointer section');
  const main = text(h);
  for (const re of POLICY_CLAUSES) assert.ok(!re.test(main) && !re.test(h.replace(/<footer[\s\S]*<\/footer>/, '')), `terms duplicates policy clause ${re}`);
});
test('footer lists the policy next to the other legal pages', () => {
  for (const p of ['terms/index.html', 'index.html', 'faq/index.html']) {
    const f = (read(p).match(/<footer[\s\S]*<\/footer>/) || [''])[0];
    assert.ok(/<a href="\/terms\/"[^>]*>Terms (&amp;|&) Conditions<\/a>\s*<a href="\/cancellation-refund-rescheduling\/"[^>]*>Cancellation, Refund (&amp;|&) Rescheduling Policy<\/a>/.test(f), p);
  }
});
test('FAQ does not restate policy terms', () => {
  const t = text(read('faq/index.html').replace(/<footer[\s\S]*<\/footer>/, ''));
  for (const re of POLICY_CLAUSES.slice(0, 8)) assert.ok(!re.test(t), `faq restates ${re}`);
});
test('tour pages link to the policy instead of restating it; UI group wording matches the policy', () => {
  const long = read('tours/winter-circuit/index.html'), short = read('tours/weekend-in-kabul/index.html');
  for (const h of [long, short]) {
    assert.ok(h.includes('/cancellation-refund-rescheduling/#scheduled-departures-minimum-group-size'), 'deep link');
    for (const re of POLICY_CLAUSES.slice(0, 4)) assert.ok(!re.test(text(h)), `tour page restates ${re}`);
    assert.ok(!h.includes('/terms/#scheduled-departures-minimum-group-size'), 'no stale anchor');
  }
  assert.ok(/6–18 travelers/.test(text(long)) && /Minimum to operate: 6 travelers/.test(text(long)), 'long: 6–18 / min 6');
  assert.ok(/minimum of 2 confirmed travelers/.test(text(short)), 'short: min 2');
  assert.ok(!/minimum of (6|six)[^.]*four days or less/i.test(text(short)), 'short tour never implies 6');
});
const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const html = walk(DIST).filter((p) => p.endsWith('.html'));
test('no stale links to the old /terms/ policy anchors anywhere', () => {
  for (const p of html) assert.ok(!readFileSync(p, 'utf8').includes('/terms/#scheduled-departures-minimum-group-size'), p);
});
test('general inquiry forms do not require policy acceptance', () => {
  for (const p of ['contact/index.html', 'tours/winter-circuit/index.html']) {
    const h = read(p);
    assert.ok(!/<input[^>]*(policy|terms)_?accept[^>]*>/i.test(h), `${p}: acceptance field`);
    assert.ok(!/<input[^>]*type="checkbox"[^>]*required[^>]*>[^<]*(polic|terms)/i.test(h), `${p}: required policy checkbox`);
  }
  assert.ok(!/policy_accept|terms_accept|accept_policy/.test(readFileSync(path.join(ROOT, 'public/tour-inquiry.php'), 'utf8')), 'inquiry handler requires no acceptance');
});
test('no proposed departure is public in the built site', () => {
  const seed = JSON.parse(readFileSync(path.join(ROOT, 'data/booking/departures.json'), 'utf8')).departures;
  const proposed = seed.filter((d) => d.status === 'proposed');
  assert.equal(proposed.length, 55);
  assert.ok(proposed.every((d) => d.published === false && d.price_approved === false && d.operational_approval === 'pending'), 'proposed stay unpublished / price not approved / ops pending');
  const pages = html.filter((p) => p.includes(`${path.sep}tours${path.sep}`)).map((p) => readFileSync(p, 'utf8')).join('\n');
  for (const d of proposed) assert.ok(!pages.includes(`data-departure-id="${d.id}"`), d.id);
});
test('payments are disabled (no payment UI or endpoints in this build)', () => {
  assert.ok(!existsSync(path.join(DIST, 'pay')) && !existsSync(path.join(DIST, 'payments')) && !existsSync(path.join(DIST, 'checkout')), 'no payment routes');
  for (const p of html) assert.ok(!/hesab|checkout|pay now/i.test(text(readFileSync(p, 'utf8'))), `payment wording in ${p}`);
});
test('Eid presentation: compact collapsible info when no displayed departure conflicts', () => {
  for (const p of ['tours/winter-circuit/index.html', 'tours/weekend-in-kabul/index.html', 'tours/bamyan-skiing-tour/index.html']) {
    const h = read(p);
    assert.ok(/<details class="tdp-eid tdp-eid--info"/.test(h) && !/tdp-eid--warn"/.test(h.replace(/<style[\s\S]*?<\/style>/g, '')), `${p}: compact Eid info`);
  }
});

// ---------------- FINALIZE (owner instruction 10 Oct 2026 20:47) ----------------
const IDENTITY = 'James Tourist & Travel Agency / Operating as AfghanTours.com / Tour Operator License ATO-KBL-1617';
const LEGAL_SRC = path.join(ROOT, 'src/content/legal');
const frontmatter = (file) => {
  const raw = readFileSync(path.join(LEGAL_SRC, file), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const data = Object.fromEntries([...fm[1].matchAll(/^([a-z_]+):\s*(.*)$/gm)].map((m) => [m[1], m[2].replace(/^"|"$/g, '')]));
  return { data, body: fm[2] };
};
for (const [slug, file, page] of [['terms-and-conditions', 'terms-and-conditions.md', 'terms/index.html'], ['privacy-policy', 'privacy-policy.md', 'privacy/index.html']]) {
  test(`${page}: owner text word for word once received; interim page until then (no invented legal text)`, () => {
    const { data, body } = frontmatter(file);
    const h = read(page);
    if (data.full_text_received === 'true') {
      const src = path.join(ROOT, data.source_file);
      assert.ok(existsSync(src), `verbatim source ${data.source_file} present`);
      const m = h.match(new RegExp(`<article[^>]*data-legal-document="${slug}"[^>]*>([\\s\\S]*?)</article>`));
      assert.ok(m, 'full document rendered');
      const rendered = norm(text(m[1]).replace(/^Effective Date: \S+ /, ''));
      assert.equal(rendered, norm(readFileSync(src, 'utf8')));
    } else {
      assert.equal(body.trim(), '', 'no legal text written while the owner text is pending');
      assert.ok(h.includes(`data-legal-interim="${slug}"`), 'interim summary rendered');
      assert.ok(!h.includes('data-legal-document='), 'no partial document presented as final');
    }
  });
}
test('legal identity line on footer, Terms, Privacy, Policy and Contact', () => {
  for (const p of ['index.html', 'terms/index.html', 'privacy/index.html', 'contact/index.html', POLICY]) {
    assert.ok(text(read(p)).includes(IDENTITY), `${p} shows the legal identity`);
  }
});
test('no obsolete payment wording on public pages', () => {
  const bad = [/credit cards? (are|is) not accepted/i, /international (bank )?transfer only/i, /payments are typically made via international transfer/i, /full payment is required prior to the commencement/i];
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []; });
  for (const f of walk(DIST)) { const t = text(readFileSync(f, 'utf8')); for (const re of bad) assert.ok(!re.test(t), `${path.relative(DIST, f)}: ${re}`); }
});
test('tour pages: standard exclusions shown; private/custom/specialist prices on request; "$" prices kept', () => {
  const wk = read('tours/weekend-in-kabul/index.html');
  assert.ok(wk.includes('id="not-included"') && text(wk).includes('Unless specifically stated as included in your itinerary or booking confirmation, the following are not included:') && text(wk).includes('International airfare'));
  assert.ok(text(wk).includes('From $450 per person on shared departures'));
  for (const p of ['tours/treasures-of-silk-road-afghanistan/index.html', 'tours/timurid-grandeur-herat-tour/index.html', 'tours/panjshir-valley-emeralds-history/index.html']) {
    const t = text(read(p));
    assert.ok(t.includes('Price on request') && !/From \$[\d,]+ per person/.test(t), `${p}: Price on request`);
  }
});
test('release fixes: /faqs/ → /faq/, no hub codes, no Weekend attraction codes, Photography inquiry-led', () => {
  assert.ok(read('faqs/index.html').includes('url=/faq/'));
  assert.ok(read('.htaccess').includes('RewriteRule ^faqs/?$ /faq/ [R=301,L]'));
  assert.ok(!/Hub code/.test(read('hubs/kabul-city/index.html')) && !/\bKBLC\b/.test(text(read('hubs/kabul-city/index.html'))));
  assert.ok(!/AT-C-KBL-\d{3}|Included Attractions \(codes\)/.test(read('tours/weekend-in-kabul/index.html')));
  const ph = text(read('specialist-services/photography-documentary/index.html'));
  assert.ok(ph.includes('photography objectives, season, preferred locations, access and local operating conditions') && !/Day 1[0-2]\b|12-day itinerary/.test(ph));
  assert.ok(!existsSync(path.join(ROOT, 'src/layouts/Footer.astro.before-jtta-footer-20260903-211627')));
});
test('duplicate restaurant/hotel titles made unique', () => {
  const t = (p) => (read(p).match(/<title>([^<]*)<\/title>/) || [])[1];
  assert.notEqual(t('hotels/royal_bamyan/index.html'), t('hotels/royal_kandahar/index.html'));
  assert.ok(read('restaurants/spoghmai-restaurant-qargha/index.html').includes('/restaurants/spoghmai-restaurant/'), 'byte-identical duplicate redirects to the canonical page');
  assert.ok(!read('sitemap.xml').includes('/restaurants/spoghmai-restaurant-qargha/'));
});
test('sitemap is deterministic (no lastmod)', () => assert.ok(!read('sitemap.xml').includes('<lastmod>')));
