const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('addresses route preserves compatibility by redirecting to profile addresses', () => {
  const filePath = path.join(__dirname, 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes("redirect('/profile/addresses')"));
});
