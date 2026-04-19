'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getAdminPeriods,
  getAdminUsers,
  getReferralRewards,
  getReferralTree,
  reassignReferralParent,
} from '../../lib/api';
import {
  buildRewardFilters,
  buildReferralRewardsTreeHref,
  flattenTreeSections,
  formatRewardAmount,
  matchesUserSearch,
  resolveReferralRewardsViewState,
  TREE_NODE_SEPARATOR,
} from '../../lib/referral-rewards.js';

type ReferralRewardsTab = 'ledger' | 'tree';

type RewardFilters = {
  status: string;
  rewardType: string;
  level: string;
  periodId: string;
  beneficiaryUserId: string;
  sourceUserId: string;
};

type AdminUserOption = {
  user_id: string;
  telegram_id: string;
  username: string | null;
  display_name: string | null;
};

type ReferralTreeNode = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  referral_code: string;
  joined_at: string;
  team_status: 'Registered' | 'Active';
  referral_level: 0 | 1 | 2;
};

type ReferralTreeSection = {
  title: string;
  items: ReferralTreeNode[];
};

const initialFilters: RewardFilters = {
  status: '',
  rewardType: '',
  level: '',
  periodId: '',
  beneficiaryUserId: '',
  sourceUserId: '',
};

function getUserLabel(user: Partial<AdminUserOption> | null | undefined) {
  if (!user) {
    return 'Unknown user';
  }

  return user.display_name || user.username || user.user_id || 'Unknown user';
}

