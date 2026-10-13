import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { AuditLog } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { ShieldCheck, History, Search, FileText, Lock } from 'lucide-react';

export const AuditorDashboard: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchAction, setSearchAction] = useState('');
  const [targetEntity, setTargetEntity] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get('/audit-logs', {
        params: {
          action: searchAction || undefined,
          targetEntity: targetEntity || undefined,
        },
      });
      setLogs(res.data);
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
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
          Internal & External Forensic Audit Inspection
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographically immutable, append-only historical audit trail of all banking operations
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Audit Trail Entries"
          value={logs.length}
          subtitle="Append-Only Forensic Records"
          icon={History}
        />
        <StatCard
          title="Integrity Mode"
          value="READ ONLY"
          subtitle="Strict Zero-Write Audit Lock"
          icon={Lock}
          trend="Tamper-Proof"
          trendPositive={true}
        />
        <StatCard
          title="SOX & Basel III Compliance"
          value="ACTIVE"
          subtitle="Continuous Regulatory Logging"
          icon={ShieldCheck}
        />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Forensic Audit Log Trail
            </h3>
            <span className="text-xs text-slate-400">
              Captures Actor ID, Action Code, Target Entity, Metadata, and Timestamps
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchAction}
              onChange={(e) => setSearchAction(e.target.value)}
              placeholder="Filter by Action (e.g. LOGIN, TRANSFER)"
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500"
            />
            <input
              type="text"
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
              placeholder="Filter by Entity (e.g. BankAccount)"
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500"
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
                <th className="pb-3 font-semibold">Payload Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/50">
                    <td className="py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
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
                    <td className="py-3 text-slate-400 max-w-xs truncate text-[11px]">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
