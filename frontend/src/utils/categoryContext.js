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
  const rawType = String(record.type || '').trim().toLowerCase();
  const rawCategory = String(record.category || '').trim().toLowerCase();

  // 1. Explicit type & category checks take precedence
  if (['travel', 'travels', 'package', 'packages', 'bus', 'vehicle', 'cab', 'car', 'bike'].includes(rawType) || 
      ['travel', 'travels', 'package', 'packages', 'bus', 'vehicle', 'cab', 'car', 'bike'].includes(rawCategory)) {
    return CATEGORY_TRAVEL;
  }
  if (['food', 'foods', 'restaurant', 'restaurants', 'dining'].includes(rawType) || 
      ['food', 'foods', 'restaurant', 'restaurants', 'dining'].includes(rawCategory)) {
    return CATEGORY_FOOD;
  }
  if (['job', 'jobs', 'application', 'job_application'].includes(rawType) || 
      ['job', 'jobs', 'application', 'job_application'].includes(rawCategory)) {
    return 'Jobs';
  }
  if (['stay', 'hotel', 'hotels', 'resort', 'resorts', 'room', 'rooms'].includes(rawType) || 
      ['stay', 'hotel', 'hotels', 'resort', 'resorts', 'room', 'rooms'].includes(rawCategory)) {
    return CATEGORY_STAY;
  }
  if (['service', 'services', 'appointment', 'hospital', 'technician', 'clinic'].includes(rawType) || 
      ['service', 'services', 'appointment', 'hospital', 'technician'].includes(rawCategory)) {
    return CATEGORY_SERVICES;
  }
  if (['products', 'product', 'electronics', 'furniture'].includes(rawType) || 
      ['products', 'product'].includes(rawCategory)) {
    return CATEGORY_PRODUCTS;
  }
  if (['daily needs', 'daily need', 'grocery', 'pharmacy', 'snacks'].includes(rawType) || 
      ['daily needs', 'daily need', 'grocery', 'pharmacy'].includes(rawCategory)) {
    return CATEGORY_DAILY_NEEDS;
  }

  // 2. Specific domain fields check (preventing vehicle bookings from ever becoming Stay)
  if (record.travelDate || record.journeyDate || record.departureTime || record.vehicleType || record.busName || record.carName || record.bikeName) {
    return CATEGORY_TRAVEL;
  }
  if (record.candidateResume || record.candidateEmail || record.resumeUrl || record.applicationId) {
    return 'Jobs';
  }
  if (record.doctorName) {
    return CATEGORY_SERVICES;
  }
  if (record.roomNumber || record.roomName || (record.staySchedule && !record.vehicleType && !record.travelDate)) {
    return CATEGORY_STAY;
  }

  // 3. Inspect items array
  if (record.items && Array.isArray(record.items) && record.items.length > 0) {
    const itCat = String(record.items[0]?.category || record.items[0]?.mainCategory || '').trim().toLowerCase();
    if (['travel', 'travels', 'package', 'bus', 'cab', 'car', 'bike'].includes(itCat)) return CATEGORY_TRAVEL;
    if (['stay', 'hotel', 'hotels', 'resort', 'resorts', 'room', 'rooms'].includes(itCat)) return CATEGORY_STAY;
    if (['service', 'services', 'hospital'].includes(itCat)) return CATEGORY_SERVICES;
    if (['products', 'product', 'electronics', 'furniture'].includes(itCat)) return CATEGORY_PRODUCTS;
    if (['daily needs', 'daily need', 'grocery', 'pharmacy', 'snacks'].includes(itCat)) return CATEGORY_DAILY_NEEDS;
    if (['food', 'restaurant'].includes(itCat)) return CATEGORY_FOOD;
    if (['job', 'jobs'].includes(itCat)) return 'Jobs';
  }

  // 4. Product details / name heuristics
  const detailStr = String(record.product_details || record.items?.[0]?.name || '').toLowerCase();
  if (/travel|bus|cab|car|bike|tour|flight/i.test(detailStr)) {
    return CATEGORY_TRAVEL;
  }
  if (/hotel|resort|pg|room|suite|villa|cottage/i.test(detailStr)) {
    return CATEGORY_STAY;
  }

  if (record.appointmentDate && !record.checkInDate) {
    return CATEGORY_SERVICES;
  }
  if (record.checkInDate) {
    return CATEGORY_STAY;
  }

  const raw = record.type || record.category || record.items?.[0]?.category || record.items?.[0]?.mainCategory || '';
  return normalizeCategory(raw);
};
