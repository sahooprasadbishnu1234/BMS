import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const getBadgeStyle = (val: string) => {
    const normalized = val.toUpperCase();

    if (
      normalized.includes('ACTIVE') ||
      normalized.includes('COMPLETED') ||
      normalized.includes('APPROVED') ||
      normalized.includes('PAID') ||
      normalized.includes('VERIFIED') ||
      normalized.includes('BALANCED') ||
      normalized.includes('CLEARED') ||
      normalized.includes('RESOLVED')
    ) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }

    if (
      normalized.includes('PENDING') ||
      normalized.includes('OPEN') ||
      normalized.includes('SUBMITTED') ||
      normalized.includes('RECOMMENDED') ||
      normalized.includes('UNDER_REVIEW') ||
      normalized.includes('SCHEDULED')
    ) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }

    if (
      normalized.includes('FAILED') ||
      normalized.includes('REJECTED') ||
      normalized.includes('FROZEN') ||
      normalized.includes('LOCKED') ||
      normalized.includes('CLOSED') ||
      normalized.includes('DEFAULTED') ||
      normalized.includes('OVERDUE') ||
      normalized.includes('DISCREPANCY') ||
      normalized.includes('CRITICAL') ||
      normalized.includes('HIGH')
    ) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }

    if (normalized.includes('PROCESSING') || normalized.includes('IN_PROGRESS') || normalized.includes('DISBURSED')) {
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }

    return 'bg-slate-700/30 text-slate-300 border-slate-600/30';
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(
        status,
      )} ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
