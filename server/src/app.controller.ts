import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PingService } from './ping/ping.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly pingService: PingService,
  ) {}

  @Get('')
  getHello() {
    return this.appService.getHello();
  }

  @Get('ping/server')
  ping() {
    return this.pingService.ping();
  }

  @Get('ping/db')
  checkDb() {
    return this.pingService.checkDb();
  }
}
