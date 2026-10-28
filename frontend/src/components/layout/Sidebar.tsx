import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Wallet,
  ArrowRightLeft,
  FileText,
  BadgePercent,
  LifeBuoy,
  ShieldCheck,
  Building,
  Users,
  Layers,
  Scale,
  CheckSquare,
  BookOpen,
  IndianRupee,
  AlertTriangle,
  Settings,
  Activity,
  History,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeRole } = useAuth();

  const getNavLinks = () => {
    switch (activeRole) {
      case 'CUSTOMER':
        return [
          { to: '/dashboard', label: 'My Accounts', icon: Wallet },
          { to: '/transfers', label: 'Transfer Funds', icon: ArrowRightLeft },
          { to: '/statements', label: 'Account Statements', icon: FileText },
          { to: '/loans', label: 'My Loans & Credit', icon: BadgePercent },
          { to: '/support', label: 'Support & Disputes', icon: LifeBuoy },
        ];
      case 'BANK_MANAGER':
        return [
          { to: '/dashboard', label: 'Executive Dashboard', icon: Activity },
          { to: '/customers', label: 'Customer Management', icon: Users },
          { to: '/approvals', label: 'Pending Approvals', icon: CheckSquare },
          { to: '/accounts', label: 'All Bank Accounts', icon: Wallet },
          { to: '/branches', label: 'Branch Performance', icon: Building },
          { to: '/audit', label: 'Forensic Audit Logs', icon: History },
        ];
      case 'BRANCH_MANAGER':
        return [
          { to: '/dashboard', label: 'Branch Operations', icon: Building },
          { to: '/customers', label: 'Customer Management', icon: Users },
          { to: '/approvals', label: 'Pending Approvals', icon: CheckSquare },
          { to: '/teller-reconciliation', label: 'Cash Reconciliation', icon: IndianRupee },
          { to: '/accounts', label: 'Branch Accounts', icon: Wallet },
          { to: '/loans', label: 'Branch Loans Queue', icon: BadgePercent },
        ];
      case 'BANK_TELLER':
        return [
          { to: '/dashboard', label: 'Teller Counter', icon: IndianRupee },
          { to: '/deposits', label: 'Cash Deposit', icon: Wallet },
          { to: '/withdrawals', label: 'Cash Withdrawal', icon: ArrowRightLeft },
          { to: '/transactions', label: 'Daily Session History', icon: History },
        ];
      case 'ACCOUNTANT':
        return [
          { to: '/dashboard', label: 'General Ledger', icon: BookOpen },
          { to: '/journal-entries', label: 'Journal Postings', icon: Layers },
          { to: '/trial-balance', label: 'Trial Balance', icon: Scale },
          { to: '/balance-sheet', label: 'Balance Sheet', icon: FileText },
        ];
      case 'LOAN_OFFICER':
        return [
          { to: '/dashboard', label: 'Underwriting Queue', icon: BadgePercent },
          { to: '/calculator', label: 'Loan EMI Calculator', icon: IndianRupee },
          { to: '/applications', label: 'Credit Applications', icon: FileText },
        ];
      case 'CUSTOMER_SERVICE_OFFICER':
        return [
          { to: '/dashboard', label: 'Support Queue', icon: LifeBuoy },
          { to: '/customers', label: 'Customer Directory', icon: Users },
          { to: '/tickets', label: 'Dispute Management', icon: FileText },
        ];
      case 'SYSTEM_ADMINISTRATOR':
        return [
          { to: '/dashboard', label: 'Admin Console', icon: Settings },
          { to: '/customers', label: 'Customer Management', icon: Users },
          { to: '/users', label: 'IAM User Provisioning', icon: Users },
          { to: '/security-audit', label: 'Security & Access Logs', icon: ShieldCheck },
        ];
      case 'AUDITOR':
        return [
          { to: '/dashboard', label: 'Audit Inspection', icon: ShieldCheck },
          { to: '/transactions', label: 'Immutable Ledger Audit', icon: History },
          { to: '/logs', label: 'Forensic System Logs', icon: FileText },
        ];
      case 'COMPLIANCE_OFFICER':
        return [
          { to: '/dashboard', label: 'Compliance & AML', icon: AlertTriangle },
          { to: '/cases', label: 'Suspicious Activity (SAR)', icon: ShieldCheck },
          { to: '/ctr', label: 'Large Cash Reports', icon: IndianRupee },
        ];
      default:
        return [{ to: '/dashboard', label: 'Dashboard', icon: Activity }];
    }
  };

  const links = getNavLinks();

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-61px)]">
      <div className="p-4 border-b border-slate-800/80">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
          Role Workspace
        </div>
        <div className="text-xs font-extrabold text-slate-200 tracking-tight">
          {activeRole?.replace(/_/g, ' ')}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="font-semibold text-slate-400">Core Node 18.x Active</span>
        </div>
        <div>Double-Entry GL ACID Compliant</div>
      </div>
    </aside>
  );
};
