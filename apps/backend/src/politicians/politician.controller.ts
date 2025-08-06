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
import { PoliticianService }       from './politician.service';
import { JwtAuthGuard }            from '../auth/jwt-auth.guard';
import { RolesGuard }              from '../auth/roles.guard';
import { Roles }                   from '../auth/roles.decorator';
import { UserRole }                from '@prisma/client';
import { UpdatePoliticianDto }     from './dto/update-politician.dto';

@Controller('politicians')
export class PoliticianController {
  constructor(private readonly politicianService: PoliticianService) {}

  // public: list all non-deleted politicians
  @Get()
  async findAll() {
    return this.politicianService.findAll();
  }

  // public: fetch one politician by ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.politicianService.findOne(id);
  }

  // any logged-in user can submit a new politician
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() body: {
      name: string;
      party: string;
      office: string;
      region: string;
      termStart: string;
      termEnd: string;
    },
  ) {
    // no need to check actorId here since create is open
    return this.politicianService.create({
      name:      body.name,
      party:     body.party,
      office:    body.office,
      region:    body.region,
      termStart: new Date(body.termStart),
      termEnd:   new Date(body.termEnd),
    });
  }

  // mods/admins can edit politician details
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.mod, UserRole.admin)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePoliticianDto,
    @Req() req: Request & { user?: { userId: string; role: UserRole } },
  ) {
    const { userId, role } = req.user!;

    // build only the fields that were sent, converting dates
    const updates: Partial<{
      name: string;
      party: string;
      office: string;
      region: string;
      termStart: Date;
      termEnd: Date;
    }> = {};

    if (dto.name)      updates.name      = dto.name;
    if (dto.party)     updates.party     = dto.party;
    if (dto.office)    updates.office    = dto.office;
    if (dto.region)    updates.region    = dto.region;
    if (dto.termStart) updates.termStart = new Date(dto.termStart);
    if (dto.termEnd)   updates.termEnd   = new Date(dto.termEnd);

    return this.politicianService.update(id, updates, userId, role);
  }

  // mods request delete; admins delete immediately
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: Request & { user?: { userId: string; role: UserRole } },
  ) {
    const { userId, role } = req.user!;
    return this.politicianService.requestDelete(id, userId, role);
  }

  // admin only: finalize any pending delete
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @Patch(':id/approve-delete')
  async approveDelete(
    @Param('id') id: string,
    @Req() req: Request & { user?: { userId: string } },
  ) {
    const actorId = req.user!.userId;
    return this.politicianService.approveDelete(id, actorId);
  }
}
// This controller handles CRUD operations for politicians, allowing users to create, read, update, and delete politician records.
// It uses guards to restrict certain actions to authenticated users and roles (mods/admins).