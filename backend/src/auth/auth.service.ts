import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { AccountStatus, AccountType, KycStatus, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = loginDto.email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        employee: { include: { branch: true } },
        customer: true,
      },
    });

    if (!user && normalizedEmail === 'alice.customer@bms.bank') {
      user = await this.ensureAliceCustomer();
    }

    if (!user) {
      throw new UnauthorizedException('Invalid banking credentials.');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Account locked due to consecutive failed attempts. Try again in ${waitMinutes} minutes.`,
      );
    }

    const isMatch = await argon2.verify(user.passwordHash, loginDto.password);
    if (!isMatch) {
      const failed = user.failedLoginAttempts + 1;
      let lockedUntil: Date | null = null;
      if (failed >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: failed, lockedUntil },
      });

      await this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'LOGIN_FAILURE',
          targetEntity: 'User',
          targetEntityId: user.id,
          ipAddress,
          userAgent,
          metadata: { failedAttempts: failed, isLocked: failed >= 5 },
        },
      });

      throw new UnauthorizedException('Invalid banking credentials.');
    }

    // Reset failed attempts on success
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    );

    const tokens = await this.generateTokens(user.id, user.email, roles);

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'LOGIN_SUCCESS',
        targetEntity: 'User',
        targetEntityId: user.id,
        ipAddress,
        userAgent,
        metadata: { roles },
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        permissions,
        employee: user.employee
          ? {
              id: user.employee.id,
              employeeNumber: user.employee.employeeNumber,
              jobTitle: user.employee.jobTitle,
              department: user.employee.department,
              branchId: user.employee.branchId,
              branchName: user.employee.branch.name,
            }
          : null,
        customer: user.customer
          ? {
              id: user.customer.id,
              customerNumber: user.customer.customerNumber,
              kycStatus: user.customer.kycStatus,
            }
          : null,
      },
      ...tokens,
    };
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const passwordHash = await argon2.hash(registerDto.password, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Default to main HQ branch for registration
    const defaultBranch = await this.prisma.branch.findFirst({
      where: { code: 'BR-001' },
    });

    const customerRole = await this.prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });

    if (!defaultBranch || !customerRole) {
      throw new BadRequestException('System configuration error: Missing branch or customer role.');
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const customerNumber = `CUST-${Date.now().toString().slice(-4)}${randomSuffix}`;
    const accountNumber = `100900${randomSuffix}${Math.floor(10 + Math.random() * 90)}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: registerDto.email,
          passwordHash,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          phone: registerDto.phone,
          status: UserStatus.ACTIVE,
          userRoles: {
            create: { roleId: customerRole.id },
          },
        },
      });

      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          customerNumber,
          kycStatus: KycStatus.VERIFIED,
          occupation: 'Retail Banking Customer',
          monthlyIncome: '5000.0000',
        },
      });

      // Open initial welcome savings account with ₹500 mandatory deposit
      const account = await tx.bankAccount.create({
        data: {
          accountNumber,
          customerId: customer.id,
          branchId: defaultBranch.id,
          accountType: AccountType.SAVINGS,
          status: AccountStatus.ACTIVE,
          balance: '500.0000',
          availableBalance: '0.0000', // ₹500 is locked as mandatory reserve
        },
      });

      // Post initial opening balance journal entry
      const cashVault = await tx.ledgerAccount.findUnique({ where: { code: '1010' } });
      const customerDepositGL = await tx.ledgerAccount.findUnique({ where: { code: '2010' } });

      if (cashVault && customerDepositGL) {
        const je = await tx.journalEntry.create({
          data: {
            entryNumber: `JE-REG-${Date.now()}`,
            description: `Initial customer opening deposit: ${customer.customerNumber}`,
            isBalanced: true,
            journalLines: {
              create: [
                { ledgerAccountId: cashVault.id, entryType: 'DEBIT', amount: '500.0000', memo: 'Welcome cash funding' },
                { ledgerAccountId: customerDepositGL.id, entryType: 'CREDIT', amount: '500.0000', memo: 'Customer savings balance credit' },
              ],
            },
          },
        });

        await tx.transaction.create({
          data: {
            referenceNumber: `TX-REG-${Date.now()}`,
            destinationAccountId: account.id,
            transactionType: 'DEPOSIT',
            amount: '500.0000',
            status: 'COMPLETED',
            description: 'New Customer Welcome Initial Deposit (₹500)',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'CUSTOMER_REGISTRATION',
          targetEntity: 'Customer',
          targetEntityId: customer.id,
          metadata: { email: user.email, accountNumber: account.accountNumber },
        },
      });

      return { user, customer, account };
    });

    return this.login({ email: registerDto.email, password: registerDto.password });
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'enterprise_bms_jwt_refresh_secret_key_change_in_production_451829',
      });

      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token is revoked, expired, or invalid.');
      }

      // Invalidate current refresh token
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User account no longer active.');
      }

      const roles = user.userRoles.map((ur) => ur.role.name);
      return this.generateTokens(user.id, user.email, roles, tokenRecord.family);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    roles: string[],
    family?: string,
  ) {
    const payload = { sub: userId, email, roles };

    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'enterprise_bms_jwt_access_secret_key_change_in_production_981247';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'enterprise_bms_jwt_refresh_secret_key_change_in_production_451829';

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, jti: crypto.randomUUID() },
      {
        secret: refreshSecret,
        expiresIn: '7d',
      },
    );

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenFamily = family || crypto.randomUUID();

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        family: tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 mins in seconds
    };
  }

  async ensureAliceCustomer() {
    let user = await this.prisma.user.findUnique({
      where: { email: 'alice.customer@bms.bank' },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        employee: { include: { branch: true } },
        customer: {
          include: {
            bankAccounts: true,
          },
        },
      },
    });

    if (user) {
      // Check if Alice has a bank account; if not, create one
      if (user.customer && (!user.customer.bankAccounts || user.customer.bankAccounts.length === 0)) {
        const branch = await this.prisma.branch.findFirst();
        await this.prisma.bankAccount.create({
          data: {
            accountNumber: '1001009821',
            customerId: user.customer.id,
            branchId: branch?.id || '',
            accountType: AccountType.SAVINGS,
            status: AccountStatus.ACTIVE,
            balance: '500.0000',
            availableBalance: '0.0000',
            currency: 'INR',
          },
        });
      }
      return user;
    }

    const customerRole = await this.prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });
    const branch = await this.prisma.branch.findFirst();

    const defaultPasswordHash = await argon2.hash('Password123!', {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    user = await this.prisma.user.create({
      data: {
        email: 'alice.customer@bms.bank',
        passwordHash: defaultPasswordHash,
        firstName: 'Alice',
        lastName: 'Johnson',
        phone: '+1 (555) 749-3820',
        status: UserStatus.ACTIVE,
        userRoles: {
          create: { roleId: customerRole?.id || '' },
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
                branchId: branch?.id || '',
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
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        employee: { include: { branch: true } },
        customer: {
          include: {
            bankAccounts: true,
          },
        },
      },
    });

    return user;
  }

  async getExistingCustomers() {
    let customers = await this.prisma.customer.findMany({
      where: {
        user: { status: 'ACTIVE' },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        bankAccounts: {
          select: {
            id: true,
            accountNumber: true,
            accountType: true,
            balance: true,
            availableBalance: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const hasAlice = customers.some((c) => c.user.email.toLowerCase() === 'alice.customer@bms.bank');
    if (!hasAlice) {
      await this.ensureAliceCustomer();
      customers = await this.prisma.customer.findMany({
        where: {
          user: { status: 'ACTIVE' },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          bankAccounts: {
            select: {
              id: true,
              accountNumber: true,
              accountType: true,
              balance: true,
              availableBalance: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    return customers.map((c) => ({
      id: c.id,
      name: `${c.user.firstName} ${c.user.lastName}`.trim(),
      email: c.user.email,
      phone: c.user.phone,
      customerNumber: c.customerNumber,
      accounts: c.bankAccounts,
      primaryAccount: c.bankAccounts[0] || null,
      balance: c.bankAccounts[0]?.balance || '0.00',
    }));
  }

  async customerQuickLogin(email: string, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        employee: { include: { branch: true } },
        customer: true,
      },
    });

    if (!user && normalizedEmail === 'alice.customer@bms.bank') {
      user = await this.ensureAliceCustomer();
    }

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Customer account not found or deactivated.');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    );

    const tokens = await this.generateTokens(user.id, user.email, roles);

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'CUSTOMER_QUICK_LOGIN',
        targetEntity: 'User',
        targetEntityId: user.id,
        ipAddress,
        userAgent,
        metadata: { roles, quickLogin: true },
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        permissions,
        employee: user.employee
          ? {
              id: user.employee.id,
              employeeNumber: user.employee.employeeNumber,
              jobTitle: user.employee.jobTitle,
              department: user.employee.department,
              branchId: user.employee.branchId,
              branchName: user.employee.branch.name,
            }
          : null,
        customer: user.customer
          ? {
              id: user.customer.id,
              customerNumber: user.customer.customerNumber,
              kycStatus: user.customer.kycStatus,
            }
          : null,
      },
      ...tokens,
    };
  }
}

