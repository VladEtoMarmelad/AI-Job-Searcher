import { Module } from '@nestjs/common';
import { FetcherService } from 'src/modules/fetcher/fetcher.service';
import { ParserService } from 'src/modules/parser/parser.service';
import { JobsService } from './jobs.service';
import { AiModule } from 'src/modules/ai/ai.module';
import { AiService } from 'src/modules/ai/ai.service';
import { NotifierService } from 'src/modules/notifier/notifier.service';
import { DbService } from '../db/db.service';

@Module({
  imports: [AiModule],
  providers: [JobsService, FetcherService, ParserService, AiService, NotifierService, DbService],
})
export class JobsModule {}
