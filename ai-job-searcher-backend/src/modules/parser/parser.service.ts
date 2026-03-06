import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser, Page } from 'playwright';

@Injectable()
export class ParserService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ParserService.name);
  private maxTextLength: number;
  private browser: Browser;

  constructor(private configService: ConfigService) {}

  // Initialize the browser when the module starts
  async onModuleInit() {
    this.maxTextLength = parseInt(this.configService.get<string>('MAX_PARSER_LENGTH') || '5000', 10); 

    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  // Close the browser when the module is destroyed to prevent memory leaks
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Internal helper to handle browser context, page creation, navigation and common waits.
   * This prevents code duplication and ensures resources are always cleaned up.
   */
  private async withPage<T>(url: string, callback: (page: Page) => Promise<T>): Promise<T | string> {
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    try {
      // Navigate to the URL and wait until the network is idle (important for SPA)
      await page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });

      // Wait for specific selectors depending on the domain to ensure content is loaded
      if (url.includes('robota.ua')) {
        // Robota.ua often uses dynamic classes, we wait for the main container
        await page.waitForSelector('div[class*="description"]', { timeout: 5000 }).catch(() => null);
      } else if (url.includes('dou.ua')) {
        await page.waitForSelector('.l-vacancy', { timeout: 5000 }).catch(() => null);
      }

      return await callback(page);
    } catch (error) {
      this.logger.error(`Playwright failed to process ${url}: ${error.message}`);
      return '';
    } finally {
      // Always close the page and context to free up RAM
      await page.close();
      await context.close();
    }
  }

  async extractJobDescription(url: string): Promise<string> {
    const result = await this.withPage(url, async (page) => {
      // Extract text content and remove unnecessary elements directly in the browser
      const text = await page.evaluate(() => {
        // Elements to remove
        const selectorsToRemove = 'script, style, nav, footer, header, aside, noscript, .cookie-policy, .similar-vacancies';
        const elements = document.querySelectorAll(selectorsToRemove);
        elements.forEach(el => el.remove());

        // Return the body text or a specific container
        return document.body.innerText;
      });

      // Clean up the string: remove extra spaces and newlines
      const cleanedText = text
        .replace(/\n+/g, ' ')
        .replace(/\s\s+/g, ' ')
        .trim();

      return cleanedText.substring(0, this.maxTextLength);
    });

    return result as string;
  }

  async extractJobHTML(url: string): Promise<string> {
    const result = await this.withPage(url, async (page) => {
      // Returns the full HTML content of the page, including the doctype
      return await page.content();
    });

    return result as string;
  }
}