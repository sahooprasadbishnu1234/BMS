# Enterprise Banking Management System (BMS) - Role-Based Access Control (RBAC) Matrix

## 1. Role Definitions & Scopes

The system enforces strict multi-tier authorization across 10 functional roles. Permissions are enforced via NestJS `@RequirePermissions()` decorators combined with `@Scope()` validation (checking ownership or branch assignment).

| # | Role Identifier | Display Name | Authority Scope | Primary Responsibility |
|---|-----------------|--------------|-----------------|------------------------|
| 1 | `CUSTOMER` | Customer / End-User | Resource Ownership (`OWN`) | Self-service retail banking, transfers, loan applications |
| 2 | `BANK_MANAGER` | Bank Manager (Executive) | Enterprise / Bank-Wide (`GLOBAL`) | High-value approvals, enterprise metrics, executive supervision |
| 3 | `BRANCH_MANAGER` | Branch Manager | Assigned Branch (`BRANCH`) | Branch transaction authorization, staff oversight, cash reconciliation approval |
| 4 | `BANK_TELLER` | Bank Teller / Cashier | Teller Session (`TELLER_SESSION`) | Over-the-counter deposits, withdrawals, cash drawer balancing |
| 5 | `ACCOUNTANT` | Financial Accountant | General Ledger (`GL_READ_WRITE`) | Double-entry journal entries, financial statements, balance reconciliation |
| 6 | `LOAN_OFFICER` | Credit & Loan Officer | Lending Domain (`BRANCH_LOANS`) | Credit underwriting, loan document review, risk assessment & recommendation |
| 7 | `CUSTOMER_SERVICE_OFFICER` | Customer Support Officer | CRM & Tickets (`SUPPORT`) | Support ticket resolution, inquiry triage, complaint escalation |
| 8 | `SYSTEM_ADMINISTRATOR` | System Administrator | Infrastructure & IAM (`IAM_OPS`) | Employee user provisioning, role assignments, system health, lockouts |
| 9 | `AUDITOR` | Internal / External Auditor | Global Read-Only (`READ_ONLY`) | Append-only audit inspection, compliance tracking, ledger audit |
| 10 | `COMPLIANCE_OFFICER` | Compliance & AML Officer | Regulatory Oversight (`COMPLIANCE`) | AML transaction monitoring, CTR/SAR alerts, KYC reviews |

---

## 2. Granular Permissions Catalog

```
Domain: AUTH & USERS
  - auth:session_refresh
  - user:read_own
  - user:update_own
  - user:manage_all (Admin only)
  - role:manage_all (Admin only)

Domain: BANK ACCOUNTS
  - account:read_own
  - account:read_branch
  - account:read_all
  - account:create_customer
  - account:status_change (Freeze / Unfreeze)
  - account:close_request

Domain: TRANSACTIONS & TRANSFERS
  - transaction:read_own
  - transaction:read_branch
  - transaction:read_all
  - transfer:execute_own
  - deposit:teller_execute
  - withdrawal:teller_execute
  - transaction:override_limit

Domain: MAKER-CHECKER APPROVALS
  - approval:read_pending_branch
  - approval:read_pending_global
  - approval:maker_submit
  - approval:checker_action_branch
  - approval:checker_action_global

Domain: LOANS & UNDERWRITING
  - loan:apply_own
  - loan:read_own
  - loan:read_branch
  - loan:read_all
  - loan:assess_eligibility
  - loan:recommend_action
  - loan:approve_final
  - loan:disburse_funds

Domain: ACCOUNTING & LEDGER
  - ledger:read_reports
  - ledger:post_journal_entry
  - ledger:reconcile_accounts

Domain: TELLER OPERATIONS
  - teller:session_open
  - teller:session_close
  - teller:reconcile_cash

Domain: CUSTOMER SUPPORT
  - support:create_own
  - support:read_own
  - support:triage_manage
  - support:escalate

Domain: AUDIT & COMPLIANCE
  - audit:read_logs
  - audit:export_evidence
  - compliance:read_cases
  - compliance:investigate_case
  - compliance:submit_sar
```

---

## 3. Comprehensive Role-Permission Mapping Matrix

