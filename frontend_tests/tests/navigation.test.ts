/**
 * Navigation Tests
 * Tests navigation between modules, sidebar menu, and routing
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateToPage } from './helpers/test-helpers';

test.describe('Navigation Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Navigation - Dashboard Link', async ({ page }) => {
    await navigateToPage(page, 'Dashboard');
    // Dashboard is at root "/"
    const url = page.url();
    expect(url.endsWith('/') || url.includes('/dashboard')).toBeTruthy();
  });

  test('Navigation - Properties Link', async ({ page }) => {
    await navigateToPage(page, 'Properties');
    await expect(page).toHaveURL(/\/properties/);
    // Wait for page content to load
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Properties, h1:has-text("Properties"), [data-testid="properties"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('Navigation - Finance Link', async ({ page }) => {
    await navigateToPage(page, 'Finance');
    await expect(page).toHaveURL(/\/finance/);
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Finance, h1:has-text("Finance"), [data-testid="finance"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('Navigation - HR Link', async ({ page }) => {
    await navigateToPage(page, 'HR');
    await expect(page).toHaveURL(/\/hr/);
    await page.waitForTimeout(2000);
    await expect(page.locator('text=HR, text="HR Management", h1:has-text("HR")').first()).toBeVisible({ timeout: 10000 });
  });

  test('Navigation - CRM Link', async ({ page }) => {
    await navigateToPage(page, 'CRM');
    await expect(page).toHaveURL(/\/crm/);
    await page.waitForTimeout(2000);
    await expect(page.locator('text=CRM, h1:has-text("CRM")').first()).toBeVisible({ timeout: 10000 });
  });

  test('Navigation - Tenant Portal Link', async ({ page }) => {
    await navigateToPage(page, 'Tenant Portal');
    await expect(page).toHaveURL(/\/tenant/);
  });

  test('Navigation - Settings Link', async ({ page }) => {
    await navigateToPage(page, 'Settings');
    await expect(page).toHaveURL(/\/settings/);
    await page.waitForTimeout(2000);
  });

  test('Navigation - No Errors on Page Load', async ({ page }) => {
    const pages = ['Dashboard', 'Properties', 'Finance', 'HR', 'CRM'];
    
    for (const pageName of pages) {
      await navigateToPage(page, pageName);
      await page.waitForLoadState('networkidle');
      
      // Check for console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Wait a bit for any errors
      await page.waitForTimeout(1000);
      
      // Filter out known non-critical errors
      const criticalErrors = errors.filter(e => 
        !e.includes('favicon') && 
        !e.includes('404') &&
        !e.includes('sourcemap')
      );
      
      expect(criticalErrors.length).toBe(0);
    }
  });
});

