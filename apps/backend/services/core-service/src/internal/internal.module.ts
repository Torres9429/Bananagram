import { Module } from '@nestjs/common';
import { UserProfilesController } from './user-profiles.controller';

@Module({ controllers: [UserProfilesController] })
export class InternalModule {}