| Permission Code | CUS | BM | BRM | TEL | ACC | LO | CSO | ADM | AUD | CMP |
|-----------------|:---:|:--:|:---:|:---:|:---:|:--:|:---:|:---:|:---:|:---:|
| `auth:session_refresh` | x | x | x | x | x | x | x | x | x | x |
| `user:read_own` | x | x | x | x | x | x | x | x | x | x |
| `user:update_own` | x | x | x | x | x | x | x | x | x | x |
| `user:manage_all` | - | - | - | - | - | - | - | x | - | - |
| `role:manage_all` | - | - | - | - | - | - | - | x | - | - |
| `account:read_own` | x | - | - | - | - | - | - | - | - | - |
| `account:read_branch` | - | - | x | x | - | x | x | - | - | - |
| `account:read_all` | - | x | - | - | x | - | - | - | x | x |
| `account:create_customer` | x | - | x | - | - | - | x | - | - | - |
| `account:status_change` | - | x | x | - | - | - | - | - | - | x |
| `account:close_request` | x | x | x | - | - | - | - | - | - | - |
| `transaction:read_own` | x | - | - | - | - | - | - | - | - | - |
| `transaction:read_branch` | - | - | x | x | - | - | - | - | - | - |
| `transaction:read_all` | - | x | - | - | x | - | - | - | x | x |
| `transfer:execute_own` | x | - | - | - | - | - | - | - | - | - |
| `deposit:teller_execute` | - | - | - | x | - | - | - | - | - | - |
| `withdrawal:teller_execute` | - | - | - | x | - | - | - | - | - | - |
| `approval:read_pending_branch` | - | - | x | - | - | - | - | - | - | - |
| `approval:read_pending_global` | - | x | - | - | - | - | - | - | - | - |
| `approval:maker_submit` | - | - | x | x | x | x | x | - | - | - |
| `approval:checker_action_branch` | - | - | x | - | - | - | - | - | - | - |
| `approval:checker_action_global` | - | x | - | - | - | - | - | - | - | - |
| `loan:apply_own` | x | - | - | - | - | - | - | - | - | - |
| `loan:read_own` | x | - | - | - | - | - | - | - | - | - |
| `loan:read_branch` | - | - | x | - | - | x | - | - | - | - |
| `loan:read_all` | - | x | - | - | - | - | - | - | x | x |
| `loan:assess_eligibility` | - | - | - | - | - | x | - | - | - | - |
| `loan:recommend_action` | - | - | - | - | - | x | - | - | - | - |
| `loan:approve_final` | - | x | x | - | - | - | - | - | - | - |
| `loan:disburse_funds` | - | - | x | - | x | - | - | - | - | - |
| `ledger:read_reports` | - | x | x | - | x | - | - | - | x | - |
| `ledger:post_journal_entry` | - | - | - | - | x | - | - | - | - | - |
| `ledger:reconcile_accounts` | - | - | - | - | x | - | - | - | - | - |
| `teller:session_open` | - | - | - | x | - | - | - | - | - | - |
| `teller:session_close` | - | - | - | x | - | - | - | - | - | - |
| `teller:reconcile_cash` | - | - | x | x | x | - | - | - | - | - |
| `support:create_own` | x | - | - | - | - | - | - | - | - | - |
| `support:read_own` | x | - | - | - | - | - | - | - | - | - |
| `support:triage_manage` | - | - | - | - | - | - | x | - | - | - |
| `support:escalate` | - | x | x | - | - | - | x | - | - | - |
| `audit:read_logs` | - | - | - | - | - | - | - | x | x | x |
| `audit:export_evidence` | - | - | - | - | - | - | - | - | x | - |
| `compliance:read_cases` | - | x | - | - | - | - | - | - | x | x |
| `compliance:investigate_case` | - | - | - | - | - | - | - | - | - | x |
| `compliance:submit_sar` | - | - | - | - | - | - | - | - | - | x |

*Legend: CUS=Customer, BM=Bank Manager, BRM=Branch Manager, TEL=Bank Teller, ACC=Accountant, LO=Loan Officer, CSO=Customer Service Officer, ADM=System Admin, AUD=Auditor, CMP=Compliance Officer.*

---

## 4. Separation of Duties Enforcements
1. **System Administrator Restrictions**: The Administrator has permissions strictly in identity and role provisioning. Administrators **cannot** create accounts, view customer balances, perform transfers, or authorize maker-checker approvals.
2. **Auditor Immutability**: The Auditor has zero write permissions (`POST`, `PUT`, `PATCH`, `DELETE`). All audit queries execute in read-only database mode.
3. **Maker-Checker Disqualification**: An API validation rule asserts `approvalRequest.makerId !== currentUserId`. Even a Bank Manager cannot approve a transaction they initiated as a Maker.
