import test from 'node:test';
import assert from 'node:assert/strict';
import { readId, readList, readPagination, readText, slugify } from '../src/utils/validation.js';

test('slugify normalizes titles into URL-safe slugs', () => {
  assert.equal(slugify('  Artificial Intelligence & ML  '), 'artificial-intelligence-ml');
});

test('readList trims, removes empty values, and deduplicates entries', () => {
  assert.deepEqual(readList(' React, Node.js, React, ', 'Stack'), ['React', 'Node.js']);
});

test('readId rejects invalid and injected identifiers', () => {
  assert.throws(() => readId('1; DROP TABLE admins'), /valid identifier/);
  assert.throws(() => readId('24'), /valid identifier/);
  assert.equal(readId('507f1f77bcf86cd799439011').toString(), '507f1f77bcf86cd799439011');
});

test('readPagination clamps unsafe page sizes', () => {
  assert.deepEqual(readPagination({ page: '0', limit: '1000' }), { page: 1, limit: 100, offset: 0 });
});

test('readText enforces required values and size limits', () => {
  assert.equal(readText('  BELIEVE  ', 'Brand', { required: true }), 'BELIEVE');
  assert.throws(() => readText(' ', 'Brand', { required: true }), /required/);
  assert.throws(() => readText('long value', 'Brand', { max: 4 }), /no more than 4/);
});
