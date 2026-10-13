import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { ApprovalRequest } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  Activity,
  CheckSquare,
  Building,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react';

export const BankManagerDashboard: React.FC = () => {
  const [summary, setSummary] = useState<any | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [sumRes, appRes, branchRes] = await Promise.all([
        api.get('/reports/summary'),
        api.get('/approvals/pending'),
        api.get('/reports/branches'),
      ]);
      setSummary(sumRes.data);
      setApprovals(appRes.data);
      setBranches(branchRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedApproval) return;
    setIsSubmitting(true);
    setActionStatus(null);
    try {
      await api.post(`/approvals/${selectedApproval.id}/${action}`, {
        reviewNotes: reviewNotes || (action === 'approve' ? 'Authorized by Bank Manager' : 'Declined per executive policy'),
      });
      setSelectedApproval(null);
      setReviewNotes('');
      loadData();
    } catch (err: any) {
      setActionStatus(err.response?.data?.message || `Failed to ${action} request.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
          Executive Banking Operations & Approvals
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          High-level liquidity oversight, dual-control Maker-Checker queue, and branch network metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Liquidity"
          value={`$${summary ? parseFloat(summary.totalDepositedLiquidity).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}`}
          subtitle="Customer Balance Sheet Liability"
          icon={DollarSign}
        />
        <StatCard
          title="Pending Approvals"
          value={approvals.length}
          subtitle="Dual-Control Maker-Checker"
          icon={CheckSquare}
          trend={approvals.length > 0 ? 'Action Required' : 'All Clear'}
          trendPositive={approvals.length === 0}
        />
        <StatCard
          title="Active Deposit Accounts"
          value={summary?.totalAccounts || 0}
          subtitle="Bank-Wide Network"
          icon={Building}
        />
        <StatCard
          title="Open Compliance Cases"
          value={summary?.openComplianceCases || 0}
          subtitle="AML & CTR Flagged"
          icon={AlertCircle}
        />
      </div>

      {/* Dual Control Approval Queue */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Dual-Control Maker-Checker Pending Queue
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              High-value transactions and exceptions requiring secondary executive authorization
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            {approvals.length} Pending Actions
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Action Required</th>
                <th className="pb-3 font-semibold">Monetary Value</th>
                <th className="pb-3 font-semibold">Maker (Initiator)</th>
                <th className="pb-3 font-semibold">Reason</th>
                <th className="pb-3 font-semibold">Submitted</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <CheckCircle className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                    No pending approval requests in the Maker-Checker queue.
                  </td>
                </tr>
              ) : (
                approvals.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 font-bold text-slate-200">
                      {app.action.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 font-mono font-bold text-emerald-400 text-sm">
                      ${parseFloat(app.monetaryValue || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-slate-300">
                      {app.maker?.firstName} {app.maker?.lastName}
                      <span className="text-[10px] text-slate-500 block">{app.maker?.email}</span>
                    </td>
                    <td className="py-3 text-slate-400 max-w-xs truncate">
                      {app.reason}
                    </td>
                    <td className="py-3 text-slate-400">
                      {new Date(app.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedApproval(app);
                          setReviewNotes('');
                          setActionStatus(null);
                        }}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Branch Liquidity Table */}
      <Card>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 pb-3 border-b border-slate-800">
          Commercial Branch Network Performance
        </h3>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Code</th>
                <th className="pb-3 font-semibold">Branch Name</th>
                <th className="pb-3 font-semibold">City</th>
                <th className="pb-3 font-semibold">Accounts</th>
                <th className="pb-3 font-semibold">Staff Count</th>
                <th className="pb-3 font-semibold text-right">Total Liquidity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {branches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-850/50">
                  <td className="py-3 font-mono font-bold text-primary-400">{b.code}</td>
                  <td className="py-3 font-semibold text-slate-200">{b.name}</td>
                  <td className="py-3 text-slate-400">{b.city}</td>
                  <td className="py-3 font-mono">{b.accountsCount}</td>
                  <td className="py-3 font-mono">{b.employeesCount}</td>
                  <td className="py-3 font-mono font-bold text-right text-emerald-400">
                    ${parseFloat(b.totalLiquidity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Modal */}
      {selectedApproval && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedApproval(null)}
          title={`Dual-Control Authorization: ${selectedApproval.action.replace(/_/g, ' ')}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {actionStatus && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionStatus}</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Initiating Maker:</span>
                <span className="font-bold text-slate-200">{selectedApproval.maker?.firstName} {selectedApproval.maker?.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Monetary Amount:</span>
                <span className="font-mono font-extrabold text-emerald-400 text-sm">
                  ${parseFloat(selectedApproval.monetaryValue || '0').toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reason / Justification:</span>
                <span className="text-slate-300 max-w-xs text-right">{selectedApproval.reason}</span>
              </div>
            </div>

            <Input
              label="Checker Review Notes / Compliance Verification"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g. Verified customer KYC and identity documents per policy."
              required
            />

            <div className="pt-3 flex justify-end gap-3">
              <Button
                variant="danger"
                size="md"
                onClick={() => handleAction('reject')}
                isLoading={isSubmitting}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject Operation
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleAction('approve')}
                isLoading={isSubmitting}
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Approve & Execute Atomically
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
