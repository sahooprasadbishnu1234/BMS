export type RoleName =
  | 'CUSTOMER'
  | 'BANK_MANAGER'
  | 'BRANCH_MANAGER'
  | 'BANK_TELLER'
  | 'ACCOUNTANT'
  | 'LOAN_OFFICER'
  | 'CUSTOMER_SERVICE_OFFICER'
  | 'SYSTEM_ADMINISTRATOR'
  | 'AUDITOR'
  | 'COMPLIANCE_OFFICER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roles: RoleName[];
  permissions: string[];
  employee?: {
    id: string;
    employeeNumber: string;
    jobTitle: string;
    department: string;
    branchId: string;
    branchName: string;
  } | null;
  customer?: {
    id: string;
    customerNumber: string;
    kycStatus: string;
  } | null;
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  customerId: string;
  branchId: string;
  accountType: 'SAVINGS' | 'CURRENT';
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'FROZEN' | 'CLOSED';
  balance: string;
  availableBalance: string;
  currency: string;
  overdraftLimit: string;
  customer?: {
    customerNumber: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
  };
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  createdAt: string;
}

export interface Transaction {
  id: string;
  referenceNumber: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'LOAN_DISBURSEMENT' | 'LOAN_REPAYMENT';
  amount: string;
  fee: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVERSED' | 'REJECTED';
  description?: string;
  executedAt: string;
  sourceAccount?: { accountNumber: string; accountType: string };
  destinationAccount?: { accountNumber: string; accountType: string };
}

export interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  makerId: string;
  checkerId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  monetaryValue?: string;
  reason: string;
  reviewNotes?: string;
  createdAt: string;
  maker?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  payload?: any;
}

export interface LoanProduct {
  id: string;
  code: string;
  name: string;
  description?: string;
  minAmount: string;
  maxAmount: string;
  annualInterestRate: string;
  interestMethod: string;
  minTenureMonths: number;
  maxTenureMonths: number;
}

export interface LoanApplication {
  id: string;
  applicationNumber: string;
  customerId: string;
  loanProductId: string;
  branchId: string;
  requestedAmount: string;
  tenureMonths: number;
  purpose: string;
  monthlyIncome: string;
  creditScore?: number;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'RECOMMENDED' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
  recommendationNotes?: string;
  submittedAt: string;
  loanProduct?: LoanProduct;
  customer?: {
    customerNumber: string;
    user: { firstName: string; lastName: string; email: string };
  };
  loanAccount?: LoanAccount;
}

export interface LoanAccount {
  id: string;
  loanNumber: string;
  principalAmount: string;
  interestRate: string;
  outstandingBalance: string;
  totalTenureMonths: number;
  monthlyInstallment: string;
  status: string;
  repayments?: LoanRepayment[];
}

export interface LoanRepayment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  paidDate?: string;
  principalDue: string;
  interestDue: string;
  totalDue: string;
  amountPaid: string;
  status: 'SCHEDULED' | 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID';
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  subject: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  internalNotes?: string;
  createdAt: string;
  customer?: {
    customerNumber: string;
    user: { firstName: string; lastName: string; email: string };
  };
  assignedEmployee?: {
    user: { firstName: string; lastName: string };
  };
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  sender?: { firstName: string; lastName: string; email: string };
}

export interface TellerSession {
  id: string;
  tellerId: string;
  branchId: string;
  openingCash: string;
  closingCash?: string;
  expectedCash: string;
  cashDifference?: string;
  status: 'OPEN' | 'CLOSED' | 'RECONCILED';
  openedAt: string;
  teller?: { user: { firstName: string; lastName: string } };
}

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  currentBalance: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  description: string;
  postingDate: string;
  isBalanced: boolean;
  journalLines: {
    id: string;
    entryType: 'DEBIT' | 'CREDIT';
    amount: string;
    memo?: string;
    ledgerAccount: LedgerAccount;
  }[];
}

export interface ComplianceCase {
  id: string;
  caseNumber: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'CLEARED' | 'ESCALATED' | 'REPORTED_SAR';
  findings?: string;
  actionsTaken?: string;
  createdAt: string;
  customer?: {
    customerNumber: string;
    user: { firstName: string; lastName: string; email: string };
  };
}

export interface AuditLog {
  id: string;
  actorId?: string;
  action: string;
  targetEntity: string;
  targetEntityId?: string;
  ipAddress?: string;
  metadata?: any;
  createdAt: string;
  actor?: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}
