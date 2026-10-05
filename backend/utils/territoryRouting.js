const mongoose = require('mongoose');

// Known territory mappings fallback if database record is missing
const KNOWN_PINCODES = {
  '641666': { state: 'Tamil Nadu', district: 'Tirupur', division: 'Palladam' },
  '635305': { state: 'Tamil Nadu', district: 'Dharmapuri', division: 'Harur' },
  '635002': { state: 'Tamil Nadu', district: 'Krishnagiri', division: 'Krishnagiri' },
  '635001': { state: 'Tamil Nadu', district: 'Krishnagiri', division: 'Krishnagiri' },
  '635007': { state: 'Tamil Nadu', district: 'Krishnagiri', division: 'Hosur' },
  '635109': { state: 'Tamil Nadu', district: 'Krishnagiri', division: 'Hosur' },
  '635110': { state: 'Tamil Nadu', district: 'Krishnagiri', division: 'Hosur' },
  '635126': { state: 'Tamil Nadu', district: 'Krishnagiri', division: 'Hosur' },
  '636112': { state: 'Tamil Nadu', district: 'Salem', division: 'Thalaivasal' },
  '636114': { state: 'Tamil Nadu', district: 'Salem', division: 'Attur' },
  '636001': { state: 'Tamil Nadu', district: 'Salem', division: 'Salem North' },
  '636002': { state: 'Tamil Nadu', district: 'Salem', division: 'Salem North' },
  '638001': { state: 'Tamil Nadu', district: 'Erode', division: 'Erode' },
  '638103': { state: 'Tamil Nadu', district: 'Tirupur', division: 'Avinasi' },
  '560001': { state: 'Karnataka', district: 'Bengaluru Urban', division: 'Bengaluru South' },
  '560068': { state: 'Karnataka', district: 'Bengaluru Urban', division: 'Bengaluru South' },
  '560072': { state: 'Karnataka', district: 'Bengaluru Urban', division: 'Bengaluru South' },
  '560087': { state: 'Karnataka', district: 'Bengaluru Urban', division: 'Bengaluru South' },
  '560034': { state: 'Karnataka', district: 'Bengaluru Urban', division: 'Bengaluru South' },
  '680001': { state: 'Kerala', district: 'Thrissur', division: 'Thrissur' },
  '680004': { state: 'Kerala', district: 'Thrissur', division: 'Thrissur West' },
  '680618': { state: 'Kerala', district: 'Thrissur', division: 'Thrissur South' },
  '520001': { state: 'Andhra Pradesh', district: 'NTR District', division: 'Vijayawada Central' }
};

/**
 * Category-based Document Requirements Matrix
 */
