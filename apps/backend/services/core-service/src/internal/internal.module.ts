import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UserProfilesController } from './user-profiles.controller';

@Module({ imports: [CloudinaryModule], controllers: [UserProfilesController] })
export class InternalModule {}
