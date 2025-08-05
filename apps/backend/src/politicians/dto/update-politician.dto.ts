import { IsOptional, IsString, IsDateString } from 'class-validator';

/**
 * Incoming payload for PATCH /politicians/:id
 */
export class UpdatePoliticianDto {
  @IsOptional() @IsString()     name?: string;
  @IsOptional() @IsString()     party?: string;
  @IsOptional() @IsString()     office?: string;
  @IsOptional() @IsString()     region?: string;
  @IsOptional() @IsDateString() termStart?: string; // ISO date
  @IsOptional() @IsDateString() termEnd?: string;   // ISO date
}
