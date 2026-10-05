function normalizeBooleanValue(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value ? 1 : 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return 1;
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return 0;
  }
  return value == null ? 0 : value;
}

function normalizeDesignedFor(value) {
  if (value === undefined || value === null) return null;
  if (value === '') return null;

  if (Array.isArray(value)) return JSON.stringify(value);

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
      if (typeof parsed === 'string') return JSON.stringify([parsed]);
      return JSON.stringify(parsed);
    } catch {
      return trimmed;
    }
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function normalizeDesignUpdatePayload(body = {}) {
  const next = { ...body };

  if (Object.prototype.hasOwnProperty.call(next, 'active')) {
    next.active = normalizeBooleanValue(next.active);
  }

  if (Object.prototype.hasOwnProperty.call(next, 'designed_for')) {
    next.designed_for = normalizeDesignedFor(next.designed_for);
  }

  return next;
}

module.exports = {
  normalizeBooleanValue,
  normalizeDesignedFor,
  normalizeDesignUpdatePayload,
};
