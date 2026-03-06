import { Module } from '@nestjs/common';
import { FetcherService } from './fetcher.service';
import { ParserService } from '../parser/parser.service';
import { AiService } from '../ai/ai.service';

@Module({
  providers: [
    FetcherService,
    ParserService,
    AiService
  ],
  exports: [FetcherService]
})
export class FetcherModule {}