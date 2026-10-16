/**
 * Global Validation & Normalization Utility
 * Connect App Ecosystem (Frontend)
 * 
 * Enforces unified validation and normalization rules across all frontend forms and modules:
 * 1. Name Field Validation (auto-capitalize first letter of each word, unicode letters, valid length)
 * 2. Email Validation (localpart@domain.extension, exactly one @, valid extension)
 * 3. Indian Mobile Number Validation (10 digits starting with 6, 7, 8, 9)
 * 4. Password Validation (min 6 chars, uppercase, digit, special char)
 * 5. Aadhaar Number Validation (exactly 12 digits, masking)
 * 6. PAN Card Validation (5 uppercase letters, 4 digits, 1 uppercase letter)
 * 7. Bank Account Number Validation (numeric only, bank-specific or safe 9-18 digit length)
 * 8. IFSC Code Validation (11 chars: 4 uppercase letters, 0, 6 alphanumeric)
 * 9. Date of Birth and Minimum Age (minimum 18 years calculation)
 */

// Bank-specific documented account number length rules in India
export const BANK_ACCOUNT_LENGTH_RULES = {
  'State Bank of India': { min: 11, max: 17, exact: [11, 17] },
  'State Bank of India (SBI)': { min: 11, max: 17, exact: [11, 17] },
  'SBI': { min: 11, max: 17, exact: [11, 17] },
  'HDFC Bank': { min: 14, max: 14 },
  'ICICI Bank': { min: 12, max: 12 },
  'Axis Bank': { min: 15, max: 15 },
  'Punjab National Bank': { min: 16, max: 16 },
  'Punjab National Bank (PNB)': { min: 16, max: 16 },
  'PNB': { min: 16, max: 16 },
  'Bank of Baroda': { min: 14, max: 14 },
  'Canara Bank': { min: 13, max: 13 },
  'Union Bank of India': { min: 15, max: 15 },
  'Kotak Mahindra Bank': { min: 10, max: 10 },
  'IndusInd Bank': { min: 12, max: 14 },
  'Federal Bank': { min: 14, max: 14 },
  'Yes Bank': { min: 15, max: 15 },
  'IDBI Bank': { min: 13, max: 16 },
  'Indian Bank': { min: 9, max: 17 },
  'Central Bank of India': { min: 10, max: 17 },
  'Indian Overseas Bank': { min: 14, max: 15 },
  'UCO Bank': { min: 13, max: 14 },
  'South Indian Bank': { min: 16, max: 16 },
  'Karur Vysya Bank': { min: 16, max: 16 },
  'City Union Bank': { min: 15, max: 15 },
  'Bandhan Bank': { min: 14, max: 14 },
  'RBL Bank': { min: 16, max: 16 }
};

/**
 * 1. Name Normalization & Validation
 */
