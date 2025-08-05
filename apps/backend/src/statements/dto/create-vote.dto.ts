import { IsIn } from 'class-validator';

/**
 * Payload for voting on a statement.
 * value: +1 = upvote, -1 = downvote
 */
export class CreateVoteDto {
  @IsIn([1, -1])
  value: number;
}
