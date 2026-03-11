import { Module } from '@nestjs/common';
import { FetcherService } from './fetcher.service';
import { ParserService } from '../parser/parser.service';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';

@Module({
  providers: [
    FetcherService,
    ParserService,
    AiService,
    StorageService
  ],
  exports: [FetcherService]
})
export class FetcherModule {}