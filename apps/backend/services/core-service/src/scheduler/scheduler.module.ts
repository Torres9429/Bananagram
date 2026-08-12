import { Module } from '@nestjs/common';
import { AyrshareModule } from '../integrations/ayrshare/ayrshare.module';
import { PostSchedulerService } from './post-scheduler.service';

@Module({
  imports: [AyrshareModule],
  providers: [PostSchedulerService],
})
export class SchedulerModule {}
