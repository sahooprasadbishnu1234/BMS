# Enterprise Banking Management System (BMS) - System Architecture

## 1. Architectural Overview

The Banking Management System (BMS) is designed as an enterprise-grade modular monolith adhering to Domain-Driven Design (DDD) principles, Hexagonal Architecture (Ports and Adapters), and Tier-1 banking financial integrity standards.

### High-Level Architectural Diagram

```
+-----------------------------------------------------------------------------------+
|                                PRESENTATION TIER                                  |
|  React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts               |
|  10 Role-Tailored Dashboards | Client-Side Zod Validation | Secure Session Context|
+-----------------------------------------------------------------------------------+
                                         |  HTTPS / REST / JSON
                                         v
+-----------------------------------------------------------------------------------+
|                                APPLICATION GATEWAY                                |
|  Rate Limiter (Throttler) | CORS | Helmet Security Headers | Global ValidationPipe|
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                             CORE SERVICE LAYER (NestJS)                           |
|  +-------------------+  +-------------------+  +--------------------------------+ |
|  | Auth & Security   |  | Accounts & Ledger |  | Transactions & Approvals       | |
|  | - Argon2id        |  | - Savings/Current |  | - Deposit / Withdraw / Transfer| |
|  | - JWT + Rotation  |  | - Double-Entry GL |  | - Maker-Checker Engine         | |
|  | - 10-Role RBAC    |  | - Immutable Books |  | - Concurrency & Idempotency    | |
|  +-------------------+  +-------------------+  +--------------------------------+ |
|  +-------------------+  +-------------------+  +--------------------------------+ |
|  | Loans & Credit    |  | Support & CRM     |  | Audit & Compliance             | |
|  | - Amortization    |  | - Ticket Tracking |  | - Append-only Audit Trail      | |
|  | - Disbursement    |  | - SLAs & Escalation| | - AML / CTR Threshold Alerting  | |
|  +-------------------+  +-------------------+  +--------------------------------+ |
+-----------------------------------------------------------------------------------+
                                         |  Prisma Client (ORM) + Raw SQL Locking
                                         v
+-----------------------------------------------------------------------------------+
|                                  DATA PERSISTENCE                                 |
|  PostgreSQL 18.x                                                                  |
|  - ACID Compliant Transactions                                                    |
|  - Pessimistic Row Locking (`SELECT ... FOR UPDATE`)                              |
|  - Numeric(18, 4) Monetary Precision (No Floating Point Drift)                     |
|  - Foreign Key Constraints & Check Constraints (`credit == debit`)                 |
|  - Append-Only Partitioned Audit Trails                                           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Financial Engine & Double-Entry Ledger

In accordance with Generally Accepted Accounting Principles (GAAP) and IFRS, customer bank accounts do not exist in isolation; they are liability accounts on the bank's general balance sheet.

### Double-Entry Invariance
Every financial event produces a balanced `JournalEntry` consisting of at least two `JournalLine` items satisfying:

$$\sum \text{Debit Amounts} = \sum \text{Credit Amounts}$$

### Standard Chart of Accounts (COA) Structure
1. **Assets (1000-1999)**:
   - `1010`: Cash in Vault (Physical branch currency)
   - `1020`: Central Bank Clearing Account
   - `1050`: Loan Receivables (Outstanding loan principal)
2. **Liabilities (2000-2999)**:
   - `2010`: Customer Savings Deposits (Demand Deposits)
   - `2020`: Customer Current Deposits (Checking Accounts)
   - `2030`: Accrued Interest Payable
3. **Equity (3000-3999)**:
   - `3010`: Common Capital
   - `3020`: Retained Earnings
4. **Revenue (4000-4999)**:
   - `4010`: Loan Interest Income
   - `4020`: Transaction Processing Fees
   - `4030`: Account Maintenance Fees
5. **Expenses (5000-5999)**:
   - `5010`: Deposit Interest Expense
   - `5020`: Operational & Administrative Expense

### Posting Rules for Transactions
- **Cash Deposit ($500 into Savings)**:
  - `DEBIT`: Cash in Vault (`1010`) +$500.00 (Asset increases)
  - `CREDIT`: Customer Savings Deposits (`2010`, tagged with `accountId`) +$500.00 (Liability increases)
- **Cash Withdrawal ($200 from Savings)**:
  - `DEBIT`: Customer Savings Deposits (`2010`, tagged with `accountId`) -$200.00 (Liability decreases)
  - `CREDIT`: Cash in Vault (`1010`) -$200.00 (Asset decreases)
- **Internal Funds Transfer ($300 from Account A to Account B)**:
  - `DEBIT`: Account A (`2010`/`2020`) -$300.00
  - `CREDIT`: Account B (`2010`/`2020`) +$300.00
- **Loan Disbursement ($10,000 to Customer Current Account)**:
  - `DEBIT`: Loan Receivables (`1050`, tagged with `loanAccountId`) +$10,000.00 (Asset increases)
  - `CREDIT`: Customer Current Deposits (`2020`, tagged with `accountId`) +$10,000.00 (Liability increases)

---

## 3. Concurrency, Race Condition, & Idempotency Controls

### Concurrency Protection (Pessimistic Locking)
Financial transfers must never suffer from race conditions or "double-spending" when two requests are executed simultaneously against the same account balance.

```sql
-- Predictable ordered locking prevents deadlocks between concurrent transfers:
-- If transferring between Account A (UUID: 001) and Account B (UUID: 002),
-- locks are ALWAYS acquired in lexicographical order (001 first, then 002).

