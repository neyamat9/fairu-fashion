import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { Gender, Role, UserStatus } from '@prisma/client';

export { Gender, Role, UserStatus };

// Register Prisma enums for GraphQL
registerEnumType(Gender, {
  name: 'Gender',
  description: 'User gender',
});

registerEnumType(UserStatus, {
  name: 'UserStatus',
  description: 'Account status of the user',
});

registerEnumType(Role, {
  name: 'Role',
  description: 'Role of the user',
});

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field(() => String, { nullable: true })
  phone?: string | null;

  @Field()
  name: string;

  @Field(() => UserStatus)
  status: UserStatus;

  @Field(() => Role)
  role: Role;

  @Field()
  emailVerified: boolean;

  @Field()
  phoneVerified: boolean;

  @Field(() => Date, { nullable: true })
  dob?: Date | null;

  @Field(() => Gender, { nullable: true })
  gender?: Gender | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
