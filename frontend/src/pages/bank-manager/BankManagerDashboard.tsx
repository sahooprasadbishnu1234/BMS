import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ApprovalRequest, BankAccount, AuditLog } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { formatCurrency } from '../../utils/currency';
import {
  Activity,
  CheckSquare,
  Building,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  XCircle,
  History,
  Wallet,
  Search,
  Lock,
  Unlock,
  ShieldAlert,
} from 'lucide-react';

export const BankManagerDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes('/approvals')) return 'approvals';
    if (p.includes('/accounts')) return 'accounts';
    if (p.includes('/branches')) return 'branches';
    if (p.includes('/audit')) return 'audit';
    return 'overview';
  };

  const activeTab = getActiveTab();

  // State
  const [summary, setSummary] = useState<any | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [accountSearch, setAccountSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // Review Modal State
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  // Account Status Modal State
  const [selectedAccountForStatus, setSelectedAccountForStatus] = useState<BankAccount | null>(null);
  const [newAccountStatus, setNewAccountStatus] = useState<'ACTIVE' | 'FROZEN' | 'CLOSED'>('ACTIVE');
  const [accountStatusReason, setAccountStatusReason] = useState('');
  const [isSubmittingAccountStatus, setIsSubmittingAccountStatus] = useState(false);

  // Metadata Modal State
  const [selectedMetadata, setSelectedMetadata] = useState<any | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, appRes, branchRes, accRes, auditRes] = await Promise.all([
        api.get('/reports/summary').catch(() => ({ data: null })),
        api.get('/approvals/pending').catch(() => ({ data: [] })),
        api.get('/reports/branches').catch(() => ({ data: [] })),
        api.get('/accounts').catch(() => ({ data: [] })),
        api.get('/audit-logs').catch(() => ({ data: [] })),
      ]);
      setSummary(sumRes.data);
      setApprovals(appRes.data);
      setBranches(branchRes.data);
      setAccounts(accRes.data);
      setAuditLogs(auditRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedApproval) return;
    setIsSubmittingApproval(true);
    setActionStatus(null);
    try {
      await api.post(`/approvals/${selectedApproval.id}/${action}`, {
        reviewNotes: reviewNotes || (action === 'approve' ? 'Authorized by Bank Manager' : 'Declined per policy'),
      });
      setSelectedApproval(null);
      setReviewNotes('');
      loadData();
    } catch (err: any) {
      setActionStatus(err.response?.data?.message || `Failed to ${action} request.`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleUpdateAccountStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForStatus) return;
    setIsSubmittingAccountStatus(true);
    try {
      await api.patch(`/accounts/${selectedAccountForStatus.id}/status`, {
        status: newAccountStatus,
        reason: accountStatusReason || 'Status altered by Bank Manager',
      });
      setSelectedAccountForStatus(null);
      setAccountStatusReason('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update account status.');
    } finally {
      setIsSubmittingAccountStatus(false);
    }
  };

  const filteredAccounts = accounts.filter(
    (a) =>
      a.accountNumber.toLowerCase().includes(accountSearch.toLowerCase()) ||
      a.customer?.user?.firstName.toLowerCase().includes(accountSearch.toLowerCase()) ||
      a.customer?.user?.lastName.toLowerCase().includes(accountSearch.toLowerCase()),
  );

  const filteredAuditLogs = auditLogs.filter((log) =>
    auditActionFilter ? log.action.toLowerCase().includes(auditActionFilter.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Executive Operations & Governance</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              HQ Bank Manager
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Institutional liquidity, high-value Maker-Checker dual control, commercial branch oversight, and forensic auditing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate('/approvals')}>
            <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
            Maker-Checker Queue ({approvals.length})
          </Button>
        </div>
      </div>



      {/* KPI Cards (Always visible on Overview) */}
      {(activeTab === 'overview' || activeTab === 'approvals') && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard
            title="Total Depository Liquidity"
            value={formatCurrency(summary?.totalDepositedLiquidity)}
            subtitle="Customer Balance Sheet Liability"
            icon={IndianRupee}
          />
          <StatCard
            title="Pending Maker-Checker"
            value={approvals.length}
            subtitle="Secondary Authorization Required"
            icon={CheckSquare}
            trend={approvals.length > 0 ? 'Action Required' : 'All Clear'}
            trendPositive={approvals.length === 0}
          />
          <StatCard
            title="Active Accounts"
            value={summary?.totalAccounts || accounts.length}
            subtitle="Bank-Wide Commercial Network"
            icon={Building}
          />
          <StatCard
            title="Open AML / CTR Cases"
            value={summary?.openComplianceCases || 0}
            subtitle="Flagged by Risk Engine"
            icon={AlertCircle}
          />
        </div>
      )}

      {/* VIEW 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Maker-Checker Quick Queue */}
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Maker-Checker Urgent Approvals
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigate('/approvals')}>
                View Full Queue
              </Button>
            </div>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Action</th>
                    <th className="pb-3 font-semibold">Value</th>
                    <th className="pb-3 font-semibold">Initiator (Maker)</th>
                    <th className="pb-3 font-semibold">Reason</th>
                    <th className="pb-3 font-semibold text-right">Authorize</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {approvals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        <CheckCircle className="w-6 h-6 text-emerald-500/40 mx-auto mb-1" />
                        All approval requests have been processed.
                      </td>
                    </tr>
                  ) : (
                    approvals.slice(0, 3).map((app) => (
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

          {/* Branch Network Performance Summary */}
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Commercial Branch Network Performance
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigate('/branches')}>
                View Details
              </Button>
            </div>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Code</th>
                    <th className="pb-3 font-semibold">Branch Name</th>
                    <th className="pb-3 font-semibold">City</th>
                    <th className="pb-3 font-semibold">Accounts</th>
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
                      <td className="py-3 font-mono font-bold text-right text-emerald-400">
                        {formatCurrency(b.totalLiquidity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: PENDING APPROVALS QUEUE */}
      {activeTab === 'approvals' && (
        <Card>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
                <span>Dual-Control Maker-Checker Approval Docket</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enforcing strict separation of duties. Checker must be distinct from Maker.
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
                  <th className="pb-3 font-semibold">Action Required</th>
                  <th className="pb-3 font-semibold">Monetary Value</th>
                  <th className="pb-3 font-semibold">Initiator (Maker)</th>
                  <th className="pb-3 font-semibold">Reason</th>
                  <th className="pb-3 font-semibold">Submitted</th>
                  <th className="pb-3 font-semibold text-right">Checker Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {approvals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <CheckCircle className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
                      No pending approval tickets in the Maker-Checker queue.
                    </td>
                  </tr>
                ) : (
                  approvals.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 font-bold text-slate-200">{app.action.replace(/_/g, ' ')}</td>
                      <td className="py-3 font-mono font-bold text-emerald-400 text-sm">
                        {formatCurrency(app.monetaryValue)}
                      </td>
                      <td className="py-3 text-slate-300">
                        {app.maker?.firstName} {app.maker?.lastName}
                        <span className="text-[10px] text-slate-500 block font-mono">{app.maker?.email}</span>
                      </td>
                      <td className="py-3 text-slate-400 max-w-xs truncate">{app.reason}</td>
                      <td className="py-3 text-slate-400">{new Date(app.createdAt).toLocaleTimeString()}</td>
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

      {/* VIEW 3: ALL BANK ACCOUNTS */}
      {activeTab === 'accounts' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary-400" />
                <span>All Customer Bank Accounts (Network-Wide)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Overview of depository facilities across all commercial branches with administrative status control
              </p>
            </div>
            <div className="w-72">
              <input
                type="text"
                placeholder="Search by account # or customer name..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Account Number</th>
                  <th className="pb-3 font-semibold">Account Holder</th>
                  <th className="pb-3 font-semibold">Facility Type</th>
                  <th className="pb-3 font-semibold">Branch</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Current Balance</th>
                  <th className="pb-3 font-semibold text-right">Administrative Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAccounts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-850/50">
                    <td className="py-3 font-mono font-bold text-slate-200">{a.accountNumber}</td>
                    <td className="py-3 text-slate-200">
                      {a.customer?.user.firstName} {a.customer?.user.lastName}
                      <span className="text-[10px] text-slate-500 block">{a.customer?.user.email}</span>
                    </td>
                    <td className="py-3 text-slate-400 font-semibold">{a.accountType}</td>
                    <td className="py-3 text-slate-400">{a.branch?.name || 'Downtown HQ'}</td>
                    <td className="py-3"><Badge status={a.status} /></td>
                    <td className="py-3 font-mono font-bold text-emerald-400">
                      {formatCurrency(a.balance)}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccountForStatus(a);
                          setNewAccountStatus(a.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE');
                          setAccountStatusReason('');
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

      {/* VIEW 4: BRANCH PERFORMANCE */}
      {activeTab === 'branches' && (
        <Card>
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Building className="w-5 h-5 text-primary-400" />
              <span>Commercial Branch Liquidity & Operational Performance</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Branch-level consolidated deposits, assigned accounts, and staff roster metrics
            </p>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Routing Code</th>
                  <th className="pb-3 font-semibold">Branch Name</th>
                  <th className="pb-3 font-semibold">City Location</th>
                  <th className="pb-3 font-semibold">Customer Accounts</th>
                  <th className="pb-3 font-semibold">Staff Count</th>
                  <th className="pb-3 font-semibold text-right">Consolidated Liquidity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-850/50">
                    <td className="py-3 font-mono font-bold text-primary-400">{b.code}</td>
                    <td className="py-3 font-semibold text-slate-100">{b.name}</td>
                    <td className="py-3 text-slate-400">{b.city}</td>
                    <td className="py-3 font-mono">{b.accountsCount}</td>
                    <td className="py-3 font-mono">{b.employeesCount} Staff</td>
                    <td className="py-3 font-mono font-bold text-emerald-400 text-right text-sm">
                      {formatCurrency(b.totalLiquidity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 5: FORENSIC AUDIT LOGS */}
      {activeTab === 'audit' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-primary-400" />
                <span>Executive Forensic Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Append-only forensic event log capturing all operational, administrative, and financial events
              </p>
            </div>
            <div className="w-64">
              <input
                type="text"
                placeholder="Filter action (e.g. LOGIN, APPROVE, TRANSFER)..."
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-sans">
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">Actor</th>
                  <th className="pb-3 font-semibold">Action</th>
                  <th className="pb-3 font-semibold">Target Entity</th>
                  <th className="pb-3 font-semibold text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                      No matching audit logs recorded.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-850/50">
                      <td className="py-3 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-3 font-sans font-semibold text-slate-200">
                        {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'SYSTEM'}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-500/10 text-primary-300 border border-primary-500/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300 font-sans">{log.targetEntity}</td>
                      <td className="py-3 text-right">
                        {log.metadata ? (
                          <button
                            onClick={() => setSelectedMetadata(log.metadata)}
                            className="text-primary-400 hover:underline text-[11px]"
                          >
                            Inspect JSON
                          </button>
                        ) : (
                          '—'
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

      {/* REVIEW MODAL: APPROVE / REJECT */}
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
                <span className="font-bold text-slate-200">
                  {selectedApproval.maker?.firstName} {selectedApproval.maker?.lastName} ({selectedApproval.maker?.email})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Monetary Amount:</span>
                <span className="font-mono font-extrabold text-emerald-400 text-sm">
                  {formatCurrency(selectedApproval.monetaryValue)}
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
                isLoading={isSubmittingApproval}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject Operation
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleAction('approve')}
                isLoading={isSubmittingApproval}
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Approve & Execute Atomically
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ACCOUNT STATUS MODAL */}
      {selectedAccountForStatus && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAccountForStatus(null)}
          title={`Alter Account Status: ${selectedAccountForStatus.accountNumber}`}
        >
          <form onSubmit={handleUpdateAccountStatus} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">New Account Status</label>
              <select
                value={newAccountStatus}
                onChange={(e) => setNewAccountStatus(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
              >
                <option value="ACTIVE">ACTIVE (Normal Operation)</option>
                <option value="FROZEN">FROZEN (Block Debits & Credits)</option>
                <option value="CLOSED">CLOSED (Terminal Settlement)</option>
              </select>
            </div>

            <Input
              label="Administrative Reason / Audit Note"
              value={accountStatusReason}
              onChange={(e) => setAccountStatusReason(e.target.value)}
              placeholder="e.g. Court subpoena, customer request, risk freeze"
              required
            />

            <div className="pt-2 flex justify-end gap-2.5">
              <Button type="button" variant="outline" size="md" onClick={() => setSelectedAccountForStatus(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSubmittingAccountStatus}>
                Confirm Status Change
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* METADATA INSPECTOR MODAL */}
      {selectedMetadata && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedMetadata(null)}
          title="Audit Payload Metadata"
        >
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-80">
            {JSON.stringify(selectedMetadata, null, 2)}
          </pre>
        </Modal>
      )}
    </div>
  );
};

export default BankManagerDashboard;
