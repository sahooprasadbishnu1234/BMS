import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { LedgerAccount, JournalEntry } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  BookOpen,
  Scale,
  Layers,
  FileText,
  DollarSign,
  PlusCircle,
  AlertCircle,
  CheckCircle,
  Trash2,
} from 'lucide-react';

export const AccountantDashboard: React.FC = () => {
  const [coa, setCoa] = useState<LedgerAccount[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<any | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'TRIAL' | 'COA' | 'JOURNALS' | 'BALANCE_SHEET'>('TRIAL');

  // Manual Journal Entry Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<{ ledgerAccountCode: string; entryType: 'DEBIT' | 'CREDIT'; amount: number; memo: string }[]>([
    { ledgerAccountCode: '1010', entryType: 'DEBIT', amount: 500, memo: '' },
    { ledgerAccountCode: '4020', entryType: 'CREDIT', amount: 500, memo: '' },
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [coaRes, jeRes, tbRes, bsRes] = await Promise.all([
        api.get('/ledger/chart-of-accounts'),
        api.get('/ledger/journal-entries'),
        api.get('/ledger/trial-balance'),
        api.get('/ledger/balance-sheet'),
      ]);
      setCoa(coaRes.data);
      setJournalEntries(jeRes.data);
      setTrialBalance(tbRes.data);
      setBalanceSheet(bsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addLine = () => {
    setLines([...lines, { ledgerAccountCode: '2010', entryType: 'DEBIT', amount: 0, memo: '' }]);
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
  const isImbalanced = totalDebits !== totalCredits;

  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isImbalanced) {
      setErrorMsg(`Entry is imbalanced. Debits ($${totalDebits}) must equal Credits ($${totalCredits}).`);
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
      setErrorMsg(err.response?.data?.message || 'Failed to post entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Financial General Ledger & Double-Entry Accounting
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            GAAP & IFRS balanced journal vouchers, Chart of Accounts, and Trial Balance reports
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Post Manual Journal Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Trial Balance Status"
          value={trialBalance?.isBalanced ? 'BALANCED' : 'IMBALANCED'}
          subtitle={`Debits = Credits ($${trialBalance?.grandTotalDebits || '0'})`}
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
          title="Total Assets"
          value={`$${balanceSheet?.totalAssets ? parseFloat(balanceSheet.totalAssets).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}`}
          subtitle="Cash Vault + Loans + Clearing"
          icon={DollarSign}
        />
        <StatCard
          title="Journal Entries"
          value={journalEntries.length}
          subtitle="Posted Immutable Records"
          icon={Layers}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
        {[
          { id: 'TRIAL', label: 'Trial Balance' },
          { id: 'COA', label: 'Chart of Accounts (COA)' },
          { id: 'JOURNALS', label: 'Journal Entries' },
          { id: 'BALANCE_SHEET', label: 'Balance Sheet' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-primary-500 text-primary-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Trial Balance */}
      {activeTab === 'TRIAL' && (
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              General Ledger Trial Balance Statement
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              SUM(DEBIT) == SUM(CREDIT) VERIFIED
            </span>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Account Code</th>
                  <th className="pb-3 font-semibold">Account Title</th>
                  <th className="pb-3 font-semibold">Classification</th>
                  <th className="pb-3 font-semibold text-right">Debit Total</th>
                  <th className="pb-3 font-semibold text-right">Credit Total</th>
                  <th className="pb-3 font-semibold text-right">Net Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {trialBalance?.rows?.map((row: any) => (
                  <tr key={row.code} className="hover:bg-slate-850/50">
                    <td className="py-2.5 font-bold text-primary-400">{row.code}</td>
                    <td className="py-2.5 font-sans font-semibold text-slate-200">{row.name}</td>
                    <td className="py-2.5 text-slate-400">{row.accountType}</td>
                    <td className="py-2.5 text-right text-slate-300">${parseFloat(row.totalDebits).toFixed(2)}</td>
                    <td className="py-2.5 text-right text-slate-300">${parseFloat(row.totalCredits).toFixed(2)}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-400">
                      ${parseFloat(row.netBalance).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Chart of Accounts */}
      {activeTab === 'COA' && (
        <Card>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 pb-3 border-b border-slate-800">
            Standard Chart of Accounts (COA) Directory
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {coa.map((acc) => (
              <div key={acc.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-primary-400 text-xs">[{acc.code}]</span>
                  <div className="font-bold text-slate-200 text-xs mt-0.5">{acc.name}</div>
                  <span className="text-[10px] text-slate-400">{acc.accountType}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    ${parseFloat(acc.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 3: Journal Entries */}
      {activeTab === 'JOURNALS' && (
        <Card>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 pb-3 border-b border-slate-800">
            Posted General Ledger Journal Vouchers
          </h3>
          <div className="space-y-4 mt-4">
            {journalEntries.map((je) => (
              <div key={je.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <div className="font-mono font-bold text-primary-400">{je.entryNumber}</div>
                  <div className="text-slate-400">{new Date(je.postingDate).toLocaleDateString()}</div>
                </div>
                <p className="text-slate-300 font-medium">{je.description}</p>
                <div className="space-y-1 font-mono text-[11px] pt-1">
                  {je.journalLines.map((l) => (
                    <div key={l.id} className="flex justify-between text-slate-400">
                      <span>{l.entryType === 'DEBIT' ? 'DR' : 'CR'} [{l.ledgerAccount.code}] {l.ledgerAccount.name}</span>
                      <span className={l.entryType === 'DEBIT' ? 'text-sky-400 font-bold' : 'text-emerald-400 font-bold'}>
                        ${parseFloat(l.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Balance Sheet */}
      {activeTab === 'BALANCE_SHEET' && balanceSheet && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 pb-3 border-b border-slate-800">
              Assets
            </h3>
            <div className="space-y-2.5 mt-3 text-xs">
              {balanceSheet.assets.map((a: any) => (
                <div key={a.code} className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-300">[{a.code}] {a.name}</span>
                  <span className="font-mono font-bold text-slate-100">${parseFloat(a.balance).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 font-bold text-sm text-emerald-400 border-t border-slate-800">
                <span>Total Assets:</span>
                <span className="font-mono">${parseFloat(balanceSheet.totalAssets).toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 pb-3 border-b border-slate-800">
              Liabilities & Equity
            </h3>
            <div className="space-y-2.5 mt-3 text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-500">Liabilities (Customer Deposits)</div>
              {balanceSheet.liabilities.map((l: any) => (
                <div key={l.code} className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-300">[{l.code}] {l.name}</span>
                  <span className="font-mono font-bold text-slate-100">${parseFloat(l.balance).toFixed(2)}</span>
                </div>
              ))}
              <div className="text-[10px] uppercase font-bold text-slate-500 pt-2">Equity (Common Capital)</div>
              {balanceSheet.equity.map((e: any) => (
                <div key={e.code} className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-300">[{e.code}] {e.name}</span>
                  <span className="font-mono font-bold text-slate-100">${parseFloat(e.balance).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 font-bold text-sm text-emerald-400 border-t border-slate-800">
                <span>Total Liabilities & Equity:</span>
                <span className="font-mono">${parseFloat(balanceSheet.totalLiabilitiesAndEquity).toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Manual Journal Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Post Balanced Double-Entry Journal Entry"
        maxWidth="xl"
      >
        <form onSubmit={handlePostJournal} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <Input
            label="Transaction Voucher Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Month-end adjustment for physical cash count variance"
            required
          />

          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Journal Lines (Debits and Credits)
              </span>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-semibold text-primary-400 hover:text-primary-300"
              >
                + Add Line
              </button>
            </div>

            {lines.map((l, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <select
                  value={l.ledgerAccountCode}
                  onChange={(e) => updateLine(idx, 'ledgerAccountCode', e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                >
                  {coa.map((a) => (
                    <option key={a.code} value={a.code}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>

                <select
                  value={l.entryType}
                  onChange={(e) => updateLine(idx, 'entryType', e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-bold"
                >
                  <option value="DEBIT">DEBIT (DR)</option>
                  <option value="CREDIT">CREDIT (CR)</option>
                </select>

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={l.amount}
                  onChange={(e) => updateLine(idx, 'amount', parseFloat(e.target.value))}
                  placeholder="Amount"
                  className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                  required
                />

                <input
                  type="text"
                  value={l.memo}
                  onChange={(e) => updateLine(idx, 'memo', e.target.value)}
                  placeholder="Memo (optional)"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100"
                />

                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="p-1 text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Running Balance Check */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center text-xs font-mono">
            <div>
              <span className="text-slate-400">Total Debits: </span>
              <span className="font-bold text-sky-400">${totalDebits.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400">Total Credits: </span>
              <span className="font-bold text-emerald-400">${totalCredits.toFixed(2)}</span>
            </div>
            <div>
              {isImbalanced ? (
                <span className="text-rose-400 font-bold">Imbalance: ${(totalDebits - totalCredits).toFixed(2)}</span>
              ) : (
                <span className="text-emerald-400 font-bold">✓ Perfectly Balanced</span>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isImbalanced}
              isLoading={isSubmitting}
            >
              Post Balanced Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
