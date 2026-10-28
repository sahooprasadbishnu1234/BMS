import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { CustomerRecord } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { formatCurrency } from '../../utils/currency';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Edit2,
  UserX,
  CheckCircle,
  AlertCircle,
  Building2,
  Wallet,
  ShieldCheck,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  IndianRupee,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  // Add Form State
  const [addFirstName, setAddFirstName] = useState('');
  const [addLastName, setAddLastName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addPassword, setAddPassword] = useState('Password123!');
  const [addOccupation, setAddOccupation] = useState('Salaried Professional');
  const [addMonthlyIncome, setAddMonthlyIncome] = useState('50000');
  const [addKycStatus, setAddKycStatus] = useState<'PENDING' | 'VERIFIED' | 'UNVERIFIED'>('VERIFIED');
  const [addAccountType, setAddAccountType] = useState<'SAVINGS' | 'CURRENT'>('SAVINGS');
  const [addInitialDeposit, setAddInitialDeposit] = useState('500');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Form State
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editMonthlyIncome, setEditMonthlyIncome] = useState('');
  const [editKycStatus, setEditKycStatus] = useState<any>('PENDING');
  const [editStatus, setEditStatus] = useState<any>('ACTIVE');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Deactivate State
  const [deactivateReason, setDeactivateReason] = useState('Requested by compliance review');
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // Success Feedback
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const fetchCustomers = async (targetPage = page) => {
    setIsLoading(true);
    try {
      const params: any = { page: targetPage, limit };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (kycFilter) params.kycStatus = kycFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/customers', { params });
      setCustomers(res.data.data || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
      setTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers(1);
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, kycFilter, statusFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addFirstName.trim() || !addLastName.trim() || !addEmail.trim()) {
      setAddError('First Name, Last Name, and Email Address are required.');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const res = await api.post('/customers', {
        firstName: addFirstName.trim(),
        lastName: addLastName.trim(),
        email: addEmail.trim().toLowerCase(),
        phone: addPhone.trim() || undefined,
        password: addPassword || 'Password123!',
        occupation: addOccupation.trim() || undefined,
        monthlyIncome: addMonthlyIncome ? Number(addMonthlyIncome) : undefined,
        kycStatus: addKycStatus,
        accountType: addAccountType,
        initialDeposit: addInitialDeposit ? Number(addInitialDeposit) : 0,
      });

      // Reset form on success only
      setAddFirstName('');
      setAddLastName('');
      setAddEmail('');
      setAddPhone('');
      setAddPassword('Password123!');
      setAddInitialDeposit('2500');
      setIsAddOpen(false);

      setSuccessBanner(
        `Customer ${res.data.customerNumber} (${res.data.user.firstName} ${res.data.user.lastName}) onboarded successfully! Account #${res.data.bankAccounts?.[0]?.accountNumber || ''} created.`,
      );
      setTimeout(() => setSuccessBanner(null), 8000);

      fetchCustomers(1);
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to onboard customer.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const openEditModal = (c: CustomerRecord) => {
    setSelectedCustomer(c);
    setEditFirstName(c.user.firstName);
    setEditLastName(c.user.lastName);
    setEditPhone(c.user.phone || '');
    setEditOccupation(c.occupation || '');
    setEditMonthlyIncome(c.monthlyIncome ? String(Number(c.monthlyIncome)) : '');
    setEditKycStatus(c.kycStatus);
    setEditStatus(c.user.status);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setEditError(null);

    setIsSubmittingEdit(true);
    try {
      await api.patch(`/customers/${selectedCustomer.id}`, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone.trim() || null,
        occupation: editOccupation.trim() || null,
        monthlyIncome: editMonthlyIncome ? Number(editMonthlyIncome) : null,
        kycStatus: editKycStatus,
        status: editStatus,
      });

      setIsEditOpen(false);
      setSuccessBanner(`Customer ${selectedCustomer.customerNumber} profile updated successfully.`);
      setTimeout(() => setSuccessBanner(null), 6000);
      fetchCustomers(page);
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update customer profile.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const openDeactivateModal = (c: CustomerRecord) => {
    setSelectedCustomer(c);
    setDeactivateReason('Administrative review and account hold');
    setDeactivateError(null);
    setIsDeactivateOpen(true);
  };

  const handleDeactivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setDeactivateError(null);

    setIsSubmittingDeactivate(true);
    try {
      await api.patch(`/customers/${selectedCustomer.id}/deactivate`, {
        reason: deactivateReason,
      });

      setIsDeactivateOpen(false);
      setSuccessBanner(
        `Customer ${selectedCustomer.customerNumber} has been suspended and linked accounts frozen.`,
      );
      setTimeout(() => setSuccessBanner(null), 6000);
      fetchCustomers(page);
    } catch (err: any) {
      setDeactivateError(err.response?.data?.message || 'Failed to deactivate customer.');
    } finally {
      setIsSubmittingDeactivate(false);
    }
  };

  const openViewModal = async (c: CustomerRecord) => {
    try {
      const res = await api.get(`/customers/${c.id}`);
      setSelectedCustomer(res.data);
    } catch {
      setSelectedCustomer(c);
    }
    setIsViewOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary-400" />
            <span>Customer Relationship & Account Directory</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete lifecycle management: Onboard new retail customers, verify KYC identity, inspect portfolio, and manage accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCustomers(page)}
            className="flex items-center gap-1.5"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setAddError(null);
              setIsAddOpen(true);
            }}
            className="flex items-center gap-1.5 shadow-lg shadow-primary-950/40"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard New Customer</span>
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer name, email, phone, or Customer ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-primary-500"
            >
              <option value="">KYC Status: All</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="PENDING">PENDING</option>
              <option value="UNVERIFIED">UNVERIFIED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-primary-500"
            >
              <option value="">User Status: All</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="LOCKED">LOCKED</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Customers Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Customer ID</th>
                <th className="pb-3 font-semibold">Name & Contact</th>
                <th className="pb-3 font-semibold">KYC Verification</th>
                <th className="pb-3 font-semibold">User Status</th>
                <th className="pb-3 font-semibold">Accounts</th>
                <th className="pb-3 font-semibold text-right">Total Balance</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary-500" />
                    <span>Loading customers directory from banking core...</span>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400">No customers found</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {searchTerm || kycFilter || statusFilter
                        ? 'Try clearing the search filters to display all records.'
                        : 'Click "Onboard New Customer" above to add your first customer.'}
                    </p>
                    {(searchTerm || kycFilter || statusFilter) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          setSearchTerm('');
                          setKycFilter('');
                          setStatusFilter('');
                        }}
                      >
                        Reset Filters
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const totalBalance = (c.bankAccounts || []).reduce(
                    (sum, acc) => sum + Number(acc.balance || 0),
                    0,
                  );
                  return (
                    <tr key={c.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 font-mono font-bold text-primary-400">
                        {c.customerNumber}
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-slate-100">
                          {c.user.firstName} {c.user.lastName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{c.user.email}</span>
                          {c.user.phone && (
                            <>
                              <span className="text-slate-600">•</span>
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{c.user.phone}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge status={c.kycStatus} />
                      </td>
                      <td className="py-3">
                        <Badge status={c.user.status} />
                      </td>
                      <td className="py-3 text-slate-300">
                        {c.bankAccounts && c.bankAccounts.length > 0 ? (
                          <div className="space-y-0.5">
                            {c.bankAccounts.map((acc) => (
                              <div key={acc.id} className="flex items-center gap-1.5 font-mono text-[11px]">
                                <span className="text-slate-400">{acc.accountType}:</span>
                                <span className="font-bold text-slate-200">{acc.accountNumber}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </td>
                      <td className="py-3 font-mono font-bold text-right text-emerald-400">
                        {formatCurrency(totalBalance)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openViewModal(c)}
                            title="Inspect Details"
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-primary-400 hover:border-primary-500/30 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            title="Edit Profile"
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeactivateModal(c)}
                            title="Suspend Customer"
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {!isLoading && total > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-200">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-200">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-semibold text-slate-200">{total}</span> customers
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => fetchCustomers(page - 1)}
                className="flex items-center gap-1 py-1 px-2.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </Button>
              <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-mono">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => fetchCustomers(page + 1)}
                className="flex items-center gap-1 py-1 px-2.5"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* MODAL 1: ADD NEW CUSTOMER */}
      {isAddOpen && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmittingAdd && setIsAddOpen(false)}
          title="Onboard New Retail Customer"
          maxWidth="2xl"
        >
          {addError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name *"
                value={addFirstName}
                onChange={(e) => setAddFirstName(e.target.value)}
                placeholder="Rohit"
                required
              />
              <Input
                label="Last Name *"
                value={addLastName}
                onChange={(e) => setAddLastName(e.target.value)}
                placeholder="Sharma"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Email Address *"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="rohit.sharma@example.com"
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Occupation / Sector"
                value={addOccupation}
                onChange={(e) => setAddOccupation(e.target.value)}
                placeholder="Software Engineer"
              />
              <Input
                label="Monthly Income (INR)"
                type="number"
                value={addMonthlyIncome}
                onChange={(e) => setAddMonthlyIncome(e.target.value)}
                placeholder="50000"
              />
            </div>

            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-primary-400" />
                <span>Primary Bank Account Provisioning</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Account Type
                  </label>
                  <select
                    value={addAccountType}
                    onChange={(e) => {
                      const newType = e.target.value as 'SAVINGS' | 'CURRENT';
                      setAddAccountType(newType);
                      if (newType === 'SAVINGS' && Number(addInitialDeposit) < 500) {
                        setAddInitialDeposit('500');
                      } else if (newType === 'CURRENT' && addInitialDeposit === '500') {
                        setAddInitialDeposit('0');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-primary-500"
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
                    value={addKycStatus}
                    onChange={(e) => setAddKycStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-primary-500"
                  >
                    <option value="VERIFIED">VERIFIED (Full Access)</option>
                    <option value="PENDING">PENDING REVIEW</option>
                    <option value="UNVERIFIED">UNVERIFIED</option>
                  </select>
                </div>

                <div>
                  <Input
                    label="Initial Deposit (INR)"
                    type="number"
                    min={addAccountType === 'SAVINGS' ? '500' : '0'}
                    value={addInitialDeposit}
                    onChange={(e) => setAddInitialDeposit(e.target.value)}
                    placeholder={addAccountType === 'SAVINGS' ? '500' : '0'}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {addAccountType === 'SAVINGS'
                      ? '⚠️ Min ₹500 required (must maintain ₹500)'
                      : 'Min ₹0 for current account'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmittingAdd}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingAdd}
              >
                Complete Onboarding & Issue Account
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: EDIT CUSTOMER */}
      {isEditOpen && selectedCustomer && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmittingEdit && setIsEditOpen(false)}
          title={`Edit Customer: ${selectedCustomer.customerNumber}`}
          maxWidth="lg"
        >
          {editError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                required
              />
              <Input
                label="Last Name"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Phone Number"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
              <Input
                label="Occupation"
                value={editOccupation}
                onChange={(e) => setEditOccupation(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Monthly Income (INR)"
                type="number"
                value={editMonthlyIncome}
                onChange={(e) => setEditMonthlyIncome(e.target.value)}
              />
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  KYC Verification State
                </label>
                <select
                  value={editKycStatus}
                  onChange={(e) => setEditKycStatus(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-primary-500"
                >
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="UNVERIFIED">UNVERIFIED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Account Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-primary-500"
              >
                <option value="ACTIVE">ACTIVE (Operational)</option>
                <option value="SUSPENDED">SUSPENDED (Locked)</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={isSubmittingEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingEdit}
              >
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: VIEW CUSTOMER DETAILS */}
      {isViewOpen && selectedCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setIsViewOpen(false)}
          title={`Customer Portfolio: ${selectedCustomer.customerNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Customer Summary Card */}
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-100">
                    {selectedCustomer.user.firstName} {selectedCustomer.user.lastName}
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {selectedCustomer.user.email}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={selectedCustomer.kycStatus} />
                  <Badge status={selectedCustomer.user.status} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-slate-300">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Phone</div>
                  <div className="font-mono mt-0.5">{selectedCustomer.user.phone || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Occupation</div>
                  <div className="mt-0.5">{selectedCustomer.occupation || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Monthly Income</div>
                  <div className="font-mono font-semibold text-emerald-400 mt-0.5">
                    {selectedCustomer.monthlyIncome ? formatCurrency(selectedCustomer.monthlyIncome) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Accounts */}
            <div>
              <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-primary-400" />
                <span>Associated Bank Accounts</span>
              </h4>
              {selectedCustomer.bankAccounts && selectedCustomer.bankAccounts.length > 0 ? (
                <div className="space-y-2">
                  {selectedCustomer.bankAccounts.map((acc: any) => (
                    <div
                      key={acc.id}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-100">{acc.accountNumber}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300">
                            {acc.accountType}
                          </span>
                          <Badge status={acc.status} />
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {acc.branch?.name || 'Main Banking Office'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Liquid Balance</div>
                        <div className="font-mono font-bold text-emerald-400 text-sm">
                          {formatCurrency(acc.balance)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-500 italic text-center">
                  No bank accounts linked to this customer profile.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button variant="primary" size="sm" onClick={() => setIsViewOpen(false)}>
                Close Portfolio
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: DEACTIVATE / SUSPEND CUSTOMER */}
      {isDeactivateOpen && selectedCustomer && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmittingDeactivate && setIsDeactivateOpen(false)}
          title="Confirm Customer Suspension"
          maxWidth="md"
        >
          {deactivateError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{deactivateError}</span>
            </div>
          )}

          <form onSubmit={handleDeactivateSubmit} className="space-y-4 text-xs">
            <p className="text-slate-300">
              Are you sure you want to suspend customer{' '}
              <strong className="text-slate-100">
                {selectedCustomer.user.firstName} {selectedCustomer.user.lastName}
              </strong>{' '}
              ({selectedCustomer.customerNumber})?
            </p>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-400 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Financial History Invariance:</span>
              </p>
              <p>
                Suspending a customer locks online login credentials and freezes linked accounts from outgoing transfers. Audit trails and past transaction ledgers are strictly preserved for regulatory compliance.
              </p>
            </div>

            <Input
              label="Administrative Reason *"
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
              placeholder="e.g. KYC document expiry, suspected AML activity"
              required
            />

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeactivateOpen(false)}
                disabled={isSubmittingDeactivate}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                isLoading={isSubmittingDeactivate}
              >
                Confirm Suspension
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
