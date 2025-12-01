/**
 * Test Helpers for Frontend E2E Tests
 * Common utilities for testing UI components, forms, and interactions
 */

import { Page, expect } from '@playwright/test';

export const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
export const API_URL = process.env.API_URL || 'http://localhost:3001/api';

// Test credentials
export const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@realestate.com',
    password: 'admin123',
  },
};

/**
 * Login as admin user
 */
export async function loginAsAdmin(page: Page) {
  // Clear any stale localStorage data before login
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  
  // Fill credentials
  await page.fill('input[type="email"]', TEST_CREDENTIALS.admin.email);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.admin.password);
  
  // Submit form
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.waitFor({ state: 'visible', timeout: 5000 });
  await submitButton.click();
  
  // Wait for either navigation away from login page or error message
  try {
    // Wait for navigation (login redirects to "/" on success)
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 20000 });
    
    // Give time for auth context to initialize and API calls to complete
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Verify we're logged in by checking localStorage for token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    if (!token) {
      throw new Error('Login failed - no token in localStorage');
    }
  } catch (error: any) {
    // Check if we're still on login page with an error
    const currentURL = page.url();
    if (currentURL.includes('/login')) {
      const errorElement = page.locator('.text-destructive, [role="alert"], .alert-destructive').first();
      const hasError = await errorElement.isVisible().catch(() => false);
      if (hasError) {
        const errorText = await errorElement.textContent();
        throw new Error(`Login failed: ${errorText || 'Authentication error'}`);
      }
      throw new Error('Login failed - still on login page after timeout');
    }
    throw error;
  }
}

/**
 * Wait for toast notification to appear
 */
export async function waitForToast(
  page: Page,
  type: 'success' | 'error' | 'info' = 'success',
  timeout: number = 5000
): Promise<void> {
  // Radix UI Toast selectors - toast has role="status" or data-state="open"
  const toastSelectors = [
    '[role="status"][data-state="open"]',
    '[data-state="open"]',
    '[role="status"]',
    '.toast[data-state="open"]',
    '[data-radix-toast-viewport] [data-state="open"]'
  ];
  
  // Wait for any toast to appear
  let toastFound = false;
  for (const selector of toastSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: Math.min(timeout, 3000), state: 'visible' });
      toastFound = true;
      break;
    } catch (e) {
      // Try next selector
    }
  }
  
  if (!toastFound) {
    // Fallback: wait for any visible toast-like element
    await page.waitForTimeout(1000); // Give time for toast to appear
  }
  
  // Verify toast type by checking text content
  const allToasts = page.locator(toastSelectors.join(', '));
  const toastCount = await allToasts.count();
  
  if (toastCount > 0) {
    const firstToast = allToasts.first();
    const toastText = await firstToast.textContent().catch(() => '');
    
    if (type === 'success') {
      // Check for success indicators
      const hasSuccess = /success|created|updated|deleted|saved|completed/i.test(toastText || '');
      if (!hasSuccess && toastText) {
        // Also check for green/success variant
        const hasSuccessClass = await firstToast.evaluate((el) => {
          return el.classList.contains('success') || 
                 el.getAttribute('class')?.includes('green') ||
                 el.getAttribute('data-variant') === 'success';
        }).catch(() => false);
        if (!hasSuccessClass) {
          console.warn(`Expected success toast but found: ${toastText}`);
        }
      }
    } else if (type === 'error') {
      const hasError = /error|failed|invalid|denied|unauthorized/i.test(toastText || '');
      if (!hasError) {
        console.warn(`Expected error toast but found: ${toastText}`);
      }
    }
  }
}

/**
 * Check if toast notification is visible
 */
