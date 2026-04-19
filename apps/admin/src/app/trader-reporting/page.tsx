'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getAdminPeriods,
  getCanonicalPeriodTraderReporting,
} from '../../lib/api';
import {
  buildTraderReportStatusSummary,
  filterPeriodsForTraderReporting,
} from '../../lib/trader-reporting-registry.js';
import { StatusBadge } from '../../components/status-badge';

const PERIOD_FILTERS = ['ALL', 'ACTIVE', 'LOCKED', 'COMPLETED', 'ARCHIVED'];

function formatDateRange(period: any) {
  return `${new Date(period.start_date).toLocaleDateString()} - ${new Date(period.end_date).toLocaleDateString()}`;
}

export default function TraderReportingRegistryPage() {
  const searchParams = useSearchParams();
  const [periods, setPeriods] = useState<any[]>([]);
  const [reporting, setReporting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodStatusFilter, setPeriodStatusFilter] = useState('ALL');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedTraderId, setSelectedTraderId] = useState('');

  const visiblePeriods = useMemo(() => {
    const reportablePeriods = filterPeriodsForTraderReporting(periods);
    if (periodStatusFilter === 'ALL') {
      return reportablePeriods;
    }

    return reportablePeriods.filter((period: any) => period.status === periodStatusFilter);
  }, [periodStatusFilter, periods]);

  const selectedPeriod = useMemo(
    () => visiblePeriods.find((period: any) => period.investment_period_id === selectedPeriodId) || null,
    [selectedPeriodId, visiblePeriods],
  );

  const summary = useMemo(() => buildTraderReportStatusSummary(reporting?.traders || []), [reporting]);
  const selectedTrader = useMemo(
    () => reporting?.traders?.find((trader: any) => trader.trader_id === selectedTraderId) || null,
    [reporting, selectedTraderId],
  );

  useEffect(() => {
    getAdminPeriods()
      .then((items) => {
        const reportablePeriods = filterPeriodsForTraderReporting(items);
        const requestedPeriodId = searchParams.get('periodId');
        const initialPeriodId = reportablePeriods.some((period: any) => period.investment_period_id === requestedPeriodId)
          ? requestedPeriodId
          : reportablePeriods[0]?.investment_period_id || '';

        setPeriods(items);
        setSelectedPeriodId(initialPeriodId);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchParams]);

  useEffect(() => {
    if (!selectedPeriodId) {
      setReporting(null);
      setSelectedTraderId('');
      return;
    }

    setPeriodLoading(true);
    getCanonicalPeriodTraderReporting(selectedPeriodId)
      .then((nextReporting) => {
        setReporting(nextReporting);
        setSelectedTraderId((current: string) => {
          if (nextReporting?.traders?.some((trader: any) => trader.trader_id === current)) {
            return current;
          }

          return nextReporting?.traders?.[0]?.trader_id || '';
        });
      })
      .catch((error) => {
        console.error(error);
        setReporting(null);
        setSelectedTraderId('');
      })
      .finally(() => setPeriodLoading(false));
  }, [selectedPeriodId]);

  useEffect(() => {
    if (!visiblePeriods.some((period: any) => period.investment_period_id === selectedPeriodId)) {
      setSelectedPeriodId(visiblePeriods[0]?.investment_period_id || '');
    }
  }, [selectedPeriodId, visiblePeriods]);

  if (loading) {
    return <div className="text-text-secondary">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trader Reporting</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review trader-level reports by investment period, prepare drafts early, and jump into any trader workflow from one place.
          </p>
        </div>
        <select
          value={periodStatusFilter}
          onChange={(e) => setPeriodStatusFilter(e.target.value)}
          className="rounded-lg bg-bg-secondary px-3 py-2 text-sm text-text"
        >
          {PERIOD_FILTERS.map((status) => (
            <option key={status} value={status}>
              {status === 'ALL' ? 'All Reportable Periods' : `${status} Periods`}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px,1fr]">
        <aside className="space-y-4">
          <div className="rounded-lg bg-bg-secondary p-4">
            <h2 className="mb-3 font-semibold">Periods</h2>
            <div className="space-y-3">
              {visiblePeriods.map((period: any) => (
                <button
                  key={period.investment_period_id}
                  onClick={() => setSelectedPeriodId(period.investment_period_id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    period.investment_period_id === selectedPeriodId
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{period.title}</div>
                      <div className="mt-1 text-xs text-text-secondary">{formatDateRange(period)}</div>
                    </div>
                    <span className="rounded bg-bg-tertiary px-2 py-1 text-[11px] text-text-secondary">
                      {period.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {visiblePeriods.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-700 px-4 py-6 text-sm text-text-secondary">
                No reportable periods match the selected filter.
              </div>
            )}
          </div>
        </aside>

        <section className="space-y-6">
          {selectedPeriod ? (
            <>
              <div className="rounded-lg bg-bg-secondary p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-text-secondary">Selected Period</div>
                    <h2 className="mt-1 text-xl font-semibold">{selectedPeriod.title}</h2>
                    <p className="mt-1 text-sm text-text-secondary">{formatDateRange(selectedPeriod)}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${reporting?.readiness?.ready ? 'text-success' : 'text-warning'}`}>
                      {reporting?.readiness?.ready ? 'Ready to complete settlement' : 'Settlement still in progress'}
                    </div>
                    {!!reporting?.readiness?.blockers?.length && (
                      <div className="mt-1 text-xs text-text-secondary">
                        {reporting.readiness.blockers.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                  <div className="rounded-lg bg-bg-tertiary px-3 py-3">
                    <div className="text-xs text-text-secondary">Total Traders</div>
                    <div className="mt-1 text-lg font-semibold">{summary.total}</div>
                  </div>
                  <div className="rounded-lg bg-bg-tertiary px-3 py-3">
                    <div className="text-xs text-text-secondary">Missing</div>
                    <div className="mt-1 text-lg font-semibold">{summary.missing}</div>
                  </div>
                  <div className="rounded-lg bg-bg-tertiary px-3 py-3">
                    <div className="text-xs text-text-secondary">Draft</div>
                    <div className="mt-1 text-lg font-semibold">{summary.draft}</div>
                  </div>
                  <div className="rounded-lg bg-bg-tertiary px-3 py-3">
                    <div className="text-xs text-text-secondary">Pending Approval</div>
                    <div className="mt-1 text-lg font-semibold">{summary.pendingApproval}</div>
                  </div>
                  <div className="rounded-lg bg-bg-tertiary px-3 py-3">
                    <div className="text-xs text-text-secondary">Approved</div>
                    <div className="mt-1 text-lg font-semibold">{summary.approved}</div>
                  </div>
                  <div className="rounded-lg bg-bg-tertiary px-3 py-3">
                    <div className="text-xs text-text-secondary">Published</div>
                    <div className="mt-1 text-lg font-semibold">{summary.published}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
                <div className="rounded-lg bg-bg-secondary overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                    <h3 className="font-semibold">Traders</h3>
                    <Link
                      href={`/periods/${selectedPeriod.investment_period_id}/reporting`}
                      className="text-sm text-primary hover:underline"
                    >
                      Open classic reporting view
                    </Link>
                  </div>

                  {periodLoading ? (
                    <div className="p-6 text-sm text-text-secondary">Loading trader reporting...</div>
                  ) : !reporting?.traders?.length ? (
                    <div className="p-6 text-sm text-text-secondary">
                      No traders with reportable cycles were found for this period.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-700">
                      {reporting.traders.map((trader: any) => (
                        <button
                          key={trader.trader_id}
                          type="button"
                          onClick={() => setSelectedTraderId(trader.trader_id)}
                          className={`w-full px-4 py-4 text-left transition ${
                            trader.trader_id === selectedTraderId ? 'bg-bg-tertiary' : 'hover:bg-bg-tertiary/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{trader.trader_display_name || trader.trader_nickname}</div>
                              <div className="mt-1 text-xs text-text-secondary">@{trader.trader_slug}</div>
                            </div>
                            <StatusBadge status={trader.report_status} />
                          </div>
                          <div className="mt-3 flex items-center gap-3 text-xs text-text-secondary">
                            <span>{trader.totals.deposits_count} cycles</span>
                            <span>{trader.totals.confirmed_amount_usdt ?? 0} USDT</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-bg-secondary overflow-hidden">
                  <div className="border-b border-gray-700 px-4 py-3">
                    <h3 className="font-semibold">
                      {selectedTrader ? `Cycles for ${selectedTrader.trader_display_name || selectedTrader.trader_nickname}` : 'Cycles'}
                    </h3>
                  </div>

                  {periodLoading ? (
                    <div className="p-6 text-sm text-text-secondary">Loading trader cycles...</div>
                  ) : !selectedTrader ? (
                    <div className="p-6 text-sm text-text-secondary">
                      Select a trader to inspect user cycles included in this reporting period.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-bg-tertiary text-text-secondary">
                        <tr>
                          <th className="p-3 text-left">User</th>
                          <th className="p-3 text-left">Status</th>
                          <th className="p-3 text-left">Amount</th>
                          <th className="p-3 text-left">Settlement</th>
                          <th className="p-3 text-left">Routing</th>
                          <th className="p-3 text-left">Referral</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTrader?.deposits?.map((deposit: any) => (
                          <tr key={deposit.deposit_id} className="border-t border-gray-700">
                            <td className="p-3">
                              <div className="font-medium">{deposit.user_display_name || deposit.username || deposit.user_id}</div>
                              <div className="mt-1 text-xs text-text-secondary">{deposit.network} / {deposit.asset_symbol}</div>
                            </td>
                            <td className="p-3 text-text-secondary">{deposit.status}</td>
                            <td className="p-3 text-text-secondary">{deposit.confirmed_amount ?? '-'} USDT</td>
                            <td className="p-3 text-text-secondary">{deposit.settlement_preference || '-'}</td>
                            <td className="p-3 text-text-secondary">{deposit.return_address_display || deposit.source_address_display || '-'}</td>
                            <td className="p-3 text-text-secondary">
                              {deposit.referral ? (
                                <span>
                                  {deposit.referral.reward_amount_usdt ?? 0} USDT
                                  {deposit.referral.source === 'TEAM_DERIVED' ? ' · Team derived' : ''}
                                </span>
                              ) : (
                                'No referral payout'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-bg-secondary p-8 text-text-secondary">
              Select a period to review its trader reporting workflow.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
