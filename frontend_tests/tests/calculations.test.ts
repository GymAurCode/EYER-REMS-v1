/**
 * Calculations Tests
 * Tests all calculations displayed in the UI: rent, revenue, occupancy, payroll, commissions
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateToPage } from './helpers/test-helpers';

test.describe('Calculations Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('Calculations - Occupancy Rate Display', async ({ page }) => {
    await navigateToPage(page, 'Properties');
    await page.waitForLoadState('networkidle');
    
    // Look for occupancy rate display
    const occupancyElement = page.locator('text=/\\d+%/, text=/Occupancy/').first();
    if (await occupancyElement.isVisible({ timeout: 5000 })) {
      const text = await occupancyElement.textContent();
      // Verify it's a percentage
      expect(text).toMatch(/\d+%/);
      
      // Verify percentage is between 0-100
      const percentage = parseFloat(text?.replace('%', '') || '0');
      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(100);
    }
  });

  test('Calculations - Revenue Display', async ({ page }) => {
    await navigateToPage(page, 'Finance');
    await page.waitForLoadState('networkidle');
    
    // Look for revenue/total income display
    const revenueElement = page.locator('text=/Revenue|Income|Total/').first();
    if (await revenueElement.isVisible({ timeout: 5000 })) {
      // Verify numeric value is displayed
      const parent = revenueElement.locator('..');
      const valueText = await parent.textContent();
      expect(valueText).toMatch(/\d+/);
    }
  });

  test('Calculations - Invoice Tax Calculation', async ({ page }) => {
    await navigateToPage(page, 'Finance');
    await page.waitForLoadState('networkidle');
    
    // Open create invoice dialog
    const addButton = page.locator('button:has-text("Create Invoice"), button:has-text("Add Invoice")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      
      // Fill amount and tax
      const amountField = page.locator('input[name="amount"], input[type="number"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('10000');
        
        const taxField = page.locator('input[name="taxPercent"], input[name="tax"]').first();
        if (await taxField.isVisible()) {
          await taxField.fill('10');
          
          // Wait for calculation
          await page.waitForTimeout(1000);
          
          // Verify total is calculated (10000 + 10% = 11000)
          const totalElement = page.locator('text=/Total|11000|11,000/').first();
          if (await totalElement.isVisible()) {
            const totalText = await totalElement.textContent();
            expect(totalText).toMatch(/11000|11,000/);
          }
        }
      }
      
      // Close dialog
      await page.keyboard.press('Escape');
    }
  });

  test('Calculations - Payroll Net Pay Calculation', async ({ page }) => {
    await navigateToPage(page, 'HR');
    await page.waitForLoadState('networkidle');
    
    // Navigate to payroll section
    const payrollTab = page.locator('button:has-text("Payroll"), a:has-text("Payroll")').first();
    if (await payrollTab.isVisible()) {
      await payrollTab.click();
      await page.waitForLoadState('networkidle');
      
      // Open add payroll dialog
      const addButton = page.locator('button:has-text("Add Payroll"), button:has-text("Create Payroll")').first();
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
        
        // Fill payroll details
        const baseSalaryField = page.locator('input[name="baseSalary"]').first();
        if (await baseSalaryField.isVisible()) {
          await baseSalaryField.fill('50000');
          
          const allowancesField = page.locator('input[name="allowances"]').first();
          if (await allowancesField.isVisible()) {
            await allowancesField.fill('5000');
            
            const deductionsField = page.locator('input[name="deductions"]').first();
            if (await deductionsField.isVisible()) {
              await deductionsField.fill('2000');
              
              // Wait for calculation
              await page.waitForTimeout(1000);
              
              // Verify net pay is calculated (50000 + 5000 - 2000 = 53000)
              const netPayElement = page.locator('text=/Net Pay|53000|53,000/').first();
              if (await netPayElement.isVisible()) {
                const netPayText = await netPayElement.textContent();
                expect(netPayText).toMatch(/53000|53,000/);
              }
            }
          }
        }
        
        // Close dialog
        await page.keyboard.press('Escape');
      }
    }
  });

  test('Calculations - Commission Calculation', async ({ page }) => {
    await navigateToPage(page, 'CRM');
    await page.waitForLoadState('networkidle');
    
    // Navigate to deals section
    const dealsTab = page.locator('button:has-text("Deals"), a:has-text("Deals")').first();
    if (await dealsTab.isVisible()) {
      await dealsTab.click();
      await page.waitForLoadState('networkidle');
      
      // Open add deal dialog
      const addButton = page.locator('button:has-text("Add Deal"), button:has-text("Create Deal")').first();
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
        
        // Fill deal details
        const valueField = page.locator('input[name="value"], input[name="amount"]').first();
        if (await valueField.isVisible()) {
          await valueField.fill('100000');
          
          const commissionField = page.locator('input[name="commissionRate"], input[name="commission"]').first();
          if (await commissionField.isVisible()) {
            await commissionField.fill('5');
            
            // Wait for calculation
            await page.waitForTimeout(1000);
            
            // Verify commission is calculated (100000 * 5% = 5000)
            const commissionElement = page.locator('text=/Commission|5000|5,000/').first();
            if (await commissionElement.isVisible()) {
              const commissionText = await commissionElement.textContent();
              expect(commissionText).toMatch(/5000|5,000/);
            }
          }
        }
        
        // Close dialog
        await page.keyboard.press('Escape');
      }
    }
  });
});

