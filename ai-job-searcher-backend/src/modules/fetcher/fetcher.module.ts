import { Module } from '@nestjs/common';
import { FetcherService } from './fetcher.service';

@Module({
  providers: [FetcherService]
})
export class FetcherModule {}