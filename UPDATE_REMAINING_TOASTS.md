# Update Remaining Components with Toast Notifications

## Quick Update Script

This document provides the exact changes needed for each remaining component.

---

## Components to Update

### 1. Floor Dialog
**File**: `components/properties/add-floor-dialog.tsx`

```typescript
// REPLACE
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()

// WITH
import { FloorToasts, showErrorToast } from "@/lib/toast-utils"

// REPLACE all toast calls
toast({ title: "Success", description: "Floor added", variant: "default" })
// WITH
FloorToasts.created(floorName)

toast({ title: "Error", description: errorMessage, variant: "destructive" })
// WITH
FloorToasts.error(errorMessage)
```

---

### 2. Block Dialog
**File**: `components/properties/add-block-dialog.tsx`

```typescript
// Add to toast-utils.ts first:
export const BlockToasts = {
  created: (name: string) => showSuccessToast('Block Added', `Block "${name}" has been added successfully`),
  updated: (name: string) => showSuccessToast('Block Updated', `Block "${name}" has been updated successfully`),
  deleted: (name: string) => showSuccessToast('Block Deleted', `Block "${name}" has been deleted successfully`),
  error: (message?: string) => showErrorToast('Block Error', message || 'Failed to perform block operation'),
}

// Then update component
import { BlockToasts } from "@/lib/toast-utils"
```

---

### 3. Tenants View
**File**: `components/properties/tenants-view.tsx`

```typescript
// REPLACE
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()

// WITH
import { TenantToasts, handleApiError } from "@/lib/toast-utils"

// In delete handler:
TenantToasts.deleted(tenant.name)
// In error handler:
handleApiError(err, "Failed to delete tenant")
```

---

### 4. Leases View
**File**: `components/properties/leases-view.tsx`

```typescript
// REPLACE
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()

// WITH
import { LeaseToasts, handleApiError } from "@/lib/toast-utils"

// In delete handler:
LeaseToasts.deleted(lease.leaseNumber || "Lease")
// In error handler:
handleApiError(err, "Failed to delete lease")
```

---

### 5. Sales View
**File**: `components/properties/sales-view.tsx`

```typescript
// Add to toast-utils.ts:
export const SaleToasts = {
  created: (propertyName: string) => showSuccessToast('Sale Recorded', `Sale for "${propertyName}" has been recorded successfully`),
  updated: (propertyName: string) => showSuccessToast('Sale Updated', `Sale for "${propertyName}" has been updated successfully`),
  deleted: (propertyName: string) => showSuccessToast('Sale Deleted', `Sale for "${propertyName}" has been deleted successfully`),
  error: (message?: string) => showErrorToast('Sale Error', message || 'Failed to perform sale operation'),
}

// Update component
import { SaleToasts, handleApiError } from "@/lib/toast-utils"
```

---

### 6. Finance - Invoice View
**File**: `components/finance/invoices-view.tsx`

```typescript
// REPLACE
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()

// WITH
import { InvoiceToasts, handleApiError } from "@/lib/toast-utils"

// In delete handler:
InvoiceToasts.deleted(invoice.invoiceNumber)
// In error handler:
handleApiError(err, "Failed to delete invoice")
```

---

### 7. Finance - Payment View
**File**: `components/finance/payments-view.tsx`

```typescript
// REPLACE
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()

// WITH
import { PaymentToasts, handleApiError } from "@/lib/toast-utils"

// In delete handler:
PaymentToasts.deleted(payment.paymentId)
// In error handler:
handleApiError(err, "Failed to delete payment")
```

---

### 8. Finance - Transaction Dialog
**File**: `components/finance/add-transaction-dialog.tsx`

```typescript
// Add to toast-utils.ts:
export const TransactionToasts = {
  created: (code: string) => showSuccessToast('Transaction Created', `Transaction "${code}" has been created successfully`),
  updated: (code: string) => showSuccessToast('Transaction Updated', `Transaction "${code}" has been updated successfully`),
  deleted: (code: string) => showSuccessToast('Transaction Deleted', `Transaction "${code}" has been deleted successfully`),
  error: (message?: string) => showErrorToast('Transaction Error', message || 'Failed to perform transaction operation'),
}

// Update component
import { TransactionToasts, showErrorToast } from "@/lib/toast-utils"
```

