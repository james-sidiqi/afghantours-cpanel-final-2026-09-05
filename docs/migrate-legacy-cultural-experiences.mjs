#!/usr/bin/env node
/**
 * Migrate public/assets/images/cultural-experiences/ into canonical trees:
 *   experiences/cultural|culinary|activities
 *   food/{dishes,drinks,produce,dried-fruits,desserts}
 * Then rewrite source refs and delete the legacy tree.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const legacyRoot = path.join(publicRoot, 'assets/images/cultural-experiences');

const report = {
  inventory: [],
  migrations: [],
  uniquePreserved: 0,
  duplicatesRemoved: 0,
  aliases: [],
  obsolete: [],
  refsUpdated: [],
};

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => /\.(webp|jpg|jpeg|png|avif)$/i.test(n))
    .sort();
}

function isHero(name) {
  return /^hero\./i.test(name);
}

function isThumb(name) {
  return /^thumb\./i.test(name);
}

/**
 * Merge images from srcDir into destDir.
 * - Never overwrite existing hero/thumb with legacy.
 * - Unique gallery images appended as next 01.webp style numbers.
 * - Identical hashes skipped (duplicate removed count).
 */
function mergeEntity(srcRel, destRel, { class: cls, note }) {
  const srcDir = path.join(publicRoot, srcRel.replace(/^\//, ''));
  const destDir = path.join(publicRoot, destRel.replace(/^\//, ''));
  if (!fs.existsSync(srcDir)) {
    report.migrations.push({ status: 'MISSING_SOURCE', src: srcRel, dest: destRel, class: cls, note });
    return;
  }
  ensureDir(destDir);
  const galleryDir = path.join(destDir, 'gallery');
  ensureDir(galleryDir);

  const existingHashes = new Set();
  for (const f of [...listImages(destDir), ...listImages(galleryDir)]) {
    const p = fs.existsSync(path.join(galleryDir, f)) && !fs.existsSync(path.join(destDir, f))
      ? path.join(galleryDir, f)
      : path.join(destDir, f);
    // Prefer checking both
    const candidates = [path.join(destDir, f), path.join(galleryDir, f)].filter((x) => fs.existsSync(x));
    for (const c of candidates) existingHashes.add(sha256(c));
  }

  // rebuild existing hash set properly
  existingHashes.clear();
  function collectHashes(d) {
    if (!fs.existsSync(d)) return;
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) collectHashes(p);
      else if (/\.(webp|jpg|jpeg|png|avif)$/i.test(ent.name)) existingHashes.add(sha256(p));
    }
  }
  collectHashes(destDir);

  const srcFiles = listImages(srcDir);
  let nextGallery = listImages(galleryDir)
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0) + 1;

  const destHasHero = listImages(destDir).some(isHero);

  for (const file of srcFiles) {
    const srcPath = path.join(srcDir, file);
    const hash = sha256(srcPath);

    if (existingHashes.has(hash)) {
      report.duplicatesRemoved += 1;
      report.migrations.push({
        status: 'DUPLICATE_SKIPPED',
        src: `${srcRel}/${file}`,
        dest: destRel,
        class: cls,
        sha256: hash,
        note,
      });
      continue;
    }

    if (isHero(file)) {
      if (destHasHero) {
        // Keep approved hero; preserve unique legacy hero as gallery image
        const ext = path.extname(file).toLowerCase() || '.webp';
        const num = String(nextGallery).padStart(2, '0');
        const destPath = path.join(galleryDir, `${num}${ext === '.webp' ? '.webp' : ext}`);
        fs.copyFileSync(srcPath, destPath);
        existingHashes.add(hash);
        report.uniquePreserved += 1;
        nextGallery += 1;
        report.migrations.push({
          status: 'HERO_PRESERVED_AS_GALLERY',
          src: `${srcRel}/${file}`,
          dest: destPath.replace(publicRoot, '').replace(/\\/g, '/'),
          class: cls,
          sha256: hash,
          note: note + ' (canonical hero kept)',
        });
      } else {
        const destPath = path.join(destDir, `hero${path.extname(file).toLowerCase() || '.webp'}`);
        fs.copyFileSync(srcPath, destPath);
        existingHashes.add(hash);
        report.uniquePreserved += 1;
        report.migrations.push({
          status: 'HERO_COPIED',
          src: `${srcRel}/${file}`,
          dest: destPath.replace(publicRoot, '').replace(/\\/g, '/'),
          class: cls,
          sha256: hash,
          note,
        });
      }
      continue;
    }

    if (isThumb(file)) {
      const destThumb = path.join(destDir, `thumb${path.extname(file).toLowerCase() || '.webp'}`);
      if (fs.existsSync(destThumb)) {
        // preserve unique as gallery
        const ext = path.extname(file).toLowerCase() || '.webp';
        const num = String(nextGallery).padStart(2, '0');
        const destPath = path.join(galleryDir, `${num}${ext}`);
        fs.copyFileSync(srcPath, destPath);
        existingHashes.add(hash);
        report.uniquePreserved += 1;
        nextGallery += 1;
        report.migrations.push({
          status: 'THUMB_PRESERVED_AS_GALLERY',
          src: `${srcRel}/${file}`,
          dest: destPath.replace(publicRoot, '').replace(/\\/g, '/'),
          class: cls,
          sha256: hash,
          note,
        });
      } else {
        fs.copyFileSync(srcPath, destThumb);
        existingHashes.add(hash);
        report.uniquePreserved += 1;
        report.migrations.push({
          status: 'THUMB_COPIED',
          src: `${srcRel}/${file}`,
          dest: destThumb.replace(publicRoot, '').replace(/\\/g, '/'),
          class: cls,
          sha256: hash,
          note,
        });
      }
      continue;
    }

    // gallery / other
    const ext = path.extname(file).toLowerCase() || '.webp';
    const num = String(nextGallery).padStart(2, '0');
    const destPath = path.join(galleryDir, `${num}${ext}`);
    fs.copyFileSync(srcPath, destPath);
    existingHashes.add(hash);
    report.uniquePreserved += 1;
    nextGallery += 1;
    report.migrations.push({
      status: 'GALLERY_COPIED',
      src: `${srcRel}/${file}`,
      dest: destPath.replace(publicRoot, '').replace(/\\/g, '/'),
      class: cls,
      sha256: hash,
      note,
    });
  }
}

/** Rename-normalize gallery files to 01.webp, 02.webp, ... (stable sort by current name) */
function normalizeGallery(destRel) {
  const galleryDir = path.join(publicRoot, destRel.replace(/^\//, ''), 'gallery');
  if (!fs.existsSync(galleryDir)) return;
  const files = listImages(galleryDir);
  if (!files.length) return;
  const tmpDir = path.join(galleryDir, '_tmp_norm');
  ensureDir(tmpDir);
  files.forEach((f, i) => {
    const ext = path.extname(f).toLowerCase() || '.webp';
    const num = String(i + 1).padStart(2, '0');
    fs.renameSync(path.join(galleryDir, f), path.join(tmpDir, `${num}${ext}`));
  });
  for (const f of fs.readdirSync(tmpDir)) {
    fs.renameSync(path.join(tmpDir, f), path.join(galleryDir, f));
  }
  fs.rmdirSync(tmpDir);
}

// Inventory
for (const name of fs.readdirSync(legacyRoot).sort()) {
  const d = path.join(legacyRoot, name);
  if (!fs.statSync(d).isDirectory()) continue;
  const files = listImages(d);
  report.inventory.push({
    entity: name,
    files: files.map((f) => ({
      name: f,
      sha256: sha256(path.join(d, f)),
      bytes: fs.statSync(path.join(d, f)).size,
    })),
  });
}

// Classification plan: legacy folder → { class, dest, aliasOf?, obsolete? }
const PLAN = [
  // Culinary experiences
  { legacy: 'adam-khan-chapli-kabob', class: 'culinary', dest: 'assets/images/experiences/culinary/adam-khan-chapli-kabob' },
  { legacy: 'arg-restaurant-herat', class: 'culinary', dest: 'assets/images/experiences/culinary/arg-restaurant-herat' },
  { legacy: 'aziz-bakery', class: 'culinary', dest: 'assets/images/experiences/culinary/aziz-bakery' },
  { legacy: 'bakery-kabul', class: 'culinary', dest: 'assets/images/experiences/culinary/aziz-bakery', note: 'alias → aziz-bakery' },
  { legacy: 'chashma-e-dogh', class: 'culinary', dest: 'assets/images/experiences/culinary/chashma-e-dogh' },
  { legacy: 'chashma-e-dough', class: 'culinary', dest: 'assets/images/experiences/culinary/chashma-e-dogh', aliasOf: 'chashma-e-dogh' },
  { legacy: 'kunar-trout', class: 'culinary', dest: 'assets/images/experiences/culinary/kunar-trout' },

  // Cultural experiences
  { legacy: 'glassblowers-of-herat', class: 'cultural', dest: 'assets/images/experiences/cultural/glassblowers-of-herat' },
  { legacy: 'gudiparan-bazi', class: 'cultural', dest: 'assets/images/experiences/cultural/gudiparan-bazi' },
  { legacy: 'istalif-pottery', class: 'cultural', dest: 'assets/images/experiences/cultural/istalif-pottery' },
  { legacy: 'kaftar-bazi', class: 'cultural', dest: 'assets/images/experiences/cultural/kaftar-bazi' },
  { legacy: 'pahlawani', class: 'cultural', dest: 'assets/images/experiences/cultural/pahlawani' },
  { legacy: 'buzkashi-and-uzbek-palaw', class: 'cultural', dest: 'assets/images/experiences/cultural/buzkashi', note: 'cultural primary (buzkashi)' },
  { legacy: 'the-last-box-camera-photographer-of-kabul', class: 'cultural', dest: 'assets/images/experiences/cultural/the-last-box-camera-photographer-of-kabul' },

  // Food & Culture taxonomy
  { legacy: 'badghis-pistachios', class: 'food', dest: 'assets/images/food/dried-fruits/badghis-pistachios' },
  { legacy: 'farah-dates', class: 'food', dest: 'assets/images/food/dried-fruits/farah-date-palms' },
  { legacy: 'paktia-pine-nuts', class: 'food', dest: 'assets/images/food/dried-fruits/paktia-pine-nuts' },
  { legacy: 'wardak-apples', class: 'food', dest: 'assets/images/food/produce/wardak-apples' },
  { legacy: 'shor-chai-of-badakhshan', class: 'food', dest: 'assets/images/food/drinks/shor-chai-of-badakhshan' },
  { legacy: 'sweet-streets-of-mazar', class: 'food', dest: 'assets/images/food/desserts/sweet-streets-of-mazar' },

  // No matching experience/food product — obsolete after uniqueness check into nearest cultural if any
  { legacy: 'spoghmai-restaurant', class: 'obsolete', dest: null, note: 'no canonical culinary/food entity; images obsolete if unused' },
];

for (const item of PLAN) {
  if (item.aliasOf) {
    report.aliases.push({ from: item.legacy, to: item.aliasOf, dest: item.dest });
  }
  if (item.class === 'obsolete' || !item.dest) {
    // If unique images exist nowhere else, record obsolete (do not invent destinations)
    const srcDir = path.join(legacyRoot, item.legacy);
    if (fs.existsSync(srcDir)) {
      report.obsolete.push({ legacy: item.legacy, files: listImages(srcDir), note: item.note });
    }
    continue;
  }
  mergeEntity(`assets/images/cultural-experiences/${item.legacy}`, item.dest, {
    class: item.class,
    note: item.note || '',
  });
  normalizeGallery(item.dest);
}

// Consolidate duplicate Band-e-Amir culinary folder into canonical content slug
const bandLegacyDir = path.join(publicRoot, 'assets/images/experiences/culinary/band-e-amir-dairy-market-quroot');
const bandCanon = 'assets/images/experiences/culinary/band-e-amir-quroot-dairy';
if (fs.existsSync(bandLegacyDir)) {
  mergeEntity('assets/images/experiences/culinary/band-e-amir-dairy-market-quroot', bandCanon, {
    class: 'culinary',
    note: 'alias folder → band-e-amir-quroot-dairy',
  });
  normalizeGallery(bandCanon);
  report.aliases.push({
    from: 'band-e-amir-dairy-market-quroot',
    to: 'band-e-amir-quroot-dairy',
    dest: bandCanon,
  });
  fs.rmSync(bandLegacyDir, { recursive: true, force: true });
}

// Rewrite source references
const REF_REPLACEMENTS = [
  // Specific entity remaps first (longest / most specific)
  [/\/assets\/images\/cultural-experiences\/chashma-e-dough\//g, '/assets/images/experiences/culinary/chashma-e-dogh/'],
  [/\/assets\/images\/cultural-experiences\/chashma-e-dogh\//g, '/assets/images/experiences/culinary/chashma-e-dogh/'],
  [/\/assets\/images\/cultural-experiences\/adam-khan-chapli-kabob\//g, '/assets/images/experiences/culinary/adam-khan-chapli-kabob/'],
  [/\/assets\/images\/cultural-experiences\/arg-restaurant-herat\//g, '/assets/images/experiences/culinary/arg-restaurant-herat/'],
  [/\/assets\/images\/cultural-experiences\/aziz-bakery\//g, '/assets/images/experiences/culinary/aziz-bakery/'],
  [/\/assets\/images\/cultural-experiences\/bakery-kabul\//g, '/assets/images/experiences/culinary/aziz-bakery/'],
  [/\/assets\/images\/cultural-experiences\/kunar-trout\//g, '/assets/images/experiences/culinary/kunar-trout/'],
  [/\/assets\/images\/cultural-experiences\/glassblowers-of-herat\//g, '/assets/images/experiences/cultural/glassblowers-of-herat/'],
  [/\/assets\/images\/cultural-experiences\/gudiparan-bazi\//g, '/assets/images/experiences/cultural/gudiparan-bazi/'],
  [/\/assets\/images\/cultural-experiences\/istalif-pottery\//g, '/assets/images/experiences/cultural/istalif-pottery/'],
  [/\/assets\/images\/cultural-experiences\/kaftar-bazi\//g, '/assets/images/experiences/cultural/kaftar-bazi/'],
  [/\/assets\/images\/cultural-experiences\/pahlawani\//g, '/assets/images/experiences/cultural/pahlawani/'],
  [/\/assets\/images\/cultural-experiences\/buzkashi-and-uzbek-palaw\//g, '/assets/images/experiences/cultural/buzkashi/'],
  [/\/assets\/images\/cultural-experiences\/the-last-box-camera-photographer-of-kabul\//g, '/assets/images/experiences/cultural/the-last-box-camera-photographer-of-kabul/'],
  [/\/assets\/images\/cultural-experiences\/badghis-pistachios\//g, '/assets/images/food/dried-fruits/badghis-pistachios/'],
  [/\/assets\/images\/cultural-experiences\/farah-dates\//g, '/assets/images/food/dried-fruits/farah-date-palms/'],
  [/\/assets\/images\/cultural-experiences\/paktia-pine-nuts\//g, '/assets/images/food/dried-fruits/paktia-pine-nuts/'],
  [/\/assets\/images\/cultural-experiences\/wardak-apples\//g, '/assets/images/food/produce/wardak-apples/'],
  [/\/assets\/images\/cultural-experiences\/shor-chai-of-badakhshan\//g, '/assets/images/food/drinks/shor-chai-of-badakhshan/'],
  [/\/assets\/images\/cultural-experiences\/sweet-streets-of-mazar\//g, '/assets/images/food/desserts/sweet-streets-of-mazar/'],
  // Band-e-Amir alias folder
  [/\/assets\/images\/experiences\/culinary\/band-e-amir-dairy-market-quroot\//g, '/assets/images/experiences/culinary/band-e-amir-quroot-dairy/'],
  // Named files without trailing slash variants for heroes referenced as .../file.webp under legacy
  [/\/assets\/images\/cultural-experiences\/pahlawani\/pahlawani\.webp/g, '/assets/images/experiences/cultural/pahlawani/hero.webp'],
  [/\/assets\/images\/cultural-experiences\/pahlawani\/wrestling\.webp/g, '/assets/images/experiences/cultural/pahlawani/gallery/01.webp'],
  [/\/assets\/images\/cultural-experiences\/kaftar-bazi\/kaftar-bazi\.webp/g, '/assets/images/experiences/cultural/kaftar-bazi/hero.webp'],
  [/\/assets\/images\/cultural-experiences\/kaftar-bazi\/pigeons-flying\.webp/g, '/assets/images/experiences/cultural/kaftar-bazi/gallery/01.webp'],
  [/\/assets\/images\/cultural-experiences\/kaftar-bazi\/pigeons\.webp/g, '/assets/images/experiences/cultural/kaftar-bazi/gallery/02.webp'],
  [/\/assets\/images\/cultural-experiences\/gudiparan-bazi\/kabul-kite-flying\.webp/g, '/assets/images/experiences/cultural/gudiparan-bazi/hero.webp'],
  [/\/assets\/images\/cultural-experiences\/gudiparan-bazi\/kites-kabul-sky\.webp/g, '/assets/images/experiences/cultural/gudiparan-bazi/gallery/01.webp'],
];

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, out);
    else if (/\.(astro|ts|tsx|js|mjs|md|csv|json|html|txt)$/i.test(ent.name)) out.push(p);
  }
  return out;
}

const scanRoots = ['src', 'data', 'scripts', 'public'].map((d) => path.join(root, d));
for (const scanRoot of scanRoots) {
  for (const file of walkFiles(scanRoot)) {
    // skip this migration script's plan strings until after delete — we'll still rewrite other scripts
    if (file.endsWith('migrate-legacy-cultural-experiences.mjs')) continue;
    let text = fs.readFileSync(file, 'utf8');
    if (!text.includes('cultural-experiences') && !text.includes('band-e-amir-dairy-market-quroot')) continue;
    let next = text;
    for (const [re, repl] of REF_REPLACEMENTS) next = next.replace(re, repl);
    // Generic template fallbacks: cultural-experiences/${slug} → experiences/cultural/${slug}
    next = next.replace(
      /\/assets\/images\/cultural-experiences\/\$\{([^}]+)\}\//g,
      '/assets/images/experiences/cultural/${$1}/'
    );
    next = next.replace(
      /\/assets\/images\/cultural-experiences\/\$\{([^}]+)\}/g,
      '/assets/images/experiences/cultural/${$1}'
    );
    if (next !== text) {
      fs.writeFileSync(file, next);
      report.refsUpdated.push(path.relative(root, file));
    }
  }
}

// Fix images.ts fallbacks more carefully — prefer culinary then cultural
const imagesPath = path.join(root, 'src/lib/images.ts');
if (fs.existsSync(imagesPath)) {
  let t = fs.readFileSync(imagesPath, 'utf8');
  const before = t;
  t = t.replaceAll('/assets/images/cultural-experiences/', '/assets/images/experiences/cultural/');
  if (t !== before) {
    fs.writeFileSync(imagesPath, t);
    if (!report.refsUpdated.includes('src/lib/images.ts')) report.refsUpdated.push('src/lib/images.ts');
  }
}

// Delete legacy tree
if (fs.existsSync(legacyRoot)) {
  fs.rmSync(legacyRoot, { recursive: true, force: true });
}

report.legacyDirGone = !fs.existsSync(legacyRoot);
report.culturalFolders = fs.existsSync(path.join(publicRoot, 'assets/images/experiences/cultural'))
  ? fs.readdirSync(path.join(publicRoot, 'assets/images/experiences/cultural')).filter((n) => fs.statSync(path.join(publicRoot, 'assets/images/experiences/cultural', n)).isDirectory())
  : [];
report.culinaryFolders = fs.existsSync(path.join(publicRoot, 'assets/images/experiences/culinary'))
  ? fs.readdirSync(path.join(publicRoot, 'assets/images/experiences/culinary')).filter((n) => fs.statSync(path.join(publicRoot, 'assets/images/experiences/culinary', n)).isDirectory())
  : [];
report.activitiesFolders = fs.existsSync(path.join(publicRoot, 'assets/images/experiences/activities'))
  ? fs.readdirSync(path.join(publicRoot, 'assets/images/experiences/activities')).filter((n) => fs.statSync(path.join(publicRoot, 'assets/images/experiences/activities', n)).isDirectory())
  : [];

const outPath = path.join(root, 'docs/cultural-experiences-migration-report.json');
ensureDir(path.dirname(outPath));
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  inventory: report.inventory.length,
  migrations: report.migrations.length,
  uniquePreserved: report.uniquePreserved,
  duplicatesRemoved: report.duplicatesRemoved,
  aliases: report.aliases,
  obsolete: report.obsolete.map((o) => o.legacy),
  refsUpdated: report.refsUpdated.length,
  legacyDirGone: report.legacyDirGone,
  culturalFolders: report.culturalFolders,
  culinaryFolders: report.culinaryFolders,
  activitiesFolders: report.activitiesFolders,
}, null, 2));
