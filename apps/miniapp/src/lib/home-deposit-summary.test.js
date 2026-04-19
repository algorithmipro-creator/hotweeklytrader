const test = require('node:test');
const assert = require('node:assert/strict');

const { pickLatestDeposit } = require('./home-deposit-summary');

test('pickLatestDeposit prefers the newest algorithm-works cycle over newer awaiting transfers', () => {
  const result = pickLatestDeposit([
    { deposit_id: 'awaiting-newer', status: 'AWAITING_TRANSFER', created_at: '2026-04-17T12:00:00.000Z' },
    { deposit_id: 'completed-older', status: 'COMPLETED', created_at: '2026-04-16T12:00:00.000Z' },
    { deposit_id: 'active-oldest', status: 'ACTIVE', created_at: '2026-04-15T12:00:00.000Z' },
  ]);

  assert.equal(result?.deposit_id, 'completed-older');
});

test('pickLatestDeposit falls back to the newest awaiting transfer cycle when no active cycle exists', () => {
  const result = pickLatestDeposit([
    { deposit_id: 'confirming-newest', status: 'CONFIRMING', created_at: '2026-04-17T14:00:00.000Z' },
    { deposit_id: 'awaiting-middle', status: 'AWAITING_TRANSFER', created_at: '2026-04-17T13:00:00.000Z' },
    { deposit_id: 'created-oldest', status: 'CREATED', created_at: '2026-04-16T12:00:00.000Z' },
  ]);

  assert.equal(result?.deposit_id, 'awaiting-middle');
});

test('pickLatestDeposit still falls back to the newest cycle when neither active nor awaiting transfer exists', () => {
  const result = pickLatestDeposit([
    { deposit_id: 'confirming-newest', status: 'CONFIRMING', created_at: '2026-04-17T14:00:00.000Z' },
    { deposit_id: 'created-older', status: 'CREATED', created_at: '2026-04-16T12:00:00.000Z' },
  ]);

  assert.equal(result?.deposit_id, 'confirming-newest');
});
