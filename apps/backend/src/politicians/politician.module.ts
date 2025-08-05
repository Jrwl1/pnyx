import { Module } from '@nestjs/common';
import { PrismaModule }  from '../prisma.module';
import { AuthModule }    from '../auth/auth.module';
import { PoliticianController } from './politician.controller';
import { PoliticianService }    from './politician.service';

/**
 * PoliticianModule
 *
 * Encapsulates all politician-related functionality:
 * - CRUD endpoints (public and protected)
 * - Soft-delete & approval workflows
 * - Edit logging via EditLog entries
 */
@Module({
  imports: [
    PrismaModule,  // provides PrismaService for DB access
    AuthModule,    // provides JwtAuthGuard, RolesGuard, Roles decorator
  ],
  controllers: [PoliticianController],
  providers: [PoliticianService],
  exports: [PoliticianService],
})
export class PoliticianModule {}
