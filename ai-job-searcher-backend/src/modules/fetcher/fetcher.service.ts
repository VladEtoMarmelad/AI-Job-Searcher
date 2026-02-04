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

    // Enabled all previously commented targets
    const targets = [
      'work.ua',
      'robota.ua',
      'dou.ua',
      'djinni.co'
    ];

    const jobPathPatterns: Record<string, string> = {
      'work.ua': 'site:work.ua/jobs/',
      'robota.ua': 'site:robota.ua/vacancy/',
      'dou.ua': 'site:jobs.dou.ua',
      'djinni.co': 'site:djinni.co/jobs/'
    };

    try {
      for (const domain of targets) {
        const specificSiteConstraint = jobPathPatterns[domain] || `site:${domain}`;
        const query = `${specificSiteConstraint} "${keyword}"`;
        const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;

        this.logger.log(`Searching for ${keyword} on ${domain}...`);
        await page.goto(searchUrl, { waitUntil: 'networkidle' });

        // Iterate through multiple search result pages
        const maxSearchPages = 3;
        for (let i = 1; i <= maxSearchPages; i++) {
          try {
            await page.waitForSelector('[data-testid="result-title-a"]', { timeout: 5000 });

            const searchResultLinks = await page.$$eval('[data-testid="result-title-a"]', (anchors) => {
              return anchors.map(a => (a as HTMLAnchorElement).href);
            });

            for (const link of searchResultLinks) {
              // Logic for DOU: if the link is a list/category, visit it to extract real job URLs
              if (domain === 'dou.ua' && (link.includes('/vacancies/') || link.includes('category'))) {
                const subPage = await context.newPage();
                try {
                  await subPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 10000 });
                  // DOU uses .vt class for vacancy titles/links in their lists
                  const innerLinks = await subPage.$$eval('a.vt', (anchors) => 
                    anchors.map(a => (a as HTMLAnchorElement).href)
                  );
                  innerLinks.forEach(l => allLinks.add(l));
                } catch (e) {
                  this.logger.warn(`Could not deep-scan DOU link: ${link}`);
                } finally {
                  await subPage.close();
                }
              }

              // Filter and add direct vacancy links for all platforms
              if (domain === 'work.ua' && /\/jobs\/\d+/.test(link)) allLinks.add(link);
              if (domain === 'robota.ua' && link.includes('/vacancy/')) allLinks.add(link);
              if (domain === 'dou.ua' && /\/vacancies\/\d+/.test(link)) allLinks.add(link);
              if (domain === 'djinni.co' && (/\/jobs\/\d+/.test(link) || (link.includes('/jobs/') && !link.includes('?')))) {
                allLinks.add(link);
              }
            }

            // Navigate to the next set of results if available
            const moreButton = await page.$('#more-results');
            if (moreButton) {
              await moreButton.click();
              await new Promise(r => setTimeout(r, 1500));
            } else {
              break;
            }
          } catch (err) {
            break;
          }
        }
        
        await new Promise(r => setTimeout(r, 2000));
      }

      await browser.close();
      const finalResults = Array.from(allLinks);
      this.logger.log(`Total unique links found: ${finalResults.length}`);
      return finalResults;

    } catch (error) {
      this.logger.error('Search error:', error);
      await browser.close();
      return [];
    }
  }
}