import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class TraderMainAddressDto {
  trader_main_address_id: string;
  trader_id: string;
  network: string;
  asset_symbol: string;
  address: string;
  is_active: boolean;
}

export class TraderDto {
  trader_id: string;
  nickname: string;
  slug: string;
  display_name: string;
  description: string | null;
  profile_title: string;
  status: string;
  main_addresses?: TraderMainAddressDto[];
}

export class CreateTraderDto {
  @IsString()
  nickname: string;

  @IsString()
  slug: string;

  @IsString()
  display_name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  profile_title?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateTraderDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  display_name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  profile_title?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpsertTraderMainAddressDto {
  @IsString()
  network: string;

  @IsString()
  asset_symbol: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
