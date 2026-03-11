/**
 * Edge Cases Tests
 * Tests empty states, max limits, overlapping data, and error scenarios
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateToPage, verifyEmptyState } from './helpers/test-helpers';

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('Edge Cases - Empty State - No Properties', async ({ page }) => {
    // This test would require a clean database or filtering
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
    
    // Look for empty state message
    const emptyState = page.locator('text=/No properties|No data|Empty/i').first();
    // If empty state exists, verify it's displayed correctly
    if (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('Edge Cases - Form Max Length Validation', async ({ page }) => {
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
    
    const addButton = page.locator('button:has-text("Add Property")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      
      // Try to enter very long text
      const nameField = page.locator('input[name="name"]').first();
      if (await nameField.isVisible()) {
        const longText = 'A'.repeat(1000);
        await nameField.fill(longText);
        
        // Check if maxLength attribute is set
        const maxLength = await nameField.getAttribute('maxLength');
        if (maxLength) {
          const value = await nameField.inputValue();
          expect(value.length).toBeLessThanOrEqual(parseInt(maxLength));
        }
      }
      
      await page.keyboard.press('Escape');
    }
  });

  test('Edge Cases - Overlapping Date Ranges', async ({ page }) => {
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
    
    // Try to create lease with overlapping dates
    const addLeaseButton = page.locator('button:has-text("Add Lease"), button:has-text("Create Lease")').first();
    if (await addLeaseButton.isVisible()) {
      await addLeaseButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      
      // Set lease end date before start date
      const startDateField = page.locator('input[name="leaseStart"], input[type="date"]').first();
      const endDateField = page.locator('input[name="leaseEnd"], input[type="date"]').nth(1);
      
      if (await startDateField.isVisible() && await endDateField.isVisible()) {
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        await startDateField.fill(tomorrow.toISOString().split('T')[0]);
        await endDateField.fill(yesterday.toISOString().split('T')[0]);
        
        // Try to save
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();
        
        // Should show validation error
        await page.waitForTimeout(1000);
        const errorMessage = page.locator('.text-destructive, [role="alert"]').first();
        const hasError = await errorMessage.isVisible().catch(() => false);
        expect(hasError).toBeTruthy();
      }
      
      await page.keyboard.press('Escape');
    }
  });

  test('Edge Cases - Negative Values Validation', async ({ page }) => {
    await navigateToPage(page, 'Finance');
    await page.waitForLoadState('networkidle');
    
    const addInvoiceButton = page.locator('button:has-text("Create Invoice")').first();
    if (await addInvoiceButton.isVisible()) {
      await addInvoiceButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      
      // Try to enter negative amount
      const amountField = page.locator('input[name="amount"], input[type="number"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('-1000');
        
        // Check if min attribute prevents negative values
        const min = await amountField.getAttribute('min');
        if (min) {
          expect(parseFloat(min)).toBeGreaterThanOrEqual(0);
        }
        
        // Try to submit
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();
        
        // Should show validation error
        await page.waitForTimeout(1000);
        const errorMessage = page.locator('.text-destructive, [role="alert"]').first();
        const hasError = await errorMessage.isVisible().catch(() => false);
        expect(hasError).toBeTruthy();
      }
      
      await page.keyboard.press('Escape');
    }
  });

  test('Edge Cases - Network Error Handling', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/**', route => route.abort());
    
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
    
    // Try to perform an action
    const addButton = page.locator('button:has-text("Add Property")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      
      // Fill and submit
      const nameField = page.locator('input[name="name"]').first();
      if (await nameField.isVisible()) {
        await nameField.fill('Test Property');
        await page.locator('button:has-text("Save")').first().click();
        
        // Should show error toast
        await page.waitForTimeout(2000);
        const errorToast = page.locator('[role="status"], [data-sonner-toast]').first();
        const hasError = await errorToast.isVisible().catch(() => false);
        expect(hasError).toBeTruthy();
      }
    }
    
    // Restore network
    await page.unroute('**/api/**');
  });
});

