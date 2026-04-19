const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('trader reporting page renders canonical drilldown state', () => {
  const filePath = path.join(__dirname, 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes('selectedTraderId'));
  assert.ok(source.includes('getCanonicalPeriodTraderReporting'));
  assert.ok(source.includes('reporting.traders'));
  assert.ok(source.includes('selectedTrader?.deposits'));
});

test('trader reporting page keeps referral values read only', () => {
  const filePath = path.join(__dirname, 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(!source.includes('referralAmountInput'));
  assert.ok(source.includes("referral.source === 'TEAM_DERIVED'"));
});
