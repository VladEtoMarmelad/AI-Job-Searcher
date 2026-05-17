import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Browser, Page } from 'playwright';
import { chromium } from 'playwright-extra';
import { JobSelectors } from 'src/types/JobSelectors';

const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

@Injectable()
export class ParserService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ParserService.name);
  private maxTextLength!: number;
  private browser!: Browser;
  private userAgent!: string;

  constructor(private configService: ConfigService) {}

  // Initialize the browser when the module starts
  async onModuleInit() {
    this.maxTextLength = parseInt(this.configService.get<string>('MAX_PARSER_LENGTH') || '5000', 10);
    this.userAgent = this.configService.get<string>('BROWSER_USER_AGENT') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

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
   * Validates if the provided selectors actually work on the target page.
   * This prevents using AI-generated or outdated cached selectors that don't find any data.
   * Uses the same viewport as searchJobs to ensure consistent HTML rendering across validation and scraping.
   */
  async validateSelectors(url: string, selectors: JobSelectors): Promise<boolean> {
    const context = await this.browser.newContext({ 
      userAgent: this.userAgent,
      // Match viewport from searchJobs to ensure consistent DOM rendering
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Verification of the job link selector availability
      const isLinkValid = await page.waitForSelector(selectors.linkSelector, { timeout: 8000 })
        .then(() => true)
        .catch(() => false);

      if (!isLinkValid) return false;

      // Verification of the pagination button if it is defined in the config
      // This ensures that we can navigate through multiple pages
      if (selectors.nextBtn) {
        const isNextBtnValid = await page.waitForSelector(selectors.nextBtn, { timeout: 5000 })
          .then(() => true)
          .catch(() => false);
        
        if (!isNextBtnValid) return false;
      }

      return true;
    } catch (error) {
      return false;
    } finally {
      await context.close();
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
      // Use domain-specific wait strategies to avoid timeouts on sites with persistent network activity
      const waitStrategy = url.includes('robota.ua') ? 'load' : 'networkidle';

      // Navigate to the URL and wait until the network is idle (important for SPA)
      await page.goto(url, {
        waitUntil: waitStrategy,
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
      this.logger.error(`Playwright failed to process ${url}: ${error instanceof Error ? error.message : error}`);
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
      // Execute a script to transform the DOM into a minimal skeleton
      await page.evaluate(() => {
        // 1. Remove obvious "garbage" tags
        const unwantedTags = ['script', 'style', 'svg', 'path', 'img', 'noscript', 'iframe', 'header', 'footer', 'app-shell-header', 'app-mobile-navigation-bar'];
        unwantedTags.forEach(tag => document.querySelectorAll(tag).forEach(el => el.remove()));

        // 2. Clear all attributes except essential ones (id, class, href)
        // This removes all Angular-specific attributes like ng-tns, ng-star-inserted, etc.
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          const attributes = el.attributes;
          for (let i = attributes.length - 1; i >= 0; i--) {
            const attrName = attributes[i].name;
            if (!['id', 'class', 'href'].includes(attrName)) {
              el.removeAttribute(attrName);
            }
          }

          // 3. Remove text nodes that are too long (keep only short labels like "Next", "2", or job titles)
          // This drastically reduces token count while preserving link text for AI analysis.
          if (el.childNodes.length > 0) {
            el.childNodes.forEach(node => {
              if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                if (node.textContent.trim().length > 30) {
                  node.textContent = '...';
                }
              }
            });
          }
        });

        // 4. Remove elements that don't have class/id AND aren't links (useless wrappers)
        document.querySelectorAll('div, span, section, article').forEach(el => {
          if (!el.className && !el.id && el.tagName !== 'A') {
            // Unwrapping: move children to parent then remove the empty wrapper
            while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
            el.remove();
          }
        });

        // 5. Limit repetitive structures (vacancy cards)
        // We find all links, and if we see a pattern of similar links, we keep only first few.
        // For Robota.ua / Dou.ua / LinkedIn this is usually enough to find the selector.
        const links = Array.from(document.querySelectorAll('a'));
        if (links.length > 15) {
          // Keep first 10 links (usually jobs) and last 10 (usually pagination)
          const linksToRemove = links.slice(10, -10);
          linksToRemove.forEach(link => {
            // Remove the parent container of the link to clean up the card
            const container = link.closest('alliance-vacancy-card-desktop') || link.parentElement;
            container?.remove();
          });
        }
      });

      // Extract the cleaned HTML
      let html = await page.content();

      // 6. Final regex cleanup
      return html
        .replace(/<!---->/g, '') // Remove Angular comments
        .replace(/\s\s+/g, ' ') // Collapse multiple spaces
        .replace(/>\s+</g, '><') // Remove spaces between tags
        .trim();
    });

    return result as string;
  }
}