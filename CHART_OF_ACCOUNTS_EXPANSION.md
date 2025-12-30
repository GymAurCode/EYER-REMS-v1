# Chart of Accounts Expansion & Cash Flow Integration
## Eyer-REMS Real Estate ERP System

**Document Version:** 1.0  
**Date:** 2024  
**Status:** Production-Ready Specification

---

## EXECUTIVE SUMMARY

This document defines the expanded Chart of Accounts (COA) hierarchy and cash-flow integration for Eyer-REMS, maintaining full backward compatibility with existing accounts, UI, and workflows. All changes are additive only—no deletions or renaming of existing accounts.

**Key Principles:**
- ✅ Preserve all existing account codes (1000, 1010, 1100, 2000, 3000, 4000, 5000, 5100)
- ✅ Add hierarchical parent-child structure
- ✅ Mark summary accounts as non-postable
- ✅ Map accounts to cash-flow categories
- ✅ Define precise posting rules and validations
- ✅ Maintain existing UI and navigation

---

## 1. UPDATED COA HIERARCHY

### 1.1 Account Numbering Convention

- **1000-1999:** Assets
- **2000-2999:** Liabilities  
- **3000-3999:** Equity
- **4000-4999:** Revenue
- **5000-5999:** Expenses

**Child Account Pattern:** Parent code + sequential suffix (e.g., 1000 → 1001, 1002, 1003)

### 1.2 Complete COA Structure

#### **ASSETS (1000-1999)**

**1000 - Cash Account** *(Existing - Parent)*
- **1001** - Cash on Hand *(Postable)*
- **1002** - Petty Cash *(Postable)*
- **1003** - Cash in Transit *(Postable)*

**1010 - Bank Account** *(Existing - Parent)*
- **1011** - Operating Bank Account *(Postable)*
- **1012** - Escrow Bank Account *(Postable - Client Money)*
- **1013** - Trust Bank Account *(Postable - Client Money)*
- **1014** - Savings Account *(Postable)*

**1100 - Accounts Receivable** *(Existing - Parent)*
- **1101** - Trade Receivables - Sales *(Postable)*
- **1102** - Trade Receivables - Rentals *(Postable)*
- **1103** - Receivables - Advances *(Postable)*
- **1104** - Receivables - Overdue *(Postable)*

**1200 - Customer Advances & Deposits** *(New - Parent)*
- **1201** - Customer Advances - Sales *(Postable)*
- **1202** - Customer Deposits - Rentals *(Postable)*
- **1203** - Security Deposits Held *(Postable - Liability)*

**1300 - Escrow & Trust Accounts** *(New - Parent)*
- **1301** - Escrow - Sales Proceeds *(Postable - Client Money)*
- **1302** - Escrow - Rental Deposits *(Postable - Client Money)*
- **1303** - Escrow - Contractor Retainage *(Postable - Client Money)*

**1400 - Property Assets** *(New - Parent)*
- **1401** - Property Inventory - For Sale *(Postable)*
- **1402** - Property Inventory - Under Construction *(Postable)*
- **1403** - Work in Progress (WIP) *(Postable)*
- **1404** - Construction Costs - Capitalized *(Postable)*

**1500 - Other Assets** *(New - Parent)*
- **1501** - Prepaid Expenses *(Postable)*
- **1502** - Deposits Paid *(Postable)*
- **1503** - Other Receivables *(Postable)*

---

#### **LIABILITIES (2000-2999)**

**2000 - Dealer Payable** *(Existing - Parent)*
- **2001** - Dealer Commissions Payable *(Postable)*
- **2002** - Dealer Advances Paid *(Postable)*

**2100 - Customer Deposits & Advances** *(New - Parent)*
- **2101** - Customer Advances - Sales *(Postable)*
- **2102** - Security Deposits - Rentals *(Postable)*
- **2103** - Customer Deposits - Refundable *(Postable)*

**2200 - Escrow Liabilities** *(New - Parent)*
- **2201** - Escrow Payable - Sales *(Postable - Client Money)*
- **2202** - Escrow Payable - Rentals *(Postable - Client Money)*
- **2203** - Escrow Payable - Contractor *(Postable - Client Money)*

**2300 - Deferred Revenue** *(New - Parent)*
- **2301** - Deferred Revenue - Sales *(Postable)*
- **2302** - Deferred Revenue - Rentals *(Postable)*
- **2303** - Unearned Commission *(Postable)*

**2400 - Contractor Payables** *(New - Parent)*
- **2401** - Contractor Payable - Construction *(Postable)*
- **2402** - Contractor Payable - Maintenance *(Postable)*
- **2403** - Retainage Payable *(Postable)*

