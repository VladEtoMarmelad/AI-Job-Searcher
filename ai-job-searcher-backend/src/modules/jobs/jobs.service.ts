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

  constructor(
    private fetcher: FetcherService,
    private parser: ParserService,
    private ai: AiService,
    private notifier: NotifierService,
    private db: DbService
  ) {}

  // This method will execute ONCE when the application starts
  async onApplicationBootstrap() {
    try {
      this.logger.log('The application is launched. Initiating the first search cycle...');
      await this.runSearchCycle();
    } catch (error: unknown) {
      this.logger.error("error: ", error)
    }
  }

  // This method will run automatically every hour
  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledSearch() {
    this.logger.log('Launching a scheduled job search...');
    await this.runSearchCycle();
  }

  // Scheduled run once an hour
  async runSearchCycle() {
    const myResume = "Fullstack Developer, NestJS, TypeScript, React, 3 years exp...";
    const jobs: string[] = await this.fetcher.searchJobs("Node.js Developer");

    for (const url of jobs) {
      const description = await this.parser.extractJobDescription(url);
      const analysis = await this.ai.analyzeJob(myResume, description);
      await this.db.saveVacancy({
        url,
        description: analysis?.reason ?? "",
        score: analysis?.score ?? 0
      })

      if (analysis && analysis.score >= 8) {
        await this.notifier.sendAlert(url, analysis);
      }

      // A short pause to avoid being banned
      await new Promise(res => setTimeout(res, 2000));
    }
  }
}