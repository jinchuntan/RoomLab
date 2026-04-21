import {
  createHydrationPayload,
  createRoomError,
  createRoomState,
  getLessonDefinition,
  reduceRoomEvent,
  type ClientEnvelope,
  type RoomClientEvent,
  type RoomServerMessage,
  type RoomState,
} from '../../../shared/src';
import type { RoomClient, RoomClientListeners } from './RoomClient';

const ROOM_KEY_PREFIX = 'roomlab:broadcast:room:';
const ROOM_SIGNAL_KEY = 'roomlab:broadcast:signal';
const CHANNEL_NAME = 'roomlab:broadcast:channel';
const ROOM_ID_PATTERN = /^[a-z0-9-]{3,16}$/i;

type BroadcastWireMessage =
  | RoomServerMessage
  | {
      type: 'ROOM_STATE_FALLBACK';
      payload: {
        roomId: string;
      };
    };

type NavigatorWithLocks = Navigator & {
  locks?: {
    request: <T>(name: string, callback: () => Promise<T> | T) => Promise<T>;
  };
};

const createEventId = (): string => `evt_${Math.random().toString(36).slice(2, 10)}`;

const createConnectionId = (): string => `browser_${Math.random().toString(36).slice(2, 10)}`;

const getRoomStorageKey = (roomId: string): string => `${ROOM_KEY_PREFIX}${roomId}`;

const parseRoomState = (raw: string | null): RoomState | null => {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as RoomState;
  } catch {
    return null;
  }
};

const readRoomState = (roomId: string): RoomState | null => parseRoomState(window.localStorage.getItem(getRoomStorageKey(roomId)));

const writeRoomState = (roomState: RoomState): void => {
  window.localStorage.setItem(getRoomStorageKey(roomState.roomId), JSON.stringify(roomState));
};

const notifyRoomChanged = (roomId: string): void => {
  window.localStorage.setItem(
    ROOM_SIGNAL_KEY,
    JSON.stringify({
      roomId,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).slice(2, 8),
    }),
  );
};

export class BroadcastRoomClient implements RoomClient {
  private listeners: RoomClientListeners = {};

  private connectionId = createConnectionId();

  private channel: BroadcastChannel | null = null;

  private currentRoomId: string | null = null;

  private currentActorId: string | null = null;

  private readonly storageListener = (event: StorageEvent): void => {
    if (event.key !== ROOM_SIGNAL_KEY || !event.newValue) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue) as { roomId?: string };
      if (!payload.roomId) {
        return;
      }

      const roomState = readRoomState(payload.roomId);
      if (!roomState) {
        return;
      }

