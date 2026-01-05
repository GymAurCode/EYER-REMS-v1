import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Go to login page
  await page.goto('http://localhost:3000/login');

  // Fill login form
  await page.fill('input[type="email"]', 'admin@realestate.com');
  await page.fill('input[type="password"]', 'admin123');

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL('http://localhost:3000/');

  // Save signed-in state
  await page.context().storageState({ path: 'tests/auth.json' });

  await browser.close();
}

export default globalSetup;