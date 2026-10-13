# Enterprise Banking Management System (BMS)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2010.x-red.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8.svg)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2018-336791.svg)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/ORM-Prisma%205.x-2D3748.svg)](https://www.prisma.io/)

A full-stack, enterprise-grade **Banking Management System (BMS)** built for high concurrency, financial auditability, double-entry accounting integrity, and regulatory compliance. Designed for university major project demonstrations, enterprise hackathons, and production-like banking core simulation.

---

## 🏛️ 1. Architecture Highlights

- **Modular Monolith**: Clean domain boundaries using NestJS modules (Auth, Accounts, Transactions, Ledger, Approvals, Loans, Support, Reconciliation, Audit, Compliance, Notifications, Reports).
- **Double-Entry General Ledger**: Every financial transaction maps to balanced, immutable debit/credit journal entries (`sum(debit) == sum(credit)`).
- **Concurrency & Double-Spending Protection**: Predictable row-level pessimistic locking (`SELECT ... FOR UPDATE` with deterministic lock ordering: `min(id, id) -> max(id, id)`) preventing race conditions and deadlocks.
- **Idempotency Guarantee**: `Idempotency-Key` headers prevent duplicate charges or double executions across network retries.
- **Dual-Control Maker-Checker**: Separation of duties enforcing that high-value transactions ($> \$10,000$), loan disbursements, and credit operations require secondary checker verification.
- **Enterprise RBAC**: Server-enforced permissions across 10 discrete user roles with branch-level data isolation.
- **Cryptographic Security**: Argon2id password hashing, rotating JWT access/refresh token pairs, progressive account lockout after failed attempts.

---

## 👥 2. Ten Supported User Roles & Fictional Seed Credentials

All seed accounts use the default password: **`Password123!`**

| # | Role | Name | Email | Primary Responsibilities |
|---|------|------|-------|--------------------------|
| 1 | **CUSTOMER** | Alice Johnson | `alice.customer@bms.bank` | Self-service retail banking, deposits, transfers, beneficiaries, statements, loan applications |
| 2 | **CUSTOMER** | Bob Smith | `bob.customer@bms.bank` | Retail customer with active personal installment loan facility |
| 3 | **CUSTOMER** | Charlie Davis | `charlie.customer@bms.bank` | Commercial checking customer ($25,000.00 liquid balance) |
| 4 | **BANK MANAGER** | Victoria Sterling | `bankmanager@bms.bank` | Executive oversight, high-value Maker-Checker approvals, bank-wide reports |
| 5 | **BRANCH MANAGER** | Marcus Chen | `branchmanager@bms.bank` | Branch operations, teller cash reconciliation sign-off, branch loan queue |
| 6 | **BANK TELLER** | Elena Rostova | `teller@bms.bank` | Cash drawer shifts, over-the-counter deposits, withdrawals, daily reconciliation |
| 7 | **ACCOUNTANT** | David Kowalski | `accountant@bms.bank` | Double-entry general ledger, manual journal vouchers, Trial Balance, Balance Sheet |
| 8 | **LOAN OFFICER** | Sarah Jenkins | `loanofficer@bms.bank` | Credit underwriting, document assessments, reducing-balance EMI schedule calculations |
| 9 | **CUSTOMER SERVICE** | Liam O’Connor | `support@bms.bank` | Dispute ticket queue, customer messages, confidential internal staff notes, escalation |
| 10 | **SYSTEM ADMIN** | Alexander Vance | `admin@bms.bank` | IAM user provisioning, role bindings, account lockout relief (strictly barred from financial ledger) |
| 11 | **AUDITOR** | Jonathan Reid | `auditor@bms.bank` | Read-only access to immutable forensic audit trail and historical ledger activity |
| 12 | **COMPLIANCE OFFICER**| Rachel Zane | `compliance@bms.bank` | Anti-Money Laundering (AML) monitoring, CTR $10k+ threshold alerts, SAR case filings |

> **Tip**: The application includes an interactive **1-Click Demo Login** on the login screen and an in-app **Role Switcher** in the top navigation bar, allowing evaluators to seamlessly inspect all 10 dashboards without re-typing credentials.

---

## 🗄️ 3. Database Schema Overview (30 Core Models)

The system uses a normalized PostgreSQL schema modeled with Prisma ORM:

