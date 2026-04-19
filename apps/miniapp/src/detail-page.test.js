const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('deposit detail keeps the return routing block visible and editable on the second screen', () => {
  const filePath = path.join(__dirname, '[id]', 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.ok(source.includes('updateDepositReturnRouting'));
  assert.ok(source.includes('isEditingReturnRouting'));
  assert.ok(source.includes('returnAddressInput'));
  assert.ok(source.includes('returnMemoInput'));
  assert.ok(source.includes('handleReturnRoutingSave'));
  assert.ok(source.includes('depositDetail.returnAddressForAsset'));
  assert.ok(source.includes('depositDetail.returnAddressHelp'));
  assert.ok(source.includes('depositDetail.returnAddressEmpty'));
  assert.ok(source.includes('depositDetail.returnAddressEditHelp'));
  assert.ok(source.includes('{isEditingReturnRouting ? ('));
  assert.ok(!source.includes('(deposit.source_address || deposit.return_address) && ('));
});
