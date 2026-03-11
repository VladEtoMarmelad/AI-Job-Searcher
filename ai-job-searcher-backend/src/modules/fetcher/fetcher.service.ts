import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright-extra';
import { SiteConfig } from 'src/types/SiteConfig';
import { ParserService } from '../parser/parser.service';
import { AiService } from '../ai/ai.service';
import { ConfigService } from '@nestjs/config';
import { getBaseSiteConfigs } from 'src/utils/getBaseSiteConfigs';
import { StorageService } from '../storage/storage.service'; // Added
import { JobSelectors } from 'src/types/JobSelectors';

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
    private configService: ConfigService,
    private storageService: StorageService // Added
  ) {}

  onModuleInit() {
    this.userAgent = this.configService.get<string>('BROWSER_USER_AGENT') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
    this.maxSearchPages = parseInt(this.configService.get<string>('MAX_SEARCH_PAGES') || '3', 10);
    this.targets = (this.configService.get<string>('JOB_SITES') || 'robota.ua,dou.ua,djinni.co').split(',');
    this.delay = parseInt(this.configService.get<string>('REQUEST_DELAY_MS') || '2000', 10);
  }

  /**
   * Validates if the provided selectors actually work on the target page.
   * This prevents using AI-generated or outdated cached selectors that don't find any data.
   */
  private async validateSelectors(url: string, selectors: JobSelectors): Promise<boolean> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: this.userAgent });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // We check if at least one element matches the job link selector
      const element = await page.waitForSelector(selectors.linkSelector, { timeout: 8000 });
      return !!element;
    } catch (error) {
      return false;
    } finally {
      await browser.close();
    }
  }

  async getSiteConfigs(keyword: string): Promise<Record<string, SiteConfig>> {
    const siteConfigs = getBaseSiteConfigs(keyword);
    const storedSelectors = await this.storageService.getAllSelectors();

    for (const site in siteConfigs) {
      if (Object.prototype.hasOwnProperty.call(siteConfigs, site) && this.targets.includes(site)) {
        const config = siteConfigs[site];
        let isValid = false;

        // 1. Try to use selectors from JSON storage first
        if (storedSelectors[site]) {
          this.logger.log(`Testing stored selectors for ${site}...`);
          isValid = await this.validateSelectors(config.url, storedSelectors[site]);

          if (isValid) {
            this.logger.log(`Stored selectors for ${site} are valid.`);
            config.linkSelector = storedSelectors[site].linkSelector;
            config.nextBtn = storedSelectors[site].nextBtn || config.nextBtn;
          } else {
            // If stored selectors fail, clear them to trigger re-discovery
            await this.storageService.clearSelectors(site);
          }
        }

        // 2. If stored selectors don't exist or are invalid, use AI
        if (!isValid) {
          try {
            this.logger.log(`Identifying new selectors for ${site} via AI...`);
            const jobHTML = await this.parser.extractJobHTML(config.url);
            const aiSelectors = await this.ai.analyzeJobHTML(jobHTML);
            console.log("aiSelectors: ", aiSelectors)

            if (aiSelectors && aiSelectors.linkSelector !== "") {
              // Validate AI-generated selectors before applying and saving
              const isAiValid = await this.validateSelectors(config.url, aiSelectors);
              
              if (isAiValid) {
                config.linkSelector = aiSelectors.linkSelector;
                config.nextBtn = aiSelectors.nextBtn || config.nextBtn;
                await this.storageService.saveSelectors(site, {
                  linkSelector: config.linkSelector,
                  nextBtn: config.nextBtn
                });
              } else {
                this.logger.warn(`AI suggested invalid selectors for ${site}. Falling back to hardcoded defaults.`);
              }
            }
          } catch (error) {
            console.error(`Error processing ${site}:`, error);
          }
        }

        await new Promise(res => setTimeout(res, this.delay));
      }
    }

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

          await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 45000 });

          for (let i = 1; i <= this.maxSearchPages; i++) {
            try {
              await page.waitForSelector(config.linkSelector, { timeout: 10000 });
            } catch (e) {
              this.logger.warn(`No jobs found on ${domain} (page ${i})`);
              break;
            }

            for (let i = 0; i <= 50; i++) {
              await page.evaluate(() => window.scrollBy(0, 100));
            }
            await page.waitForTimeout(1000); 

            const links = await page.$$eval(config.linkSelector, (anchors) =>
              anchors.map(a => (a as HTMLAnchorElement).href)
            );

            this.logger.log(`Links founded for ${domain} domain: ${links.length}`)

            links.forEach(l => {
              const clean = l.split('?')[0].replace(/\/$/, '');
              if (clean.includes(domain)) allLinks.add(clean);
            });

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
              // Fallback pagination for specific hardcoded logic
              await page.goto(`https://robota.ua/zapros/${encodeURIComponent(keyword)}/ukraine/params;page=${i + 1}`);
              continue
            }
            break;
          }
        } catch (domainError) {
          this.logger.error(`Error processing ${domain}: ${domainError.message}`);
        }
      }
    } finally {
      await browser.close();
    }

    this.logger.log(`Finished. Found: ${allLinks.size} unique links`);
    return Array.from(allLinks);
  }
}