import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

type Claims = { sub: string; role: string };

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post()
  @RequirePermission('publicaciones', 'crear')
  create(@Body() dto: CreatePostDto, @CurrentUser() user: Claims) {
    return this.posts.createPost(dto, user);
  }

  @Post(':id/submit-for-review')
  @RequirePermission('publicaciones', 'editar')
  submitForReview(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims) {
    return this.posts.submitPostForReview(id, user);
  }
}