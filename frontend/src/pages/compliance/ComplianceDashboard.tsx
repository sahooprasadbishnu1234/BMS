import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ComplianceCase, Transaction } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { formatCurrency } from '../../utils/currency';
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  CheckCircle,
  FileCheck,
  IndianRupee,
  Printer,
  Flag,
  ShieldCheck,
} from 'lucide-react';

export const ComplianceDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes('/cases')) return 'cases';
    if (p.includes('/ctr')) return 'ctr';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const [cases, setCases] = useState<ComplianceCase[]>([]);
  const [largeTransactions, setLargeTransactions] = useState<Transaction[]>([]);
  const [selectedCase, setSelectedCase] = useState<ComplianceCase | null>(null);
  const [findings, setFindings] = useState('');
  const [newStatus, setNewStatus] = useState<string>('INVESTIGATING');
  const [actionsTaken, setActionsTaken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [casesRes, txRes] = await Promise.all([
        api.get('/compliance/cases').catch(() => ({ data: [] })),
        api.get('/transactions').catch(() => ({ data: [] })),
      ]);
      setCases(casesRes.data);
      // Filter transactions >= ₹10,000 for Currency Transaction Reporting (CTR)
      const ctrList = (txRes.data || []).filter(
        (t: Transaction) => parseFloat(t.amount || '0') >= 10000,
      );
      setLargeTransactions(ctrList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/compliance/cases/${selectedCase.id}`, {
        status: newStatus,
        findings,
        actionsTaken,
      });
      setSelectedCase(null);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCases = cases.filter((c) =>
    severityFilter === 'ALL' ? true : c.severity === severityFilter,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Anti-Money Laundering (AML) & Regulatory Compliance</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              BSA / FinCEN Officer
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated CTR threshold monitoring (₹10,000+), velocity anomaly detection, and Suspicious Activity Report (SAR) filings
          </p>
        </div>
      </div>



      {/* Compliance KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Active AML Alert Cases"
          value={cases.length}
          subtitle="Risk Engine Triggers"
          icon={AlertTriangle}
        />
        <StatCard
          title="Under Investigation"
          value={cases.filter((c) => c.status === 'INVESTIGATING' || c.status === 'OPEN').length}
          subtitle="Pending Officer Determination"
          icon={Search}
          trend={cases.filter((c) => c.status === 'OPEN').length > 0 ? 'Action Required' : 'Cases Triage Done'}
          trendPositive={cases.filter((c) => c.status === 'OPEN').length === 0}
        />
        <StatCard
          title="Cleared / Legitimate"
          value={cases.filter((c) => c.status === 'CLEARED').length}
          subtitle="Tax & Invoice Verified"
          icon={CheckCircle}
        />
        <StatCard
          title="CTR Reports (₹10k+)"
          value={largeTransactions.length}
          subtitle="Currency Threshold Disclosures"
          icon={IndianRupee}
        />
      </div>

      {/* VIEW 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Active AML Alert Cases Requiring Determination
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigate('/cases')}>
                View All Cases
              </Button>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Case #</th>
                    <th className="pb-3 font-semibold">Customer</th>
                    <th className="pb-3 font-semibold">Alert Trigger</th>
                    <th className="pb-3 font-semibold">Severity</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Investigation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {cases.slice(0, 5).map((c) => (
                    <tr key={c.id} className="hover:bg-slate-850/50">
                      <td className="py-3 font-mono font-bold text-slate-200">{c.caseNumber}</td>
                      <td className="py-3 text-slate-300">
                        {c.customer ? `${c.customer.user.firstName} ${c.customer.user.lastName}` : 'System Rule'}
                      </td>
                      <td className="py-3 font-semibold text-primary-300">
                        {c.alertType.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3"><Badge status={c.severity} /></td>
                      <td className="py-3"><Badge status={c.status} /></td>
                      <td className="py-3 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedCase(c);
                            setNewStatus(c.status);
                            setFindings(c.findings || '');
                            setActionsTaken(c.actionsTaken || '');
                          }}
                        >
                          Investigate
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: SUSPICIOUS ACTIVITY CASES */}
      {activeTab === 'cases' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>Suspicious Activity Reports (SAR) & Alert Docket</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Investigate transaction structuring, rapid velocity anomalies, and high-risk threshold breaches
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    severityFilter === sev
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Case #</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Alert Trigger Type</th>
                  <th className="pb-3 font-semibold">Severity</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Findings Summary</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-850/50">
                    <td className="py-3 font-mono font-bold text-slate-200">{c.caseNumber}</td>
                    <td className="py-3 text-slate-300">
                      {c.customer ? `${c.customer.user.firstName} ${c.customer.user.lastName}` : 'System Risk Alert'}
                    </td>
                    <td className="py-3 font-semibold text-primary-300">{c.alertType.replace(/_/g, ' ')}</td>
                    <td className="py-3"><Badge status={c.severity} /></td>
                    <td className="py-3"><Badge status={c.status} /></td>
                    <td className="py-3 text-slate-400 max-w-xs truncate">{c.findings || 'Pending investigation determination.'}</td>
                    <td className="py-3 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedCase(c);
                          setNewStatus(c.status);
                          setFindings(c.findings || '');
                          setActionsTaken(c.actionsTaken || '');
                        }}
                      >
                        Investigate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 3: LARGE CASH REPORTS (CTR) */}
      {activeTab === 'ctr' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-emerald-400" />
                <span>Currency Transaction Reporting (₹10,000+ CTR Disclosures)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Transactions exceeding ₹10,000.00 subject to mandatory FIU-IND / Regulatory reporting
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5 mr-1" />
              Generate CTR Filing Report
            </Button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-sans uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Transaction Reference</th>
                  <th className="pb-3 font-semibold">Flow Type</th>
                  <th className="pb-3 font-semibold">Description / Purpose</th>
                  <th className="pb-3 font-semibold">Amount (INR)</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Execution Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {largeTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      No cash transactions exceeding ₹10,000 threshold recorded.
                    </td>
                  </tr>
                ) : (
                  largeTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-850/50">
                      <td className="py-3 font-bold text-slate-200">{tx.referenceNumber}</td>
                      <td className="py-3 font-sans">
                        <span className="font-semibold text-primary-300">{tx.transactionType}</span>
                      </td>
                      <td className="py-3 font-sans text-slate-300 max-w-xs truncate">{tx.description || 'Large fund movement'}</td>
                      <td className="py-3 font-bold text-emerald-400 text-sm">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          CTR FILED
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{new Date(tx.executedAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* INVESTIGATE CASE MODAL */}
      {selectedCase && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCase(null)}
          title={`AML Case Investigation: ${selectedCase.caseNumber}`}
          maxWidth="lg"
        >
          <form onSubmit={handleUpdateCase} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div>
                <span className="text-slate-400">Trigger Alert: </span>
                <span className="font-bold text-amber-400">{selectedCase.alertType}</span>
              </div>
              <div>
                <span className="text-slate-400">Target Customer: </span>
                <span className="font-semibold text-slate-200">
                  {selectedCase.customer ? `${selectedCase.customer.user.firstName} ${selectedCase.customer.user.lastName}` : 'System Risk Rule'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Severity Level: </span>
                <span className="font-bold text-rose-400">{selectedCase.severity}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Investigation Findings</label>
              <textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                rows={3}
                placeholder="Record verified source of funds, tax returns, or suspicious velocity patterns..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Actions Taken / Escalations</label>
              <textarea
                value={actionsTaken}
                onChange={(e) => setActionsTaken(e.target.value)}
                rows={2}
                placeholder="e.g. Cleared after customer submitted commercial tax invoices, or SAR report filed with regulatory agency."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Case Determination Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-semibold"
              >
                <option value="INVESTIGATING">INVESTIGATING (Under active review)</option>
                <option value="CLEARED">CLEARED (Legitimate trade / funds verified)</option>
                <option value="ESCALATED">ESCALATED (High risk flagged for executive review)</option>
                <option value="REPORTED_SAR">REPORTED_SAR (Formal SAR filing submitted to FinCEN)</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <Button type="button" variant="outline" size="md" onClick={() => setSelectedCase(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                Save Case Determination
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ComplianceDashboard;
