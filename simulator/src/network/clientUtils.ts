import type { RoomHydrationPayload, RoomLabError } from '../../../shared/src';
import type { ConnectionStatus } from '../hooks/useRoomClient';
import type { RoomClientListeners } from './RoomClient';

export const createClientListeners = ({
  setConnectionStatus,
  setConnectionError,
  appendLog,
  applyHydratedState,
}: {
  setConnectionStatus: (value: ConnectionStatus) => void;
  setConnectionError: (value: string | null) => void;
  appendLog: (scope: 'network' | 'session' | 'score', level: 'info' | 'warn' | 'error', message: string, context?: Record<string, string | number | boolean | null>) => void;
  applyHydratedState: (payload: RoomHydrationPayload) => void;
}): RoomClientListeners => ({
  onConnected: (connectionId) => {
    setConnectionStatus('connected');
    appendLog('network', 'info', 'Connected to the selected RoomLab transport.', { connectionId });
  },
  onRoomState: (payload) => {
    applyHydratedState(payload);
  },
  onRejected: (_eventId, error: RoomLabError, payload) => {
    setConnectionError(error.message);
    appendLog('session', 'warn', error.message, error.details);
    if (payload) {
      applyHydratedState(payload);
    }
  },
  onScoreUpdate: (_score, reason) => {
    appendLog('score', 'info', `Score updated: ${reason}`);
  },
  onDesync: (serverVersion, reason) => {
    appendLog('network', 'warn', reason, { serverVersion });
  },
  onClosed: () => {
    setConnectionStatus('idle');
    appendLog('network', 'warn', 'Connection to the selected RoomLab transport closed.');
  },
  onError: (message) => {
    setConnectionStatus('error');
    setConnectionError(message);
    appendLog('network', 'error', message);
  },
});
