import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule }      from '@nestjs/jwt';
import { AuthService }    from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy }    from './jwt-strategy';
import { PrismaModule } from '../prisma.module';
import { RolesGuard }     from './roles.guard';

@Module({
  imports: [
    PrismaModule,  // make PrismaService available for AuthService
    // Make Passport’s 'jwt' strategy available
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Configure JWT module
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],  // register your strategy here
  exports: [AuthService],                 // if other modules need to call AuthService
})
export class AuthModule {}
