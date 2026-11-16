# Website image policy

Canonical asset folders are `assets/images/provinces/`, `assets/images/food/dried-fruits/`, `assets/images/tours/featured/`, `assets/images/tours/custom/`, and `assets/images/tours/general/`. Public page routes are unchanged.

Use `src/lib/images.ts` helpers for entity images. Hero fields and existing canonical hero files take priority over generic image, card and thumbnail fields. Missing, placeholder and rejected files are skipped. Overview images have their own selection helper.

Galleries use explicit `gallery_images` / gallery fields or the checked-in `src/data/imageGalleryManifest.json` allowlist. The allowlist maps exact public folders to exact image URLs. Adding a file to a folder does not add it to any gallery. Add approved photos to that manifest or an entity's explicit gallery fields deliberately. Hero and overview images may be supplied explicitly; cards, thumbnails, responsive sizes, missing files and rejected files are filtered out. Property and room galleries keep their entity boundaries. Do not restore recursive filesystem discovery.

`src/data/imageAssetManifest.json` is the explicit inventory used for general asset lookup, including hero existence choices in hub catalog code. Update it when adding or retiring public image files. `imagePathAliases.json` records exact, content-preserving merge mappings, including hash-suffixed destinations for same-name files with distinct contents. Do not collapse those aliases onto another image just because the names match. The rejected-image registry and alt-text metadata continue to identify the original contents.

The Master Image Repository is outside this website checkout. Its originals are deduplicated by exact SHA-256 only. It intentionally retains unique resolutions, encodings, crops and edits for recovery. It is not a published website gallery. Unreferenced staging assets are preserved outside `public/` in the adjacent `unused-archive/`.

The missing Daykundi and Panjshir WebP maps were restored from the historical province SVG set preserved in the master archive. The stale Weekend in Kabul JPEG reference now uses its existing featured-tour hero. Detailed SHA receipts are in the adjacent reports folder.

Validate changes with:

```sh
node scripts/test-image-policy.mjs
npm run build
node scripts/verify-image-browser.mjs
```

Generate `dist/` through `npm run build` only. The browser check opens the built site at desktop and iPhone widths and checks images, galleries, popups and the attraction lightbox. Its default Chrome executable is the macOS Chrome application; adjust that path for another platform.
