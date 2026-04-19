import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdminReassignReferrerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  referrer_user_id?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string | null;
}
