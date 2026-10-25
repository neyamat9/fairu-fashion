import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from './user.type';

@ObjectType()
export class AuthPayload {
  @Field(() => ID)
  userId: string;

  @Field({ nullable: true })
  accessToken?: string;

  @Field({ nullable: true })
  refreshToken?: string;

  @Field(() => User, { nullable: true })
  user?: User;
}