**2500 - Other Payables** *(New - Parent)*
- **2501** - Accrued Expenses *(Postable)*
- **2502** - Taxes Payable *(Postable)*
- **2503** - Other Payables *(Postable)*

---

#### **EQUITY (3000-3999)**

**3000 - Owner Equity** *(Existing - Parent)*
- **3001** - Capital Contributions *(Postable)*
- **3002** - Retained Earnings *(Postable)*
- **3003** - Current Year Earnings *(Postable)*

---

#### **REVENUE (4000-4999)**

**4000 - Deal Revenue** *(Existing - Parent)*
- **4001** - Revenue - Property Sales *(Postable)*
- **4002** - Revenue - Property Rentals *(Postable)*
- **4003** - Revenue - Commission Income *(Postable)*
- **4004** - Revenue - Other Services *(Postable)*

**4100 - Project-Wise Revenue** *(New - Parent)*
- **4101** - Revenue - Project A *(Postable)*
- **4102** - Revenue - Project B *(Postable)*
- **4103** - Revenue - Project C *(Postable)*
- *[Additional project accounts as needed]*

**4200 - Unit-Wise Revenue** *(New - Parent)*
- **4201** - Revenue - Unit Sales *(Postable)*
- **4202** - Revenue - Unit Rentals *(Postable)*

---

#### **EXPENSES (5000-5999)**

**5000 - Commission Expense** *(Existing - Parent)*
- **5001** - Dealer Commission Expense *(Postable)*
- **5002** - Broker Commission Expense *(Postable)*
- **5003** - Referral Commission Expense *(Postable)*

**5100 - Refunds/Write-offs** *(Existing - Parent)*
- **5101** - Refunds - Sales Cancellations *(Postable)*
- **5102** - Refunds - Rental Deposits *(Postable)*
- **5103** - Write-offs - Bad Debts *(Postable)*

**5200 - Construction & WIP Costs** *(New - Parent)*
- **5201** - Construction Materials *(Postable)*
- **5202** - Construction Labor *(Postable)*
- **5203** - Construction Overhead *(Postable)*
- **5204** - WIP Expense - Project A *(Postable)*
- **5205** - WIP Expense - Project B *(Postable)*

**5300 - Maintenance & Repairs** *(New - Parent)*
- **5301** - Property Maintenance *(Postable)*
- **5302** - Repairs & Renovations *(Postable)*
- **5303** - Contractor Payments - Maintenance *(Postable)*

**5400 - Operating Expenses** *(New - Parent)*
- **5401** - Property Management Fees *(Postable)*
- **5402** - Utilities Expense *(Postable)*
- **5403** - Insurance Expense *(Postable)*
- **5404** - Property Taxes Expense *(Postable)*
- **5405** - Legal & Professional Fees *(Postable)*
- **5406** - Marketing & Advertising *(Postable)*

**5500 - Depreciation & Amortization** *(New - Parent)*
- **5501** - Depreciation Expense *(Postable - Non-Cash)*
- **5502** - Amortization Expense *(Postable - Non-Cash)*

---

## 2. POSTING & VALIDATION RULES

### 2.1 Account Postability Rules

**Summary Accounts (Non-Postable):**
- All parent accounts (1000, 1010, 1100, 2000, 3000, 4000, 5000, etc.)
- Used for reporting and rollup only
- Cannot receive direct journal entries

**Detail Accounts (Postable):**
- All child accounts (1001, 1002, 1011, etc.)
- Can receive journal entries
- Balances roll up to parent accounts

**Validation:** System must prevent posting to accounts where `isPostable = false`

---

### 2.2 Transaction Posting Rules

#### **A. Booking Advance (Sales/Rentals)**

**When:** Customer pays advance before closing/lease start

**Posting:**
```
Debit:  1011 - Operating Bank Account (or 1001 - Cash on Hand)
Credit: 2101 - Customer Advances - Sales (or 2102 - Security Deposits - Rentals)
```

**Validation:**
- Advance must go to liability account (2101/2102), NOT revenue
- Cannot post directly to revenue account (4000 series)
- Amount must be positive

---

#### **B. Full Sale Closing**

**When:** Property sale is completed and fully paid

**Posting:**
```
Debit:  1011 - Operating Bank Account (or 1012 - Escrow Bank Account)
Credit: 4001 - Revenue - Property Sales
```

**If advance was previously received:**
```
Debit:  2101 - Customer Advances - Sales
Credit: 4001 - Revenue - Property Sales
```

