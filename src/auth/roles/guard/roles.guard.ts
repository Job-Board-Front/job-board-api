import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { Role } from '../roles.enum';
import { UserPayload } from 'src/auth/interfaces/user-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // If no specific roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    const { user }: { user: UserPayload } = context.switchToHttp().getRequest();

    // Check if user exists (AuthGuard should have handled this, but safety first)
    if (!user || !user.roles) {
      throw new ForbiddenException('Access Denied: No roles assigned');
    }

    // Admins bypass everything
    if (user.roles.includes(Role.ADMIN)) return true;

    // Check if user has ANY of the required roles
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Access Denied: Insufficient permissions');
    }
    return true;
  }
}
