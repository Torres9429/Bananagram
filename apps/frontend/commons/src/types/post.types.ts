export type PostStatus = 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'programado' | 'publicado';
export interface Post {
  id: string; content: string; status: PostStatus;
  scheduledAt?: string; publishedAt?: string;
  brandProfileId: string; campaignId?: string; createdBy: string;
}
export interface PostStatusHistory {
  id: number; postId: string; fromStatus?: PostStatus; toStatus: PostStatus;
  changedBy: string; comment?: string; createdAt: string;
}
