import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { RoleName } from '../../types';
import {
  Building2,
  AlertCircle,
  Sparkles,
  Users,
  Search,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/currency';

interface ExistingCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  customerNumber: string;
  accounts: {
    id: string;
    accountNumber: string;
    accountType: string;
    balance: string;
    availableBalance?: string;
  }[];
  primaryAccount?: {
    accountNumber: string;
    accountType: string;
    balance: string;
  };
  balance?: string;
}

export const Login: React.FC = () => {
  const { login, demoLogin, quickCustomerLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing Customers on Front Page
  const [existingCustomers, setExistingCustomers] = useState<ExistingCustomer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  const fetchExistingCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const res = await api.get('/auth/demo-customers');
      setExistingCustomers(res.data);
    } catch (err) {
      console.error('Failed to load existing customers:', err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchExistingCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Invalid banking credentials or locked account.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role: RoleName) => {
    setError(null);
    setIsLoading(true);
    try {
      await demoLogin(role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed demo authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCustomer = async (custEmail: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await quickCustomerLogin(custEmail);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed customer login.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleButtons: { role: RoleName; label: string; badge: string }[] = [
    { role: 'CUSTOMER', label: 'Alice Johnson', badge: 'Customer' },
    { role: 'BANK_MANAGER', label: 'Victoria Sterling', badge: 'Bank Manager' },
    { role: 'BRANCH_MANAGER', label: 'Marcus Chen', badge: 'Branch Manager' },
    { role: 'BANK_TELLER', label: 'Elena Rostova', badge: 'Teller / Cashier' },
    { role: 'ACCOUNTANT', label: 'David Kowalski', badge: 'Accountant' },
    { role: 'LOAN_OFFICER', label: 'Sarah Jenkins', badge: 'Loan Officer' },
    { role: 'CUSTOMER_SERVICE_OFFICER', label: 'Liam O’Connor', badge: 'Support Officer' },
    { role: 'SYSTEM_ADMINISTRATOR', label: 'Alexander Vance', badge: 'System Admin' },
    { role: 'AUDITOR', label: 'Jonathan Reid', badge: 'Auditor' },
    { role: 'COMPLIANCE_OFFICER', label: 'Rachel Zane', badge: 'Compliance (AML)' },
  ];

  const filteredCustomers = existingCustomers.filter((c) => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.customerNumber.toLowerCase().includes(q) ||
      c.accounts.some((a) => a.accountNumber.includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex p-3 bg-gradient-to-tr from-primary-600 to-sky-400 rounded-2xl shadow-xl shadow-primary-950/60 mb-4">
          <Building2 className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-100">
          APEX GLOBAL BMS
        </h2>
        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-primary-400">
          Enterprise Core Banking Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
        <Card className="border border-slate-800 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* FRONT PAGE: CLICK TO VIEW ALL EXISTING CUSTOMERS */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-primary-950/70 via-slate-900 to-slate-900 border border-primary-500/40 hover:border-primary-400 text-slate-100 transition-all shadow-md group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/20 text-primary-400 group-hover:bg-primary-500/30 transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-100 group-hover:text-primary-300 flex items-center gap-2">
                    <span>Click to View All Existing Customers</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      Live Database
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Click any customer name below for instant 1-click login
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary-400">
                  {existingCustomers.length} Customers
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    showCustomerDropdown ? 'rotate-180 text-primary-400' : ''
                  }`}
                />
              </div>
            </button>

            {showCustomerDropdown && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-900/95 border border-primary-500/30 shadow-2xl space-y-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by customer name, email, or account number..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/60">
                  {filteredCustomers.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500">
                      {isLoadingCustomers ? 'Loading registered customers...' : 'No matching customers found.'}
                    </div>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const primaryAcc = cust.accounts?.[0];
                      return (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => handleSelectCustomer(cust.email)}
                          disabled={isLoading}
                          className="w-full text-left p-2.5 rounded-lg hover:bg-slate-800/80 transition-all flex items-center justify-between group border border-transparent hover:border-slate-700/60"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-300 font-bold text-xs shrink-0">
                              {cust.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-100 group-hover:text-primary-300 truncate">
                                {cust.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {cust.email} • {cust.customerNumber}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-3">
                            {primaryAcc && (
                              <div className="text-xs font-mono font-bold text-emerald-400">
                                {formatCurrency(primaryAcc.balance)}
                              </div>
                            )}
                            <div className="text-[10px] text-primary-400 font-semibold flex items-center gap-1 justify-end">
                              <span>1-Click Login</span>
                              <UserCheck className="w-3 h-3" />
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Banking Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@bms.bank"
              required
            />

            <Input
              label="Master Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={isLoading}>
              Sign In to Banking Portal
            </Button>
          </form>

          {/* Quick 1-Click Role Logins for Demonstrations */}
          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Staff & Officer 1-Click Demo Login
              </span>
              <span className="text-[10px] text-slate-500">Auto-filled</span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {roleButtons.map((rb) => (
                <button
                  key={rb.role}
                  type="button"
                  onClick={() => handleQuickLogin(rb.role)}
                  disabled={isLoading}
                  className="text-left p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800/90 hover:border-primary-500/30 transition-all text-xs group"
                >
                  <div className="font-semibold text-slate-200 group-hover:text-primary-300">
                    {rb.label}
                  </div>
                  <div className="text-[10px] text-slate-500">{rb.badge}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-slate-400">
            Don't have a retail account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-semibold underline">
              Register as New Customer
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
