/**
 * Pagination Utility
 * Standardized pagination for list endpoints
 */

import { z } from 'zod';

/**
 * Pagination query schema
 * Uses .passthrough() to allow extra query parameters (like 'search') without validation errors
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive().default(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().positive().max(100).default(10)),
}).passthrough();

export type PaginationQuery = z.infer<typeof paginationSchema>;

/**
 * Pagination result
 */
export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  skip: number;
}

/**
 * Calculate pagination parameters
 * @param page - Current page number (1-indexed)
 * @param limit - Number of items per page
 * @param total - Total number of items
 * @returns Pagination result with calculated values
 * @example
 * ```typescript
 * const pagination = calculatePagination(2, 10, 95);
 * // Returns: { page: 2, limit: 10, total: 95, totalPages: 10, skip: 10 }
 * ```
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number,
): PaginationResult {
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    total,
    totalPages,
    skip,
  };
}

/**
 * Validate and parse pagination query parameters from request
 * @param query - Request query parameters object
 * @returns Parsed and validated pagination query
 * @throws ZodError if validation fails
 * @example
 * ```typescript
 * const { page, limit } = parsePaginationQuery(req.query);
 * // page defaults to 1, limit defaults to 10, max limit is 100
 * ```
 */
export function parsePaginationQuery(
  query: Record<string, unknown>,
): PaginationQuery {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/7293d0cd-bbb9-40ce-87ee-9763b81d9a43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pagination.ts:parsePaginationQuery:entry',message:'parsePaginationQuery called',data:{query,queryKeys:Object.keys(query),pageType:typeof query.page,limitType:typeof query.limit,pageValue:query.page,limitValue:query.limit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  try {
    const result = paginationSchema.parse(query);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7293d0cd-bbb9-40ce-87ee-9763b81d9a43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pagination.ts:parsePaginationQuery:success',message:'parsePaginationQuery succeeded',data:{result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return result;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7293d0cd-bbb9-40ce-87ee-9763b81d9a43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pagination.ts:parsePaginationQuery:error',message:'parsePaginationQuery failed',data:{errorName:error?.name,errorMessage:error?.message,isZodError:error?.constructor?.name==='ZodError',zodErrors:error?.errors,query},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw error;
  }
}