**Validation:**
- Revenue cannot post directly to cash (must go through AR or Advance first)
- Total debits must equal total credits
- Deal must be marked as "Closed" or "Completed"

---

#### **C. Rental Collection**

**When:** Tenant pays monthly rent

**Posting:**
```
Debit:  1011 - Operating Bank Account (or 1001 - Cash on Hand)
Credit: 4002 - Revenue - Property Rentals
```

**If invoice was previously created:**
```
Debit:  1011 - Operating Bank Account
Credit: 1102 - Trade Receivables - Rentals
```

**Then when invoice is recognized:**
```
Debit:  1102 - Trade Receivables - Rentals
Credit: 4002 - Revenue - Property Rentals
```

**Validation:**
- Rental revenue must be recognized when invoice is created OR when payment is received
- Cannot double-count revenue

---

#### **D. Maintenance Invoices**

**When:** Contractor submits invoice for maintenance work

**Posting:**
```
Debit:  5301 - Property Maintenance (or 5302 - Repairs & Renovations)
Credit: 2402 - Contractor Payable - Maintenance
```

**When payment is made:**
```
Debit:  2402 - Contractor Payable - Maintenance
Credit: 1011 - Operating Bank Account
```

**Validation:**
- Expense must be recognized when invoice is received
- Payment must reduce payable account

---

#### **E. Security Deposits**

**When:** Tenant pays security deposit

**Posting:**
```
Debit:  1012 - Escrow Bank Account (or 1013 - Trust Bank Account)
Credit: 2102 - Security Deposits - Rentals
```

**When deposit is refunded:**
```
Debit:  2102 - Security Deposits - Rentals
Credit: 1012 - Escrow Bank Account
```

**Validation:**
- Security deposits are client money - must use escrow/trust accounts
- Cannot use escrow funds for company expenses
- Refund must not exceed original deposit amount

---

#### **F. Refunds and Cancellations**

**When:** Sale/rental is cancelled and refund is issued

**Posting:**
```
Debit:  2101 - Customer Advances - Sales (or 2102 - Security Deposits - Rentals)
Credit: 1011 - Operating Bank Account
```

**If cancellation fee applies:**
```
Debit:  2101 - Customer Advances - Sales
Credit: 1011 - Operating Bank Account (refund amount)
Credit: 4003 - Revenue - Commission Income (cancellation fee)
```

**Validation:**
- Refund cannot exceed advance/deposit balance
- Cancellation fees must be recognized as revenue

---

#### **G. Dealer Commissions**

**When:** Commission is earned on sale

**Posting:**
```
Debit:  5001 - Dealer Commission Expense
Credit: 2001 - Dealer Commissions Payable
```

**When commission is paid:**
```
Debit:  2001 - Dealer Commissions Payable
Credit: 1011 - Operating Bank Account
```

**Validation:**
- Commission expense must be recognized when sale closes
- Payment must reduce payable account
- Cannot pay commission from escrow accounts

---

### 2.3 Critical Validations

1. **Revenue Posting Rule:**
   - Revenue accounts (4000 series) cannot be debited directly from cash/bank
   - Must flow through: Cash → AR/Advance → Revenue

2. **Escrow Protection:**
   - Escrow accounts (1012, 1013, 1301-1303) cannot be used for company expenses
   - Escrow funds can only be transferred to other escrow accounts or refunded to customers

3. **Double-Entry Balance:**
   - All journal entries must balance (total debits = total credits)
   - System must validate before posting

4. **Account Type Validation:**
   - Assets: Debit increases, Credit decreases
   - Liabilities: Debit decreases, Credit increases
   - Revenue: Debit decreases, Credit increases
   - Expenses: Debit increases, Credit decreases

5. **Parent Account Protection:**
   - Cannot post to accounts where `isPostable = false`
   - Only child accounts can receive transactions

---

## 3. CASH-FLOW MAPPING

### 3.1 Cash Flow Categories

Each account is mapped to one of three cash-flow categories:

- **Operating Activities:** Day-to-day business operations
- **Investing Activities:** Property purchases, construction, capital expenditures
- **Financing Activities:** Owner contributions, loans, distributions

### 3.2 Account-to-Cash-Flow Mapping

#### **OPERATING ACTIVITIES**

**Cash Inflows:**
- 4001 - Revenue - Property Sales
- 4002 - Revenue - Property Rentals
- 4003 - Revenue - Commission Income
- 4004 - Revenue - Other Services
- 1101-1104 - Trade Receivables (collection)
- 2101-2103 - Customer Advances/Deposits (received)

