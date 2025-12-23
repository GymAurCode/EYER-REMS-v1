
import { z } from 'zod';

const paginationSchema = z.object({
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

const test6 = { page: "abc" };

try { console.log('test6:', paginationSchema.parse(test6)); } catch(e: any) { console.log('test6 failed', e.message); }
