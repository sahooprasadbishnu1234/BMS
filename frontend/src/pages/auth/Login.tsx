import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { RoleName } from '../../types';
import { Building2, Shield, Lock, AlertCircle, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                Quick 1-Click Demo Login (All 10 Roles)
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
