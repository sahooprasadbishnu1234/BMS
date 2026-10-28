import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Building2, AlertCircle, Wallet, Eye, EyeOff } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login, setAuthData } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('Salaried Professional');
  const [monthlyIncome, setMonthlyIncome] = useState('50000');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Primary Bank Account Provisioning
  const [accountType, setAccountType] = useState<'SAVINGS' | 'CURRENT'>('SAVINGS');
  const [kycStatus, setKycStatus] = useState<'VERIFIED' | 'PENDING' | 'UNVERIFIED'>('VERIFIED');
  const [initialDeposit, setInitialDeposit] = useState('500');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields marked with *');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    const depositNum = Number(initialDeposit);
    if (accountType === 'SAVINGS' && depositNum < 500) {
      setError('A minimum initial deposit of ₹500 is required for a Savings Account.');
      return;
    }
    if (accountType === 'CURRENT' && depositNum < 0) {
      setError('Initial deposit cannot be negative.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', {
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        occupation: occupation.trim() || undefined,
        monthlyIncome: monthlyIncome ? Number(monthlyIncome) : undefined,
        accountType,
        kycStatus,
        initialDeposit: depositNum,
      });

      // Automatically store session if registration returned auth tokens
      if (res.data?.accessToken && res.data?.user) {
        setAuthData(res.data.user, res.data.accessToken, res.data.refreshToken);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      const serverMessage = err.response?.data?.message;
      if (serverMessage) {
        setError(serverMessage);
      } else if (err.message === 'Network Error') {
        setError('Cannot connect to banking core API. Please ensure the backend server is running.');
      } else {
        setError('Registration failed. Please check your information and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 text-center">
        <div className="inline-flex p-3 bg-gradient-to-tr from-primary-600 to-sky-400 rounded-2xl shadow-xl shadow-primary-950/60 mb-3">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
          Onboard New Retail Customer
        </h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-primary-400">
          APEX Retail Online Banking
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 px-4">
        <Card className="border border-slate-800 shadow-2xl backdrop-blur-xl bg-slate-950/90 p-5 sm:p-7">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between gap-2.5 text-xs text-rose-400">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {error.toLowerCase().includes('already exists') && (
                <Link
                  to="/login"
                  className="font-bold underline text-primary-400 hover:text-primary-300 ml-2 whitespace-nowrap"
                >
                  Sign In
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First Name *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Rohit"
                required
              />
              <Input
                label="Last Name *"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Sharma"
                required
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Email Address *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rohit.sharma@example.com"
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>

            {/* Occupation & Income */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Occupation / Sector"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Salaried Professional"
              />
              <Input
                label="Monthly Income (INR)"
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="50000"
              />
            </div>

            {/* Password */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Password (Min 8 Characters) *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide Password' : 'Show Password'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password for online banking login"
                  minLength={8}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 font-mono text-xs"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                You will use your email and this password to sign into your banking dashboard.
              </p>
            </div>

            {/* Primary Bank Account Provisioning Section */}
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-primary-400" />
                <span>Primary Bank Account Provisioning</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Account Type
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => {
                      const newType = e.target.value as 'SAVINGS' | 'CURRENT';
                      setAccountType(newType);
                      if (newType === 'SAVINGS' && Number(initialDeposit) < 500) {
                        setInitialDeposit('500');
                      } else if (newType === 'CURRENT' && initialDeposit === '500') {
                        setInitialDeposit('0');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-primary-500 text-xs"
                  >
                    <option value="SAVINGS">SAVINGS ACCOUNT (Min ₹500)</option>
                    <option value="CURRENT">CURRENT ACCOUNT (Min ₹0)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    KYC State
                  </label>
                  <select
                    value={kycStatus}
                    onChange={(e) => setKycStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-primary-500 text-xs"
                  >
                    <option value="VERIFIED">VERIFIED (Full Access)</option>
                    <option value="PENDING">PENDING REVIEW</option>
                    <option value="UNVERIFIED">UNVERIFIED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Initial Deposit (INR)
                  </label>
                  <input
                    type="number"
                    min={accountType === 'SAVINGS' ? '500' : '0'}
                    value={initialDeposit}
                    onChange={(e) => setInitialDeposit(e.target.value)}
                    placeholder={accountType === 'SAVINGS' ? '500' : '0'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-primary-500 text-xs font-mono"
                    required
                  />
                  <span className="text-[10px] text-amber-400/90 mt-1 block">
                    {accountType === 'SAVINGS'
                      ? '⚠️ Min ₹500 required (must maintain ₹500)'
                      : 'Min ₹0 for current account'}
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4 font-bold"
              isLoading={isLoading}
            >
              Complete Onboarding & Issue Account
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-400">
            Already registered?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold underline">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
