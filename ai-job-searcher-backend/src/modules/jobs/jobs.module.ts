import { Module } from '@nestjs/common';
import { AiModule } from 'src/modules/ai/ai.module';

@Module({
  imports: [AiModule],
  providers: []
})
export class JobsModule {}
