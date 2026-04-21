import { startTransition, useEffect, useRef, useState } from 'react';
import {
  getLessonDefinition,
  versionGapIsSuspicious,
  type RoomClientEvent,
  type DiagnosticEvent,
  type RoomHydrationPayload,
  type RoomState,
} from '../../../shared/src';
import { BrowserAlignmentAdapter } from '../adapters/BrowserAlignmentAdapter';
import { BroadcastRoomClient } from '../network/BroadcastRoomClient';
import { createClientListeners } from '../network/clientUtils';
import type { RoomClient } from '../network/RoomClient';
import { WebSocketRoomClient } from '../network/WebSocketRoomClient';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';
export type TransportMode = 'browser' | 'relay';

const PLAYER_ID_KEY = 'roomlab-player-id';
const DISPLAY_NAME_KEY = 'roomlab-display-name';
const SERVER_URL_KEY = 'roomlab-server-url';
const TRANSPORT_MODE_KEY = 'roomlab-transport-mode';

const createLocalId = (): string => `player_${Math.random().toString(36).slice(2, 10)}`;

const getDefaultServerUrl = (): string => {
  const envDefault = import.meta.env.VITE_ROOMLAB_DEFAULT_RELAY_URL;
  if (envDefault) {
    return envDefault;
  }

  const hostname = window.location.hostname || 'localhost';
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${hostname}:8787`;
};

const getDefaultTransportMode = (): TransportMode => {
  const envTransport = import.meta.env.VITE_ROOMLAB_DEFAULT_TRANSPORT;
  return envTransport === 'relay' ? 'relay' : 'browser';
};

const ensureWsUrl = (input: string): string => {
  if (input.startsWith('ws://') || input.startsWith('wss://')) {
    return input;
  }

  if (input.startsWith('http://')) {
    return input.replace('http://', 'ws://');
  }

  if (input.startsWith('https://')) {
    return input.replace('https://', 'wss://');
  }

  return `ws://${input}`;
};

const getSessionPlayerId = (): string => {
  const existing = window.sessionStorage.getItem(PLAYER_ID_KEY);
  if (existing) {
    return existing;
  }

  const created = createLocalId();
  window.sessionStorage.setItem(PLAYER_ID_KEY, created);
  return created;
};

const createLogEntry = (
  scope: DiagnosticEvent['scope'],
  level: DiagnosticEvent['level'],
  message: string,
  context?: Record<string, string | number | boolean | null>,
): DiagnosticEvent => ({
  id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  scope,
  level,
  message,
  timestamp: Date.now(),
  ...(context ? { context } : {}),
});

export interface UseRoomClientResult {
  transportMode: TransportMode;
  setTransportMode: (value: TransportMode) => void;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  serverUrl: string;
  setServerUrl: (value: string) => void;
  roomState: RoomState | null;
  roomId: string;
  setRoomId: (value: string) => void;
  displayName: string;
  setDisplayName: (value: string) => void;
  playerId: string;
  localLogs: DiagnosticEvent[];
  lessonTitle: string;
  hostRoom: () => Promise<void>;
  joinRoom: () => Promise<void>;
  setReady: (ready: boolean) => void;
  establishSharedOrigin: () => void;
  confirmAlignment: () => void;
  spawnLesson: () => void;
  startQuiz: () => void;
  submitQuiz: (questionId: string, optionId: string) => void;
  pickupAtom: (objectId: string) => void;
  moveAtom: (objectId: string, transform: RoomHydrationPayload['state']['objects'][string]['transform']) => void;
  placeAtom: (objectId: string, slotId: string) => void;
  releaseAtom: (objectId: string) => void;
  resetRoom: (preserveAlignment?: boolean) => void;
  requestResync: () => void;
}

