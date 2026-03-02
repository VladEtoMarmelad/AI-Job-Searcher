import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { FetcherModule } from '../fetcher/fetcher.module';
import { AiModule } from '../ai/ai.module';
import { NotifierModule } from '../notifier/notifier.module';
import { ParserModule } from '../parser/parser.module';
import { DbModule } from '../db/db.module';

@Module({
  providers: [JobsService],
  imports: [
    FetcherModule, 
    AiModule, 
    NotifierModule, 
    ParserModule, 
    DbModule
  ]
})
export class JobsModule {}
