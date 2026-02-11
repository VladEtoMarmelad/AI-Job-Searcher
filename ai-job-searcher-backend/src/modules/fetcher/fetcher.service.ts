import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright-extra';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

@Injectable()
export class FetcherService {
  private readonly logger = new Logger(FetcherService.name);

  private readonly userAgent = process.env.BROWSER_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
  private readonly maxSearchPages = parseInt(process.env.MAX_SEARCH_PAGES || '3', 10);
  private readonly targets = (process.env.JOB_SITES || 'work.ua,robota.ua,dou.ua,djinni.co').split(',');

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

    const siteConfigs: Record<string, { url: string, linkSelector: string, nextBtn?: string }> = {
      'work.ua': {
        url: `https://www.work.ua/jobs-${encodeURIComponent(keyword)}/`,
        linkSelector: 'h2 a',
        nextBtn: '.pagination.pagination-reg li:last-child a'
      },
      'robota.ua': {
        url: `https://robota.ua/zapros/${encodeURIComponent(keyword)}/ukraine`,
        linkSelector: 'alliance-vacancy-card-desktop a',
      },
      'dou.ua': {
        url: `https://jobs.dou.ua/vacancies/?search=${encodeURIComponent(keyword)}`,
        linkSelector: 'a.vt',
        nextBtn: '.more-btn a'
      },
      'djinni.co': {
        url: `https://djinni.co/jobs/?keywords=${encodeURIComponent(keyword)}`,
        linkSelector: '.job-list-item__link',
        nextBtn: '.pagination li:last-child a'
      }
    };

    try {
      for (const domain of this.targets) {
        const config = siteConfigs[domain];
        if (!config) continue;

        try {
          this.logger.log(`Navigating to ${domain}...`);
          
          // 1. Используем 'domcontentloaded' вместо 'networkidle'
          await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
          
          for (let i = 1; i <= this.maxSearchPages; i++) {
            // 2. Ждем появления конкретного элемента вместо ожидания затишья сети
            try {
              await page.waitForSelector(config.linkSelector, { timeout: 10000 });
            } catch (e) {
              this.logger.warn(`No jobs found on ${domain} (page ${i})`);
              break;
            }

            // Прокрутка вниз для подгрузки (актуально для Robota/DOU)
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));

            const links = await page.$$eval(config.linkSelector, (anchors) => 
               anchors.map(a => (a as HTMLAnchorElement).href)
            );

            links.forEach(l => {
                const clean = l.split('?')[0].replace(/\/$/, '');
                if (clean.includes(domain)) allLinks.add(clean);
            });

            // Логика пагинации
            if (config.nextBtn) {
              const nextBtn = await page.$(config.nextBtn);
              if (nextBtn) {
                const isVisible = await nextBtn.isVisible();
                if (isVisible && i < this.maxSearchPages) {
                  await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
                    nextBtn.click()
                  ]);
                  continue;
                }
              }
            }
            break; 
          }
        } catch (domainError) {
          this.logger.error(`Error processing ${domain}: ${domainError.message}`);
          // Переходим к следующему домену, если этот упал
        }
      }
    } finally {
      await browser.close();
    }

    this.logger.log(`Finished. Found: ${allLinks.size} unique links`);
    return Array.from(allLinks);
  }
}