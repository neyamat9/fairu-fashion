import { Module } from '@nestjs/common';
import { ShippingModule } from '../shipping/shipping.module';
import { SettingsController } from './settings.controller';

@Module({
  imports: [ShippingModule],
  controllers: [SettingsController],
})
export class CustomerSettingsModule {}
