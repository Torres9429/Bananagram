import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { RejectPostDto } from './dto/reject-post.dto';
import { SchedulePostDto } from './dto/schedule-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ForwardToDesignerDto } from './dto/forward-to-designer.dto';
import { PostsService } from './posts.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadableFile } from '../cloudinary/cloudinary.service';
import { PostStatus } from '../types/post-status.enum';

type Claims = { sub: string; roles: string[] };

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @RequirePermission('publicaciones', 'ver')
  list(
    @CurrentUser() user: Claims,
    @Query('campaignId') campaignId?: string,
    @Query('brandId') brandId?: string,
    @Query('status') status?: PostStatus,
  ) {
    return this.posts.listPosts({ campaignId, brandId, status }, user);
  }

  @Get(':id')
  @RequirePermission('publicaciones', 'ver')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims) {
    return this.posts.getPost(id, user);
  }

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

  @Post(':id/approve')
  @RequirePermission('publicaciones', 'aprobar')
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims) {
    return this.posts.approvePost(id, user);
  }

  @Post(':id/reject')
  @RequirePermission('publicaciones', 'rechazar')
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectPostDto, @CurrentUser() user: Claims) {
    return this.posts.rejectPost(id, dto, user);
  }

  @Post(':id/client-reject')
  @RequirePermission('publicaciones', 'rechazar')
  clientReject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectPostDto, @CurrentUser() user: Claims) {
    return this.posts.clientRejectPost(id, dto, user);
  }

  @Post(':id/forward-to-designer')
  @RequirePermission('publicaciones', 'editar')
  forwardToDesigner(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ForwardToDesignerDto, @CurrentUser() user: Claims) {
    return this.posts.forwardToDesigner(id, dto, user);
  }

  @Patch(':id')
  @RequirePermission('publicaciones', 'editar')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePostDto, @CurrentUser() user: Claims) {
    return this.posts.updatePost(id, dto, user);
  }

  @Post(':id/schedule')
  @RequirePermission('publicaciones', 'editar')
  schedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SchedulePostDto, @CurrentUser() user: Claims) {
    return this.posts.schedulePost(id, dto, user);
  }

  @Post(':id/cancel')
  @RequirePermission('publicaciones', 'editar')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims) {
    return this.posts.cancelPost(id, user);
  }

  @Post(':id/media')
  @ApiConsumes('multipart/form-data')
  @RequirePermission('publicaciones', 'editar')
  @UseInterceptors(FilesInterceptor('files', 20, { storage: memoryStorage() }))
  uploadMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: UploadableFile[],
    @CurrentUser() user: Claims,
  ) {
    return this.posts.attachMediaToPost(id, files, user);
  }
}