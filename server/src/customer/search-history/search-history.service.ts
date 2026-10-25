import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const SHOWN = 4;
const KEPT = 10;

const clean = (t: string) => t.replace(/\s+/g, ' ').trim();

@Injectable()
export class SearchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** The customer's latest searches, newest first. */
  async latest(userId: string, take = SHOWN) {
    return this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take,
      select: { id: true, term: true },
    });
  }

  /** Remember a search (or move it to the top if it is already there), keeping only the latest few. */
  async record(userId: string, rawTerm: string) {
    const term = clean(rawTerm);
    const normalized = term.toLowerCase();
    await this.prisma.searchHistory.upsert({
      where: { userId_normalized: { userId, normalized } },
      create: { userId, term, normalized },
      update: { term, updatedAt: new Date() },
    });
    const old = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      skip: KEPT,
      select: { id: true },
    });
    if (old.length) {
      await this.prisma.searchHistory.deleteMany({
        where: { id: { in: old.map((o) => o.id) } },
      });
    }
    return this.latest(userId);
  }

  async remove(userId: string, id: string) {
    await this.prisma.searchHistory.deleteMany({ where: { id, userId } });
    return this.latest(userId);
  }

  async clear(userId: string) {
    await this.prisma.searchHistory.deleteMany({ where: { userId } });
    return [];
  }
}
