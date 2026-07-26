const sanitizeHTML = (text) => {
  if (!text || typeof text !== 'string') return text;

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeHTML(obj[key]).trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }

  return sanitized;
};

const sanitizeFilename = (name) => {
  if (!name) return '';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.');
};

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const removeMongoOperators = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const cleaned = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (key.startsWith('$')) continue;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      cleaned[key] = removeMongoOperators(obj[key]);
    } else {
      cleaned[key] = obj[key];
    }
  }

  return cleaned;
};

export { sanitizeHTML, sanitizeObject, sanitizeFilename, escapeRegex, removeMongoOperators };