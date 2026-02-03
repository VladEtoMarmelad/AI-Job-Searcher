import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright-extra';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

@Injectable()
export class FetcherService {
  private readonly logger = new Logger(FetcherService.name);

  async searchJobs(keyword: string): Promise<string[]> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    const allLinks = new Set<string>();

    // List of target resources
    const targets = [
      //'work.ua',
      //'robota.ua',
      //'dou.ua',
      'djinni.co'
    ];

    /** 
     * ADDITION: Define URL path patterns that represent individual job postings
     * to prevent getting search/category pages.
     */
    const jobPathPatterns: Record<string, string> = {
      //'robota.ua': 'site:robota.ua/company/*/vacancy',
      //'dou.ua': 'site:jobs.dou.ua/vacancies',
      //'dou.ua': 'site:jobs.dou.ua/companies/*/vacancies/*',
      'djinni.co': 'site:djinni.co/jobs'
    };

    try {
      for (const domain of targets) {
        // Formulate query: site:domain "keyword"
        /**
         * ADDITION: Use the specific job path pattern if available to refine the search
         */
        const specificSiteConstraint = jobPathPatterns[domain] || `site:${domain}`;
        const query = `${specificSiteConstraint} "${keyword}"`;

        const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;

        this.logger.log(`Searching for ${keyword} on ${domain}...`);

        await page.goto(searchUrl, { waitUntil: 'networkidle' });

        // Wait for results
        try {
          await page.waitForSelector('[data-testid="result-title-a"]', { timeout: 5000 });

          const links = await page.$$eval('[data-testid="result-title-a"]', (anchors) => {
            return anchors.map(a => (a as HTMLAnchorElement).href);
          });

          /**
           * ADDITION: Filter results to ensure they look like individual job pages
           * and not generic search result pages or category listings.
           */
          const filteredLinks = links.filter(link => {
            if (domain === 'robota.ua') return link.includes('/vacancy/');
            if (domain === 'dou.ua') return link.includes('/vacancies/');
            if (domain === 'djinni.co') return /\/jobs\/\d+/.test(link) || (link.includes('/jobs/') && !link.includes('?') && !link.includes('keyword'));
            return true;
          });

          filteredLinks.forEach(link => allLinks.add(link));
        } catch (e) {
          this.logger.log(`No results for ${domain}`);
        }

        // Small pause
        await new Promise(r => setTimeout(r, 2000));
      }

      await browser.close();

      const finalResults = Array.from(allLinks);
      const finalSet = new Set(finalResults)
      this.logger.log(`Total unique links found: ${finalResults.length}`);
      return [...finalSet];

    } catch (error) {
      this.logger.error('Search error:', error);
      await browser.close();
      return [];
    }
  }
}