export const useRoomClient = (): UseRoomClientResult => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>(
    () => (window.localStorage.getItem(TRANSPORT_MODE_KEY) as TransportMode | null) ?? getDefaultTransportMode(),
  );
  const [serverUrl, setServerUrl] = useState<string>(
    () => window.localStorage.getItem(SERVER_URL_KEY) ?? getDefaultServerUrl(),
  );
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [roomId, setRoomId] = useState<string>('lab-101');
  const [displayName, setDisplayName] = useState<string>(() => window.sessionStorage.getItem(DISPLAY_NAME_KEY) ?? 'XR Learner');
  const [localLogs, setLocalLogs] = useState<DiagnosticEvent[]>([]);
  const [playerId] = useState<string>(() => getSessionPlayerId());
  const clientRef = useRef<RoomClient | null>(null);
  const alignmentAdapterRef = useRef<BrowserAlignmentAdapter>(new BrowserAlignmentAdapter(playerId));

  const appendLog = (entry: DiagnosticEvent): void => {
    setLocalLogs((previous) => [entry, ...previous].slice(0, 80));
  };

  const appendClientLog = (
    scope: 'network' | 'session' | 'score',
    level: 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, string | number | boolean | null>,
  ): void => {
    appendLog(createLogEntry(scope, level, message, context));
  };

  const applyHydratedState = (payload: RoomHydrationPayload): void => {
    if (versionGapIsSuspicious(roomState?.version, payload.version)) {
      appendLog(
        createLogEntry('network', 'warn', 'Large version gap detected. Local state was rehydrated from the server.', {
          localVersion: roomState?.version ?? null,
          incomingVersion: payload.version,
        }),
      );
    }

    startTransition(() => {
      setRoomState(payload.state);
      setRoomId(payload.roomId);
    });
  };

  const ensureClient = async (): Promise<RoomClient> => {
    if (clientRef.current) {
      return clientRef.current;
    }

    const client =
      transportMode === 'browser'
        ? new BroadcastRoomClient()
        : new WebSocketRoomClient(ensureWsUrl(serverUrl));
    client.setListeners(
      createClientListeners({
        setConnectionStatus,
        setConnectionError,
        appendLog: appendClientLog,
        applyHydratedState,
      }),
    );

    setConnectionStatus('connecting');
    await client.connect();
    clientRef.current = client;
    return client;
  };

  const sendEvent = async (
    event: RoomClientEvent,
    expectedRoomId?: string,
  ): Promise<void> => {
    try {
      const client = await ensureClient();
      await client.send(event, playerId, roomState?.version);
      if (expectedRoomId) {
        setRoomId(expectedRoomId);
      }
      setConnectionError(null);
    } catch (error) {
      setConnectionStatus('error');
      setConnectionError(error instanceof Error ? error.message : 'Unable to send event.');
    }
  };

  const hostRoom = async (): Promise<void> => {
    window.sessionStorage.setItem(DISPLAY_NAME_KEY, displayName);
    await sendEvent(
      {
        type: 'CREATE_ROOM',
        payload: {
          roomId,
          lessonId: 'molecule-builder',
          playerId,
          displayName,
        },
      },
      roomId,
    );
  };

  const joinRoom = async (): Promise<void> => {
    window.sessionStorage.setItem(DISPLAY_NAME_KEY, displayName);
    await sendEvent(
      {
        type: 'JOIN_ROOM',
        payload: {
          roomId,
          lessonId: 'molecule-builder',
          playerId,
          displayName,
        },
      },
      roomId,
    );
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!clientRef.current || !roomId || connectionStatus !== 'connected') {
        return;
      }

      void clientRef.current.send(
        {
          type: 'HEARTBEAT',
          payload: {
            roomId,
          },
        },
        playerId,
        roomState?.version,
      );
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [connectionStatus, playerId, roomId, roomState?.version]);

  useEffect(() => {
    window.localStorage.setItem(SERVER_URL_KEY, serverUrl);
  }, [serverUrl]);

  useEffect(() => {
    window.localStorage.setItem(TRANSPORT_MODE_KEY, transportMode);
    clientRef.current?.disconnect();
    clientRef.current = null;
    setConnectionStatus('idle');
    setConnectionError(null);
    setRoomState(null);
  }, [transportMode, serverUrl]);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, []);

  const lessonTitle = roomState ? getLessonDefinition(roomState.lessonId).title : getLessonDefinition('molecule-builder').title;

  return {
    transportMode,
    setTransportMode,
    connectionStatus,
    connectionError,
    serverUrl,
    setServerUrl,
    roomState,
    roomId,
    setRoomId,
    displayName,
    setDisplayName,
    playerId,
    localLogs,
    lessonTitle,
    hostRoom,
    joinRoom,
    setReady: (ready) => {
      void sendEvent({
        type: 'PLAYER_READY',
        payload: {
          roomId,
          ready,
        },
      });
    },
    establishSharedOrigin: () => {
      const transform = alignmentAdapterRef.current.establishSharedOrigin();
      void sendEvent({
        type: 'SET_SHARED_ORIGIN',
        payload: {
          roomId,
          transform,
        },
      });
    },
    confirmAlignment: () => {
      const alignment = alignmentAdapterRef.current.confirmNearbyAlignment();
      void sendEvent({
        type: 'COLOCATION_CONFIRMED',
        payload: {
          roomId,
          localCalibrationOffset: alignment.localCalibrationOffset,
          confidence: alignment.confidence,
        },
      });
    },
    spawnLesson: () => {
      void sendEvent({
        type: 'SPAWN_LESSON',
        payload: {
          roomId,
        },
      });
    },
    startQuiz: () => {
      void sendEvent({
        type: 'QUIZ_START',
        payload: {
          roomId,
        },
      });
    },
    submitQuiz: (questionId, optionId) => {
      void sendEvent({
        type: 'QUIZ_SUBMIT',
        payload: {
          roomId,
          questionId,
          optionId,
        },
      });
    },
    pickupAtom: (objectId) => {
      void sendEvent({
        type: 'PICKUP_ATOM',
        payload: {
          roomId,
          objectId,
        },
      });
    },
    moveAtom: (objectId, transform) => {
      void sendEvent({
        type: 'MOVE_ATOM',
        payload: {
          roomId,
          objectId,
          transform,
        },
      });
    },
    placeAtom: (objectId, slotId) => {
      void sendEvent({
        type: 'PLACE_ATOM',
        payload: {
          roomId,
          objectId,
          slotId,
        },
      });
    },
    releaseAtom: (objectId) => {
      void sendEvent({
        type: 'RELEASE_ATOM',
        payload: {
          roomId,
          objectId,
        },
      });
    },
    resetRoom: (preserveAlignment = true) => {
      void sendEvent({
        type: 'ROOM_RESET',
        payload: {
          roomId,
          preserveAlignment,
        },
      });
    },
    requestResync: () => {
      void sendEvent({
        type: 'REQUEST_STATE_SYNC',
        payload: {
          roomId,
          reason: 'manual',
        },
      });
    },
  };
};