**Cash Outflows:**
- 5001-5003 - Commission Expenses (paid)
- 5101-5103 - Refunds/Write-offs
- 5301-5303 - Maintenance & Repairs (paid)
- 5401-5406 - Operating Expenses (paid)
- 2401-2403 - Contractor Payables (paid)
- 2501-2503 - Other Payables (paid)

**Non-Cash Adjustments:**
- 5501 - Depreciation Expense
- 5502 - Amortization Expense
- 1101-1104 - Trade Receivables (accrual)
- 2301-2303 - Deferred Revenue (recognition)

---

#### **INVESTING ACTIVITIES**

**Cash Outflows:**
- 1401 - Property Inventory - For Sale (purchase)
- 1402 - Property Inventory - Under Construction (purchase)
- 1403 - Work in Progress (WIP) (capitalized costs)
- 1404 - Construction Costs - Capitalized
- 5201-5205 - Construction & WIP Costs (paid)
- 1502 - Deposits Paid (property acquisitions)

**Cash Inflows:**
- 1401 - Property Inventory - For Sale (sale proceeds)
- 1402 - Property Inventory - Under Construction (sale proceeds)

**Non-Cash Adjustments:**
- 1403 - Work in Progress (WIP) (capitalization)
- 1404 - Construction Costs - Capitalized (capitalization)

---

#### **FINANCING ACTIVITIES**

**Cash Inflows:**
- 3001 - Capital Contributions

**Cash Outflows:**
- 3002 - Retained Earnings (distributions)
- 3003 - Current Year Earnings (distributions)

---

#### **ESCROW/TRUST ACCOUNTS (Special Handling)**

**Accounts:**
- 1012 - Escrow Bank Account
- 1013 - Trust Bank Account
- 1301-1303 - Escrow - Sales Proceeds/Rental Deposits/Contractor Retainage
- 2201-2203 - Escrow Payable accounts

**Cash Flow Treatment:**
- **NOT included in Operating/Investing/Financing activities**
- Tracked separately in "Escrow Reconciliation" section
- Client money vs. company money separation

---

### 3.3 Cash Flow Calculation Logic

**Operating Cash Flow:**
```
= Cash from Operating Activities (inflows - outflows)
+ Non-Cash Adjustments (depreciation, accruals, deferred revenue)
```

**Investing Cash Flow:**
```
= Cash from Investing Activities (property purchases - sales)
+ Non-Cash Adjustments (WIP capitalization)
```

**Financing Cash Flow:**
```
= Cash from Financing Activities (contributions - distributions)
```

**Net Cash Flow:**
```
= Operating + Investing + Financing
```

**Escrow Reconciliation:**
```
= Escrow Receipts - Escrow Disbursements
= Must reconcile to escrow liability accounts
```

---

## 4. UI MAPPING & BEHAVIOR

### 4.1 Account Dropdowns

**Which Accounts Appear:**

1. **Journal Entry Screen (`/finance/journals`):**
   - **Shows:** All postable accounts (isPostable = true)
   - **Filters:** By account type (Asset, Liability, Revenue, Expense)
   - **Format:** "Code — Name (Type)"
   - **Example:** "1001 — Cash on Hand (Asset)"

2. **General Voucher Screen (`/finance/vouchers`):**
   - **Shows:** All postable accounts
   - **Format:** Same as journal entries

3. **Transaction Screen (`/finance/transactions`):**
   - **Shows:** All postable accounts
   - **Format:** Same as journal entries

4. **Invoice Screen (`/finance/invoices`):**
   - **Tenant Account Dropdown:** Only AR accounts (1101-1104)
   - **Income Account Dropdown:** Only Revenue accounts (4001-4004, 4101-4103, 4201-4202)

5. **Payment Screen (`/finance/payments`):**
   - **Debit Account:** Only Cash/Bank accounts (1001-1002, 1011-1014)
   - **Credit Account:** Only AR accounts (1101-1104)

**Which Accounts Remain Internal:**

- **Parent/Summary Accounts (isPostable = false):**
  - Do NOT appear in dropdowns
  - Used only for reporting and balance rollup
  - Visible in Chart of Accounts view only

---

### 4.2 Ledger Balance Updates

**Widget Updates:**

1. **Revenue Widget:**
   - **Source:** Sum of all Revenue accounts (4000 series children)
   - **Calculation:** `SUM(credit entries) - SUM(debit entries)` for accounts 4001-4004, 4101-4103, 4201-4202
   - **Update:** Real-time when journal entries are posted

