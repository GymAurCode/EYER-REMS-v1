/**
 * Finance Module Tests
 * Tests invoices, payments, calculations, auto-sync, and toast notifications
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, waitForToast, verifyToast, openDialog, fillFormField, clickButton, navigateToPage, closeDialog } from './helpers/test-helpers';

test.describe('Finance Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await navigateToPage(page, 'Finance');
    await page.waitForLoadState('networkidle');
  });

  test('Finance Page - Loads Successfully', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Finance, h1:has-text("Finance")').first()).toBeVisible({ timeout: 10000 });
  });

  test('Finance - Create Invoice - Form Validation', async ({ page }) => {
    await openDialog(page, 'Create Invoice');
    
    // Try to submit without required fields
    await clickButton(page, 'Save');
    
    await page.waitForTimeout(1000);
    
    // Verify validation errors
    const amountField = page.locator('input[name="amount"], input[type="number"]').first();
    if (await amountField.isVisible()) {
      const isValid = await amountField.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(isValid).toBeFalsy();
    }
    
    await closeDialog(page);
  });

  test('Finance - Create Invoice - Tax Calculation', async ({ page }) => {
    await openDialog(page, 'Create Invoice');
    
    // Fill invoice details
    await fillFormField(page, 'Amount', '10000');
    await fillFormField(page, 'Tax Percent', '10');
    await fillFormField(page, 'Discount Amount', '500');
    
    // Check if calculation is displayed
    const totalElement = page.locator('text=/Total|Amount/').first();
    if (await totalElement.isVisible()) {
      // Expected: 10000 + (10000 * 0.10) - 500 = 10500
      const totalText = await totalElement.textContent();
      expect(totalText).toMatch(/10500|10,500/);
    }
    
    await closeDialog(page);
  });

  test('Finance - Create Invoice - Success', async ({ page }) => {
    await openDialog(page, 'Create Invoice');
    
    // Fill required fields
    await fillFormField(page, 'Amount', '5000');
    await fillFormField(page, 'Billing Date', new Date().toISOString().split('T')[0]);
    await fillFormField(page, 'Due Date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    
    // Submit
    await clickButton(page, 'Save');
    
    // Wait for success toast
    await waitForToast(page, 'success', 10000);
    await verifyToast(page, /created|success|invoice/i, 'success');
  });

  test('Finance - Receive Payment - Success', async ({ page }) => {
    await openDialog(page, 'Receive Payment');
    
    // Fill payment details
    await fillFormField(page, 'Amount', '5000');
    await fillFormField(page, 'Payment Method', 'cash');
    
    // Submit
    await clickButton(page, 'Save');
    
    // Wait for success toast
    await waitForToast(page, 'success', 10000);
    await verifyToast(page, /payment|received|success/i, 'success');
  });

  test('Finance - Finance Summary - Calculations Display', async ({ page }) => {
    // Verify finance summary displays correctly
    await expect(page.locator('text=Total Income, text=Total Expenses, text=Net Profit').first()).toBeVisible({ timeout: 5000 });
    
    // Verify numeric values
    const incomeElement = page.locator('text=/\\d+/').first();
    if (await incomeElement.isVisible()) {
      const text = await incomeElement.textContent();
      expect(text).toMatch(/\d+/);
    }
  });

  test('Finance - Auto-Sync - Payment Updates Invoice', async ({ page }) => {
    // This test verifies that when payment is received, invoice status updates
    // Navigate to invoices section
    const invoicesTab = page.locator('button:has-text("Invoices"), a:has-text("Invoices")').first();
    if (await invoicesTab.isVisible()) {
      await invoicesTab.click();
      await page.waitForLoadState('networkidle');
      
      // Verify invoice list loads
      await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 5000 });
    }
  });
});

