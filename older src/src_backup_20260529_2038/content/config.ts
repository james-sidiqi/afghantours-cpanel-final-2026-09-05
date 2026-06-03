import { defineCollection, z } from 'astro:content';

const foodCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    dish_code: z.string().optional(),
    associated_hubs: z.array(z.string()).default([]),
    provinces: z.array(z.string()).default([]),
    vegan: z.boolean().default(false),
    vegetarian: z.boolean().default(false),
  }),
});

export const collections = {
  'food': foodCollection,
};
