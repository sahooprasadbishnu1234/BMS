# Enterprise Banking Management System (BMS) - Core Financial Workflows

This document specifies the exact business logic, state machines, and sequence diagrams for the mission-critical workflows of the BMS.

---

## Workflow 1: Teller Cash Deposit & Withdrawal with Dual-Control

### State Machine: Transaction States
`PENDING` $\to$ `PROCESSING` $\to$ `COMPLETED` | `REVERSED` | `FAILED` | `REJECTED`

### Sequence Diagram: Cash Deposit by Teller
```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    actor T as Bank Teller
    participant API as BMS NestJS API
    participant Guard as RBAC & Session Guard
    participant Engine as Transaction Engine
    participant DB as PostgreSQL (Prisma ACID)
    participant GL as Double-Entry Ledger

    C->>T: Presents cash deposit ($5,000) & account number
    T->>API: POST /api/v1/deposits (with Idempotency-Key & tellerSessionId)
    API->>Guard: Verify Teller role & active open TellerSession
    Guard-->>API: Authorized
    API->>Engine: Process Deposit Request
    
    rect rgb(240, 248, 255)
    Note over Engine,DB: PostgreSQL Database Transaction
    Engine->>DB: Check IdempotencyKey in IdempotencyRecord
    Engine->>DB: Lock BankAccount FOR UPDATE
    Engine->>DB: Verify BankAccount status == ACTIVE
    Engine->>DB: Credit BankAccount balance (+ $5,000.00)
    Engine->>DB: Update TellerSession expectedCash (+ $5,000.00)
    
    Engine->>GL: Post Journal Entry
    Note over GL,DB: DEBIT Asset: Cash in Vault ($5,000.00)<br/>CREDIT Liability: Customer Deposit ($5,000.00)
    GL->>DB: Insert JournalEntry & balanced JournalLines
    
    Engine->>DB: Insert Transaction record (Status: COMPLETED)
    Engine->>DB: Commit DB Transaction
    end

    Engine->>API: Return 201 Created with Receipt DTO
    API-->>T: 201 Response with transaction receipt
    T-->>C: Issues physical receipt with transaction reference
```

---

## Workflow 2: Concurrency-Safe Internal Funds Transfer

### Deadlock-Free Pessimistic Lock Ordering Algorithm
When transferring from Account $A$ to Account $B$:
1. Let $\text{id}_1 = \min(A.\text{id}, B.\text{id})$
2. Let $\text{id}_2 = \max(A.\text{id}, B.\text{id})$
3. Lock account $\text{id}_1$ with `SELECT ... FOR UPDATE`
4. Lock account $\text{id}_2$ with `SELECT ... FOR UPDATE`
This deterministic lexicographical lock acquisition guarantees zero deadlocks even with high-frequency bidirectional transfers between accounts.

### Sequence Diagram: Transfer Execution
```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Web Client)
    participant API as BMS NestJS API
    participant Lock as Lock Ordering Manager
    participant DB as PostgreSQL
    participant AML as Compliance Rule Engine

    Customer->>API: POST /api/v1/transfers {fromAccountId, toAccountId, amount: 2500.00}
    API->>API: Validate Idempotency-Key header & Zod schema
    API->>DB: Verify Ownership: fromAccountId belongs to customer
    
    rect rgb(255, 250, 240)
    Note over Lock,DB: Atomic Database Transaction (READ COMMITTED)
    Lock->>DB: Acquire Lock 1: min(fromId, toId) FOR UPDATE
    Lock->>DB: Acquire Lock 2: max(fromId, toId) FOR UPDATE
    
    API->>DB: Check Source availableBalance >= 2500.00
    alt Insufficient Balance
        API-->>Customer: 422 Unprocessable Entity (Insufficient funds)
    else Sufficient Balance
        API->>DB: Deduct 2500.00 from Source availableBalance & balance
        API->>DB: Credit 2500.00 to Destination availableBalance & balance
        API->>DB: Insert JournalEntry (Balanced Double-Entry lines)
        API->>DB: Insert Transaction (Status: COMPLETED)
        API->>DB: Save response in IdempotencyRecord
        API->>DB: Commit Transaction
    end
    end

    API->>AML: Async evaluate AML velocity & threshold rules
    opt Amount >= $10,000 or Suspicious Velocity
        AML->>DB: Insert ComplianceCase (Alert: LARGE_CASH / VELOCITY)
    end

    API-->>Customer: 200 OK {transactionReference, newBalance, executedAt}
```