export default function ReferralRewardsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ReferralRewardsTab>('ledger');
  const [filters, setFilters] = useState<RewardFilters>(initialFilters);
  const [rewards, setRewards] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [users, setUsers] = useState<AdminUserOption[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  const [treeQuery, setTreeQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [tree, setTree] = useState<any | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [reassignReferrerId, setReassignReferrerId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassignMessage, setReassignMessage] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    const nextState = resolveReferralRewardsViewState(searchParams);
    setActiveTab(nextState.activeTab as ReferralRewardsTab);
    setSelectedUserId(nextState.userId);
  }, [searchParams]);

  useEffect(() => {
    getAdminPeriods({ status: '' })
      .then(setPeriods)
      .catch(() => setPeriods([]));

    getAdminUsers({ limit: 100 })
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRewards() {
      try {
        setLoadingRewards(true);
        setLedgerError(null);
        const result = await getReferralRewards(buildRewardFilters(filters));

        if (!active) {
          return;
        }

        setRewards(result);
      } catch (error: any) {
        if (!active) {
          return;
        }

        setLedgerError(error.response?.data?.message || 'Failed to load referral rewards');
      } finally {
        if (active) {
          setLoadingRewards(false);
        }
      }
    }

    loadRewards();

    return () => {
      active = false;
    };
  }, [filters]);

  useEffect(() => {
    if (!selectedUserId) {
      setTree(null);
      return;
    }

    let active = true;

    async function loadTree() {
      try {
        setLoadingTree(true);
        setTreeError(null);
        setReassignMessage(null);
        const result = await getReferralTree(selectedUserId);

        if (!active) {
          return;
        }

        setTree(result);
        setReassignReferrerId(result.referrer?.user_id || '');
      } catch (error: any) {
        if (!active) {
          return;
        }

        setTreeError(error.response?.data?.message || 'Failed to load referral tree');
      } finally {
        if (active) {
          setLoadingTree(false);
        }
      }
    }

    loadTree();

    return () => {
      active = false;
    };
  }, [selectedUserId]);

  const filteredUsers = useMemo(() => (
    users.filter((user) => matchesUserSearch(user, treeQuery)).slice(0, 12)
  ), [treeQuery, users]);

  const treeSections = useMemo<ReferralTreeSection[]>(() => flattenTreeSections(tree), [tree]);

  async function handleReassign() {
    if (!selectedUserId) {
      return;
    }

    try {
      setReassigning(true);
      setReassignMessage(null);

      await reassignReferralParent(
        selectedUserId,
        reassignReferrerId.trim() ? reassignReferrerId.trim() : null,
        reassignReason.trim() || undefined,
      );

      const refreshedTree = await getReferralTree(selectedUserId);
      setTree(refreshedTree);
      setReassignReferrerId(refreshedTree.referrer?.user_id || '');
      setReassignMessage('Referrer updated successfully.');
    } catch (error: any) {
      setReassignMessage(error.response?.data?.message || 'Failed to update referrer.');
    } finally {
      setReassigning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-text">Referral Rewards</h1>
        <p className="text-sm text-text-secondary">
          Review reward ledger rows and inspect the current referral tree for dispute handling.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'ledger' as const, label: 'Ledger' },
          { id: 'tree' as const, label: 'Referral Tree' },
        ].map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'ledger' ? (
        <section className="space-y-4 rounded-xl bg-bg-secondary p-6">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="rounded-lg bg-bg-tertiary px-3 py-2 text-sm text-text"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="SETTLED">Settled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={filters.rewardType}
              onChange={(event) => setFilters((current) => ({ ...current, rewardType: event.target.value }))}
              className="rounded-lg bg-bg-tertiary px-3 py-2 text-sm text-text"
            >
              <option value="">All reward types</option>
              <option value="FIRST_DEPOSIT">First Deposit</option>
              <option value="PERIOD_PROFIT">Period Profit</option>
            </select>

            <select
              value={filters.level}
              onChange={(event) => setFilters((current) => ({ ...current, level: event.target.value }))}
              className="rounded-lg bg-bg-tertiary px-3 py-2 text-sm text-text"
            >
              <option value="">All levels</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
            </select>

            <select
              value={filters.periodId}
              onChange={(event) => setFilters((current) => ({ ...current, periodId: event.target.value }))}
              className="rounded-lg bg-bg-tertiary px-3 py-2 text-sm text-text"
            >
              <option value="">All periods</option>
              {periods.map((period) => (
                <option key={period.investment_period_id} value={period.investment_period_id}>
                  {period.title}
                </option>
              ))}
            </select>

            <select
              value={filters.beneficiaryUserId}
              onChange={(event) => setFilters((current) => ({ ...current, beneficiaryUserId: event.target.value }))}
              className="rounded-lg bg-bg-tertiary px-3 py-2 text-sm text-text"
            >
              <option value="">All beneficiaries</option>
              {users.map((user) => (
                <option key={`beneficiary-${user.user_id}`} value={user.user_id}>
                  {getUserLabel(user)}
                </option>
              ))}
            </select>

            <select
              value={filters.sourceUserId}
              onChange={(event) => setFilters((current) => ({ ...current, sourceUserId: event.target.value }))}
              className="rounded-lg bg-bg-tertiary px-3 py-2 text-sm text-text"
            >
              <option value="">All source users</option>
              {users.map((user) => (
                <option key={`source-${user.user_id}`} value={user.user_id}>
                  {getUserLabel(user)}
                </option>
              ))}
            </select>
          </div>

          {loadingRewards ? (
            <div className="rounded-lg border border-gray-700 bg-bg-tertiary p-6 text-sm text-text-secondary">
              Loading reward ledger...
            </div>
          ) : null}

          {!loadingRewards && ledgerError ? (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
              {ledgerError}
            </div>
          ) : null}

          {!loadingRewards && !ledgerError && rewards.length === 0 ? (
            <div className="rounded-lg border border-gray-700 bg-bg-tertiary p-6 text-sm text-text-secondary">
              No referral rewards yet. Rewards appear after finalized trading periods create eligible ledger rows.
            </div>
          ) : null}

          {!loadingRewards && !ledgerError && rewards.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-tertiary text-text-secondary">
                  <tr>
                    <th className="p-3">Beneficiary</th>
                    <th className="p-3">Source User</th>
                    <th className="p-3">Level</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Base</th>
                    <th className="p-3">Percent</th>
                    <th className="p-3">Reward</th>
                    <th className="p-3">Period</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-bg-secondary">
                  {rewards.map((reward) => (
                    <tr key={reward.referral_reward_id}>
                      <td className="p-3">
                        {reward.beneficiary?.user_id ? (
                          <Link
                            href={buildReferralRewardsTreeHref(reward.beneficiary.user_id)}
                            className="font-medium text-text underline-offset-2 hover:text-primary hover:underline"
                          >
                            {getUserLabel(reward.beneficiary)}
                          </Link>
                        ) : (
                          <div className="font-medium text-text">{getUserLabel(reward.beneficiary)}</div>
                        )}
                        <div className="text-xs text-text-secondary">{reward.beneficiary?.user_id}</div>
                      </td>
                      <td className="p-3">
                        {reward.source_user?.user_id ? (
                          <Link
                            href={buildReferralRewardsTreeHref(reward.source_user.user_id)}
                            className="font-medium text-text underline-offset-2 hover:text-primary hover:underline"
                          >
                            {getUserLabel(reward.source_user)}
                          </Link>
                        ) : (
                          <div className="font-medium text-text">{getUserLabel(reward.source_user)}</div>
                        )}
                        <div className="text-xs text-text-secondary">{reward.source_user?.user_id}</div>
                        {reward.source_deposit_id ? (
                          <Link
                            href={`/deposits/${reward.source_deposit_id}`}
                            className="mt-1 inline-flex text-xs text-primary underline-offset-2 hover:underline"
                          >
                            Deposit {String(reward.source_deposit_id).slice(0, 8)}
                          </Link>
                        ) : null}
                      </td>
                      <td className="p-3 text-text-secondary">L{reward.referral_level}</td>
                      <td className="p-3 text-text-secondary">{reward.reward_type}</td>
                      <td className="p-3 text-text-secondary">{formatRewardAmount(reward.base_amount)}</td>
                      <td className="p-3 text-text-secondary">{Number(reward.reward_percent).toFixed(2)}%</td>
                      <td className="p-3 font-medium text-text">{formatRewardAmount(reward.reward_amount)}</td>
                      <td className="p-3 text-text-secondary">
                        {reward.investment_period_id ? (
                          <Link
                            href={`/periods/${reward.investment_period_id}/reporting`}
                            className="underline-offset-2 hover:text-primary hover:underline"
                          >
                            {reward.investment_period?.title || 'Unknown period'}
                          </Link>
                        ) : (
                          reward.investment_period?.title || 'Unknown period'
                        )}
                      </td>
                      <td className="p-3">
                        <span className="rounded-full bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary">
                          {reward.status}
                        </span>
                      </td>
                      <td className="p-3 text-text-secondary">
                        {new Date(reward.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="space-y-4 rounded-xl bg-bg-secondary p-6">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-700 bg-bg-tertiary p-4">
                <div className="text-sm font-medium text-text">Find user</div>
                <input
                  type="text"
                  value={treeQuery}
                  onChange={(event) => setTreeQuery(event.target.value)}
                  placeholder="Search by user ID, telegram ID, username, or name"
                  className="mt-3 w-full rounded-lg bg-bg-secondary px-3 py-2 text-sm text-text"
                />
                <div className="mt-3 max-h-72 space-y-2 overflow-auto">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUserId === user.user_id;
                    return (
                      <button
                        key={user.user_id}
                        type="button"
                        onClick={() => setSelectedUserId(user.user_id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-text'
                            : 'border-gray-700 bg-bg-secondary text-text-secondary hover:text-text'
                        }`}
                      >
                        <div className="font-medium">{getUserLabel(user)}</div>
                        <div className="mt-1 text-xs">{user.user_id}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-gray-700 bg-bg-tertiary p-4">
                <div className="text-sm font-medium text-text">Reassign referrer</div>
                <p className="mt-1 text-xs text-text-secondary">
                  This updates the current referral parent for the selected user and writes an audit record.
                </p>

                <select
                  value={reassignReferrerId}
                  onChange={(event) => setReassignReferrerId(event.target.value)}
                  className="mt-3 w-full rounded-lg bg-bg-secondary px-3 py-2 text-sm text-text"
                  disabled={!selectedUserId}
                >
                  <option value="">Clear referrer</option>
                  {users
                    .filter((user) => user.user_id !== selectedUserId)
                    .map((user) => (
                      <option key={`reassign-${user.user_id}`} value={user.user_id}>
                        {getUserLabel(user)}
                      </option>
                    ))}
                </select>

                <textarea
                  value={reassignReason}
                  onChange={(event) => setReassignReason(event.target.value)}
                  placeholder="Reason for reassignment"
                  className="mt-3 min-h-[96px] w-full rounded-lg bg-bg-secondary px-3 py-2 text-sm text-text"
                  disabled={!selectedUserId}
                />

                <button
                  type="button"
                  onClick={handleReassign}
                  disabled={!selectedUserId || reassigning}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reassigning ? 'Updating...' : 'Update Referrer'}
                </button>

                {reassignMessage ? (
                  <div className="mt-3 text-sm text-text-secondary">{reassignMessage}</div>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-gray-700 bg-bg-tertiary p-4">
              <div className="text-sm font-medium text-text">Referral Tree</div>
              <p className="mt-1 text-xs text-text-secondary">
                Current inviter relationships for the selected user.
              </p>

              {loadingTree ? (
                <div className="mt-4 rounded-lg border border-gray-700 bg-bg-secondary p-4 text-sm text-text-secondary">
                  Loading tree...
                </div>
              ) : null}

              {!loadingTree && treeError ? (
                <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
                  {treeError}
                </div>
              ) : null}

              {!loadingTree && !treeError && !tree ? (
                <div className="mt-4 rounded-lg border border-gray-700 bg-bg-secondary p-4 text-sm text-text-secondary">
                  Select a user to inspect the current referral tree.
                </div>
              ) : null}

              {!loadingTree && !treeError && tree ? (
                <div className="mt-4 space-y-4">
                  {treeSections.map((section) => (
                    <div key={section.title} className="rounded-lg border border-gray-700 bg-bg-secondary p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        {section.title}
                      </div>
                      <div className="mt-3 space-y-2">
                        {section.items.length === 0 ? (
                          <div className="text-sm text-text-secondary">No users in this section.</div>
                        ) : (
                          section.items.map((item: ReferralTreeNode) => (
                            <div key={item.user_id} className="rounded-lg border border-gray-700 px-3 py-2">
                              <div className="font-medium text-text">{getUserLabel(item)}</div>
                              <div className="mt-1 text-xs text-text-secondary">
                                {item.user_id}{TREE_NODE_SEPARATOR}{item.referral_code}{TREE_NODE_SEPARATOR}{item.team_status}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
