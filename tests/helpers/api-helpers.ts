import { Page, APIResponse } from '@playwright/test';

export class APIHelper {
  constructor(private page: Page) {}

  async interceptAPI(method: string, urlPattern: string | RegExp): Promise<APIResponse> {
    return new Promise((resolve, reject) => {
      this.page.route(urlPattern, async (route) => {
        const response = await route.fetch();
        resolve(response);
        await route.fulfill({ response });
      });
    });
  }

  async validateAPIResponse(response: APIResponse, expectedStatus: number = 200) {
    if (response.status() !== expectedStatus) {
      throw new Error(`API call failed: ${response.status()} ${response.statusText()}`);
    }
    return response;
  }

  async getAPIResponse(urlPattern: string | RegExp): Promise<APIResponse> {
    let response: APIResponse | null = null;
    await this.page.route(urlPattern, async (route) => {
      response = await route.fetch();
      await route.fulfill({ response });
    });
    // Wait for the request to be made
    await this.page.waitForTimeout(1000); // Adjust as needed
    if (!response) {
      throw new Error('No API response captured');
    }
    return response;
  }
}