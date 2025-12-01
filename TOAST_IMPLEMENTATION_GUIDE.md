# Toast Notifications Implementation Guide

## Overview
This guide documents the comprehensive toast notification system implemented across the entire property management application.

## ✅ Completed Setup

### 1. Toast Configuration
- **File**: `hooks/use-toast.ts`
- **Changes**:
  - `TOAST_LIMIT`: Changed from 1 to 5 (allows up to 5 toasts)
  - `TOAST_REMOVE_DELAY`: Changed from 1000000ms to 5000ms (5 seconds auto-dismiss)

### 2. Toast Utility Library
- **File**: `lib/toast-utils.ts` (NEW)
- **Features**:
  - Consistent toast messaging across all modules
  - Module-specific toast helpers (PropertyToasts, UnitToasts, etc.)
  - API response handlers
  - Success/Error/Info variants

### 3. Global Toaster Component
- **File**: `app/layout.tsx`
- **Changes**: Added `<Toaster />` component to root layout
- **Position**: Bottom-right (configurable via ToastViewport)

### 4. Toast Variants
- **Success**: Green background, 4-second auto-dismiss
- **Error/Destructive**: Red background, 5-second auto-dismiss
- **Info/Default**: Default background, 3-second auto-dismiss

---

## 📋 Implementation Status

### ✅ Completed Modules

1. **Authentication**
   - ✅ Login success/error
   - ✅ Logout success/error
   - File: `app/login/page.tsx`, `components/dashboard-layout.tsx`

2. **Properties**
   - ✅ Add/Edit/Delete property
   - ✅ Image upload warnings
   - ✅ Unit creation success
   - File: `components/properties/add-property-dialog.tsx`

---

## 🔧 Remaining Components to Update

### Properties Module
- [ ] `components/properties/properties-view.tsx` - Delete property
- [ ] `components/properties/edit-status-dialog.tsx` - Status updates
- [ ] `components/properties/property-delete-dialog.tsx` - Delete confirmations

### Units Module
- [ ] `components/properties/add-unit-dialog.tsx` - Add/Edit unit
- [ ] `components/properties/units-view.tsx` - Delete unit, status updates

### Floors Module
- [ ] `components/properties/add-floor-dialog.tsx` (if exists) - Add/Edit/Delete floor

### Tenants Module
- [ ] `components/properties/add-tenant-dialog.tsx` - Add/Edit/Delete tenant
- [ ] `components/properties/tenants-view.tsx` - Tenant operations

### Leases Module
- [ ] `components/properties/add-lease-dialog.tsx` - Add/Edit/Delete lease

### Finance Module
- [ ] `components/finance/add-invoice-dialog.tsx` - Create/Edit invoice
- [ ] `components/finance/invoices-view.tsx` - Invoice operations
- [ ] `components/finance/add-payment-dialog.tsx` - Receive payment
- [ ] `components/finance/payments-view.tsx` - Payment operations

### CRM Module
- [ ] `components/crm/add-deal-dialog.tsx` - Add/Edit/Delete deal
- [ ] `components/crm/deals-view.tsx` - Deal operations
- [ ] `components/crm/add-lead-dialog.tsx` - Add/Edit/Delete lead
- [ ] `components/crm/leads-view.tsx` - Lead operations
- [ ] `components/crm/add-client-dialog.tsx` - Add/Edit/Delete client
- [ ] `components/crm/clients-view.tsx` - Client operations

### HR Module
- [ ] `components/hr/add-payroll-dialog.tsx` - Add/Edit/Delete payroll
- [ ] `components/hr/payroll-view.tsx` - Payroll operations
- [ ] `app/details/attendance/page.tsx` - Check-in/Check-out

### Maintenance Module
- [ ] `components/tenant/maintenance-view.tsx` - Create/Update/Close tickets

---

## 🎯 Usage Examples

### Using Toast Utilities

```typescript
import { PropertyToasts, UnitToasts, handleApiError } from "@/lib/toast-utils"

// Success toast
PropertyToasts.created("Property Name")

// Error toast
PropertyToasts.error("Error message")

// Handle API response
try {
  const response = await apiService.properties.create(data)
  PropertyToasts.created(data.name)
} catch (error) {
  handleApiError(error, "Failed to create property")
}
```

### Direct Toast Usage

```typescript
import { showSuccessToast, showErrorToast, showInfoToast } from "@/lib/toast-utils"

showSuccessToast("Success", "Operation completed")
showErrorToast("Error", "Something went wrong")
showInfoToast("Info", "This is informational")
```

---

## 📝 Standard Toast Messages

### Property Operations
- **Created**: `Property "{name}" has been added successfully`
- **Updated**: `Property "{name}" has been updated successfully`
- **Deleted**: `Property "{name}" has been deleted successfully`

### Unit Operations
- **Created**: `Unit "{name}" has been added successfully`
- **Updated**: `Unit "{name}" has been updated successfully`
- **Deleted**: `Unit "{name}" has been deleted successfully`

### Tenant Operations
- **Created**: `Tenant "{name}" has been added successfully`
- **Updated**: `Tenant "{name}" has been updated successfully`
- **Deleted**: `Tenant "{name}" has been deleted successfully`

### Invoice Operations
- **Created**: `Invoice "{number}" has been created successfully`
- **Paid**: `Invoice "{number}" paid (Rs {amount})`
- **Error**: `Failed to perform invoice operation`

### Payment Operations
- **Received**: `Payment "{id}" of Rs {amount} has been received`

### Deal Operations
- **Created**: `Deal "{title}" has been created successfully`
- **Closed**: `Deal "{title}" has been closed successfully`

### Payroll Operations
- **Created**: `Payroll for {employeeName} ({month}) has been created successfully`
- **Paid**: `Payroll for {employeeName} ({month}) has been processed successfully`

### Attendance Operations
- **Checked In**: `{employeeName} has checked in successfully`
- **Checked Out**: `{employeeName} has checked out successfully`

### Maintenance Operations
- **Created**: `Maintenance ticket "{number}" has been created successfully`
- **Closed**: `Maintenance ticket "{number}" has been closed successfully`

---

## 🔄 Migration Pattern

For each component, follow this pattern:

1. **Replace imports**:
   ```typescript
   // OLD
   import { useToast } from "@/hooks/use-toast"
   const { toast } = useToast()
   
   // NEW
   import { [Module]Toasts, handleApiError } from "@/lib/toast-utils"
   ```

2. **Replace success toasts**:
   ```typescript
   // OLD
   toast({
     title: "Success",
     description: "Property added successfully",
     variant: "default",
   })
   
   // NEW
   PropertyToasts.created(propertyName)
   ```

3. **Replace error toasts**:
   ```typescript
   // OLD
   toast({
     title: "Error",
     description: errorMessage,
     variant: "destructive",
   })
   
   // NEW
   handleApiError(error, "Failed to perform operation")
   // OR
   PropertyToasts.error(errorMessage)
   ```

---

## ✅ Next Steps

1. Update all remaining components using the migration pattern above
2. Test all toast notifications
3. Ensure consistent messaging across modules
4. Add toast for validation errors in forms

---

**Status**: Foundation complete, components being updated systematically.

