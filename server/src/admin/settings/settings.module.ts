import { Module } from '@nestjs/common';
import { AdminSettingsController } from './settings.controller';

@Module({
  controllers: [AdminSettingsController],
})
export class AdminSettingsModule {}
