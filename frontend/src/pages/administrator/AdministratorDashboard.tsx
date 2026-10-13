import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { User, RoleName } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Settings,
  Users,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  AlertTriangle,
} from 'lucide-react';

export const AdministratorDashboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<string>('ACTIVE');
  const [newRole, setNewRole] = useState<string>('BANK_TELLER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
          System Administration & IAM Access Controls
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Identity governance, role assignments, account lockout relief, and security enforcement
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total User Accounts"
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

      {/* Admin Notice of Separation of Duties */}
      <div className="p-4 rounded-xl bg-primary-950/30 border border-primary-500/20 text-xs flex items-start gap-3 text-primary-200">
        <Key className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Separation of Duties Notice:</span> System Administrators hold platform and identity management credentials. In accordance with banking security policy, Administrator accounts are strictly prohibited from transferring balances, posting ledger journals, or approving financial transactions.
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            User Accounts & Role Permissions Directory
          </h3>
          <span className="text-xs font-mono font-bold text-slate-400">
            {users.length} Identities
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Email</th>
                <th className="pb-3 font-semibold">Assigned Role(s)</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Failed Attempts</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-850/50">
                  <td className="py-3 font-bold text-slate-200">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="py-3 text-slate-400 font-mono">{u.email}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.userRoles?.map((ur: any) => (
                        <span key={ur.role.name} className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-500/10 text-primary-300 border border-primary-500/20">
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
                      '0'
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
                      Manage User
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Management Modal */}
      {selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedUser(null)}
          title={`Manage User: ${selectedUser.firstName} ${selectedUser.lastName}`}
        >
          <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div><span className="text-slate-400">Email: </span><span className="font-mono text-slate-200">{selectedUser.email}</span></div>
              <div><span className="text-slate-400">Current Status: </span><Badge status={selectedUser.status} /></div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Account Status (Lockout Control)
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
              >
                <option value="ACTIVE">ACTIVE (Unlock Account)</option>
                <option value="LOCKED">LOCKED (Administrative Lockout)</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Assign System Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
              >
                {rolesCatalog.map((r) => (
                  <option key={r} value={r}>
                    {r}
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
    </div>
  );
};