const CATEGORY_DOC_RULES = {
  'Food': {
    label: 'Food & Restaurant',
    mandatory: [
      { key: 'foodSafetyDoc', numberKey: 'foodSafetyLicenseNo', label: 'Food Safety License (FSSAI)', numberLabel: 'Food Safety License Number' }
    ],
    optional: [
      { key: 'gstDoc', numberKey: 'gstNumber', label: 'GST Certificate', numberLabel: 'GST Number' }
    ]
  },
  'Restaurant': {
    label: 'Food & Restaurant',
    mandatory: [
      { key: 'foodSafetyDoc', numberKey: 'foodSafetyLicenseNo', label: 'Food Safety License (FSSAI)', numberLabel: 'Food Safety License Number' }
    ],
    optional: [
      { key: 'gstDoc', numberKey: 'gstNumber', label: 'GST Certificate', numberLabel: 'GST Number' }
    ]
  },
  'Grocery': {
    label: 'Grocery & Daily Essentials',
    mandatory: [
      { key: 'foodSafetyDoc', numberKey: 'foodSafetyLicenseNo', label: 'Food Safety License (FSSAI)', numberLabel: 'Food Safety License Number' }
    ],
    optional: [
      { key: 'gstDoc', numberKey: 'gstNumber', label: 'GST Certificate', numberLabel: 'GST Number' }
    ]
  },
  'Daily Needs': {
    label: 'Daily Needs / Grocery',
    mandatory: [
      { key: 'foodSafetyDoc', numberKey: 'foodSafetyLicenseNo', label: 'Food Safety License (FSSAI)', numberLabel: 'Food Safety License Number' }
    ],
    optional: [
      { key: 'gstDoc', numberKey: 'gstNumber', label: 'GST Certificate', numberLabel: 'GST Number' }
    ]
  },
  'Electronics': {
    label: 'Electronics',
    mandatory: [
      { key: 'bisDoc', numberKey: 'bisCertificateNo', label: 'BIS / CRS Registration Certificate', numberLabel: 'BIS / CRS Certificate Number' }
    ],
    optional: [
      { key: 'tradingCertDoc', numberKey: 'tradingCertNo', label: 'Product / Trading Certificate', numberLabel: 'Certificate Number' },
      { key: 'gstDoc', numberKey: 'gstNumber', label: 'GST Certificate', numberLabel: 'GST Number' }
    ]
  },
  'Products': {
    label: 'Product / Trading',
    mandatory: [],
    optional: [
      { key: 'productCertDoc', numberKey: 'productCertNo', label: 'Business / Product Certificate', numberLabel: 'Certificate Number' },
      { key: 'gstDoc', numberKey: 'gstNumber', label: 'GST Certificate', numberLabel: 'GST Number' }
    ]
  },
  'Product': {
    label: 'Product / Trading',
    mandatory: [],
    optional: [
      { key: 'productCertDoc', numberKey: 'productCertNo', label: 'Business / Product Certificate', numberLabel: 'Certificate Number' },
      { key: 'gstDoc', numberKey: 'gstNumber', label: 'GST Certificate', numberLabel: 'GST Number' }
    ]
  },
  'Stay': {
    label: 'Stay (Hotels / Resort / Lodge)',
    mandatory: [],
    optional: [
      { key: 'fireNocDoc', numberKey: 'fireNocNo', label: 'Fire Safety NOC', numberLabel: 'Fire NOC Number' },
      { key: 'stayLicenseDoc', numberKey: 'stayLicenseNo', label: 'Property / Hospitality License', numberLabel: 'License Number' },
      { key: 'gstDoc', numberKey: 'gstNumber', label: 'GST Certificate', numberLabel: 'GST Number' }
    ]
  },
  'Travel': {
    label: 'Travel & Transport',
    mandatory: [
      { key: 'rcDoc', numberKey: 'rcNumber', label: 'Vehicle Registration Certificate (RC)', numberLabel: 'Vehicle RC Number' },
      { key: 'fitnessDoc', numberKey: 'fitnessNumber', label: 'Vehicle Fitness Certificate', numberLabel: 'Fitness Certificate Number' },
      { key: 'permitDoc', numberKey: 'permitNumber', label: 'Transport / Commercial Permit', numberLabel: 'Permit Number' }
    ],
    optional: [
      { key: 'gstDoc', numberKey: 'gstNumber', label: 'GST Certificate', numberLabel: 'GST Number' }
    ]
  },
  'Jobs': {
    label: 'Jobs & Company Verification',
    mandatory: [
      { key: 'companyRegDoc', numberKey: 'companyRegNo', label: 'Company Registration Certificate', numberLabel: 'Company Registration Number' }
    ],
    optional: [
      { key: 'llpDoc', numberKey: 'llpNumber', label: 'LLP / Partnership Registration', numberLabel: 'Registration Number' },
      { key: 'labourLicenseDoc', numberKey: 'labourLicenseNo', label: 'Labour / Business Trade License', numberLabel: 'License Number' },
      { key: 'gstDoc', numberKey: 'gstNumber', label: 'GST Certificate', numberLabel: 'GST Number' }
    ]
  },
  'Job': {
    label: 'Jobs & Company Verification',
    mandatory: [
      { key: 'companyRegDoc', numberKey: 'companyRegNo', label: 'Company Registration Certificate', numberLabel: 'Company Registration Number' }
    ],
    optional: [
      { key: 'llpDoc', numberKey: 'llpNumber', label: 'LLP / Partnership Registration', numberLabel: 'Registration Number' },
      { key: 'labourLicenseDoc', numberKey: 'labourLicenseNo', label: 'Labour / Business Trade License', numberLabel: 'License Number' },
      { key: 'gstDoc', numberKey: 'gstNumber', label: 'GST Certificate', numberLabel: 'GST Number' }
    ]
  },
  'Services': {
    label: 'Services',
    mandatory: [],
    optional: [
      { key: 'tradeLicenseDoc', numberKey: 'tradeLicenseNo', label: 'Trade / Service Registration License', numberLabel: 'License Number' },
      { key: 'gstDoc', numberKey: 'gstNumber', label: 'GST Certificate', numberLabel: 'GST Number' }
    ]
  }
};

