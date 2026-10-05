const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeDesignUpdatePayload } = require('../src/lib/design-normalization.js');

test('normalizes boolean active and serializes designed_for arrays', () => {
  const payload = normalizeDesignUpdatePayload({
    active: 'false',
    designed_for: ['jersey', 'bib']
  });

  assert.equal(payload.active, 0);
  assert.equal(payload.designed_for, JSON.stringify(['jersey', 'bib']));
});

test('accepts JSON strings for designed_for and preserves nulls', () => {
  const payload = normalizeDesignUpdatePayload({
    active: true,
    designed_for: '["jersey"]'
  });

  assert.equal(payload.active, 1);
  assert.equal(payload.designed_for, '["jersey"]');

  const empty = normalizeDesignUpdatePayload({ designed_for: '' });
  assert.equal(empty.designed_for, null);
});
