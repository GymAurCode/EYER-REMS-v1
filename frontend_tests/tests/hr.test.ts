/**
 * HR Module Tests
 * Tests employees, payroll, attendance, leave management, and toast notifications
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, waitForToast, verifyToast, openDialog, fillFormField, clickButton, navigateToPage, closeDialog } from './helpers/test-helpers';

test.describe('HR Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await navigateToPage(page, 'HR');
    await page.waitForLoadState('networkidle');
  });

  test('HR Page - Loads Successfully', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=HR, text="HR Management", h1:has-text("HR")').first()).toBeVisible({ timeout: 10000 });
  });

  test('HR - Add Employee - Form Validation', async ({ page }) => {
    // Navigate to employees section
    const employeesTab = page.locator('button:has-text("Employees"), a:has-text("Employees")').first();
    if (await employeesTab.isVisible()) {
      await employeesTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    await openDialog(page, 'Add Employee');
    
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

  test('HR - Add Employee - Success', async ({ page }) => {
    const employeesTab = page.locator('button:has-text("Employees"), a:has-text("Employees")').first();
    if (await employeesTab.isVisible()) {
      await employeesTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    await openDialog(page, 'Add Employee');
    
    // Fill required fields
    await fillFormField(page, 'Name', `Test Employee ${Date.now()}`);
    await fillFormField(page, 'Email', `employee${Date.now()}@test.com`);
    await fillFormField(page, 'Phone', '1234567890');
    await fillFormField(page, 'Department', 'Sales');
    
    // Submit
    await clickButton(page, 'Save');
    
    // Wait for success toast
    await waitForToast(page, 'success', 10000);
    await verifyToast(page, /created|success|employee/i, 'success');
  });

  test('HR - Create Payroll - Calculations', async ({ page }) => {
    const payrollTab = page.locator('button:has-text("Payroll"), a:has-text("Payroll")').first();
    if (await payrollTab.isVisible()) {
      await payrollTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    await openDialog(page, 'Add Payroll');
    
    // Fill payroll details
    await fillFormField(page, 'Base Salary', '50000');
    await fillFormField(page, 'Allowances', '5000');
    await fillFormField(page, 'Deductions', '2000');
    await fillFormField(page, 'Tax Percent', '10');
    
    // Wait for calculation
    await page.waitForTimeout(1000);
    
    // Verify net pay is calculated
    const netPayElement = page.locator('text=/Net Pay|53000|53,000/').first();
    if (await netPayElement.isVisible()) {
      const netPayText = await netPayElement.textContent();
      expect(netPayText).toMatch(/53000|53,000/);
    }
    
    await closeDialog(page);
  });

  test('HR - Create Payroll - Success', async ({ page }) => {
    const payrollTab = page.locator('button:has-text("Payroll"), a:has-text("Payroll")').first();
    if (await payrollTab.isVisible()) {
      await payrollTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    // First, get an employee ID (select from dropdown if available)
    await openDialog(page, 'Add Payroll');
    
    // Fill required fields
    await fillFormField(page, 'Month', new Date().toISOString().slice(0, 7));
    await fillFormField(page, 'Base Salary', '50000');
    
    // Submit
    await clickButton(page, 'Save');
    
    // Wait for success toast
    await waitForToast(page, 'success', 10000);
    await verifyToast(page, /created|success|payroll/i, 'success');
  });

  test('HR - Attendance Portal - Loads', async ({ page }) => {
    // Navigate to attendance portal
    await page.goto('/attendance-portal');
    await page.waitForLoadState('networkidle');
    
    // Verify attendance portal loads
    await expect(page.locator('text=Attendance, text=Check In, text=Check Out').first()).toBeVisible({ timeout: 5000 });
  });
});

