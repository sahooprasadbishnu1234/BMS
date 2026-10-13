import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { SupportTicket } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  LifeBuoy,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Send,
  Lock,
} from 'lucide-react';

export const CustomerServiceDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.get('/support/tickets');
      setTickets(res.data);
    } catch (err) {
      console.error(err);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
          Customer Service & Dispute Triage
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Support ticket queues, customer correspondence, confidential internal notes, and escalations
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Support Tickets"
          value={tickets.length}
          subtitle="All Dispute Inquiries"
          icon={LifeBuoy}
        />
        <StatCard
          title="Open / Active Tickets"
          value={tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length}
          subtitle="Awaiting Resolution"
          icon={MessageSquare}
        />
        <StatCard
          title="Resolved Disputes"
          value={tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length}
          subtitle="Cases Closed Successfully"
          icon={CheckCircle}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Customer Dispute & Support Tickets
          </h3>
          <span className="text-xs font-mono font-bold text-slate-400">
            {tickets.length} Inquiries
          </span>
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
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-850/50">
                  <td className="py-3 font-mono font-bold text-slate-200">{t.ticketNumber}</td>
                  <td className="py-3 text-slate-300">
                    {t.customer?.user.firstName} {t.customer?.user.lastName}
                  </td>
                  <td className="py-3 text-slate-200 font-medium max-w-xs truncate">{t.subject}</td>
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

      {/* Ticket Conversation Thread Modal */}
      {selectedTicket && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTicket(null)}
          title={`Ticket #${selectedTicket.ticketNumber}: ${selectedTicket.subject}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Status Action Buttons */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Status:</span>
                <Badge status={selectedTicket.status} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('ESCALATED')}
                >
                  Escalate
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStatusChange('RESOLVED')}
                >
                  Mark Resolved
                </Button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {selectedTicket.messages?.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl text-xs space-y-1 ${
                    m.isInternal
                      ? 'bg-amber-500/10 border border-amber-500/20'
                      : 'bg-slate-950 border border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                    <span>
                      {m.sender?.firstName} {m.sender?.lastName}{' '}
                      {m.isInternal && <span className="text-amber-400 font-bold ml-1.5 flex-inline items-center gap-1"><Lock className="w-2.5 h-2.5 inline" /> CONFIDENTIAL INTERNAL NOTE</span>}
                    </span>
                    <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-200">{m.message}</p>
                </div>
              ))}
            </div>

            {/* Response Input */}
            <form onSubmit={handleSendMessage} className="space-y-3 pt-2 border-t border-slate-800">
              <Input
                label="Reply / Note"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your response or internal staff investigation note..."
                required
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-primary-500"
                  />
                  <span>Post as Internal Staff Note (Hidden from Customer)</span>
                </label>

                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Send Response
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
