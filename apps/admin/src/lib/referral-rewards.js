export function buildRewardFilters(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

export function buildReferralRewardsTreeHref(userId) {
  const params = new URLSearchParams({ tab: 'tree' });
  if (userId) {
    params.set('userId', userId);
  }

  return `/referral-rewards?${params.toString()}`;
}

export function formatRewardAmount(value) {
  return `${Number(value ?? 0).toFixed(2)} USDT`;
}

export const TREE_NODE_SEPARATOR = ' | ';

export function resolveReferralRewardsViewState(searchParams) {
  const requestedTab = searchParams?.get?.('tab');
  const requestedUserId = (searchParams?.get?.('userId') || '').trim();

  return {
    activeTab: requestedTab === 'ledger'
      ? 'ledger'
      : (requestedTab === 'tree' || requestedUserId ? 'tree' : 'ledger'),
    userId: requestedUserId,
  };
}

export function flattenTreeSections(tree) {
  return [
    { title: 'Current User', items: tree?.user ? [tree.user] : [] },
    { title: 'Referrer', items: tree?.referrer ? [tree.referrer] : [] },
    { title: 'Level 1', items: tree?.level_1 ?? [] },
    { title: 'Level 2', items: tree?.level_2 ?? [] },
  ];
}

export function matchesUserSearch(user, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    user?.user_id,
    user?.username,
    user?.display_name,
    user?.telegram_id,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
}
