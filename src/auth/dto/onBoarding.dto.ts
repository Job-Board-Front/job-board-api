import { IsEnum, IsNotEmpty } from 'class-validator';

export enum AccountType {
  USER = 'user',
  EMPLOYER = 'employer',
}

export class OnboardingDto {
  @IsEnum(AccountType)
  @IsNotEmpty()
  accountType: AccountType;
}