2. **Expenses Widget:**
   - **Source:** Sum of all Expense accounts (5000 series children)
   - **Calculation:** `SUM(debit entries) - SUM(credit entries)` for accounts 5001-5103, 5201-5502
   - **Update:** Real-time when journal entries are posted

3. **Commissions Widget:**
   - **Source:** Sum of Commission Expense accounts (5001-5003)
   - **Calculation:** `SUM(debit entries)` for accounts 5001-5003
   - **Update:** Real-time when commission entries are posted

4. **Cash Balance Widget:**
   - **Source:** Sum of Cash/Bank accounts (1001-1002, 1011-1014)
   - **Calculation:** `SUM(debit entries) - SUM(credit entries)` for cash/bank accounts
   - **Excludes:** Escrow accounts (1012-1013) - shown separately

5. **Receivables Widget:**
   - **Source:** Sum of AR accounts (1101-1104)
   - **Calculation:** `SUM(debit entries) - SUM(credit entries)` for AR accounts
   - **Update:** Real-time when invoices/payments are posted

6. **Payables Widget:**
   - **Source:** Sum of Payable accounts (2001-2002, 2401-2403, 2501-2503)
   - **Calculation:** `SUM(credit entries) - SUM(debit entries)` for payable accounts
   - **Update:** Real-time when payables are created/paid

---

### 4.3 Existing Screen Posting Logic

#### **Cash / Bank / Journal Screens**

**Current Behavior (Maintained):**
- Journal entries post to selected accounts via `JournalLine` model
- Each line references `accountId` (must be postable)
- System validates account is postable before allowing selection
- Double-entry validation ensures debits = credits

**Integration with Expanded COA:**
- Dropdowns automatically filter to postable accounts only
- Parent accounts (non-postable) do not appear in dropdowns
- Child accounts appear with full hierarchy context in display

**Example Journal Entry:**
```
Date: 2024-01-15
Description: Property Sale Closing

Line 1:
  Account: 1011 - Operating Bank Account
  Debit: 500,000
  Credit: 0

Line 2:
  Account: 4001 - Revenue - Property Sales
  Debit: 0
  Credit: 500,000
```

**Validation:**
- System checks `account.isPostable === true` before allowing selection
- System validates `SUM(debits) === SUM(credits)` before posting
- System prevents posting to escrow accounts for non-escrow transactions

---

## 5. VALIDATION & CONTROLS

### 5.1 Account-Level Validations

1. **Postability Check:**
   ```typescript
   if (!account.isPostable) {
     throw new Error(`Cannot post to summary account: ${account.code} - ${account.name}`);
   }
   ```

2. **Account Type Validation:**
   ```typescript
   // Assets and Expenses: Debit increases balance
   // Liabilities, Equity, Revenue: Credit increases balance
   if (account.type === 'Asset' || account.type === 'Expense') {
     balance = debitTotal - creditTotal;
   } else {
     balance = creditTotal - debitTotal;
   }
   ```

3. **Escrow Account Protection:**
   ```typescript
   const escrowAccountCodes = ['1012', '1013', '1301', '1302', '1303'];
   if (escrowAccountCodes.includes(account.code)) {
     // Only allow:
     // - Transfers to other escrow accounts
     // - Refunds to customers
     // - Posting from escrow liability accounts
     // Block: Company expense postings
   }
   ```

---

### 5.2 Transaction-Level Validations

1. **Revenue Posting Rule:**
   ```typescript
   // Revenue cannot post directly from cash
   if (debitAccount.type === 'Asset' && creditAccount.type === 'Revenue') {
     // Check if there's an intermediate AR or Advance entry
     // If not, suggest: Cash → AR → Revenue flow
   }
   ```

2. **Double-Entry Balance:**
   ```typescript
   const totalDebits = lines.reduce((sum, line) => sum + line.debit, 0);
   const totalCredits = lines.reduce((sum, line) => sum + line.credit, 0);
   if (Math.abs(totalDebits - totalCredits) > 0.01) {
     throw new Error('Journal entry must balance (debits = credits)');
   }
   ```

3. **Advance Validation:**
   ```typescript
   // When booking advance:
   // - Debit must be Cash/Bank
   // - Credit must be Customer Advance liability (2101/2102)
   if (creditAccount.code !== '2101' && creditAccount.code !== '2102') {
     throw new Error('Advances must be posted to liability accounts (2101/2102)');
   }
   ```

---

### 5.3 Reporting Validations

1. **Trial Balance Reconciliation:**
   - All account balances must reconcile to ledger entries
   - Parent account balances = sum of child account balances
   - Total debits = total credits across all accounts

