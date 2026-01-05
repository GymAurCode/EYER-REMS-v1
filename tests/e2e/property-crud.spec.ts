import { test, expect } from '@playwright/test';
import { NavigationHelper } from '../helpers/navigation';
import { APIHelper } from '../helpers/api-helpers';

test.describe('Property CRUD Operations', () => {
  let nav: NavigationHelper;
  let api: APIHelper;
  let createdPropertyId: string | null = null;
  let testTid: string;

  test.beforeEach(async ({ page }) => {
    nav = new NavigationHelper(page);
    api = new APIHelper(page);

    // Navigate to properties page
    await nav.goToProperties();
  });

  test('Create Property - Verify UI and API Response', async ({ page }) => {
    // Wait for the Add Property button to appear
    await page.waitForSelector('text=Add Property', { timeout: 10000 });

    // Intercept API call for property creation
    let createResponse: any = null;
    await page.route('**/api/properties', async (route) => {
      if (route.request().method() === 'POST') {
        const response = await route.fetch();
        createResponse = await response.json();
        await route.fulfill({ response });
      } else {
        await route.continue();
      }
    });

    // Click Add Property button
    await page.click('text=Add Property');

    // Wait for dialog to open
    await page.waitForSelector('[role="dialog"]');

    // Fill minimal required fields
    testTid = `TEST-${Date.now()}`;
    await page.fill('input[id="tid"]', testTid);
    await page.fill('input[placeholder*="Address"]', 'Test Address 123');

    // Select type
    await page.click('text=Select Type');
    await page.click('text=Residential');

    // Select status
    await page.click('text=Select Status');
    await page.click('text=Active');

    // Fill sale price
    await page.fill('input[placeholder*="Sale Price"]', '1000000');

    // Click Create Property button
    await page.click('text=Create Property');

    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Verify API response was successful
    if (createResponse) {
      expect(createResponse.success).toBe(true);
      expect(createResponse.data).toBeDefined();
      createdPropertyId = createResponse.data.id || createResponse.data.propertyId;
      console.log('Created property ID:', createdPropertyId);
    } else {
      throw new Error('Property creation API call not intercepted');
    }

    // Wait for table to appear
    await page.waitForSelector('table');

    // Verify property appears in table
    await page.waitForSelector(`text=${testTid}`);
    const propertyRow = page.locator('table tbody tr').filter({ hasText: testTid });
    await expect(propertyRow).toBeVisible();

    // Verify property details in table
    await expect(propertyRow.locator('td').nth(1)).toHaveText(testTid); // TID column
    await expect(propertyRow.locator('td').nth(3)).toHaveText('Active'); // Status column
  });

  test('Update Property - Verify Updated Value Appears', async ({ page }) => {
    if (!createdPropertyId || !testTid) {
      throw new Error('No property created in previous test');
    }

    // Wait for table
    await page.waitForSelector('table');

    // Find the property row and click edit
    const propertyRow = page.locator('table tbody tr').filter({ hasText: testTid });
    await propertyRow.locator('button').filter({ hasText: 'More' }).click();
    await page.click('text=Edit');

    // Wait for dialog
    await page.waitForSelector('[role="dialog"]');

    // Update address
    const newAddress = 'Updated Test Address 456';
    await page.fill('input[placeholder*="Address"]', newAddress);

    // Update sale price
    await page.fill('input[placeholder*="Sale Price"]', '2000000');

    // Click Save Changes
    await page.click('text=Save Changes');

    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Verify updated values in table
    await page.reload(); // Reload to ensure fresh data
    await nav.goToProperties();
    await page.waitForSelector('table');

    const updatedRow = page.locator('table tbody tr').filter({ hasText: newAddress });
    await expect(updatedRow).toBeVisible();
  });

  test('Delete Property - Verify Item is Removed and API Returns 404', async ({ page }) => {
    if (!createdPropertyId || !testTid) {
      throw new Error('No property created in previous test');
    }

    // Wait for table
    await page.waitForSelector('table');

    // Find the property row and click delete
    const propertyRow = page.locator('table tbody tr').filter({ hasText: testTid });
    await propertyRow.locator('button').filter({ hasText: 'More' }).click();
    await page.click('text=Delete');

    // Wait for delete dialog
    await page.waitForSelector('text=Are you sure you want to delete this property?');

    // Confirm delete
    await page.click('text=Delete');

    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Verify property is removed from table
    await page.waitForTimeout(1000); // Allow time for UI update
    const deletedRow = page.locator('table tbody tr').filter({ hasText: testTid });
    await expect(deletedRow).not.toBeVisible();

    // Verify API returns 404 for deleted property
    const deleteResponse = await page.request.get(`http://localhost:3001/api/properties/${createdPropertyId}`);
    expect(deleteResponse.status()).toBe(404);
  });
});