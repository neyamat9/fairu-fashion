import { Resolver, Query, ObjectType, Field, Float } from '@nestjs/graphql';
import { PingService } from './ping.service';

@ObjectType()
class PingResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field()
  timestamp: string;

  @Field(() => Float)
  uptime: number;

  @Field()
  hostname: string;
}

@ObjectType()
class DbCheckResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field()
  timestamp: string;
}

@Resolver()
export class PingResolver {
  constructor(private readonly pingService: PingService) {}

  @Query(() => PingResponse, {
    description: 'Simple ping query with server status',
  })
  ping(): PingResponse {
    return this.pingService.ping();
  }

  @Query(() => DbCheckResponse, { description: 'Check database connectivity' })
  async checkDb(): Promise<DbCheckResponse> {
    return this.pingService.checkDb();
  }
}
