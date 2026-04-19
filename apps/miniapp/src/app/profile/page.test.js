const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('profile hub links to addresses, team, and referrals', () => {
  const filePath = path.join(__dirname, 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes('getReferralProfile'));
  assert.ok(source.includes('getReferralTeam'));
  assert.ok(source.includes('href="/profile/addresses"'));
  assert.ok(source.includes('href="/profile/team"'));
  assert.ok(source.includes('href="/profile/referrals"'));
});
