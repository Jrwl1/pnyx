import { Module } from '@nestjs/common';
import { PoliticianController } from './politician.controller';
import { PoliticianService } from './politician.service';

/**
 * PoliticianModule
 *
 * Encapsulates all politician-related functionality:
 * - REST endpoints via PoliticianController
 * - Domain logic via PoliticianService
 *
 * This keeps our root AppModule clean and makes the feature
 * self-contained, testable, and easily maintainable.
 */
@Module({
  controllers: [PoliticianController],
  providers: [PoliticianService],
  exports: [PoliticianService], // exported in case other modules need it
})
export class PoliticianModule {}
