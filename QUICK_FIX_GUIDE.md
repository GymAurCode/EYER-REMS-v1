# Quick Fix Guide
## Priority Fixes for Real Estate ERP

This guide provides immediate fixes for the most critical issues found in the audit.

---

## 🔴 CRITICAL FIXES (Do First)

### 1. Fix N+1 Query Problem

**File:** `server/src/routes/properties.ts`

**Current Code (lines 91-145):**
```typescript
const propertiesWithStats = await Promise.all(
  properties.map(async (property) => {
    const occupiedUnits = await prisma.unit.count({...});
    const monthlyRevenue = await prisma.unit.aggregate({...});
    // ... 5+ queries per property
  })
);
```

**Fixed Code:**
```typescript
// Extract property IDs
const propertyIds = properties.map(p => p.id);

// Batch fetch all data
const [unitCounts, revenueData, transactions, invoices, payments] = await Promise.all([
  // Count occupied units per property
  prisma.unit.groupBy({
    by: ['propertyId'],
    where: {
      propertyId: { in: propertyIds },
      status: 'Occupied',
      isDeleted: false,
    },
    _count: true,
  }),
  // Aggregate revenue per property
  prisma.unit.groupBy({
    by: ['propertyId'],
    where: {
      propertyId: { in: propertyIds },
      status: 'Occupied',
      isDeleted: false,
    },
    _sum: { monthlyRent: true },
  }),
  // Get all income transactions
  prisma.transaction.findMany({
    where: {
      propertyId: { in: propertyIds },
      transactionType: 'income',
      status: 'completed',
    },
    include: { transactionCategory: true },
  }),
  // Get all invoices
  prisma.invoice.findMany({
    where: { propertyId: { in: propertyIds } },
    select: { id: true, propertyId: true },
  }),
  // Get all payments
  prisma.payment.findMany({
    where: {
      invoiceId: { in: invoices.map(i => i.id) },
      status: 'completed',
    },
  }),
]);

// Create lookup maps
const unitCountMap = new Map(unitCounts.map(u => [u.propertyId, u._count]));
const revenueMap = new Map(revenueData.map(r => [r.propertyId, r._sum.monthlyRent || 0]));
const transactionMap = new Map<string, typeof transactions>();
const invoiceMap = new Map<string, typeof invoices>();

transactions.forEach(t => {
  if (!transactionMap.has(t.propertyId)) transactionMap.set(t.propertyId, []);
  transactionMap.get(t.propertyId)!.push(t);
});

invoices.forEach(i => {
  if (!invoiceMap.has(i.propertyId)) invoiceMap.set(i.propertyId, []);
  invoiceMap.get(i.propertyId)!.push(i);
});

// Map results to properties
const propertiesWithStats = properties.map(property => {
  const occupiedUnits = unitCountMap.get(property.id)?._count || 0;
  const monthlyRevenueAmount = revenueMap.get(property.id) || 0;
  const yearlyRevenueAmount = monthlyRevenueAmount * 12;
  const incomeTransactions = transactionMap.get(property.id) || [];
  const propertyInvoices = invoiceMap.get(property.id) || [];
  const invoiceIds = propertyInvoices.map(inv => inv.id);
  const rentPayments = payments.filter(p => invoiceIds.includes(p.invoiceId));

  // ... rest of calculations
  return {
    ...property,
    occupiedUnits,
    monthlyRevenue: monthlyRevenueAmount,
    yearlyRevenue: yearlyRevenueAmount,
    // ... other stats
  };
});
```

---

### 2. Remove TypeScript Build Error Ignore

**File:** `next.config.mjs`

**Change:**
```javascript
// FROM:
typescript: {
  ignoreBuildErrors: true,
},

// TO:
typescript: {
  ignoreBuildErrors: false,
},
```

Then fix all TypeScript errors that appear.

---

### 3. Add ESLint Configuration

**Create:** `.eslintrc.json`

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { 
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_" 
    }],
    "no-console": ["warn", { "allow": ["error", "warn"] }],
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

**Install dependencies:**
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

---

### 4. Fix Hardcoded CORS

**File:** `server/src/index.ts` (line 42)

**Change:**
```typescript
// FROM:
origin: 'http://localhost:3000',

// TO:
origin: process.env.FRONTEND_URL || 'http://localhost:3000',
```

**Add to `.env`:**
```
FRONTEND_URL=http://localhost:3000
```

---

## 🟠 HIGH PRIORITY FIXES

### 5. Fix Duplicate Floors API Service

**File:** `lib/api.ts`

**Remove lines 198-205** (first floors definition) and keep only lines 314-322, but merge them:

```typescript
// Keep this single definition:
floors: {
  getAll: () => api.get('/floors'),
  getByProperty: (propertyId: string) => api.get(`/floors/property/${propertyId}`),
  getById: (id: string) => api.get(`/floors/${id}`),
  create: (data: any) => api.post('/floors', data),
  update: (id: string, data: any) => api.put(`/floors/${id}`, data),
  delete: (id: string) => api.delete(`/floors/${id}`),
},
```

---

### 6. Add Query Parameter Validation

**File:** `server/src/routes/properties.ts`

**Add at top:**
```typescript
import { z } from 'zod';

const propertiesQuerySchema = z.object({
  status: z.enum(['Active', 'Inactive', 'Under Construction']).optional(),
  type: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
  search: z.string().max(100).optional(),
});
```

**In route handler:**
```typescript
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const validatedQuery = propertiesQuerySchema.parse(req.query);
    const { status, type, location, search } = validatedQuery;

    // ... rest of code
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid query parameters',
        details: error.errors 
      });
    }
    throw error;
  }
});
```

---

### 7. Improve Error Handling

**File:** `server/src/routes/finance.ts` (and similar files)

**Change empty catch blocks:**
```typescript
// FROM:
catch {
  res.status(400).json({ error: 'Failed to delete transaction category' });
}

// TO:
catch (error) {
  console.error('Delete transaction category error:', error);
  const errorMessage = error instanceof Error ? error.message : 'Failed to delete transaction category';
  res.status(400).json({ 
    error: 'Failed to delete transaction category',
    message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
  });
}
```

---

## 🟡 MEDIUM PRIORITY FIXES

### 8. Replace `any` Types

**Example:** `server/src/routes/sales.ts`

```typescript
// FROM:
const where: any = {};

// TO:
import { Prisma } from '@prisma/client';

const where: Prisma.SaleWhereInput = {
  isDeleted: false,
};
```

---

### 9. Add Pagination

**Example:** `server/src/routes/properties.ts`

```typescript
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '50');
    const skip = (page - 1) * limit;

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where: { /* ... */ },
        skip,
        take: limit,
        // ...
      }),
      prisma.property.count({ where: { /* ... */ } }),
    ]);

    res.json({
      success: true,
      data: properties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // ...
  }
});
```

---

## Testing After Fixes

1. **Run TypeScript check:**
   ```bash
   npx tsc --noEmit
   ```

2. **Run ESLint:**
   ```bash
   npm run lint
   ```

3. **Test API endpoints:**
   - Test properties endpoint with many properties
   - Verify response times improved
   - Check error messages are helpful

4. **Test frontend:**
   - Verify no console errors
   - Check all forms work
   - Test authentication flows

---

## Next Steps

After completing these fixes, refer to the full audit report (`COMPREHENSIVE_QA_AUDIT_REPORT.md`) for additional improvements.

