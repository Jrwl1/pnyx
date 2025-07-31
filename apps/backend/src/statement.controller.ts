import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { StatementService } from './statement.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { StatementStatus } from '@prisma/client';

@Controller('statements')
export class StatementController {
  constructor(private statementService: StatementService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() body: { politicianId: string; text: string; sourceUrl: string; dateMade: string },
    @Request() req
  ) {
    return this.statementService.create({
      ...body,
      dateMade: new Date(body.dateMade),
      submittedById: req.user.userId,
      status: StatementStatus.pending, // Use enum here!
    });
  }
}
