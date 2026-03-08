import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright-extra';
import { SiteConfig } from 'src/types/SiteConfig';
import { ParserService } from '../parser/parser.service';
import { AiService } from '../ai/ai.service';
import { ConfigService } from '@nestjs/config';
import { getBaseSiteConfigs } from 'src/utils/getBaseSiteConfigs';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

@Injectable()
export class FetcherService {
  private readonly logger = new Logger(FetcherService.name);

  private userAgent: string;
  private maxSearchPages: number;
  private targets: string[];
  private delay: number;

  constructor(
    private readonly parser: ParserService,
    private readonly ai: AiService,
    private configService: ConfigService
  ) {}

  onModuleInit() {
    this.userAgent = this.configService.get<string>('BROWSER_USER_AGENT') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
    this.maxSearchPages = parseInt(this.configService.get<string>('MAX_SEARCH_PAGES') || '3', 10);
    this.targets = (this.configService.get<string>('JOB_SITES') || 'robota.ua,dou.ua,djinni.co').split(',');
    this.delay = parseInt(this.configService.get<string>('REQUEST_DELAY_MS') || '2000', 10);
  }

  async getSiteConfigs(keyword: string): Promise<Record<string, SiteConfig>> {
    const siteConfigs = getBaseSiteConfigs(keyword);

    for (const site in siteConfigs) {
      if (Object.prototype.hasOwnProperty.call(siteConfigs, site) && this.targets.includes(site)) {
        const config = siteConfigs[site];

        try {
          // Fetch the raw HTML content from the specified URL to identify the current page structure
          const jobHTML = await this.parser.extractJobHTML(config.url);

          // Use AI processing to dynamically determine the most accurate selectors for job links and navigation
          const jobSelectors = await this.ai.analyzeJobHTML(jobHTML);

          // Update the configuration object with the values discovered by the AI
          if (jobSelectors && (jobSelectors.linkSelector !== "" && jobSelectors.nextBtn !== "")) {
            config.linkSelector = jobSelectors.linkSelector || config.linkSelector;
            config.nextBtn = jobSelectors.nextBtn || config.nextBtn;
          }
        } catch (error) {
          // Ensure the loop continues to the next site even if one request fails
          console.error(`Error processing ${site}:`, error);
        }

        await new Promise(res => setTimeout(res, this.delay));
      }
    }

    // Return the modified object containing updated selectors for all sites
    return siteConfigs;
  }

  async searchJobs(keyword: string): Promise<string[]> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
      userAgent: this.userAgent,
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();
    const allLinks = new Set<string>();
    const siteConfigs = await this.getSiteConfigs(keyword);

    try {
      for (const domain of this.targets) {
        const config = siteConfigs[domain];
        if (!config) continue;

        try {
          this.logger.log(`Navigating to ${domain}...`);

          // 1. Use 'domcontentloaded' instead of 'networkidle' for faster loading
          await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 45000 });

          for (let i = 1; i <= this.maxSearchPages; i++) {
            // 2. Wait for a specific element to appear instead of waiting for the network to go idle
            try {
              await page.waitForSelector(config.linkSelector, { timeout: 10000 });
            } catch (e) {
              this.logger.warn(`No jobs found on ${domain} (page ${i})`);
              break;
            }

            // Scroll down to trigger lazy loading
            for (let i = 0; i <= 50; i++) {
              await page.evaluate(() => window.scrollBy(0, 100));
            }
            await page.waitForTimeout(1000); // Allow time for rendering

            const links = await page.$$eval(config.linkSelector, (anchors) =>
              anchors.map(a => (a as HTMLAnchorElement).href)
            );

            this.logger.log(`Links founded for ${domain} domain: ${links.length}`)

            links.forEach(l => {
              const clean = l.split('?')[0].replace(/\/$/, '');
              if (clean.includes(domain)) allLinks.add(clean);
            });

            // Pagination logic
            if (config.nextBtn) {
              const nextBtn = await page.$(config.nextBtn);
              if (nextBtn) {
                const isVisible = await nextBtn.isVisible();
                if (isVisible && i < this.maxSearchPages) {
                  await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => { }),
                    nextBtn.click()
                  ]);
                  continue;
                }
              }
            } else {
              await page.goto(`https://robota.ua/zapros/${encodeURIComponent(keyword)}/ukraine/params;page=${i}`);
              continue
            }
            break;
          }
        } catch (domainError) {
          this.logger.error(`Error processing ${domain}: ${domainError.message}`);
          // Proceed to the next domain if the current one fails
        }
      }
    } finally {
      await browser.close();
    }

    this.logger.log(`Finished. Found: ${allLinks.size} unique links`);
    return Array.from(allLinks);
  }
}