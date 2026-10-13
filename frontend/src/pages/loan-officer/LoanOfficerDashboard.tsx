import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { LoanApplication } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  BadgePercent,
  Calculator,
  FileCheck,
  CheckCircle,
  AlertCircle,
  UserCheck,
} from 'lucide-react';

export const LoanOfficerDashboard: React.FC = () => {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  const [creditScore, setCreditScore] = useState(720);
  const [recommendationNotes, setRecommendationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // EMI Calculator widget state
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
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return emi;
  };

  const calculatedEmi = calculateEmi(calcAmount, calcRate, calcTenure);

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      await api.post(`/loans/applications/${selectedApp.id}/recommend`, {
        creditScore: Number(creditScore),
        recommendationNotes,
      });
      setSelectedApp(null);
      setRecommendationNotes('');
      loadData();
    } catch (err: any) {
      setStatusMsg(err.response?.data?.message || 'Recommendation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
          Credit Underwriting & Loan Assessment
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review customer creditworthiness, run reducing-balance amortization simulations, and submit recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Underwriting Queue"
          value={applications.length}
          subtitle="Credit Facilities"
          icon={BadgePercent}
        />
        <StatCard
          title="Submitted / In Review"
          value={applications.filter((a) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length}
          subtitle="Requires Officer Assessment"
          icon={UserCheck}
        />
        <StatCard
          title="Disbursed Loans"
          value={applications.filter((a) => a.status === 'DISBURSED').length}
          subtitle="Active Loan Facilities"
          icon={CheckCircle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loan Applications Queue */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Loan Applications Review Queue
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {applications.length} Applications
              </span>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">App Number</th>
                    <th className="pb-3 font-semibold">Applicant</th>
                    <th className="pb-3 font-semibold">Requested Amount</th>
                    <th className="pb-3 font-semibold">Tenure</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-850/50">
                      <td className="py-3 font-mono font-bold text-slate-200">{app.applicationNumber}</td>
                      <td className="py-3 text-slate-300">
                        {app.customer?.user.firstName} {app.customer?.user.lastName}
                        <span className="text-[10px] text-slate-500 block">Inc: ${parseFloat(app.monthlyIncome).toFixed(0)}/mo</span>
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-400">
                        ${parseFloat(app.requestedAmount).toFixed(2)}
                      </td>
                      <td className="py-3 font-mono">{app.tenureMonths} Mo</td>
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
                            Assess & Recommend
                          </Button>
                        ) : (
                          <span className="text-slate-500 font-medium">Assessed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* EMI Calculator Widget */}
        <div>
          <Card>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Calculator className="w-4 h-4 text-primary-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Reducing-Balance EMI Tool
              </h3>
            </div>

            <div className="space-y-3.5 mt-4 text-xs">
              <Input
                label="Principal Amount ($)"
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Annual Interest Rate (%)"
                type="number"
                step="0.1"
                value={calcRate}
                onChange={(e) => setCalcRate(parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Tenure (Months)"
                type="number"
                value={calcTenure}
                onChange={(e) => setCalcTenure(parseInt(e.target.value) || 0)}
              />

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 mt-4 text-center">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Monthly Installment (EMI)
                </span>
                <div className="text-2xl font-mono font-extrabold text-emerald-400 mt-1">
                  ${calculatedEmi.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Total Repayment: ${(calculatedEmi * calcTenure).toFixed(2)}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recommend Modal */}
      {selectedApp && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedApp(null)}
          title={`Credit Assessment: ${selectedApp.applicationNumber}`}
        >
          <form onSubmit={handleRecommend} className="space-y-4">
            {statusMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {statusMsg}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div><span className="text-slate-400">Applicant: </span><span className="font-bold text-slate-200">{selectedApp.customer?.user.firstName} {selectedApp.customer?.user.lastName}</span></div>
              <div><span className="text-slate-400">Requested: </span><span className="font-mono font-bold text-emerald-400">${parseFloat(selectedApp.requestedAmount).toFixed(2)} ({selectedApp.tenureMonths} Mo)</span></div>
              <div><span className="text-slate-400">Purpose: </span><span className="text-slate-300">{selectedApp.purpose}</span></div>
            </div>

            <Input
              label="Assessed Credit Bureau Score (300 - 850)"
              type="number"
              min={300}
              max={850}
              value={creditScore}
              onChange={(e) => setCreditScore(parseInt(e.target.value))}
              required
            />

            <Input
              label="Officer Underwriting Notes & Justification"
              value={recommendationNotes}
              onChange={(e) => setRecommendationNotes(e.target.value)}
              placeholder="e.g. Verified income proof. Debt-to-Income is 22%. Recommend approval."
              required
            />

            <div className="pt-2 flex justify-end gap-2.5">
              <Button type="button" variant="outline" size="md" onClick={() => setSelectedApp(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                Submit Recommendation
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
