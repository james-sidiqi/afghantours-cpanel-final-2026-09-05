import { defineCollection, z } from 'astro:content';

const relatedTourSchema = z.object({
  title: z.string(),
  slug: z.string(),
  image: z.string().optional(),
  eyebrow: z.string().optional(),
  description: z.string().optional(),
  cta: z.string().optional(),
});

const foodCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    dish_code: z.string().optional(),
    experience_code: z.string().optional(),
    category: z.string().default('Dishes'),
    card_title: z.string().optional(),
    card_description: z.string().optional(),
    hero_image: z.string().optional(),
    image: z.string().optional(),
    associated_hubs: z.array(z.string()).default([]),
    provinces: z.array(z.string()).default([]),
    paired_foods: z.array(z.string()).default([]),
    related_tours: z.array(relatedTourSchema).default([]),
    best_for: z.array(z.string()).default([]),
    best_season: z.string().optional(),
    experience_type: z.string().optional(),
    vegan: z.boolean().default(false),
    vegetarian: z.boolean().default(false),
  }),
});

export const collections = {
  'food': foodCollection,
};
