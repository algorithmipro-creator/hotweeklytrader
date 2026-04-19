const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('report page keeps referral rewards separate from deposit settlement', () => {
  const filePath = path.join(__dirname, '[depositId]', 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.equal(source.includes('Referral reward'), false);
  assert.ok(source.includes("t('reports.referralNote')"));
});

test('deposit detail page links into profile referrals instead of embedding referral amounts', () => {
  const filePath = path.join(__dirname, '..', 'deposits', '[id]', 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes('href="/profile/referrals"'));
});
