/**
 * Global Filter Store
 * Persists filters per module/tab using localStorage
 */

import { GlobalFilterPayload } from '@/components/ui/global-filter-dialog';

const STORAGE_PREFIX = 'rems_filters_';

function getStorageKey(module: string, tab?: string): string {
  return `${STORAGE_PREFIX}${module}${tab ? `_${tab}` : ''}`;
}

/**
 * Save filters for a module/tab
 */
export function saveFilters(module: string, tab: string | undefined, filters: GlobalFilterPayload): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getStorageKey(module, tab);
    localStorage.setItem(key, JSON.stringify(filters));
  } catch (error) {
    console.error('Failed to save filters:', error);
  }
}

/**
 * Load filters for a module/tab
 */
export function loadFilters(module: string, tab: string | undefined): Partial<GlobalFilterPayload> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getStorageKey(module, tab);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as Partial<GlobalFilterPayload>;
    }
  } catch (error) {
    console.error('Failed to load filters:', error);
  }
  
  return null;
}

/**
 * Clear filters for a module/tab
 */
export function clearFilters(module: string, tab: string | undefined): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getStorageKey(module, tab);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear filters:', error);
  }
}
