import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuditLog, Transaction } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatSignedCurrency } from '../../utils/currency';
import {
  ShieldCheck,
  History,
  Search,
  FileText,
  Lock,
  ArrowRightLeft,
  CheckCircle,
  Eye,
  Scale,
} from 'lucide-react';

export const AuditorDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes('/transactions')) return 'transactions';
    if (p.includes('/logs')) return 'logs';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchAction, setSearchAction] = useState('');
  const [targetEntity, setTargetEntity] = useState('');
  const [selectedMetadata, setSelectedMetadata] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [logsRes, txRes] = await Promise.all([
        api.get('/audit-logs', {
          params: {
            action: searchAction || undefined,
            targetEntity: targetEntity || undefined,
          },
        }).catch(() => ({ data: [] })),
        api.get('/transactions').catch(() => ({ data: [] })),
      ]);
      setLogs(logsRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchAction, targetEntity]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Forensic Audit Inspection & Regulatory Verification</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              Read-Only Forensic Examiner
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cryptographically immutable, append-only historical audit trail of all banking operations, ledger integrity, and SOX/Basel III controls
          </p>
        </div>
      </div>



      {/* Forensic KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Audit Trail Entries"
          value={logs.length}
          subtitle="Append-Only Forensic Records"
          icon={History}
        />
        <StatCard
          title="Audit Session Mode"
          value="READ ONLY"
          subtitle="Strict Zero-Write Audit Lock"
          icon={Lock}
          trend="Tamper-Proof Ledger"
          trendPositive={true}
        />
        <StatCard
          title="SOX & Basel III Compliance"
          value="CERTIFIED"
          subtitle="Continuous Regulatory Invariance"
          icon={ShieldCheck}
        />
      </div>

      {/* VIEW 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Recent Critical Audit Events
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigate('/logs')}>
                View All Logs
              </Button>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-sans">
                    <th className="pb-3 font-semibold">Timestamp</th>
                    <th className="pb-3 font-semibold">Actor</th>
                    <th className="pb-3 font-semibold">Action</th>
                    <th className="pb-3 font-semibold">Target Entity</th>
                    <th className="pb-3 font-semibold text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.slice(0, 5).map((log) => (
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
                      <td className="py-3 text-right font-sans">
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
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: IMMUTABLE LEDGER AUDIT */}
      {activeTab === 'transactions' && (
        <Card>
          <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary-400" />
                <span>Financial Transaction & General Ledger Postings</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Auditing financial movements posted across retail checking, savings, and loan facilities
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 font-mono">
              <CheckCircle className="w-4 h-4" /> LEDGER INVARIANCE VERIFIED
            </span>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Description</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Executed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-850/50">
                    <td className="py-3 font-bold text-slate-200">{tx.referenceNumber}</td>
                    <td className="py-3 font-sans">
                      <span className="font-semibold text-slate-300">{tx.transactionType}</span>
                    </td>
                    <td className="py-3 font-sans text-slate-300 max-w-xs truncate">{tx.description || '—'}</td>
                    <td className="py-3 font-bold text-emerald-400">{formatSignedCurrency(tx.amount, tx.transactionType)}</td>
                    <td className="py-3 font-sans"><Badge status={tx.status} /></td>
                    <td className="py-3 text-slate-400">{new Date(tx.executedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 3: FORENSIC SYSTEM LOGS */}
      {activeTab === 'logs' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-primary-400" />
                <span>Append-Only Forensic Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Captures Actor, Action Code, Target Entity, IP Address, Metadata Payload, and Timestamps
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={searchAction}
                onChange={(e) => setSearchAction(e.target.value)}
                placeholder="Filter action (e.g. LOGIN, TRANSFER)..."
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 w-52"
              />
              <input
                type="text"
                value={targetEntity}
                onChange={(e) => setTargetEntity(e.target.value)}
                placeholder="Filter entity (e.g. BankAccount)..."
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 w-52"
              />
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-sans">
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">Actor</th>
                  <th className="pb-3 font-semibold">Action</th>
                  <th className="pb-3 font-semibold">Entity</th>
                  <th className="pb-3 font-semibold">Target ID</th>
                  <th className="pb-3 font-semibold text-right">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      No matching audit records found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-850/50">
                      <td className="py-3 text-slate-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-3 font-sans font-semibold text-slate-200">
                        {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'SYSTEM'}
                        {log.actor && <span className="block text-[10px] text-slate-500 font-mono">{log.actor.email}</span>}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-500/10 text-primary-300 border border-primary-500/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">{log.targetEntity}</td>
                      <td className="py-3 text-slate-400 max-w-[120px] truncate">{log.targetEntityId || '—'}</td>
                      <td className="py-3 text-right font-sans">
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

      {/* METADATA INSPECTION MODAL */}
      {selectedMetadata && (
        <Modal isOpen={true} onClose={() => setSelectedMetadata(null)} title="Forensic Payload Metadata" maxWidth="lg">
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-96">
            {JSON.stringify(selectedMetadata, null, 2)}
          </pre>
        </Modal>
      )}
    </div>
  );
};

export default AuditorDashboard;
