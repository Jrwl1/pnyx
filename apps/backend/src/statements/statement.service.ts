import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StatementStatus } from '@prisma/client';

@Injectable()
export class StatementService {
  private readonly logger = new Logger(StatementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Save a new statement in the database.
   */
  async create(data: {
    politicianId: string;
    text: string;
    sourceUrl: string;
    dateMade: Date;
    submittedById: string;
    status: StatementStatus;
  }) {
    this.logger.log(
      `create(): user=${data.submittedById} → politician=${data.politicianId}`
    );
    return this.prisma.statement.create({ data });
  }

  /**
   * Update an existing statement's status.
   * Only mods/admins should reach this via the controller.
   */
  async updateStatus(id: string, status: StatementStatus) {
    this.logger.log(`updateStatus(): id=${id} → status=${status}`);
    return this.prisma.statement.update({
      where: { id },
      data: { status },
    });
  }
}
