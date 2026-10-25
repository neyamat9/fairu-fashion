import { Injectable } from '@nestjs/common';
import * as os from 'os';

@Injectable()
export class AppService {
  getHello() {
    return {
      success: true,
      message: 'Fairu Fashion Server is running',
      version: '1.0.0',
      documentation: 'http://localhost:8000/docs',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      host: os.hostname(),
    };
  }
}
