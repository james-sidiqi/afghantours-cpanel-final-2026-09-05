// Photos James has rejected for display. The files stay in the repo (never deleted);
// listing them here stops every shared image resolver and folder gallery from using them.
// Each entry: path -> reason / approval basis.
export const REJECTED_IMAGES: Record<string, string> = {
  '/assets/images/food/produce/central-valley-mulberries/hero.webp': 'James t245: Malatya (Turkey) dried-mulberry photo replaced by the approved mulberry basket; file and credit record kept',
  '/assets/images/experiences/activities/birding/hero.webp': 'James t238: rejected (bird on rocks); replaced by jsp-012 peacock (t240)',
  '/assets/images/experiences/activities/shopping/hero.webp': 'James t238: rejected pomegranate seller; must not be reused under any filename',
  '/assets/images/experiences/activities/shopping/thumb.webp': 'James t238: same pomegranate-seller photo',
  '/assets/images/experiences/activities/sightseeing/hero.webp': 'James t238: rejected turquoise shrine; replaced by jsp-015 (t240)',
  '/assets/images/food/dried-fruit/panjshir-walnuts/hero.webp': 'James t239: rejected grey studio walnut photo',
  '/assets/images/food/dried-fruit/panjshir-walnuts/thumb.webp': 'James t239: same grey studio walnut photo',
  '/assets/images/experiences/cultural/istalif-pottery/gallery/04.webp': 'James t264: rejected black-and-white stacked pots (Istalif Pottery gallery); not used elsewhere; file and credit record kept',
  '/assets/images/attractions/istalif-village/thumb.webp': 'James t264: rejected small duplicate of the potter-in-shop photo (Istalif gallery); large hero.webp kept; not used elsewhere',
};
export const isRejectedImage = (src?: string | null): boolean =>
  !!src && Object.prototype.hasOwnProperty.call(REJECTED_IMAGES, String(src).split('?')[0]);
