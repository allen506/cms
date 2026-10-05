import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCatalogProducts } from '../src/lib/catalog-fallback.js';

test('falls back to public catalog products when admin list is empty', () => {
  const products = normalizeCatalogProducts([], {
    productTypes: [
      { id: 'pt-1', name: 'CMS Pro Jersey', category: 'jersey', sort_order: 1 },
    ],
  });

  assert.equal(products.length, 1);
  assert.equal(products[0].name, 'CMS Pro Jersey');
  assert.equal(products[0].active, 1);
  assert.equal(products[0].sort_order, 1);
});

test('keeps admin product data when it already exists', () => {
  const products = normalizeCatalogProducts([
    { id: 'pt-2', name: 'Custom Product', category: 'vest', active: 1, sort_order: 3 },
  ]);

  assert.equal(products.length, 1);
  assert.equal(products[0].name, 'Custom Product');
});
