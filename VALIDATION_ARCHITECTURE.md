# Centralized Validation Architecture

## Overview

This document describes the centralized validation system using Zod that ensures validation logic exists in **ONE place only** and is shared between frontend and backend.

## Architecture Principles

1. **Single Source of Truth**: All validation schemas are defined once in `server/src/schemas/`
2. **Type Safety**: TypeScript types are auto-generated from Zod schemas using `z.infer<>`
3. **Consistency**: Frontend and backend use the same validation rules
4. **Maintainability**: Changes to validation rules only need to be made in one place

## Directory Structure

```
server/src/
  schemas/
    index.ts          # Main export file
    common.ts         # Common utilities and base schemas
    property.ts       # Property validation schemas
    crm.ts            # Client, Dealer, Lead, Deal schemas
    tenant.ts         # Tenant validation schemas
    unit.ts           # Unit validation schemas
    ...

  middleware/
    validation.ts     # Validation middleware for Express routes

lib/validation/
  index.ts           # Main export file
  schemas.ts         # Frontend schemas (mirror backend)
  utils.ts           # Validation utility functions
  hooks.ts           # React Hook Form integration
  example.tsx        # Usage examples
```

## Backend Usage

### Basic Route Validation

```typescript
import { validateBody, validateQuery } from '../middleware/validation';
import { createPropertySchema, propertyQuerySchema } from '../schemas';

// Validate request body
router.post(
  '/properties',
  authenticate,
  validateBody(createPropertySchema),
  async (req: AuthRequest, res) => {
    // req.body is validated and typed as CreatePropertyInput
    const property = await createProperty(req.body);
    return successResponse(res, property);
  }
);

// Validate query parameters
router.get(
  '/properties',
  authenticate,
  validateQuery(propertyQuerySchema),
  async (req: AuthRequest, res) => {
    // req.query is validated
    const properties = await getProperties(req.query);
    return successResponse(res, properties);
  }
);
```

### Multiple Validations

```typescript
import { validate } from '../middleware/validation';
import { updatePropertySchema } from '../schemas';
import { z } from 'zod';

const propertyIdSchema = z.object({
  id: z.string().uuid(),
});

router.put(
  '/properties/:id',
  authenticate,
  validate({
    params: propertyIdSchema,
    body: updatePropertySchema,
  }),
  async (req: AuthRequest, res) => {
    // Both params and body are validated
    const property = await updateProperty(req.params.id, req.body);
    return successResponse(res, property);
  }
);
```

## Frontend Usage

### React Hook Form Integration

```typescript
import { useZodForm } from '@/lib/validation';
import { createPropertySchema } from '@/lib/validation/schemas';

function PropertyForm() {
  const form = useZodForm(createPropertySchema, {
    tid: '',
    name: '',
    type: '',
    address: '',
  });

  const onSubmit = async (data: CreatePropertyInput) => {
    // Data is validated and typed
    await apiService.properties.create(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('name')} />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
      )}
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

### Manual Validation

```typescript
import { validateData } from '@/lib/validation/utils';
import { createPropertySchema } from '@/lib/validation/schemas';

const result = validateData(createPropertySchema, formData);

if (!result.success) {
  // Handle errors
  console.error(result.errors);
} else {
  // Use validated data
  await apiService.properties.create(result.data);
}
```

## Schema Structure

### Common Fields

Common field schemas are defined in `common.ts` and reused across all schemas:

```typescript
import { commonFields } from './common';

const mySchema = z.object({
  tid: commonFields.tid,           // Required TID
  email: commonFields.email,        // Optional email
  phone: commonFields.phone,        // Optional phone
  locationId: commonFields.optionalUuid, // Optional UUID
});
```

### Creating New Schemas

1. Create schema in `server/src/schemas/[entity].ts`
2. Export from `server/src/schemas/index.ts`
3. Mirror in `lib/validation/schemas.ts` for frontend
4. Use in routes with `validateBody`, `validateQuery`, or `validate`

Example:

```typescript
// server/src/schemas/invoice.ts
import { z } from 'zod';
import { commonFields, preprocessors } from './common';

export const createInvoiceSchema = z.object({
  tid: commonFields.tid,
  amount: z.preprocess(
    preprocessors.stringToNumber,
    z.number().positive('Amount must be positive')
  ),
  dueDate: z.string().datetime(),
  // ... other fields
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
```

## Type Generation

TypeScript types are automatically generated from Zod schemas:

```typescript
import { createPropertySchema } from '../schemas';

// Type is inferred from schema
type CreatePropertyInput = z.infer<typeof createPropertySchema>;

// Or use the exported type
import type { CreatePropertyInput } from '../schemas';
```

## Error Handling

### Backend

Validation errors are automatically handled by the middleware:

```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "path": "name",
      "message": "Property name is required",
      "code": "too_small"
    }
  ]
}
```

### Frontend

React Hook Form automatically displays errors:

```typescript
{form.formState.errors.name && (
  <span className="text-red-500">
    {form.formState.errors.name.message}
  </span>
)}
```

## Migration Guide

### Replacing Existing Validation

1. **Backend Routes**: Replace manual validation with middleware
   ```typescript
   // Before
   if (!req.body.name) {
     return errorResponse(res, 'Name is required', 400);
   }
   
   // After
   router.post('/properties', validateBody(createPropertySchema), ...)
   ```

2. **Frontend Forms**: Replace manual validation with Zod schemas
   ```typescript
   // Before
   if (!formData.name) {
     setError('name', 'Name is required');
     return;
   }
   
   // After
   const form = useZodForm(createPropertySchema);
   ```

## Benefits

1. **No Duplication**: Validation logic exists in one place
2. **Type Safety**: Types are automatically generated
3. **Consistency**: Frontend and backend always match
4. **Maintainability**: Changes propagate automatically
5. **Developer Experience**: Better error messages and autocomplete

## Best Practices

1. Always use schemas from `schemas/` directory
2. Reuse common fields from `common.ts`
3. Use preprocessors for form data transformation
4. Export TypeScript types alongside schemas
5. Keep frontend schemas in sync with backend
6. Use `validateBody`, `validateQuery`, `validateParams` middleware
7. Use `useZodForm` hook for React forms

## Future Enhancements

1. **Shared Package**: Create a shared npm package for schemas
2. **Code Generation**: Auto-generate frontend schemas from backend
3. **Validation Tests**: Add tests for all schemas
4. **OpenAPI**: Generate OpenAPI specs from Zod schemas


