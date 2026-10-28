import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { LoanApplication } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { formatCurrency } from '../../utils/currency';
import {
  BadgePercent,
  Calculator,
  CheckCircle,
  AlertCircle,
  UserCheck,
  IndianRupee,
  Calendar,
  FileText,
  Percent,
} from 'lucide-react';

export const LoanOfficerDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes('/calculator')) return 'calculator';
    if (p.includes('/applications')) return 'applications';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  const [creditScore, setCreditScore] = useState(720);
  const [recommendationNotes, setRecommendationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Dedicated EMI Calculator state
  const [calcAmount, setCalcAmount] = useState(25000);
  const [calcRate, setCalcRate] = useState(8.5);
  const [calcTenure, setCalcTenure] = useState(36);

  const loadData = async () => {
    try {
      const res = await api.get('/loans/applications');
      setApplications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reducing Balance Monthly Installment calculation
  const calculateEmi = (P: number, annualRate: number, n: number) => {
    if (P <= 0 || annualRate <= 0 || n <= 0) return 0;
    const r = annualRate / 100 / 12;
    return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  };

  const calculatedEmi = calculateEmi(calcAmount, calcRate, calcTenure);
  const totalAmountPayable = calculatedEmi * calcTenure;
  const totalInterestPayable = totalAmountPayable - calcAmount;

  // Generate Amortization Schedule (first 12 months preview)
  const generateSchedule = () => {
    const schedule = [];
    let balance = calcAmount;
    const r = calcRate / 100 / 12;
    const emi = calculatedEmi;

    for (let month = 1; month <= Math.min(calcTenure, 24); month++) {
      const interest = balance * r;
      const principal = emi - interest;
      const closing = Math.max(0, balance - principal);
      schedule.push({
        month,
        opening: balance,
        emi,
        principal,
        interest,
        closing,
      });
      balance = closing;
    }
    return schedule;
  };

  const amortizationPreview = generateSchedule();

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setIsSubmitting(true);
    setStatusMsg(null);
    setSuccessMsg(null);
    try {
      await api.post(`/loans/applications/${selectedApp.id}/recommend`, {
        creditScore: Number(creditScore),
        recommendationNotes: recommendationNotes || 'Credit assessment completed. Recommended for approval.',
      });
      setSelectedApp(null);
      setRecommendationNotes('');
      setSuccessMsg('Loan application assessed and recommended successfully.');
      loadData();
    } catch (err: any) {
      setStatusMsg(err.response?.data?.message || 'Recommendation submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveAndCredit = async (appId: string) => {
    setIsSubmitting(true);
    setStatusMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.post(`/loans/applications/${appId}/approve`);
      setSuccessMsg(
        res.data.message ||
        `Loan approved! Funds have been automatically credited to account ${res.data.accountCredited || ''}.`
      );
      setSelectedApp(null);
      await loadData();
    } catch (err: any) {
      setStatusMsg(err.response?.data?.message || 'Loan approval and automatic crediting failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredApplications = applications.filter((app) =>
    filterStatus === 'ALL' ? true : app.status === filterStatus,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Credit Underwriting & Loan Assessment</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              Loan Underwriter
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Evaluate applicant creditworthiness, calculate reducing-balance amortization schedules, and submit underwriting recommendations
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg shadow-emerald-950/20">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 rounded bg-slate-850 hover:bg-slate-800 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}



      {/* Underwriting KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Underwriting Queue"
          value={applications.length}
          subtitle="Credit Facilities"
          icon={BadgePercent}
        />
        <StatCard
          title="Requires Assessment"
          value={applications.filter((a) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length}
          subtitle="Submitted / In Review"
          icon={UserCheck}
          trend={applications.filter((a) => a.status === 'SUBMITTED').length > 0 ? 'Pending Review' : 'All Clear'}
          trendPositive={applications.filter((a) => a.status === 'SUBMITTED').length === 0}
        />
        <StatCard
          title="Disbursed Facilities"
          value={applications.filter((a) => a.status === 'DISBURSED').length}
          subtitle="Active Loan Facilities"
          icon={CheckCircle}
        />
      </div>

      {/* VIEW 1: UNDERWRITING OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Applications Requiring Assessment
                </h3>
                <Button variant="outline" size="sm" onClick={() => navigate('/applications')}>
                  View All
                </Button>
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">App Number</th>
                      <th className="pb-3 font-semibold">Applicant</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {applications.slice(0, 4).map((app) => (
                      <tr key={app.id} className="hover:bg-slate-850/50">
                        <td className="py-3 font-mono font-bold text-slate-200">{app.applicationNumber}</td>
                        <td className="py-3 text-slate-300">
                          {app.customer?.user.firstName} {app.customer?.user.lastName}
                        </td>
                        <td className="py-3 font-mono font-bold text-emerald-400">
                          {formatCurrency(app.requestedAmount)}
                        </td>
                        <td className="py-3"><Badge status={app.status} /></td>
                        <td className="py-3 text-right">
                          {(app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW') ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedApp(app);
                                setStatusMsg(null);
                              }}
                            >
                              Assess
                            </Button>
                          ) : (
                            <span className="text-slate-500 font-mono text-[11px]">{app.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Quick Calculator Widget */}
          <Card>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 pb-3 border-b border-slate-800 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary-400" />
              <span>Quick Loan Simulation</span>
            </h4>
            <div className="space-y-3 mt-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Principal Amount (₹)</label>
                <input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcRate}
                    onChange={(e) => setCalcRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tenure (Mo)</label>
                  <input
                    type="number"
                    value={calcTenure}
                    onChange={(e) => setCalcTenure(parseInt(e.target.value, 10) || 12)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center mt-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Monthly EMI Installment</span>
                <div className="text-xl font-mono font-extrabold text-emerald-400 mt-0.5">
                  {formatCurrency(calculatedEmi)}
                </div>
                <Button variant="outline" size="sm" className="mt-2.5 w-full" onClick={() => navigate('/calculator')}>
                  View Full Schedule
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: DEDICATED LOAN EMI CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 pb-3 border-b border-slate-800 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary-400" />
                <span>Simulation Parameters</span>
              </h3>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Principal Facility</span>
                  <span className="font-mono font-bold text-slate-100">{formatCurrency(calcAmount)}</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="200000"
                  step="5000"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(parseFloat(e.target.value))}
                  className="w-full accent-primary-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Annual Interest Rate</span>
                  <span className="font-mono font-bold text-slate-100">{calcRate}%</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="24"
                  step="0.5"
                  value={calcRate}
                  onChange={(e) => setCalcRate(parseFloat(e.target.value))}
                  className="w-full accent-primary-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Tenure (Months)</span>
                  <span className="font-mono font-bold text-slate-100">{calcTenure} Mo ({Math.round(calcTenure / 12)} Yrs)</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="120"
                  step="6"
                  value={calcTenure}
                  onChange={(e) => setCalcTenure(parseInt(e.target.value, 10))}
                  className="w-full accent-primary-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Interest:</span>
                  <span className="font-mono font-bold text-amber-400">{formatCurrency(totalInterestPayable)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Facility Cost:</span>
                  <span className="font-mono font-bold text-slate-200">{formatCurrency(totalAmountPayable)}</span>
                </div>
              </div>
            </Card>

            <div className="md:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="text-center py-6 bg-gradient-to-tr from-primary-950/40 to-slate-900 border-primary-500/30">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Monthly Installment (EMI)</div>
                  <div className="text-3xl font-mono font-extrabold text-emerald-400 mt-2">
                    {formatCurrency(calculatedEmi)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Reducing balance amortization</div>
                </Card>
                <Card className="text-center py-6">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Total Interest Component</div>
                  <div className="text-3xl font-mono font-extrabold text-amber-400 mt-2">
                    {formatCurrency(totalInterestPayable)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Over {calcTenure} monthly installments</div>
                </Card>
              </div>

              {/* Amortization Schedule Table */}
              <Card>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 pb-3 border-b border-slate-800">
                  Amortization Schedule Breakdown (First 24 Installments)
                </h4>
                <div className="overflow-x-auto mt-3 max-h-80">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-sans">
                        <th className="pb-2">Month</th>
                        <th className="pb-2">Opening Principal</th>
                        <th className="pb-2">EMI</th>
                        <th className="pb-2">Principal Leg</th>
                        <th className="pb-2">Interest Leg</th>
                        <th className="pb-2 text-right">Closing Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {amortizationPreview.map((item) => (
                        <tr key={item.month} className="hover:bg-slate-850/50">
                          <td className="py-2 font-bold text-slate-300">Mo {item.month}</td>
                          <td className="py-2 text-slate-400">{formatCurrency(item.opening)}</td>
                          <td className="py-2 font-bold text-slate-100">{formatCurrency(item.emi)}</td>
                          <td className="py-2 text-emerald-400">{formatCurrency(item.principal)}</td>
                          <td className="py-2 text-amber-400">{formatCurrency(item.interest)}</td>
                          <td className="py-2 text-right text-slate-300">{formatCurrency(item.closing)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: CREDIT APPLICATIONS */}
      {activeTab === 'applications' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-400" />
                <span>Credit Applications Queue</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Underwriting assessment, credit bureau verification, and manager recommendations
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'RECOMMENDED', 'APPROVED', 'DISBURSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    filterStatus === st
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">App Number</th>
                  <th className="pb-3 font-semibold">Applicant</th>
                  <th className="pb-3 font-semibold">Monthly Income</th>
                  <th className="pb-3 font-semibold">Facility Amount</th>
                  <th className="pb-3 font-semibold">Tenure</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Underwriting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-850/50">
                    <td className="py-3 font-mono font-bold text-slate-200">{app.applicationNumber}</td>
                    <td className="py-3 text-slate-300">
                      {app.customer?.user.firstName} {app.customer?.user.lastName}
                    </td>
                    <td className="py-3 font-mono text-slate-400">{formatCurrency(app.monthlyIncome)}/mo</td>
                    <td className="py-3 font-mono font-bold text-emerald-400">
                      {formatCurrency(app.requestedAmount)}
                    </td>
                    <td className="py-3 font-mono">{app.tenureMonths} Mo</td>
                    <td className="py-3"><Badge status={app.status} /></td>
                    <td className="py-3 text-right">
                      {(app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW' || app.status === 'RECOMMENDED') ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApp(app);
                              setStatusMsg(null);
                              setSuccessMsg(null);
                            }}
                          >
                            Assess
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs border-emerald-500 shadow-sm"
                            isLoading={isSubmitting}
                            onClick={() => handleApproveAndCredit(app.id)}
                          >
                            Approve & Credit
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">{app.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* UNDERWRITING ASSESSMENT MODAL */}
      {selectedApp && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedApp(null)}
          title={`Credit Underwriting: App #${selectedApp.applicationNumber}`}
          maxWidth="lg"
        >
          <form onSubmit={handleRecommend} className="space-y-4">
            {statusMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {statusMsg}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div>
                <span className="text-slate-400">Applicant Name: </span>
                <span className="font-bold text-slate-200">
                  {selectedApp.customer?.user.firstName} {selectedApp.customer?.user.lastName}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Verified Monthly Income: </span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(selectedApp.monthlyIncome)} / month
                </span>
              </div>
              <div>
                <span className="text-slate-400">Requested Principal: </span>
                <span className="font-mono font-bold text-slate-100">
                  {formatCurrency(selectedApp.requestedAmount)} over {selectedApp.tenureMonths} months
                </span>
              </div>
              <div>
                <span className="text-slate-400">Stated Purpose: </span>
                <span className="text-slate-300">{selectedApp.purpose}</span>
              </div>
            </div>

            <Input
              label="Assessed Credit Bureau Score (300 - 850)"
              type="number"
              min="300"
              max="850"
              value={creditScore}
              onChange={(e) => setCreditScore(parseInt(e.target.value, 10))}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Underwriter Eligibility Notes & Recommendation
              </label>
              <textarea
                value={recommendationNotes}
                onChange={(e) => setRecommendationNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Verified income documentation and credit history. Debt-to-income ratio at 22%. Recommend approval."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-primary-500"
                required
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" size="md" onClick={() => setSelectedApp(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="outline" size="md" isLoading={isSubmitting}>
                Save Recommendation
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-emerald-500 shadow-md shadow-emerald-950/40"
                isLoading={isSubmitting}
                onClick={() => handleApproveAndCredit(selectedApp.id)}
              >
                Approve & Credit Account (Instant)
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LoanOfficerDashboard;
