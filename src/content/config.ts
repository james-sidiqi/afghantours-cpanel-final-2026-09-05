import { defineCollection, z, reference } from 'astro:content';

const provincesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    type: z.string().optional(),
    province_code: z.string().optional(),
    region: z.string().optional(),
    center_lat: z.number().optional(),
    center_lon: z.number().optional(),
    province_image_path: z.string().optional(),
    known_for: z.array(z.string()).default([]),
    experience_tags: z.array(z.string()).default([]),
  }),
});

const regionsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    img_path: z.string().optional(),
  }),
});

const hubsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    province: z.string().optional(),
    known_for: z.array(z.string()).default([]),
    hub_image_path: z.string().optional(),
  }),
});

const attractionsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    province: z.string().optional(),
    province_code: z.string().optional(),
    hub: z.string().optional(),
    attraction_code: z.string().optional(),
    category: z.string().optional(),
    experience_tags: z.array(z.string()).default([]),
    themes: z.array(z.string()).default([]),
    guide_required: z.boolean().default(false),
    permit_required: z.boolean().default(false),
    overnight_required: z.boolean().default(false),
    minimum_visit_hours: z.number().default(1),
    known_for: z.array(z.string()).default([]),
    hero_image: z.string().optional(),
    card_image: z.string().optional(),
  }),
});

const toursCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tour_code: z.string().optional(),
    summary: z.string().optional(),
    duration_days: z.number().optional(),
    difficulty: z.string().optional(),
    featured_image: z.string().optional(),
    provinces_visited: z.array(z.string()).default([]),
    hubs_visited: z.array(z.string()).default([]),
  }),
});

const foodCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    food_slug: z.string().optional(),
    subtitle: z.string().optional(),
    alternative_name: z.string().optional(),
    description: z.string().optional(),
    card_description: z.string().optional(),
    category: z.string().optional(),
    experience_type: z.string().optional(),
    primary_ingredients: z.array(z.string()).default([]),
    known_for: z.array(z.string()).default([]),
    provinces: z.array(z.string()).default([]),
    hero_image: z.string().optional(),
    image: z.string().optional(),
    card_image: z.string().optional(),
    paired_foods: z.array(z.string()).default([]),
    best_season: z.string().optional(),
    duration: z.string().optional(),
    related_tours: z.array(z.string()).default([]),
    nearby: z.array(z.string()).default([]),
  }),
});

const restaurantsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    hub: z.string().optional(),
    cuisine_type: z.array(z.string()).default([]),
    price_range: z.string().optional(),
    safety_verified: z.boolean().default(true),
  }),
});

const hotelsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    hub: z.string().optional(),
    star_rating: z.number().optional(),
    amenities: z.array(z.string()).default([]),
    foreigner_friendly: z.boolean().default(true),
  }),
});

const culturalExperiencesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),

    subtitle: z.string().optional(),
    card_description: z.string().optional(),
    category: z.string().optional(),
    experience_type: z.string().optional(),

    hero_image: z.string().optional(),
    image: z.string().optional(),
    gallery_images: z.array(z.string()).default([]),

    provinces: z.array(z.string()).default([]),
    paired_foods: z.array(z.string()).default([]),
    related_tours: z.array(z.string()).default([]),
    nearby: z.array(z.string()).default([]),

    best_season: z.string().optional(),
    duration: z.string().optional(),

    hub: z.string().optional(),
    province: z.string().optional(),
    duration_hours: z.number().optional(),
  }),
});

export const collections = {
  provinces: provincesCollection,
  regions: regionsCollection,
  hubs: hubsCollection,
  attractions: attractionsCollection,
  tours: toursCollection,
  food: foodCollection,
  restaurants: restaurantsCollection,
  hotels: hotelsCollection,
  'cultural-experiences': culturalExperiencesCollection,
};