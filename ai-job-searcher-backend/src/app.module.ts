import { Module } from '@nestjs/common';
import { JobsModule } from './modules/jobs/jobs.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { BotModule } from './modules/bot/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: ['.env', '.env.jobsearch']
    }),
    ScheduleModule.forRoot(), 
    JobsModule,
    ...(process.env.TG_BOT_ENABLED === 'true' ? [BotModule] : []),
  ]
})
export class AppModule {}