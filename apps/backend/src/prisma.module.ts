import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Exports PrismaService as a singleton for the whole app.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
