import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { TellerSession, Transaction } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { formatCurrency, formatSignedCurrency } from '../../utils/currency';
import {
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Receipt,
  Scale,
  Printer,
  History,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export const TellerDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes('/deposits')) return 'deposits';
    if (p.includes('/withdrawals')) return 'withdrawals';
    if (p.includes('/transactions')) return 'transactions';
    return 'counter';
  };

  const activeTab = getActiveTab();

  const [activeSession, setActiveSession] = useState<TellerSession | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Open Shift State
  const [isOpenShiftOpen, setIsOpenShiftOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState('5000.00');
  const [isSubmittingShift, setIsSubmittingShift] = useState(false);

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

  // Receipt & Status State
  const [receipt, setReceipt] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sessRes, txRes] = await Promise.all([
        api.get('/reconciliation/active-session').catch(() => ({ data: null })),
        api.get('/transactions').catch(() => ({ data: [] })),
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

  // Open Drawer Shift
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingShift(true);
    setErrorMsg(null);
    try {
      await api.post('/reconciliation/open-session', {
        openingCash: parseFloat(openingCash),
      });
      setIsOpenShiftOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to open teller session.');
    } finally {
      setIsSubmittingShift(false);
    }
  };

  // Process Cash Deposit
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post(
        '/deposits',
        {
          accountNumber: depositAcc,
          amount: parseFloat(depositAmount),
          description: depositDesc || 'Over-the-counter cash deposit',
        },
        {
          headers: { 'Idempotency-Key': `idemp-${Date.now()}` },
        },
      );
      setReceipt(res.data.receipt);
      setIsDepositOpen(false);
      setDepositAcc('');
      setDepositAmount('');
      setDepositDesc('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Deposit failed. Verify account number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process Cash Withdrawal
  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post(
        '/withdrawals',
        {
          accountNumber: withdrawAcc,
          amount: parseFloat(withdrawAmount),
          description: withdrawDesc || 'Over-the-counter cash withdrawal',
        },
        {
          headers: { 'Idempotency-Key': `idemp-${Date.now()}` },
        },
      );
      setReceipt(res.data.receipt);
      setIsWithdrawOpen(false);
      setWithdrawAcc('');
      setWithdrawAmount('');
      setWithdrawDesc('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Withdrawal failed. Insufficient liquid funds.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close Session & EOD Reconcile
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
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Teller & Cashier Counter Workspace</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              Frontline Cashier
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Over-the-counter cash deposits, withdrawals, real-time drawer balancing, and certified customer receipts
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!activeSession ? (
            <Button variant="primary" size="sm" onClick={() => setIsOpenShiftOpen(true)}>
              <KeyRound className="w-3.5 h-3.5 mr-1.5" />
              Open Cash Drawer Shift
            </Button>
          ) : (
            <>
              <Button variant="primary" size="sm" onClick={() => { setIsDepositOpen(true); setErrorMsg(null); }}>
                <ArrowDownLeft className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Cash Deposit
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setIsWithdrawOpen(true); setErrorMsg(null); }}>
                <ArrowUpRight className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
                Cash Withdrawal
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setIsReconcileOpen(true); setErrorMsg(null); }}>
                <Scale className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                EOD Reconcile
              </Button>
            </>
          )}
        </div>
      </div>



      {/* Drawer Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Drawer Expected Cash"
          value={formatCurrency(activeSession?.expectedCash)}
          subtitle="Real-Time System Vault Balance"
          icon={IndianRupee}
        />
        <StatCard
          title="Shift Opening Balance"
          value={formatCurrency(activeSession?.openingCash)}
          subtitle="Verified at Shift Initiation"
          icon={Clock}
        />
        <StatCard
          title="Cash Drawer Shift Status"
          value={activeSession ? 'ACTIVE SHIFT' : 'NO OPEN SESSION'}
          subtitle={activeSession ? `Shift ID: ${activeSession.id.slice(0, 8)}...` : 'Requires Shift Opening'}
          icon={CheckCircle}
          trend={activeSession ? 'Ready for Cash Operations' : 'Drawer Closed'}
          trendPositive={!!activeSession}
        />
      </div>

      {/* Warning banner if drawer is closed */}
      {!activeSession && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between text-amber-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Teller Cash Drawer is Currently Inactive:</span> You must open your shift drawer and declare opening vault cash before processing deposits or withdrawals.
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setIsOpenShiftOpen(true)}>
            Start Shift Now
          </Button>
        </div>
      )}

      {/* VIEW 1: TELLER COUNTER */}
      {(activeTab === 'counter' || activeTab === 'transactions') && (
        <Card>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Teller Shift Transactions
            </h3>
            <span className="text-xs text-slate-400 font-mono">{transactions.length} Records</span>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No transactions recorded in this shift session yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-850/50">
                      <td className="py-3 font-mono font-bold text-slate-200">{tx.referenceNumber}</td>
                      <td className="py-3 font-semibold">
                        <span className={tx.transactionType === 'DEPOSIT' ? 'text-emerald-400' : 'text-rose-400'}>
                          {tx.transactionType}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-bold text-slate-100">
                        {formatSignedCurrency(tx.amount, tx.transactionType)}
                      </td>
                      <td className="py-3"><Badge status={tx.status} /></td>
                      <td className="py-3 text-slate-400">
                        {new Date(tx.executedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 2: CASH DEPOSIT (FORM VIEW) */}
      {activeTab === 'deposits' && (
        <Card className="max-w-xl mx-auto">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
              <span>Process Over-The-Counter Cash Deposit</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Deposit cash into customer depository account with instantaneous balance credit
            </p>
          </div>

          <form onSubmit={handleDeposit} className="space-y-4 mt-5">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}
            <Input
              label="Customer Depository Account Number"
              value={depositAcc}
              onChange={(e) => setDepositAcc(e.target.value)}
              placeholder="e.g. 1001009821"
              required
            />
            <Input
              label="Deposit Cash Amount"
              type="number"
              step="0.01"
              min="1"
              prefix="₹"
              suffix="INR"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="500.00"
              required
            />
            <Input
              label="Source of Funds / Memo"
              value={depositDesc}
              onChange={(e) => setDepositDesc(e.target.value)}
              placeholder="e.g. Cash retail deposit over counter"
            />
            <div className="pt-2 flex justify-end gap-2.5">
              <Button type="button" variant="outline" size="md" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                Authorize Cash Deposit
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* VIEW 3: CASH WITHDRAWAL (FORM VIEW) */}
      {activeTab === 'withdrawals' && (
        <Card className="max-w-xl mx-auto">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-rose-400" />
              <span>Process Over-The-Counter Cash Withdrawal</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Dispense cash to customer against verified liquid checking/savings balances
            </p>
          </div>

          <form onSubmit={handleWithdrawal} className="space-y-4 mt-5">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}
            <Input
              label="Customer Depository Account Number"
              value={withdrawAcc}
              onChange={(e) => setWithdrawAcc(e.target.value)}
              placeholder="e.g. 1001009821"
              required
            />
            <Input
              label="Withdrawal Cash Amount"
              type="number"
              step="0.01"
              min="1"
              prefix="₹"
              suffix="INR"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="150.00"
              required
            />
            <Input
              label="Withdrawal Reason / Memo"
              value={withdrawDesc}
              onChange={(e) => setWithdrawDesc(e.target.value)}
              placeholder="e.g. Customer counter withdrawal"
            />
            <div className="pt-2 flex justify-end gap-2.5">
              <Button type="button" variant="outline" size="md" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                Authorize Cash Dispense
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* MODAL: OPEN SHIFT */}
      <Modal isOpen={isOpenShiftOpen} onClose={() => setIsOpenShiftOpen(false)} title="Open Teller Shift & Drawer">
        <form onSubmit={handleOpenShift} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}
          <p className="text-xs text-slate-400">
            Count the physical currency notes in your cashier drawer to verify the opening vault balance before serving customers.
          </p>
          <Input
            label="Verified Opening Drawer Cash"
            type="number"
            step="0.01"
            min="0"
            prefix="₹"
            suffix="INR"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            placeholder="5000.00"
            required
          />
          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={() => setIsOpenShiftOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmittingShift}>
              Open Shift & Start Serving
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: DEPOSIT POPUP */}
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
            label="Cash Amount Received"
            type="number"
            step="0.01"
            min="1"
            prefix="₹"
            suffix="INR"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="500.00"
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
              Authorize Deposit
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: WITHDRAWAL POPUP */}
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
            label="Cash Amount Dispensed"
            type="number"
            step="0.01"
            min="1"
            prefix="₹"
            suffix="INR"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="150.00"
            required
          />
          <Input
            label="Withdrawal Memo"
            value={withdrawDesc}
            onChange={(e) => setWithdrawDesc(e.target.value)}
            placeholder="e.g. Cash retail counter withdrawal"
          />
          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={() => setIsWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
              Authorize Dispense
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EOD RECONCILE */}
      <Modal isOpen={isReconcileOpen} onClose={() => setIsReconcileOpen(false)} title="End of Day Teller Cash Balancing">
        <form onSubmit={handleCloseSession} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Shift Opening Cash:</span>
              <span className="font-mono text-slate-200">{formatCurrency(activeSession?.openingCash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">System Expected Cash:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {formatCurrency(activeSession?.expectedCash)}
              </span>
            </div>
          </div>
          <Input
            label="Physical Count Declared Cash"
            type="number"
            step="0.01"
            min="0"
            prefix="₹"
            suffix="INR"
            value={declaredCash}
            onChange={(e) => setDeclaredCash(e.target.value)}
            placeholder="5250.00"
            required
          />
          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={() => setIsReconcileOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
              Submit Reconciliation & Close Shift
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: OFFICIAL TRANSACTION RECEIPT */}
      {receipt && (
        <Modal isOpen={true} onClose={() => setReceipt(null)} title="Official Transaction Receipt" maxWidth="sm">
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-center pb-2 border-b border-slate-800 font-sans">
                <span className="font-extrabold text-sm text-slate-100">APEX GLOBAL BANK</span>
                <span className="block text-[10px] text-slate-400">Official Frontline Counter Voucher</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ref:</span>
                <span className="font-bold text-slate-200">{receipt.referenceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Type:</span>
                <span className="font-bold text-slate-200">{receipt.transactionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account:</span>
                <span className="text-slate-200">{receipt.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-emerald-400 text-sm">{formatCurrency(receipt.amount)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">New Liquid Balance:</span>
                <span className="font-extrabold text-slate-100">{formatCurrency(receipt.newBalance)}</span>
              </div>
              <div className="text-[10px] text-slate-500 pt-1 text-center">
                {new Date(receipt.timestamp).toLocaleString()}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 font-sans">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print Receipt
              </Button>
              <Button variant="primary" size="sm" onClick={() => setReceipt(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TellerDashboard;
