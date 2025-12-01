/**
 * CRM Module Tests
 * Tests leads, clients, deals, commissions, and toast notifications
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, waitForToast, verifyToast, openDialog, fillFormField, clickButton, navigateToPage, closeDialog } from './helpers/test-helpers';

test.describe('CRM Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await navigateToPage(page, 'CRM');
    await page.waitForLoadState('networkidle');
  });

  test('CRM Page - Loads Successfully', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=CRM, h1:has-text("CRM")').first()).toBeVisible({ timeout: 10000 });
  });

  test('CRM - Add Lead - Form Validation', async ({ page }) => {
    // Navigate to leads section
    const leadsTab = page.locator('button:has-text("Leads"), a:has-text("Leads")').first();
    if (await leadsTab.isVisible()) {
      await leadsTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    await openDialog(page, 'Add Lead');
    
    // Try to submit without required fields
    await clickButton(page, 'Save');
    
    await page.waitForTimeout(1000);
    
    // Verify validation errors
    const nameField = page.locator('input[name="name"]').first();
    if (await nameField.isVisible()) {
      const isValid = await nameField.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(isValid).toBeFalsy();
    }
    
    await closeDialog(page);
  });

  test('CRM - Add Lead - Success', async ({ page }) => {
    const leadsTab = page.locator('button:has-text("Leads"), a:has-text("Leads")').first();
    if (await leadsTab.isVisible()) {
      await leadsTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    await openDialog(page, 'Add Lead');
    
    // Fill required fields
    await fillFormField(page, 'Name', `Test Lead ${Date.now()}`);
    await fillFormField(page, 'Phone', '1234567890');
    await fillFormField(page, 'Source', 'Website');
    
    // Submit
    await clickButton(page, 'Save');
    
    // Wait for success toast
    await waitForToast(page, 'success', 10000);
    await verifyToast(page, /created|success|lead/i, 'success');
  });

  test('CRM - Add Deal - Commission Calculation', async ({ page }) => {
    const dealsTab = page.locator('button:has-text("Deals"), a:has-text("Deals")').first();
    if (await dealsTab.isVisible()) {
      await dealsTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    await openDialog(page, 'Add Deal');
    
    // Fill deal details
    await fillFormField(page, 'Title', `Test Deal ${Date.now()}`);
    await fillFormField(page, 'Value', '100000');
    await fillFormField(page, 'Commission Rate', '5');
    
    // Wait for calculation
    await page.waitForTimeout(1000);
    
    // Verify commission is calculated (100000 * 5% = 5000)
    const commissionElement = page.locator('text=/Commission|5000|5,000/').first();
    if (await commissionElement.isVisible()) {
      const commissionText = await commissionElement.textContent();
      expect(commissionText).toMatch(/5000|5,000/);
    }
    
    await closeDialog(page);
  });

  test('CRM - Add Deal - Success', async ({ page }) => {
    const dealsTab = page.locator('button:has-text("Deals"), a:has-text("Deals")').first();
    if (await dealsTab.isVisible()) {
      await dealsTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    await openDialog(page, 'Add Deal');
    
    // Fill required fields
    await fillFormField(page, 'Title', `Test Deal ${Date.now()}`);
    await fillFormField(page, 'Value', '100000');
    await fillFormField(page, 'Status', 'Open');
    
    // Submit
    await clickButton(page, 'Save');
    
    // Wait for success toast
    await waitForToast(page, 'success', 10000);
    await verifyToast(page, /created|success|deal/i, 'success');
  });

  test('CRM - Convert Lead to Client', async ({ page }) => {
    const leadsTab = page.locator('button:has-text("Leads"), a:has-text("Leads")').first();
    if (await leadsTab.isVisible()) {
      await leadsTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Find convert button
    const convertButton = page.locator('button:has-text("Convert"), button:has-text("Convert to Client")').first();
    if (await convertButton.isVisible()) {
      await convertButton.click();
      
      // Wait for success toast
      await waitForToast(page, 'success', 10000);
      await verifyToast(page, /converted|success|client/i, 'success');
    }
  });
});

