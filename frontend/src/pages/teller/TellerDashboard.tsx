import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { TellerSession, Transaction } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Receipt,
  Scale,
} from 'lucide-react';

export const TellerDashboard: React.FC = () => {
  const [activeSession, setActiveSession] = useState<TellerSession | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Deposit State
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAcc, setDepositAcc] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDesc, setDepositDesc] = useState('');

  // Withdrawal State
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAcc, setWithdrawAcc] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDesc, setWithdrawDesc] = useState('');

  // End of Day Reconcile State
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [declaredCash, setDeclaredCash] = useState('');

  const [receipt, setReceipt] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [sessRes, txRes] = await Promise.all([
        api.get('/reconciliation/active-session'),
        api.get('/transactions'),
      ]);
      setActiveSession(sessRes.data);
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

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/deposits', {
        accountNumber: depositAcc,
        amount: parseFloat(depositAmount),
        description: depositDesc,
      });
      setReceipt(res.data.receipt);
      setIsDepositOpen(false);
      setDepositAcc('');
      setDepositAmount('');
      setDepositDesc('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Deposit failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/withdrawals', {
        accountNumber: withdrawAcc,
        amount: parseFloat(withdrawAmount),
        description: withdrawDesc,
      });
      setReceipt(res.data.receipt);
      setIsWithdrawOpen(false);
      setWithdrawAcc('');
      setWithdrawAmount('');
      setWithdrawDesc('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Withdrawal failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post(`/reconciliation/sessions/${activeSession.id}/close`, {
        declaredCash: parseFloat(declaredCash),
      });
      setIsReconcileOpen(false);
      setDeclaredCash('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to close session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Teller & Cashier Counter Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Over-the-counter cash deposits, withdrawals, drawer balancing, and daily reconciliation
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="primary" size="md" onClick={() => setIsDepositOpen(true)}>
            <ArrowDownLeft className="w-4 h-4 mr-1.5 text-emerald-400" />
            Cash Deposit
          </Button>
          <Button variant="secondary" size="md" onClick={() => setIsWithdrawOpen(true)}>
            <ArrowUpRight className="w-4 h-4 mr-1.5 text-rose-400" />
            Cash Withdrawal
          </Button>
          <Button variant="outline" size="md" onClick={() => setIsReconcileOpen(true)}>
            <Scale className="w-4 h-4 mr-1.5 text-sky-400" />
            EOD Reconcile
          </Button>
        </div>
      </div>

      {/* Active Cash Drawer Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Drawer Expected Cash"
          value={`$${activeSession ? parseFloat(activeSession.expectedCash).toFixed(2) : '0.00'}`}
          subtitle="System Real-Time Balance"
          icon={DollarSign}
        />
        <StatCard
          title="Shift Opening Balance"
          value={`$${activeSession ? parseFloat(activeSession.openingCash).toFixed(2) : '0.00'}`}
          subtitle="Verified at Shift Start"
          icon={Clock}
        />
        <StatCard
          title="Drawer Status"
          value={activeSession?.status || 'NO OPEN SESSION'}
          subtitle={activeSession ? `Shift ID: ${activeSession.id.slice(0, 8)}...` : 'Requires Shift Opening'}
          icon={CheckCircle}
        />
      </div>

      {/* Recent Session Transactions */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Teller Session Transactions
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {transactions.length} Activity Lines
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Reference</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-850/50">
                  <td className="py-3 font-mono font-bold text-slate-200">{tx.referenceNumber}</td>
                  <td className="py-3 font-semibold">
                    <span className={tx.transactionType === 'DEPOSIT' ? 'text-emerald-400' : 'text-rose-400'}>
                      {tx.transactionType}
                    </span>
                  </td>
                  <td className="py-3 font-mono font-bold text-slate-100">
                    ${parseFloat(tx.amount).toFixed(2)}
                  </td>
                  <td className="py-3"><Badge status={tx.status} /></td>
                  <td className="py-3 text-slate-400">
                    {new Date(tx.executedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Deposit Modal */}
      <Modal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} title="Process Cash Deposit">
        <form onSubmit={handleDeposit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}
          <Input
            label="Customer Bank Account Number"
            value={depositAcc}
            onChange={(e) => setDepositAcc(e.target.value)}
            placeholder="e.g. 1001009821"
            required
          />
          <Input
            label="Cash Amount Received (USD)"
            type="number"
            step="0.01"
            min="1"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="e.g. 500.00"
            required
          />
          <Input
            label="Deposit Memo / Source of Funds"
            value={depositDesc}
            onChange={(e) => setDepositDesc(e.target.value)}
            placeholder="e.g. Cash retail deposit over counter"
          />
          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={() => setIsDepositOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
              Accept Cash & Post Deposit
            </Button>
          </div>
        </form>
      </Modal>

      {/* Withdrawal Modal */}
      <Modal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} title="Process Cash Withdrawal">
        <form onSubmit={handleWithdrawal} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}
          <Input
            label="Customer Bank Account Number"
            value={withdrawAcc}
            onChange={(e) => setWithdrawAcc(e.target.value)}
            placeholder="e.g. 1001009821"
            required
          />
          <Input
            label="Cash Amount Requested (USD)"
            type="number"
            step="0.01"
            min="1"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="e.g. 200.00"
            required
          />
          <Input
            label="Withdrawal Memo"
            value={withdrawDesc}
            onChange={(e) => setWithdrawDesc(e.target.value)}
            placeholder="e.g. In-branch counter withdrawal"
          />
          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={() => setIsWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="md" isLoading={isSubmitting}>
              Disburse Cash & Deduct Balance
            </Button>
          </div>
        </form>
      </Modal>

      {/* EOD Reconcile Modal */}
      <Modal isOpen={isReconcileOpen} onClose={() => setIsReconcileOpen(false)} title="End-of-Day Drawer Reconciliation">
        <form onSubmit={handleCloseSession} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400">System Expected Cash in Drawer:</span>
            <div className="text-2xl font-mono font-extrabold text-emerald-400 mt-1">
              ${activeSession ? parseFloat(activeSession.expectedCash).toFixed(2) : '0.00'}
            </div>
          </div>
          <Input
            label="Physical Count Declared Cash (USD)"
            type="number"
            step="0.01"
            min="0"
            value={declaredCash}
            onChange={(e) => setDeclaredCash(e.target.value)}
            placeholder="Enter counted physical currency"
            required
          />
          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={() => setIsReconcileOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
              Close Shift & Submit Reconciliation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transaction Receipt Modal */}
      {receipt && (
        <Modal isOpen={true} onClose={() => setReceipt(null)} title="Official Transaction Receipt">
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
              <Receipt className="w-8 h-8 text-primary-400 mx-auto mb-2" />
              <div className="font-extrabold text-slate-100 text-sm">APEX GLOBAL BMS COUNTER</div>
              <div className="text-[10px] text-slate-400">RECEIPT #{receipt.receiptNumber}</div>
            </div>
            <div className="divide-y divide-slate-800 border-y border-slate-800 py-2">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">TYPE:</span>
                <span className="font-bold text-slate-200">{receipt.type}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">ACCOUNT:</span>
                <span className="font-bold text-slate-200">{receipt.accountNumber}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">AMOUNT:</span>
                <span className="font-bold text-emerald-400">${receipt.amount}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">NEW BALANCE:</span>
                <span className="font-bold text-slate-200">${receipt.newBalance}</span>
              </div>
            </div>
            <div className="pt-2 text-center">
              <Button variant="primary" size="md" className="w-full" onClick={() => setReceipt(null)}>
                Print & Dismiss Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
