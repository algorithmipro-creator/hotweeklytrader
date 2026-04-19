const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('deposits page forces the back arrow to return to the main menu', () => {
  const filePath = path.join(__dirname, 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes('<PageBackButton fallbackHref="/" forceFallback />'));
});
