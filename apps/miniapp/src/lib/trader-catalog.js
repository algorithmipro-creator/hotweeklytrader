const VISIBLE_NETWORKS = ['BSC', 'TON', 'SOL'];

function getVisibleNetworks(networks) {
  if (!Array.isArray(networks)) {
    return [];
  }

  return [...new Set(networks.filter((network) => VISIBLE_NETWORKS.includes(network)))];
}

const TRADER_CATALOG = [
  {
    trader_id: 'trader-flux-1',
    slug: 'flux-trader',
    name: 'Flux Trader',
    nickname: '@flux_control',
    status: 'active',
    description:
      'AI assistant with tighter entry timing and conservative network allocation across multi-chain sprint deposits.',
    networks: ['BSC', 'TRON', 'TON'],
    badge: 'conservative-routing',
    profileReady: true,
  },
  {
    trader_id: 'trader-vector-1',
    slug: 'vector-pulse',
    name: 'Vector Pulse',
    nickname: '@vector_pulse',
    status: 'coming-soon',
    description:
      'Signal-first assistant built for faster sprint reactions, clean reporting visibility, and sharper rhythm across weekly entries.',
    networks: ['TON', 'BSC'],
    badge: 'fast-cycle',
    profileReady: false,
  },
];

function getTraderCatalog() {
  return TRADER_CATALOG.map((trader) => ({
    ...trader,
    networks: getVisibleNetworks(trader.networks),
  }));
}

function getTraderBySlug(slug) {
  const trader = TRADER_CATALOG.find((item) => item.slug === slug);
  if (!trader) {
    return null;
  }

  return {
    ...trader,
    networks: getVisibleNetworks(trader.networks),
  };
}

function getTraderNetworks(slug) {
  return getTraderBySlug(slug)?.networks ?? [];
}

function buildCreateDepositHref(slug) {
  return `/create-deposit?trader=${encodeURIComponent(slug)}`;
}

function buildTraderProfileHref(slug) {
  return `/traders/${encodeURIComponent(slug)}`;
}

function toNetworkList(mainAddresses, fallbackNetworks) {
  if (Array.isArray(mainAddresses) && mainAddresses.length > 0) {
    return getVisibleNetworks(mainAddresses.map((item) => item.network).filter(Boolean));
  }

  return getVisibleNetworks(fallbackNetworks);
}

function mergeApiTrader(localTrader, apiTrader) {
  if (!apiTrader) {
    return localTrader;
  }

  return {
    ...localTrader,
    trader_id: apiTrader.trader_id ?? localTrader.trader_id,
    slug: apiTrader.slug ?? localTrader.slug,
    name: apiTrader.display_name ?? localTrader.name,
    nickname: apiTrader.nickname ?? localTrader.nickname,
    description: apiTrader.description ?? localTrader.description,
    status: (apiTrader.status ?? localTrader.status ?? 'ACTIVE').toLowerCase(),
    profile_title: apiTrader.profile_title ?? localTrader.profile_title,
    main_addresses: apiTrader.main_addresses ?? [],
    networks: toNetworkList(apiTrader.main_addresses, localTrader.networks),
  };
}

function mergeApiTraderCatalog(apiTraders) {
  const apiBySlug = new Map((apiTraders ?? []).map((trader) => [trader.slug, trader]));

  return getTraderCatalog().map((localTrader) => mergeApiTrader(localTrader, apiBySlug.get(localTrader.slug)));
}

function mergeApiTraderProfile(apiTrader, slug) {
  const fallbackTrader = getTraderBySlug(slug);
  if (!fallbackTrader) {
    return apiTrader ?? null;
  }

  return mergeApiTrader(fallbackTrader, apiTrader);
}

function getTraderProfile(slug, apiTrader) {
  return mergeApiTraderProfile(apiTrader ?? null, slug);
}

module.exports = {
  VISIBLE_NETWORKS,
  getTraderCatalog,
  getTraderBySlug,
  getTraderNetworks,
  getTraderProfile,
  getVisibleNetworks,
  buildCreateDepositHref,
  buildTraderProfileHref,
  mergeApiTraderCatalog,
  mergeApiTraderProfile,
};
