import { Module } from '@nestjs/common';
import { NotificationsClient } from './notifications-client.service';

@Module({
  providers: [NotificationsClient],
  exports: [NotificationsClient],
})
export class NotificationsClientModule {}
