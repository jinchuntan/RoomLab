import type { RoomErrorCode, RoomLabError } from '../types/domain';

export const createRoomError = (
  code: RoomErrorCode,
  message: string,
  recoverable = true,
  details?: Record<string, string | number | boolean | null>,
): RoomLabError => ({
  code,
  message,
  recoverable,
  ...(details ? { details } : {}),
});

export class RoomLabDomainError extends Error {
  public readonly issue: RoomLabError;

  public constructor(issue: RoomLabError) {
    super(issue.message);
    this.name = 'RoomLabDomainError';
    this.issue = issue;
  }
}
