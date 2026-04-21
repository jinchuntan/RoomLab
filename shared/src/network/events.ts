import type {
  LessonId,
  PlayerId,
  RoomId,
  SharedTransform,
  SlotId,
} from '../types/primitives';
import type { DiagnosticEvent, RoomHydrationPayload, RoomLabError, RoomState, ScoreState, SpatialConfidence } from '../types/domain';

export interface CreateRoomPayload {
  roomId: RoomId;
  lessonId: LessonId;
  playerId: PlayerId;
  displayName: string;
}

export interface JoinRoomPayload {
  roomId: RoomId;
  lessonId: LessonId;
  playerId: PlayerId;
  displayName: string;
}

export interface PlayerReadyPayload {
  roomId: RoomId;
  ready: boolean;
}

export interface SetSharedOriginPayload {
  roomId: RoomId;
  transform: SharedTransform;
}

export interface CoLocationConfirmedPayload {
  roomId: RoomId;
  localCalibrationOffset: SharedTransform;
  confidence: SpatialConfidence;
}

export interface SpawnLessonPayload {
  roomId: RoomId;
}

export interface PickupAtomPayload {
  roomId: RoomId;
  objectId: string;
}

export interface MoveAtomPayload {
  roomId: RoomId;
  objectId: string;
  transform: SharedTransform;
}

export interface PlaceAtomPayload {
  roomId: RoomId;
  objectId: string;
  slotId: SlotId;
}

export interface ReleaseAtomPayload {
  roomId: RoomId;
  objectId: string;
}

export interface QuizStartPayload {
  roomId: RoomId;
}

export interface QuizSubmitPayload {
  roomId: RoomId;
  questionId: string;
  optionId: string;
}

export interface PlayerLeftPayload {
  roomId: RoomId;
  playerId: PlayerId;
  reason: 'disconnect' | 'leave';
}

export interface RoomResetPayload {
  roomId: RoomId;
  preserveAlignment?: boolean;
}

export interface HeartbeatPayload {
  roomId: RoomId;
}

export interface RequestStateSyncPayload {
  roomId: RoomId;
  reason: 'manual' | 'desync' | 'late-join';
}

export type RoomClientEvent =
  | { type: 'CREATE_ROOM'; payload: CreateRoomPayload }
  | { type: 'JOIN_ROOM'; payload: JoinRoomPayload }
  | { type: 'PLAYER_READY'; payload: PlayerReadyPayload }
  | { type: 'SET_SHARED_ORIGIN'; payload: SetSharedOriginPayload }
  | { type: 'COLOCATION_CONFIRMED'; payload: CoLocationConfirmedPayload }
  | { type: 'SPAWN_LESSON'; payload: SpawnLessonPayload }
  | { type: 'PICKUP_ATOM'; payload: PickupAtomPayload }
  | { type: 'MOVE_ATOM'; payload: MoveAtomPayload }
  | { type: 'PLACE_ATOM'; payload: PlaceAtomPayload }
  | { type: 'RELEASE_ATOM'; payload: ReleaseAtomPayload }
  | { type: 'QUIZ_START'; payload: QuizStartPayload }
  | { type: 'QUIZ_SUBMIT'; payload: QuizSubmitPayload }
  | { type: 'PLAYER_LEFT'; payload: PlayerLeftPayload }
  | { type: 'ROOM_RESET'; payload: RoomResetPayload }
  | { type: 'HEARTBEAT'; payload: HeartbeatPayload }
  | { type: 'REQUEST_STATE_SYNC'; payload: RequestStateSyncPayload };

export type ReducibleRoomEvent = Exclude<RoomClientEvent, { type: 'CREATE_ROOM' }>;

export interface ClientEnvelope<TEvent extends RoomClientEvent = RoomClientEvent> {
  event: TEvent;
  eventId: string;
  actorId: PlayerId;
  timestamp: number;
  clientVersion?: number;
}

export type RoomDomainEvent = ReducibleRoomEvent & {
  actorId: PlayerId;
  eventId: string;
  timestamp: number;
  clientVersion?: number;
};

export type RoomServerMessage =
  | {
      type: 'CONNECTED';
      payload: {
        connectionId: string;
        serverTime: number;
      };
    }
  | {
      type: 'ROOM_STATE';
      payload: RoomHydrationPayload;
    }
  | {
      type: 'EVENT_REJECTED';
      payload: {
        eventId: string;
        error: RoomLabError;
        state?: RoomHydrationPayload;
      };
    }
  | {
      type: 'SCORE_UPDATE';
      payload: {
        score: ScoreState;
        reason: string;
      };
    }
  | {
      type: 'SESSION_LOG';
      payload: DiagnosticEvent;
    }
  | {
      type: 'DESYNC_NOTICE';
      payload: {
        serverVersion: number;
        roomId: RoomId;
        reason: string;
      };
    }
  | {
      type: 'ROOM_CLOSED';
      payload: {
        roomId: RoomId;
        reason: string;
      };
    };

export interface RoomStateMessage {
  type: 'ROOM_STATE';
  payload: {
    room: RoomState;
  };
}
