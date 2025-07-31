import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
/**
 * PrismaService
 * - Provides a singleton PrismaClient instance to the entire NestJS application.
 * - Ensures proper lifecycle management
 * - Enables dependency injection for safe, scalable, and testable DB access across modules.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * Lifecycle hook: Called once the module has been initialized.
   * Establishes connection to the Postgres database.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Lifecycle hook: Called before the module is destroyed.
   * Closes the PrismaClient connection to prevent hanging processes and ensure clean shutdown.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
