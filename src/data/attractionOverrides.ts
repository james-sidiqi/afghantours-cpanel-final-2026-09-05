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
  accessLabel?: string;
  durationLabel?: string; // replaces visit length on page facts and cards
  facts?: { label: string; value: string }[]; // full facts-panel replacement
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
  // t276: replaces Bashgal Valley (301 from /attractions/bashgal-valley/).
  // Image is TEMPORARY (a2a23243); James's photo pending. To swap: replace
  // public/assets/images/attractions/nuristan-river-valleys-villages/hero.webp (+ its alt in imageAlts.ts).
  'nuristan-river-valleys-villages': {
    seoTitle: 'Nuristan River Valleys & Villages | AfghanTours',
    seoDescription: "Discover Nuristan's traditional wooden villages, mountain rivers, forested valleys, and distinctive architecture with AfghanTours.",
    ctaLabel: 'Explore Nuristan with AfghanTours',
    regionLabel: 'Eastern Afghanistan / Hindu Kush',
    categoryLabel: 'Culture & Heritage',
    secondaryCategory: 'Scenic Landscapes, Architecture, Nature',
    durationLabel: '4–8 hours',
    accessLabel: 'By arrangement',
    bestTime: 'May–October',
    seasonLabel: 'May–October',
    facts: [
      { label: 'Province', value: 'Nuristan' },
      { label: 'Region', value: 'Eastern Afghanistan / Hindu Kush' },
      { label: 'Category', value: 'Culture & Heritage · Scenic Landscapes, Architecture, Nature' },
      { label: 'Visit length', value: '4–8 hours (excludes travel to and from Nuristan)' },
      { label: 'Best time', value: 'May–October' },
      { label: 'Transport', value: 'Road' },
      { label: 'Access', value: 'By arrangement' },
    ],
  },
};
