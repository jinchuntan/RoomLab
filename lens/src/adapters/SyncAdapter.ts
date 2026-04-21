import type { RoomClientEvent, RoomHydrationPayload, RoomLabError } from '../../../shared/src';

export interface SyncAdapter {
  connect(): Promise<void>;
  send(event: RoomClientEvent, actorId: string, clientVersion?: number): void;
  onStateHydrated(listener: (payload: RoomHydrationPayload) => void): void;
  onRejected(listener: (error: RoomLabError) => void): void;
  disconnect(): void;
}