---

### 9. Finance - Account Dialog
**File**: `components/finance/add-account-dialog.tsx`

```typescript
// Add to toast-utils.ts:
export const AccountToasts = {
  created: (name: string) => showSuccessToast('Account Created', `Account "${name}" has been created successfully`),
  updated: (name: string) => showSuccessToast('Account Updated', `Account "${name}" has been updated successfully`),
  deleted: (name: string) => showSuccessToast('Account Deleted', `Account "${name}" has been deleted successfully`),
  error: (message?: string) => showErrorToast('Account Error', message || 'Failed to perform account operation'),
}

// Update component
import { AccountToasts, showErrorToast } from "@/lib/toast-utils"
```

---

### 10. Finance - Voucher Dialog
**File**: `components/finance/add-voucher-dialog.tsx` and `components/finance/add-general-voucher-dialog.tsx`

```typescript
// Add to toast-utils.ts:
export const VoucherToasts = {
  created: (number: string) => showSuccessToast('Voucher Created', `Voucher "${number}" has been created successfully`),
  updated: (number: string) => showSuccessToast('Voucher Updated', `Voucher "${number}" has been updated successfully`),
  deleted: (number: string) => showSuccessToast('Voucher Deleted', `Voucher "${number}" has been deleted successfully`),
  error: (message?: string) => showErrorToast('Voucher Error', message || 'Failed to perform voucher operation'),
}

// Update components
import { VoucherToasts, showErrorToast } from "@/lib/toast-utils"
```

---

### 11. CRM - Lead Dialog
**File**: `components/crm/add-lead-dialog.tsx`

```typescript
// REPLACE
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()

// WITH
import { LeadToasts, showErrorToast } from "@/lib/toast-utils"

// In create/update:
LeadToasts.created(formData.name)
LeadToasts.updated(formData.name)
// In error:
LeadToasts.error(errorMessage)
```

---

### 12. CRM - Lead View
**File**: `components/crm/leads-view.tsx`

```typescript
// REPLACE
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()

// WITH
import { LeadToasts, handleApiError } from "@/lib/toast-utils"

// In delete handler:
LeadToasts.deleted(lead.name)
// In convert handler:
LeadToasts.converted(lead.name)
// In error handler:
handleApiError(err, "Failed to perform lead operation")
```

---

### 13. CRM - Client Dialog
**File**: `components/crm/add-client-dialog.tsx`

```typescript
// REPLACE
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()

// WITH
import { ClientToasts, showErrorToast } from "@/lib/toast-utils"

// In create/update:
ClientToasts.created(formData.name)
ClientToasts.updated(formData.name)
// In error:
ClientToasts.error(errorMessage)
```

---

### 14. CRM - Client View
**File**: `components/crm/clients-view.tsx`

```typescript
// REPLACE
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()

// WITH
import { ClientToasts, handleApiError } from "@/lib/toast-utils"

// In delete handler:
ClientToasts.deleted(client.name)
// In error handler:
handleApiError(err, "Failed to delete client")
```

---

### 15. CRM - Deal View
**File**: `components/crm/deals-view.tsx`

```typescript
// REPLACE
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()

// WITH
import { DealToasts, handleApiError } from "@/lib/toast-utils"

// In delete handler:
DealToasts.deleted(deal.title)
// In close handler:
DealToasts.closed(deal.title)
// In error handler:
handleApiError(err, "Failed to perform deal operation")
```

---

### 16. CRM - Dealer Dialog
**File**: `components/crm/add-dealer-dialog.tsx`

