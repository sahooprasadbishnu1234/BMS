import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { BankAccount, Transaction, LoanApplication, LoanProduct, SupportTicket } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { formatCurrency, formatSignedCurrency } from '../../utils/currency';
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
  Printer,
  Download,
  Calendar,
  Send,
  IndianRupee,
  Clock,
  Sparkles,
  Banknote,
  Landmark,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Active view synced with route
  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes('/transfers')) return 'transfers';
    if (p.includes('/statements')) return 'statements';
    if (p.includes('/loans')) return 'loans';
    if (p.includes('/support')) return 'support';
    return 'accounts';
  };

  const activeTab = getActiveTab();

  // State
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loanApplications, setLoanApplications] = useState<LoanApplication[]>([]);
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Transfer State
  const [sourceAccount, setSourceAccount] = useState('');
  const [destinationAccount, setDestinationAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferStatus, setTransferStatus] = useState<{ success: boolean; message: string; receipt?: any } | null>(null);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Statements State
  const [selectedStatementAccount, setSelectedStatementAccount] = useState('');
  const [statementStartDate, setStatementStartDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [statementEndDate, setStatementEndDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [statementData, setStatementData] = useState<any | null>(null);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);

  // Loan Application Modal State
  const [isApplyLoanOpen, setIsApplyLoanOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductCode, setSelectedProductCode] = useState('');
  const [loanAmount, setLoanAmount] = useState('15000');
  const [loanTenure, setLoanTenure] = useState('24');
  const [loanIncome, setLoanIncome] = useState('5000');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);
  const [loanStatus, setLoanStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Repay Loan Modal State
  const [selectedLoanToRepay, setSelectedLoanToRepay] = useState<any | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repaySourceAcc, setRepaySourceAcc] = useState('');
  const [isSubmittingRepay, setIsSubmittingRepay] = useState(false);
  const [repayStatus, setRepayStatus] = useState<string | null>(null);

  // Support Dispute Ticket Modal & Thread State
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('TRANSACTION_DISPUTE');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [ticketDisputedAmount, setTicketDisputedAmount] = useState('');
  const [ticketTxRef, setTicketTxRef] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketStatusMsg, setTicketStatusMsg] = useState<string | null>(null);

  const [selectedTicketThread, setSelectedTicketThread] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Load Main Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [accRes, txRes, loanRes, prodRes, ticketsRes] = await Promise.all([
        api.get('/accounts').catch(() => ({ data: [] })),
        api.get('/transactions').catch(() => ({ data: [] })),
        api.get('/loans/applications').catch(() => ({ data: [] })),
        api.get('/loans/products').catch(() => ({ data: [] })),
        api.get('/support/tickets').catch(() => ({ data: [] })),
      ]);
      setAccounts(accRes.data);
      if (accRes.data.length > 0) {
        setSourceAccount(accRes.data[0].accountNumber);
        setSelectedStatementAccount(accRes.data[0].id);
        setRepaySourceAcc(accRes.data[0].accountNumber);
      }
      setTransactions(txRes.data);
      setLoanApplications(loanRes.data);
      setLoanProducts(prodRes.data);
      if (prodRes.data.length > 0) {
        setSelectedProductId(prodRes.data[0].id);
        setSelectedProductCode(prodRes.data[0].code);
      }
      setSupportTickets(ticketsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch Statement
  const handleFetchStatement = async (accId?: string, overrideStart?: string, overrideEnd?: string) => {
    const idToFetch = accId || selectedStatementAccount || (accounts.length > 0 ? accounts[0].id : '');
    if (!idToFetch) {
      setStatementError('No bank account found to generate statement.');
      return;
    }
    setIsLoadingStatement(true);
    setStatementError(null);
    try {
      const sDate = overrideStart !== undefined ? overrideStart : statementStartDate;
      const eDate = overrideEnd !== undefined ? overrideEnd : statementEndDate;
      const params: any = {};
      if (sDate) params.startDate = sDate;
      if (eDate) params.endDate = eDate;
      const res = await api.get(`/accounts/${idToFetch}/statement`, { params });
      setStatementData(res.data);
      if (idToFetch !== selectedStatementAccount) {
        setSelectedStatementAccount(idToFetch);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to generate account statement from core ledger.';
      setStatementError(msg);
    } finally {
      setIsLoadingStatement(false);
    }
  };

  // Auto-fetch statement when navigating to /statements tab
  useEffect(() => {
    if (activeTab === 'statements' && !statementData && accounts.length > 0 && !isLoadingStatement) {
      const targetId = selectedStatementAccount || accounts[0].id;
      handleFetchStatement(targetId);
    }
  }, [activeTab, accounts]);

  // Download statement as CSV file
  const handleDownloadCsv = () => {
    if (!statementData || !statementData.transactions) return;
    const headers = ['Date', 'Reference', 'Description', 'Flow', 'Amount', 'Currency'];
    const rows = statementData.transactions.map((t: any) => [
      new Date(t.date).toISOString().split('T')[0],
      `"${t.referenceNumber || ''}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.direction,
      t.amount,
      statementData.account.currency || 'INR',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `statement-${statementData.account.accountNumber}-${statementStartDate || 'all'}-${statementEndDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Execute Transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTransfer(true);
    setTransferStatus(null);
    try {
      const res = await api.post(
        '/transfers',
        {
          sourceAccountNumber: sourceAccount,
          destinationAccountNumber: destinationAccount,
          amount: parseFloat(transferAmount),
          description: transferDesc || 'Internal retail transfer',
        },
        {
          headers: { 'Idempotency-Key': `idemp-${Date.now()}` },
        },
      );

      setTransferStatus({
        success: true,
        message: res.data.message || `Transfer of ${formatCurrency(transferAmount)} completed successfully!`,
        receipt: {
          referenceNumber: res.data.referenceNumber || res.data.transaction?.referenceNumber,
          newBalance: res.data.sourceBalance,
        },
      });
      setTransferAmount('');
      setDestinationAccount('');
      setTransferDesc('');
      loadData();
    } catch (err: any) {
      setTransferStatus({
        success: false,
        message: err.response?.data?.message || 'Transfer failed. Check liquid balance and account number.',
      });
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Submit Loan Application
  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLoan(true);
    setLoanStatus(null);
    try {
      const activeProduct = loanProducts.find((p) => p.code === selectedProductCode || p.id === selectedProductId) || loanProducts[0];
      const pCode = activeProduct?.code || selectedProductCode || 'PERS-01';
      const pId = activeProduct?.id || selectedProductId;

      await api.post('/loans/applications', {
        loanProductCode: pCode,
        loanProductId: pId,
        requestedAmount: parseFloat(loanAmount),
        tenureMonths: parseInt(loanTenure, 10),
        monthlyIncome: parseFloat(loanIncome),
        purpose: loanPurpose,
      });
      setLoanStatus({ success: true, message: `Loan facility request of ${formatCurrency(loanAmount)} submitted for underwriting review!` });
      setTimeout(() => {
        setIsApplyLoanOpen(false);
        setLoanStatus(null);
        setLoanPurpose('');
      }, 1500);
      loadData();
    } catch (err: any) {
      setLoanStatus({ success: false, message: err.response?.data?.message || 'Credit application submission failed.' });
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  // Repay Loan
  const handleRepayLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanToRepay) return;
    setIsSubmittingRepay(true);
    setRepayStatus(null);
    try {
      await api.post(`/loans/accounts/${selectedLoanToRepay.id}/repay`, {
        sourceAccountNumber: repaySourceAcc,
        amount: parseFloat(repayAmount),
      });
      setSelectedLoanToRepay(null);
      setRepayAmount('');
      loadData();
    } catch (err: any) {
      setRepayStatus(err.response?.data?.message || 'Repayment failed.');
    } finally {
      setIsSubmittingRepay(false);
    }
  };

  // Create Support / Financial Dispute Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTicket(true);
    setTicketStatusMsg(null);
    try {
      const fullDesc = ticketDisputedAmount
        ? `[DISPUTED AMOUNT: ${formatCurrency(ticketDisputedAmount)}] [TX REF: ${ticketTxRef || 'N/A'}] ${ticketDescription}`
        : ticketDescription;

      await api.post('/support/tickets', {
        subject: ticketSubject,
        category: ticketCategory,
        priority: ticketPriority,
        description: fullDesc,
      });
      setIsCreateTicketOpen(false);
      setTicketSubject('');
      setTicketDisputedAmount('');
      setTicketTxRef('');
      setTicketDescription('');
      loadData();
    } catch (err: any) {
      setTicketStatusMsg(err.response?.data?.message || 'Failed to submit dispute ticket.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Send Message in Ticket Thread
  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketThread || !replyMessage.trim()) return;
    setIsSendingReply(true);
    try {
      await api.post(`/support/tickets/${selectedTicketThread.id}/messages`, {
        message: replyMessage,
        isInternal: false,
      });
      setReplyMessage('');
      const res = await api.get(`/support/tickets/${selectedTicketThread.id}`);
      setSelectedTicketThread(res.data);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Open Ticket Thread
  const openTicket = async (ticket: SupportTicket) => {
    try {
      const res = await api.get(`/support/tickets/${ticket.id}`);
      setSelectedTicketThread(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // EMI Calculator Helper
  const calculateEstimatedEmi = (principal: number, annualRate: number, tenureMonths: number) => {
    if (principal <= 0 || annualRate <= 0 || tenureMonths <= 0) return 0;
    const r = annualRate / 100 / 12;
    return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  };

  const selectedProduct = loanProducts.find((p) => p.code === selectedProductCode || p.id === selectedProductId) || loanProducts[0];
  const estimatedMonthlyEmi = selectedProduct
    ? calculateEstimatedEmi(parseFloat(loanAmount) || 0, parseFloat(selectedProduct.annualInterestRate) || 8.5, parseInt(loanTenure, 10) || 24)
    : 0;

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Customer Banking Portal</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              INR Depository Core
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Depository accounts, funds transfers, official statements, loan underwriting, and dispute triage
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate('/transfers')}>
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
            Transfer Funds
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setIsApplyLoanOpen(true); }}>
            <BadgePercent className="w-3.5 h-3.5 mr-1.5 text-primary-400" />
            Apply for Loan
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setIsCreateTicketOpen(true); }}>
            <LifeBuoy className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            File Dispute
          </Button>
        </div>
      </div>



      {/* VIEW 1: MY ACCOUNTS (DASHBOARD) */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          {/* Monetary KPI Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Liquid Balances"
              value={formatCurrency(totalBalance)}
              subtitle={`${accounts.length} Depository Facilities`}
              icon={IndianRupee}
            />
            <StatCard
              title="Active Accounts"
              value={accounts.filter((a) => a.status === 'ACTIVE').length}
              subtitle="Checking & Savings Accounts"
              icon={CheckCircle}
            />
            <StatCard
              title="Total Transactions"
              value={transactions.length}
              subtitle="Double-Entry Posted Activity"
              icon={ArrowRightLeft}
            />
          </div>

          {/* Depository Accounts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-primary-400" />
                <span>Your Depository Accounts</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">{accounts.length} Accounts Registered</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <Card key={acc.id} hoverEffect className="relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                        {acc.accountType} FACILITY (INR)
                      </span>
                      <div className="text-xl font-mono font-bold text-slate-100 mt-2">
                        {acc.accountNumber}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Branch: {acc.branch?.name || 'Downtown HQ Branch'}
                      </div>
                    </div>
                    <Badge status={acc.status} />
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-end justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400">
                        {acc.accountType === 'SAVINGS' ? 'Available Withdrawable Balance' : 'Available Liquid Balance'}
                      </div>
                      <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                        {formatCurrency(acc.accountType === 'SAVINGS' ? Math.max(0, Number(acc.balance) - 500) : acc.balance)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Total Balance: <span className="font-mono text-slate-200 font-bold">{formatCurrency(acc.balance)}</span>
                        {acc.accountType === 'SAVINGS' && (
                          <span className="text-amber-400 ml-1.5 font-semibold">(₹500.00 Min Reserve Maintained)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStatementAccount(acc.id);
                          navigate('/statements');
                          handleFetchStatement(acc.id);
                        }}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Statement
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSourceAccount(acc.accountNumber);
                          navigate('/transfers');
                        }}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                        Transfer
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Transactions Table */}
          <Card>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>Financial Transaction Activity</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">{transactions.length} Records</span>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Reference</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Description</th>
                    <th className="pb-3 font-semibold">Amount (INR)</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                        No financial transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 font-mono font-bold text-slate-200">{tx.referenceNumber}</td>
                        <td className="py-3 font-sans">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-300">
                            {tx.transactionType === 'DEPOSIT' && <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />}
                            {tx.transactionType === 'WITHDRAWAL' && <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />}
                            {tx.transactionType === 'TRANSFER' && <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />}
                            {tx.transactionType}
                          </span>
                        </td>
                        <td className="py-3 text-slate-300 max-w-xs truncate font-sans">{tx.description || '—'}</td>
                        <td className="py-3 font-mono font-bold">
                          <span
                            className={
                              tx.transactionType === 'DEPOSIT'
                                ? 'text-emerald-400'
                                : tx.transactionType === 'WITHDRAWAL'
                                ? 'text-rose-400'
                                : 'text-slate-100'
                            }
                          >
                            {formatSignedCurrency(tx.amount, tx.transactionType)}
                          </span>
                        </td>
                        <td className="py-3 font-sans"><Badge status={tx.status} /></td>
                        <td className="py-3 text-slate-400 font-sans">{new Date(tx.executedAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: TRANSFER FUNDS */}
      {activeTab === 'transfers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-primary-400" />
                  <span>Execute Internal Funds Transfer</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Transfers are settled instantaneously and posted symmetrically to the double-entry general ledger.
                </p>
              </div>

              {transferStatus && (
                <div
                  className={`mt-4 p-4 rounded-xl text-xs flex items-start gap-3 ${
                    transferStatus.success
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}
                >
                  {transferStatus.success ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold text-sm mb-1">
                      {transferStatus.success ? 'Transfer Authorized' : 'Transfer Failed'}
                    </div>
                    <div>{transferStatus.message}</div>
                    {transferStatus.receipt && (
                      <div className="mt-2 font-mono text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-500/30">
                        Ref: {transferStatus.receipt.referenceNumber} | Remaining Available: {formatCurrency(transferStatus.receipt.newBalance)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleTransfer} className="space-y-4 mt-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Select Source Account
                  </label>
                  <select
                    value={sourceAccount}
                    onChange={(e) => setSourceAccount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-primary-500 font-mono"
                  >
                    {accounts.map((a) => {
                      const avail = a.accountType === 'SAVINGS' ? Math.max(0, Number(a.balance) - 500) : Number(a.balance);
                      return (
                        <option key={a.id} value={a.accountNumber}>
                          {a.accountNumber} ({a.accountType}) — Withdrawable: {formatCurrency(avail)} (Total: {formatCurrency(a.balance)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <Input
                  label="Destination Account Number"
                  value={destinationAccount}
                  onChange={(e) => setDestinationAccount(e.target.value)}
                  placeholder="e.g. 1002005411"
                  required
                />

                <div>
                  <Input
                    label="Transfer Amount (INR)"
                    type="number"
                    step="0.01"
                    min="0.5"
                    prefix="₹"
                    suffix="INR"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="250.00"
                    required
                  />
                  {(() => {
                    const src = accounts.find((a) => a.accountNumber === sourceAccount) || accounts[0];
                    if (src?.accountType === 'SAVINGS') {
                      const maxTransfer = Math.max(0, Number(src.balance) - 500);
                      return (
                        <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center justify-between">
                          <span>⚠️ ₹500.00 Minimum Reserve required in Savings Account</span>
                          <span className="font-mono font-bold">Max Withdrawable: {formatCurrency(maxTransfer)}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <Input
                  label="Transfer Description / Memo"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="e.g. Vendor payment, tuition, family support"
                />

                <div className="pt-3 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setTransferAmount('');
                      setDestinationAccount('');
                      setTransferDesc('');
                      setTransferStatus(null);
                    }}
                  >
                    Clear Form
                  </Button>
                  <Button type="submit" variant="primary" size="md" isLoading={isSubmittingTransfer}>
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Authorize Transfer
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Quick Help & Account Summary */}
          <div className="space-y-4">
            <Card>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 pb-2 border-b border-slate-800 flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                <span>Financial Security Notice</span>
              </h4>
              <div className="space-y-2 text-xs text-slate-400 mt-3 leading-relaxed">
                <p>
                  • High-value transfers exceeding <strong className="text-amber-400">₹10,000.00</strong> will automatically enter the Dual-Control Maker-Checker queue for secondary Bank Manager authorization.
                </p>
                <p>
                  • Row-level pessimistic locking is enforced to prevent double-spending or race condition overdraws.
                </p>
                <p>
                  • An Idempotency-Key header is uniquely generated with every authorization to protect against network retransmissions.
                </p>
              </div>
            </Card>

            <Card>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 pb-2 border-b border-slate-800">
                Quick Destination Accounts
              </h4>
              <div className="space-y-2 mt-3 text-xs">
                {accounts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setDestinationAccount(a.accountNumber)}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-primary-500/50 cursor-pointer transition-colors flex justify-between items-center"
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-200">{a.accountNumber}</div>
                      <div className="text-[10px] text-slate-400">{a.accountType} — Available: {formatCurrency(a.availableBalance)}</div>
                    </div>
                    <span className="text-[10px] text-primary-400 font-semibold">Select</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW 3: ACCOUNT STATEMENTS */}
      {activeTab === 'statements' && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-400" />
                  <span>Official Depository Account Statement</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select your depository account and period to generate certified transaction activity statements
                </p>
              </div>
              {statementData && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                    <Download className="w-4 h-4 mr-1.5" />
                    Download CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-1.5" />
                    Print Statement
                  </Button>
                </div>
              )}
            </div>

            {/* Account Selector & Action Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 items-end">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Depository Account</label>
                <select
                  value={selectedStatementAccount}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedStatementAccount(newId);
                    if (statementData) {
                      handleFetchStatement(newId);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-primary-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountNumber} ({a.accountType}) — Available: {formatCurrency(a.availableBalance)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full flex items-center justify-center gap-1.5"
                  isLoading={isLoadingStatement}
                  onClick={() => handleFetchStatement()}
                >
                  <FileText className="w-4 h-4" />
                  Generate Statement
                </Button>
              </div>
            </div>

            {/* Hierarchical Date Range Picker (Year -> Month -> Date) */}
            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <DateRangePicker
                startDate={statementStartDate}
                endDate={statementEndDate}
                onChange={(start, end) => {
                  setStatementStartDate(start);
                  setStatementEndDate(end);
                }}
              />
            </div>
          </Card>

          {/* Error Banner */}
          {statementError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{statementError}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleFetchStatement()}>
                Retry
              </Button>
            </div>
          )}

          {/* Statement Render */}
          {statementData ? (
            <Card className="print:bg-white print:text-black">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-slate-400">Account Holder:</span>
                  <p className="text-sm font-bold text-slate-100">{statementData.account.customerName}</p>
                  <span className="text-slate-400 mt-2 block">Account Number:</span>
                  <p className="font-mono font-bold text-slate-200">{statementData.account.accountNumber}</p>
                </div>
                <div>
                  <span className="text-slate-400">Facility Type:</span>
                  <p className="font-bold text-slate-200">{statementData.account.accountType} DEPOSITORY ({statementData.account.currency || 'INR'})</p>
                  <span className="text-slate-400 mt-2 block">Domiciled Branch:</span>
                  <p className="font-bold text-slate-200">{statementData.account.branchName}</p>
                </div>
                <div className="sm:text-right">
                  <span className="text-slate-400">Current Liquid Balance:</span>
                  <p className="text-2xl font-mono font-extrabold text-emerald-400">
                    {formatCurrency(statementData.account.currentBalance)}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Certified ACID Ledger Snapshot</span>
                </div>
              </div>

              {/* Summary Statistics */}
              {statementData.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Total Inflows (Credits)</span>
                    <span className="font-mono font-bold text-emerald-400">
                      +{formatCurrency(statementData.summary.totalCredit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Total Outflows (Debits)</span>
                    <span className="font-mono font-bold text-rose-400">
                      -{formatCurrency(statementData.summary.totalDebit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Net Periodic Flow</span>
                    <span className={`font-mono font-bold ${statementData.summary.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {statementData.summary.netFlow >= 0 ? '+' : ''}{formatCurrency(statementData.summary.netFlow)}
                    </span>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-slate-400 block text-[11px]">Statement Records</span>
                    <span className="font-mono font-bold text-slate-200">
                      {statementData.summary.transactionCount} transactions
                    </span>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto mt-6">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-sans">
                      <th className="pb-3 font-semibold">Date & Time</th>
                      <th className="pb-3 font-semibold">Reference</th>
                      <th className="pb-3 font-semibold">Description</th>
                      <th className="pb-3 font-semibold">Flow</th>
                      <th className="pb-3 font-semibold text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {statementData.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                          <p className="text-sm font-medium text-slate-300">No transactions found for this account in the selected period.</p>
                          <p className="text-xs text-slate-500 mt-1 mb-3">Try widening the date range or viewing your entire account history.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setStatementStartDate('');
                              setStatementEndDate('');
                              handleFetchStatement(selectedStatementAccount, '', '');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs transition-colors shadow-sm"
                          >
                            View All Historical Transactions (All Time)
                          </button>
                        </td>
                      </tr>
                    ) : (
                      statementData.transactions.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-850/50">
                          <td className="py-3 text-slate-400">
                            {new Date(t.date).toLocaleDateString()} <span className="text-[10px] text-slate-500">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="py-3 font-bold text-slate-200">{t.referenceNumber}</td>
                          <td className="py-3 text-slate-300 font-sans">{t.description || '—'}</td>
                          <td className="py-3 font-sans">
                            <span
                              className={`font-bold ${
                                t.direction === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {t.direction}
                            </span>
                          </td>
                          <td className="py-3 text-right font-bold text-slate-100">
                            <span className={t.direction === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'}>
                              {formatSignedCurrency(t.amount, t.direction)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="py-12 text-center text-slate-500">
                <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-300">Ready to Generate Certified Account Statement</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Click the "Generate Statement" button above to view certified financial inflows, outflows, and running balances.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* VIEW 4: MY LOANS & CREDIT */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BadgePercent className="w-5 h-5 text-primary-400" />
                <span>My Credit Facilities & Installment Loans</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Active loans, reducing-balance EMI schedules, and instant credit facility applications
              </p>
            </div>
            <Button variant="primary" size="md" onClick={() => setIsApplyLoanOpen(true)}>
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Apply for New Loan
            </Button>
          </div>

          {/* Active Loan Applications & Facilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loanApplications.length === 0 ? (
              <div className="md:col-span-2">
                <Card>
                  <div className="py-10 text-center text-slate-500">
                    <BadgePercent className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-300">No active loan applications or facilities</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Apply for an installment loan, automobile finance, or home equity facility with competitive reducing interest rates.
                    </p>
                    <Button variant="primary" size="sm" className="mt-4" onClick={() => setIsApplyLoanOpen(true)}>
                      Submit Credit Application
                    </Button>
                  </div>
                </Card>
              </div>
            ) : (
              loanApplications.map((app) => (
                <Card key={app.id} className="relative">
                  <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                        {app.loanProduct?.name || 'Personal Installment Loan'}
                      </span>
                      <div className="text-sm font-mono font-bold text-slate-100 mt-1.5">
                        App #{app.applicationNumber}
                      </div>
                    </div>
                    <Badge status={app.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-3 text-xs">
                    <div>
                      <span className="text-slate-400">Principal Facility:</span>
                      <div className="text-base font-mono font-extrabold text-emerald-400">
                        {formatCurrency(app.requestedAmount)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Tenure:</span>
                      <div className="font-bold text-slate-200">{app.tenureMonths} Months</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Purpose:</span>
                      <div className="text-slate-300 truncate">{app.purpose}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Application Date:</span>
                      <div className="text-slate-300">{new Date(app.submittedAt).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {app.status === 'DISBURSED' && app.loanAccount && (
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400">Outstanding Principal</div>
                        <div className="text-sm font-mono font-bold text-amber-400">
                          {formatCurrency(app.loanAccount.outstandingBalance)}
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedLoanToRepay(app.loanAccount);
                          setRepayAmount(app.loanAccount?.monthlyInstallment || '500');
                        }}
                      >
                        <IndianRupee className="w-3.5 h-3.5 mr-1" />
                        Repay Installment ({formatCurrency(app.loanAccount.monthlyInstallment)})
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 5: SUPPORT & DISPUTES */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-primary-400" />
                <span>Financial Support & Transaction Dispute Triage</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Dispute unauthorized charges, request overcharge fee reversals, or clarify settlement discrepancies
              </p>
            </div>
            <Button variant="primary" size="md" onClick={() => setIsCreateTicketOpen(true)}>
              <PlusCircle className="w-4 h-4 mr-1.5" />
              File Financial Dispute
            </Button>
          </div>

          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Your Filed Financial Disputes & Claims
              </h4>
              <span className="text-xs font-mono text-slate-400">{supportTickets.length} Claims</span>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Claim #</th>
                    <th className="pb-3 font-semibold">Subject</th>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold">Priority</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {supportTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No financial dispute claims filed. Click "File Financial Dispute" if you notice any billing discrepancy.
                      </td>
                    </tr>
                  ) : (
                    supportTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-850/50">
                        <td className="py-3 font-mono font-bold text-slate-200">{t.ticketNumber}</td>
                        <td className="py-3 font-semibold text-slate-100 max-w-xs truncate">{t.subject}</td>
                        <td className="py-3 text-slate-400">{t.category?.replace(/_/g, ' ')}</td>
                        <td className="py-3"><Badge status={t.priority} /></td>
                        <td className="py-3"><Badge status={t.status} /></td>
                        <td className="py-3 text-right">
                          <Button variant="outline" size="sm" onClick={() => openTicket(t)}>
                            View Thread
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 1: APPLY FOR LOAN */}
      <Modal
        isOpen={isApplyLoanOpen}
        onClose={() => setIsApplyLoanOpen(false)}
        title="Submit Credit Facility Application"
        maxWidth="lg"
      >
        <form onSubmit={handleApplyLoan} className="space-y-4">
          {loanStatus && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                loanStatus.success
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {loanStatus.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{loanStatus.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Select Loan Facility Product
            </label>
            <select
              value={selectedProduct?.code || selectedProductCode}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedProductCode(code);
                const prod = loanProducts.find((p) => p.code === code);
                if (prod) {
                  setSelectedProductId(prod.id);
                  const minAmt = parseFloat(prod.minAmount);
                  const maxAmt = parseFloat(prod.maxAmount);
                  const currentAmt = parseFloat(loanAmount) || minAmt;
                  if (currentAmt < minAmt) setLoanAmount(prod.minAmount);
                  else if (currentAmt > maxAmt) setLoanAmount(prod.maxAmount);

                  const currentTenure = parseInt(loanTenure, 10) || prod.minTenureMonths;
                  if (currentTenure < prod.minTenureMonths) setLoanTenure(prod.minTenureMonths.toString());
                  else if (currentTenure > prod.maxTenureMonths) setLoanTenure(prod.maxTenureMonths.toString());
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-semibold"
            >
              {loanProducts.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.name} ({p.annualInterestRate}% Annual Reducing Rate)
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400 font-sans">Product Code:</span>
                <span className="font-bold text-primary-400">{selectedProduct.code}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400 font-sans">Allowable Principal:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(selectedProduct.minAmount)} – {formatCurrency(selectedProduct.maxAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400 font-sans">Allowable Tenure:</span>
                <span className="font-bold text-slate-200">{selectedProduct.minTenureMonths} to {selectedProduct.maxTenureMonths} months</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Requested Principal Facility"
              type="number"
              step="500"
              min={selectedProduct ? parseFloat(selectedProduct.minAmount) : 1000}
              max={selectedProduct ? parseFloat(selectedProduct.maxAmount) : 50000}
              prefix="₹"
              suffix="INR"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              helperText={selectedProduct ? `Allowable: ${formatCurrency(selectedProduct.minAmount)} to ${formatCurrency(selectedProduct.maxAmount)}` : undefined}
              required
            />
            <Input
              label="Tenure (Months)"
              type="number"
              min={selectedProduct ? selectedProduct.minTenureMonths : 6}
              max={selectedProduct ? selectedProduct.maxTenureMonths : 120}
              suffix="Mo"
              value={loanTenure}
              onChange={(e) => setLoanTenure(e.target.value)}
              helperText={selectedProduct ? `Allowable: ${selectedProduct.minTenureMonths} to ${selectedProduct.maxTenureMonths} mo` : undefined}
              required
            />
          </div>

          <Input
            label="Verified Monthly Income"
            type="number"
            step="100"
            min="500"
            prefix="₹"
            suffix="INR / mo"
            value={loanIncome}
            onChange={(e) => setLoanIncome(e.target.value)}
            required
          />

          <Input
            label="Purpose of Credit Facility"
            value={loanPurpose}
            onChange={(e) => setLoanPurpose(e.target.value)}
            placeholder="e.g. Home renovation, commercial expansion, medical expense"
            required
          />

          {/* Real-time EMI Preview */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Estimated Monthly Installment (EMI):</span>
              <span className="text-base font-mono font-extrabold text-emerald-400">
                {formatCurrency(estimatedMonthlyEmi)} / mo
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Formula: P × r × (1+r)^n / ((1+r)^n - 1) — Fully amortized reducing balance.
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={() => setIsApplyLoanOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmittingLoan}>
              Submit Facility Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: REPAY LOAN INSTALLMENT */}
      {selectedLoanToRepay && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLoanToRepay(null)}
          title={`Make Loan Repayment: ${selectedLoanToRepay.loanNumber || ''}`}
        >
          <form onSubmit={handleRepayLoan} className="space-y-4">
            {repayStatus && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {repayStatus}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Source Account to Debit</label>
              <select
                value={repaySourceAcc}
                onChange={(e) => setRepaySourceAcc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.accountNumber}>
                    {a.accountNumber} ({a.accountType}) — Available: {formatCurrency(a.availableBalance)}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Repayment Amount (INR)"
              type="number"
              step="0.01"
              prefix="₹"
              suffix="INR"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              required
            />

            <div className="pt-2 flex justify-end gap-2.5">
              <Button type="button" variant="outline" size="md" onClick={() => setSelectedLoanToRepay(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSubmittingRepay}>
                Authorize Repayment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: FILE FINANCIAL DISPUTE TICKET */}
      <Modal
        isOpen={isCreateTicketOpen}
        onClose={() => setIsCreateTicketOpen(false)}
        title="File Financial Dispute or Transaction Inquiry"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          {ticketStatusMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {ticketStatusMsg}
            </div>
          )}

          <Input
            label="Dispute Subject / Claim Title"
            value={ticketSubject}
            onChange={(e) => setTicketSubject(e.target.value)}
            placeholder="e.g. Unrecognized debit charge or ATM cash dispense failure"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Dispute Category</label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-semibold"
              >
                <option value="TRANSACTION_DISPUTE">Transaction Dispute (Unauthorized Charge)</option>
                <option value="ATM_DISPENSE_FAILURE">ATM Cash Dispense Discrepancy</option>
                <option value="OVERCHARGE_FEE_REVERSAL">Fee Reversal Request</option>
                <option value="TRANSFER_DISCREPANCY">Funds Transfer Discrepancy</option>
                <option value="ACCOUNT_SERVICES">Depository Account Inquiry</option>
                <option value="LOAN_INQUIRY">Loan Interest / EMI Inquiry</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Urgency Priority</label>
              <select
                value={ticketPriority}
                onChange={(e) => setTicketPriority(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-semibold"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High (Active Hold)</option>
                <option value="URGENT">Urgent (Fraud Alert)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Disputed Monetary Amount"
              type="number"
              step="0.01"
              prefix="₹"
              suffix="INR"
              value={ticketDisputedAmount}
              onChange={(e) => setTicketDisputedAmount(e.target.value)}
              placeholder="120.00"
            />
            <Input
              label="Transaction Reference # (if known)"
              value={ticketTxRef}
              onChange={(e) => setTicketTxRef(e.target.value)}
              placeholder="e.g. TX-TRF-..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Explanation & Justification</label>
            <textarea
              value={ticketDescription}
              onChange={(e) => setTicketDescription(e.target.value)}
              rows={3}
              placeholder="Provide relevant transaction details, dates, and why the debit is contested..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-primary-500"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={() => setIsCreateTicketOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmittingTicket}>
              Submit Dispute Claim
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: VIEW TICKET THREAD & REPLY */}
      {selectedTicketThread && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTicketThread(null)}
          title={`Dispute #${selectedTicketThread.ticketNumber}: ${selectedTicketThread.subject}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400">Category: </span>
                <span className="font-semibold text-slate-200">{selectedTicketThread.category}</span>
              </div>
              <div className="flex gap-2">
                <Badge status={selectedTicketThread.priority} />
                <Badge status={selectedTicketThread.status} />
              </div>
            </div>

            {/* Conversation Thread */}
            <div className="space-y-3 max-h-72 overflow-y-auto p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
              {selectedTicketThread.messages?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No message correspondence yet.</p>
              ) : (
                selectedTicketThread.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl text-xs max-w-[85%] ${
                      msg.sender?.email === 'support@bms.bank' || msg.isInternal
                        ? 'bg-slate-800/90 text-slate-200 ml-auto border border-slate-700'
                        : 'bg-primary-950/40 text-primary-200 border border-primary-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400">
                      <span className="font-bold">
                        {msg.sender?.firstName} {msg.sender?.lastName}
                      </span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendTicketReply} className="flex gap-2 pt-2">
              <input
                type="text"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply message..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-primary-500"
              />
              <Button type="submit" variant="primary" size="md" isLoading={isSendingReply}>
                <Send className="w-4 h-4 mr-1.5" />
                Send
              </Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomerDashboard;
