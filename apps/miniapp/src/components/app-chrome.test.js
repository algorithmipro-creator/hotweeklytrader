const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('bottom navigation uses four tabs without notifications', () => {
  const filePath = path.join(__dirname, 'app-bottom-nav.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /export type AppTab = 'faq' \| 'home' \| 'trade' \| 'support';/u);
  assert.match(source, /grid-cols-4/u);
  assert.doesNotMatch(source, /\/notifications/u);
  assert.doesNotMatch(source, /nav\.bell/u);
});

test('brand bell link fetches unread notifications and lights up when needed', () => {
  const filePath = path.join(__dirname, 'brand-bell-link.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /getNotifications/u);
  assert.match(source, /notification\.delivery_status !== 'READ'/u);
  assert.match(source, /href="\/notifications"/u);
  assert.match(source, /BellIcon/u);
  assert.match(source, /hasUnread[\s\S]*shadow-\[0_0_18px_rgba\(103,240,228,0\.65\)\]/u);
});

test('home screen includes a my team card under addresses', () => {
  const filePath = path.join(__dirname, '..', 'app', 'page.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  const addressesIndex = source.indexOf('href="/addresses"');
  const teamIndex = source.indexOf('href="/team"');
  const summaryIndex = source.indexOf('href={`/metrics/${summaryDeposit.deposit_id}`}');

  assert.notEqual(teamIndex, -1);
  assert.ok(teamIndex > addressesIndex);
  assert.ok(summaryIndex > teamIndex);
  assert.match(source, /t\('home\.myTeam'\)/u);
  assert.match(source, /t\('home\.myTeamSub'\)/u);
});

test('team page renders live referral workspace content', () => {
  const filePath = path.join(__dirname, '..', 'app', 'team', 'page.tsx');
  assert.ok(fs.existsSync(filePath), 'team page should exist');

  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /AppScreen/u);
  assert.match(source, /BrandBellLink/u);
  assert.match(source, /LanguageSwitch/u);
  assert.match(source, /ArrowLeftIcon/u);
  assert.ok(source.includes('href="/"'));
  assert.match(source, /getReferralProfile/u);
  assert.match(source, /getReferralTeam/u);
  assert.match(source, /copied/u);
  assert.match(source, /handleCopyReferralLink/u);
  assert.match(source, /onClick=\{handleCopyReferralLink\}/u);
  assert.match(source, /t\('team\.title'\)/u);
  assert.match(source, /t\('team\.referralLinkTitle'\)/u);
  assert.match(source, /t\('team\.summaryTitle'\)/u);
  assert.match(source, /t\('team\.emptyMembers'\)/u);
  assert.match(source, /t\('team\.previewRegistered'\)/u);
  assert.match(source, /t\('team\.previewActive'\)/u);
  assert.match(source, /t\('team\.linkCopied'\)/u);
});

test('miniapp auth can recover referral code from url query when Telegram start_param is missing', () => {
  const authProviderPath = path.join(__dirname, '..', 'providers', 'auth-provider.tsx');
  const telegramPath = path.join(__dirname, '..', 'lib', 'telegram.ts');

  const authProviderSource = fs.readFileSync(authProviderPath, 'utf8');
  const telegramSource = fs.readFileSync(telegramPath, 'utf8');

  assert.match(authProviderSource, /getReferralCodeFromUrl/u);
  assert.match(authProviderSource, /getReferralCodeFromUrl\(\) \|\|/u);
  assert.match(telegramSource, /export function getReferralCodeFromUrl/u);
  assert.match(telegramSource, /URLSearchParams\(window\.location\.search\)/u);
});

test('auth provider bootstraps telegram auth only once per page load', () => {
  const authProviderPath = path.join(__dirname, '..', 'providers', 'auth-provider.tsx');
  const source = fs.readFileSync(authProviderPath, 'utf8');

  assert.match(source, /useRef/u);
  assert.match(source, /authStartedRef/u);
  assert.match(source, /if \(authStartedRef\.current\) \{\s*return;\s*\}/u);
  assert.match(source, /authStartedRef\.current = true/u);
});
