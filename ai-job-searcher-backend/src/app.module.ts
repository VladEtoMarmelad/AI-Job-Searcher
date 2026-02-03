import { Module } from '@nestjs/common';
import { FetcherModule } from './modules/fetcher/fetcher.module';
import { JobsService } from './modules/jobs/jobs.service';
import { JobsModule } from './modules/jobs/jobs.module';
import { AiModule } from './modules/ai/ai.module';
import { NotifierModule } from './modules/notifier/notifier.module';
import { ParserModule } from './modules/parser/parser.module';
import { ScheduleModule } from '@nestjs/schedule';
import { FetcherService } from './modules/fetcher/fetcher.service';
import { AiService } from './modules/ai/ai.service';
import { NotifierService } from './modules/notifier/notifier.service';
import { ParserService } from './modules/parser/parser.service';
import { ConfigModule } from '@nestjs/config'
import { DbModule } from './modules/db/db.module';
import { DbService } from './modules/db/db.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), 
    FetcherModule, 
    JobsModule, 
    AiModule, 
    NotifierModule, 
    ParserModule, 
    DbModule
  ],
  providers: [
    FetcherService, 
    JobsService, 
    AiService, 
    NotifierService, 
    ParserService,
    DbService
  ]
})
export class AppModule {}