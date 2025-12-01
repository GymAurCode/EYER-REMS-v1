# Deal Module Financial Refactoring Summary

## Overview
The Deal module has been completely refactored to include professional accounting logic for commission handling, revenue recognition, profit calculation, and ledger integration.

## Key Features Implemented

### 1. Commission Handling
- **Commission Types**: Fixed Amount, Percentage, or No Commission
- **Auto-calculation**: Commission is automatically calculated based on deal value and type
- **Commission Splitting**: Supports splitting between Dealer and Company shares
- **Validation**: Commission values and percentages are validated

### 2. Dealer/Agent Assignment
- **Required for Commission**: Dealer must be assigned when commission is specified
- **Automatic Ledger Entries**: Dealer commission payable is recorded in ledger automatically

### 3. Cost Price & Profit
- **Cost Price**: Record the cost price of the property (internal cost)
- **Profit Calculation**: `Profit = Deal Value - Cost Price - Commission - Expenses`
- **Auto-calculation**: Profit is calculated automatically and stored in `valueBreakdown`

### 4. Revenue Recognition
- **Status-based**: Revenue is only recognized when deal status is "Closed" (stage = 'closed-won')
- **Double-entry Bookkeeping**: On deal closure, creates proper ledger entries:
  - **Debit**: Cash/Bank or Accounts Receivable (based on payment mode)
  - **Credit**: Deal Revenue
  - **Debit**: Commission Expense
  - **Credit**: Dealer Payable

### 5. Ledger Integration
- **Real-time Updates**: All financial calculations update the ledger in double-entry format
- **COA Integration**: Chart of Accounts balances reflect the real-time impact of deals, payments, commissions, and profits
- **Prevents Double Entry**: Revenue recognition checks for existing entries to prevent duplicates

### 6. Deal Status
- **Status Options**: Pending, In Progress, Closed
- **Revenue Trigger**: Revenue/profit entries trigger only when status = Closed or stage = 'closed-won'
- **Reversal Support**: If a closed deal is reopened, revenue recognition entries are reversed

## Technical Implementation

### New Service: `DealFinanceService`
Located at: `server/src/services/deal-finance-service.ts`

**Key Methods:**
- `calculateCommission()`: Calculates commission based on type and configuration
- `calculateProfit()`: Calculates profit from deal financial data
- `recognizeRevenue()`: Creates double-entry ledger entries for revenue recognition
- `reverseRevenueRecognition()`: Reverses revenue entries for deal cancellation
- `validateCommissionConfig()`: Validates commission configuration

### Updated Service: `DealService`
Located at: `server/src/services/deal-service.ts`

**Enhanced Methods:**
- `createDeal()`: Now handles commission types, cost price, expenses, and profit calculation
- `updateDeal()`: Auto-calculates commission, profit, and triggers revenue recognition on closure
- `updateDealStage()`: Triggers revenue recognition when stage changes to 'closed-won'
- `recomputeDealStatus()`: Automatically recognizes revenue when deal is closed

### Data Storage
Financial data is stored in the `valueBreakdown` JSON field of the Deal model:
```json
{
  "commissionType": "percentage",
  "commissionRate": 5,
  "dealerShare": 100,
  "companyShare": 0,
  "costPrice": 50000,
  "expenses": 1000,
  "profit": 39000,
  "dealerCommission": 5000,
  "companyCommission": 0
}
```

## API Usage

### Creating a Deal with Financial Data
```typescript
POST /api/crm/deals
{
  "title": "Property Sale",
  "clientId": "client-id",
  "propertyId": "property-id",
  "dealerId": "dealer-id",
  "dealAmount": 100000,
  "commissionType": "percentage", // "fixed" | "percentage" | "none"
  "commissionRate": 5, // Percentage (0-100) or fixed amount
  "dealerShare": 100, // Percentage of commission to dealer (0-100)
  "companyShare": 0, // Percentage of commission to company (0-100)
  "costPrice": 50000, // Cost price of property
  "expenses": 1000, // Additional expenses
  "stage": "prospecting",
  "status": "open"
}
```