2. **Income Statement Reconciliation:**
   - Revenue accounts (4000 series) = sum of child accounts
   - Expense accounts (5000 series) = sum of child accounts
   - Net Income = Total Revenue - Total Expenses

3. **Balance Sheet Reconciliation:**
   - Assets = sum of all asset accounts (1000 series)
   - Liabilities = sum of all liability accounts (2000 series)
   - Equity = sum of all equity accounts (3000 series)
   - Assets = Liabilities + Equity

4. **Cash Flow Reconciliation:**
   - Operating cash flow reconciles to operating account movements
   - Investing cash flow reconciles to property/investment account movements
   - Financing cash flow reconciles to equity account movements
   - Escrow reconciliation matches escrow account balances

---

## 6. REPORTING RULES

### 6.1 Trial Balance

**Report Structure:**
```
Account Code | Account Name | Debit Balance | Credit Balance
------------------------------------------------------------
1000        | Cash Account | 500,000       | 0
  1001      | Cash on Hand | 50,000        | 0
  1011      | Operating Bank| 450,000      | 0
1100        | AR Account   | 0             | 200,000
  1101      | AR - Sales   | 0             | 150,000
  1102      | AR - Rentals | 0             | 50,000
...
```

**Logic:**
- Show parent accounts with rollup balances
- Show child accounts with detail balances
- Parent balance = sum of child balances
- Total debits = total credits

---

### 6.2 Income Statement

**Report Structure:**
```
REVENUE
  4000 - Deal Revenue                   500,000
    4001 - Revenue - Property Sales    400,000
    4002 - Revenue - Property Rentals  100,000
  Total Revenue                         500,000

EXPENSES
  5000 - Commission Expense              50,000
    5001 - Dealer Commission Expense    30,000
    5002 - Broker Commission Expense    20,000
  5300 - Maintenance & Repairs          25,000
    5301 - Property Maintenance         15,000
    5302 - Repairs & Renovations        10,000
  Total Expenses                        75,000

NET INCOME                              425,000
```

**Logic:**
- Sum all Revenue accounts (4000 series children)
- Sum all Expense accounts (5000 series children)
- Net Income = Revenue - Expenses
- Support property-wise filtering

---

### 6.3 Balance Sheet

**Report Structure:**
```
ASSETS
  1000 - Cash Account                   500,000
    1001 - Cash on Hand                 50,000
    1011 - Operating Bank Account       450,000
  1100 - Accounts Receivable           200,000
    1101 - AR - Sales                  150,000
    1102 - AR - Rentals                50,000
  Total Assets                          700,000

LIABILITIES
  2000 - Dealer Payable                 30,000
    2001 - Dealer Commissions Payable   30,000
  2100 - Customer Deposits & Advances  100,000
    2101 - Customer Advances - Sales    60,000
    2102 - Security Deposits - Rentals  40,000
  Total Liabilities                     130,000

EQUITY
  3000 - Owner Equity                   570,000
    3001 - Capital Contributions        500,000
    3002 - Retained Earnings            70,000
  Total Equity                          570,000

Total Liabilities + Equity              700,000
```

**Logic:**
- Assets = sum of all asset accounts (1000 series)
- Liabilities = sum of all liability accounts (2000 series)
- Equity = sum of all equity accounts (3000 series)
- Assets must equal Liabilities + Equity

---

### 6.4 Cash Flow Statement

**Report Structure:**
```
CASH FLOW FROM OPERATING ACTIVITIES
  Cash Inflows:
    Revenue - Property Sales            400,000
    Revenue - Property Rentals          100,000
    Collection of Receivables           150,000
  Total Cash Inflows                    650,000

  Cash Outflows:
    Commission Expenses Paid            (30,000)
    Maintenance & Repairs Paid          (15,000)
    Operating Expenses Paid             (25,000)
  Total Cash Outflows                   (70,000)

  Non-Cash Adjustments:
    Depreciation Expense                (10,000)
    Increase in Receivables            (50,000)
  Net Operating Cash Flow               520,000

CASH FLOW FROM INVESTING ACTIVITIES
  Property Purchases                   (200,000)
  Construction Costs                   (100,000)
  Net Investing Cash Flow              (300,000)

CASH FLOW FROM FINANCING ACTIVITIES
  Capital Contributions                 100,000
  Net Financing Cash Flow               100,000

NET CASH FLOW                           320,000
Beginning Cash Balance                   180,000
Ending Cash Balance                      500,000

ESCROW RECONCILIATION
  Escrow Receipts                       50,000
  Escrow Disbursements                  (30,000)
  Net Escrow Balance                    20,000
```

