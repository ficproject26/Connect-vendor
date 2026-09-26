/**
 * Event Validator and Payload Sanitizer
 * Ensures all real-time events strictly adhere to structured event standards.
 */

const crypto = require('crypto');

// Fields that must NEVER be broadcast to frontend clients
const SENSITIVE_FIELDS = new Set([
  'password',
  'otp',
  'otpExpires',
  '__v',
  'refreshToken',
  'resetPasswordToken',
  'secret'
]);

/**
 * Deeply sanitize data object to eliminate sensitive fields
 */
function sanitizePayloadData(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Handle Mongoose documents
  const target = (typeof obj.toObject === 'function') ? obj.toObject() : obj;

  if (Array.isArray(target)) {
    return target.map(sanitizePayloadData);
  }

  const clean = {};
  for (const [key, value] of Object.entries(target)) {
    if (SENSITIVE_FIELDS.has(key)) {
      continue;
    }
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      clean[key] = sanitizePayloadData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Standardize and validate event envelope
 * @param {Object} rawEvent
 * @returns {Object} Validated structured event
 */
function createStandardEvent({
  event,
  entity = 'generic',
  entityId,
  action = 'updated',
  version,
  target = {},
  data = {}
}) {
  if (!event || typeof event !== 'string') {
    throw new Error('Event payload must contain a valid "event" string constant.');
  }

  const safeEntityId = entityId ? String(entityId) : (data._id ? String(data._id) : (data.id ? String(data.id) : 'unknown'));
  const safeTimestamp = new Date().toISOString();
  const safeVersion = Number.isInteger(version) ? version : Date.now();
  const safeEventId = crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Construct target scope for authorization & targeted delivery
  const safeTarget = {
    vendorId: target.vendorId ? String(target.vendorId) : (data.vendorId ? String(data.vendorId) : undefined),
    userId: target.userId ? String(target.userId) : (data.memberId ? String(data.memberId) : undefined),
    role: target.role || undefined,
    businessId: target.businessId ? String(target.businessId) : undefined,
    isGlobal: target.isGlobal === true
  };

  return {
    eventId: safeEventId,
    event,
    entity,
    entityId: safeEntityId,
    action,
    timestamp: safeTimestamp,
    version: safeVersion,
    target: safeTarget,
    data: sanitizePayloadData(data)
  };
}

module.exports = {
  createStandardEvent,
  sanitizePayloadData
};
