import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PoliticianController } from './politician.controller';
import { PoliticianService } from './politician.service';
import { AuthModule } from './auth/auth.module';
import { StatementController } from './statement.controller';
import { StatementService } from './statement.service';

/**
 * The root module wires up the database layer and API controllers.
 */
@Module({
  imports: [AuthModule], // Importing AuthModule to use authentication features across the app
  controllers: [PoliticianController, StatementController],
  providers: [PrismaService, PoliticianService, StatementService],
})
export class AppModule {}