---

## Workflow 3: Dual-Control Maker-Checker Approval Workflow

### Operational Threshold Rules
- Routine Transfer $\le \$10,000$: Auto-execute.
- High-Value Transfer $> \$10,000$: Escalate to `ApprovalRequest` (`PENDING`).
- Loan Disbursement (Any amount): Mandatory Maker (Loan Officer) $\to$ Checker (Branch/Bank Manager).

```mermaid
sequenceDiagram
    autonumber
    actor Maker as Maker (Staff / Teller)
    participant API as BMS NestJS API
    participant DB as PostgreSQL
    actor Checker as Checker (Branch Manager)

    Maker->>API: POST /api/v1/transactions/exceptional (Amount: $50,000.00)
    API->>DB: Validate Maker authorization
    API->>DB: Insert ApprovalRequest (Status: PENDING, MakerId: maker.id)
    API-->>Maker: 202 Accepted {approvalId, status: "PENDING_APPROVAL"}

    Note over Checker: Checker logs into dashboard & inspects Pending Approvals
    Checker->>API: GET /api/v1/approvals/pending
    API-->>Checker: Returns list of pending requests scoped to branch

    Checker->>API: POST /api/v1/approvals/:approvalId/approve {reviewNotes: "Verified collateral"}
    
    rect rgb(240, 255, 240)
    Note over API,DB: Atomic Execution Phase
    API->>DB: Lock ApprovalRequest FOR UPDATE
    API->>API: Assert checker.id !== maker.id (Separation of duties)
    API->>API: Assert approvalRequest.status == PENDING
    API->>DB: Execute underlying financial transaction & GL posting
    API->>DB: Update ApprovalRequest status = APPROVED, checkerId = checker.id
    API->>DB: Insert AuditLog (Action: APPROVAL_EXECUTED)
    API->>DB: Commit DB Transaction
    end

    API-->>Checker: 200 OK {status: "APPROVED_AND_EXECUTED"}
```

---

## Workflow 4: Loan Origination, Reducing-Balance Amortization & Disbursement

### Reducing-Balance EMI Calculation Formula
Given:
- Principal $P$
- Monthly interest rate $r = \frac{\text{Annual Rate}}{12 \times 100}$
- Number of monthly installments $n$

$$\text{EMI} = P \times \frac{r(1 + r)^n}{(1 + r)^n - 1}$$

For each month $k \in [1, n]$:
- Monthly Interest Due: $I_k = \text{Remaining Balance}_{k-1} \times r$
- Monthly Principal Due: $P_k = \text{EMI} - I_k$
- Remaining Balance: $\text{Balance}_k = \text{Balance}_{k-1} - P_k$

### Sequence Diagram: Loan Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    actor LO as Loan Officer
    actor BM as Branch / Bank Manager
    participant API as BMS NestJS API
    participant DB as PostgreSQL

    Customer->>API: POST /api/v1/loans/applications (Amount, Tenure, ProductId)
    API->>DB: Create LoanApplication (Status: SUBMITTED)
    API-->>Customer: 201 Created {applicationNumber}

    LO->>API: GET /api/v1/loans/applications (Review queue)
    LO->>API: POST /api/v1/loans/applications/:id/recommend {action: "RECOMMEND", creditScore: 780}
    API->>DB: Update LoanApplication (Status: RECOMMENDED)

    BM->>API: POST /api/v1/loans/applications/:id/approve
    API->>DB: Update LoanApplication (Status: APPROVED)

    BM->>API: POST /api/v1/loans/applications/:id/disburse
    rect rgb(245, 245, 255)
    Note over API,DB: Atomic Disbursement & Amortization
    API->>DB: Create LoanAccount (Status: ACTIVE, Outstanding: Principal)
    API->>DB: Generate full LoanRepayment amortization schedule rows
    API->>DB: Credit customer's BankAccount with loan principal
    API->>DB: Post GL: DEBIT Loan Receivables, CREDIT Customer Deposit
    API->>DB: Commit Transaction
    end
    API-->>BM: 200 OK (Disbursed)
```
