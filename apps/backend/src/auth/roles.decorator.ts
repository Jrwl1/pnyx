import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

// attach required roles to route handlers
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
