
import { z } from 'zod';

const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = val ? parseInt(val, 10) : 1;
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = val ? parseInt(val, 10) : 10;
      if (isNaN(parsed) || parsed < 1) return 10;
      if (parsed > 100) return 100;
      return parsed;
    }),
}).passthrough();

const test1 = {};
const test2 = { page: "1", limit: "10" };
const test3 = { page: "0" }; // Should become 1
const test4 = { page: "" }; // Should become 1
const test5 = { other: "stuff" };
const test6 = { page: "abc" }; // Should become 1
const test7 = { limit: "1000" }; // Should become 100

try { console.log('test1:', paginationSchema.parse(test1)); } catch(e: any) { console.log('test1 failed', e.message); }
try { console.log('test2:', paginationSchema.parse(test2)); } catch(e: any) { console.log('test2 failed', e.message); }
try { console.log('test3:', paginationSchema.parse(test3)); } catch(e: any) { console.log('test3 failed', e.message); }
try { console.log('test4:', paginationSchema.parse(test4)); } catch(e: any) { console.log('test4 failed', e.message); }
try { console.log('test5:', paginationSchema.parse(test5)); } catch(e: any) { console.log('test5 failed', e.message); }
try { console.log('test6:', paginationSchema.parse(test6)); } catch(e: any) { console.log('test6 failed', e.message); }
try { console.log('test7:', paginationSchema.parse(test7)); } catch(e: any) { console.log('test7 failed', e.message); }
