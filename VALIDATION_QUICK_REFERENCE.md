# Validation System Quick Reference

## 🚀 Quick Start

### Backend Route Validation

```typescript
import { validateBody, validateQuery } from '../middleware/validation';
import { createPropertySchema } from '../schemas';

// Validate body
router.post('/properties', 
  authenticate, 
  validateBody(createPropertySchema),
  handler
);

// Validate query
router.get('/properties',
  authenticate,
  validateQuery(propertyQuerySchema),
  handler
);
```

### Frontend Form Validation

```typescript
import { useZodForm } from '@/lib/validation';
import { createPropertySchema } from '@/lib/validation/schemas';

const form = useZodForm(createPropertySchema, defaultValues);

<form onSubmit={form.handleSubmit(onSubmit)}>
  <Input {...form.register('name')} />
  {form.formState.errors.name?.message}
</form>
```

## 📋 Available Schemas

### Property
- `createPropertySchema` - Create property
- `updatePropertySchema` - Update property
- `propertyQuerySchema` - Query/filter properties

### Unit
- `createUnitSchema` - Create unit
- `updateUnitSchema` - Update unit

### Client
- `createClientSchema` - Create client
- `updateClientSchema` - Update client

### Deal
- `createDealSchema` - Create deal
- `updateDealSchema` - Update deal

### Tenant
- `createTenantSchema` - Create tenant
- `updateTenantSchema` - Update tenant

## 🔧 Common Fields

```typescript
import { commonFields } from '../schemas/common';

// Use in your schemas
z.object({
  tid: commonFields.tid,              // Required TID
  email: commonFields.email,          // Optional email
  phone: commonFields.phone,          // Optional phone
  locationId: commonFields.optionalUuid, // Optional UUID
})
```

## 🎯 Middleware Functions

- `validateBody(schema)` - Validate request body
- `validateQuery(schema)` - Validate query parameters
- `validateParams(schema)` - Validate route parameters
- `validate({ body, query, params })` - Validate multiple parts

## 📝 TypeScript Types

Types are auto-generated from schemas:

```typescript
import type { CreatePropertyInput } from '../schemas';
// or
type CreatePropertyInput = z.infer<typeof createPropertySchema>;
```

## ⚠️ Error Handling

### Backend
Errors are automatically handled by middleware:
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    { "path": "name", "message": "Property name is required" }
  ]
}
```

### Frontend
React Hook Form handles errors automatically:
```typescript
{form.formState.errors.name && (
  <span>{form.formState.errors.name.message}</span>
)}
```

## 🔄 Migration Checklist

- [ ] Replace manual validation in route handlers
- [ ] Replace manual validation in frontend forms
- [ ] Use `validateBody`, `validateQuery`, `validateParams`
- [ ] Use `useZodForm` hook for forms
- [ ] Remove duplicate validation code
- [ ] Update error handling to use Zod errors

## 📚 Full Documentation

- `VALIDATION_ARCHITECTURE.md` - Complete architecture guide
- `VALIDATION_IMPLEMENTATION_SUMMARY.md` - Implementation summary
- `server/src/middleware/validation.example.ts` - Backend examples
- `lib/validation/example.tsx` - Frontend examples


