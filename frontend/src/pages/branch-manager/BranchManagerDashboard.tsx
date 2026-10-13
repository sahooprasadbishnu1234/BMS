import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { TellerSession, BankAccount } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Building, DollarSign, Users, Wallet, CheckCircle } from 'lucide-react';

export const BranchManagerDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<TellerSession[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [sessRes, accRes] = await Promise.all([
        api.get('/reconciliation/sessions'),
        api.get('/accounts'),
      ]);
      setSessions(sessRes.data);
      setAccounts(accRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const branchLiquidity = accounts.reduce(
    (sum, a) => sum + parseFloat(a.balance),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
          Branch Operations & Cash Supervision
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Branch-level financial isolation, teller drawer balancing, and customer portfolio
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Branch Liquidity"
          value={`$${branchLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Domiciled Customer Balances"
          icon={DollarSign}
        />
        <StatCard
          title="Branch Accounts"
          value={accounts.length}
          subtitle="Savings & Checking"
          icon={Wallet}
        />
        <StatCard
          title="Teller Shifts Today"
          value={sessions.length}
          subtitle="Cash Drawers Monitored"
          icon={Building}
        />
      </div>

      {/* Teller Sessions & Reconciliation Status */}
      <Card>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Teller Sessions & Daily Cash Reconciliation
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {sessions.length} Drawer Records
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Teller</th>
                <th className="pb-3 font-semibold">Opening Cash</th>
                <th className="pb-3 font-semibold">Expected Cash</th>
                <th className="pb-3 font-semibold">Closing Cash</th>
                <th className="pb-3 font-semibold">Difference</th>
                <th className="pb-3 font-semibold">Shift Status</th>
                <th className="pb-3 font-semibold">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-850/50">
                  <td className="py-3 font-bold text-slate-200">
                    {s.teller?.user.firstName} {s.teller?.user.lastName}
                  </td>
                  <td className="py-3 font-mono">${parseFloat(s.openingCash).toFixed(2)}</td>
                  <td className="py-3 font-mono font-bold text-slate-100">
                    ${parseFloat(s.expectedCash).toFixed(2)}
                  </td>
                  <td className="py-3 font-mono">
                    {s.closingCash ? `$${parseFloat(s.closingCash).toFixed(2)}` : 'Active Drawer'}
                  </td>
                  <td className="py-3 font-mono">
                    {s.cashDifference ? (
                      <span className={parseFloat(s.cashDifference) === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        ${parseFloat(s.cashDifference).toFixed(2)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3">
                    <Badge status={s.status} />
                  </td>
                  <td className="py-3 text-slate-400">
                    {new Date(s.openedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Branch Accounts Table */}
      <Card>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 pb-3 border-b border-slate-800">
          Branch Domiciled Accounts
        </h3>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Account Number</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {accounts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-850/50">
                  <td className="py-3 font-mono font-bold text-slate-200">{a.accountNumber}</td>
                  <td className="py-3 text-slate-300">
                    {a.customer?.user.firstName} {a.customer?.user.lastName}
                  </td>
                  <td className="py-3 font-semibold text-slate-400">{a.accountType}</td>
                  <td className="py-3"><Badge status={a.status} /></td>
                  <td className="py-3 font-mono font-bold text-emerald-400 text-right">
                    ${parseFloat(a.balance).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
