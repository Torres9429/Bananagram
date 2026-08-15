import { Module } from '@nestjs/common';
import { AyrshareModule } from '../integrations/ayrshare/ayrshare.module';
import { PostSchedulerService } from './post-scheduler.service';

@Module({
  imports: [AyrshareModule],
  providers: [PostSchedulerService],
  // Exportado para que PostsModule pueda llamar scheduleTimer/cancelTimer
  // desde schedulePost()/cancelPost() (Fase timers-por-evento).
  exports: [PostSchedulerService],
})
export class SchedulerModule {}
