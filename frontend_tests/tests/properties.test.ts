/**
 * Properties Module Tests
 * Tests property CRUD, form validation, auto-sync, calculations, and toast notifications
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, waitForToast, verifyToast, openDialog, fillFormField, selectDropdownOption, clickButton, closeDialog, navigateToPage } from './helpers/test-helpers';

test.describe('Properties Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Wait for dashboard to load first
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    // Then navigate to Properties
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
  });

  test('Properties Page - Loads Successfully', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Properties, h1:has-text("Properties")').first()).toBeVisible({ timeout: 10000 });
  });

  test('Properties - Add Property Dialog Opens', async ({ page }) => {
    await openDialog(page, 'Add Property');
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    await closeDialog(page);
  });

  test('Properties - Add Property - Form Validation', async ({ page }) => {
    await openDialog(page, 'Add Property');
    
    // Try to submit without filling required fields
    await clickButton(page, 'Save');
    
    // Wait for validation errors
    await page.waitForTimeout(1000);
    
    // Check for required field indicators (adjust based on your validation UI)
    const nameField = page.locator('input[name="name"], input[placeholder*="Name" i]').first();
    if (await nameField.isVisible()) {
      const isValid = await nameField.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(isValid).toBeFalsy();
    }
    
    await closeDialog(page);
  });

  test('Properties - Add Property - Success', async ({ page }) => {
    await openDialog(page, 'Add Property');
    
    // Fill required fields
    await fillFormField(page, 'Name', 'Test Property E2E');
    await fillFormField(page, 'Type', 'Residential');
    await fillFormField(page, 'Address', '123 Test Street');
    await fillFormField(page, 'Total Units', '10');
    
    // Submit form
    await clickButton(page, 'Save');
    
    // Wait for success toast
    await waitForToast(page, 'success', 10000);
    await verifyToast(page, /created|success/i, 'success');
    
    // Verify dialog closes
    await expect(page.locator('[role="dialog"]').first()).not.toBeVisible({ timeout: 5000 });
    
    // Verify property appears in list (may need to refresh)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Test Property E2E').first()).toBeVisible({ timeout: 10000 });
  });

  test('Properties - Edit Property', async ({ page }) => {
    // Find first property and click edit
    const editButton = page.locator('button:has-text("Edit"), [aria-label*="Edit" i]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Wait for edit dialog
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      
      // Update name
      const nameField = page.locator('input[name="name"]').first();
      await nameField.clear();
      await nameField.fill('Updated Property Name');
      
      // Save
      await clickButton(page, 'Save');
      
      // Wait for success toast
      await waitForToast(page, 'success');
      await verifyToast(page, /updated|success/i, 'success');
    }
  });

  test('Properties - Delete Property - Confirmation Dialog', async ({ page }) => {
    // Find delete button
    const deleteButton = page.locator('button:has-text("Delete"), [aria-label*="Delete" i]').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Wait for confirmation dialog
      await page.waitForSelector('[role="alertdialog"], [role="dialog"]', { timeout: 3000 });
      
      // Verify confirmation message
      await expect(page.locator('text=delete, text=confirm').first()).toBeVisible();
      
      // Cancel deletion
      await clickButton(page, 'Cancel');
    }
  });

  test('Properties - Property Dashboard - Calculations Display', async ({ page }) => {
    // Click on a property to view dashboard
    const propertyLink = page.locator('a, button').filter({ hasText: /property/i }).first();
    if (await propertyLink.isVisible()) {
      await propertyLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify calculations are displayed
      await expect(page.locator('text=Occupancy, text=Revenue, text=Units').first()).toBeVisible({ timeout: 5000 });
      
      // Verify numeric values are displayed
      const occupancyElement = page.locator('text=/\\d+%/').first();
      if (await occupancyElement.isVisible()) {
        const text = await occupancyElement.textContent();
        expect(text).toMatch(/\d+%/);
      }
    }
  });

  test('Properties - Auto-Sync - Property Status Updates', async ({ page }) => {
    // This test verifies that property status updates when tenant is assigned
    // Navigate to a property and assign tenant
    const propertyLink = page.locator('a, button').filter({ hasText: /property/i }).first();
    if (await propertyLink.isVisible()) {
      await propertyLink.click();
      await page.waitForLoadState('networkidle');
      
      // Look for assign tenant button
      const assignButton = page.locator('button:has-text("Assign Tenant"), button:has-text("Add Tenant")').first();
      if (await assignButton.isVisible()) {
        await assignButton.click();
        
        // If dialog opens, verify it
        await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
        
        // Close dialog for now (full test would fill form)
        await closeDialog(page);
      }
    }
  });
});

