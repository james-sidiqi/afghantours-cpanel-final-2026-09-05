#!/usr/bin/env node
/**
 * Copy assets into /assets/images/experiences/{cultural,culinary,activities}/
 * No bulk deletes. Legacy paths remain as resolver fallbacks.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const log = [];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(srcRel, destRel) {
  const src = path.join(PUBLIC, srcRel.replace(/^\//, ''));
  const dest = path.join(PUBLIC, destRel.replace(/^\//, ''));
  if (!fs.existsSync(src)) {
    log.push(`MISSING ${srcRel}`);
    return false;
  }
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest)) {
    const a = fs.statSync(src);
    const b = fs.statSync(dest);
    if (a.size === b.size) {
      log.push(`SKIP identical ${destRel}`);
      return true;
    }
  }
  fs.copyFileSync(src, dest);
  log.push(`COPY ${srcRel} -> ${destRel}`);
  return true;
}

function copyFirstExisting(candidates, destRel) {
  for (const c of candidates) {
    const abs = path.join(PUBLIC, c.replace(/^\//, ''));
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return copyFile(c, destRel);
    }
  }
  log.push(`NO_SOURCE for ${destRel} from [${candidates.join(', ')}]`);
  return false;
}

function listImages(dirRel) {
  const abs = path.join(PUBLIC, dirRel.replace(/^\//, ''));
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(webp|jpg|jpeg|png|avif)$/i.test(e.name)) {
        out.push('/' + path.relative(PUBLIC, full).split(path.sep).join('/'));
      }
    }
  };
  walk(abs);
  return out.sort();
}

// --- Cultural: copy legacy cultural-experiences/<slug> -> experiences/cultural/<slug>
const culturalSlugs = [
  'afghan-carpets', 'afghan-weddings', 'buzkashi', 'eid-and-celebrations',
  'glassblowers-of-herat', 'gudiparan-bazi', 'istalif-pottery', 'kaftar-bazi',
  'kuchi-nomads', 'pahlawani', 'paktika-livestock-markets',
];

for (const slug of culturalSlugs) {
  const destHero = `/assets/images/experiences/cultural/${slug}/hero.webp`;
  const destThumb = `/assets/images/experiences/cultural/${slug}/thumb.webp`;
  const legacyRoot = `/assets/images/cultural-experiences/${slug}`;
  const legacyImages = listImages(legacyRoot);
  const heroCandidates = [
    `${legacyRoot}/hero.webp`,
    ...legacyImages.filter((p) => /hero/i.test(p)),
    ...legacyImages,
  ];
  // Prefer known MD hero paths where legacy folder empty
  const mdHeroFallbacks = {
    'afghan-carpets': ['/assets/images/experiences/activities/shopping/gallery/page-01.webp', '/assets/images/page-assets/activities/sightseeing/shopping/01.webp'],
    'afghan-weddings': ['/assets/images/page-assets/people/tourists/tourists-relaxing-tea.webp'],
    'buzkashi': ['/assets/images/featured-tours/buzkashi-expedition/hero.webp'],
    'eid-and-celebrations': ['/assets/images/food/dishes/gosh-e-fil/hero.webp'],
    'glassblowers-of-herat': ['/assets/images/hubs/herat-city/hero.webp', '/assets/images/cultural-experiences/glassblowers-of-herat/hero.webp'],
    'gudiparan-bazi': ['/assets/images/cultural-experiences/gudiparan-bazi/hero.webp', ...listImages('/assets/images/cultural-experiences/gudiparan-bazi')],
    'istalif-pottery': ['/assets/images/attractions/istalif-village/hero.webp', ...listImages('/assets/images/cultural-experiences/istalif-pottery')],
    'kaftar-bazi': ['/assets/images/cultural-experiences/kaftar-bazi/kaftar-bazi.webp'],
    'kuchi-nomads': ['/assets/images/page-assets/people/cultural-interactions/kabul-village-kids.webp'],
    'pahlawani': ['/assets/images/cultural-experiences/pahlawani/pahlawani.webp'],
    'paktika-livestock-markets': ['/assets/images/attractions/paktika-highlands/hero.webp'],
  };
  copyFirstExisting([...(mdHeroFallbacks[slug] || []), ...heroCandidates], destHero);
  copyFirstExisting([destHero, ...(mdHeroFallbacks[slug] || []), ...heroCandidates], destThumb);
  // gallery copies (up to 6)
  const gal = [...new Set([...(mdHeroFallbacks[slug] || []), ...legacyImages])].filter((p) => !p.endsWith('/hero.webp')).slice(0, 6);
  let i = 1;
  for (const src of gal) {
    const dest = `/assets/images/experiences/cultural/${slug}/gallery/${String(i).padStart(2, '0')}.webp`;
    // only copy webp-like; if jpg source, still copy as numbered file with original ext
    const ext = path.extname(src) || '.webp';
    const dest2 = dest.replace(/\.webp$/, ext);
    if (copyFile(src, dest2)) i++;
  }
}

// --- Culinary: ensure new quroot slug folder exists (already copied); refresh README markers
ensureDir(path.join(PUBLIC, 'assets/images/experiences/culinary'));
ensureDir(path.join(PUBLIC, 'assets/images/experiences/cultural'));
ensureDir(path.join(PUBLIC, 'assets/images/experiences/activities'));

// --- Activities
const activitySources = {
  hiking: [
    '/assets/images/page-assets/website-ready/rocky-valley-hiking.webp',
    '/assets/images/featured-tours/trek-the-wakhan-corridor/01.webp',
  ],
  fishing: [
    '/assets/images/page-assets/activities/other/01.webp',
    // copiloted fishing if present via absolute path outside public — skip
  ],
  trekking: [
    '/assets/images/featured-tours/trek-the-wakhan-corridor/hero.webp',
    '/assets/images/featured-tours/trek-the-wakhan-corridor/01.webp',
    '/assets/images/featured-tours/trek-the-wakhan-corridor/02.webp',
  ],
  skiing: [
    '/assets/images/page-assets/activities/skiing/01.webp',
    '/assets/images/page-assets/activities/skiing/02.webp',
    '/assets/images/featured-tours/bamyan-skiing-tour/hero.webp',
    '/assets/images/page-assets/about/travelers/bamyan-ski-summit.webp',
  ],
  shopping: [
    '/assets/images/experiences/activities/shopping/hero.webp',
    '/assets/images/page-assets/activities/sightseeing/shopping/01.webp',
    '/assets/images/page-assets/activities/sightseeing/markets/01.webp',
    '/assets/images/page-assets/activities/sightseeing/markets/02.webp',
  ],
  sightseeing: [
    '/assets/images/page-assets/activities/sightseeing/scenic/01.webp',
    '/assets/images/page-assets/activities/sightseeing/historical/01.webp',
    '/assets/images/page-assets/activities/sightseeing/religious/01.webp',
  ],
  'horse-riding': [
    '/assets/images/page-assets/about/travelers/horseback-cultural-experience.webp',
  ],
  cycling: [
    '/assets/images/page-assets/website-ready/rocky-valley-hiking.webp',
  ],
};

// Also try copiloted public assets if available on disk
const COPILOT = '/workspace/copiloted-astro-afghantours/public';
function copyFromCopilot(rel, destRel) {
  const src = path.join(COPILOT, rel.replace(/^\//, ''));
  const dest = path.join(PUBLIC, destRel.replace(/^\//, ''));
  if (!fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  log.push(`COPY_COPILOT ${rel} -> ${destRel}`);
  return true;
}

for (const [slug, sources] of Object.entries(activitySources)) {
  const destHero = `/assets/images/experiences/activities/${slug}/hero.webp`;
  const destThumb = `/assets/images/experiences/activities/${slug}/thumb.webp`;
  let ok = copyFirstExisting(sources, destHero);
  if (!ok) {
    // try copiloted activities folders
    const copilotMap = {
      skiing: ['/assets/images/activities/backcountry-skiing/01.webp'],
      fishing: ['/assets/images/activities/fishing/01.webp'],
      shopping: ['/assets/images/activities/shopping/01.webp'],
      sightseeing: ['/assets/images/activities/sightseeing/scenic/01.webp'],
      'horse-riding': ['/assets/images/activities/other/horseback-riding.webp'],
    };
    for (const c of copilotMap[slug] || []) {
      if (copyFromCopilot(c, destHero)) { ok = true; break; }
    }
  }
  copyFirstExisting([destHero, ...sources], destThumb);
  let gi = 1;
  for (const src of sources.slice(1, 5)) {
    const ext = path.extname(src) || '.webp';
    const dest = `/assets/images/experiences/activities/${slug}/gallery/${String(gi).padStart(2, '0')}${ext}`;
    if (copyFile(src, dest)) gi++;
  }
  // sightseeing subtypes optional mirror
  if (slug === 'sightseeing') {
    for (const sub of ['scenic', 'historical', 'religious', 'markets']) {
      // shopping is top-level under activities/shopping — not a sightseeing subtype
      const subImages = listImages(`/assets/images/page-assets/activities/sightseeing/${sub}`);
      for (const img of subImages.slice(0, 3)) {
        const base = path.basename(img);
        copyFile(img, `/assets/images/experiences/activities/sightseeing/${sub}/${base}`);
      }
    }
  }
}

// README markers
for (const folder of ['cultural', 'culinary', 'activities']) {
  const readme = path.join(PUBLIC, 'assets/images/experiences', folder, 'README.md');
  fs.writeFileSync(
    readme,
    `# experiences/${folder}\n\nCanonical asset root for ${folder} experiences.\nLegacy paths are temporary fallbacks only — do not bulk-delete.\n`
  );
}

const reportPath = '/workspace/cpanel-HUB-ASSET-MIGRATION.md';
fs.writeFileSync(
  reportPath,
  [
    '# cPanel Hub Experience Asset Migration',
    '',
    `Date: ${new Date().toISOString()}`,
    '',
    '## Actions (copy only; no deletes)',
    '',
    ...log.map((l) => `- ${l}`),
    '',
    '## Notes',
    '- Legacy `cultural-experiences/` and `page-assets/activities/` left in place.',
    '- Culinary `band-e-amir-dairy-market-quroot` folder retained as fallback beside renamed `band-e-amir-quroot-dairy`.',
    '',
  ].join('\n')
);

console.log(`Logged ${log.length} actions -> ${reportPath}`);
