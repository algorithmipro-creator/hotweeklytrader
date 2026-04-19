const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('home page links to profile instead of top-level addresses', () => {
  const filePath = path.join(__dirname, 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes('href="/profile"'));
  assert.equal(source.includes('href="/addresses"'), false);
  assert.equal(source.includes('My Addresses'), false);
});
