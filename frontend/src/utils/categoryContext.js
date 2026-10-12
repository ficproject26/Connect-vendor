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
 * Helper to test if a string matches Travel terms (including Car, AC Car, Bike, Bus, etc.)
 */
export const isTravelTerm = (str) => {
  if (!str) return false;
  const s = String(str).trim().toLowerCase();
  return (
    ['travel', 'travels', 'package', 'packages', 'bus', 'vehicle', 'cab', 'car', 'bike', 'transport'].includes(s) ||
    /^(ac\s*car|non\s*ac\s*car|car|ac\s*bus|non\s*ac\s*bus|bus|bike|superbike|mini\s*superbike|tempo|van|taxi|cab|flight|train)/i.test(s) ||
    /(car|bus|bike|vehicle|travel|cab|transport)/i.test(s)
  );
};

/**
 * Resolves the category of a record from DB/API
 */
export const getRecordCategory = (record) => {
  if (!record) return '';
  const rawType = String(record.type || '').trim().toLowerCase();
  const rawCategory = String(record.category || '').trim().toLowerCase();
  const rawSubCat = String(record.subcategory || record.subCategory || '').trim().toLowerCase();
  const detailStr = String(record.product_details || record.items?.[0]?.name || '').toLowerCase();

  // 1. Travel check takes priority to prevent vehicle bookings from ever becoming Stay
  if (
    rawType === 'travel' ||
    rawCategory === 'travel' ||
    isTravelTerm(rawType) || 
    isTravelTerm(rawCategory) || 
    isTravelTerm(rawSubCat) ||
    Boolean(record.travelDate || record.journeyDate || record.departureTime || record.vehicleType || record.busName || record.carName || record.bikeName || record.boardingPoint || record.droppingPoint) ||
    isTravelTerm(detailStr)
  ) {
    return CATEGORY_TRAVEL;
  }

  // 2. Food & Restaurant check
  if (['food', 'foods', 'restaurant', 'restaurants', 'dining'].includes(rawType) || 
      ['food', 'foods', 'restaurant', 'restaurants', 'dining'].includes(rawCategory) ||
      /food|restaurant|biryani|chicken|pizza|burger|meal|dish/i.test(detailStr)) {
    return CATEGORY_FOOD;
  }

  // 3. Products
  if (['products', 'product', 'electronics', 'furniture'].includes(rawType) || 
      ['products', 'product'].includes(rawCategory)) {
    return CATEGORY_PRODUCTS;
  }

  // 4. Daily Needs
  if (['daily needs', 'daily need', 'grocery', 'pharmacy', 'snacks'].includes(rawType) || 
      ['daily needs', 'daily need', 'grocery', 'pharmacy'].includes(rawCategory)) {
    return CATEGORY_DAILY_NEEDS;
  }

  // 5. Jobs (Strict check: never treat transactional orders as jobs)
  const isExplicitJob = ['job', 'jobs', 'application', 'job_application'].includes(rawType) || 
                        ['job', 'jobs', 'application', 'job_application'].includes(rawCategory);
  const hasResume = Boolean(record.candidateResume || record.resumeUrl || record.resume);
  const isOrderType = ['food', 'foods', 'restaurant', 'products', 'product', 'daily needs', 'stay', 'travel', 'services', 'service'].includes(rawType);
  if (isExplicitJob || (hasResume && !isOrderType)) {
    return 'Jobs';
  }

  // 6. Stay check
  if (['stay', 'hotel', 'hotels', 'resort', 'resorts', 'room', 'rooms'].includes(rawType) || 
      ['stay', 'hotel', 'hotels', 'resort', 'resorts', 'room', 'rooms'].includes(rawCategory) ||
      Boolean(record.roomNumber || record.roomName || (record.staySchedule && !record.vehicleType && !record.travelDate)) ||
      /hotel|resort|pg|room|suite|villa|cottage/i.test(detailStr)) {
    return CATEGORY_STAY;
  }

  // 7. Services & Healthcare
  if (['service', 'services', 'appointment', 'hospital', 'technician', 'clinic'].includes(rawType) || 
      ['service', 'services', 'appointment', 'hospital', 'technician'].includes(rawCategory) ||
      Boolean(record.doctorName)) {
    return CATEGORY_SERVICES;
  }

  // 8. Inspect items array
  if (record.items && Array.isArray(record.items) && record.items.length > 0) {
    const itCat = String(record.items[0]?.category || record.items[0]?.mainCategory || '').trim().toLowerCase();
    const itSub = String(record.items[0]?.subcategory || '').trim().toLowerCase();
    const itName = String(record.items[0]?.name || '').trim().toLowerCase();

    if (itCat === 'travel' || isTravelTerm(itCat) || isTravelTerm(itSub) || isTravelTerm(itName)) return CATEGORY_TRAVEL;
    if (['stay', 'hotel', 'hotels', 'resort', 'resorts', 'room', 'rooms'].includes(itCat) || /room|suite|villa|hotel|resort/i.test(itName)) return CATEGORY_STAY;
    if (['service', 'services', 'hospital'].includes(itCat)) return CATEGORY_SERVICES;
    if (['products', 'product', 'electronics', 'furniture'].includes(itCat)) return CATEGORY_PRODUCTS;
    if (['daily needs', 'daily need', 'grocery', 'pharmacy', 'snacks'].includes(itCat)) return CATEGORY_DAILY_NEEDS;
    if (['food', 'restaurant'].includes(itCat)) return CATEGORY_FOOD;
  }

  // 9. Date heuristics fallback (only if not already classified and strictly not travel)
  if (record.checkInDate && !record.travelDate && !isTravelTerm(rawType) && !isTravelTerm(rawCategory) && !isTravelTerm(detailStr)) {
    return CATEGORY_STAY;
  }
  if (record.appointmentDate) {
    return CATEGORY_SERVICES;
  }

  const raw = record.type || record.category || record.items?.[0]?.category || record.items?.[0]?.mainCategory || '';
  return normalizeCategory(raw);
};
