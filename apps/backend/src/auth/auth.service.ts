import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';

/**
 * AuthService handles all user authentication and registration logic,
 * including secure password hashing, login validation, and JWT issuance.
 * 
 * - Follows best practices for credential security.
 * - Provides centralized audit-logging for user auth activity.
 */

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async register(email: string, password: string) {
    this.logger.log(`Registration attempt: ${email}`);
    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) {
      this.logger.warn(`Registration failed — user already exists: ${email}`);
      throw new UnauthorizedException('User already exists');
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hash }
    });
    this.logger.log(`User registered: ${user.id} (${user.email})`);
    return { id: user.id, email: user.email };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.warn(`Login failed — no user found: ${email}`);
      return null;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      this.logger.warn(`Login failed — invalid password for: ${email}`);
      return null;
    }
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      this.logger.warn(`Login failed for: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    this.logger.log(`Login success for: ${user.id} (${user.email})`);
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, role: user.role }
    };
  }
}
