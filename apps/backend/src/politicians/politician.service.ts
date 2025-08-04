import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Handles all business logic for politicians, isolating Prisma queries
 * from controllers and keeping business rules in one place.
 */
@Injectable()
export class PoliticianService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all politicians in the database.
   */
  async findAll() {
    return this.prisma.politician.findMany();
  }
}
