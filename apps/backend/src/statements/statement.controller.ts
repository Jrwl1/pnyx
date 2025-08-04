import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { StatementService } from './statement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatementStatus } from '@prisma/client';
import { CreateStatementDto } from './dto/create-statement.dto';

@Controller('statements')
export class StatementController {
  constructor(private readonly statementService: StatementService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: CreateStatementDto,
    @Req() req: Request & { user?: { userId: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing credentials');
    }

    return this.statementService.create({
      politicianId: dto.politicianId,
      text: dto.text,
      sourceUrl: dto.sourceUrl,
      dateMade: new Date(dto.dateMade),
      submittedById: userId,
      status: StatementStatus.pending,
    });
  }
}
// This controller handles creating new political statements.