export const normalizeName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/^\s+/, '') // remove leading spaces
    .replace(/\s+$/, '') // remove trailing spaces
    .replace(/\s+/g, ' ') // single space between words
    .replace(/(?:^|\s|[-.'])\p{L}/gu, (char) => char.toUpperCase()); // capitalize first letter of each word
};

export const validateName = (name, fieldLabel = 'Name', options = {}) => {
  const minLength = options.minLength !== undefined ? options.minLength : 2;
  const maxLength = options.maxLength !== undefined ? options.maxLength : 80;
  const required = options.required !== undefined ? options.required : true;

  if (!name || !String(name).trim()) {
    if (required) return `${fieldLabel} is required`;
    return '';
  }
  const trimmed = String(name).trim();
  if (trimmed.length < minLength) {
    return `${fieldLabel} must be at least ${minLength} characters`;
  }
  if (trimmed.length > maxLength) {
    return `${fieldLabel} cannot exceed ${maxLength} characters`;
  }
  // Allow Unicode alphabetic letters and combining marks (including Indian regional scripts), spaces, hyphens, apostrophes, and dots
  const nameRegex = /^[\p{L}\p{M}\s.'\-]+$/u;
  if (!nameRegex.test(trimmed)) {
    return `${fieldLabel} contains invalid characters. Numbers and special symbols are not allowed.`;
  }
  return '';
};

/**
 * 2. Email Normalization & Validation
 */
export const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

export const validateEmail = (email, fieldLabel = 'Email Address', required = true) => {
  if (!email || !String(email).trim()) {
    if (required) return `${fieldLabel} is required`;
    return '';
  }
  const clean = String(email).trim();
  if (/\s/.test(clean)) {
    return `${fieldLabel} cannot contain spaces`;
  }
  const atParts = clean.split('@');
  if (atParts.length !== 2 || !atParts[0] || !atParts[1]) {
    return `Enter a valid ${fieldLabel.toLowerCase()} (e.g. name@example.com)`;
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) {
    return `Enter a valid ${fieldLabel.toLowerCase()} (e.g. name@example.com)`;
  }
  const domainParts = atParts[1].split('.');
  const tld = domainParts[domainParts.length - 1];
  if (!/^[a-zA-Z]{2,24}$/.test(tld)) {
    return `${fieldLabel} must have a valid domain extension (e.g. .com, .in)`;
  }
  return '';
};

/**
 * 3. Indian Mobile Number Normalization & Validation
 */
export const normalizeIndianMobile = (mobile) => {
  if (!mobile || typeof mobile !== 'string') return '';
  let clean = mobile.trim();
  if (clean.startsWith('+91')) {
    clean = clean.slice(3).trim();
  } else if (clean.startsWith('91') && clean.length === 12) {
    clean = clean.slice(2).trim();
  }
  return clean.replace(/\D/g, '').slice(0, 10);
};

export const validateIndianMobile = (mobile, fieldLabel = 'Mobile Number', required = true) => {
  if (!mobile || !String(mobile).trim()) {
    if (required) return `${fieldLabel} is required`;
    return '';
  }
  let clean = String(mobile).trim();
  if (clean.startsWith('+91')) {
    clean = clean.slice(3).trim();
  } else if (clean.startsWith('91') && clean.length === 12) {
    clean = clean.slice(2).trim();
  }
  if (/[^\d]/.test(clean)) {
    return `${fieldLabel} must contain numeric digits only`;
  }
  if (clean.length !== 10) {
    return `${fieldLabel} must be exactly 10 digits`;
  }
  if (!/^[6-9]/.test(clean)) {
    return `${fieldLabel} must start with 6, 7, 8, or 9`;
  }
  if (!/^[6-9][0-9]{9}$/.test(clean)) {
    return `Enter a valid 10-digit Indian ${fieldLabel.toLowerCase()} starting with 6-9`;
  }
  return '';
};

/**
 * 4. Password Validation
 */
export const validatePassword = (password, fieldLabel = 'Password') => {
  if (!password) {
    return `${fieldLabel} is required`;
  }
  if (password.length < 6) {
    return `${fieldLabel} must be at least 6 characters long`;
  }
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(password);

  const missing = [];
  if (!hasUppercase) missing.push('an uppercase letter');
  if (!hasDigit) missing.push('a number (0-9)');
  if (!hasSpecial) missing.push('a special character (e.g. @, #, $, !)');

  if (missing.length > 0) {
    return `${fieldLabel} must include at least ${missing.join(', ')} (e.g. Rathika@123)`;
  }
  return '';
};

export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return '';
};

/**
 * 5. Aadhaar Number Normalization & Validation
 */
export const normalizeAadhaar = (aadhaar) => {
  if (!aadhaar || typeof aadhaar !== 'string') return '';
  return aadhaar.replace(/\D/g, '').slice(0, 12);
};

export const maskAadhaar = (aadhaar) => {
  if (!aadhaar) return '';
  const clean = String(aadhaar).replace(/\D/g, '');
  if (clean.length < 4) return clean;
  return `XXXX XXXX ${clean.slice(-4)}`;
};

export const validateAadhaar = (aadhaar, fieldLabel = 'Aadhaar Number', required = true) => {
  if (!aadhaar || !String(aadhaar).trim()) {
    if (required) return `${fieldLabel} is required`;
    return '';
  }
  const clean = String(aadhaar).replace(/\s/g, '');
  if (/[^\d]/.test(clean)) {
    return `${fieldLabel} must contain numbers only`;
  }
  if (clean.length !== 12) {
    return `${fieldLabel} must be exactly 12 numeric digits`;
  }
  if (!/^[0-9]{12}$/.test(clean)) {
    return `Enter a valid 12-digit ${fieldLabel}`;
  }
  return '';
};

/**
 * 6. PAN Card Normalization & Validation
 */
export const normalizePAN = (pan) => {
  if (!pan || typeof pan !== 'string') return '';
  return pan.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
};

export const validatePAN = (pan, fieldLabel = 'PAN Number', required = true) => {
  if (!pan || !String(pan).trim()) {
    if (required) return `${fieldLabel} is required`;
    return '';
  }
  const clean = String(pan).toUpperCase().trim();
  if (clean.length !== 10) {
    return `${fieldLabel} must be exactly 10 characters (e.g. ABCDE1234F)`;
  }
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!panRegex.test(clean)) {
    return `Enter a valid 10-character ${fieldLabel} format (5 letters, 4 digits, 1 letter, e.g. ABCDE1234F)`;
  }
  return '';
};

/**
 * 7. Bank Account Number Normalization & Validation
 */
export const normalizeAccountNumber = (accNo) => {
  if (!accNo || typeof accNo !== 'string') return '';
  return accNo.replace(/\D/g, '').slice(0, 18);
};

export const maskAccountNumber = (accNo) => {
  if (!accNo) return '';
  const clean = String(accNo).replace(/\D/g, '');
  if (clean.length < 4) return clean;
  return '•'.repeat(Math.max(0, clean.length - 4)) + clean.slice(-4);
};

export const validateAccountNumber = (accountNo, bankName = '', fieldLabel = 'Account Number', required = true) => {
  if (!accountNo || !String(accountNo).trim()) {
    if (required) return `${fieldLabel} is required`;
    return '';
  }
  const clean = String(accountNo).trim();
  if (/[^\d]/.test(clean)) {
    return `${fieldLabel} must contain numeric digits only`;
  }

  // Check documented bank-specific rule if available
  const matchedRuleKey = Object.keys(BANK_ACCOUNT_LENGTH_RULES).find(key => 
    bankName && bankName.toLowerCase().includes(key.toLowerCase())
  );
  if (matchedRuleKey) {
    const rule = BANK_ACCOUNT_LENGTH_RULES[matchedRuleKey];
    if (rule.exact && !rule.exact.includes(clean.length)) {
      return `${bankName} account number must be ${rule.exact.join(' or ')} digits (entered: ${clean.length})`;
    } else if (rule.min === rule.max && clean.length !== rule.min) {
      return `${bankName} account number must be exactly ${rule.min} digits (entered: ${clean.length})`;
    } else if (clean.length < rule.min || clean.length > rule.max) {
      return `${bankName} account number must be between ${rule.min} and ${rule.max} digits (entered: ${clean.length})`;
    }
  } else {
    // Standard Indian banking range: 9 to 18 digits
    if (clean.length < 9 || clean.length > 18) {
      return `${fieldLabel} must be between 9 and 18 digits (entered: ${clean.length})`;
    }
  }
  return '';
};

/**
 * 8. IFSC Code Normalization & Validation
 */
export const normalizeIFSC = (ifsc) => {
  if (!ifsc || typeof ifsc !== 'string') return '';
  return ifsc.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
};

export const validateIFSC = (ifsc, fieldLabel = 'IFSC Code', required = true) => {
  if (!ifsc || !String(ifsc).trim()) {
    if (required) return `${fieldLabel} is required`;
    return '';
  }
  const clean = String(ifsc).toUpperCase().trim();
  if (clean.length !== 11) {
    return `${fieldLabel} must be exactly 11 characters (e.g. SBIN0001234)`;
  }
  if (clean.charAt(4) !== '0') {
    return `The 5th character of the ${fieldLabel} must be 0 (zero)`;
  }
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(clean)) {
    return `Enter a valid 11-character ${fieldLabel} (e.g. SBIN0001234)`;
  }
  return '';
};

/**
 * 9. Date of Birth and Minimum Age Calculation (18+ Years)
 */
export const getMaxAdultDOB = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split('T')[0];
};

export const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const validateDOB = (dob, minAge = 18, fieldLabel = 'Date of Birth', required = true) => {
  if (!dob) {
    if (required) return `${fieldLabel} is required`;
    return '';
  }
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) {
    return `Enter a valid ${fieldLabel.toLowerCase()}`;
  }
  const today = new Date();
  if (birthDate > today) {
    return `${fieldLabel} cannot be in the future`;
  }
  const age = calculateAge(dob);
  if (age === null || age < minAge) {
    return `You must be at least ${minAge} years old to register.`;
  }
  if (age > 120) {
    return `Enter a valid ${fieldLabel.toLowerCase()}`;
  }
  return '';
};

// Aliases for seamless interoperability across modules
export const formatName = normalizeName;
export const cleanIndianMobile = normalizeIndianMobile;
export const cleanAadhaar = normalizeAadhaar;
export const cleanPAN = normalizePAN;
export const cleanAccountNumber = normalizeAccountNumber;
export const cleanIFSC = normalizeIFSC;
export const BANK_ACCOUNT_LENGTHS = BANK_ACCOUNT_LENGTH_RULES;
