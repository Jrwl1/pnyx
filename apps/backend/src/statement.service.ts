import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StatementStatus } from '@prisma/client';

@Injectable()
export class StatementService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    politicianId: string;
    text: string;
    sourceUrl: string;
    dateMade: Date;
    submittedById: string;
    status: StatementStatus;
  }) {
    return this.prisma.statement.create({ data });
  }
}
