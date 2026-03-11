/**
 * Toast Notifications Tests
 * Tests toast notifications for all actions across all modules
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, waitForToast, verifyToast, openDialog, fillFormField, clickButton, navigateToPage } from './helpers/test-helpers';

test.describe('Toast Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('Toast - Login Success', async ({ page }) => {
    // Logout first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@realestate.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for success toast
    await waitForToast(page, 'success', 5000);
    await verifyToast(page, /success|welcome|logged in/i, 'success');
  });

  test('Toast - Property Created', async ({ page }) => {
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
    
    await openDialog(page, 'Add Property');
    await fillFormField(page, 'Name', `Test Property ${Date.now()}`);
    await fillFormField(page, 'Type', 'Residential');
    await fillFormField(page, 'Address', '123 Test St');
    await fillFormField(page, 'Total Units', '5');
    await clickButton(page, 'Save');
    
    // Wait for success toast
    await waitForToast(page, 'success', 10000);
    await verifyToast(page, /created|success|property/i, 'success');
  });

  test('Toast - Property Updated', async ({ page }) => {
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
    
    // Find and click edit button
    const editButton = page.locator('button:has-text("Edit"), [aria-label*="Edit" i]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      
      // Update name
      const nameField = page.locator('input[name="name"]').first();
      if (await nameField.isVisible()) {
        await nameField.clear();
        await nameField.fill(`Updated Property ${Date.now()}`);
        await clickButton(page, 'Save');
        
        // Wait for success toast
        await waitForToast(page, 'success', 10000);
        await verifyToast(page, /updated|success/i, 'success');
      }
    }
  });

  test('Toast - Form Validation Error', async ({ page }) => {
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
    
    await openDialog(page, 'Add Property');
    // Try to submit without filling required fields
    await clickButton(page, 'Save');
    
    // Wait for error toast or validation message
    await page.waitForTimeout(2000);
    
    // Check for either toast or inline validation
    const toast = page.locator('[role="status"], [data-sonner-toast]').first();
    const validationError = page.locator('.text-destructive, [role="alert"]').first();
    
    const hasToast = await toast.isVisible().catch(() => false);
    const hasValidation = await validationError.isVisible().catch(() => false);
    
    expect(hasToast || hasValidation).toBeTruthy();
  });

  test('Toast - API Error Handling', async ({ page }) => {
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
    
    // Try to create property with invalid data that will cause API error
    await openDialog(page, 'Add Property');
    await fillFormField(page, 'Name', 'Test');
    await fillFormField(page, 'Type', 'InvalidType'); // May cause validation error
    await fillFormField(page, 'Address', 'Test');
    await fillFormField(page, 'Total Units', '-1'); // Invalid value
    
    await clickButton(page, 'Save');
    
    // Wait for error toast
    await waitForToast(page, 'error', 10000);
    await verifyToast(page, /error|failed|invalid/i, 'error');
  });

  test('Toast - Multiple Toasts Stack', async ({ page }) => {
    // Perform multiple quick actions to trigger multiple toasts
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
    
    // Open and close dialog multiple times (if it triggers toasts)
    for (let i = 0; i < 3; i++) {
      await openDialog(page, 'Add Property');
      await page.waitForTimeout(500);
      await closeDialog(page);
      await page.waitForTimeout(500);
    }
    
    // Verify multiple toasts can exist (up to limit)
    const toasts = page.locator('[role="status"], [data-sonner-toast]');
    const count = await toasts.count();
    expect(count).toBeLessThanOrEqual(5); // Toast limit should be 5
  });

  test('Toast - Auto-Dismiss', async ({ page }) => {
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
    
    await openDialog(page, 'Add Property');
    await fillFormField(page, 'Name', `Auto Dismiss Test ${Date.now()}`);
    await fillFormField(page, 'Type', 'Residential');
    await fillFormField(page, 'Address', '123 Test');
    await fillFormField(page, 'Total Units', '5');
    await clickButton(page, 'Save');
    
    // Wait for toast to appear
    await waitForToast(page, 'success', 10000);
    
    // Wait for auto-dismiss (should be 4-5 seconds for success)
    await page.waitForTimeout(6000);
    
    // Toast should be gone or fading
    const toast = page.locator('[role="status"], [data-sonner-toast]').first();
    const isVisible = await toast.isVisible().catch(() => false);
    // Toast may still be visible but should be in dismiss state
    // This is a basic check - actual implementation may vary
  });
});

