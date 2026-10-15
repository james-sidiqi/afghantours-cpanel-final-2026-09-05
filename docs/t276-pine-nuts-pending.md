# t276 Pine Nuts photo (EAEBF80F): awaiting asset

Status: James's photo EAEBF80F (worker processing pine cones and nuts) was NOT in the attachments
(content search of all 224 image attachments on 2026-10-15). Nothing has been changed on the page yet.

Page: /food-culture/dried-fruits/paktia-pine-nuts/  (src/content/food/dried-fruits/paktia-pine-nuts.md)
Card: /food-culture/ "The Pine Nut Harvest of Paktia" card (src/pages/food-culture/index.astro, id dried-fruits/paktia-pine-nuts),
      image = /assets/images/food/dried-fruits/paktia-pine-nuts/hero.webp

Incorrectly assigned photos to remove when the asset arrives:
- Page hero: /assets/images/attractions/gardez-zurmat-highlands/hero.webp (an attraction landscape; frontmatter hero_image)
- Page gallery: /assets/images/attractions/gardez-zurmat-highlands/gallery-1.webp (attraction landscape)
- Card/feature image: /assets/images/food/dried-fruits/paktia-pine-nuts/hero.webp (Chilgoza pine FOREST, Abdul qayoum CC BY 3.0) -
  a forest, not pine nuts; keep the file + credit, just stop using it as the card.
- Note: paktia-pine-nuts/gallery/01.webp (a man sieving pine cones) exists on disk with NO credit record and is not
  rendered; it is not EAEBF80F as far as can be verified - do not use it without James's confirmation.

Steps when EAEBF80F arrives:
1. Keep original in /workspace/img-originals/t276/; convert to WebP (no recolour/sharpen), 800w size.
2. Save as public/assets/images/food/dried-fruits/paktia-pine-nuts/card.webp and hero-eaebf80f.webp
   (or overwrite hero.webp after moving the forest photo to gallery/forest.webp + updating photoCredits path).
3. Frontmatter: hero_image + image -> new file. food-culture/index.astro card -> new file.
4. Alt (src/data/imageAlts.ts): "Worker processing pine cones and pine nuts in Afghanistan."
5. Register row in docs/image-register-t271.csv: credit TBD.
