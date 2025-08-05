import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { StatementService } from './statement.service';
import { VoteService }      from './vote.service';
import { JwtAuthGuard }     from '../auth/jwt-auth.guard';
import { RolesGuard }       from '../auth/roles.guard';
import { Roles }            from '../auth/roles.decorator';
import { UserRole, StatementStatus } from '@prisma/client';
import { CreateStatementDto } from './dto/create-statement.dto';
import { CreateVoteDto }      from './dto/create-vote.dto';

@Controller('statements')
export class StatementController {
  constructor(
    private readonly statementService: StatementService,
    private readonly voteService: VoteService,
  ) {}

  // public: list all statements with vote counts
  @Get()
  async findAll() {
    return this.statementService.findAll();
  }

  // public: fetch a single statement by ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.statementService.findOne(id);
  }

  // any authenticated user can submit a new statement
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
      text:          dto.text,
      sourceUrl:     dto.sourceUrl,
      dateMade:      new Date(dto.dateMade),
      submittedById: userId,
      status:        StatementStatus.pending,
    });
  }

  // upvote (+1) or downvote (-1) a statement
  @UseGuards(JwtAuthGuard)
  @Post(':id/vote')
  async vote(
    @Param('id') statementId: string,
    @Body() dto: CreateVoteDto,
    @Req() req: Request & { user?: { userId: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Missing credentials');

    return this.voteService.vote(userId, statementId, dto.value as 1 | -1);
  }

  // only mods/admins can change statement status
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.mod, UserRole.admin)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: StatementStatus },
    @Req() req: Request & { user?: { userId: string; role: UserRole } },
  ) {
    const actorId = req.user?.userId!;
    return this.statementService.updateStatus(id, body.status, actorId);
  }

  // users can withdraw their own; mods request; admins delete immediately
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: Request & { user?: { userId: string; role: UserRole } },
  ) {
    const { userId, role } = req.user!;
    return this.statementService.requestDelete(id, userId, role);
  }

  // admin only: finalize any pending delete
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @Patch(':id/approve-delete')
  async approveDelete(
    @Param('id') id: string,
    @Req() req: Request & { user?: { userId: string } },
  ) {
    const actorId = req.user?.userId!;
    return this.statementService.approveDelete(id, actorId);
  }
}
