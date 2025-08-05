import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole }      from '@prisma/client';

@Injectable()
export class PoliticianService {
  private readonly logger = new Logger(PoliticianService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new politician entry.
   */
  async create(data: {
    name: string;
    party: string;
    office: string;
    region: string;
    termStart: Date;
    termEnd: Date;
  }) {
    this.logger.log(`create(): ${data.name}`);
    return this.prisma.politician.create({ data });
  }

  /**
   * Update politician fields (mods/admins only).
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      party: string;
      office: string;
      region: string;
      termStart: Date;
      termEnd: Date;
    }>,
    actorId: string,
    actorRole: UserRole,
  ) {
    // only mods or admins may edit
    if (actorRole !== UserRole.mod && actorRole !== UserRole.admin) {
      throw new ForbiddenException('Insufficient permissions to edit');
    }

    const before = await this.prisma.politician.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Politician not found');

    this.logger.log(
      `update(): actor=${actorId} id=${id} → fields=${Object.keys(data).join(',')}`,
    );

    const after = await this.prisma.politician.update({
      where: { id },
      data,
    });

    await this.prisma.editLog.create({
      data: {
        entityType: 'Politician',
        entityId:   id,
        userId:     actorId,
        before,
        after,
      },
    });

    return after;
  }

  /**
   * List all politicians (excludes soft-deleted).
   */
  async findAll() {
    return this.prisma.politician.findMany({
      where: { isDeleted: false },
    });
  }

  /**
   * Get one politician by ID.
   */
  async findOne(id: string) {
    const p = await this.prisma.politician.findUnique({ where: { id } });
    if (!p || p.isDeleted) throw new NotFoundException('Politician not found');
    return p;
  }

  /**
   * Request soft-delete: mods flag, admins remove immediately.
   */
  async requestDelete(
    id: string,
    actorId: string,
    actorRole: UserRole,
  ) {
    const before = await this.prisma.politician.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Politician not found');

    let after;
    if (actorRole === UserRole.admin) {
      this.logger.log(`delete(): actor=${actorId} admin delete id=${id}`);
      after = await this.prisma.politician.update({
        where: { id },
        data: {
          isDeleted:     true,
          deletedBy:     actorId,
          deletedAt:     new Date(),
          pendingDelete: false,
        },
      });
    } else if (actorRole === UserRole.mod) {
      this.logger.log(`requestDelete(): actor=${actorId} mod request id=${id}`);
      after = await this.prisma.politician.update({
        where: { id },
        data: { pendingDelete: true },
      });
    } else {
      throw new ForbiddenException('Insufficient permissions to delete');
    }

    await this.prisma.editLog.create({
      data: {
        entityType: 'Politician',
        entityId:   id,
        userId:     actorId,
        before,
        after,
      },
    });

    return after;
  }

  /**
   * Admin approves a pending delete.
   */
  async approveDelete(id: string, actorId: string) {
    const before = await this.prisma.politician.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Politician not found');
    if (!before.pendingDelete) {
      throw new ForbiddenException('No pending delete to approve');
    }

    this.logger.log(`approveDelete(): actor=${actorId} approve id=${id}`);

    const after = await this.prisma.politician.update({
      where: { id },
      data: {
        isDeleted:     true,
        deletedBy:     actorId,
        deletedAt:     new Date(),
        pendingDelete: false,
      },
    });

    await this.prisma.editLog.create({
      data: {
        entityType: 'Politician',
        entityId:   id,
        userId:     actorId,
        before,
        after,
      },
    });

    return after;
  }
}
