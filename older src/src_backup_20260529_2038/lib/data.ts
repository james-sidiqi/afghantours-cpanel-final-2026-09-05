import toursRaw from '../../data/tours.csv?raw';
import attractionsRaw from '../../data/attractions_master.csv?raw';
import regionsRaw from '../../data/regions.csv?raw';
import provincesRaw from '../../data/provinces.csv?raw';
import locationsRaw from '../../data/locations.csv?raw';
import hotelsRaw from '../../data/hotel_properties.csv?raw';
import roomsRaw from '../../data/hotel_rooms.csv?raw';
import faqRaw from '../../data/faq.csv?raw';
import dishesRaw from '../../data/dishes.csv?raw';
import { parseCSV, isActive } from './csv';

export const tours = parseCSV(toursRaw).filter((r) => isActive(r.is_active));
export const attractions = parseCSV(attractionsRaw).filter((r) => isActive(r.is_active));
export const regions = parseCSV(regionsRaw).filter((r) => isActive(r.is_active));
export const provinces = parseCSV(provincesRaw);
export const locations = parseCSV(locationsRaw).filter((r) => isActive(r.is_active));
export const hotels = parseCSV(hotelsRaw).filter((r) => isActive(r.is_active));
export const rooms = parseCSV(roomsRaw).filter((r) => isActive(r.is_active));
export const faqs = parseCSV(faqRaw);
export const dishes = parseCSV(dishesRaw).filter((r) => isActive(r.is_active));

export function getBySlug<T extends Record<string, string>>(items: T[], slug: string, key = 'slug'): T | undefined {
  return items.find((item) => item[key] === slug || item[`${key}`] === slug);
}

export function primaryImage(item: Record<string, string>, fallback = '/assets/images/placeholders/default-card.webp'): string {
  return item.hero_image_path || item.image_path || item.thumbnail_image_path || item.thumbnail_path || item.cover_image_path || item.img_path || item.image_path_property_1 || fallback;
}

export function priceLabel(tour: Record<string, string>): string {
  const price = tour.price_from;
  return price ? `Starting from $${Number(price).toLocaleString()}` : 'Custom quote required';
}
