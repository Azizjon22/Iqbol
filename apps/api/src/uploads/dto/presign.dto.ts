import { IsIn } from 'class-validator';

export class PresignDto {
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
  contentType!: string;
}

export class StaffPresignDto extends PresignDto {
  @IsIn(['menus', 'inventory', 'workers', 'branding'])
  folder!: 'menus' | 'inventory' | 'workers' | 'branding';
}
