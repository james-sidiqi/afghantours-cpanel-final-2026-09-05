# Asset manifest (images)

Authoritative per-image records (path, source hash prefix, James's file name, use, alt, credit, status) are in the repo:
- docs/image-register-t245.csv, -t266.csv, -t267.csv, -t268.csv, -t271.csv (t271 also covers t272–t279; Pine Nuts details are in docs/t276-pine-nuts-pending.md)
- Older provenance: docs/PHOTO-PROVENANCE-AND-NAMING-2026-10-14.md, docs/IMAGE-CREDITS.md, docs/ATTRACTION-IMAGE-CREDITS.md
- Alt text: src/data/imageAlts.ts. Rejected images: src/data/rejectedImages.ts.

## Key assignments in this release
| Page / item | File(s) | Notes |
|---|---|---|
| Nuristan National Park | public/assets/images/attractions/nuristan-national-park/hero.webp, card.webp | James's photos; credit TBD |
| NRVV (replaces Bashgal) | public/assets/images/attractions/nuristan-river-valleys-villages/hero.webp | **temporary**; James's own photo pending |
| Paktia Pine Nuts | public/assets/images/food/dried-fruits/paktia-pine-nuts/harvest/hero.webp (hero and card, card focal point 50% 12%), harvest/gallery-1..3.webp (+ harvest/sizes/) | gardez-zurmat and pine-forest images removed from this page only; files kept |
| Chicken Street, Dragon Valley, Shahr-e-Gholghola, Wakhan, Nuristan cards | attractions/<slug>/card.webp | see image-register-t271.csv |
| Marco Polo sheep | unpublished-assets/attractions/wakhan-corridor/marco-polo-sheep-young.webp | **must stay unpublished** |
| Buzkashi | AI image removed site-wide (#37) | no AI or stock images |

## Missing photographs
- Wakhan village + river: "238F4C8E-D4A0-4F49-92A7-340AD83E1AD1(1).jpeg" (not received)
- NRVV: James's own photo (not received)

## Originals and credits
- Originals (pre-WebP) were kept on the old agent box at /workspace/img-originals/ (280 files). **They are not in git or this bundle**; ask James for any you need.
- Credits: TBD and not displayed. Never remove a photo only over provenance.