**Logic:**
- Map each account to cash-flow category based on `cashFlowCategory` field
- Operating: Day-to-day operations (revenue, expenses, AR/AP movements)
- Investing: Property purchases, construction, WIP capitalization
- Financing: Equity contributions, distributions
- Escrow: Separate reconciliation section

---

### 6.5 Property-Wise Profitability

**Report Structure:**
```
Property: ABC Towers
Period: January 2024

REVENUE
  Sales Revenue                          200,000
  Rental Revenue                         50,000
  Total Revenue                          250,000

EXPENSES
  Commission Expense                    (20,000)
  Maintenance Expense                   (10,000)
  Property Management Fees              (5,000)
  Total Expenses                        (35,000)

NET PROFIT                               215,000
Profit Margin                            86%
```

**Logic:**
- Filter ledger entries by `deal.propertyId` or `invoice.propertyId`
- Sum revenue accounts for the property
- Sum expense accounts for the property
- Calculate profit margin

---

### 6.6 Escrow / Trust Reconciliation

**Report Structure:**
```
ESCROW ACCOUNT RECONCILIATION
As of: January 31, 2024

ESCROW ASSETS
  1012 - Escrow Bank Account             50,000
  1301 - Escrow - Sales Proceeds        30,000
  1302 - Escrow - Rental Deposits        20,000
  Total Escrow Assets                   100,000

ESCROW LIABILITIES
  2201 - Escrow Payable - Sales         30,000
  2202 - Escrow Payable - Rentals       20,000
  Total Escrow Liabilities               50,000

NET ESCROW BALANCE                       50,000

RECONCILIATION:
  Beginning Balance                      40,000
  Receipts                               60,000
  Disbursements                         (50,000)
  Ending Balance                         50,000
```

**Logic:**
- Sum all escrow asset accounts (1012, 1013, 1301-1303)
- Sum all escrow liability accounts (2201-2203)
- Net escrow balance = Assets - Liabilities
- Must reconcile to bank statements

---

## 7. EXAMPLES & EDGE CASES

### 7.1 Example 1: Property Sale with Advance

**Scenario:** Customer pays 100,000 advance, then closes sale for 500,000

**Step 1: Booking Advance**
```
Debit:  1011 - Operating Bank Account    100,000
Credit: 2101 - Customer Advances - Sales 100,000
```

**Step 2: Sale Closing**
```
Debit:  1011 - Operating Bank Account    400,000
Debit:  2101 - Customer Advances - Sales 100,000
Credit: 4001 - Revenue - Property Sales  500,000
```

**Result:**
- Revenue recognized: 500,000
- Advance cleared: 0
- Cash received: 500,000

---

### 7.2 Example 2: Rental with Security Deposit

**Scenario:** Tenant pays 5,000 security deposit + 2,000 first month rent

**Step 1: Security Deposit**
```
Debit:  1012 - Escrow Bank Account       5,000
Credit: 2102 - Security Deposits - Rentals 5,000
```

**Step 2: Monthly Rent**
```
Debit:  1011 - Operating Bank Account    2,000
Credit: 4002 - Revenue - Property Rentals 2,000
```

**Step 3: Deposit Refund (End of Lease)**
```
Debit:  2102 - Security Deposits - Rentals 5,000
Credit: 1012 - Escrow Bank Account       5,000
```

**Result:**
- Revenue recognized: 2,000/month
- Escrow balance: 0 (after refund)
- Security deposit liability cleared

---

### 7.3 Example 3: Construction WIP

**Scenario:** Construction costs 200,000, capitalized to WIP, then sold for 500,000

**Step 1: Construction Costs Incurred**
```
Debit:  5201 - Construction Materials    100,000
Debit:  5202 - Construction Labor         80,000
Debit:  5203 - Construction Overhead      20,000
Credit: 2401 - Contractor Payable - Construction 200,000
```

**Step 2: Payment to Contractor**
```
Debit:  2401 - Contractor Payable - Construction 200,000
Credit: 1011 - Operating Bank Account    200,000
```

**Step 3: Capitalize to WIP**
```
Debit:  1403 - Work in Progress (WIP)    200,000
Credit: 5201 - Construction Materials    100,000
Credit: 5202 - Construction Labor         80,000
Credit: 5203 - Construction Overhead      20,000
```

**Step 4: Property Sale**
```
Debit:  1011 - Operating Bank Account    500,000
Credit: 4001 - Revenue - Property Sales  500,000

Debit:  5100 - Cost of Goods Sold (if exists) 200,000
Credit: 1403 - Work in Progress (WIP)    200,000
```

