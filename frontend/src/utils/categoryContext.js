// Centralized category normalization, taxonomy, and transaction group mapping

export const CATEGORY_PRODUCTS = 'Products';
export const CATEGORY_DAILY_NEEDS = 'Daily Needs';
export const CATEGORY_FOOD = 'Food';
export const CATEGORY_SERVICES = 'Services';
export const CATEGORY_STAY = 'Stay';
export const CATEGORY_TRAVEL = 'Travel';
export const CATEGORY_ALL = 'All';

// Order categories (physical products, groceries, meals)
export const ORDER_CATEGORIES = [
  CATEGORY_PRODUCTS,
  CATEGORY_DAILY_NEEDS,
  CATEGORY_FOOD
];

// Booking categories (hospitality, appointments, reservations)
export const BOOKING_CATEGORIES = [
  CATEGORY_SERVICES,
  CATEGORY_STAY,
  CATEGORY_TRAVEL
];

/**
 * Normalizes any category string into the canonical category name
 * e.g., 'daily-needs', 'daily_needs', 'Daily Needs', 'grocery' -> 'Daily Needs'
 */
export const normalizeCategory = (cat) => {
  if (!cat) return '';
  const clean = String(cat).trim().toLowerCase().replace(/[-_]/g, ' ');
  if (clean === 'product' || clean === 'products') return CATEGORY_PRODUCTS;
  if (
    clean === 'daily need' || 
    clean === 'daily needs' || 
    clean === 'dailyneed' || 
    clean === 'dailyneeds' || 
    clean === 'grocery' || 
    clean === 'pharmacy'
  ) {
    return CATEGORY_DAILY_NEEDS;
  }
  if (
    clean === 'food' || 
    clean === 'foods' || 
    clean === 'restaurant' || 
    clean === 'restaurants'
  ) {
    return CATEGORY_FOOD;
  }
  if (
    clean === 'service' || 
    clean === 'services' || 
    clean === 'hospital' || 
    clean === 'technician'
  ) {
    return CATEGORY_SERVICES;
  }
  if (
    clean === 'stay' || 
    clean === 'stays' || 
    clean === 'hotel' || 
    clean === 'hotels' || 
    clean === 'room' || 
    clean === 'rooms'
  ) {
    return CATEGORY_STAY;
  }
  if (
    clean === 'travel' || 
    clean === 'travels' || 
    clean === 'package' || 
    clean === 'packages'
  ) {
    return CATEGORY_TRAVEL;
  }
  if (clean === 'all') return CATEGORY_ALL;
  return cat;
};

/**
 * Converts category name to clean URL slug
 * e.g. "Daily Needs" -> "daily-needs"
 */
export const categoryToSlug = (cat) => {
  if (!cat || cat === 'All' || cat === 'all') return 'all';
  const norm = normalizeCategory(cat);
  if (norm === CATEGORY_PRODUCTS) return 'products';
  if (norm === CATEGORY_DAILY_NEEDS) return 'daily-needs';
  if (norm === CATEGORY_FOOD) return 'food';
  if (norm === CATEGORY_SERVICES) return 'services';
  if (norm === CATEGORY_STAY) return 'stay';
  if (norm === CATEGORY_TRAVEL) return 'travel';
  return String(cat).toLowerCase().replace(/\s+/g, '-');
};

/**
 * Converts URL slug back to canonical category name
 * e.g. "daily-needs" -> "Daily Needs"
 */
export const slugToCategory = (slug) => {
  if (!slug || slug === 'all' || slug === 'All') return CATEGORY_ALL;
  return normalizeCategory(slug);
};

export const isOrderCategory = (cat) => {
  const norm = normalizeCategory(cat);
  return ORDER_CATEGORIES.includes(norm);
};

export const isBookingCategory = (cat) => {
  const norm = normalizeCategory(cat);
  return BOOKING_CATEGORIES.includes(norm);
};

/**
 * Resolves the category of a record from DB/API
 */
export const getRecordCategory = (record) => {
  if (!record) return '';
  const raw = record.type || record.category || (record.staySchedule ? 'Stay' : '') || record.items?.[0]?.category || record.items?.[0]?.mainCategory || '';
  return normalizeCategory(raw);
};
