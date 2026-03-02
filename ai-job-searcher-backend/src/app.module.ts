import { Module } from '@nestjs/common';
import { JobsModule } from './modules/jobs/jobs.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: ['.env', '.env.jobsearch']
    }),
    ScheduleModule.forRoot(), 
    JobsModule
  ]
})
export class AppModule {}