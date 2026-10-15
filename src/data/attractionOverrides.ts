// Per-attraction presentation overrides (t271). Keep facts out of here; copy lives in src/content/attractions.
export type AttractionOverride = {
  seoTitle?: string;
  seoDescription?: string;
  ctaLabel?: string;
  heroLayout?: 'panorama';
  heroAlt?: string;
  heroSrcset?: string;
  regionLabel?: string;
  categoryLabel?: string;
  secondaryCategory?: string;
  inquiryOnly?: boolean;
};

export const ATTRACTION_OVERRIDES: Record<string, AttractionOverride> = {
  // t271: page copy in src/content/attractions/nuristan-national-park.md is INTERIM (drawn only from the old
  // Barg-e Matal page). Replace with James's exact card/intro/What Makes It Special/Planning/activities text before merge.
  'nuristan-national-park': {
    seoTitle: 'Nuristan National Park | Nature & Mountain Landscapes | AfghanTours',
    // Interim description: replace with James's exact SEO description before merge.
    seoDescription: 'Forested valleys, alpine meadows and high mountain landscapes in Nuristan, eastern Afghanistan. Visits are arranged on inquiry only.',
    ctaLabel: 'Ask About Visiting Nuristan',
    heroLayout: 'panorama',
    heroSrcset: '/assets/images/attractions/nuristan-national-park/sizes/hero-800w.webp 800w, /assets/images/attractions/nuristan-national-park/hero.webp 2172w',
    regionLabel: 'Eastern Afghanistan / Hindu Kush',
    categoryLabel: 'Nature & Wildlife',
    secondaryCategory: 'Mountain Landscapes',
    inquiryOnly: true,
  },
};
