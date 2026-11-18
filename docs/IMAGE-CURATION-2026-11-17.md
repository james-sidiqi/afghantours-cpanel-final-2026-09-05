# Website image curation and food-photo additions

## Implemented and verified

- Added eight actual WebP photos from the local AfghanTours library: Shor Nakhut, Banjan Sia, Shola, Sabzi Palak, Kadoo, Qurmay Qachaloo, melon halves and a Rosh platter.
- The food landing page now displays the six newly illustrated dishes and the matching Rosh card. Shola is linked to its existing food note. No new public URL was created.
- Compared 1,075 existing raster assets against 7,259 raster master files. Selected matching higher-resolution copies for 213 image paths, without changing the selected subject or deliberately generating/upscaling detail. Web-optimized companions remain capped at 2,560 pixels.
- Removed 115 redundant physical image files across 109 identity groups. Exact bytes and conservative resize/recompression matching were used; distinct crops/edits, different filename formats, placeholders and owner-rejected assets were preserved.
- Updated source/data/gallery paths and flattened old URL aliases to the retained images. Gallery membership remains explicit even when two subjects share a single physical photo.
- Replaced a wrong-subject Glassblowers of Herat hero (Friday Mosque photograph) with the local furnace/glassblower photo; corrected its alt/credit lookup.
- All original bytes remain recoverable in the master archive, the curation backup and unused-archive/curation-20261117/.

## Validation

- Node 20 npm run build passed.
- Image-policy tests passed, including hero priority, valid canonical aliases, six new food heroes and continued blocking of owner-rejected watermelon photos.
- 326 HTML pages plus generated CSS/JavaScript checked: 730 unique image URLs, zero missing image files, zero broken aliases and all eight new photos referenced.
- 38 desktop/iPhone browser cases passed, including seven actual food cards at both widths, new food notes, melon gallery, corrected glassblower page, featured popup and attraction lightbox.
- 1,075 pre-curation raster files verified byte-identical in the backup.
- 13 rejected image files preserved unchanged; all 56 protected staging originals verified in the master archive.
- No eligible same-extension byte-identical photo groups remain. Different crops/edits and different formats remain intentionally separate.

## Exact attachment originals still needed

The chat shows Dopiaza, a Sabzi close-up, two market/fruit photos and a higher-resolution Rosh platter. Their exact original files were not found in the local folders searched, and this workspace did not expose the inline attachments as downloadable files. Those exact five files have not been substituted with unrelated internet images. The available local Sabzi and small Rosh photos were used meanwhile. Save the originals into Desktop/AfghanTours-New-Photos or provide them as a file/ZIP attachment.

The existing watermelon photographs stay rejected; a suitable owner-approved replacement file is still required.

## Receipts

- reports/curation-20261117/curation-actions.json
- reports/curation-20261117/verification.json
- reports/curation-20261117/phase2-browser-results.json
- reports/curation-20261117/completion.json
- reports/curation-20261117/added-photos-preview.jpg

No cPanel/production deployment was performed.
