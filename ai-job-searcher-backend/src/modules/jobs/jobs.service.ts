import { AiService } from 'src/modules/ai/ai.service';
import { FetcherService } from 'src/modules/fetcher/fetcher.service';
import { NotifierService } from 'src/modules/notifier/notifier.service';
import { ParserService } from 'src/modules/parser/parser.service';
import { DbService } from 'src/modules/db/db.service';
import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class JobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobsService.name);

  // Externalized configuration via environment variables
  private readonly resume = process.env.CANDIDATE_RESUME || "Fullstack Developer, NestJS, TypeScript, React, Trainee/Junior";
  private readonly filters = process.env.JOB_FILTERS || "";
  private readonly searchKeyword = process.env.SEARCH_KEYWORD || "Node.js Developer";
  private readonly minScore = parseInt(process.env.MIN_SCORE || '8', 10);

  constructor(
    private fetcher: FetcherService,
    private parser: ParserService,
    private ai: AiService,
    private notifier: NotifierService,
    private db: DbService
  ) {}

  async onApplicationBootstrap() {
    try {
      this.logger.log('The application is launched. Initiating the first search cycle...');
      await this.runSearchCycle();
    } catch (error: unknown) {
      this.logger.error("error: ", error)
    }
  }

  @Cron(process.env.SEARCH_CRON || CronExpression.EVERY_HOUR)
  async handleScheduledSearch() {
    this.logger.log('Launching a scheduled job search...');
    await this.runSearchCycle();
  }

  async runSearchCycle() {
    // Keywords and filters are now derived from class properties
    const jobs: string[] = await this.fetcher.searchJobs(this.searchKeyword);

    for (const url of jobs) {
      const exists = await this.db.isVacancyExists(url);
      if (exists) {
        this.logger.log(`Vacancy already exists in DB, skipping: ${url}`);
        continue;
      }

      const description = await this.parser.extractJobDescription(url);
      const analysis = await this.ai.analyzeJob(this.resume, description, this.filters);
      
      await this.db.saveVacancy({
        url,
        description: analysis?.reason ?? "",
        score: analysis?.score ?? 0
      })

      // Threshold is parameterized
      if (analysis && analysis.score >= this.minScore) {
        await this.notifier.sendAlert(url, analysis);
      }

      const delay = parseInt(process.env.REQUEST_DELAY_MS || '2000', 10);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}