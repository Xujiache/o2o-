import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerProfile } from '../../database/entities';

import { UserProfileService } from './user-profile.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerProfile])],
  providers: [UserProfileService],
  exports: [UserProfileService],
})
export class UserProfileModule {}
