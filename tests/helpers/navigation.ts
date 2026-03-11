import { Page } from '@playwright/test';

export class NavigationHelper {
  constructor(private page: Page) {}

  async goToProperties() {
    await this.page.goto('/properties');
    await this.page.waitForLoadState('networkidle');
  }

  async goToEmployees() {
    await this.page.goto('/hr');
    await this.page.waitForLoadState('networkidle');
  }

  async goToCRM() {
    await this.page.goto('/crm');
    await this.page.waitForLoadState('networkidle');
  }

  async goToFinance() {
    await this.page.goto('/finance');
    await this.page.waitForLoadState('networkidle');
  }

  async goToSettings() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }
}