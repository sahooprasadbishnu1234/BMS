/**
 * Enterprise Banking Currency & Financial Formatting Utilities
 */

export const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined || amount === '') return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatAmount = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined || amount === '') return '0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatSignedCurrency = (amount: number | string | null | undefined, direction?: 'CREDIT' | 'DEBIT' | string): string => {
  const formatted = formatCurrency(amount);
  if (direction === 'CREDIT' || direction === 'DEPOSIT') {
    return `+${formatted}`;
  }
  if (direction === 'DEBIT' || direction === 'WITHDRAWAL') {
    return `-${formatted}`;
  }
  return formatted;
};
