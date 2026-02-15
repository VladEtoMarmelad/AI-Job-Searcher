import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { chromium, Browser } from 'playwright';

@Injectable()
export class ParserService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ParserService.name);
  private readonly maxTextLength = parseInt(process.env.MAX_PARSER_LENGTH || '5000', 10);
  private browser: Browser;

  // Initialize the browser when the module starts
  async onModuleInit() {
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

  async extractJobDescription(url: string): Promise<string> {
    // Create a new browser context with a real-looking User-Agent
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
    } catch (error) {
      this.logger.error(`Playwright failed to parse ${url}: ${error.message}`);
      return '';
    } finally {
      // Always close the page and context to free up RAM
      await page.close();
      await context.close();
    }
  }
}