```typescript
// Add to toast-utils.ts:
export const DealerToasts = {
  created: (name: string) => showSuccessToast('Dealer Added', `Dealer "${name}" has been added successfully`),
  updated: (name: string) => showSuccessToast('Dealer Updated', `Dealer "${name}" has been updated successfully`),
  deleted: (name: string) => showSuccessToast('Dealer Deleted', `Dealer "${name}" has been deleted successfully`),
  error: (message?: string) => showErrorToast('Dealer Error', message || 'Failed to perform dealer operation'),
}

// Update component
import { DealerToasts, showErrorToast } from "@/lib/toast-utils"
```

---

### 17. CRM - Communication Dialog
**File**: `components/crm/add-communication-dialog.tsx`

```typescript
// Add to toast-utils.ts:
export const CommunicationToasts = {
  created: () => showSuccessToast('Communication Logged', 'Communication has been logged successfully'),
  updated: () => showSuccessToast('Communication Updated', 'Communication has been updated successfully'),
  deleted: () => showSuccessToast('Communication Deleted', 'Communication has been deleted successfully'),
  error: (message?: string) => showErrorToast('Communication Error', message || 'Failed to perform communication operation'),
}

// Update component
import { CommunicationToasts, showErrorToast } from "@/lib/toast-utils"
```

---

### 18. HR - Payroll View
**File**: `components/hr/payroll-view.tsx` (if exists)

```typescript
// REPLACE
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()

// WITH
import { PayrollToasts, handleApiError } from "@/lib/toast-utils"

// In delete handler:
PayrollToasts.deleted(employeeName, month)
// In process/pay handler:
PayrollToasts.paid(employeeName, month)
// In error handler:
handleApiError(err, "Failed to perform payroll operation")
```

---

### 19. Attendance Page
**File**: `app/details/attendance/page.tsx`

```typescript
// ADD at top
import { AttendanceToasts, handleApiError } from "@/lib/toast-utils"

// In check-in handler:
AttendanceToasts.checkedIn(employeeName)
// In check-out handler:
AttendanceToasts.checkedOut(employeeName)
// In update handler:
AttendanceToasts.updated(employeeName)
// In error handler:
handleApiError(err, "Failed to perform attendance operation")
```

---

### 20. Maintenance View
**File**: `components/tenant/maintenance-view.tsx`

```typescript
// REPLACE
import { useToast } from "@/hooks/use-toast"
const { toast } = useToast()

// WITH
import { MaintenanceToasts, showErrorToast } from "@/lib/toast-utils"

// In create handler:
MaintenanceToasts.created(ticketNumber)
// In update handler:
MaintenanceToasts.updated(ticketNumber)
// In close handler:
MaintenanceToasts.closed(ticketNumber)
// In error handler:
MaintenanceToasts.error(errorMessage)
```

---

## Automated Update Script

Run this script to find and update all remaining components:

```bash
# Find all files with useToast
grep -r "useToast" components/ app/ --include="*.tsx" --include="*.ts" | grep -v "use-toast.ts" | grep -v "toaster.tsx"

# Find all files with toast(
grep -r "toast({" components/ app/ --include="*.tsx" --include="*.ts" | grep -v "use-toast.ts" | grep -v "toast-utils.ts"
```

---

## Pattern for All Updates

1. **Replace import**:
   ```typescript
   // OLD
   import { useToast } from "@/hooks/use-toast"
   const { toast } = useToast()
   
   // NEW
   import { [Module]Toasts, showErrorToast, handleApiError } from "@/lib/toast-utils"
   ```

2. **Replace success toasts**:
   ```typescript
   // OLD
   toast({ title: "Success", description: "Operation successful", variant: "default" })
   
   // NEW
   [Module]Toasts.created(name)
   // OR
   [Module]Toasts.updated(name)
   // OR
   [Module]Toasts.deleted(name)
   ```

3. **Replace error toasts**:
   ```typescript
   // OLD
   toast({ title: "Error", description: errorMessage, variant: "destructive" })
   
   // NEW
   [Module]Toasts.error(errorMessage)
   // OR
   handleApiError(error, "Default error message")
   ```

4. **Replace validation errors**:
   ```typescript
   // OLD
   toast({ title: "Error", description: "Validation failed", variant: "destructive" })
   
   // NEW
   showErrorToast("Validation Error", "Validation failed")
   ```

---

