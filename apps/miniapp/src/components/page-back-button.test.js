const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('page back button supports forcing the fallback route instead of browser history', () => {
  const filePath = path.join(__dirname, 'page-back-button.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes('forceFallback?: boolean;'));
  assert.ok(source.includes('export function PageBackButton({ fallbackHref, forceFallback = false }: PageBackButtonProps)'));
  assert.ok(source.includes('if (!forceFallback && typeof window !== \'undefined\' && window.history.length > 1) {'));
});
