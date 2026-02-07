import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright-extra';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

@Injectable()
export class FetcherService {
  private readonly logger = new Logger(FetcherService.name);

  // Configuration for browser behavior and targets
  private readonly userAgent = process.env.BROWSER_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
  private readonly maxSearchPages = parseInt(process.env.MAX_SEARCH_PAGES || '3', 10);
  private readonly targets = (process.env.JOB_SITES || 'work.ua,robota.ua,dou.ua,djinni.co').split(',');

  async searchJobs(keyword: string): Promise<string[]> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: this.userAgent,
    });

    const page = await context.newPage();
    const allLinks = new Set<string>();

    const jobPathPatterns: Record<string, string> = {
      'work.ua': 'site:work.ua/jobs/',
      'robota.ua': 'site:robota.ua/vacancy/',
      'dou.ua': 'site:jobs.dou.ua',
      'djinni.co': 'site:djinni.co/jobs/'
    };

    try {
      for (const domain of this.targets) {
        const specificSiteConstraint = jobPathPatterns[domain] || `site:${domain}`;
        const query = `${specificSiteConstraint} "${keyword}"`;
        const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;

        this.logger.log(`Searching for ${keyword} on ${domain}...`);
        await page.goto(searchUrl, { waitUntil: 'networkidle' });

        for (let i = 1; i <= this.maxSearchPages; i++) {
          try {
            await page.waitForSelector('[data-testid="result-title-a"]', { timeout: 5000 });

            const searchResultLinks = await page.$$eval('[data-testid="result-title-a"]', (anchors) => {
              return anchors.map(a => (a as HTMLAnchorElement).href);
            });

            for (const link of searchResultLinks) {
              if (domain === 'dou.ua' && (link.includes('/vacancies/') || link.includes('category'))) {
                const subPage = await context.newPage();
                try {
                  await subPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 10000 });
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

              if (domain === 'work.ua' && /\/jobs\/\d+/.test(link)) allLinks.add(link);
              if (domain === 'robota.ua' && link.includes('/vacancy/')) allLinks.add(link);
              if (domain === 'dou.ua' && /\/vacancies\/\d+/.test(link)) allLinks.add(link);
              if (domain === 'djinni.co' && (/\/jobs\/\d+/.test(link) || (link.includes('/jobs/') && !link.includes('?')))) {
                allLinks.add(link);
              }
            }

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