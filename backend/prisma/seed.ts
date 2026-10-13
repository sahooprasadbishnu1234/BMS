import { PrismaClient, UserStatus, AccountType, AccountStatus, TransactionType, TransactionStatus, LedgerAccountType, EntryType, ApprovalEntityType, ApprovalStatus, InterestMethod, LoanApplicationStatus, LoanAccountStatus, RepaymentStatus, TicketPriority, TicketStatus, ComplianceSeverity, ComplianceStatus, TellerSessionStatus, KycStatus, NotificationType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Enterprise Banking Management System Database Seeding...');

  // 1. CLEAR EXISTING DATA IN REVERSE ORDER TO PREVENT FK CONFLICTS
  await prisma.idempotencyRecord.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.complianceCase.deleteMany();
  await prisma.supportMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.loanRepayment.deleteMany();
  await prisma.loanAccount.deleteMany();
  await prisma.loanDocument.deleteMany();
  await prisma.loanApplication.deleteMany();
  await prisma.loanProduct.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.ledgerAccount.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.cashReconciliation.deleteMany();
  await prisma.tellerSession.deleteMany();
  await prisma.accountBeneficiary.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Purged previous data records.');

  // 2. SEED PERMISSIONS
  const permissionDefs = [
    { code: 'auth:session_refresh', module: 'auth', description: 'Refresh JWT session' },
    { code: 'user:read_own', module: 'users', description: 'View own user profile' },
    { code: 'user:update_own', module: 'users', description: 'Update own user profile' },
    { code: 'user:manage_all', module: 'admin', description: 'Manage employee accounts and credentials' },
    { code: 'role:manage_all', module: 'admin', description: 'Assign roles and configure permissions' },
    { code: 'account:read_own', module: 'accounts', description: 'View own bank accounts' },
    { code: 'account:read_branch', module: 'accounts', description: 'View accounts belonging to assigned branch' },
    { code: 'account:read_all', module: 'accounts', description: 'View all accounts system-wide' },
    { code: 'account:create_customer', module: 'accounts', description: 'Open new customer accounts' },
    { code: 'account:status_change', module: 'accounts', description: 'Freeze or unfreeze bank accounts' },
    { code: 'account:close_request', module: 'accounts', description: 'Request or approve account closure' },
    { code: 'transaction:read_own', module: 'transactions', description: 'View own account transaction history' },
    { code: 'transaction:read_branch', module: 'transactions', description: 'View transactions of branch accounts' },
    { code: 'transaction:read_all', module: 'transactions', description: 'View all bank-wide transactions' },
    { code: 'transfer:execute_own', module: 'transactions', description: 'Initiate funds transfer from own account' },
    { code: 'deposit:teller_execute', module: 'teller', description: 'Process over-the-counter cash deposits' },
    { code: 'withdrawal:teller_execute', module: 'teller', description: 'Process over-the-counter cash withdrawals' },
    { code: 'approval:read_pending_branch', module: 'approvals', description: 'View branch pending approval queue' },
    { code: 'approval:read_pending_global', module: 'approvals', description: 'View bank-wide pending approval queue' },
    { code: 'approval:maker_submit', module: 'approvals', description: 'Submit exceptional operation for approval' },
    { code: 'approval:checker_action_branch', module: 'approvals', description: 'Approve or reject branch requests' },
    { code: 'approval:checker_action_global', module: 'approvals', description: 'Approve or reject bank-wide requests' },
    { code: 'loan:apply_own', module: 'loans', description: 'Apply for loan as a customer' },
    { code: 'loan:read_own', module: 'loans', description: 'View own loan details and schedule' },
    { code: 'loan:read_branch', module: 'loans', description: 'View loan applications for branch' },
    { code: 'loan:read_all', module: 'loans', description: 'View all loan applications system-wide' },
    { code: 'loan:assess_eligibility', module: 'loans', description: 'Assess credit and verify documents' },
    { code: 'loan:recommend_action', module: 'loans', description: 'Recommend approval or rejection' },
    { code: 'loan:approve_final', module: 'loans', description: 'Grant final credit approval' },
    { code: 'loan:disburse_funds', module: 'loans', description: 'Disburse approved loan to account' },
    { code: 'ledger:read_reports', module: 'ledger', description: 'View trial balance and journal ledgers' },
    { code: 'ledger:post_journal_entry', module: 'ledger', description: 'Post manual journal entries' },
    { code: 'ledger:reconcile_accounts', module: 'ledger', description: 'Reconcile ledger accounts' },
    { code: 'teller:session_open', module: 'teller', description: 'Open cash drawer shift' },
    { code: 'teller:session_close', module: 'teller', description: 'Close cash drawer shift' },
    { code: 'teller:reconcile_cash', module: 'teller', description: 'Perform end-of-day cash reconciliation' },
    { code: 'support:create_own', module: 'support', description: 'Raise support dispute ticket' },
    { code: 'support:read_own', module: 'support', description: 'Read own support tickets' },
    { code: 'support:triage_manage', module: 'support', description: 'Manage and respond to support tickets' },
    { code: 'support:escalate', module: 'support', description: 'Escalate ticket to branch or bank manager' },
    { code: 'audit:read_logs', module: 'audit', description: 'Inspect append-only forensic audit trails' },
    { code: 'audit:export_evidence', module: 'audit', description: 'Export regulatory audit evidence' },
    { code: 'compliance:read_cases', module: 'compliance', description: 'View AML and suspicious activity cases' },
    { code: 'compliance:investigate_case', module: 'compliance', description: 'Document AML investigation findings' },
    { code: 'compliance:submit_sar', module: 'compliance', description: 'Submit Suspicious Activity Report (SAR)' },
  ];

  const permissions: Record<string, any> = {};
  for (const def of permissionDefs) {
    permissions[def.code] = await prisma.permission.create({ data: def });
  }

  // 3. SEED 10 ROLES
  const roleNames = [
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

  const roles: Record<string, any> = {};
  for (const name of roleNames) {
    roles[name] = await prisma.role.create({
      data: {
        name,
        description: `${name.replace(/_/g, ' ')} operational role with server-enforced RBAC`,
        isSystem: true,
      },
    });
  }

  // Helper to link permissions to role
  const assignPermissions = async (roleName: string, codes: string[]) => {
    for (const code of codes) {
      if (permissions[code]) {
        await prisma.rolePermission.create({
          data: {
            roleId: roles[roleName].id,
            permissionId: permissions[code].id,
          },
        });
      }
    }
  };

  await assignPermissions('CUSTOMER', [
    'auth:session_refresh', 'user:read_own', 'user:update_own',
    'account:read_own', 'account:close_request',
    'transaction:read_own', 'transfer:execute_own',
    'loan:apply_own', 'loan:read_own',
    'support:create_own', 'support:read_own',
  ]);

  await assignPermissions('BANK_MANAGER', [
    'auth:session_refresh', 'user:read_own', 'user:update_own',
    'account:read_all', 'account:status_change', 'account:close_request',
    'transaction:read_all',
    'approval:read_pending_global', 'approval:checker_action_global', 'approval:maker_submit',
    'loan:read_all', 'loan:approve_final',
    'ledger:read_reports',
    'support:escalate',
    'compliance:read_cases',
  ]);

  await assignPermissions('BRANCH_MANAGER', [
    'auth:session_refresh', 'user:read_own', 'user:update_own',
    'account:read_branch', 'account:status_change', 'account:create_customer',
    'transaction:read_branch',
    'approval:read_pending_branch', 'approval:checker_action_branch', 'approval:maker_submit',
    'loan:read_branch', 'loan:approve_final', 'loan:disburse_funds',
    'ledger:read_reports',
    'teller:reconcile_cash',
    'support:escalate',
  ]);

  await assignPermissions('BANK_TELLER', [
    'auth:session_refresh', 'user:read_own', 'user:update_own',
    'account:read_branch',
    'transaction:read_branch',
    'deposit:teller_execute', 'withdrawal:teller_execute',
    'approval:maker_submit',
    'teller:session_open', 'teller:session_close', 'teller:reconcile_cash',
  ]);

  await assignPermissions('ACCOUNTANT', [
    'auth:session_refresh', 'user:read_own', 'user:update_own',
    'account:read_all', 'transaction:read_all',
    'ledger:read_reports', 'ledger:post_journal_entry', 'ledger:reconcile_accounts',
    'teller:reconcile_cash',
  ]);

  await assignPermissions('LOAN_OFFICER', [
    'auth:session_refresh', 'user:read_own', 'user:update_own',
    'account:read_branch',
    'loan:read_branch', 'loan:assess_eligibility', 'loan:recommend_action',
    'approval:maker_submit',
  ]);

  await assignPermissions('CUSTOMER_SERVICE_OFFICER', [
    'auth:session_refresh', 'user:read_own', 'user:update_own',
    'account:read_branch',
    'support:triage_manage', 'support:escalate',
  ]);

  await assignPermissions('SYSTEM_ADMINISTRATOR', [
    'auth:session_refresh', 'user:read_own', 'user:update_own',
    'user:manage_all', 'role:manage_all',
    'audit:read_logs',
  ]);

  await assignPermissions('AUDITOR', [
    'auth:session_refresh', 'user:read_own',
    'account:read_all', 'transaction:read_all', 'loan:read_all',
    'ledger:read_reports',
    'audit:read_logs', 'audit:export_evidence', 'compliance:read_cases',
  ]);

  await assignPermissions('COMPLIANCE_OFFICER', [
    'auth:session_refresh', 'user:read_own',
    'account:read_all', 'account:status_change',
    'transaction:read_all',
    'compliance:read_cases', 'compliance:investigate_case', 'compliance:submit_sar',
    'audit:read_logs',
  ]);

  console.log('✅ Created 10 Roles and mapped Granular RBAC Permissions.');

  // 4. SEED BRANCHES
  const branchHQ = await prisma.branch.create({
    data: {
      code: 'BR-001',
      name: 'Downtown Financial Center (HQ)',
      address: '100 Wall Street',
      city: 'New York',
      state: 'NY',
      routingNumber: '021000089',
      phone: '+1 (212) 555-0100',
      email: 'hq.branch@bms.bank',
    },
  });

  const branchWest = await prisma.branch.create({
    data: {
      code: 'BR-002',
      name: 'Metro West Commercial Branch',
      address: '450 California Street',
      city: 'San Francisco',
      state: 'CA',
      routingNumber: '121000358',
      phone: '+1 (415) 555-0200',
      email: 'west.branch@bms.bank',
    },
  });

  console.log('✅ Seeded 2 Commercial Bank Branches.');

  // 5. SEED CHART OF ACCOUNTS (LEDGER)
  const coa = [
    { code: '1010', name: 'Cash in Vault', accountType: LedgerAccountType.ASSET, balance: '2500000.0000' },
    { code: '1020', name: 'Federal Reserve Settlement Account', accountType: LedgerAccountType.ASSET, balance: '10000000.0000' },
    { code: '1050', name: 'Commercial & Retail Loan Receivables', accountType: LedgerAccountType.ASSET, balance: '550000.0000' },
    { code: '2010', name: 'Customer Savings Deposits (Demand)', accountType: LedgerAccountType.LIABILITY, balance: '11500000.0000' },
    { code: '2020', name: 'Customer Current Checking Deposits', accountType: LedgerAccountType.LIABILITY, balance: '1450000.0000' },
    { code: '3010', name: 'Common Capital Equity', accountType: LedgerAccountType.EQUITY, balance: '100000.0000' },
    { code: '4010', name: 'Loan Interest Income', accountType: LedgerAccountType.REVENUE, balance: '15000.0000' },
    { code: '4020', name: 'Transaction & Service Fee Income', accountType: LedgerAccountType.REVENUE, balance: '4500.0000' },
    { code: '5010', name: 'Deposit Interest Expense', accountType: LedgerAccountType.EXPENSE, balance: '8500.0000' },
    { code: '5020', name: 'Operational & Overhead Expense', accountType: LedgerAccountType.EXPENSE, balance: '11000.0000' },
  ];

  const ledgerMap: Record<string, any> = {};
  for (const item of coa) {
    ledgerMap[item.code] = await prisma.ledgerAccount.create({
      data: {
        code: item.code,
        name: item.name,
        accountType: item.accountType,
        currentBalance: item.balance,
      },
    });
  }

  console.log('✅ Seeded General Ledger Chart of Accounts (COA).');

  // 6. SEED USERS FOR ALL 10 ROLES + SEED CUSTOMERS
  const defaultPasswordHash = await argon2.hash('Password123!', {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const createStaffUser = async (email: string, first: string, last: string, roleName: string, jobTitle: string, dept: string, branchId: string, empNum: string) => {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: defaultPasswordHash,
        firstName: first,
        lastName: last,
        phone: '+1 (555) 019-2831',
        status: UserStatus.ACTIVE,
        userRoles: {
          create: { roleId: roles[roleName].id },
        },
      },
    });

    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        branchId,
        employeeNumber: empNum,
        jobTitle,
        department: dept,
      },
    });

    return { user, employee };
  };

  // Staff accounts
  const admin = await createStaffUser('admin@bms.bank', 'Alexander', 'Vance', 'SYSTEM_ADMINISTRATOR', 'Principal Systems Architect', 'Information Technology', branchHQ.id, 'EMP-ADM-001');
  const bankManager = await createStaffUser('bankmanager@bms.bank', 'Victoria', 'Sterling', 'BANK_MANAGER', 'Executive Bank Director', 'Executive Management', branchHQ.id, 'EMP-BM-001');
  const branchManager = await createStaffUser('branchmanager@bms.bank', 'Marcus', 'Chen', 'BRANCH_MANAGER', 'Branch Operations Director', 'Branch Operations', branchHQ.id, 'EMP-BRM-001');
  const teller = await createStaffUser('teller@bms.bank', 'Elena', 'Rostova', 'BANK_TELLER', 'Senior Cashier & Teller', 'Retail Banking', branchHQ.id, 'EMP-TEL-001');
  const accountant = await createStaffUser('accountant@bms.bank', 'David', 'Kowalski', 'ACCOUNTANT', 'Senior Controller & Accountant', 'Finance & Accounting', branchHQ.id, 'EMP-ACC-001');
  const loanOfficer = await createStaffUser('loanofficer@bms.bank', 'Sarah', 'Jenkins', 'LOAN_OFFICER', 'Senior Underwriting Officer', 'Credit & Lending', branchHQ.id, 'EMP-LO-001');
  const customerService = await createStaffUser('support@bms.bank', 'Liam', 'O’Connor', 'CUSTOMER_SERVICE_OFFICER', 'Customer Experience Specialist', 'Customer Care', branchHQ.id, 'EMP-CSO-001');
  const auditor = await createStaffUser('auditor@bms.bank', 'Jonathan', 'Reid', 'AUDITOR', 'Chief Internal Auditor', 'Internal Audit', branchHQ.id, 'EMP-AUD-001');
  const compliance = await createStaffUser('compliance@bms.bank', 'Rachel', 'Zane', 'COMPLIANCE_OFFICER', 'Senior AML & Sanctions Analyst', 'Compliance & Legal', branchHQ.id, 'EMP-CMP-001');

  // Customer accounts
  const createCustomerUser = async (email: string, first: string, last: string, customerNum: string, kyc: KycStatus, income: string) => {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: defaultPasswordHash,
        firstName: first,
        lastName: last,
        phone: '+1 (555) 749-3820',
        status: UserStatus.ACTIVE,
        userRoles: {
          create: { roleId: roles['CUSTOMER'].id },
        },
      },
    });

    const customer = await prisma.customer.create({
      data: {
        userId: user.id,
        customerNumber: customerNum,
        kycStatus: kyc,
        taxIdentifier: 'XXX-XX-9812',
        dateOfBirth: new Date('1990-05-15'),
        occupation: 'Software Engineer',
        monthlyIncome: income,
        addresses: {
          create: {
            street: '742 Evergreen Terrace',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
          },
        },
      },
    });

    return { user, customer };
  };

  const alice = await createCustomerUser('alice.customer@bms.bank', 'Alice', 'Johnson', 'CUST-001', KycStatus.VERIFIED, '8500.0000');
  const bob = await createCustomerUser('bob.customer@bms.bank', 'Bob', 'Smith', 'CUST-002', KycStatus.VERIFIED, '6200.0000');
  const charlie = await createCustomerUser('charlie.customer@bms.bank', 'Charlie', 'Davis', 'CUST-003', KycStatus.VERIFIED, '12000.0000');

  console.log('✅ Seeded Users and Entities across all 10 Roles with credentials: Password123!');

  // 7. SEED BANK ACCOUNTS
  const aliceSavings = await prisma.bankAccount.create({
    data: {
      accountNumber: '1001009821',
      customerId: alice.customer.id,
      branchId: branchHQ.id,
      accountType: AccountType.SAVINGS,
      status: AccountStatus.ACTIVE,
      balance: '15450.0000',
      availableBalance: '15450.0000',
    },
  });

  const aliceCurrent = await prisma.bankAccount.create({
    data: {
      accountNumber: '1001009822',
      customerId: alice.customer.id,
      branchId: branchHQ.id,
      accountType: AccountType.CURRENT,
      status: AccountStatus.ACTIVE,
      balance: '3200.0000',
      availableBalance: '3200.0000',
      overdraftLimit: '1000.0000',
    },
  });

  const bobSavings = await prisma.bankAccount.create({
    data: {
      accountNumber: '1002005411',
      customerId: bob.customer.id,
      branchId: branchHQ.id,
      accountType: AccountType.SAVINGS,
      status: AccountStatus.ACTIVE,
      balance: '8900.0000',
      availableBalance: '8900.0000',
    },
  });

  const charlieCurrent = await prisma.bankAccount.create({
    data: {
      accountNumber: '1003007633',
      customerId: charlie.customer.id,
      branchId: branchWest.id,
      accountType: AccountType.CURRENT,
      status: AccountStatus.ACTIVE,
      balance: '25000.0000',
      availableBalance: '25000.0000',
      overdraftLimit: '5000.0000',
    },
  });

  // Whitelist Bob as beneficiary for Alice
  await prisma.accountBeneficiary.create({
    data: {
      customerId: alice.customer.id,
      beneficiaryAccountId: bobSavings.id,
      nickname: 'Bob Savings (Colleague)',
    },
  });

  console.log('✅ Seeded Customer Bank Accounts and Beneficiary linkages.');

  // 8. SEED TELLER SESSION FOR TODAY
  const activeSession = await prisma.tellerSession.create({
    data: {
      tellerId: teller.employee.id,
      branchId: branchHQ.id,
      openingCash: '10000.0000',
      expectedCash: '15000.0000',
      status: TellerSessionStatus.OPEN,
      notes: 'Standard morning opening cash drawer verification',
    },
  });

  // 9. SEED SAMPLE TRANSACTIONS & DOUBLE-ENTRY JOURNAL ENTRIES
  // Tx 1: Cash Deposit into Alice's account ($5,000)
  const depositTx = await prisma.transaction.create({
    data: {
      referenceNumber: 'TX-DEP-2026-0001',
      destinationAccountId: aliceSavings.id,
      tellerSessionId: activeSession.id,
      transactionType: TransactionType.DEPOSIT,
      amount: '5000.0000',
      status: TransactionStatus.COMPLETED,
      description: 'Over-the-counter Cash Deposit',
      idempotencyKey: 'idemp-dep-001',
    },
  });

  const depositJE = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-0001',
      transactionId: depositTx.id,
      description: 'Customer Cash Deposit - Alice Johnson',
      isBalanced: true,
      journalLines: {
        create: [
          { ledgerAccountId: ledgerMap['1010'].id, entryType: EntryType.DEBIT, amount: '5000.0000', memo: 'Cash in Vault received' },
          { ledgerAccountId: ledgerMap['2010'].id, entryType: EntryType.CREDIT, amount: '5000.0000', memo: 'Customer Savings liability credit' },
        ],
      },
    },
  });

  // Tx 2: Transfer from Charlie to Alice ($1,250.00)
  const transferTx = await prisma.transaction.create({
    data: {
      referenceNumber: 'TX-TRF-2026-0002',
      sourceAccountId: charlieCurrent.id,
      destinationAccountId: aliceSavings.id,
      transactionType: TransactionType.TRANSFER,
      amount: '1250.0000',
      status: TransactionStatus.COMPLETED,
      description: 'Consulting services payment',
      idempotencyKey: 'idemp-trf-002',
    },
  });

  await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-0002',
      transactionId: transferTx.id,
      description: 'Internal transfer Charlie Davis to Alice Johnson',
      isBalanced: true,
      journalLines: {
        create: [
          { ledgerAccountId: ledgerMap['2020'].id, entryType: EntryType.DEBIT, amount: '1250.0000', memo: 'Debit Charlie Current' },
          { ledgerAccountId: ledgerMap['2010'].id, entryType: EntryType.CREDIT, amount: '1250.0000', memo: 'Credit Alice Savings' },
        ],
      },
    },
  });

  console.log('✅ Seeded Transactions with balanced Double-Entry General Ledger postings.');

  // 10. SEED MAKER-CHECKER APPROVAL REQUEST
  await prisma.approvalRequest.create({
    data: {
      entityType: ApprovalEntityType.TRANSACTION,
      entityId: 'dummy-tx-high-val-001',
      action: 'APPROVE_HIGH_VALUE_TRANSFER',
      makerId: teller.user.id,
      status: ApprovalStatus.PENDING,
      monetaryValue: '25000.0000',
      reason: 'Commercial client wire transfer request exceeding standard $10,000 threshold',
      payload: {
        fromAccount: charlieCurrent.accountNumber,
        amount: 25000,
        beneficiary: 'Global Logistics Corp',
      },
    },
  });

  console.log('✅ Seeded Maker-Checker pending approval ticket.');

  // 11. SEED LOAN PRODUCTS & SAMPLE LOAN
  const personalProduct = await prisma.loanProduct.create({
    data: {
      code: 'PERS-01',
      name: 'Personal Express Loan',
      description: 'Low-rate unsecured personal credit for established banking customers',
      minAmount: '1000.0000',
      maxAmount: '50000.0000',
      annualInterestRate: '8.50',
      interestMethod: InterestMethod.REDUCING_BALANCE,
      minTenureMonths: 12,
      maxTenureMonths: 60,
    },
  });

  const mortgageProduct = await prisma.loanProduct.create({
    data: {
      code: 'MORT-01',
      name: 'Prime Residential Mortgage',
      description: 'Fixed-rate 15 to 30-year residential home purchase loan',
      minAmount: '50000.0000',
      maxAmount: '1500000.0000',
      annualInterestRate: '5.75',
      interestMethod: InterestMethod.REDUCING_BALANCE,
      minTenureMonths: 120,
      maxTenureMonths: 360,
    },
  });

  // Approved & Active Loan for Bob
  const bobLoanApp = await prisma.loanApplication.create({
    data: {
      applicationNumber: 'LN-APP-2026-0001',
      customerId: bob.customer.id,
      loanProductId: personalProduct.id,
      branchId: branchHQ.id,
      requestedAmount: '12000.0000',
      tenureMonths: 24,
      purpose: 'Home renovation and energy efficiency upgrade',
      monthlyIncome: '6200.0000',
      creditScore: 760,
      status: LoanApplicationStatus.DISBURSED,
      assignedOfficerId: loanOfficer.employee.id,
      recommendationNotes: 'Strong debt-to-income ratio (22%), spotless credit history. Recommended.',
    },
  });

  const bobLoanAccount = await prisma.loanAccount.create({
    data: {
      loanNumber: 'LN-ACT-2026-0001',
      applicationId: bobLoanApp.id,
      bankAccountId: bobSavings.id,
      principalAmount: '12000.0000',
      interestRate: '8.50',
      outstandingBalance: '10850.0000',
      totalTenureMonths: 24,
      monthlyInstallment: '545.4800',
      maturityDate: new Date('2028-02-01'),
      status: LoanAccountStatus.ACTIVE,
    },
  });

  // Amortization schedule rows
  await prisma.loanRepayment.createMany({
    data: [
      {
        loanAccountId: bobLoanAccount.id,
        installmentNumber: 1,
        dueDate: new Date('2026-03-01'),
        paidDate: new Date('2026-03-01'),
        principalDue: '460.4800',
        interestDue: '85.0000',
        totalDue: '545.4800',
        amountPaid: '545.4800',
        status: RepaymentStatus.PAID,
      },
      {
        loanAccountId: bobLoanAccount.id,
        installmentNumber: 2,
        dueDate: new Date('2026-04-01'),
        paidDate: new Date('2026-04-01'),
        principalDue: '463.7400',
        interestDue: '81.7400',
        totalDue: '545.4800',
        amountPaid: '545.4800',
        status: RepaymentStatus.PAID,
      },
      {
        loanAccountId: bobLoanAccount.id,
        installmentNumber: 3,
        dueDate: new Date('2026-05-01'),
        principalDue: '467.0300',
        interestDue: '78.4500',
        totalDue: '545.4800',
        amountPaid: '0.0000',
        status: RepaymentStatus.SCHEDULED,
      },
    ],
  });

  // Pending Loan Application from Alice
  await prisma.loanApplication.create({
    data: {
      applicationNumber: 'LN-APP-2026-0002',
      customerId: alice.customer.id,
      loanProductId: personalProduct.id,
      branchId: branchHQ.id,
      requestedAmount: '15000.0000',
      tenureMonths: 36,
      purpose: 'Graduate degree tuition funding',
      monthlyIncome: '8500.0000',
      creditScore: 785,
      status: LoanApplicationStatus.SUBMITTED,
      assignedOfficerId: loanOfficer.employee.id,
    },
  });

  console.log('✅ Seeded Loan Products, Active Loan Amortization Schedule, and Pending Application.');

  // 12. SEED SUPPORT TICKETS
  const ticket1 = await prisma.supportTicket.create({
    data: {
      ticketNumber: 'TKT-2026-0001',
      customerId: alice.customer.id,
      assignedEmployeeId: customerService.employee.id,
      subject: 'Clarification regarding debit card international transaction limit',
      category: 'GENERAL_INQUIRY',
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      internalNotes: 'Customer plans to travel to London next month. Limits need verification.',
      messages: {
        create: [
          {
            senderId: alice.user.id,
            message: 'Hello, I plan to travel abroad next month. What is my daily debit card limit for overseas POS terminals?',
            isInternal: false,
          },
          {
            senderId: customerService.user.id,
            message: 'Good day Alice. The standard limit is $2,000/day. We can enable the travel notification flag on your account.',
            isInternal: false,
          },
        ],
      },
    },
  });

  // 13. SEED COMPLIANCE CASE
  await prisma.complianceCase.create({
    data: {
      caseNumber: 'CMP-2026-0001',
      customerId: charlie.customer.id,
      alertType: 'LARGE_CASH_TRANSACTION',
      severity: ComplianceSeverity.MEDIUM,
      status: ComplianceStatus.INVESTIGATING,
      investigatorId: compliance.employee.id,
      findings: 'Customer conducted $25,000 corporate receipt. Tax documentation verified. Low risk.',
    },
  });

  // 14. SEED AUDIT LOGS
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.user.id,
        action: 'USER_PROVISIONED',
        targetEntity: 'User',
        targetEntityId: teller.user.id,
        metadata: { role: 'BANK_TELLER', ip: '192.168.1.10' },
      },
      {
        actorId: teller.user.id,
        action: 'DEPOSIT_PROCESSED',
        targetEntity: 'Transaction',
        targetEntityId: depositTx.id,
        metadata: { amount: 5000, account: aliceSavings.accountNumber },
      },
      {
        actorId: branchManager.user.id,
        action: 'TELLER_SESSION_OPENED',
        targetEntity: 'TellerSession',
        targetEntityId: activeSession.id,
        metadata: { openingCash: 10000 },
      },
    ],
  });

  // 15. SEED NOTIFICATIONS
  await prisma.notification.createMany({
    data: [
      {
        userId: alice.user.id,
        title: 'Deposit Credited',
        message: 'Your savings account 1001009821 has been credited with $5,000.00.',
        type: NotificationType.TRANSACTION,
      },
      {
        userId: bankManager.user.id,
        title: 'Pending High-Value Approval',
        message: 'A wire transfer request for $25,000.00 requires your secondary review.',
        type: NotificationType.APPROVAL,
      },
    ],
  });

  console.log('✅ Seeded CRM Tickets, AML Compliance Case, Forensic Audit Trails, and Notifications.');
  console.log('🎉 Enterprise Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
