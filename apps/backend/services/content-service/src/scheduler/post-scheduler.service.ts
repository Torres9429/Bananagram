import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '../../../../commons/prisma/client';
import { PostStatus } from '../../../../commons/types/post-status.enum';

@Injectable()
export class PostSchedulerService {
  private readonly logger = new Logger(PostSchedulerService.name);

  @Cron('* * * * *') // cada minuto
  async publishScheduledPosts() {
    const posts = await prisma.post.findMany({
      where: { status: PostStatus.PROGRAMADO, scheduledAt: { lte: new Date() }, deletedAt: null },
    });
    for (const post of posts) {
      await prisma.post.update({
        where: { id: post.id },
        data: { status: PostStatus.PUBLICADO, publishedAt: new Date() },
      });
      this.logger.log(`Post ${post.id} publicado automáticamente`);
    }
  }
}
