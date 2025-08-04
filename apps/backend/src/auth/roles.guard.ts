import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.get<UserRole[]>('roles', ctx.getHandler());
    if (!required?.length) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user || !required.includes(user.role as UserRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
// This guard checks if the user has one of the required roles.