/**
 * Finds the Pincode Admin (or Manager) responsible for a specific pincode
 * using the real database collections (managers, pincodes, pincodeassignments).
 */
const findPincodeAdmin = async (pincode, territoryInfo = {}) => {
  const pin = String(pincode || '').trim();
  const db = mongoose.connection.db;

  try {
    // 1. Look for a manager specifically assigned to this pincode with role pincode_manager
    const pinMgr = await db.collection('managers').findOne({
      role: 'pincode_manager',
      status: { $in: ['active', 'Active'] },
      $or: [
        { pincode: pin },
        { assignedPincodes: pin },
        { pincodes: pin }
      ]
    });

    if (pinMgr) {
      return {
        id: pinMgr._id || pinMgr.id,
        name: pinMgr.name,
        role: 'Pincode Admin',
        pincode: pinMgr.pincode || pin,
        district: pinMgr.district,
        division: pinMgr.division,
        state: pinMgr.state
      };
    }

    // 2. Check pincodeassignments collection
    const assignment = await db.collection('pincodeassignments').findOne({
      pincode: pin,
      status: 'Active'
    });
    if (assignment && (assignment.assignedAdminId || assignment.assignedManagerId)) {
      const mgrId = assignment.assignedAdminId || assignment.assignedManagerId;
      const mgr = await db.collection('managers').findOne({ _id: mgrId }) ||
                  await db.collection('users').findOne({ _id: mgrId });
      if (mgr) {
        return {
          id: mgr._id || mgr.id,
          name: mgr.name,
          role: 'Pincode Admin',
          pincode: pin,
          district: assignment.district,
          division: assignment.division,
          state: assignment.state
        };
      }
    }

    // 3. Fallback to division manager in that division
    if (territoryInfo.division) {
      const divMgr = await db.collection('managers').findOne({
        role: 'division_manager',
        status: { $in: ['active', 'Active'] },
        division: new RegExp(`^${territoryInfo.division}$`, 'i')
      });
      if (divMgr) {
        return {
          id: divMgr._id || divMgr.id,
          name: divMgr.name,
          role: 'Division Manager (Acting Pincode Admin)',
          pincode: pin,
          district: divMgr.district,
          division: divMgr.division
        };
      }
    }

    // 4. Fallback to district manager in that district
    if (territoryInfo.district) {
      const distMgr = await db.collection('managers').findOne({
        role: 'district_manager',
        status: { $in: ['active', 'Active'] },
        district: new RegExp(`^${territoryInfo.district}$`, 'i')
      });
      if (distMgr) {
        return {
          id: distMgr._id || distMgr.id,
          name: distMgr.name,
          role: 'District Manager (Acting Pincode Admin)',
          pincode: pin,
          district: distMgr.district
        };
      }
    }

    // 5. Look in pincodes collection for territory metadata
    const pinDoc = await db.collection('pincodes').findOne({ pincode: pin });
    if (pinDoc && pinDoc.assignedManager) {
      const mgr = await db.collection('managers').findOne({ _id: pinDoc.assignedManager });
      if (mgr) {
        return {
          id: mgr._id || mgr.id,
          name: mgr.name,
          role: 'Pincode Admin',
          pincode: pin
        };
      }
    }

    // 6. Generic active pincode manager fallback
    const fallbackPinMgr = await db.collection('managers').findOne({
      role: 'pincode_manager',
      status: { $in: ['active', 'Active'] }
    });
    if (fallbackPinMgr) {
      return {
        id: fallbackPinMgr._id || fallbackPinMgr.id,
        name: fallbackPinMgr.name,
        role: 'Pincode Admin',
        pincode: fallbackPinMgr.pincode || pin
      };
    }
  } catch (err) {
    console.warn('findPincodeAdmin DB error:', err.message);
  }

  // Known fallback if DB lookup has no matching row
  if (KNOWN_PINCODES[pin]) {
    const geo = KNOWN_PINCODES[pin];
    return {
      id: `admin_pin_${pin}`,
      name: `Pincode Officer (${geo.division})`,
      role: 'Pincode Admin',
      pincode: pin,
      district: geo.district,
      division: geo.division,
      state: geo.state
    };
  }

  return {
    id: `admin_pin_${pin}`,
    name: 'Assigned Pincode Admin',
    role: 'Pincode Admin',
    pincode: pin
  };
};

module.exports = {
  findPincodeAdmin,
  CATEGORY_DOC_RULES,
  KNOWN_PINCODES
};
