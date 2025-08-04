import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { PoliticianModule } from './politicians/politician.module';
import { StatementModule } from './statements/statement.module';
import { LoggerMiddleware } from './common/logger.middleware';

// Root module: sets up rate limiting, feature modules, and middleware
@Module({
  imports: [
    // rate-limit: max 20 reqs per 60s window
    ThrottlerModule.forRoot([{ name: 'global', limit: 20, ttl: 60_000 }]),

    AuthModule,        // auth endpoints & guards
    PoliticianModule,  // /politicians routes
    StatementModule,   // /statements routes
  ],
  providers: [
    PrismaService,     // single PrismaClient instance
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');  // log every incoming request
  }
}