1. `User` - Authentication principal, credentials, lockout flags
2. `Role` - RBAC role definitions
3. `Permission` - Fine-grained operation authorization tokens
4. `UserRole` - Many-to-many user-to-role bindings
5. `RolePermission` - Mapping of permissions to roles
6. `RefreshToken` - Revocable session refresh credentials with family rotation
7. `Branch` - Physical bank branches and routing numbers
8. `Employee` - Internal bank staff metadata and hierarchy
9. `Customer` - Banking customer identity and KYC attributes
10. `Address` - Customer residential addresses
11. `BankAccount` - Customer depository accounts (Savings/Current)
12. `AccountBeneficiary` - Whitelisted transfer targets
13. `Transaction` - Financial transactions across accounts
14. `LedgerAccount` - Double-entry Chart of Accounts (COA)
15. `JournalEntry` - Balanced double-entry financial posting container
16. `JournalLine` - Individual debit/credit lines
17. `ApprovalRequest` - Maker-checker dual-control approval tickets
18. `LoanProduct` - Loan terms, interest rates, and constraints
19. `LoanApplication` - Customer credit requests undergoing review
20. `LoanDocument` - KYC/financial proof document attachments
21. `LoanAccount` - Disbursed loan facility and balance tracking
22. `LoanRepayment` - Amortization schedule line items
23. `SupportTicket` - Customer service and dispute cases
24. `SupportMessage` - Conversation history and internal staff notes
25. `Notification` - In-app user notifications and security alerts
26. `AuditLog` - Append-only forensic audit trail entries
27. `ComplianceCase` - Anti-Money Laundering (AML) and CTR cases
28. `TellerSession` - Cash drawer operational shift tracking
29. `CashReconciliation` - End-of-day teller cash balancing
30. `IdempotencyRecord` - Zero-duplicate transaction execution records

---

## 🚀 4. Installation & Local Execution Guide

### Prerequisites
- **Node.js**: v18+ (tested on v24.14.0)
- **PostgreSQL**: 14+ (tested on PostgreSQL 18.3 local service on port 5432)
- **npm**: v9+

### Terminal 1: Database Setup & Seed
If using local PostgreSQL:
```powershell
# Create database (if not already created)
psql -U postgres -h localhost -c "CREATE DATABASE bms_db;"

# Navigate to backend
cd backend

# Install dependencies
npm install

# Push schema to database
npx prisma generate
npx prisma db push

# Load comprehensive seed data (10 roles, branches, transactions, loans, GL)
npm run seed
```

*Or if using Docker Compose:*
```bash
docker compose up -d postgres
```

### Terminal 2: Run Backend API
```powershell
cd backend
npm run build
npm run start:prod
# Or in development watch mode:
npm run start:dev
```
- API Base URL: `http://localhost:4000/api/v1`
- Swagger OpenAPI Docs: `http://localhost:4000/api/docs`

### Terminal 3: Run Frontend Application
```powershell
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:5173/`

---

## 🧪 5. Automated Testing

Run the automated banking core unit & algorithm tests:
```powershell
cd backend
npm test
```

### Verified Test Cases:
- `Double-Entry General Ledger Invariance`: Asserts `sum(Debits) === sum(Credits)` and rejects unbalanced vouchers.
- `Deterministic Lock Ordering`: Asserts predictable account lock ordering preventing deadlocks.
- `Maker-Checker Dual Control`: Enforces that Maker $\neq$ Checker for sensitive operations.
- `Reducing-Balance Amortization`: Mathematically verifies EMI formula calculations.
- `Financial Precision`: Verifies `Decimal.js` prevents floating-point drift.

---

## 🔒 6. Security Architecture & Limitations

### Implemented Security Controls:
- **Argon2id** password hashing (`m=65536, t=3, p=4`).
- **Dual JWT tokens**: 15-minute access token + 7-day rotating refresh token.
- **Account Lockout**: 5 failed login attempts trigger 15-minute account lock.
- **Role-Based Access Control (RBAC)**: Server-enforced decorators (`@Roles()`, `@RequirePermissions()`).
- **Data Scoping**: Customers access only owned accounts; Branch staff restricted to branch scope.
- **Idempotency**: Prevents double-spending and network replay errors.
- **Append-Only Auditing**: Logs actor, IP, entity, and action codes.

### Academic / Demonstration Notice:
This application is designed for an engineering college major project, hackathon, and enterprise software pilot. All funds and transactions are simulated. Connecting to SWIFT, Fedwire, ACH, or live payment gateways requires banking charter authorization, PCI-DSS Level 1 certification, and HSM cryptographic modules.
