import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StatementStatus, UserRole } from '@prisma/client';

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
      `create(): user=${data.submittedById} → politician=${data.politicianId}`,
    );
    return this.prisma.statement.create({ data });
  }

  /**
   * Change a statement's status and record who made the change.
   */
  async updateStatus(
    id: string,
    status: StatementStatus,
    actorId: string,
  ) {
    // fetch current version
    const before = await this.prisma.statement.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Statement not found');

    this.logger.log(
      `updateStatus(): actor=${actorId} id=${id} → status=${status}`,
    );

    // apply the update
    const after = await this.prisma.statement.update({
      where: { id },
      data: { status },
    });

    // log the edit
    await this.prisma.editLog.create({
      data: {
        entityType: 'Statement',
        entityId:   id,
        userId:     actorId,
        before,
        after,
      },
    });

    return after;
  }

  /**
   * List all statements with vote counts.
   */
  async findAll() {
    const list = await this.prisma.statement.findMany();
    return Promise.all(
      list.map(async s => {
        const upvotes = await this.prisma.vote.count({
          where: { statementId: s.id, value: 1 },
        });
        const downvotes = await this.prisma.vote.count({
          where: { statementId: s.id, value: -1 },
        });
        return { ...s, upvotes, downvotes };
      }),
    );
  }

  /**
   * Get a single statement by ID, include vote counts.
   */
  async findOne(id: string) {
    const s = await this.prisma.statement.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Statement not found');

    const upvotes = await this.prisma.vote.count({
      where: { statementId: id, value: 1 },
    });
    const downvotes = await this.prisma.vote.count({
      where: { statementId: id, value: -1 },
    });

    return { ...s, upvotes, downvotes };
  }

  /**
   * Soft-delete or mark for delete depending on actor’s role.
   */
  async requestDelete(
    id: string,
    actorId: string,
    actorRole: UserRole,
  ) {
    const before = await this.prisma.statement.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Statement not found');

    let after;
    if (actorRole === UserRole.admin || before.submittedById === actorId) {
      // admins or owners delete immediately
      this.logger.log(`delete(): actor=${actorId} admin/owner delete id=${id}`);
      after = await this.prisma.statement.update({
        where: { id },
        data: {
          isDeleted:     true,
          deletedBy:     actorId,
          deletedAt:     new Date(),
          pendingDelete: false,
        },
      });
    } else if (actorRole === UserRole.mod) {
      // mods flag for admin approval
      this.logger.log(`requestDelete(): actor=${actorId} mod request id=${id}`);
      after = await this.prisma.statement.update({
        where: { id },
        data: { pendingDelete: true },
      });
    } else {
      throw new ForbiddenException('Insufficient permissions to delete');
    }

    // log the delete action
    await this.prisma.editLog.create({
      data: {
        entityType: 'Statement',
        entityId:   id,
        userId:     actorId,
        before,
        after,
      },
    });

    return after;
  }

  /**
   * Admin approval of a pending delete.
   */
  async approveDelete(id: string, actorId: string) {
    const before = await this.prisma.statement.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Statement not found');
    if (!before.pendingDelete) {
      throw new ForbiddenException('No pending delete to approve');
    }

    this.logger.log(`approveDelete(): actor=${actorId} approve id=${id}`);

    const after = await this.prisma.statement.update({
      where: { id },
      data: {
        isDeleted:     true,
        deletedBy:     actorId,
        deletedAt:     new Date(),
        pendingDelete: false,
      },
    });

    // log the approval
    await this.prisma.editLog.create({
      data: {
        entityType: 'Statement',
        entityId:   id,
        userId:     actorId,
        before,
        after,
      },
    });

    return after;
  }
}
