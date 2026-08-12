import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { InternalNotificationsController } from './internal-notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsStreamService } from './notifications-stream.service';

@Module({
  controllers: [NotificationsController, InternalNotificationsController],
  providers: [NotificationsService, NotificationsStreamService],
})
export class NotificationsModule {}
