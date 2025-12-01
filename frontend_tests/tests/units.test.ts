/**
 * Units Module Tests
 * Tests unit CRUD, floor mapping, form validation, and toast notifications
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, waitForToast, verifyToast, openDialog, fillFormField, clickButton, navigateToPage, closeDialog } from './helpers/test-helpers';

test.describe('Units Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
  });

  test('Units - Add Unit Dialog Opens', async ({ page }) => {
    // Navigate to units tab or section
    const unitsTab = page.locator('button:has-text("Units"), a:has-text("Units")').first();
    if (await unitsTab.isVisible()) {
      await unitsTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    await openDialog(page, 'Add Unit');
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    await closeDialog(page);
  });

  test('Units - Add Unit - Form Validation', async ({ page }) => {
    const unitsTab = page.locator('button:has-text("Units"), a:has-text("Units")').first();
    if (await unitsTab.isVisible()) {
      await unitsTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    await openDialog(page, 'Add Unit');
    
    // Try to submit without required fields
    await clickButton(page, 'Save');
    
    // Wait for validation
    await page.waitForTimeout(1000);
    
    // Verify validation errors (adjust selectors based on your form)
    const unitNameField = page.locator('input[name="unitName"], input[placeholder*="Unit Name" i]').first();
    if (await unitNameField.isVisible()) {
      const isValid = await unitNameField.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(isValid).toBeFalsy();
    }
    
    await closeDialog(page);
  });

  test('Units - Add Unit - Success', async ({ page }) => {
    const unitsTab = page.locator('button:has-text("Units"), a:has-text("Units")').first();
    if (await unitsTab.isVisible()) {
      await unitsTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    await openDialog(page, 'Add Unit');
    
    // Fill required fields
    await fillFormField(page, 'Unit Name', 'Unit 101');
    await fillFormField(page, 'Monthly Rent', '5000');
    
    // Submit
    await clickButton(page, 'Save');
    
    // Wait for success toast
    await waitForToast(page, 'success', 10000);
    await verifyToast(page, /created|success/i, 'success');
  });

  test('Units - Floor Mapping Display', async ({ page }) => {
    // Verify floor/unit mapping is displayed correctly
    const unitsTab = page.locator('button:has-text("Units"), a:has-text("Units")').first();
    if (await unitsTab.isVisible()) {
      await unitsTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Look for floor/unit visualization
    await expect(page.locator('text=Floor, text=Unit').first()).toBeVisible({ timeout: 5000 });
  });
});

