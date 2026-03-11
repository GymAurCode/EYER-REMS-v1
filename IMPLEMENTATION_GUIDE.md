# Chart of Accounts Expansion - Implementation Guide
## Eyer-REMS Real Estate ERP

**Quick Reference:** This guide provides step-by-step instructions for implementing the COA expansion.

---

## PREREQUISITES

- Database backup completed
- Development environment ready
- All existing accounts preserved (1000, 1010, 1100, 2000, 3000, 4000, 5000, 5100)

---

## STEP 1: DATABASE SCHEMA UPDATE

### 1.1 Update Prisma Schema

The schema has been updated with:
- `isPostable` field (boolean, default: true)
- `cashFlowCategory` field (string, nullable)

### 1.2 Run Migration

```bash
cd server
npx prisma migrate dev --name add_coa_expansion_fields
```

This will:
- Add `isPostable` column to Account table
- Add `cashFlowCategory` column to Account table
- Set existing parent accounts to `isPostable = false`
- Set default cash flow categories

### 1.3 Generate Prisma Client

```bash
npx prisma generate
```

---

## STEP 2: SEED EXPANDED COA

### 2.1 Run Seed Script

```bash
cd server
npx ts-node prisma/seeds/chart-of-accounts-expanded.ts
```

Or add to your seed script:

```typescript
import { seedExpandedChartOfAccounts } from './prisma/seeds/chart-of-accounts-expanded';

// In your main seed function
await seedExpandedChartOfAccounts();
```

### 2.2 Verify Seed Results

Check that:
- All existing accounts are preserved
- Parent accounts have `isPostable = false`
- Child accounts have `isPostable = true`
- Cash flow categories are set correctly

---

## STEP 3: UPDATE VALIDATION LOGIC

### 3.1 Integrate Account Validation Service

The `AccountValidationService` has been created. Integrate it into:

**Journal Entry Creation** (`server/src/routes/finance.ts`):
```typescript
import { AccountValidationService } from '../services/account-validation-service';

// In POST /journals route
for (const line of normalizedLines) {
  await AccountValidationService.validateAccountPostable(line.accountId);
}

AccountValidationService.validateDoubleEntryBalance(normalizedLines);
```

**Payment Creation** (`server/src/services/payment-service.ts`):
```typescript
import { AccountValidationService } from './account-validation-service';

// Before creating ledger entries
await AccountValidationService.validateAccountPostable(debitAccountId);
await AccountValidationService.validateAccountPostable(creditAccountId);
await AccountValidationService.validateEscrowAccountUsage(debitAccountId, 'debit', creditAccountId);
```

**Receipt Creation** (`server/src/services/receipt-service.ts`):
```typescript
// Similar validations as payment service
```

---

## STEP 4: UPDATE UI DROPDOWNS

### 4.1 Update Account Dropdown Queries

**Journal Entry Component** (`components/finance/add-transaction-dialog.tsx`):
```typescript
// Replace account fetch with:
const accounts = await fetch('/api/finance/accounts/postable').then(r => r.json());
```

**Invoice Component** (`components/finance/add-invoice-dialog.tsx`):
```typescript
// For tenant account:
const tenantAccounts = await fetch('/api/finance/accounts/dropdown/invoice-tenant').then(r => r.json());

// For income account:
const incomeAccounts = await fetch('/api/finance/accounts/dropdown/invoice-income').then(r => r.json());
```

### 4.2 Create API Endpoints

Add to `server/src/routes/finance.ts`:

```typescript
import { AccountValidationService } from '../services/account-validation-service';

// GET /accounts/postable - All postable accounts
router.get('/accounts/postable', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const accounts = await AccountValidationService.getPostableAccounts();
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /accounts/dropdown/:type - Accounts for specific dropdown
router.get('/accounts/dropdown/:type', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;
    const accounts = await AccountValidationService.getAccountsForDropdown(
      type as any
    );
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## STEP 5: UPDATE WIDGET CALCULATIONS

### 5.1 Revenue Widget

Update calculation to use child accounts:

```typescript
// Old: Sum of account 4000
// New: Sum of accounts 4001, 4002, 4003, 4004, 4101, 4102, 4201, 4202

const revenueAccounts = await prisma.account.findMany({
  where: {
    code: { in: ['4001', '4002', '4003', '4004', '4101', '4102', '4201', '4202'] },
    isActive: true,
  },
});

// Calculate balance for each account
const revenue = await Promise.all(
  revenueAccounts.map(async (account) => {
    const balance = await calculateAccountBalance(account.id);
    return balance;
  })
);

