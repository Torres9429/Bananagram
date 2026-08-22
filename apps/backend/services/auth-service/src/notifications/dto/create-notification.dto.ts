import { IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty() @IsUUID() userId: string;

  // Identificador de tipo abierto a propósito (mismo criterio que
  // Notification.type en el schema, string libre) — ej.
  // "campaign_pending_cm_approval", "campaign_accepted", "campaign_rejected".
  @ApiProperty() @IsString() @MinLength(1) type: string;

  @ApiPropertyOptional() @IsOptional() @IsObject() payload?: Record<string, unknown>;
}
