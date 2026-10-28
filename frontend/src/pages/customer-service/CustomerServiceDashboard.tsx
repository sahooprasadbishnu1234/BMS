import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { SupportTicket, BankAccount } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { formatCurrency } from '../../utils/currency';
import {
  LifeBuoy,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Send,
  Lock,
  Users,
  Search,
  FileText,
  UserCheck,
} from 'lucide-react';
import { CustomerManagement } from '../customer-management/CustomerManagement';

export const CustomerServiceDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes('/customers')) return 'customers';
    if (p.includes('/tickets')) return 'tickets';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ticketRes, accRes] = await Promise.all([
        api.get('/support/tickets').catch(() => ({ data: [] })),
        api.get('/accounts').catch(() => ({ data: [] })),
      ]);
      setTickets(ticketRes.data);
      setAccounts(accRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openTicketThread = async (ticket: SupportTicket) => {
    try {
      const res = await api.get(`/support/tickets/${ticket.id}`);
      setSelectedTicket(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post(`/support/tickets/${selectedTicket.id}/messages`, {
        message: replyMessage,
        isInternal,
      });
      setReplyMessage('');
      openTicketThread(selectedTicket);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedTicket) return;
    try {
      await api.patch(`/support/tickets/${selectedTicket.id}`, { status });
      openTicketThread(selectedTicket);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTickets = tickets.filter((t) =>
    statusFilter === 'ALL' ? true : t.status === statusFilter,
  );

  const filteredCustomers = accounts.filter((a) =>
    customerSearch
      ? a.customer?.user.firstName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        a.customer?.user.lastName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        a.customer?.user.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
        a.accountNumber.includes(customerSearch)
      : true,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Customer Service & CRM Triage</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              Customer Support Desk
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Resolve customer disputes, manage confidential internal investigation notes, and access customer directory
          </p>
        </div>
      </div>



      {/* Support KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Support Tickets"
          value={tickets.length}
          subtitle="All Customer Inquiries"
          icon={LifeBuoy}
        />
        <StatCard
          title="Open / Active Disputes"
          value={tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length}
          subtitle="Awaiting Resolution"
          icon={MessageSquare}
          trend={tickets.filter((t) => t.status === 'OPEN').length > 0 ? 'Urgent Attention' : 'Queue Cleared'}
          trendPositive={tickets.filter((t) => t.status === 'OPEN').length === 0}
        />
        <StatCard
          title="Resolved Disputes"
          value={tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length}
          subtitle="Successfully Settled"
          icon={CheckCircle}
        />
      </div>

      {/* VIEW 1: SUPPORT OVERVIEW */}
      {activeTab === 'overview' && (
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Active Disputes Requiring Attention
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigate('/tickets')}>
              View All Tickets
            </Button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Ticket #</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Subject</th>
                  <th className="pb-3 font-semibold">Priority</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tickets.slice(0, 5).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-850/50">
                    <td className="py-3 font-mono font-bold text-slate-200">{t.ticketNumber}</td>
                    <td className="py-3 text-slate-300">
                      {t.customer?.user.firstName} {t.customer?.user.lastName}
                    </td>
                    <td className="py-3 font-semibold text-slate-100 max-w-xs truncate">{t.subject}</td>
                    <td className="py-3"><Badge status={t.priority} /></td>
                    <td className="py-3"><Badge status={t.status} /></td>
                    <td className="py-3 text-right">
                      <Button variant="primary" size="sm" onClick={() => openTicketThread(t)}>
                        Inspect & Reply
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 2: CUSTOMER MANAGEMENT HUB */}
      {activeTab === 'customers' && <CustomerManagement />}

      {/* VIEW 3: DISPUTE MANAGEMENT */}
      {activeTab === 'tickets' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-primary-400" />
                <span>Customer Dispute & Support Tickets Docket</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Filter by status, inspect customer correspondence, and record internal notes
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === st
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Ticket #</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Subject</th>
                  <th className="pb-3 font-semibold">Priority</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-850/50">
                    <td className="py-3 font-mono font-bold text-slate-200">{t.ticketNumber}</td>
                    <td className="py-3 text-slate-300">
                      {t.customer?.user.firstName} {t.customer?.user.lastName}
                    </td>
                    <td className="py-3 text-slate-400">{t.category?.replace(/_/g, ' ')}</td>
                    <td className="py-3 font-semibold text-slate-100 max-w-xs truncate">{t.subject}</td>
                    <td className="py-3"><Badge status={t.priority} /></td>
                    <td className="py-3"><Badge status={t.status} /></td>
                    <td className="py-3 text-right">
                      <Button variant="primary" size="sm" onClick={() => openTicketThread(t)}>
                        Inspect & Reply
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TICKET THREAD & REPLY MODAL */}
      {selectedTicket && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTicket(null)}
          title={`Ticket #${selectedTicket.ticketNumber}: ${selectedTicket.subject}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs gap-2">
              <div>
                <span className="text-slate-400">Customer: </span>
                <span className="font-bold text-slate-200">
                  {selectedTicket.customer?.user.firstName} {selectedTicket.customer?.user.lastName} ({selectedTicket.customer?.user.email})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={selectedTicket.priority} />
                <Badge status={selectedTicket.status} />
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-semibold text-[11px]"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>

            {/* Message Stream */}
            <div className="space-y-3 max-h-72 overflow-y-auto p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              {selectedTicket.messages?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No message correspondence yet.</p>
              ) : (
                selectedTicket.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl text-xs max-w-[85%] ${
                      msg.isInternal
                        ? 'bg-amber-500/10 text-amber-200 border border-amber-500/30 ml-auto'
                        : msg.sender?.email === 'support@bms.bank'
                        ? 'bg-slate-800 text-slate-200 ml-auto border border-slate-700'
                        : 'bg-primary-950/40 text-primary-200 border border-primary-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400">
                      <span className="font-bold flex items-center gap-1">
                        {msg.isInternal && <Lock className="w-3 h-3 text-amber-400" />}
                        {msg.sender?.firstName} {msg.sender?.lastName}
                        {msg.isInternal && <span className="text-amber-400 font-bold ml-1">(Internal Note)</span>}
                      </span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendMessage} className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  id="internalCheck"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 accent-amber-500"
                />
                <label htmlFor="internalCheck" className="flex items-center gap-1 cursor-pointer">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Confidential Internal Staff Note (hidden from retail customer)</span>
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder={isInternal ? "Record internal triage / audit note..." : "Type reply message to customer..."}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-primary-500"
                />
                <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                  <Send className="w-4 h-4 mr-1.5" />
                  Send
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomerServiceDashboard;