const totalRevenue = revenue.reduce((sum, bal) => sum + bal, 0);
```

### 5.2 Expenses Widget

Similar update for expense accounts (5001-5502).

### 5.3 Cash Balance Widget

Exclude escrow accounts:

```typescript
const cashBankAccounts = await prisma.account.findMany({
  where: {
    code: { in: ['1001', '1002', '1003', '1011', '1014'] }, // Exclude 1012, 1013
    isActive: true,
    isPostable: true,
  },
});
```

---

## STEP 6: UPDATE REPORTING

### 6.1 Trial Balance

Update to show parent-child hierarchy:

```typescript
// Get all parent accounts
const parentAccounts = await prisma.account.findMany({
  where: { parentId: null, isActive: true },
  include: { children: true },
});

// Calculate balances with rollup
for (const parent of parentAccounts) {
  const childBalances = await Promise.all(
    parent.children.map(child => calculateAccountBalance(child.id))
  );
  parent.balance = childBalances.reduce((sum, bal) => sum + bal, 0);
}
```

### 6.2 Income Statement

Sum child accounts for each parent:

```typescript
// Revenue section
const revenueParent = await prisma.account.findUnique({
  where: { code: '4000' },
  include: { children: true },
});

const revenueTotal = await Promise.all(
  revenueParent.children.map(child => calculateAccountBalance(child.id))
).then(balances => balances.reduce((sum, bal) => sum + bal, 0));
```

### 6.3 Cash Flow Statement

Use `cashFlowCategory` field:

```typescript
// Operating Activities
const operatingAccounts = await prisma.account.findMany({
  where: {
    cashFlowCategory: 'Operating',
    isPostable: true,
  },
});

// Calculate cash flows by category
const operatingCashFlow = calculateCashFlowForAccounts(operatingAccounts);
```

---

## STEP 7: TESTING CHECKLIST

### 7.1 Posting Validations

- [ ] Cannot post to parent accounts (isPostable = false)
- [ ] Can post to child accounts (isPostable = true)
- [ ] Escrow accounts protected from company expenses
- [ ] Double-entry balance validation works
- [ ] Advance posting validation works

### 7.2 UI Functionality

- [ ] Journal entry dropdowns show only postable accounts
- [ ] Invoice dropdowns show correct account types
- [ ] Payment dropdowns show correct account types
- [ ] Account hierarchy displays correctly

### 7.3 Reporting Accuracy

- [ ] Trial Balance shows parent-child hierarchy
- [ ] Income Statement rolls up child accounts
- [ ] Balance Sheet rolls up child accounts
- [ ] Cash Flow Statement categorizes correctly
- [ ] Property-wise profitability works

### 7.4 Edge Cases

- [ ] Property sale with advance
- [ ] Rental with security deposit
- [ ] Construction WIP capitalization
- [ ] Commission accrual and payment
- [ ] Cancelled sale with partial refund

---

## STEP 8: DEPLOYMENT

### 8.1 Pre-Deployment

1. Backup production database
2. Test migration on staging
3. Verify all validations work
4. Test reporting accuracy

### 8.2 Deployment Steps

1. Run migration: `npx prisma migrate deploy`
2. Run seed script: `npx ts-node prisma/seeds/chart-of-accounts-expanded.ts`
3. Deploy code changes
4. Verify system functionality

### 8.3 Post-Deployment

1. Verify existing transactions still work
2. Check widget calculations
3. Verify reports generate correctly
4. Monitor for errors

---

## TROUBLESHOOTING

### Issue: Migration fails

**Solution:** Check if columns already exist:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'Account' AND column_name IN ('isPostable', 'cashFlowCategory');
```

### Issue: Seed script fails

**Solution:** Check for duplicate account codes:
```sql
SELECT code, COUNT(*) FROM "Account" GROUP BY code HAVING COUNT(*) > 1;
```

### Issue: UI dropdowns empty

**Solution:** Verify accounts are postable:
```sql
SELECT code, name, "isPostable" FROM "Account" WHERE "isActive" = true;
```

### Issue: Reports show incorrect balances

**Solution:** Recalculate account balances:
```typescript
// Run balance recalculation script
await recalculateAllAccountBalances();
```

---

## SUPPORT

For issues or questions:
1. Check `CHART_OF_ACCOUNTS_EXPANSION.md` for detailed specifications
2. Review validation service logs
3. Check database for account hierarchy
4. Verify cash flow category mappings

---

## END OF IMPLEMENTATION GUIDE

**Status:** Ready for Implementation  
**Last Updated:** 2024

