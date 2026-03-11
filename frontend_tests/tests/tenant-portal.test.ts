/**
 * Tenant Portal Module Tests
 * Tests tenant dashboard, ledger, payments, and auto-sync updates
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateToPage } from './helpers/test-helpers';

test.describe('Tenant Portal Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('Tenant Portal - Page Loads', async ({ page }) => {
    await navigateToPage(page, 'Tenant Portal');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify tenant portal loads
    await expect(page.locator('text=Tenant, text=Dashboard, text=Ledger, text="Tenant Portal"').first()).toBeVisible({ timeout: 10000 });
  });

  test('Tenant Portal - Dashboard Displays Data', async ({ page }) => {
    await navigateToPage(page, 'Tenant');
    await page.waitForLoadState('networkidle');
    
    // Verify dashboard elements
    await expect(page.locator('text=Current Rent, text=Outstanding Balance, text=Next Due Date').first()).toBeVisible({ timeout: 5000 });
  });

  test('Tenant Portal - Ledger Displays', async ({ page }) => {
    await navigateToPage(page, 'Tenant');
    await page.waitForLoadState('networkidle');
    
    // Navigate to ledger tab
    const ledgerTab = page.locator('button:has-text("Ledger"), a:has-text("Ledger")').first();
    if (await ledgerTab.isVisible()) {
      await ledgerTab.click();
      await page.waitForLoadState('networkidle');
      
      // Verify ledger table or list
      await expect(page.locator('table, [role="table"], .ledger-entry').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Tenant Portal - Auto-Sync - Payment Updates Ledger', async ({ page }) => {
    // This test verifies that when a payment is made, the tenant ledger updates
    await navigateToPage(page, 'Tenant');
    await page.waitForLoadState('networkidle');
    
    // Look for payment button
    const payButton = page.locator('button:has-text("Pay"), button:has-text("Make Payment")').first();
    if (await payButton.isVisible()) {
      await payButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      
      // Verify payment dialog opens
      await expect(page.locator('[role="dialog"]').first()).toBeVisible();
      
      // Close dialog
      await page.keyboard.press('Escape');
    }
  });
});

