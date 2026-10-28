const { PrismaClient, UserStatus, AccountType, AccountStatus, KycStatus } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function seedAlice() {
  console.log('--- Seeding Alice Johnson Customer ---');

  const customerRole = await prisma.role.findUnique({
    where: { name: 'CUSTOMER' },
  });

  if (!customerRole) {
    throw new Error('CUSTOMER role not found in database');
  }

  const branch = await prisma.branch.findFirst();
  if (!branch) {
    throw new Error('Branch not found in database');
  }

  const passwordHash = await argon2.hash('Password123!', {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // Check if Alice exists
  let user = await prisma.user.findUnique({
    where: { email: 'alice.customer@bms.bank' },
    include: { customer: { include: { bankAccounts: true } } },
  });

  if (user) {
    console.log('Alice user already exists. Updating/ensuring customer and accounts...');
    if (!user.customer) {
      const customer = await prisma.customer.create({
        data: {
          userId: user.id,
          customerNumber: 'CUST-001',
          kycStatus: KycStatus.VERIFIED,
          taxIdentifier: 'XXX-XX-9812',
          dateOfBirth: new Date('1990-05-15'),
          occupation: 'Software Engineer',
          monthlyIncome: '85000',
        },
      });
      user.customer = customer;
    }

    const accounts = await prisma.bankAccount.findMany({
      where: { customerId: user.customer.id },
    });

    if (accounts.length === 0) {
      await prisma.bankAccount.create({
        data: {
          accountNumber: '1001009821',
          customerId: user.customer.id,
          branchId: branch.id,
          accountType: AccountType.SAVINGS,
          status: AccountStatus.ACTIVE,
          balance: '500.0000',
          availableBalance: '0.0000',
          currency: 'INR',
        },
      });
    }
  } else {
    console.log('Creating Alice user, customer, and savings account with min balance ₹500...');
    user = await prisma.user.create({
      data: {
        email: 'alice.customer@bms.bank',
        passwordHash,
        firstName: 'Alice',
        lastName: 'Johnson',
        phone: '+1 (555) 749-3820',
        status: UserStatus.ACTIVE,
        userRoles: {
          create: { roleId: customerRole.id },
        },
        customer: {
          create: {
            customerNumber: 'CUST-001',
            kycStatus: KycStatus.VERIFIED,
            taxIdentifier: 'XXX-XX-9812',
            dateOfBirth: new Date('1990-05-15'),
            occupation: 'Software Engineer',
            monthlyIncome: '85000',
            addresses: {
              create: {
                street: '742 Evergreen Terrace',
                city: 'New York',
                state: 'NY',
                postalCode: '10001',
              },
            },
            bankAccounts: {
              create: {
                accountNumber: '1001009821',
                branchId: branch.id,
                accountType: AccountType.SAVINGS,
                status: AccountStatus.ACTIVE,
                balance: '500.0000',
                availableBalance: '0.0000',
                currency: 'INR',
              },
            },
          },
        },
      },
      include: {
        customer: {
          include: {
            bankAccounts: true,
          },
        },
      },
    });
  }

  console.log('✅ Successfully seeded Alice Johnson:');
  console.log('Email: alice.customer@bms.bank');
  console.log('Password: Password123!');
  console.log('Customer Number:', user.customer?.customerNumber);
  console.log('Bank Accounts:', user.customer?.bankAccounts);
}

seedAlice()
  .catch((e) => {
    console.error('Failed to seed Alice:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
