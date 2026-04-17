const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('metrics page fetches deposit live metrics and does not render projected balance', () => {
  const filePath = path.join(__dirname, 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /getDepositLiveMetrics/u);
  assert.doesNotMatch(source, /summaryProjectedBalanceValue/u);
  assert.doesNotMatch(source, /t\('home\.projectedBalance'\)/u);
  assert.match(source, /profit_percent/u);
  assert.match(source, /trade_count/u);
  assert.match(source, /win_rate/u);
});

