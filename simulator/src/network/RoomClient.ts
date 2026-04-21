import type { RoomClientEvent, RoomHydrationPayload, RoomLabError, ScoreState } from '../../../shared/src';

export interface RoomClientListeners {
  onConnected?: (connectionId: string) => void;
  onRoomState?: (payload: RoomHydrationPayload) => void;
  onRejected?: (eventId: string, error: RoomLabError, payload?: RoomHydrationPayload) => void;
  onScoreUpdate?: (score: ScoreState, reason: string) => void;
  onDesync?: (serverVersion: number, reason: string) => void;
  onClosed?: () => void;
  onError?: (message: string) => void;
}

export interface RoomClient {
  setListeners(listeners: RoomClientListeners): void;
  connect(): Promise<void>;
  send(event: RoomClientEvent, actorId: string, clientVersion?: number): void | Promise<void>;
  disconnect(): void;
}