SELECT * FROM "BankAccount" 
WHERE "id" IN ($firstId, $secondId) 
ORDER BY "id" ASC 
FOR UPDATE;
```

### Idempotency Enforcement
All state-modifying requests (`POST /transfers`, `POST /deposits`, `POST /withdrawals`) accept an `Idempotency-Key` header.
- An incoming request inserts or checks an `IdempotencyRecord` table using a unique constraint on `(key, userId)`.
- If an operation is currently executing, subsequent identical requests receive `409 Conflict` ("Operation in progress").
- If the operation already succeeded, the backend serves the cached response payload from the `IdempotencyRecord` table without re-executing any ledger changes.

---

## 4. Maker-Checker Segregation of Duties

To comply with SOX, Basel III, and financial internal control standards:
1. **Segregation**: The user initiating an operation (Maker) cannot be the user authorizing it (Checker).
2. **Threshold Configuration**:
   - Routine transfers below limit (e.g., $\le \$10,000$) execute automatically.
   - High-value transactions ($> \$10,000$), loan disbursements, account closures, and manual ledger adjustments enter `ApprovalRequest` with status `PENDING`.
3. **Execution Guarantee**:
   - Checker executes approval inside an atomic database transaction.
   - Request state transitions atomically from `PENDING` $\to$ `APPROVED` $\to$ `EXECUTED` using optimistic concurrency version locks on the approval entity.
   - Rejection sets status to `REJECTED` and releases any held reservations without touching general ledger balances.

---

## 5. Security & Authentication Architecture

1. **Password Security**:
   - Hashed using **Argon2id** (`memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`).
2. **Dual-Token System**:
   - **Access Token**: Short-lived JWT (15 minutes lifespan) containing `userId`, `roles`, `branchId`, and `permissions`.
   - **Refresh Token**: Stored as SHA-256 hash in database with token-family rotation. If a revoked or previously exchanged refresh token is presented, the entire family is invalidated immediately (theft detection).
3. **Rate Limiting & Lockout**:
   - NestJS Throttler protects endpoints from brute force.
   - 5 consecutive failed logins lock account for 15 minutes and generate a high-severity `AuditLog` entry.
4. **Three-Tier Authorization Guards**:
   - `JwtAuthGuard`: Validates cryptographic signature and non-revocation.
   - `RolesGuard` / `PermissionsGuard`: Enforces RBAC permissions specified via decorators (`@RequirePermissions('transfer:create')`).
   - `ResourceOwnershipGuard` / `BranchScopeGuard`: Ensures customers can only access accounts they own, and branch managers can only supervise employees and accounts belonging to their assigned branch.