### Updating Deal Financial Data
```typescript
PUT /api/crm/deals/:id
{
  "dealAmount": 120000,
  "commissionRate": 6,
  "costPrice": 60000,
  "expenses": 2000,
  "status": "closed" // Triggers revenue recognition
}
```

### Updating Deal Stage (Triggers Revenue Recognition)
```typescript
PUT /api/crm/deals/:id/stage
{
  "stage": "closed-won", // Triggers revenue recognition
  "probability": 100,
  "notes": "Deal closed successfully"
}
```

## Account Requirements

The following accounts must exist in your Chart of Accounts:
- **Cash Account** (code: 1000)
- **Bank Account** (code: 1010)
- **Accounts Receivable** (code: 1100)
- **Deal Revenue** (code: 4000)
- **Commission Expense** (code: 5000)
- **Dealer Payable** (code: 2000)

These accounts are created by the seed script at `server/prisma/seeds/chart-of-accounts.ts`.

## Revenue Recognition Flow

1. **Deal Creation**: Deal is created with financial data (commission, cost price, expenses)
2. **Commission Calculation**: Commission is automatically calculated based on type and rate
3. **Profit Calculation**: Profit is calculated: `Deal Value - Cost Price - Commission - Expenses`
4. **Deal Closure**: When deal status changes to "Closed" or stage to "closed-won":
   - Revenue recognition is triggered
   - Double-entry ledger entries are created:
     - Debit Cash/Bank/AR, Credit Deal Revenue
     - Debit Commission Expense, Credit Dealer Payable
5. **COA Updates**: Chart of Accounts balances are automatically updated

## Validation Rules

1. **Commission Validation**:
   - Percentage commission: Rate must be between 0 and 100
   - Fixed commission: Amount must be >= 0
   - Dealer share: Must be between 0 and 100
   - Company share: Must be between 0 and 100

2. **Dealer Requirement**:
   - Dealer must be assigned when commission type is not "none"

3. **Revenue Recognition**:
   - Only occurs when deal status = "Closed" or stage = "closed-won"
   - Prevents double entry by checking for existing revenue entries

## Error Handling

- All financial operations are wrapped in database transactions
- Validation errors are returned with descriptive messages
- Revenue recognition errors are logged but don't fail deal status updates
- Missing accounts throw clear error messages

## Testing Recommendations

1. **Test Commission Types**:
   - Fixed amount commission
   - Percentage commission
   - No commission deals

2. **Test Commission Splitting**:
   - 100% dealer share
   - Split between dealer and company
   - Various split percentages

3. **Test Revenue Recognition**:
   - Fully paid deals
   - Partially paid deals
   - Unpaid deals (receivable)

4. **Test Profit Calculation**:
   - Deals with cost price
   - Deals with expenses
   - Deals with both

5. **Test Status Changes**:
   - Closing a deal (triggers revenue recognition)
   - Reopening a closed deal (reverses revenue recognition)
   - Cancelling a deal

## Migration Notes

The financial data is stored in the existing `valueBreakdown` JSON field, so no database migration is required. However, you may want to add dedicated fields in the future for better querying:

```prisma
model Deal {
  // ... existing fields
  commissionType String? // 'fixed' | 'percentage' | 'none'
  costPrice Float @default(0)
  expenses Float @default(0)
  profit Float @default(0)
  dealerShare Float @default(100)
  companyShare Float @default(0)
}
```

## Future Enhancements

1. **Cost of Goods Sold**: Add proper inventory/property cost account for COGS entries
2. **Multi-currency Support**: Handle deals in different currencies
3. **Tax Calculations**: Add tax calculation and ledger entries
4. **Commission Payout Tracking**: Track when dealer commissions are paid
5. **Financial Reports**: Generate profit/loss reports by deal, dealer, or period

