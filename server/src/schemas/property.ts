/**
 * Property validation schemas
 */

import { z } from 'zod';
import { commonFields, preprocessors } from './common';

/**
 * Property status enum
 */
export const propertyStatusEnum = z.enum([
  'Active',
  'Maintenance',
  'Vacant',
  'For Sale',
  'For Rent',
  'Sold',
]);

/**
 * Create Property Schema
 */
export const createPropertySchema = z.object({
  tid: commonFields.tid,
  name: z.string().min(1, 'Property name is required'),
  type: z.string().min(1, 'Property type is required'),
  category: z.string().optional(),
  size: z.preprocess(
    preprocessors.stringToNumber,
    z.number().nonnegative('Size must be zero or positive').optional()
  ),
  address: z.string().min(1, 'Address is required'),
  location: z.string().optional(),
  locationId: commonFields.optionalUuid,
  subsidiaryOptionId: commonFields.optionalUuid,
  status: propertyStatusEnum.optional(),
  imageUrl: commonFields.imageUrl,
  description: z.string().optional(),
  yearBuilt: z.preprocess(
    preprocessors.stringToNumber,
    z.number().int('Year built must be an integer').positive('Year built must be positive').optional()
  ),
  totalArea: z.preprocess(
    preprocessors.stringToNumber,
    z.number().positive('Total area must be positive').optional()
  ),
  totalUnits: z.preprocess(
    preprocessors.stringToNumber,
    z.number().int('Total units must be an integer').nonnegative('Total units cannot be negative').default(0)
  ),
  dealerId: commonFields.optionalUuid,
  salePrice: z.preprocess(
    preprocessors.stringToNumber,
    z.number().nonnegative('Sale price cannot be negative').optional()
  ),
  amenities: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [val];
        } catch {
          return [val];
        }
      }
      return val;
    },
    z.array(z.string()).optional().default([])
  ),
});

/**
 * Update Property Schema (all fields optional)
 */
export const updatePropertySchema = createPropertySchema.partial();

/**
 * Property Query Schema (for filtering)
 */
export const propertyQuerySchema = z.object({
  status: propertyStatusEnum.optional(),
  type: z.string().optional(),
  location: z.string().optional(),
  locationId: commonFields.optionalUuid,
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
});

/**
 * TypeScript types inferred from schemas
 */
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyQueryInput = z.infer<typeof propertyQuerySchema>;


