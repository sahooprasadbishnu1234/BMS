import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { ComplianceCase } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  CheckCircle,
  FileCheck,
  Flag,
} from 'lucide-react';

export const ComplianceDashboard: React.FC = () => {
  const [cases, setCases] = useState<ComplianceCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ComplianceCase | null>(null);
  const [findings, setFindings] = useState('');
  const [newStatus, setNewStatus] = useState<string>('INVESTIGATING');
  const [actionsTaken, setActionsTaken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.get('/compliance/cases');
      setCases(res.data);
    } catch (err) {
      console.error(err);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
          Anti-Money Laundering (AML) & Regulatory Compliance
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Automated CTR alerts ($10k+ thresholds), transaction velocity anomalies, and SAR case investigation
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active AML Alert Cases"
          value={cases.length}
          subtitle="Monitored by Risk Engine"
          icon={AlertTriangle}
        />
        <StatCard
          title="Under Investigation"
          value={cases.filter((c) => c.status === 'INVESTIGATING' || c.status === 'OPEN').length}
          subtitle="Pending Human Officer Review"
          icon={Search}
        />
        <StatCard
          title="Cleared / Legitimate"
          value={cases.filter((c) => c.status === 'CLEARED').length}
          subtitle="Verified Tax & Trade Proof"
          icon={CheckCircle}
        />
      </div>

      {/* Compliance Cases Table */}
      <Card>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Compliance Investigation Docket
          </h3>
          <span className="text-xs font-mono font-bold text-slate-400">
            {cases.length} Cases
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Case #</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Trigger Alert Type</th>
                <th className="pb-3 font-semibold">Severity</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Findings Summary</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-850/50">
                  <td className="py-3 font-mono font-bold text-slate-200">{c.caseNumber}</td>
                  <td className="py-3 text-slate-300">
                    {c.customer ? `${c.customer.user.firstName} ${c.customer.user.lastName}` : 'System Alert'}
                  </td>
                  <td className="py-3 font-semibold text-primary-300">
                    {c.alertType.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3"><Badge status={c.severity} /></td>
                  <td className="py-3"><Badge status={c.status} /></td>
                  <td className="py-3 text-slate-400 max-w-xs truncate">{c.findings || 'Pending investigation.'}</td>
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

      {/* Case Investigation Modal */}
      {selectedCase && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCase(null)}
          title={`AML Case Investigation: ${selectedCase.caseNumber}`}
        >
          <form onSubmit={handleUpdateCase} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div><span className="text-slate-400">Trigger: </span><span className="font-bold text-amber-400">{selectedCase.alertType}</span></div>
              <div><span className="text-slate-400">Subject Customer: </span><span className="text-slate-200">{selectedCase.customer?.user.firstName} {selectedCase.customer?.user.lastName}</span></div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Investigation Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
              >
                <option value="INVESTIGATING">INVESTIGATING (Under active inquiry)</option>
                <option value="CLEARED">CLEARED (Legitimate transaction verified)</option>
                <option value="ESCALATED">ESCALATED (Requires executive compliance review)</option>
                <option value="REPORTED_SAR">REPORTED_SAR (File Suspicious Activity Report with FinCEN)</option>
              </select>
            </div>

            <Input
              label="Compliance Findings & Source of Wealth Assessment"
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="e.g. Verified customer tax returns and underlying invoice."
              required
            />

            <Input
              label="Remedial Actions Taken"
              value={actionsTaken}
              onChange={(e) => setActionsTaken(e.target.value)}
              placeholder="e.g. Account enhanced monitoring applied."
            />

            <div className="pt-2 flex justify-end gap-2.5">
              <Button type="button" variant="outline" size="md" onClick={() => setSelectedCase(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                Save Case Findings
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
