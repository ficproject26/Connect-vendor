/**
 * NoSQL Injection Sanitization Middleware
 * Recursively strips/sanitizes MongoDB query operators ($ and .) from request inputs
 */

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    // Prohibit keys starting with $ (MongoDB operator injection) or containing . (dotted path injection)
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeObject(obj[key]);
  }
  return clean;
}

const noSqlSanitizer = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

module.exports = { noSqlSanitizer, sanitizeObject };