## Additional Toast Utilities Needed

Add these to `lib/toast-utils.ts`:

```typescript
// Block Toasts
export const BlockToasts = {
  created: (name: string) => showSuccessToast('Block Added', `Block "${name}" has been added successfully`),
  updated: (name: string) => showSuccessToast('Block Updated', `Block "${name}" has been updated successfully`),
  deleted: (name: string) => showSuccessToast('Block Deleted', `Block "${name}" has been deleted successfully`),
  error: (message?: string) => showErrorToast('Block Error', message || 'Failed to perform block operation'),
}

// Sale Toasts
export const SaleToasts = {
  created: (propertyName: string) => showSuccessToast('Sale Recorded', `Sale for "${propertyName}" has been recorded successfully`),
  updated: (propertyName: string) => showSuccessToast('Sale Updated', `Sale for "${propertyName}" has been updated successfully`),
  deleted: (propertyName: string) => showSuccessToast('Sale Deleted', `Sale for "${propertyName}" has been deleted successfully`),
  error: (message?: string) => showErrorToast('Sale Error', message || 'Failed to perform sale operation'),
}

// Transaction Toasts
export const TransactionToasts = {
  created: (code: string) => showSuccessToast('Transaction Created', `Transaction "${code}" has been created successfully`),
  updated: (code: string) => showSuccessToast('Transaction Updated', `Transaction "${code}" has been updated successfully`),
  deleted: (code: string) => showSuccessToast('Transaction Deleted', `Transaction "${code}" has been deleted successfully`),
  error: (message?: string) => showErrorToast('Transaction Error', message || 'Failed to perform transaction operation'),
}

// Account Toasts
export const AccountToasts = {
  created: (name: string) => showSuccessToast('Account Created', `Account "${name}" has been created successfully`),
  updated: (name: string) => showSuccessToast('Account Updated', `Account "${name}" has been updated successfully`),
  deleted: (name: string) => showSuccessToast('Account Deleted', `Account "${name}" has been deleted successfully`),
  error: (message?: string) => showErrorToast('Account Error', message || 'Failed to perform account operation'),
}

// Voucher Toasts
export const VoucherToasts = {
  created: (number: string) => showSuccessToast('Voucher Created', `Voucher "${number}" has been created successfully`),
  updated: (number: string) => showSuccessToast('Voucher Updated', `Voucher "${number}" has been updated successfully`),
  deleted: (number: string) => showSuccessToast('Voucher Deleted', `Voucher "${number}" has been deleted successfully`),
  error: (message?: string) => showErrorToast('Voucher Error', message || 'Failed to perform voucher operation'),
}

// Dealer Toasts
export const DealerToasts = {
  created: (name: string) => showSuccessToast('Dealer Added', `Dealer "${name}" has been added successfully`),
  updated: (name: string) => showSuccessToast('Dealer Updated', `Dealer "${name}" has been updated successfully`),
  deleted: (name: string) => showSuccessToast('Dealer Deleted', `Dealer "${name}" has been deleted successfully`),
  error: (message?: string) => showErrorToast('Dealer Error', message || 'Failed to perform dealer operation'),
}

// Communication Toasts
export const CommunicationToasts = {
  created: () => showSuccessToast('Communication Logged', 'Communication has been logged successfully'),
  updated: () => showSuccessToast('Communication Updated', 'Communication has been updated successfully'),
  deleted: () => showSuccessToast('Communication Deleted', 'Communication has been deleted successfully'),
  error: (message?: string) => showErrorToast('Communication Error', message || 'Failed to perform communication operation'),
}
```

---

## Testing Checklist

After updating each component:

- [ ] Success toast appears on create
- [ ] Success toast appears on update
- [ ] Success toast appears on delete
- [ ] Error toast appears on validation failure
- [ ] Error toast appears on API error
- [ ] Toast auto-dismisses after correct duration
- [ ] Toast can be manually closed
- [ ] Multiple toasts stack correctly (up to 5)
- [ ] Toast position is consistent (bottom-right)

---

**Status**: Foundation complete, systematic updates in progress.

