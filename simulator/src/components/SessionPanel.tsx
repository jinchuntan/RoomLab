import type { PlayerState, RoomState } from '../../../shared/src';
import type { TransportMode } from '../hooks/useRoomClient';

interface SessionPanelProps {
  roomState: RoomState | null;
  currentPlayer: PlayerState | null;
  transportMode: TransportMode;
  roomId: string;
  displayName: string;
  serverUrl: string;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  connectionError: string | null;
  onTransportModeChange: (value: TransportMode) => void;
  onRoomIdChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onServerUrlChange: (value: string) => void;
  onHost: () => Promise<void>;
  onJoin: () => Promise<void>;
  onReadyChange: (ready: boolean) => void;
  onReset: (preserveAlignment?: boolean) => void;
  onResync: () => void;
}

export const SessionPanel = ({
  roomState,
  currentPlayer,
  transportMode,
  roomId,
  displayName,
  serverUrl,
  connectionStatus,
  connectionError,
  onTransportModeChange,
  onRoomIdChange,
  onDisplayNameChange,
  onServerUrlChange,
  onHost,
  onJoin,
  onReadyChange,
  onReset,
  onResync,
}: SessionPanelProps) => {
  const isConnectedToRoom = Boolean(roomState);
  const usesBrowserTransport = transportMode === 'browser';
  const readyActionDisabled = !roomState || (roomState.phase !== 'lobby' && roomState.phase !== 'alignment');
  const readyActionLabel = currentPlayer?.ready ? 'Marked ready' : 'Mark ready';

  return (
    <section className="panel panel-strong">
      <div className="panel-heading">
        <p className="eyebrow">Session</p>
        <h2>Start a room</h2>
      </div>

      <p className="muted-text">
        {usesBrowserTransport
          ? 'Browser mode works in one tab and also syncs across extra tabs on the same link.'
          : 'Relay mode connects through your WebSocket server for multi-device sessions.'}
      </p>

      <div className="field-grid">
        <label className="field">
          <span>Display name</span>
          <input value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} />
        </label>

        <label className="field">
          <span>Transport</span>
          <select value={transportMode} onChange={(event) => onTransportModeChange(event.target.value as TransportMode)}>
            <option value="browser">Browser</option>
            <option value="relay">Relay</option>
          </select>
        </label>

        <label className="field">
          <span>Room id</span>
          <input value={roomId} onChange={(event) => onRoomIdChange(event.target.value.toLowerCase())} />
        </label>

        {!usesBrowserTransport ? (
          <label className="field field-full">
            <span>Relay URL</span>
            <input value={serverUrl} onChange={(event) => onServerUrlChange(event.target.value)} />
          </label>
        ) : null}
      </div>

      <div className="button-row">
        <button className="primary-button" onClick={() => void onHost()} disabled={connectionStatus === 'connecting'}>
          Host
        </button>
        <button className="secondary-button" onClick={() => void onJoin()} disabled={connectionStatus === 'connecting'}>
          Join
        </button>
        <button className="ghost-button" onClick={onResync} disabled={!isConnectedToRoom}>
          Resync
        </button>
      </div>

      <div className="status-strip">
        <span className={`status-pill status-${connectionStatus}`}>{connectionStatus}</span>
        <span className="status-pill">{usesBrowserTransport ? 'browser mode' : 'relay mode'}</span>
        <span className="status-pill">{roomState ? roomState.phase : 'waiting for room'}</span>
      </div>

      {connectionError ? <p className="error-text">{connectionError}</p> : null}

      {roomState && currentPlayer ? (
        <div className="session-actions">
          <div className="button-row">
            <button
              className={currentPlayer.ready ? 'secondary-button' : 'primary-button'}
              onClick={() => onReadyChange(!currentPlayer.ready)}
              disabled={readyActionDisabled}
            >
              {readyActionLabel}
            </button>

            {currentPlayer.isHost ? (
              <button className="secondary-button" onClick={() => onReset(true)}>
                Reset round
              </button>
            ) : null}

            {currentPlayer.isHost ? (
              <button className="ghost-button" onClick={() => onReset(false)}>
                Full reset
              </button>
            ) : null}
          </div>

          <div className="meta-grid">
            <div>
              <span className="meta-label">You</span>
              <strong>{currentPlayer.isHost ? 'Host' : 'Guest'}</strong>
            </div>
            <div>
              <span className="meta-label">Phase</span>
              <strong>{roomState.phase}</strong>
            </div>
            <div>
              <span className="meta-label">Round</span>
              <strong>{roomState.lesson.currentRound || 0}</strong>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
