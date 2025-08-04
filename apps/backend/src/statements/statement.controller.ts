import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { StatementService } from './statement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, StatementStatus } from '@prisma/client';
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
    if (!userId) throw new UnauthorizedException('Missing credentials');

    return this.statementService.create({
      politicianId: dto.politicianId,
      text: dto.text,
      sourceUrl: dto.sourceUrl,
      dateMade: new Date(dto.dateMade),
      submittedById: userId,
      status: StatementStatus.pending,
    });
  }

  // only mods & admins can change statement status
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.mod, UserRole.admin)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: StatementStatus },
  ) {
    return this.statementService.updateStatus(id, body.status);
  }
}
