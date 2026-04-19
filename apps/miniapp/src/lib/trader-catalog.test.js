const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getTraderCatalog,
  getTraderBySlug,
  getTraderNetworks,
  getTraderProfile,
  buildCreateDepositHref,
  buildTraderProfileHref,
  mergeApiTraderCatalog,
  mergeApiTraderProfile,
} = require('./trader-catalog.js');

test('returns a trader by slug', () => {
  const trader = getTraderBySlug('flux-trader');

  assert.ok(trader);
  assert.equal(trader.slug, 'flux-trader');
  assert.equal(trader.trader_id, 'trader-flux-1');
  assert.equal(trader.nickname, '@flux_control');
});

test('returns empty networks for unknown trader', () => {
  assert.deepEqual(getTraderNetworks('missing-trader'), []);
});

test('catalog exposes traders with network arrays', () => {
  const catalog = getTraderCatalog();

  assert.ok(Array.isArray(catalog));
  assert.ok(catalog.length >= 2);
  assert.ok(catalog.every((trader) => Array.isArray(trader.networks)));
});

test('builds trader-prefilled deposit route', () => {
  assert.equal(
    buildCreateDepositHref('flux-trader'),
    '/create-deposit?trader=flux-trader',
  );
});

test('builds trader profile route', () => {
  assert.equal(buildTraderProfileHref('vector-pulse'), '/traders/vector-pulse');
});

test('merges api catalog data onto local trader definitions', () => {
  const merged = mergeApiTraderCatalog([
    {
      trader_id: 'server-flux',
      slug: 'flux-trader',
      nickname: '@flux_live',
      display_name: 'Flux Live',
      description: 'Server-backed flux trader',
      profile_title: 'semper in motu ai',
      status: 'ACTIVE',
      main_addresses: [
        { network: 'TRON', asset_symbol: 'USDT' },
        { network: 'BSC', asset_symbol: 'USDT' },
      ],
    },
  ]);

  assert.equal(merged[0].trader_id, 'server-flux');
  assert.equal(merged[0].name, 'Flux Live');
  assert.equal(merged[0].nickname, '@flux_live');
  assert.deepEqual(merged[0].networks, ['TRON', 'BSC']);
});

test('falls back to local trader profile when api profile is unavailable', () => {
  const trader = mergeApiTraderProfile(null, 'flux-trader');

  assert.ok(trader);
  assert.equal(trader.slug, 'flux-trader');
  assert.equal(trader.name, 'Flux Trader');
});

test('returns a merged trader profile for known slugs and null for unknown ones', () => {
  const liveTrader = getTraderProfile('flux-trader', {
    trader_id: 'server-flux',
    slug: 'flux-trader',
    nickname: '@flux_live',
    display_name: 'Flux Live',
    description: 'Server-backed flux trader',
    profile_title: 'semper in motu ai',
    status: 'ACTIVE',
    main_addresses: [{ network: 'TRON', asset_symbol: 'USDT' }],
  });
  const missingTrader = getTraderProfile('missing-trader', null);

  assert.equal(liveTrader.slug, 'flux-trader');
  assert.equal(liveTrader.name, 'Flux Live');
  assert.deepEqual(liveTrader.networks, ['TRON']);
  assert.equal(missingTrader, null);
});
