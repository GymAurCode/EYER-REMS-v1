/**
 * Authentication Module Tests
 * Tests login, logout, form validation, and toast notifications
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, waitForToast, verifyToast, TEST_CREDENTIALS } from './helpers/test-helpers';

test.describe('Authentication Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Login Page - Form Elements Visible', async ({ page }) => {
    // Verify login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Login - Success with Valid Credentials', async ({ page }) => {
    // Clear any stale localStorage data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.fill('input[type="email"]', TEST_CREDENTIALS.admin.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.admin.password);
    
    // Wait for submit button to be ready
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();
    
    // Wait for navigation
    await page.waitForURL(/\/(dashboard|properties|\/)$/, { timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Verify toast notification
    await waitForToast(page, 'success', 10000);
    
    // Verify we're logged in (check for dashboard elements)
    await expect(page.locator('text=Dashboard, text=Properties, text=Finance').first()).toBeVisible({ timeout: 10000 });
  });

  test('Login - Error with Invalid Credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error toast
    await waitForToast(page, 'error', 5000);
    await verifyToast(page, /invalid|error|failed/i, 'error');
    
    // Verify still on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('Login - Form Validation - Empty Fields', async ({ page }) => {
    // Try to submit without filling fields
    await page.click('button[type="submit"]');
    
    // Check for validation errors (if HTML5 validation is enabled)
    const emailField = page.locator('input[type="email"]');
    const passwordField = page.locator('input[type="password"]');
    
    // HTML5 validation should prevent submission
    const emailValid = await emailField.evaluate((el: HTMLInputElement) => el.validity.valid);
    const passwordValid = await passwordField.evaluate((el: HTMLInputElement) => el.validity.valid);
    
    expect(emailValid).toBeFalsy();
    expect(passwordValid).toBeFalsy();
  });

  test('Login - Form Validation - Invalid Email Format', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    
    // HTML5 validation should catch invalid email
    const emailField = page.locator('input[type="email"]');
    const emailValid = await emailField.evaluate((el: HTMLInputElement) => el.validity.valid);
    
    expect(emailValid).toBeFalsy();
  });

  test('Logout - Success', async ({ page }) => {
    // Login first
    await loginAsAdmin(page);
    
    // Find and click logout button (adjust selector based on your UI)
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [aria-label="Logout"]').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Wait for logout toast
      await waitForToast(page, 'success');
      
      // Verify redirected to login
      await page.waitForURL(/\/login/, { timeout: 5000 });
    }
  });
});

