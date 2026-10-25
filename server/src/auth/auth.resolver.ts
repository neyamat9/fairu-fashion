import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { User } from './types/user.type';
import { CreateUserInput } from './dto/create-user.input';
import { AuthPayload } from './types/auth-payload.type';
import { SignInInput } from './dto/sign-in.input';
import { RefreshTokenInput } from './dto/refresh-token.input';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@Resolver(() => User)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => User, { description: 'Register a new user account' })
  async registerUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
  ): Promise<User> {
    return this.authService.registerUser(createUserInput);
  }

  @Mutation(() => AuthPayload)
  async signIn(@Args('input') input: SignInInput) {
    const user = await this.authService.validateLocalUser(input);
    return await this.authService.login(user);
  }

  @Mutation(() => AuthPayload)
  async refreshTokens(@Args('input') input: RefreshTokenInput) {
    const tokens = await this.authService.refreshTokens(
      input.userId,
      input.refreshToken,
    );
    return {
      userId: input.userId,
      ...tokens,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean)
  async logout(@CurrentUser() user: User) {
    return await this.authService.logout(user.id);
  }
}