      this.listeners.onRoomState?.(createHydrationPayload(roomState, 'event'));
    } catch {
      this.listeners.onError?.('Failed to read a cross-tab room update.');
    }
  };

  public setListeners(listeners: RoomClientListeners): void {
    this.listeners = listeners;
  }

  public async connect(): Promise<void> {
    if (typeof window.BroadcastChannel !== 'undefined' && !this.channel) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<BroadcastWireMessage>) => {
        this.handleWireMessage(event.data);
      };
    }

    window.addEventListener('storage', this.storageListener);
    this.listeners.onConnected?.(this.connectionId);
  }

  public send(event: RoomClientEvent, actorId: string, clientVersion?: number): void {
    this.currentActorId = actorId;
    this.currentRoomId = event.payload.roomId;

    const envelope: ClientEnvelope = {
      event,
      actorId,
      eventId: createEventId(),
      timestamp: Date.now(),
      ...(clientVersion !== undefined ? { clientVersion } : {}),
    };

    if (event.type === 'CREATE_ROOM') {
      this.handleCreateRoom(envelope as ClientEnvelope<Extract<RoomClientEvent, { type: 'CREATE_ROOM' }>>);
      return;
    }

    if (event.type === 'REQUEST_STATE_SYNC') {
      const roomState = readRoomState(event.payload.roomId);
      if (!roomState) {
        this.listeners.onRejected?.(
          envelope.eventId,
          createRoomError('ROOM_NOT_FOUND', `Room ${event.payload.roomId} does not exist.`, true),
        );
        return;
      }

      this.listeners.onRoomState?.(
        createHydrationPayload(roomState, event.payload.reason === 'desync' ? 'desync' : 'hydrate'),
      );
      return;
    }

    const reducibleEvent = event as Exclude<RoomClientEvent, { type: 'CREATE_ROOM' | 'REQUEST_STATE_SYNC' }>;

    void this.withRoomLock(event.payload.roomId, () => {
      const roomState = readRoomState(event.payload.roomId);
      if (!roomState) {
        this.listeners.onRejected?.(
          envelope.eventId,
          createRoomError('ROOM_NOT_FOUND', `Room ${event.payload.roomId} does not exist.`, true),
        );
        return;
      }

      const lesson = getLessonDefinition(roomState.lessonId);
      const result = reduceRoomEvent(
        roomState,
        {
          ...reducibleEvent,
          actorId: envelope.actorId,
          eventId: envelope.eventId,
          timestamp: envelope.timestamp,
          ...(envelope.clientVersion !== undefined ? { clientVersion: envelope.clientVersion } : {}),
        },
        lesson,
      );

      if (!result.accepted || result.error) {
        this.listeners.onRejected?.(
          envelope.eventId,
          result.error ?? createRoomError('INVALID_STATE_TRANSITION', 'Room event rejected.', true),
          createHydrationPayload(roomState, 'desync'),
        );
        return;
      }

      writeRoomState(result.state);
      this.publishMessage({
        type: 'ROOM_STATE',
        payload: createHydrationPayload(result.state, 'event'),
      });

      if (result.scoreChanged) {
        this.publishMessage({
          type: 'SCORE_UPDATE',
          payload: {
            score: result.state.score,
            reason: result.scoreReason ?? 'Score updated',
          },
        });
      }
    });
  }

  public disconnect(): void {
    if (this.currentRoomId && this.currentActorId) {
      const roomState = readRoomState(this.currentRoomId);
      const player = roomState?.participants[this.currentActorId];
      if (roomState && player && player.presence.connectionStatus !== 'disconnected') {
        const lesson = getLessonDefinition(roomState.lessonId);
        const result = reduceRoomEvent(
          roomState,
          {
            type: 'PLAYER_LEFT',
            payload: {
              roomId: this.currentRoomId,
              playerId: this.currentActorId,
              reason: 'leave',
            },
            actorId: this.currentActorId,
            eventId: createEventId(),
            timestamp: Date.now(),
          },
          lesson,
        );

        if (result.accepted) {
          writeRoomState(result.state);
          this.publishMessage({
            type: 'ROOM_STATE',
            payload: createHydrationPayload(result.state, 'event'),
          });
        }
      }
    }

    window.removeEventListener('storage', this.storageListener);
    this.channel?.close();
    this.channel = null;
    this.listeners.onClosed?.();
  }

  private handleCreateRoom(
    envelope: ClientEnvelope<Extract<RoomClientEvent, { type: 'CREATE_ROOM' }>>,
  ): void {
    const { roomId, lessonId, playerId, displayName } = envelope.event.payload;
    if (!ROOM_ID_PATTERN.test(roomId)) {
      this.listeners.onRejected?.(
        envelope.eventId,
        createRoomError('INVALID_ROOM_ID', 'Room id must be 3 to 16 letters, numbers, or hyphens.', true),
      );
      return;
    }

    void this.withRoomLock(roomId, () => {
      if (readRoomState(roomId)) {
        this.listeners.onRejected?.(
          envelope.eventId,
          createRoomError('DUPLICATE_ROOM', `Room ${roomId} already exists.`, true),
        );
        return;
      }

      const lesson = getLessonDefinition(lessonId);
      const state = createRoomState({
        roomId,
        lesson,
        hostId: playerId,
        displayName,
        now: envelope.timestamp,
      });

      writeRoomState(state);
      this.publishMessage({
        type: 'ROOM_STATE',
        payload: createHydrationPayload(state, 'create'),
      });
    });
  }

  private publishMessage(message: RoomServerMessage): void {
    if (message.type === 'ROOM_STATE' && !this.channel) {
      notifyRoomChanged(message.payload.roomId);
    }

    this.handleWireMessage(message);
    this.channel?.postMessage(message);
  }

  private handleWireMessage(message: BroadcastWireMessage): void {
    if (message.type === 'ROOM_STATE_FALLBACK') {
      const roomState = readRoomState(message.payload.roomId);
      if (roomState) {
        this.listeners.onRoomState?.(createHydrationPayload(roomState, 'event'));
      }
      return;
    }

    switch (message.type) {
      case 'CONNECTED':
        this.listeners.onConnected?.(message.payload.connectionId);
        return;
      case 'ROOM_STATE':
        this.listeners.onRoomState?.(message.payload);
        return;
      case 'EVENT_REJECTED':
        this.listeners.onRejected?.(message.payload.eventId, message.payload.error, message.payload.state);
        return;
      case 'SCORE_UPDATE':
        this.listeners.onScoreUpdate?.(message.payload.score, message.payload.reason);
        return;
      case 'DESYNC_NOTICE':
        this.listeners.onDesync?.(message.payload.serverVersion, message.payload.reason);
        return;
      case 'ROOM_CLOSED':
        this.listeners.onError?.(message.payload.reason);
        return;
      case 'SESSION_LOG':
        return;
    }
  }

  private async withRoomLock(roomId: string, callback: () => void | Promise<void>): Promise<void> {
    const navigatorWithLocks = navigator as NavigatorWithLocks;
    if (navigatorWithLocks.locks) {
      await navigatorWithLocks.locks.request(`roomlab-lock:${roomId}`, callback);
      return;
    }

    await callback();
  }
}
