import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * PoliticianService
 * Fetches and manages politician data.
 */
@Injectable()
export class PoliticianService {
  private readonly logger = new Logger(PoliticianService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all politicians.
   * Logs the number of records returned.
   */
  async findAll() {
    const list = await this.prisma.politician.findMany();
    this.logger.log(`findAll(): returned ${list.length} politicians`);
    return list;
  }

  // TODO:
  // - findById(id: string)
  // - create/update/delete (admin-only)
  // - search by name/party
  // - filter by party, region, etc.
}
