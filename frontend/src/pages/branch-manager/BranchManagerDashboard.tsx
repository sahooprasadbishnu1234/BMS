import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { TellerSession, BankAccount, ApprovalRequest, LoanApplication } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { formatCurrency } from '../../utils/currency';
import {
  Building,
  IndianRupee,
  Wallet,
  CheckCircle,
  CheckSquare,
  BadgePercent,
  AlertCircle,
  XCircle,
  Scale,
  Sparkles,
} from 'lucide-react';

export const BranchManagerDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes('/approvals')) return 'approvals';
    if (p.includes('/teller-reconciliation')) return 'reconciliation';
    if (p.includes('/accounts')) return 'accounts';
    if (p.includes('/loans')) return 'loans';
    return 'overview';
  };

  const activeTab = getActiveTab();

  // State
  const [sessions, setSessions] = useState<TellerSession[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Approval Review Modal State
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Status Action Message
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Account Status Modal State
  const [selectedAccountForStatus, setSelectedAccountForStatus] = useState<BankAccount | null>(null);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'FROZEN' | 'CLOSED'>('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sessRes, accRes, appRes, loanRes] = await Promise.all([
        api.get('/reconciliation/sessions').catch(() => ({ data: [] })),
        api.get('/accounts').catch(() => ({ data: [] })),
        api.get('/approvals/pending').catch(() => ({ data: [] })),
        api.get('/loans/applications').catch(() => ({ data: [] })),
      ]);
      setSessions(sessRes.data);
      setAccounts(accRes.data);
      setApprovals(appRes.data);
      setLoans(loanRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Approve / Reject Maker-Checker
  const handleApprovalAction = async (action: 'approve' | 'reject') => {
    if (!selectedApproval) return;
    setIsSubmittingApproval(true);
    setActionMessage(null);
    try {
      await api.post(`/approvals/${selectedApproval.id}/${action}`, {
        reviewNotes: reviewNotes || (action === 'approve' ? 'Approved by Branch Manager' : 'Rejected per policy'),
      });
      setSelectedApproval(null);
      setReviewNotes('');
      loadData();
    } catch (err: any) {
      setActionMessage(err.response?.data?.message || `Failed to ${action} request.`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Sign off Cash Reconciliation
  const handleApproveReconciliation = async (sessionId: string) => {
    try {
      await api.post(`/reconciliation/${sessionId}/approve`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve cash reconciliation.');
    }
  };

  // Loan Actions: Approve & Disburse
  const handleApproveLoan = async (appId: string) => {
    try {
      await api.post(`/loans/applications/${appId}/approve`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Loan approval failed.');
    }
  };

  const handleDisburseLoan = async (appId: string) => {
    try {
      await api.post(`/loans/applications/${appId}/disburse`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Loan disbursement failed.');
    }
  };

  // Alter Account Status
  const handleUpdateAccountStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForStatus) return;
    setIsSubmittingStatus(true);
    try {
      await api.patch(`/accounts/${selectedAccountForStatus.id}/status`, {
        status: newStatus,
        reason: statusReason || 'Status altered by Branch Manager',
      });
      setSelectedAccountForStatus(null);
      setStatusReason('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update account status.');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const branchLiquidity = accounts.reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Branch Operations & Oversight</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              Branch Manager
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cash drawer shift balancing, Maker-Checker authorization, branch credit facilities, and account portfolio
          </p>
        </div>
      </div>



      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Branch Liquid Balances"
          value={formatCurrency(branchLiquidity)}
          subtitle="Domiciled Customer Portfolio"
          icon={IndianRupee}
        />
        <StatCard
          title="Branch Deposit Accounts"
          value={accounts.length}
          subtitle="Checking & Savings Facilities"
          icon={Wallet}
        />
        <StatCard
          title="Teller Shifts Monitored"
          value={sessions.length}
          subtitle="Cash Drawers Monitored"
          icon={Building}
        />
        <StatCard
          title="Maker-Checker Queue"
          value={approvals.length}
          subtitle="Dual Control Actions"
          icon={CheckSquare}
          trend={approvals.length > 0 ? 'Requires Action' : 'Cleared'}
          trendPositive={approvals.length === 0}
        />
      </div>

      {/* VIEW 1: BRANCH OPERATIONS OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Teller Sessions */}
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Today's Cash Drawer Shifts
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigate('/teller-reconciliation')}>
                Manage Reconciliation
              </Button>
            </div>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Teller</th>
                    <th className="pb-3 font-semibold">Opening Cash</th>
                    <th className="pb-3 font-semibold">Expected Cash</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Sign-Off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sessions.slice(0, 3).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-850/50">
                      <td className="py-3 font-bold text-slate-200">
                        {s.teller?.user.firstName} {s.teller?.user.lastName}
                      </td>
                      <td className="py-3 font-mono">{formatCurrency(s.openingCash)}</td>
                      <td className="py-3 font-mono font-bold text-slate-100">
                        {formatCurrency(s.expectedCash)}
                      </td>
                      <td className="py-3"><Badge status={s.status} /></td>
                      <td className="py-3 text-right">
                        {s.status === 'CLOSED' ? (
                          <Button variant="primary" size="sm" onClick={() => handleApproveReconciliation(s.id)}>
                            Sign-off
                          </Button>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">{s.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Domiciled Accounts Summary */}
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Branch Domiciled Accounts Portfolio
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigate('/accounts')}>
                View All
              </Button>
            </div>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Account Number</th>
                    <th className="pb-3 font-semibold">Customer</th>
                    <th className="pb-3 font-semibold">Facility</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {accounts.slice(0, 4).map((a) => (
                    <tr key={a.id} className="hover:bg-slate-850/50">
                      <td className="py-3 font-mono font-bold text-slate-200">{a.accountNumber}</td>
                      <td className="py-3 text-slate-300">
                        {a.customer?.user.firstName} {a.customer?.user.lastName}
                      </td>
                      <td className="py-3 font-semibold text-slate-400">{a.accountType}</td>
                      <td className="py-3"><Badge status={a.status} /></td>
                      <td className="py-3 font-mono font-bold text-emerald-400 text-right">
                        {formatCurrency(a.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: PENDING APPROVALS */}
      {activeTab === 'approvals' && (
        <Card>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
                <span>Branch Dual-Control Maker-Checker Queue</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Secondary executive sign-off for branch-initiated high-value movements and overrides
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              {approvals.length} Pending
            </span>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Action</th>
                  <th className="pb-3 font-semibold">Value</th>
                  <th className="pb-3 font-semibold">Initiator (Maker)</th>
                  <th className="pb-3 font-semibold">Reason</th>
                  <th className="pb-3 font-semibold text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {approvals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      <CheckCircle className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                      No pending approvals in queue.
                    </td>
                  </tr>
                ) : (
                  approvals.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-850/50">
                      <td className="py-3 font-bold text-slate-200">{app.action.replace(/_/g, ' ')}</td>
                      <td className="py-3 font-mono font-bold text-emerald-400">
                        {formatCurrency(app.monetaryValue)}
                      </td>
                      <td className="py-3 text-slate-300">
                        {app.maker?.firstName} {app.maker?.lastName}
                      </td>
                      <td className="py-3 text-slate-400 max-w-xs truncate">{app.reason}</td>
                      <td className="py-3 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedApproval(app);
                            setReviewNotes('');
                            setActionMessage(null);
                          }}
                        >
                          Review & Authorize
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 3: CASH RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <Card>
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary-400" />
              <span>Teller Shifts & End-of-Day Cash Balancing</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Verify teller cash counts, inspect drawer variance discrepancies, and provide management sign-off
            </p>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Teller Name</th>
                  <th className="pb-3 font-semibold">Opening Cash</th>
                  <th className="pb-3 font-semibold">Expected Cash</th>
                  <th className="pb-3 font-semibold">Closing Count</th>
                  <th className="pb-3 font-semibold">Cash Variance</th>
                  <th className="pb-3 font-semibold">Shift Status</th>
                  <th className="pb-3 font-semibold text-right">Manager Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-850/50">
                    <td className="py-3 font-bold text-slate-200">
                      {s.teller?.user.firstName} {s.teller?.user.lastName}
                    </td>
                    <td className="py-3 font-mono">{formatCurrency(s.openingCash)}</td>
                    <td className="py-3 font-mono font-bold text-slate-100">
                      {formatCurrency(s.expectedCash)}
                    </td>
                    <td className="py-3 font-mono">
                      {s.closingCash ? formatCurrency(s.closingCash) : 'Active Shift'}
                    </td>
                    <td className="py-3 font-mono">
                      {s.cashDifference ? (
                        <span className={parseFloat(s.cashDifference) === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {formatCurrency(s.cashDifference)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3"><Badge status={s.status} /></td>
                    <td className="py-3 text-right">
                      {s.status === 'CLOSED' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApproveReconciliation(s.id)}
                        >
                          Sign-Off Reconcile
                        </Button>
                      ) : s.status === 'RECONCILED' ? (
                        <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Reconciled
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Shift Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 4: BRANCH ACCOUNTS */}
      {activeTab === 'accounts' && (
        <Card>
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary-400" />
              <span>Branch Depository Accounts</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Customer accounts assigned to this branch location
            </p>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Account Number</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Facility</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Liquid Balance</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-850/50">
                    <td className="py-3 font-mono font-bold text-slate-200">{a.accountNumber}</td>
                    <td className="py-3 text-slate-200">
                      {a.customer?.user.firstName} {a.customer?.user.lastName}
                    </td>
                    <td className="py-3 text-slate-400 font-semibold">{a.accountType}</td>
                    <td className="py-3"><Badge status={a.status} /></td>
                    <td className="py-3 font-mono font-bold text-emerald-400 text-right">
                      {formatCurrency(a.balance)}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccountForStatus(a);
                          setNewStatus(a.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE');
                          setStatusReason('');
                        }}
                      >
                        Alter Status
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 5: BRANCH LOANS QUEUE */}
      {activeTab === 'loans' && (
        <Card>
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <BadgePercent className="w-5 h-5 text-primary-400" />
              <span>Branch Credit Facilities & Loan Approvals</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Final loan authorization and automated disbursement to customer checking/savings accounts
            </p>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">App Number</th>
                  <th className="pb-3 font-semibold">Applicant</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Credit Score</th>
                  <th className="pb-3 font-semibold">Officer Recommendation</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Manager Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No loan applications submitted to this branch.
                    </td>
                  </tr>
                ) : (
                  loans.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-850/50">
                      <td className="py-3 font-mono font-bold text-slate-200">{l.applicationNumber}</td>
                      <td className="py-3 text-slate-300">
                        {l.customer?.user.firstName} {l.customer?.user.lastName}
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-400">
                        {formatCurrency(l.requestedAmount)}
                      </td>
                      <td className="py-3 font-mono">
                        {l.creditScore ? (
                          <span className={l.creditScore >= 700 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                            {l.creditScore}
                          </span>
                        ) : (
                          'Pending Score'
                        )}
                      </td>
                      <td className="py-3 text-slate-400 max-w-xs truncate">{l.recommendationNotes || '—'}</td>
                      <td className="py-3"><Badge status={l.status} /></td>
                      <td className="py-3 text-right">
                        {(l.status === 'RECOMMENDED' || l.status === 'UNDER_REVIEW') && (
                          <Button variant="primary" size="sm" onClick={() => handleApproveLoan(l.id)}>
                            Approve Loan
                          </Button>
                        )}
                        {l.status === 'APPROVED' && (
                          <Button variant="primary" size="sm" onClick={() => handleDisburseLoan(l.id)}>
                            Disburse Funds
                          </Button>
                        )}
                        {l.status === 'DISBURSED' && (
                          <span className="text-emerald-400 font-semibold text-xs">Active Facility</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* APPROVAL MODAL */}
      {selectedApproval && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedApproval(null)}
          title={`Maker-Checker Sign-off: ${selectedApproval.action.replace(/_/g, ' ')}`}
        >
          <div className="space-y-4">
            {actionMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {actionMessage}
              </div>
            )}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div><span className="text-slate-400">Initiator: </span><span className="font-bold text-slate-200">{selectedApproval.maker?.firstName} {selectedApproval.maker?.lastName}</span></div>
              <div><span className="text-slate-400">Value: </span><span className="font-mono font-bold text-emerald-400">{formatCurrency(selectedApproval.monetaryValue)}</span></div>
              <div><span className="text-slate-400">Reason: </span><span className="text-slate-300">{selectedApproval.reason}</span></div>
            </div>

            <Input
              label="Manager Review Notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g. Approved per branch delegation authority."
              required
            />

            <div className="pt-2 flex justify-end gap-2.5">
              <Button
                variant="danger"
                size="md"
                onClick={() => handleApprovalAction('reject')}
                isLoading={isSubmittingApproval}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleApprovalAction('approve')}
                isLoading={isSubmittingApproval}
              >
                Approve & Execute
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ALTER STATUS MODAL */}
      {selectedAccountForStatus && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAccountForStatus(null)}
          title={`Alter Branch Account Status: ${selectedAccountForStatus.accountNumber}`}
        >
          <form onSubmit={handleUpdateAccountStatus} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">New Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="FROZEN">FROZEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <Input
              label="Reason for status update"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="e.g. Branch operational hold"
              required
            />

            <div className="pt-2 flex justify-end gap-2.5">
              <Button type="button" variant="outline" size="md" onClick={() => setSelectedAccountForStatus(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSubmittingStatus}>
                Update Status
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default BranchManagerDashboard;
