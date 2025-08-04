import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StatementStatus } from '@prisma/client';

/**
 * StatementService
 * Business logic and DB access for political statements.
 * Handles creation, retrieval, and potential future moderation of statements/promises.
 */
@Injectable()
export class StatementService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new political statement/promise record in the database.
   * @param data - Statement payload (must pass DTO/controller validation)
   */
  async create(data: {
    politicianId: string;
    text: string;
    sourceUrl: string;
    dateMade: Date;
    submittedById: string;
    status: StatementStatus;
  }) {
    // Business rules/checks could be added here later (e.g. moderation, duplicate check)
    return this.prisma.statement.create({ data });
  }

  // LATER: 
  // - findAll() for listing
  // - findById()
  // - updateStatus() (for moderation)
  // - delete() (admin only)
}
