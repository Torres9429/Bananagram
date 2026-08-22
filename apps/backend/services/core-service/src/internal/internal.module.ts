import { Module } from '@nestjs/common';
import { S3Module } from '../storage/s3.module';
import { UserProfilesController } from './user-profiles.controller';

@Module({ imports: [S3Module], controllers: [UserProfilesController] })
export class InternalModule {}
