import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { StatementController } from './statement.controller';
import { StatementService } from './statement.service';
import { AuthModule } from '../auth/auth.module';
import { VoteService } from './vote.service';

/**
 * StatementModule
 * 
 * Encapsulates all statement-related functionality:
 * - Routes for submitting and listing political statements via StatementController
 * - Business logic in StatementService
 * 
 * Imports AuthModule so JWT-based guards can protect these endpoints.
 */
@Module({
  imports: [PrismaModule,AuthModule],
  controllers: [StatementController],
  providers: [
    StatementService,
    VoteService,
  ],
  exports: [StatementService],
})
export class StatementModule {}
