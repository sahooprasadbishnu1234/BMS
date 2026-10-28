import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { User, RoleName, AuditLog } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  Settings,
  Users,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  AlertTriangle,
  PlusCircle,
  History,
  CheckCircle,
} from 'lucide-react';

export const AdministratorDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes('/users')) return 'users';
    if (p.includes('/security-audit')) return 'security-audit';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<string>('ACTIVE');
  const [newRole, setNewRole] = useState<string>('BANK_TELLER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [securityFilter, setSecurityFilter] = useState('');
  const [selectedMetadata, setSelectedMetadata] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Provision New User Modal State
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provFirstName, setProvFirstName] = useState('');
  const [provLastName, setProvLastName] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('Password123!');
  const [provPhone, setProvPhone] = useState('+1-555-0199');
  const [provRole, setProvRole] = useState<RoleName>('CUSTOMER');
  const [provisionStatus, setProvisionStatus] = useState<string | null>(null);
  const [isSubmittingProvision, setIsSubmittingProvision] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, auditRes] = await Promise.all([
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/audit-logs').catch(() => ({ data: [] })),
      ]);
      setUsers(usersRes.data);
      setAuditLogs(auditRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/users/${selectedUser.id}`, {
        status: newStatus,
        roleName: newRole,
      });
      setSelectedUser(null);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProvision(true);
    setProvisionStatus(null);
    try {
      // Register user
      const res = await api.post('/auth/register', {
        email: provEmail,
        password: provPassword,
        firstName: provFirstName,
        lastName: provLastName,
        phone: provPhone,
      });

      // If provisioned role is not CUSTOMER, update role via admin patch
      if (provRole !== 'CUSTOMER' && res.data?.user?.id) {
        await api.patch(`/users/${res.data.user.id}`, {
          roleName: provRole,
          status: 'ACTIVE',
        });
      }

      setIsProvisionOpen(false);
      setProvFirstName('');
      setProvLastName('');
      setProvEmail('');
      loadData();
    } catch (err: any) {
      setProvisionStatus(err.response?.data?.message || 'Failed to provision user.');
    } finally {
      setIsSubmittingProvision(false);
    }
  };

  const rolesCatalog: RoleName[] = [
    'CUSTOMER',
    'BANK_MANAGER',
    'BRANCH_MANAGER',
    'BANK_TELLER',
    'ACCOUNTANT',
    'LOAN_OFFICER',
    'CUSTOMER_SERVICE_OFFICER',
    'SYSTEM_ADMINISTRATOR',
    'AUDITOR',
    'COMPLIANCE_OFFICER',
  ];

  const filteredUsers = users.filter((u) =>
    userSearch
      ? u.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.lastName.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      : true,
  );

  const filteredSecurityLogs = auditLogs.filter((log) => {
    const isSecurity =
      log.action.includes('LOGIN') ||
      log.action.includes('USER') ||
      log.action.includes('LOCKOUT') ||
      log.action.includes('ADMIN');
    if (!securityFilter) return isSecurity;
    return isSecurity && log.action.toLowerCase().includes(securityFilter.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>System Administration & IAM Access Controls</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              Platform Admin
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Identity governance, role bindings, account lockout relief, security auditing, and staff provisioning
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsProvisionOpen(true)}>
          <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
          Provision New User
        </Button>
      </div>



      {/* Admin KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Registered Identities"
          value={users.length}
          subtitle="Staff & Retail Customers"
          icon={Users}
        />
        <StatCard
          title="Active Accounts"
          value={users.filter((u) => u.status === 'ACTIVE').length}
          subtitle="Zero Lockout Flags"
          icon={ShieldCheck}
        />
        <StatCard
          title="Security Role Catalog"
          value="10 Roles"
          subtitle="RBAC Mapped & Enforced"
          icon={Settings}
        />
      </div>

      {/* Separation of Duties Notice */}
      <div className="p-4 rounded-xl bg-primary-950/30 border border-primary-500/20 text-xs flex items-start gap-3 text-primary-200">
        <Key className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Separation of Duties Policy:</span> System Administrators hold platform identity and role-granting privileges. In strict accordance with Basel III banking compliance standards, Administrator credentials are barred from executing financial transfers, posting general ledger vouchers, or signing off Maker-Checker approvals.
        </div>
      </div>

      {/* VIEW 1: ADMIN CONSOLE OVERVIEW */}
      {activeTab === 'overview' && (
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Recent System User Identities
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigate('/users')}>
              Manage All Users
            </Button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Assigned Role(s)</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.slice(0, 5).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/50">
                    <td className="py-3 font-bold text-slate-200">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="py-3 text-slate-400 font-mono">{u.email}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.userRoles?.map((ur: any) => (
                          <span
                            key={ur.role.name}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-500/10 text-primary-300 border border-primary-500/20"
                          >
                            {ur.role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3"><Badge status={u.status} /></td>
                    <td className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(u);
                          setNewStatus(u.status);
                          setNewRole(u.userRoles?.[0]?.role.name || 'BANK_TELLER');
                        }}
                      >
                        Edit Role / Status
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 2: IAM USER DIRECTORY */}
      {activeTab === 'users' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-400" />
                <span>IAM User Accounts & Role Permissions Directory</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Manage account lockouts, assign RBAC roles, and unlock accounts locked after 5 failed attempts
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search user name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 w-64"
              />
              <Button variant="primary" size="sm" onClick={() => setIsProvisionOpen(true)}>
                <PlusCircle className="w-3.5 h-3.5 mr-1" /> Provision User
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Assigned Role(s)</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Failed Logins</th>
                  <th className="pb-3 font-semibold text-right">Security Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/50">
                    <td className="py-3 font-bold text-slate-200">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="py-3 text-slate-400 font-mono">{u.email}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.userRoles?.map((ur: any) => (
                          <span
                            key={ur.role.name}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-500/10 text-primary-300 border border-primary-500/20"
                          >
                            {ur.role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3"><Badge status={u.status} /></td>
                    <td className="py-3 font-mono">
                      {u.failedLoginAttempts > 0 ? (
                        <span className="text-rose-400 font-bold">{u.failedLoginAttempts} / 5</span>
                      ) : (
                        '0 / 5'
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(u);
                          setNewStatus(u.status);
                          setNewRole(u.userRoles?.[0]?.role.name || 'BANK_TELLER');
                        }}
                      >
                        Edit Access & Unlock
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 3: SECURITY & ACCESS LOGS */}
      {activeTab === 'security-audit' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary-400" />
                <span>Security & Authentication Access Logs</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Forensic recording of successful logins, failed attempts, and administrative user changes
              </p>
            </div>
            <div className="w-64">
              <input
                type="text"
                placeholder="Filter event (e.g. LOGIN_SUCCESS, FAILURE)..."
                value={securityFilter}
                onChange={(e) => setSecurityFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-sans">
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">Actor / Identity</th>
                  <th className="pb-3 font-semibold">Security Event</th>
                  <th className="pb-3 font-semibold">IP Address</th>
                  <th className="pb-3 font-semibold text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredSecurityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                      No security audit events recorded.
                    </td>
                  </tr>
                ) : (
                  filteredSecurityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-850/50">
                      <td className="py-3 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-3 font-sans font-semibold text-slate-200">
                        {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'SYSTEM'}
                        {log.actor && <span className="block text-[10px] text-slate-500 font-mono">{log.actor.email}</span>}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'LOGIN_SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : log.action === 'LOGIN_FAILURE'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-primary-500/10 text-primary-300 border border-primary-500/20'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                      <td className="py-3 text-right font-sans">
                        {log.metadata ? (
                          <button
                            onClick={() => setSelectedMetadata(log.metadata)}
                            className="text-primary-400 hover:underline text-[11px]"
                          >
                            View JSON
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* EDIT USER & SECURITY CONTROLS MODAL */}
      {selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedUser(null)}
          title={`Edit User Access: ${selectedUser.firstName} ${selectedUser.lastName}`}
        >
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div><span className="text-slate-400">Email: </span><span className="font-mono text-slate-200">{selectedUser.email}</span></div>
              <div><span className="text-slate-400">Failed Logins: </span><span className="font-bold text-rose-400">{selectedUser.failedLoginAttempts} / 5</span></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Account Lockout Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
              >
                <option value="ACTIVE">ACTIVE (Unlocks and resets failed attempts)</option>
                <option value="LOCKED">LOCKED (Temporarily barred from authentication)</option>
                <option value="SUSPENDED">SUSPENDED (Indefinitely suspended)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Security Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-semibold"
              >
                {rolesCatalog.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <Button type="button" variant="outline" size="md" onClick={() => setSelectedUser(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* PROVISION NEW USER MODAL */}
      <Modal
        isOpen={isProvisionOpen}
        onClose={() => setIsProvisionOpen(false)}
        title="Provision New Bank Staff or Retail Customer"
        maxWidth="lg"
      >
        <form onSubmit={handleProvisionUser} className="space-y-4">
          {provisionStatus && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {provisionStatus}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={provFirstName}
              onChange={(e) => setProvFirstName(e.target.value)}
              placeholder="e.g. Rachel"
              required
            />
            <Input
              label="Last Name"
              value={provLastName}
              onChange={(e) => setProvLastName(e.target.value)}
              placeholder="e.g. Zane"
              required
            />
          </div>

          <Input
            label="Corporate Email Address"
            type="email"
            value={provEmail}
            onChange={(e) => setProvEmail(e.target.value)}
            placeholder="e.g. staff.member@bms.bank"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Initial Password"
              type="password"
              value={provPassword}
              onChange={(e) => setProvPassword(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              value={provPhone}
              onChange={(e) => setProvPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Security Role</label>
            <select
              value={provRole}
              onChange={(e) => setProvRole(e.target.value as RoleName)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-semibold"
            >
              {rolesCatalog.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={() => setIsProvisionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmittingProvision}>
              Provision & Issue Credentials
            </Button>
          </div>
        </form>
      </Modal>

      {/* METADATA MODAL */}
      {selectedMetadata && (
        <Modal isOpen={true} onClose={() => setSelectedMetadata(null)} title="Security Event Payload">
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-80">
            {JSON.stringify(selectedMetadata, null, 2)}
          </pre>
        </Modal>
      )}
    </div>
  );
};

export default AdministratorDashboard;
