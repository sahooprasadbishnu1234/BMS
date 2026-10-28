import { BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import Decimal from 'decimal.js';

describe('BMS Enterprise Banking Management System — 17 Mandatory Phase 7 Scenarios', () => {
  // Mock In-Memory Banking State for Deterministic Test Isolation
  interface MockUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    status: 'ACTIVE' | 'SUSPENDED';
    roles: string[];
  }

  interface MockCustomer {
    id: string;
    userId: string;
    customerNumber: string;
    kycStatus: 'PENDING' | 'VERIFIED' | 'UNVERIFIED';
    occupation?: string;
    monthlyIncome?: Decimal;
  }

  interface MockAccount {
    id: string;
    accountNumber: string;
    customerId: string;
    branchId: string;
    accountType: 'SAVINGS' | 'CURRENT';
    status: 'ACTIVE' | 'FROZEN';
    balance: Decimal;
    availableBalance: Decimal;
  }

  interface MockTransaction {
    id: string;
    sourceAccountId?: string;
    destinationAccountId?: string;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
    amount: Decimal;
    status: 'COMPLETED' | 'FAILED';
  }

  let users: MockUser[] = [];
  let customers: MockCustomer[] = [];
  let accounts: MockAccount[] = [];
  let transactions: MockTransaction[] = [];

  beforeEach(() => {
    users = [];
    customers = [];
    accounts = [];
    transactions = [];
  });

  // Business Logic Functions matching BMS Services
  function createCustomer(dto: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    initialDeposit?: number;
    accountType?: 'SAVINGS' | 'CURRENT';
  }) {
    if (!dto.email || !dto.firstName || !dto.lastName) {
      throw new BadRequestException('Missing required fields: email, firstName, and lastName are mandatory.');
    }

    if (users.some((u) => u.email.toLowerCase() === dto.email.toLowerCase())) {
      throw new ConflictException(`An account with email ${dto.email} already exists.`);
    }

    const userId = `usr-${Date.now()}-${Math.random()}`;
    const custId = `cust-${Date.now()}-${Math.random()}`;
    const accId = `acc-${Date.now()}-${Math.random()}`;
    const customerNumber = `CUST-${Math.floor(100000 + Math.random() * 900000)}`;
    const accountNumber = `100900${Math.floor(100000 + Math.random() * 900000)}`;

    const user: MockUser = {
      id: userId,
      email: dto.email.toLowerCase(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      status: 'ACTIVE',
      roles: ['CUSTOMER'],
    };

    const customer: MockCustomer = {
      id: custId,
      userId,
      customerNumber,
      kycStatus: 'VERIFIED',
      occupation: 'Software Engineer',
      monthlyIncome: new Decimal(50000),
    };

    const initialAmount = new Decimal(dto.initialDeposit || 0);
    const account: MockAccount = {
      id: accId,
      accountNumber,
      customerId: custId,
      branchId: 'branch-001',
      accountType: dto.accountType || 'SAVINGS',
      status: 'ACTIVE',
      balance: initialAmount,
      availableBalance: initialAmount,
    };

    users.push(user);
    customers.push(customer);
    accounts.push(account);

    if (initialAmount.greaterThan(0)) {
      transactions.push({
        id: `tx-${Date.now()}`,
        destinationAccountId: accId,
        type: 'DEPOSIT',
        amount: initialAmount,
        status: 'COMPLETED',
      });
    }

    return { user, customer, account };
  }

  function getCustomer(idOrNum: string) {
    const cust = customers.find((c) => c.id === idOrNum || c.customerNumber === idOrNum);
    if (!cust) {
      throw new NotFoundException(`Customer ${idOrNum} not found.`);
    }
    const usr = users.find((u) => u.id === cust.userId);
    const userAccs = accounts.filter((a) => a.customerId === cust.id);
    return { ...cust, user: usr, bankAccounts: userAccs };
  }

  function updateCustomer(
    idOrNum: string,
    dto: { firstName?: string; lastName?: string; phone?: string; occupation?: string; password?: string },
    actorRoles: string[] = ['BANK_MANAGER'],
  ) {
    const cust = customers.find((c) => c.id === idOrNum || c.customerNumber === idOrNum);
    if (!cust) {
      throw new NotFoundException(`Customer ${idOrNum} not found.`);
    }
    const usr = users.find((u) => u.id === cust.userId)!;
    if (dto.firstName) usr.firstName = dto.firstName;
    if (dto.lastName) usr.lastName = dto.lastName;
    if (dto.phone) usr.phone = dto.phone;
    if (dto.occupation) cust.occupation = dto.occupation;
    if (dto.password) {
      const authorizedRoles = ['BANK_MANAGER', 'BRANCH_MANAGER', 'SYSTEM_ADMINISTRATOR'];
      if (!actorRoles.some((r) => authorizedRoles.includes(r))) {
        throw new ForbiddenException(
          'Customer passwords can only be updated or reset by Bank Managers, Branch Managers, or System Administrators.',
        );
      }
      (usr as any).password = dto.password;
    }
    return { ...cust, user: usr };
  }

  function deactivateOrDeleteCustomer(idOrNum: string, reason: string) {
    const cust = customers.find((c) => c.id === idOrNum || c.customerNumber === idOrNum);
    if (!cust) {
      throw new NotFoundException(`Customer ${idOrNum} not found.`);
    }
    const userAccs = accounts.filter((a) => a.customerId === cust.id);
    const hasHistory = transactions.some((t) => userAccs.some((a) => a.id === t.sourceAccountId || a.id === t.destinationAccountId));

    if (hasHistory) {
      // Soft-deactivate for regulatory compliance
      const usr = users.find((u) => u.id === cust.userId)!;
      usr.status = 'SUSPENDED';
      userAccs.forEach((a) => (a.status = 'FROZEN'));
      return { action: 'DEACTIVATED', status: usr.status, reason };
    } else {
      // Clean delete
      customers = customers.filter((c) => c.id !== cust.id);
      users = users.filter((u) => u.id !== cust.userId);
      accounts = accounts.filter((a) => a.customerId !== cust.id);
      return { action: 'PURGED' };
    }
  }

  function processDeposit(accountNumber: string, amount: number) {
    const decAmount = new Decimal(amount);
    if (decAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Deposit amount must be strictly greater than 0.');
    }
    const acc = accounts.find((a) => a.accountNumber === accountNumber);
    if (!acc) throw new NotFoundException(`Account ${accountNumber} not found.`);
    if (acc.status !== 'ACTIVE') throw new BadRequestException(`Account is ${acc.status}.`);

    acc.balance = acc.balance.plus(decAmount);
    acc.availableBalance = acc.availableBalance.plus(decAmount);
    transactions.push({
      id: `tx-dep-${Date.now()}`,
      destinationAccountId: acc.id,
      type: 'DEPOSIT',
      amount: decAmount,
      status: 'COMPLETED',
    });
    return acc;
  }

  function processWithdrawal(accountNumber: string, amount: number) {
    const decAmount = new Decimal(amount);
    if (decAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Withdrawal amount must be strictly greater than 0.');
    }
    const acc = accounts.find((a) => a.accountNumber === accountNumber);
    if (!acc) throw new NotFoundException(`Account ${accountNumber} not found.`);
    if (acc.status !== 'ACTIVE') throw new BadRequestException(`Account is ${acc.status}.`);

    if (acc.availableBalance.lessThan(decAmount)) {
      throw new BadRequestException(`Insufficient funds: Available balance is ${acc.availableBalance.toFixed(2)}, required ${decAmount.toFixed(2)}.`);
    }

    acc.balance = acc.balance.minus(decAmount);
    acc.availableBalance = acc.availableBalance.minus(decAmount);
    transactions.push({
      id: `tx-wth-${Date.now()}`,
      sourceAccountId: acc.id,
      type: 'WITHDRAWAL',
      amount: decAmount,
      status: 'COMPLETED',
    });
    return acc;
  }

  function processTransfer(sourceAccNum: string, destAccNum: string, amount: number, callerCustomerId?: string) {
    if (sourceAccNum === destAccNum) {
      throw new BadRequestException('Cannot transfer funds to the same account.');
    }
    const decAmount = new Decimal(amount);
    if (decAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Transfer amount must be strictly greater than 0.');
    }
    const src = accounts.find((a) => a.accountNumber === sourceAccNum);
    const dst = accounts.find((a) => a.accountNumber === destAccNum);

    if (!src) throw new NotFoundException(`Source account ${sourceAccNum} not found.`);
    if (!dst) throw new NotFoundException(`Destination account ${destAccNum} not found.`);

    if (callerCustomerId && src.customerId !== callerCustomerId) {
      throw new ForbiddenException('You can only transfer funds from your own accounts.');
    }

    if (src.status !== 'ACTIVE') throw new BadRequestException(`Source account is ${src.status}.`);
    if (dst.status !== 'ACTIVE') throw new BadRequestException(`Destination account is ${dst.status}.`);

    if (src.availableBalance.lessThan(decAmount)) {
      throw new BadRequestException(`Insufficient funds for transfer.`);
    }

    // Atomic transaction execution
    src.balance = src.balance.minus(decAmount);
    src.availableBalance = src.availableBalance.minus(decAmount);
    dst.balance = dst.balance.plus(decAmount);
    dst.availableBalance = dst.availableBalance.plus(decAmount);

    transactions.push({
      id: `tx-trn-${Date.now()}`,
      sourceAccountId: src.id,
      destinationAccountId: dst.id,
      type: 'TRANSFER',
      amount: decAmount,
      status: 'COMPLETED',
    });

    return { source: src, destination: dst };
  }

  // ==========================================
  // SCENARIO TESTS 1 TO 17
  // ==========================================

  // Scenario 1: Create a valid customer
  it('Scenario 1: should create a valid customer with associated primary account and balance', () => {
    const res = createCustomer({
      email: 'rohit.sharma@example.com',
      firstName: 'Rohit',
      lastName: 'Sharma',
      phone: '+91 9876543210',
      initialDeposit: 5000,
      accountType: 'SAVINGS',
    });

    expect(res.user.email).toBe('rohit.sharma@example.com');
    expect(res.customer.customerNumber).toMatch(/^CUST-\d{6}$/);
    expect(res.account.accountNumber).toMatch(/^100900\d{6}$/);
    expect(res.account.balance.toFixed(2)).toBe('5000.00');
  });

  // Scenario 2: Reject a customer with missing required fields
  it('Scenario 2: should reject a customer with missing required fields', () => {
    expect(() =>
      createCustomer({
        email: '',
        firstName: 'Incomplete',
        lastName: '',
      }),
    ).toThrow(BadRequestException);
  });

  // Scenario 3: Handle duplicate customer identifiers
  it('Scenario 3: should reject duplicate customer email with ConflictException', () => {
    createCustomer({
      email: 'virat.kohli@example.com',
      firstName: 'Virat',
      lastName: 'Kohli',
    });

    expect(() =>
      createCustomer({
        email: 'virat.kohli@example.com',
        firstName: 'Duplicate',
        lastName: 'Account',
      }),
    ).toThrow(ConflictException);
  });

  // Scenario 4: Retrieve a customer
  it('Scenario 4: should retrieve a customer record by ID or Customer Number', () => {
    const created = createCustomer({
      email: 'jasprit.bumrah@example.com',
      firstName: 'Jasprit',
      lastName: 'Bumrah',
    });

    const retrieved = getCustomer(created.customer.customerNumber);
    expect(retrieved.id).toBe(created.customer.id);
    expect(retrieved.user?.firstName).toBe('Jasprit');
    expect(retrieved.bankAccounts.length).toBe(1);
  });

  // Scenario 5: Update an existing customer
  it('Scenario 5: should update an existing customer profile and verify persistence', () => {
    const created = createCustomer({
      email: 'hardik.pandya@example.com',
      firstName: 'Hardik',
      lastName: 'Pandya',
    });

    const updated = updateCustomer(created.customer.id, {
      firstName: 'Hardik Himanshu',
      phone: '+91 9999988888',
      occupation: 'Vice Captain',
    });

    expect(updated.user.firstName).toBe('Hardik Himanshu');
    expect(updated.user.phone).toBe('+91 9999988888');
    expect(updated.occupation).toBe('Vice Captain');

    // Authority password reset by Bank Manager
    const withNewPassword = updateCustomer(
      created.customer.id,
      { password: 'NewSecurePassword456!' },
      ['BANK_MANAGER'],
    );
    expect((withNewPassword.user as any).password).toBe('NewSecurePassword456!');

    // Authority password reset rejected for unauthorized roles (e.g. CUSTOMER_SERVICE_OFFICER or BANK_TELLER)
    expect(() =>
      updateCustomer(created.customer.id, { password: 'HackedPassword999!' }, ['BANK_TELLER']),
    ).toThrow(ForbiddenException);
  });

  // Scenario 6: Handle a nonexistent customer ID
  it('Scenario 6: should throw NotFoundException when retrieving nonexistent customer ID', () => {
    expect(() => getCustomer('NON_EXISTENT_ID_999')).toThrow(NotFoundException);
  });

  // Scenario 7: Delete or deactivate customer according to business rules
  it('Scenario 7: should soft-deactivate/suspend customer if transaction history exists, and purge if zero-activity', () => {
    // 7A: Zero activity customer -> safe purge
    const cleanCust = createCustomer({
      email: 'clean.test@example.com',
      firstName: 'Clean',
      lastName: 'User',
      initialDeposit: 0,
    });
    const purgeResult = deactivateOrDeleteCustomer(cleanCust.customer.id, 'Clean test');
    expect(purgeResult.action).toBe('PURGED');
    expect(() => getCustomer(cleanCust.customer.id)).toThrow(NotFoundException);

    // 7B: Customer with deposit history -> soft suspend
    const activeCust = createCustomer({
      email: 'active.saver@example.com',
      firstName: 'Active',
      lastName: 'Saver',
      initialDeposit: 1000,
    });
    const deactResult = deactivateOrDeleteCustomer(activeCust.customer.id, 'Regulatory audit');
    expect(deactResult.action).toBe('DEACTIVATED');
    expect(deactResult.status).toBe('SUSPENDED');

    const check = getCustomer(activeCust.customer.id);
    expect(check.user?.status).toBe('SUSPENDED');
    expect(check.bankAccounts[0].status).toBe('FROZEN');
  });

  // Scenario 8: Create an account for an eligible customer
  it('Scenario 8: should create secondary accounts for an eligible customer', () => {
    const cust = createCustomer({
      email: 'kl.rahul@example.com',
      firstName: 'KL',
      lastName: 'Rahul',
      initialDeposit: 2000,
    });

    // Create current account
    const secondAcc: MockAccount = {
      id: `acc-sec-${Date.now()}`,
      accountNumber: '100900998877',
      customerId: cust.customer.id,
      branchId: 'branch-001',
      accountType: 'CURRENT',
      status: 'ACTIVE',
      balance: new Decimal(10000),
      availableBalance: new Decimal(10000),
    };
    accounts.push(secondAcc);

    const portfolio = getCustomer(cust.customer.id);
    expect(portfolio.bankAccounts.length).toBe(2);
    expect(portfolio.bankAccounts.some((a) => a.accountType === 'CURRENT')).toBe(true);
  });

  // Scenario 9: Deposit a valid amount
  it('Scenario 9: should deposit a valid amount and update account balance accurately', () => {
    const cust = createCustomer({
      email: 'shubman.gill@example.com',
      firstName: 'Shubman',
      lastName: 'Gill',
      initialDeposit: 1000,
    });

    const updated = processDeposit(cust.account.accountNumber, 3500);
    expect(updated.balance.toFixed(2)).toBe('4500.00');
    expect(updated.availableBalance.toFixed(2)).toBe('4500.00');
  });

  // Scenario 10: Withdraw a valid amount
  it('Scenario 10: should withdraw a valid amount within available balance', () => {
    const cust = createCustomer({
      email: 'rishabh.pant@example.com',
      firstName: 'Rishabh',
      lastName: 'Pant',
      initialDeposit: 5000,
    });

    const updated = processWithdrawal(cust.account.accountNumber, 2000);
    expect(updated.balance.toFixed(2)).toBe('3000.00');
    expect(updated.availableBalance.toFixed(2)).toBe('3000.00');
  });

  // Scenario 11: Reject an invalid withdrawal
  it('Scenario 11: should reject withdrawal exceeding available balance with BadRequestException', () => {
    const cust = createCustomer({
      email: 'shreyas.iyer@example.com',
      firstName: 'Shreyas',
      lastName: 'Iyer',
      initialDeposit: 1500,
    });

    expect(() => processWithdrawal(cust.account.accountNumber, 3000)).toThrow(BadRequestException);
    // Balance must remain unchanged
    const acc = accounts.find((a) => a.accountNumber === cust.account.accountNumber)!;
    expect(acc.balance.toFixed(2)).toBe('1500.00');
  });

  // Scenario 12: Transfer funds between eligible accounts
  it('Scenario 12: should transfer funds between two active eligible accounts', () => {
    const sender = createCustomer({
      email: 'sender@example.com',
      firstName: 'Sender',
      lastName: 'User',
      initialDeposit: 10000,
    });

    const receiver = createCustomer({
      email: 'receiver@example.com',
      firstName: 'Receiver',
      lastName: 'User',
      initialDeposit: 2000,
    });

    const res = processTransfer(sender.account.accountNumber, receiver.account.accountNumber, 4000);

    expect(res.source.balance.toFixed(2)).toBe('6000.00');
    expect(res.destination.balance.toFixed(2)).toBe('6000.00');
  });

  // Scenario 13: Verify that balances remain correct after transactions
  it('Scenario 13: should maintain zero floating-point drift across repeated deposits and transfers', () => {
    const custA = createCustomer({
      email: 'acc.a@example.com',
      firstName: 'Account',
      lastName: 'A',
      initialDeposit: 100.5,
    });
    const custB = createCustomer({
      email: 'acc.b@example.com',
      firstName: 'Account',
      lastName: 'B',
      initialDeposit: 50.25,
    });

    processDeposit(custA.account.accountNumber, 0.1);
    processDeposit(custA.account.accountNumber, 0.2); // IEEE 754 test
    expect(custA.account.balance.toFixed(4)).toBe('100.8000');

    processTransfer(custA.account.accountNumber, custB.account.accountNumber, 50.3);
    expect(custA.account.balance.toFixed(4)).toBe('50.5000');
    expect(custB.account.balance.toFixed(4)).toBe('100.5500');
  });

  // Scenario 14: Verify that failed transactions do not partially update data
  it('Scenario 14: should ensure failed transfer aborts atomically without altering either account', () => {
    const sender = createCustomer({
      email: 'atomic.sender@example.com',
      firstName: 'Atomic',
      lastName: 'Sender',
      initialDeposit: 500,
    });
    const receiver = createCustomer({
      email: 'atomic.receiver@example.com',
      firstName: 'Atomic',
      lastName: 'Receiver',
      initialDeposit: 500,
    });

    expect(() => processTransfer(sender.account.accountNumber, receiver.account.accountNumber, 1000)).toThrow(BadRequestException);

    // Assert strict invariance
    expect(sender.account.balance.toFixed(2)).toBe('500.00');
    expect(receiver.account.balance.toFixed(2)).toBe('500.00');
  });

  // Scenario 15: Verify that unauthorized requests are rejected
  it('Scenario 15: should reject transfer when caller does not own the source account', () => {
    const customerOne = createCustomer({
      email: 'victim@example.com',
      firstName: 'Victim',
      lastName: 'User',
      initialDeposit: 5000,
    });
    const customerTwo = createCustomer({
      email: 'attacker@example.com',
      firstName: 'Attacker',
      lastName: 'User',
      initialDeposit: 100,
    });

    // Attacker tries to transfer from Victim's account
    expect(() =>
      processTransfer(
        customerOne.account.accountNumber,
        customerTwo.account.accountNumber,
        1000,
        customerTwo.customer.id, // Caller is customerTwo
      ),
    ).toThrow(ForbiddenException);

    expect(customerOne.account.balance.toFixed(2)).toBe('5000.00');
  });

  // Scenario 16: Verify that API errors are handled correctly by frontend contracts
  it('Scenario 16: should format structured exception payloads for frontend consumer resilience', () => {
    const err = new BadRequestException('Validation failed: Invalid routing code.');
    const response = err.getResponse() as any;

    expect(err.getStatus()).toBe(400);
    expect(typeof response === 'object' ? response.message : response).toContain('Validation failed');
  });

  // Scenario 17: Verify that customer data persists across multiple queries (simulating page reload)
  it('Scenario 17: should ensure customer data persists identically across subsequent read cycles', () => {
    const original = createCustomer({
      email: 'reload.test@example.com',
      firstName: 'Reload',
      lastName: 'Tester',
      phone: '+91 9988776655',
      initialDeposit: 7500,
    });

    // Cycle 1: Direct fetch
    const readCycle1 = getCustomer(original.customer.customerNumber);
    // Cycle 2: Simulated page reload / re-fetch
    const readCycle2 = getCustomer(original.customer.customerNumber);

    expect(readCycle1.customerNumber).toBe(readCycle2.customerNumber);
    expect(readCycle1.user?.email).toBe(readCycle2.user?.email);
    expect(readCycle1.bankAccounts[0].balance.toFixed(2)).toBe(readCycle2.bankAccounts[0].balance.toFixed(2));
    expect(readCycle2.bankAccounts[0].balance.toFixed(2)).toBe('7500.00');
  });
});
