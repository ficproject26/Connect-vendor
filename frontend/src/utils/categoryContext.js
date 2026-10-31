// Centralized category normalization, taxonomy, and transaction group mapping

export const CATEGORY_PRODUCTS = 'Products';
export const CATEGORY_DAILY_NEEDS = 'Daily Needs';
export const CATEGORY_FOOD = 'Food';
export const CATEGORY_SERVICES = 'Services';
export const CATEGORY_STAY = 'Stay';
export const CATEGORY_TRAVEL = 'Travel';
export const CATEGORY_ALL = 'All';
export const CATEGORY_UNKNOWN = 'Unknown';

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
  if (clean === 'product' || clean === 'products' || clean === 'order' || clean === 'orders') return CATEGORY_PRODUCTS;
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
    clean === 'home services' ||
    clean === 'home service' ||
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
    clean === 'resort' ||
    clean === 'resorts' ||
    clean === 'room' || 
    clean === 'rooms'
  ) {
    return CATEGORY_STAY;
  }
  if (
    clean === 'travel' || 
    clean === 'travels' || 
    clean === 'cab' ||
    clean === 'taxi' ||
    clean === 'bus' ||
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
 * Strictly uses exact tokens or whole-word boundaries to avoid false positives on words like "Personal care", "Business", "Cable", etc.
 */
export const isTravelTerm = (str) => {
  if (!str) return false;
  const s = String(str).trim().toLowerCase();
  if (['travel', 'travels', 'package', 'packages', 'bus', 'vehicle', 'cab', 'car', 'bike', 'transport', 'flight', 'train', 'taxi'].includes(s)) {
    return true;
  }
  return /\b(ac\s*car|non\s*ac\s*car|car|ac\s*bus|non\s*ac\s*bus|bus|bike|superbike|mini\s*superbike|tempo|van|taxi|cab|flight|train|transport|travel|travels)\b/i.test(s);
};

/**
 * Resolves the genuine business category of a record from DB/API.
 * Evaluates trusted explicit fields (mainCategory, category, type) first.
 */
export const getRecordCategory = (record) => {
  if (!record) return '';
  const rawType = String(record.type || '').trim().toLowerCase();
  const rawCategory = String(record.category || '').trim().toLowerCase();
  const rawMainCategory = String(record.mainCategory || '').trim().toLowerCase();
  const rawSubCat = String(record.subcategory || record.subCategory || '').trim().toLowerCase();
  
  const firstItem = (record.items && Array.isArray(record.items) && record.items[0]) || {};
  const itemMainCat = String(firstItem.mainCategory || '').trim().toLowerCase();
  const itemCat = String(firstItem.category || '').trim().toLowerCase();
  const itemSubCat = String(firstItem.subcategory || '').trim().toLowerCase();
  const itemName = String(firstItem.name || '').trim().toLowerCase();
  const detailStr = String(record.product_details || firstItem.name || '').toLowerCase();

  // 1. Check trusted explicit mainCategory (from matched listing or enriched order)
  const explicitMain = rawMainCategory || itemMainCat;
  if (['services', 'service'].includes(explicitMain)) return CATEGORY_SERVICES;
  if (['stay', 'hotel', 'hotels', 'resort', 'resorts'].includes(explicitMain)) return CATEGORY_STAY;
  if (['travel', 'travels'].includes(explicitMain)) return CATEGORY_TRAVEL;
  if (['food', 'foods', 'restaurant', 'restaurants', 'dining'].includes(explicitMain)) return CATEGORY_FOOD;
  if (['products', 'product'].includes(explicitMain)) return CATEGORY_PRODUCTS;
  if (['daily needs', 'daily need', 'grocery', 'pharmacy'].includes(explicitMain)) return CATEGORY_DAILY_NEEDS;
  if (['job', 'jobs', 'application', 'job_application'].includes(explicitMain)) return 'Jobs';

  // 2. Check explicit order type & category
  // Services & Healthcare
  if (['service', 'services', 'appointment', 'hospital', 'technician', 'clinic'].includes(rawType) || 
      ['service', 'services', 'appointment', 'hospital', 'technician', 'clinic'].includes(rawCategory)) {
    return CATEGORY_SERVICES;
  }
  // Generic Bookings default classification
  if (['booking', 'bookings'].includes(rawType) || ['booking', 'bookings'].includes(rawCategory)) {
    if (Boolean(record.roomNumber || record.roomName || record.checkInDate || record.checkInTime || record.staySchedule)) {
      return CATEGORY_STAY;
    }
    if (Boolean(record.vehicleNumber || record.vehicleType || record.boardingPoint || record.droppingPoint || record.travelDate)) {
      return CATEGORY_TRAVEL;
    }
    return CATEGORY_SERVICES;
  }
  // Stay / Hospitality
  if (['stay', 'hotel', 'hotels', 'resort', 'resorts', 'room', 'rooms'].includes(rawType) || 
      ['stay', 'hotel', 'hotels', 'resort', 'resorts', 'room', 'rooms'].includes(rawCategory)) {
    return CATEGORY_STAY;
  }
  // Travel / Transportation
  if (['travel', 'travels', 'package', 'packages', 'transport'].includes(rawType) ||
      ['travel', 'travels', 'package', 'packages', 'transport'].includes(rawCategory)) {
    return CATEGORY_TRAVEL;
  }
  // Food & Dining
  if (['food', 'foods', 'restaurant', 'restaurants', 'dining'].includes(rawType) || 
      ['food', 'foods', 'restaurant', 'restaurants', 'dining'].includes(rawCategory)) {
    return CATEGORY_FOOD;
  }
  // Products
  if (['products', 'product', 'electronics', 'furniture'].includes(rawType) || 
      ['products', 'product'].includes(rawCategory)) {
    return CATEGORY_PRODUCTS;
  }
  // Daily Needs
  if (['daily needs', 'daily need', 'grocery', 'pharmacy', 'snacks'].includes(rawType) || 
      ['daily needs', 'daily need', 'grocery', 'pharmacy'].includes(rawCategory)) {
    return CATEGORY_DAILY_NEEDS;
  }
  // Jobs
  const isExplicitJob = ['job', 'jobs', 'application', 'job_application'].includes(rawType) || 
                        ['job', 'jobs', 'application', 'job_application'].includes(rawCategory);
  const hasResume = Boolean(record.candidateResume || record.resumeUrl || record.resume);
  const isOrderType = ['food', 'foods', 'restaurant', 'products', 'product', 'daily needs', 'stay', 'travel', 'services', 'service'].includes(rawType);
  if (isExplicitJob || (hasResume && !isOrderType)) {
    return 'Jobs';
  }

  // 3. Inspect items category / taxonomy mapping
  if (itemCat || rawSubCat || itemSubCat) {
    const testCat = itemCat || rawSubCat || itemSubCat;
    if (['hotels', 'resorts', 'rooms', 'luxury', 'hill station', 'cottages', 'villas', 'resort', 'hotel', 'homestay', 'pg', 'stay'].includes(testCat)) {
      return CATEGORY_STAY;
    }
    if (['it & device support', 'ac service', 'laptop repairs', 'cctv installation', 'pc repairs', 'full clean', 'cleaning', 'electrician', 'plumber', 'hospital', 'technician', 'healthcare', 'services', 'service'].includes(testCat)) {
      return CATEGORY_SERVICES;
    }
    if (['car', 'bus', 'bike', 'mini superbikes', 'ac car', 'non ac car', 'ac bus', 'non ac bus', 'superbikes', 'travel', 'travels', 'package'].includes(testCat)) {
      return CATEGORY_TRAVEL;
    }
    if (['food', 'restaurant', 'dining'].includes(testCat)) return CATEGORY_FOOD;
    if (['products', 'product', 'electronics', 'furniture'].includes(testCat)) return CATEGORY_PRODUCTS;
    if (['daily needs', 'daily need', 'grocery', 'pharmacy'].includes(testCat)) return CATEGORY_DAILY_NEEDS;
  }

  // 4. Structural domain fields (distinguishing genuine Stay, Travel, and Services)
  if (Boolean(record.roomNumber || record.roomName || record.staySchedule || (record.checkInDate && !record.vehicleType && !record.vehicleNumber && !record.boardingPoint))) {
    return CATEGORY_STAY;
  }
  if (Boolean(record.doctorName || record.patientName || record.serviceName || (record.appointmentDate && record.appointmentTimeSlot && !record.vehicleType && !record.vehicleNumber && !record.boardingPoint))) {
    return CATEGORY_SERVICES;
  }
  if (Boolean(record.vehicleNumber || record.vehicleType || (record.boardingPoint && record.droppingPoint) || record.busName || record.carName || record.bikeName)) {
    return CATEGORY_TRAVEL;
  }

  // 5. Distinctive whole-word title / detail regex
  if (/\b(room|rooms|hotel|hotels|resort|resorts|suite|villa|cottage|homestay|lodge|pg)\b/i.test(detailStr) || /\b(room|rooms|hotel|hotels|resort|resorts|suite|villa|cottage|homestay|lodge|pg)\b/i.test(itemName)) {
    return CATEGORY_STAY;
  }
  if (/\b(service|services|repair|repairs|cctv|support|consultation|doctor|technician|clinic|hospital)\b/i.test(detailStr) || /\b(service|services|repair|repairs|cctv|support|consultation|doctor|technician)\b/i.test(itemName)) {
    return CATEGORY_SERVICES;
  }
  if (isTravelTerm(detailStr) || isTravelTerm(itemName)) {
    return CATEGORY_TRAVEL;
  }
  if (/food|restaurant|biryani|chicken|pizza|burger|meal|dish/i.test(detailStr)) {
    return CATEGORY_FOOD;
  }

  // 6. Safe canonical fallback
  const raw = rawType || rawCategory || itemCat || itemMainCat || '';
  const normalized = normalizeCategory(raw);
  if (normalized && normalized !== 'All') {
    if (['order', 'orders'].includes(normalized.toLowerCase())) return CATEGORY_PRODUCTS;
    return normalized;
  }

  // If the record has order identifiers or items without specific service/stay/travel markers, default to Products
  if (record.order_number || record.orderId || (record.items && record.items.length > 0)) {
    return CATEGORY_PRODUCTS;
  }

  return CATEGORY_UNKNOWN;
};
