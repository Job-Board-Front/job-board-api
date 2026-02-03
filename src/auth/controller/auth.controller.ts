import {
  Body,
  ConflictException,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { FirebaseAuthGuard } from 'src/common/guards/auth.guard';
import { OnboardingDto, AccountType } from '../dto/onBoarding.dto';
import type { UserPayload } from '../interfaces/user-payload.interface';
import { Role } from '../roles/roles.enum';
import { AuthService } from '../service/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('onboard')
  @UseGuards(FirebaseAuthGuard)
  async onboardUser(
    @CurrentUser() user: UserPayload,
    @Body() body: OnboardingDto,
  ) {
    // 1. Security Check: Prevent changing roles if already assigned
    // If the user already has a specific role (other than basic 'user'), block them.
    const hasExistingRole = user.roles.some(
      (r) => r === Role.ADMIN || r === Role.EMPLOYER,
    );
    if (hasExistingRole) {
      throw new ConflictException('Account setup already completed.');
    }

    // 2. Map AccountType to Role
    const roleToAssign =
      body.accountType === AccountType.EMPLOYER ? Role.EMPLOYER : Role.USER;

    // 3. Assign Role via Admin SDK
    await this.authService.assignRole(user.uid, roleToAssign);

    return {
      message: 'Account setup complete',
      role: roleToAssign,
    };
  }
}
