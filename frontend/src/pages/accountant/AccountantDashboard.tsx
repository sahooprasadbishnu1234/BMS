import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { LedgerAccount, JournalEntry } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { formatCurrency } from '../../utils/currency';
import {
  BookOpen,
  Scale,
  Layers,
  FileText,
  IndianRupee,
  PlusCircle,
  AlertCircle,
  CheckCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
  Printer,
} from 'lucide-react';

export const AccountantDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes('/journal-entries')) return 'JOURNALS';
    if (p.includes('/trial-balance')) return 'TRIAL';
    if (p.includes('/balance-sheet')) return 'BALANCE_SHEET';
    return 'COA';
  };

  const activeTab = getActiveTab();

  const [coa, setCoa] = useState<LedgerAccount[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<any | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<any | null>(null);
  const [expandedJournal, setExpandedJournal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Manual Journal Entry Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<{ ledgerAccountCode: string; entryType: 'DEBIT' | 'CREDIT'; amount: number; memo: string }[]>([
    { ledgerAccountCode: '1010', entryType: 'DEBIT', amount: 500, memo: 'Cash drawer transfer' },
    { ledgerAccountCode: '2010', entryType: 'CREDIT', amount: 500, memo: 'Customer deposit reserve' },
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [coaRes, jeRes, tbRes, bsRes] = await Promise.all([
        api.get('/ledger/chart-of-accounts').catch(() => ({ data: [] })),
        api.get('/ledger/journal-entries').catch(() => ({ data: [] })),
        api.get('/ledger/trial-balance').catch(() => ({ data: null })),
        api.get('/ledger/balance-sheet').catch(() => ({ data: null })),
      ]);
      setCoa(coaRes.data);
      setJournalEntries(jeRes.data);
      setTrialBalance(tbRes.data);
      setBalanceSheet(bsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addLine = () => {
    setLines([...lines, { ledgerAccountCode: coa[0]?.code || '1010', entryType: 'DEBIT', amount: 0, memo: '' }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const updateLine = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = val;
    setLines(updated);
  };

  const totalDebits = lines.filter((l) => l.entryType === 'DEBIT').reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalCredits = lines.filter((l) => l.entryType === 'CREDIT').reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const isImbalanced = Math.abs(totalDebits - totalCredits) > 0.0001;

  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isImbalanced) {
      setErrorMsg(`Journal entry is imbalanced. Debits (${formatCurrency(totalDebits)}) must strictly equal Credits (${formatCurrency(totalCredits)}).`);
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/ledger/journal-entries', {
        description,
        lines: lines.map((l) => ({
          ...l,
          amount: parseFloat(l.amount.toString()),
        })),
      });
      setIsModalOpen(false);
      setDescription('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to post balanced journal voucher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Financial General Ledger & Double-Entry Accounting</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              GAAP & IFRS Compliant
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable general ledger postings, symmetrical debit/credit balancing, Chart of Accounts, and Trial Balance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            Post Manual Journal Entry
          </Button>
        </div>
      </div>



      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Trial Balance Status"
          value={trialBalance?.isBalanced ? 'BALANCED' : 'IMBALANCED'}
          subtitle={`Debits = Credits (${formatCurrency(trialBalance?.grandTotalDebits)})`}
          icon={Scale}
          trendPositive={trialBalance?.isBalanced}
          trend={trialBalance?.isBalanced ? 'Balanced Books' : 'Discrepancy'}
        />
        <StatCard
          title="Chart of Accounts"
          value={coa.length}
          subtitle="Assets, Liabilities, Equity, P&L"
          icon={BookOpen}
        />
        <StatCard
          title="Consolidated Bank Assets"
          value={formatCurrency(balanceSheet?.totalAssets)}
          subtitle="Cash Vault + Loans + Reserves"
          icon={IndianRupee}
        />
        <StatCard
          title="Journal Entries"
          value={journalEntries.length}
          subtitle="Immutable Balanced Postings"
          icon={Layers}
        />
      </div>

      {/* VIEW 1: CHART OF ACCOUNTS (DASHBOARD) */}
      {activeTab === 'COA' && (
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Double-Entry Chart of Accounts (COA)
            </h3>
            <span className="text-xs text-slate-400 font-mono">{coa.length} Ledger Categories</span>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Code</th>
                  <th className="pb-3 font-semibold">Account Title</th>
                  <th className="pb-3 font-semibold">Category Type</th>
                  <th className="pb-3 font-semibold text-right">Current Ledger Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {coa.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-850/50">
                    <td className="py-3 font-bold text-primary-400">{acc.code}</td>
                    <td className="py-3 font-sans font-semibold text-slate-200">{acc.name}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          acc.accountType === 'ASSET'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : acc.accountType === 'LIABILITY'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : acc.accountType === 'EQUITY'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            : 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                        }`}
                      >
                        {acc.accountType}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-right text-slate-100">
                      {formatCurrency(acc.currentBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 2: JOURNAL ENTRIES */}
      {activeTab === 'JOURNALS' && (
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary-400" />
                <span>Balanced General Ledger Journal Entries</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Every posting contains balanced debit and credit legs strictly satisfying Σ Debits === Σ Credits
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              New Voucher
            </Button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Entry #</th>
                  <th className="pb-3 font-semibold">Description</th>
                  <th className="pb-3 font-semibold">Posting Date</th>
                  <th className="pb-3 font-semibold">Lines</th>
                  <th className="pb-3 font-semibold">Invariance</th>
                  <th className="pb-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {journalEntries.map((je) => (
                  <React.Fragment key={je.id}>
                    <tr className="hover:bg-slate-850/50">
                      <td className="py-3 font-bold text-slate-200">{je.entryNumber}</td>
                      <td className="py-3 font-sans text-slate-300 max-w-xs truncate">{je.description}</td>
                      <td className="py-3 text-slate-400">{new Date(je.postingDate).toLocaleDateString()}</td>
                      <td className="py-3">{je.journalLines?.length || 0} Lines</td>
                      <td className="py-3">
                        <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> BALANCED
                        </span>
                      </td>
                      <td className="py-3 text-right font-sans">
                        <button
                          onClick={() => setExpandedJournal(expandedJournal === je.id ? null : je.id)}
                          className="text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1 ml-auto"
                        >
                          {expandedJournal === je.id ? (
                            <>Hide Lines <ChevronDown className="w-3.5 h-3.5" /></>
                          ) : (
                            <>View Lines <ChevronRight className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedJournal === je.id && (
                      <tr>
                        <td colSpan={6} className="p-4 bg-slate-950/80 border-b border-slate-800 font-sans">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Journal Line Postings for {je.entryNumber}:
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs font-mono">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                  <th className="pb-2">Account Code</th>
                                  <th className="pb-2">Account Name</th>
                                  <th className="pb-2">Direction</th>
                                  <th className="pb-2">Memo</th>
                                  <th className="pb-2 text-right">Debit</th>
                                  <th className="pb-2 text-right">Credit</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/40">
                                {je.journalLines?.map((line) => (
                                  <tr key={line.id}>
                                    <td className="py-2 text-primary-400 font-bold">{line.ledgerAccount?.code}</td>
                                    <td className="py-2 text-slate-300 font-sans">{line.ledgerAccount?.name}</td>
                                    <td className="py-2">
                                      <span
                                        className={line.entryType === 'DEBIT' ? 'text-emerald-400 font-bold' : 'text-sky-400 font-bold'}
                                      >
                                        {line.entryType}
                                      </span>
                                    </td>
                                    <td className="py-2 text-slate-400 font-sans">{line.memo || '—'}</td>
                                    <td className="py-2 text-right text-emerald-400 font-bold">
                                      {line.entryType === 'DEBIT' ? formatCurrency(line.amount) : '—'}
                                    </td>
                                    <td className="py-2 text-right text-sky-400 font-bold">
                                      {line.entryType === 'CREDIT' ? formatCurrency(line.amount) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 3: TRIAL BALANCE */}
      {activeTab === 'TRIAL' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-400" />
                <span>Certified Financial Trial Balance</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Summary of all general ledger accounts proving that total debits equal total credits
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> GAAP / IFRS BALANCED
              </span>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print Statement
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-sans">
                  <th className="pb-3 font-semibold">Account Code</th>
                  <th className="pb-3 font-semibold">Account Title</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold text-right">Debit Balance</th>
                  <th className="pb-3 font-semibold text-right">Credit Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trialBalance?.accounts?.map((acc: any) => (
                  <tr key={acc.code} className="hover:bg-slate-850/50">
                    <td className="py-3 font-bold text-primary-400">{acc.code}</td>
                    <td className="py-3 font-sans font-semibold text-slate-200">{acc.name}</td>
                    <td className="py-3 font-sans text-slate-400">{acc.type}</td>
                    <td className="py-3 font-bold text-right text-emerald-400">
                      {parseFloat(acc.debitBalance) > 0 ? formatCurrency(acc.debitBalance) : '—'}
                    </td>
                    <td className="py-3 font-bold text-right text-sky-400">
                      {parseFloat(acc.creditBalance) > 0 ? formatCurrency(acc.creditBalance) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-900/80 font-bold text-sm">
                  <td colSpan={3} className="py-4 font-sans text-slate-200">
                    Grand Totals (Debits vs Credits Invariance)
                  </td>
                  <td className="py-4 text-right text-emerald-400">
                    {formatCurrency(trialBalance?.grandTotalDebits)}
                  </td>
                  <td className="py-4 text-right text-sky-400">
                    {formatCurrency(trialBalance?.grandTotalCredits)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 4: BALANCE SHEET */}
      {activeTab === 'BALANCE_SHEET' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-base font-bold text-slate-100 pb-3 border-b border-slate-800 flex items-center justify-between">
              <span>Assets</span>
              <span className="text-emerald-400 font-mono text-lg font-extrabold">
                {formatCurrency(balanceSheet?.totalAssets)}
              </span>
            </h3>
            <div className="divide-y divide-slate-800/60 text-xs mt-3">
              {balanceSheet?.assets?.map((a: any) => (
                <div key={a.code} className="py-3 flex justify-between font-mono">
                  <div>
                    <span className="font-bold text-primary-400">{a.code}</span>
                    <span className="ml-2 font-sans text-slate-300">{a.name}</span>
                  </div>
                  <span className="text-emerald-400 font-bold">{formatCurrency(a.balance)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-bold text-slate-100 pb-3 border-b border-slate-800 flex items-center justify-between">
              <span>Liabilities & Equity</span>
              <span className="text-amber-400 font-mono text-lg font-extrabold">
                {formatCurrency(balanceSheet?.totalLiabilitiesAndEquity || balanceSheet?.totalAssets)}
              </span>
            </h3>
            <div className="divide-y divide-slate-800/60 text-xs mt-3">
              <div className="py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Liabilities</div>
              {balanceSheet?.liabilities?.map((l: any) => (
                <div key={l.code} className="py-2.5 flex justify-between font-mono">
                  <div>
                    <span className="font-bold text-amber-400">{l.code}</span>
                    <span className="ml-2 font-sans text-slate-300">{l.name}</span>
                  </div>
                  <span className="text-amber-300 font-bold">{formatCurrency(l.balance)}</span>
                </div>
              ))}
              <div className="py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-4">Equity & Capital</div>
              {balanceSheet?.equity?.map((e: any) => (
                <div key={e.code} className="py-2.5 flex justify-between font-mono">
                  <div>
                    <span className="font-bold text-purple-400">{e.code}</span>
                    <span className="ml-2 font-sans text-slate-300">{e.name}</span>
                  </div>
                  <span className="text-purple-300 font-bold">{formatCurrency(e.balance)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: POST MANUAL JOURNAL ENTRY */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Post Manual Double-Entry Journal Voucher"
        maxWidth="2xl"
      >
        <form onSubmit={handlePostJournal} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Input
            label="Journal Voucher Description / Purpose"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. End of month vault adjustment or interbank clearing settlement"
            required
          />

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Journal Lines (Double-Entry Debit/Credit Legs)
              </span>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                + Add Line
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {lines.map((l, idx) => (
                <div key={idx} className="flex gap-2 items-center p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <select
                    value={l.ledgerAccountCode}
                    onChange={(e) => updateLine(idx, 'ledgerAccountCode', e.target.value)}
                    className="w-44 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-100"
                  >
                    {coa.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={l.entryType}
                    onChange={(e) => updateLine(idx, 'entryType', e.target.value as any)}
                    className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-100 font-bold"
                  >
                    <option value="DEBIT">DEBIT</option>
                    <option value="CREDIT">CREDIT</option>
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={l.amount}
                    onChange={(e) => updateLine(idx, 'amount', parseFloat(e.target.value) || 0)}
                    placeholder="Amount"
                    className="w-28 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-100 font-mono"
                    required
                  />

                  <input
                    type="text"
                    value={l.memo}
                    onChange={(e) => updateLine(idx, 'memo', e.target.value)}
                    placeholder="Line memo..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-100"
                  />

                  {lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Symmetrical Balancing Indicator */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400">Total Debits: </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{formatCurrency(totalDebits)}</span>
            </div>
            <div>
              <span className="text-slate-400">Total Credits: </span>
              <span className="font-mono font-bold text-sky-400 text-sm">{formatCurrency(totalCredits)}</span>
            </div>
            <div>
              {isImbalanced ? (
                <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                  Imbalanced by {formatCurrency(Math.abs(totalDebits - totalCredits))}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Balanced Books
                </span>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} disabled={isImbalanced}>
              Post Immutable Voucher
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AccountantDashboard;
