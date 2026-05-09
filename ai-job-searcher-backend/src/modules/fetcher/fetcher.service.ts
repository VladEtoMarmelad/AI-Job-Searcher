import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { chromium } from 'playwright-extra';
import { Browser, Page } from 'playwright';
import { SiteConfig } from 'src/types/SiteConfig';
import { ParserService } from '../parser/parser.service';
import { AiService } from '../ai/ai.service';
import { ConfigService } from '@nestjs/config';
import { getBaseSiteConfigs } from 'src/utils/getBaseSiteConfigs';
import { StorageService } from '../storage/storage.service';
import { JobSelectors } from 'src/types/JobSelectors';
import { NotifierService } from '../notifier/notifier.service';

const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

@Injectable()
export class FetcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FetcherService.name);

  private browser!: Browser;
  private userAgent!: string;
  private maxSearchPages!: number;
  private targets!: string[];
  private delay!: number;
  private notifyOnHardcodedSelectorsFail!: boolean;

  constructor(
    private readonly parser: ParserService,
    private readonly ai: AiService,
    private configService: ConfigService,
    private storageService: StorageService,
    private notifierService: NotifierService
  ) {}

  async onModuleInit() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    }); 

    this.userAgent = this.configService.get<string>('BROWSER_USER_AGENT') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
    this.maxSearchPages = parseInt(this.configService.get<string>('MAX_SEARCH_PAGES') || '3', 10);
    this.targets = (this.configService.get<string>('JOB_SITES') || 'robota.ua,dou.ua,djinni.co').split(',');
    this.delay = parseInt(this.configService.get<string>('REQUEST_DELAY_MS') || '2000', 10);
    this.notifyOnHardcodedSelectorsFail = this.configService.get<string>('NOTIFY_ON_HARDCODED_SELECTORS_FAIL') === "true";
  }

  // Close the browser when the module is destroyed to prevent memory leaks
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Coordinates the selector recovery strategy: Hardcoded -> Storage -> AI discovery.
   */
  async getSiteConfigs(keyword: string): Promise<Record<string, SiteConfig>> {
    this.logger.log(`Initializing site configs with keyword: "${keyword}"`);
    const siteConfigs = getBaseSiteConfigs(keyword);
    const storedSelectors = await this.storageService.getAllSelectors();
    this.logger.log(`Loaded stored selectors for sites: ${Object.keys(storedSelectors).join(', ') || 'none'}`);

    for (const site of this.targets) {
      const config = siteConfigs[site];
      if (!config) continue;

      let isValid = await this.tryHardcodedSelectors(site, config);

      if (!isValid && storedSelectors[site]) {
        isValid = await this.tryStoredSelectors(site, config, storedSelectors[site]);
      }

      if (!isValid) {
        await this.tryAiDiscovery(site, config);
      }

      // Respectful delay between site processing to avoid rate limiting
      await new Promise(res => setTimeout(res, this.delay));
    }

    return siteConfigs;
  }

  private async tryHardcodedSelectors(site: string, config: SiteConfig): Promise<boolean> {
    this.logger.log(`Testing hardcoded selectors for ${site}: linkSelector=${config.linkSelector}`);
    const isValid = await this.parser.validateSelectors(config.url, {
      linkSelector: config.linkSelector,
      nextBtn: config.nextBtn
    });

    if (isValid) {
      this.logger.log(`Hardcoded selectors for ${site} are valid. Skipping storage/AI.`);
    } else {
      this.logger.warn(`Hardcoded selectors failed for ${site} at URL: ${config.url}`);
      if (this.notifyOnHardcodedSelectorsFail) {
        this.notifierService.sendHardcodedSelectorFailureAlert(site, config.url, {
          linkSelector: config.linkSelector, 
          nextBtn: config.nextBtn
        });
      }
    }
    return isValid;
  }

  private async tryStoredSelectors(site: string, config: SiteConfig, stored: JobSelectors): Promise<boolean> {
    this.logger.log(`Testing stored selectors for ${site}: linkSelector=${stored.linkSelector}`);
    const isValid = await this.parser.validateSelectors(config.url, stored);

    if (isValid) {
      this.logger.log(`Stored selectors for ${site} are valid. Applying to config.`);
      config.linkSelector = stored.linkSelector;
      config.nextBtn = stored.nextBtn || config.nextBtn;
    } else {
      this.logger.warn(`Stored selectors failed for ${site}. Clearing cache to trigger re-discovery.`);
      // If stored selectors fail, clear them to trigger re-discovery
      await this.storageService.clearSelectors(site);
    }
    return isValid;
  }

  private async tryAiDiscovery(site: string, config: SiteConfig): Promise<void> {
    try {
      this.logger.log(`Identifying new selectors for ${site} via AI...`);
      const jobHTML = await this.parser.extractJobHTML(config.url);
      const aiSelectors = await this.ai.analyzeJobHTML(jobHTML);

      if (aiSelectors && aiSelectors.linkSelector !== "") {
        this.logger.log(`AI discovered selectors for ${site}: linkSelector=${aiSelectors.linkSelector}`);
        const isAiValid = await this.parser.validateSelectors(config.url, aiSelectors);
        
        if (isAiValid) {
          this.logger.log(`AI-discovered selectors validated successfully for ${site}. Saving to storage.`);
          config.linkSelector = aiSelectors.linkSelector;
          config.nextBtn = aiSelectors.nextBtn || config.nextBtn;
          await this.storageService.saveSelectors(site, {
            linkSelector: config.linkSelector,
            nextBtn: config.nextBtn
          });
        } else {
          this.logger.warn(`AI-discovered selectors validation failed for ${site}. Keeping hardcoded defaults.`);
        }
      } else {
        this.logger.warn(`AI discovery did not return valid selectors for ${site}.`);
      }
    } catch (error) {
      this.logger.error(`Error processing AI discovery for ${site}:`, error instanceof Error ? error.message : error);
    }
  }

  /**
   * Main entry point for job searching. Orchestrates the browser and iterates through sites.
   */
  async searchJobs(keyword: string): Promise<string[]> {
    const context = await this.browser.newContext({
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

        await this.scrapeSite(page, domain, config, keyword, allLinks);
      }
    } finally {
      await context.close();
    }

    this.logger.log(`Finished. Found: ${allLinks.size} unique links`);
    return Array.from(allLinks);
  }

  /**
   * Handles the pagination and link extraction logic for a specific site.
   */
  private async scrapeSite(page: Page, domain: string, config: SiteConfig, keyword: string, allLinks: Set<string>): Promise<void> {
    try {
      this.logger.log(`Navigating to ${domain}...`);
      await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 45000 });

      for (let i = 1; i <= this.maxSearchPages; i++) {
        const foundJobs = await this.extractLinksFromCurrentPage(page, domain, config, i, allLinks);
        if (!foundJobs) break;

        const hasNextPage = await this.navigateToNextPage(page, domain, config, keyword, i);
        if (!hasNextPage) break;
      }
    } catch (domainError) {
      this.logger.error(`Error processing ${domain}: ${domainError instanceof Error ? domainError.message : domainError}`);
    }
  }

  private async extractLinksFromCurrentPage(page: Page, domain: string, config: SiteConfig, pageNum: number, allLinks: Set<string>): Promise<boolean> {
    try {
      await page.waitForSelector(config.linkSelector, { timeout: 10000 });
    } catch (e) {
      this.logger.warn(`No jobs found on ${domain} (page ${pageNum})`);
      return false;
    }

    // Gradual scrolling to trigger lazy loading of elements
    for (let j = 0; j <= 50; j++) {
      await page.evaluate(() => window.scrollBy(0, 100));
    }
    await page.waitForTimeout(1000); 

    const links = await page.$$eval(config.linkSelector, (anchors) =>
      anchors.map(a => (a as HTMLAnchorElement).href)
    );

    this.logger.log(`Links found for ${domain} domain: ${links.length}`);

    links.forEach(l => {
      const clean = l.split('?')[0].replace(/\/$/, '');
      if (clean.includes(domain)) allLinks.add(clean);
    });

    return true;
  }

  private async navigateToNextPage(page: Page, domain: string, config: SiteConfig, keyword: string, currentPage: number): Promise<boolean> {
    if (currentPage >= this.maxSearchPages) return false;

    if (config.nextBtn) {
      const nextBtn = await page.$(config.nextBtn);
      if (nextBtn && await nextBtn.isVisible()) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => { }),
          nextBtn.click()
        ]);
        return true;
      }
    } else {
      // Fallback pagination for specific hardcoded logic (e.g., robota.ua)
      // This allows continuation when a physical "Next" button is missing but URL pattern is known
      await page.goto(`https://robota.ua/zapros/${encodeURIComponent(keyword)}/ukraine/params;page=${currentPage + 1}`);
      return true;
    }

    return false;
  }
}