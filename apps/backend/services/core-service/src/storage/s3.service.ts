import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export type UploadableFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

// Same return shape the old CloudinaryService produced (public_id/secure_url,
// width/height/duration left undefined — S3 doesn't inspect media, unlike
// Cloudinary's automatic analysis) so posts.service.ts didn't need to change.
export type UploadResult = {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  duration?: number;
};

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') ?? 'us-east-1';
    this.bucket = this.configService.get<string>('S3_BUCKET_NAME') ?? '';
    // No credentials passed explicitly — the default provider chain picks up
    // the EC2 instance role in production, or AWS_ACCESS_KEY_ID/
    // AWS_SECRET_ACCESS_KEY / ~/.aws/credentials for local dev.
    this.client = new S3Client({ region: this.region });
  }

  async uploadFile(file: UploadableFile, folder: string = 'bananagram/posts'): Promise<UploadResult> {
    const key = `${folder}/${randomUUID()}-${file.originalname}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      public_id: key,
      secure_url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
    };
  }

  async deleteFile(publicId: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: publicId }));
  }
}
