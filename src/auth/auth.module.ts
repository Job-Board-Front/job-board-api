import { Module } from '@nestjs/common';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
// This module exists primarily to register Auth related logic if we expand later
@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
