import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { BankAccount, Transaction } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  Wallet,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  BadgePercent,
  LifeBuoy,
  PlusCircle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Transfer Modal State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [sourceAccount, setSourceAccount] = useState('');
  const [destinationAccount, setDestinationAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferStatus, setTransferStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Statement Modal State
  const [selectedStatement, setSelectedStatement] = useState<any | null>(null);

  const loadData = async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/transactions'),
      ]);
      setAccounts(accRes.data);
      if (accRes.data.length > 0) {
        setSourceAccount(accRes.data[0].accountNumber);
      }
      setTransactions(txRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTransferStatus(null);
    try {
      const res = await api.post(
        '/transfers',
        {
          sourceAccountNumber: sourceAccount,
          destinationAccountNumber: destinationAccount,
          amount: parseFloat(transferAmount),
          description: transferDesc || 'Customer transfer',
        },
        {
          headers: { 'Idempotency-Key': `idemp-${Date.now()}` },
        },
      );

      setTransferStatus({
        success: true,
        message: res.data.message || 'Transfer executed successfully!',
      });
      setTransferAmount('');
      setDestinationAccount('');
      setTransferDesc('');
      loadData();
    } catch (err: any) {
      setTransferStatus({
        success: false,
        message: err.response?.data?.message || 'Transfer failed.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewStatement = async (accountId: string) => {
    try {
      const res = await api.get(`/accounts/${accountId}/statement`);
      setSelectedStatement(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const totalBalance = accounts.reduce(
    (sum, a) => sum + parseFloat(a.balance),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Customer Banking Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time deposit accounts, transfers, statements, and credit facilities
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="primary" size="md" onClick={() => setIsTransferOpen(true)}>
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Transfer Funds
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Liquid Balances"
          value={`$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle={`${accounts.length} Depository Accounts`}
          icon={Wallet}
        />
        <StatCard
          title="Active Accounts"
          value={accounts.filter((a) => a.status === 'ACTIVE').length}
          subtitle="Savings & Checking Facilities"
          icon={CheckCircle}
        />
        <StatCard
          title="Recent Transactions"
          value={transactions.length}
          subtitle="Posted to Double-Entry Ledger"
          icon={ArrowRightLeft}
        />
      </div>

      {/* Accounts List */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
          Your Depository Accounts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => (
            <Card key={acc.id} hoverEffect className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                    {acc.accountType} ACCOUNT
                  </span>
                  <div className="text-xl font-mono font-bold text-slate-100 mt-2">
                    {acc.accountNumber}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Branch: {acc.branch?.name || 'Downtown HQ'}
                  </div>
                </div>
                <Badge status={acc.status} />
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-end justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400">Available Balance</div>
                  <div className="text-2xl font-extrabold text-emerald-400">
                    ${parseFloat(acc.availableBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewStatement(acc.id)}
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Statement
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Transactions Table */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Transaction Activity & Ledger History
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {transactions.length} Records
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
                <th className="pb-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 font-mono font-bold text-slate-200">
                      {tx.referenceNumber}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-300">
                        {tx.transactionType === 'DEPOSIT' && <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />}
                        {tx.transactionType === 'WITHDRAWAL' && <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />}
                        {tx.transactionType === 'TRANSFER' && <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />}
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300 max-w-xs truncate">
                      {tx.description || '—'}
                    </td>
                    <td className="py-3 font-mono font-bold text-slate-100">
                      ${parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <Badge status={tx.status} />
                    </td>
                    <td className="py-3 text-slate-400">
                      {new Date(tx.executedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => {
          setIsTransferOpen(false);
          setTransferStatus(null);
        }}
        title="Execute Internal Funds Transfer"
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          {transferStatus && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                transferStatus.success
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {transferStatus.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{transferStatus.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Source Account
            </label>
            <select
              value={sourceAccount}
              onChange={(e) => setSourceAccount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.accountNumber}>
                  {a.accountNumber} ({a.accountType}) - Available: ${parseFloat(a.availableBalance).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Destination Account Number"
            value={destinationAccount}
            onChange={(e) => setDestinationAccount(e.target.value)}
            placeholder="e.g. 1002005411"
            required
          />

          <Input
            label="Amount (USD)"
            type="number"
            step="0.01"
            min="0.5"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            placeholder="e.g. 250.00"
            required
          />

          <Input
            label="Transfer Description"
            value={transferDesc}
            onChange={(e) => setTransferDesc(e.target.value)}
            placeholder="e.g. Supplier payment, rent, gift"
          />

          <div className="pt-2 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsTransferOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
              Authorize Transfer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Statement Modal */}
      {selectedStatement && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStatement(null)}
          title={`Statement: ${selectedStatement.account.accountNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400">Account Holder:</span>
                <p className="font-bold text-slate-200">{selectedStatement.account.customerName}</p>
                <span className="text-slate-400 mt-2 block">Account Type:</span>
                <p className="font-bold text-slate-200">{selectedStatement.account.accountType}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Current Balance:</span>
                <p className="text-xl font-mono font-extrabold text-emerald-400">
                  ${parseFloat(selectedStatement.account.currentBalance).toFixed(2)}
                </p>
                <span className="text-slate-400 mt-2 block">Branch:</span>
                <p className="font-bold text-slate-200">{selectedStatement.account.branchName}</p>
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Account Transaction History
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Reference</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Direction</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedStatement.transactions.map((t: any) => (
                    <tr key={t.id}>
                      <td className="py-2.5 text-slate-400">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="py-2.5 font-mono text-slate-300">{t.referenceNumber}</td>
                      <td className="py-2.5 text-slate-300">{t.description}</td>
                      <td className="py-2.5">
                        <span
                          className={`font-semibold ${
                            t.direction === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-100">
                        ${parseFloat(t.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
