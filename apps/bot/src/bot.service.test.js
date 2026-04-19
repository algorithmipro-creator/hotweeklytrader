const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('bot start flow preserves referral payload by opening mini app with ref query', () => {
  const filePath = path.join(__dirname, 'bot.service.ts');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /buildMiniAppUrl/u);
  assert.match(source, /ctx\.match/u);
  assert.match(source, /ref_/u);
  assert.match(source, /searchParams\.set\('ref'/u);
});

test('bot keeps referral code in session for follow-up menu buttons', () => {
  const filePath = path.join(__dirname, 'bot.service.ts');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /referralCode\?: string;/u);
  assert.match(source, /ctx\.session\.referralCode = referralCode \?\? undefined/u);
  assert.match(source, /buildMiniAppUrl\(ctx\.session\.referralCode\)/u);
});

test('bot captures pending referrals on /start so the Telegram menu button can still attribute signup', () => {
  const filePath = path.join(__dirname, 'bot.service.ts');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /capturePendingReferral/u);
  assert.match(source, /axios\.post/u);
  assert.match(source, /\/referrals\/pending/u);
  assert.match(source, /x-referral-capture-secret/u);
});
