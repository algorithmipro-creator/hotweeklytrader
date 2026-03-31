'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getReportByDeposit } from '../../../lib/api';

export default function ReportPage() {
  const params = useParams();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.depositId) {
      getReportByDeposit(params.depositId as string)
        .then(setReport)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.depositId]);

  if (loading) return <div className="p-4 text-text-secondary">Loading...</div>;
  if (!report) return <div className="p-4 text-text-secondary">No report available yet.</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Trading Report</h1>

      <div className="bg-bg-secondary rounded-lg p-4 mb-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-text-secondary">Initial Deposit</span>
            <span className="font-medium">{report.payout_amount - report.net_result}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Gross Result</span>
            <span className={`font-medium ${report.gross_result >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {report.gross_result >= 0 ? '+' : ''}{report.gross_result}
            </span>
          </div>
          {report.fee_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Fees</span>
              <span className="text-red-400">-{report.fee_amount}</span>
            </div>
          )}
          <div className="border-t border-gray-700 pt-3 flex justify-between">
            <span className="font-medium">Net Result</span>
            <span className={`font-bold ${report.net_result >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {report.net_result >= 0 ? '+' : ''}{report.net_result}
            </span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-bold">Payout Amount</span>
            <span className="font-bold text-primary">{report.payout_amount}</span>
          </div>
        </div>
      </div>

      <div className="text-text-secondary text-xs space-y-1">
        <div>Status: {report.status}</div>
        <div>Generated: {new Date(report.generated_at).toLocaleString()}</div>
        {report.approved_at && <div>Approved: {new Date(report.approved_at).toLocaleString()}</div>}
        {report.published_at && <div>Published: {new Date(report.published_at).toLocaleString()}</div>}
      </div>

      <Link href="/deposits" className="block text-center text-primary mt-6">
        &larr; Back to Deposits
      </Link>
    </div>
  );
}
