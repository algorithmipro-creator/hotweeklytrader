import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRewardFilters,
  flattenTreeSections,
  formatRewardAmount,
  matchesUserSearch,
} from './referral-rewards.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('admin api exports referral rewards helpers', () => {
  const apiPath = path.join(__dirname, 'api.ts');
  const source = fs.readFileSync(apiPath, 'utf8');

  assert.match(source, /export async function getReferralRewards/u);
  assert.match(source, /export async function getReferralTree/u);
  assert.match(source, /export async function reassignReferralParent/u);
});

test('admin includes referral rewards route in the sidebar and page shell', () => {
  const sidebarPath = path.join(__dirname, '..', 'components', 'sidebar.tsx');
  const pagePath = path.join(__dirname, '..', 'app', 'referral-rewards', 'page.tsx');

  const sidebarSource = fs.readFileSync(sidebarPath, 'utf8');
  const pageSource = fs.readFileSync(pagePath, 'utf8');

  assert.match(sidebarSource, /href: '\/referral-rewards'/u);
  assert.match(pageSource, /Referral Rewards/u);
  assert.match(pageSource, /Ledger/u);
  assert.match(pageSource, /Referral Tree/u);
});

test('buildRewardFilters keeps only non-empty values', () => {
  assert.deepEqual(
    buildRewardFilters({
      status: 'PENDING',
      rewardType: '',
      level: '2',
      periodId: undefined,
      beneficiaryUserId: null,
      sourceUserId: 'source-1',
    }),
    { status: 'PENDING', level: '2', sourceUserId: 'source-1' },
  );
});

test('formatRewardAmount keeps two decimals', () => {
  assert.equal(formatRewardAmount(6), '6.00 USDT');
});

test('flattenTreeSections groups current user, referrer, level 1, and level 2', () => {
  const sections = flattenTreeSections({
    user: { user_id: 'u1' },
    referrer: { user_id: 'u0' },
    level_1: [{ user_id: 'u2' }],
    level_2: [{ user_id: 'u3' }],
  });

  assert.equal(sections[0].title, 'Current User');
  assert.equal(sections[1].items[0].user_id, 'u0');
  assert.equal(sections[2].items[0].user_id, 'u2');
  assert.equal(sections[3].items[0].user_id, 'u3');
});

test('matchesUserSearch checks id username display name and telegram id', () => {
  const user = {
    user_id: 'user-1',
    username: 'alice',
    display_name: 'Alice Doe',
    telegram_id: '123456',
  };

  assert.equal(matchesUserSearch(user, 'alice'), true);
  assert.equal(matchesUserSearch(user, '123456'), true);
  assert.equal(matchesUserSearch(user, 'doe'), true);
  assert.equal(matchesUserSearch(user, 'missing'), false);
});
