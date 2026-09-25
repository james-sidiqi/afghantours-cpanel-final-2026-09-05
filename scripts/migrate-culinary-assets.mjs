#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const report = [];

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function copyIfExists(srcRel, destRel, note) {
  const src = path.join(publicRoot, srcRel.replace(/^\//, ''));
  const dest = path.join(publicRoot, destRel.replace(/^\//, ''));
  if (!fs.existsSync(src)) {
    report.push({ status: 'MISSING_SOURCE', src: srcRel, dest: destRel, note });
    return false;
  }
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest)) {
    const same = sha256(src) === sha256(dest);
    report.push({
      status: same ? 'ALREADY_IDENTICAL' : 'DEST_EXISTS_DIFFERENT',
      src: srcRel,
      dest: destRel,
      note,
      src_sha: sha256(src),
      dest_sha: sha256(dest),
    });
    if (!same) {
      // Keep dest; record conflict — do not overwrite without review
      return false;
    }
    return true;
  }
  fs.copyFileSync(src, dest);
  report.push({
    status: 'COPIED',
    src: srcRel,
    dest: destRel,
    note,
    sha256: sha256(dest),
  });
  return true;
}

function copyGallery(srcFolderRel, destSlug, prefix = '') {
  const srcDir = path.join(publicRoot, srcFolderRel.replace(/^\//, ''));
  if (!fs.existsSync(srcDir)) return;
  const files = fs
    .readdirSync(srcDir)
    .filter((n) => /\.(webp|jpg|jpeg|png|avif)$/i.test(n) && !/^hero\./i.test(n) && !/^thumb\./i.test(n))
    .sort();
  let i = 1;
  for (const file of files) {
    const num = String(i).padStart(2, '0');
    const dest = `/assets/images/experiences/culinary/${destSlug}/gallery/${num}.webp`;
    // Keep original extension if not webp
    const ext = path.extname(file).toLowerCase();
    const destFinal = ext === '.webp' ? dest : dest.replace(/\.webp$/, ext);
    copyIfExists(`${srcFolderRel.replace(/\/?$/, '/')}${file}`, destFinal, `${prefix}gallery`);
    i += 1;
  }
}

const plan = [
  {
    slug: 'adam-khan-chapli-kabob',
    heroes: [
      '/assets/images/cultural-experiences/adam-khan-chapli-kabob/hero.webp',
      '/assets/images/food/adam-khan-chapli/hero.webp',
    ],
    galleryFrom: ['/assets/images/cultural-experiences/adam-khan-chapli-kabob'],
  },
  {
    slug: 'kunar-trout',
    heroes: [
      '/assets/images/food/dishes/kunar-trout/hero.webp',
      '/assets/images/attractions/kunar-river-valley/hero.webp',
    ],
    galleryFrom: ['/assets/images/food/dishes/kunar-trout'],
  },
  {
    slug: 'kandahari-rosh',
    heroes: [
      '/assets/images/food/dishes/kandahari-rosh/hero.webp',
      '/assets/images/food/dishes/kandahari-rosh/hero.png',
    ],
    galleryFrom: ['/assets/images/food/dishes/kandahari-rosh'],
  },
  {
    slug: 'chashma-e-dogh',
    heroes: [
      '/assets/images/cultural-experiences/chashma-e-dogh/hero.webp',
      '/assets/images/food/chashma-e-dough/hero.webp',
    ],
    galleryFrom: [
      '/assets/images/cultural-experiences/chashma-e-dogh',
      '/assets/images/food/chashma-e-dough',
    ],
  },
  {
    slug: 'kabul-chainaki',
    heroes: [
      '/assets/images/food/dishes/kabul-kabob/hero.webp',
      '/assets/images/food/setting_table/hero.webp',
    ],
    galleryFrom: [],
    note: 'No dedicated chainaki asset; interim kabob/setting imagery',
  },
  {
    slug: 'aziz-bakery',
    heroes: [
      '/assets/images/cultural-experiences/aziz-bakery/hero.webp',
      '/assets/images/food/bakery-kabul/hero.webp',
    ],
    galleryFrom: ['/assets/images/cultural-experiences/aziz-bakery'],
  },
  {
    slug: 'bamyan-kabob',
    heroes: [
      '/assets/images/food/dishes/kabob/hero.webp',
      '/assets/images/food/dishes/kabul-kabob/hero.webp',
    ],
    galleryFrom: ['/assets/images/food/dishes/kabob'],
    note: 'No Bamyan-specific kabob venue photos; using generic kabob interim',
  },
  {
    slug: 'band-e-amir-quroot-dairy',
    heroes: [
      '/assets/images/food/produce/qurut-markets-of-bamyan/bamyan-qurut.webp',
      '/assets/images/food/produce/qurut-markets-of-bamyan/qurut-bamyan.webp',
    ],
    galleryFrom: ['/assets/images/food/produce/qurut-markets-of-bamyan'],
    alsoFromCopilot: '/workspace/copiloted-astro-afghantours/public/assets/images/experiences/culinary/qurut-markets-of-bamyan',
  },
  {
    slug: 'arg-restaurant-herat',
    heroes: [
      '/assets/images/cultural-experiences/arg-restaurant-herat/hero.webp',
      '/assets/images/hotels/herat/arg/hero.webp',
    ],
    galleryFrom: ['/assets/images/cultural-experiences/arg-restaurant-herat'],
  },
  {
    slug: 'ghazni-palaw',
    heroes: [
      '/assets/images/food/dishes/kabuli-palaw/hero.webp',
      '/assets/images/food/dishes/kabuli-pulao/hero.webp',
    ],
    galleryFrom: ['/assets/images/food/dishes/kabuli-palaw'],
    note: 'No Ghazni-specific palaw venue photos; using kabuli palaw interim',
  },
  {
    slug: 'mansoor-kabob',
    heroes: [
      '/assets/images/food/dishes/kabob/hero.webp',
      '/assets/images/food/dishes/herat-kabob/hero.webp',
    ],
    galleryFrom: ['/assets/images/food/dishes/kabob'],
    note: 'No Mansoor-specific photos found; using generic kabob interim',
  },
];

for (const item of plan) {
  const destHero = `/assets/images/experiences/culinary/${item.slug}/hero.webp`;
  const destThumb = `/assets/images/experiences/culinary/${item.slug}/thumb.webp`;
  let heroDone = false;
  for (const src of item.heroes) {
    if (heroDone) break;
    const ext = path.extname(src).toLowerCase();
    const dest = ext === '.webp' || ext === '.png' || ext === '.jpg' || ext === '.jpeg'
      ? (ext === '.webp' ? destHero : destHero.replace(/\.webp$/, ext))
      : destHero;
    // Prefer webp dest always for hero if source is webp; for png copy as hero.png then also note
    if (copyIfExists(src, ext === '.webp' ? destHero : `/assets/images/experiences/culinary/${item.slug}/hero${ext}`, item.note || 'hero')) {
      heroDone = true;
      // thumb from same
      if (ext === '.webp') copyIfExists(src, destThumb, 'thumb from hero');
    }
  }
  for (const g of item.galleryFrom || []) {
    copyGallery(g, item.slug, '');
  }
}

// Also seed cultural/ and activities/ README markers (hierarchy documentation)
for (const sibling of ['cultural', 'activities']) {
  const dir = path.join(publicRoot, `assets/images/experiences/${sibling}`);
  ensureDir(dir);
  const readme = path.join(dir, 'README.md');
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      `# experiences/${sibling}\n\nLong-term sibling of experiences/culinary. Migrate cultural experience and activity assets here over time. Do not delete legacy /assets/images/cultural-experiences/ until refs are migrated and byte-identical confirmation is complete.\n`
    );
  }
}

const outMd = path.join('/workspace', 'cpanel-CULINARY-ASSET-MIGRATION.md');
const lines = [
  '# cPanel Culinary Asset Migration',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  'Target hierarchy: `/assets/images/experiences/culinary/<slug>/{hero,thumb}.webp` + `gallery/01.webp…`',
  '',
  'Siblings documented: `experiences/cultural/`, `experiences/activities/`',
  '',
  '| status | src | dest | note | hash |',
  '|---|---|---|---|---|',
];
for (const row of report) {
  lines.push(
    `| ${row.status} | \`${row.src}\` | \`${row.dest}\` | ${row.note || ''} | ${(row.sha256 || row.src_sha || '').slice(0, 12)} |`
  );
}
fs.writeFileSync(outMd, lines.join('\n') + '\n');
console.log(`Migrated with ${report.length} rows → ${outMd}`);
console.log(report.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {}));
