import { Module } from '@nestjs/common';
import { FetcherService } from './fetcher.service';
import { ParserService } from '../parser/parser.service';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';
import { NotifierService } from '../notifier/notifier.service';

@Module({
  providers: [
    FetcherService,
    ParserService,
    AiService,
    StorageService,
    NotifierService
  ],
  exports: [FetcherService]
})
export class FetcherModule {}