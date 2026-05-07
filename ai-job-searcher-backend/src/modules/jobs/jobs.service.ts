import { AiService } from 'src/modules/ai/ai.service';
import { FetcherService } from 'src/modules/fetcher/fetcher.service';
import { ParserService } from 'src/modules/parser/parser.service';
import { DbService } from 'src/modules/db/db.service';
import { Injectable, OnApplicationBootstrap, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

interface SearchCycleOverrides {
  searchKeyword?: string;
  resume?: string;
  filters?: string;
}

@Injectable()
export class JobsService implements OnApplicationBootstrap, OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  private resume!: string;
  private filters!: string;
  private searchKeyword!: string;
  private requestDelay!: number;
  private enableAutoSearch!: boolean;

  constructor(
    private fetcher: FetcherService,
    private parser: ParserService,
    private ai: AiService,
    private db: DbService,
    private configService: ConfigService
  ) {}

  onModuleInit() {
    // Configuration initialized through ConfigService for better maintainability and environment isolation
    this.resume = this.configService.get<string>('RESUME_CONTENT') || "Fullstack Developer, NestJS, TypeScript, React, Trainee/Junior";
    this.filters = this.configService.get<string>('JOB_FILTERS') || "";
    this.searchKeyword = this.configService.get<string>('SEARCH_KEYWORD') || "Node.js Developer";
    this.requestDelay = parseInt(this.configService.get<string>('REQUEST_DELAY_MS') || '2000', 10);
    this.enableAutoSearch = this.configService.get<string>('ENABLE_AUTO_SEARCH')?.toLowerCase() === 'true' || false;
  }

  onApplicationBootstrap() {
    if (!this.enableAutoSearch) {
      this.logger.log('Auto search is disabled via ENABLE_AUTO_SEARCH configuration');
      return;
    }
    try {
      this.logger.log('The application is launched. Initiating the first search cycle...');
      this.runSearchCycle();
    } catch (error: unknown) {
      this.logger.error("error: ", error instanceof Error ? error.message : error);
    }
  }

  @Cron(process.env.SEARCH_CRON || CronExpression.EVERY_HOUR)
  async handleScheduledSearch() {
    if (!this.enableAutoSearch) {
      return;
    }
    this.logger.log('Launching a scheduled job search...');
    await this.runSearchCycle();
  }

  async runSearchCycle(overrides?: SearchCycleOverrides): Promise<void> {
    // Use provided values or fall back to class properties initialized from environment
    const searchKeyword = overrides?.searchKeyword ?? this.searchKeyword;
    const resume = overrides?.resume ?? this.resume;
    const filters = overrides?.filters ?? this.filters;

    const jobs: string[] = await this.fetcher.searchJobs(searchKeyword);

    for (const url of jobs) {
      const exists = await this.db.isVacancyExists(url);
      if (exists) {
        this.logger.log(`Vacancy already exists in DB, skipping: ${url}`);
        continue;
      }

      const description = await this.parser.extractJobDescription(url);
      const analysis = await this.ai.analyzeJob(resume, description, filters);
      
      await this.db.saveVacancy({
        url,
        title: analysis?.vacancyTitle ?? "",
        description: analysis?.reasoning ?? "",
        domain: new URL(url).hostname,
        score: analysis?.score ?? 0,
        viewed: false
      })

      // Prevents rate limiting by the target job board
      await new Promise(res => setTimeout(res, this.requestDelay));
    }
  }
}