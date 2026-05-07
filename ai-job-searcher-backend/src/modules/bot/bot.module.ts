import { GrammyCoreModule } from '@grammyjs/nestjs';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotUpdate } from './bot.update';
import { DbService } from '../db/db.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    GrammyCoreModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const token = configService.get<string>('TG_BOT_TOKEN');
        if (!token) {
          throw new Error('TG_BOT_TOKEN environment variable is required');
        }
        return { token };
      },
      inject: [ConfigService],
    }),
    JobsModule,
  ],
  providers: [BotUpdate, DbService],
})
export class BotModule {}