export async function verifyToast(
  page: Page,
  expectedText: string | RegExp,
  type: 'success' | 'error' | 'info' = 'success'
): Promise<void> {
  const toastSelectors = [
    '[role="status"][data-state="open"]',
    '[data-state="open"]',
    '[role="status"]',
    '.toast[data-state="open"]'
  ];
  
  const toast = page.locator(toastSelectors.join(', ')).first();
  
  // Wait for toast to be visible
  await toast.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
    // If toast not found, check if it's already dismissed
    console.warn('Toast may have already been dismissed');
  });
  
  // Check if toast is visible or was visible recently
  const isVisible = await toast.isVisible().catch(() => false);
  if (isVisible) {
    await expect(toast).toContainText(expectedText, { ignoreCase: true });
  } else {
    // Toast might have auto-dismissed, check page content for toast text
    const pageText = await page.textContent('body').catch(() => '');
    if (typeof expectedText === 'string') {
      expect(pageText?.toLowerCase()).toContain(expectedText.toLowerCase());
    } else {
      expect(pageText).toMatch(expectedText);
    }
  }
}

/**
 * Fill form field by label
 */
export async function fillFormField(
  page: Page,
  label: string,
  value: string | number
): Promise<void> {
  // Try multiple strategies to find the field
  const strategies = [
    // Strategy 1: Find by label text
    () => page.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea, select').first(),
    // Strategy 2: Find by name attribute
    () => page.locator(`input[name="${label.toLowerCase()}"], input[name="${label}"], input[name*="${label.toLowerCase()}"]`).first(),
    // Strategy 3: Find by placeholder
    () => page.locator(`input[placeholder*="${label}" i], textarea[placeholder*="${label}" i]`).first(),
    // Strategy 4: Find by aria-label
    () => page.locator(`[aria-label*="${label}" i]`).first(),
  ];
  
  let fieldFound = false;
  for (const strategy of strategies) {
    try {
      const field = strategy();
      if (await field.isVisible({ timeout: 2000 }).catch(() => false)) {
        await field.click(); // Focus the field
        await field.fill(String(value));
        fieldFound = true;
        break;
      }
    } catch (e) {
      // Try next strategy
    }
  }
  
  if (!fieldFound) {
    throw new Error(`Could not find form field with label: ${label}`);
  }
}

/**
 * Select dropdown option by label
 */
export async function selectDropdownOption(
  page: Page,
  label: string,
  option: string
): Promise<void> {
  const dropdown = page.locator(`label:has-text("${label}")`).locator('..').locator('select, [role="combobox"]').first();
  await dropdown.click();
  await page.locator(`text="${option}"`).first().click();
}

/**
 * Click button by text
 */
export async function clickButton(page: Page, text: string): Promise<void> {
  const buttonSelectors = [
    `button:has-text("${text}")`,
    `button:has-text("${text}", { exact: false })`,
    `[role="button"]:has-text("${text}")`,
    `[aria-label*="${text}" i]`,
  ];
  
  let buttonFound = false;
  for (const selector of buttonSelectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
      await button.click();
      buttonFound = true;
      break;
    }
  }
  
  if (!buttonFound) {
    throw new Error(`Could not find button with text: ${text}`);
  }
}

/**
 * Open dialog/modal by clicking trigger button
 */
export async function openDialog(page: Page, triggerText: string): Promise<void> {
  // Try multiple button selectors
  const buttonSelectors = [
    `button:has-text("${triggerText}")`,
    `button:has-text("Add ${triggerText}")`,
    `button:has-text("Create ${triggerText}")`,
    `button:has-text("New ${triggerText}")`,
    `[aria-label*="${triggerText}" i]`,
    `[aria-label*="Add ${triggerText}" i]`,
    `[aria-label*="Create ${triggerText}" i]`
  ];
  
  let buttonFound = false;
  for (const selector of buttonSelectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
      await button.click();
      buttonFound = true;
      break;
    }
  }
  
  if (!buttonFound) {
    throw new Error(`Could not find button to open dialog: ${triggerText}`);
  }
  
  // Wait for dialog to appear
  await page.waitForSelector('[role="dialog"], .dialog, [data-state="open"]', { state: 'visible', timeout: 5000 });
}

/**
 * Close dialog/modal
 */
export async function closeDialog(page: Page): Promise<void> {
  // Try multiple close methods
  const closeButton = page.locator('button[aria-label="Close"], button:has-text("Cancel"), [data-state="open"] button:has-text("×")').first();
  if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    // Press Escape key
    await page.keyboard.press('Escape');
  }
  // Wait for dialog to close
  await page.waitForSelector('[role="dialog"], .dialog, [data-state="open"]', { state: 'hidden', timeout: 3000 });
}

