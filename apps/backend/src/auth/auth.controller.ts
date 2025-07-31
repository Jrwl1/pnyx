import { Controller, Post, Body, Request, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register a new user.
   * - Validates input using RegisterDto (email, password).
   * - Returns minimal user info (never password).
   */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  /**
   * Login an existing user.
   * - Validates input using LoginDto (email, password).
   * - Returns JWT and user info.
   */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /**
   * Get the current authenticated user's profile.
   * - Requires valid JWT.
   * - Returns the JWT payload (user id, email, role).
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }
}
// This controller handles user authentication, including registration, login, and fetching the current user's profile.