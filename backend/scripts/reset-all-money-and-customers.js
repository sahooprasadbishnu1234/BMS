const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetAllMoneyAndCustomers() {
  console.log('===========================================================');
  console.log('RESETTING ALL MONEY BALANCES TO 0 & DELETING ALL CUSTOMERS');
  console.log('===========================================================');

  await prisma.$transaction(async (tx) => {
    // 1. Delete all loan repayments & loan accounts
    console.log('Deleting loan repayments...');
    const repayments = await tx.loanRepayment.deleteMany({});
    console.log(`Deleted ${repayments.count} loan repayments.`);

    console.log('Deleting loan accounts...');
    const loanAccounts = await tx.loanAccount.deleteMany({});
    console.log(`Deleted ${loanAccounts.count} loan accounts.`);

    // 2. Delete all loan documents & loan applications
    console.log('Deleting loan documents...');
    const loanDocs = await tx.loanDocument.deleteMany({});
    console.log(`Deleted ${loanDocs.count} loan documents.`);

    console.log('Deleting loan applications...');
    const loanApps = await tx.loanApplication.deleteMany({});
    console.log(`Deleted ${loanApps.count} loan applications.`);

    // 3. Delete compliance cases
    console.log('Deleting compliance cases...');
    const compliance = await tx.complianceCase.deleteMany({});
    console.log(`Deleted ${compliance.count} compliance cases.`);

    // 4. Delete approval requests
    console.log('Deleting approval requests...');
    const approvals = await tx.approvalRequest.deleteMany({});
    console.log(`Deleted ${approvals.count} approval requests.`);

    // 5. Delete support messages & tickets
    console.log('Deleting support messages...');
    const ticketMsgs = await tx.supportMessage.deleteMany({});
    console.log(`Deleted ${ticketMsgs.count} support messages.`);

    console.log('Deleting support tickets...');
    const tickets = await tx.supportTicket.deleteMany({});
    console.log(`Deleted ${tickets.count} support tickets.`);

    // 6. Delete journal lines & entries
    console.log('Deleting journal lines...');
    const journalLines = await tx.journalLine.deleteMany({});
    console.log(`Deleted ${journalLines.count} journal lines.`);

    console.log('Deleting journal entries...');
    const journalEntries = await tx.journalEntry.deleteMany({});
    console.log(`Deleted ${journalEntries.count} journal entries.`);

    // 7. Delete transactions
    console.log('Deleting transactions...');
    const transactions = await tx.transaction.deleteMany({});
    console.log(`Deleted ${transactions.count} transactions.`);

    // 8. Delete cash reconciliations & teller sessions
    console.log('Deleting cash reconciliations...');
    const reconciliations = await tx.cashReconciliation.deleteMany({});
    console.log(`Deleted ${reconciliations.count} reconciliations.`);

    console.log('Deleting teller sessions...');
    const sessions = await tx.tellerSession.deleteMany({});
    console.log(`Deleted ${sessions.count} teller sessions.`);

    // 9. Delete account beneficiaries
    console.log('Deleting account beneficiaries...');
    const beneficiaries = await tx.accountBeneficiary.deleteMany({});
    console.log(`Deleted ${beneficiaries.count} beneficiaries.`);

    // 10. Delete bank accounts
    console.log('Deleting bank accounts...');
    const bankAccounts = await tx.bankAccount.deleteMany({});
    console.log(`Deleted ${bankAccounts.count} bank accounts.`);

    // 11. Delete customer addresses
    console.log('Deleting customer addresses...');
    const addresses = await tx.address.deleteMany({});
    console.log(`Deleted ${addresses.count} addresses.`);

    // 12. Find all customer user IDs
    const customers = await tx.customer.findMany({ select: { id: true, userId: true } });
    const customerUserIds = customers.map((c) => c.userId);

    // 13. Delete customer profiles
    console.log('Deleting all customer profiles...');
    const deletedCustomers = await tx.customer.deleteMany({});
    console.log(`Deleted ${deletedCustomers.count} customer records.`);

    // 14. Delete user roles, refresh tokens, notifications, and user records for customers
    if (customerUserIds.length > 0) {
      console.log(`Deleting customer user auth records for ${customerUserIds.length} users...`);

      const deletedTokens = await tx.refreshToken.deleteMany({
        where: { userId: { in: customerUserIds } },
      });
      console.log(`Deleted ${deletedTokens.count} refresh tokens.`);

      const deletedNotifications = await tx.notification.deleteMany({
        where: { userId: { in: customerUserIds } },
      });
      console.log(`Deleted ${deletedNotifications.count} notifications.`);

      const deletedUserRoles = await tx.userRole.deleteMany({
        where: { userId: { in: customerUserIds } },
      });
      console.log(`Deleted ${deletedUserRoles.count} user roles.`);

      const deletedAudit = await tx.auditLog.deleteMany({
        where: { actorId: { in: customerUserIds } },
      });
      console.log(`Deleted ${deletedAudit.count} audit logs for customers.`);

      const deletedUsers = await tx.user.deleteMany({
        where: { id: { in: customerUserIds } },
      });
      console.log(`Deleted ${deletedUsers.count} customer user records.`);
    }

    // Also delete any remaining users with role CUSTOMER that had no customer record
    const customerRole = await tx.role.findUnique({ where: { name: 'CUSTOMER' } });
    if (customerRole) {
      const leftoverCustomerRoles = await tx.userRole.findMany({
        where: { roleId: customerRole.id },
        select: { userId: true },
      });
      const leftoverUserIds = leftoverCustomerRoles.map((r) => r.userId);
      if (leftoverUserIds.length > 0) {
        // verify none are employees
        const employees = await tx.employee.findMany({
          where: { userId: { in: leftoverUserIds } },
          select: { userId: true },
        });
        const empUserIds = new Set(employees.map((e) => e.userId));
        const nonEmpUserIds = leftoverUserIds.filter((uid) => !empUserIds.has(uid));

        if (nonEmpUserIds.length > 0) {
          await tx.refreshToken.deleteMany({ where: { userId: { in: nonEmpUserIds } } });
          await tx.notification.deleteMany({ where: { userId: { in: nonEmpUserIds } } });
          await tx.userRole.deleteMany({ where: { userId: { in: nonEmpUserIds } } });
          await tx.auditLog.deleteMany({ where: { actorId: { in: nonEmpUserIds } } });
          const extraDeleted = await tx.user.deleteMany({ where: { id: { in: nonEmpUserIds } } });
          console.log(`Deleted ${extraDeleted.count} additional non-employee customer users.`);
        }
      }
    }

    // 15. Reset all Ledger Account balances to 0.0000
    console.log('Resetting all General Ledger accounts to ₹0.0000...');
    const resetGL = await tx.ledgerAccount.updateMany({
      data: {
        currentBalance: '0.0000',
      },
    });
    console.log(`Reset ${resetGL.count} general ledger accounts to ₹0.0000.`);

    // 16. Clear idempotency records
    await tx.idempotencyRecord.deleteMany({});
  });

  console.log('===========================================================');
  console.log('DATABASE RESET COMPLETED SUCCESSFULLY!');
  console.log('Total Customers: 0');
  console.log('Total Bank Accounts: 0');
  console.log('Total Transactions: 0');
  console.log('All General Ledger Balances: ₹0.0000');
  console.log('===========================================================');
}

resetAllMoneyAndCustomers()
  .catch((e) => {
    console.error('Error during database reset:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
