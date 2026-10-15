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
  bestTime?: string;
  seasonLabel?: string;
  hideDuration?: boolean;
};

export const ATTRACTION_OVERRIDES: Record<string, AttractionOverride> = {
  'nuristan-national-park': {
    seoTitle: 'Nuristan National Park | Nature & Mountain Landscapes | AfghanTours',
    seoDescription: "Explore Nuristan National Park's forested mountains, river valleys, and natural landscapes. Plan a locally coordinated visit with AfghanTours.",
    ctaLabel: 'Ask About Visiting Nuristan',
    heroLayout: 'panorama',
    heroSrcset: '/assets/images/attractions/nuristan-national-park/sizes/hero-800w.webp 800w, /assets/images/attractions/nuristan-national-park/hero.webp 2172w',
    regionLabel: 'Eastern Afghanistan / Hindu Kush',
    categoryLabel: 'Nature & Wildlife',
    secondaryCategory: 'Mountain Landscapes',
    inquiryOnly: true,
    // James t273: seasonal wording; no fixed visit length.
    bestTime: 'Late spring to autumn (May–Oct)',
    seasonLabel: 'Late spring to autumn (May–Oct)',
    hideDuration: true,
  },
};