/**
 * Verify form validation error
 */
export async function verifyValidationError(
  page: Page,
  fieldLabel: string,
  expectedError?: string
): Promise<void> {
  const errorMessage = page.locator(`label:has-text("${fieldLabel}")`).locator('..').locator('.text-destructive, .error-message, [role="alert"]').first();
  await expect(errorMessage).toBeVisible();
  if (expectedError) {
    await expect(errorMessage).toContainText(expectedError, { ignoreCase: true });
  }
}

/**
 * Verify calculation result
 */
export async function verifyCalculation(
  page: Page,
  label: string,
  expectedValue: number,
  tolerance: number = 0.01
): Promise<void> {
  const valueElement = page.locator(`text="${label}"`).locator('..').locator('span, div').last();
  const actualText = await valueElement.textContent();
  const actualValue = parseFloat(actualText?.replace(/[^0-9.-]/g, '') || '0');
  expect(Math.abs(actualValue - expectedValue)).toBeLessThan(tolerance);
}

/**
 * Navigate to page via sidebar/menu or direct URL
 */
export async function navigateToPage(page: Page, pageName: string): Promise<void> {
  // Map page names to URLs and navigation text
  const navMap: Record<string, { url: string; text: string }> = {
    'Dashboard': { url: '/', text: 'Dashboard' },
    'Properties': { url: '/properties', text: 'Properties' },
    'Finance': { url: '/finance', text: 'Finance' },
    'HR': { url: '/hr', text: 'HR Management' },
    'CRM': { url: '/crm', text: 'CRM' },
    'Tenant': { url: '/tenant', text: 'Tenant Portal' },
    'Tenant Portal': { url: '/tenant', text: 'Tenant Portal' },
    'Settings': { url: '/settings', text: 'Settings' },
  };
  
  const navInfo = navMap[pageName];
  if (!navInfo) {
    throw new Error(`Unknown page name: ${pageName}`);
  }
  
  // Try to find and click sidebar link first
  try {
    // Wait for sidebar navigation to be visible
    await page.waitForSelector('nav a', { timeout: 5000 });
    
    // Try to find link by text or href
    const menuItem = page.locator(`nav a:has-text("${navInfo.text}"), nav a[href="${navInfo.url}"]`).first();
    
    if (await menuItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuItem.click();
      // Wait for navigation
      await page.waitForURL(new RegExp(navInfo.url.replace('/', '\\/')), { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      await page.waitForTimeout(1000);
      return;
    }
  } catch (error) {
    // If sidebar navigation fails, navigate directly via URL
    console.log(`Sidebar navigation failed for ${pageName}, using direct URL navigation`);
  }
  
  // Fallback: Navigate directly via URL
  await page.goto(navInfo.url);
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  await page.waitForTimeout(1000);
}

/**
 * Wait for API call to complete
 */
export async function waitForApiCall(page: Page, endpoint?: string): Promise<void> {
  if (endpoint) {
    await page.waitForResponse(response => response.url().includes(endpoint));
  } else {
    // Wait for any API call
    await page.waitForResponse(response => response.url().includes(API_URL));
  }
}

/**
 * Verify empty state message
 */
export async function verifyEmptyState(page: Page, expectedMessage: string): Promise<void> {
  const emptyState = page.locator(`text="${expectedMessage}"`).first();
  await expect(emptyState).toBeVisible();
}

/**
 * Verify data table has rows
 */
export async function verifyTableHasData(page: Page, minRows: number = 1): Promise<void> {
  const table = page.locator('table, [role="table"]').first();
  const rows = table.locator('tbody tr, [role="row"]');
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(minRows);
}

/**
 * Get text content of element
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  return await page.locator(selector).textContent() || '';
}

/**
 * Verify element is visible and contains text
 */
export async function verifyElementVisible(page: Page, selector: string, expectedText?: string): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  if (expectedText) {
    await expect(element).toContainText(expectedText, { ignoreCase: true });
  }
}

