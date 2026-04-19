const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('create deposit flow includes trader selection and submits trader_id', () => {
  const filePath = path.join(__dirname, 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes('getTraders'));
  assert.ok(source.includes('selectedTrader'));
  assert.ok(source.includes('trader_id: selectedTrader'));
});

test('create deposit flow reuses the selected wallet as return routing when not sending from exchange', () => {
  const filePath = path.join(__dirname, 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes('const effectiveReturnAddress = sendingFromExchange ? undefined : effectiveSourceAddress;'));
  assert.ok(source.includes('return_address: effectiveReturnAddress,'));
});
