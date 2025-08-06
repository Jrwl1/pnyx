// apps/backend/src/app.module.ts

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { PoliticianModule } from './politicians/politician.module';
import { StatementModule } from './statements/statement.module';
import { LoggerMiddleware } from './common/logger.middleware';
import { HealthController } from './health.controller';

// Root module: sets up rate limiting, feature modules, and middleware
@Module({
  imports: [
    PrismaModule, // make PrismaService available everywhere
    // rate-limit: max 20 reqs per 60,000ms window
    ThrottlerModule.forRoot([
      { name: 'global', limit: 20, ttl: 60_000 },
    ]),
    AuthModule,
    PoliticianModule,
    StatementModule,
  ],
  controllers: [
    HealthController, // expose GET /health
  ],
  providers: [], // PrismaService comes from PrismaModule now
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*'); // log every incoming request
  }
}
