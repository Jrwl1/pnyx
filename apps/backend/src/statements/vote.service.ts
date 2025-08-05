import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class VoteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert a vote, then auto-flag the statement if ≥30% down-votes.
   */
  async vote(userId: string, statementId: string, value: 1 | -1) {
    return this.prisma.$transaction(async prisma => {
      // 1) record or update the user’s vote
      await prisma.vote.upsert({
        where: {
          userId_statementId: { userId, statementId },
        },
        update: { value },
        create: { userId, statementId, value },
      });

      // 2) get total votes and net sum
      const agg = await prisma.vote.aggregate({
        where: { statementId },
        _sum: { value: true },
        _count: { value: true },
      });
      const totalVotes = agg._count.value;
      const netValue   = agg._sum.value ?? 0;
      // #down = (total - net) / 2
      const downVotes  = (totalVotes - netValue) / 2;

      // 3) if ≥30% down-votes, mark flagged
      if (downVotes / totalVotes >= 0.3) {
        await prisma.statement.update({
          where: { id: statementId },
          data: { flagged: true },
        });
      }

      // 4) return the vote record
      return prisma.vote.findUnique({
        where: { userId_statementId: { userId, statementId } },
      });
    });
  }
}
