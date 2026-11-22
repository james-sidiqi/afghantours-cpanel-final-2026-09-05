# Image format conversion archive, 22 Nov 2026

JPEG and PNG originals removed from `public/` after conversion to WebP (or
replacement by an already-identical WebP).

| Original | Disposition |
| --- | --- |
| `page-assets/faqs/transportation.jpeg` | Converted to `/assets/images/page-assets/faqs/transportation-2.webp` (a different photo from the existing `transportation.webp`). |
| `attractions/badakhshan-mountains-and-lakes/hero.jpeg` | Converted to `/assets/images/attractions/badakhshan-mountains-and-lakes/hero-wide.webp` (different crop/size from the existing `hero.webp` already used as the live hero). |
| `food/dishes/kandahari-rosh/hero.png` | Pixel source of the existing `/assets/images/food/dishes/kandahari-rosh/hero.webp`. No new file published. |

Thirty-four files already named `.webp` but encoded as JPEG were re-encoded as
true WebP at the same path (quality 82, EXIF stripped) and were not archived.

The Open Graph preview (`social/afghantours-link-preview.jpg`) and the apple
touch icon were left in their original formats.