**Cash Flow Impact:**
- Operating: (200,000) construction costs
- Operating: 500,000 sale proceeds
- Investing: 200,000 WIP capitalization (non-cash)

---

### 7.4 Example 4: Commission Accrual and Payment

**Scenario:** Sale closes, commission 20,000, paid next month

**Step 1: Commission Accrual (Sale Closing)**
```
Debit:  5001 - Dealer Commission Expense 20,000
Credit: 2001 - Dealer Commissions Payable 20,000
```

**Step 2: Commission Payment**
```
Debit:  2001 - Dealer Commissions Payable 20,000
Credit: 1011 - Operating Bank Account    20,000
```

**Cash Flow Impact:**
- Operating: (20,000) commission expense (non-cash in month 1)
- Operating: (20,000) commission payment (cash in month 2)

---

### 7.5 Edge Case: Cancelled Sale with Partial Refund

**Scenario:** Customer paid 100,000 advance, sale cancelled, 80,000 refunded (20,000 cancellation fee)

**Posting:**
```
Debit:  2101 - Customer Advances - Sales 100,000
Credit: 1011 - Operating Bank Account    80,000
Credit: 4003 - Revenue - Commission Income 20,000
```

**Result:**
- Advance cleared: 0
- Refund issued: 80,000
- Cancellation fee recognized as revenue: 20,000

---

## 8. IMPLEMENTATION CHECKLIST

### 8.1 Database Schema Updates

- [ ] Add `cashFlowCategory` field to Account model (enum: 'Operating', 'Investing', 'Financing', 'Escrow')
- [ ] Add `isPostable` field to Account model (boolean, default: true)
- [ ] Create migration to add new fields
- [ ] Update existing accounts: Set parent accounts to `isPostable = false`

### 8.2 COA Seed Data

- [ ] Create expanded COA seed file with all new accounts
- [ ] Set parent accounts as non-postable
- [ ] Set child accounts as postable
- [ ] Map each account to cash-flow category
- [ ] Run seed script to populate database

### 8.3 Validation Logic

- [ ] Implement postability check in journal entry creation
- [ ] Implement escrow account protection
- [ ] Implement revenue posting rule validation
- [ ] Implement double-entry balance validation
- [ ] Add validation to account dropdown queries

### 8.4 UI Updates

- [ ] Update account dropdown queries to filter `isPostable = true`
- [ ] Update account display format to show hierarchy
- [ ] Update widget calculations to use child accounts
- [ ] Add cash-flow category display in account views

### 8.5 Reporting Updates

- [ ] Update Trial Balance to show parent-child hierarchy
- [ ] Update Income Statement to roll up child accounts
- [ ] Update Balance Sheet to roll up child accounts
- [ ] Implement Cash Flow Statement with category mapping
- [ ] Implement Property-Wise Profitability report
- [ ] Implement Escrow Reconciliation report

### 8.6 Testing

- [ ] Test all posting scenarios (advances, sales, rentals, etc.)
- [ ] Test validation rules (postability, escrow protection, etc.)
- [ ] Test reporting accuracy (trial balance, income statement, etc.)
- [ ] Test cash-flow calculations
- [ ] Test property-wise filtering
- [ ] Test escrow reconciliation

---

## 9. APPENDIX

### 9.1 Account Code Reference

**Quick Reference:**
- **1000-1999:** Assets
- **2000-2999:** Liabilities
- **3000-3999:** Equity
- **4000-4999:** Revenue
- **5000-5999:** Expenses

**Existing Accounts (Preserved):**
- 1000 - Cash Account
- 1010 - Bank Account
- 1100 - Accounts Receivable
- 2000 - Dealer Payable
- 3000 - Owner Equity
- 4000 - Deal Revenue
- 5000 - Commission Expense
- 5100 - Refunds/Write-offs

### 9.2 Cash Flow Category Reference

**Operating:**
- Revenue accounts (4000 series)
- Expense accounts (5000 series)
- AR/AP accounts (1100, 2000 series)
- Operating cash/bank accounts (1001, 1011)

**Investing:**
- Property inventory accounts (1401-1404)
- Construction/WIP accounts (5201-5205, 1403)
- Deposits paid (1502)

**Financing:**
- Equity accounts (3000 series)

**Escrow:**
- Escrow bank accounts (1012-1013)
- Escrow asset accounts (1301-1303)
- Escrow liability accounts (2201-2203)

---

## END OF DOCUMENT

**Document Status:** Complete  
**Next Steps:** Implementation per checklist in Section 8

