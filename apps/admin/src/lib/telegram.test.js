import test from 'node:test';
import assert from 'node:assert/strict';
import { getTelegramInitData, waitForTelegramInitData } from './telegram.js';

test('getTelegramInitData returns trimmed initData and calls ready', () => {
  let readyCalls = 0;
  const initData = getTelegramInitData({
    Telegram: {
      WebApp: {
        initData: '  query_id=abc123  ',
        ready() {
          readyCalls += 1;
        },
      },
    },
  });

  assert.equal(initData, 'query_id=abc123');
  assert.equal(readyCalls, 1);
});

test('waitForTelegramInitData retries until initData becomes available', async () => {
  let reads = 0;
  const win = {
    Telegram: {
      WebApp: {
        get initData() {
          reads += 1;
          return reads >= 3 ? 'query_id=late' : '';
        },
        ready() {},
      },
    },
  };

  const initData = await waitForTelegramInitData({
    win,
    attempts: 4,
    intervalMs: 1,
  });

  assert.equal(initData, 'query_id=late');
  assert.ok(reads >= 3);
});
