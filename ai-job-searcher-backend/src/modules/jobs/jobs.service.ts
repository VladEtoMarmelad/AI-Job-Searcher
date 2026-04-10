import { AiService } from 'src/modules/ai/ai.service';
import { FetcherService } from 'src/modules/fetcher/fetcher.service';
import { NotifierService } from 'src/modules/notifier/notifier.service';
import { ParserService } from 'src/modules/parser/parser.service';
import { DbService } from 'src/modules/db/db.service';
import { Injectable, OnApplicationBootstrap, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JobsService implements OnApplicationBootstrap, OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  private resume!: string;
  private filters!: string;
  private searchKeyword!: string;
  private minScore!: number;
  private requestDelay!: number;
  private isEmailNotifyEnabled!: boolean;

  constructor(
    private fetcher: FetcherService,
    private parser: ParserService,
    private ai: AiService,
    private notifier: NotifierService,
    private db: DbService,
    private configService: ConfigService
  ) {}

  onModuleInit() {
    // Configuration initialized through ConfigService for better maintainability and environment isolation
    this.resume = this.configService.get<string>('RESUME_CONTENT') || "Fullstack Developer, NestJS, TypeScript, React, Trainee/Junior";
    this.filters = this.configService.get<string>('JOB_FILTERS') || "";
    this.searchKeyword = this.configService.get<string>('SEARCH_KEYWORD') || "Node.js Developer";
    this.minScore = parseInt(this.configService.get<string>('MIN_SCORE') || '8', 10);
    this.requestDelay = parseInt(this.configService.get<string>('REQUEST_DELAY_MS') || '2000', 10);
    this.isEmailNotifyEnabled = this.configService.get<string>('SEND_NOTIFY_EMAIL') === "true";
  }

  onApplicationBootstrap() {
    try {
      this.logger.log('The application is launched. Initiating the first search cycle...');
      this.runSearchCycle();
    } catch (error: unknown) {
      this.logger.error("error: ", error instanceof Error ? error.message : error);
    }
  }

  @Cron(process.env.SEARCH_CRON || CronExpression.EVERY_HOUR)
  async handleScheduledSearch() {
    this.logger.log('Launching a scheduled job search...');
    await this.runSearchCycle();
  }

  async runSearchCycle() {
    // Keywords and filters are derived from initialized class properties
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
        title: analysis?.vacancyTitle ?? "",
        description: analysis?.reasoning ?? "",
        domain: new URL(url).hostname,
        score: analysis?.score ?? 0,
        viewed: false
      })

      // Threshold is parameterized via class property
      if (analysis && analysis.score >= this.minScore && this.isEmailNotifyEnabled) {
        await this.notifier.sendAlert(url, analysis);
      }

      // Prevents rate limiting by the target job board
      await new Promise(res => setTimeout(res, this.requestDelay));
    }
  }
}