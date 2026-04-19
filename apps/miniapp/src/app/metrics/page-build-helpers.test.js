const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('metrics page keeps summary helpers local to avoid missing module resolution', () => {
  const filePath = path.join(__dirname, '[depositId]', 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.equal(source.includes("from '../../../lib/home-deposit-summary'"), false);
  assert.equal(source.includes("from '../../../lib/trader-catalog'"), false);
});
