import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RoleName } from '../../types';
import {
  Bell,
  LogOut,
  Building2,
  ChevronDown,
  User as UserIcon,
  CheckCircle,
} from 'lucide-react';
import api from '../../services/api';

export const Navbar: React.FC = () => {
  const { user, activeRole, setActiveRole, logout, demoLogin } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const rolesList: { id: RoleName; label: string; desc: string }[] = [
    { id: 'CUSTOMER', label: 'Customer / Retail User', desc: 'Self-service deposits, transfers, loans' },
    { id: 'BANK_MANAGER', label: 'Bank Manager (HQ)', desc: 'Executive supervision & high-value approvals' },
    { id: 'BRANCH_MANAGER', label: 'Branch Manager', desc: 'Branch cash reconciliation & staff oversight' },
    { id: 'BANK_TELLER', label: 'Bank Teller / Cashier', desc: 'Over-the-counter deposits & withdrawals' },
    { id: 'ACCOUNTANT', label: 'Accountant', desc: 'Double-entry general ledger & trial balance' },
    { id: 'LOAN_OFFICER', label: 'Loan Underwriting Officer', desc: 'Credit assessment & repayment schedules' },
    { id: 'CUSTOMER_SERVICE_OFFICER', label: 'Customer Service Officer', desc: 'Dispute tickets & CRM management' },
    { id: 'SYSTEM_ADMINISTRATOR', label: 'System Administrator', desc: 'IAM user provisioning & security controls' },
    { id: 'AUDITOR', label: 'Forensic Auditor', desc: 'Read-only immutable audit trail inspection' },
    { id: 'COMPLIANCE_OFFICER', label: 'AML Compliance Officer', desc: 'Anti-money laundering & CTR alerts' },
  ];

  useEffect(() => {
    if (user) {
      api.get('/notifications').then((res) => setNotifications(res.data)).catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleRoleSelect = async (role: RoleName) => {
    setShowRoleMenu(false);
    if (user?.roles.includes(role)) {
      setActiveRole(role);
    } else {
      // Fast demo login for immediate evaluator role-switching
      await demoLogin(role);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center justify-between px-6 py-3.5">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-primary-600 to-sky-400 rounded-xl shadow-lg shadow-primary-950/50">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              APEX GLOBAL BMS
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
              Enterprise Core
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-all shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400 hidden sm:inline">Role:</span>
              <span className="text-primary-300 font-bold">{activeRole?.replace(/_/g, ' ')}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Active Role (All 10 Roles)
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                  {rolesList.map((r) => {
                    const isSelected = activeRole === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleRoleSelect(r.id)}
                        className={`w-full text-left px-3.5 py-2 flex items-start justify-between text-xs transition-colors hover:bg-slate-800/80 ${
                          isSelected ? 'bg-primary-950/40 text-primary-300' : 'text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{r.label}</div>
                          <div className="text-[10px] text-slate-500">{r.desc}</div>
                        </div>
                        {isSelected && <CheckCircle className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-slate-900" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Notifications
                  </span>
                  <span className="text-[10px] font-semibold text-primary-400">
                    {unreadCount} unread
                  </span>
                </div>
                <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">No alerts present</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="py-2.5 text-xs">
                        <p className="font-semibold text-slate-200">{n.title}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{n.message}</p>
                        <span className="text-[9px] text-slate-500 mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden md:block text-right">
              <div className="text-xs font-bold text-slate-100">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-[10px] text-slate-400">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
