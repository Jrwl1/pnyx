import { IsUUID, IsString, IsUrl, IsISO8601 } from 'class-validator';

/**
 * Incoming payload for POST /statements
 */
export class CreateStatementDto {
  @IsUUID()
  politicianId: string;

  @IsString()
  text: string;

  @IsUrl()
  sourceUrl: string;

  @IsISO8601()
  dateMade: string;   // ISO date string; we’ll convert to Date in controller
}
/**
 * This DTO validates the incoming data for creating a new political statement.
 * 
 * - politicianId: Must be a valid UUID
 * - text: Required string content of the statement
 * - sourceUrl: Must be a valid URL pointing to the source of the statement
 */