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

  return (
    <section className="panel panel-strong">
      <div className="panel-heading">
        <p className="eyebrow">Session</p>
        <h2>Host, join, and align nearby learners</h2>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Display name</span>
          <input value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} />
        </label>

        <label className="field">
          <span>Transport</span>
          <select value={transportMode} onChange={(event) => onTransportModeChange(event.target.value as TransportMode)}>
            <option value="browser">Browser shared demo</option>
            <option value="relay">External relay</option>
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
          Host room
        </button>
        <button className="secondary-button" onClick={() => void onJoin()} disabled={connectionStatus === 'connecting'}>
          Join room
        </button>
        <button className="ghost-button" onClick={onResync} disabled={!isConnectedToRoom}>
          Resync
        </button>
      </div>

      <div className="status-strip">
        <span className={`status-pill status-${connectionStatus}`}>{connectionStatus}</span>
        <span className="status-pill">{usesBrowserTransport ? 'browser shared demo' : 'external relay'}</span>
        <span>{roomState ? `Lesson: ${roomState.lessonId}` : 'Waiting for room state'}</span>
      </div>

      {connectionError ? <p className="error-text">{connectionError}</p> : null}

      {usesBrowserTransport ? (
        <p className="muted-text">
          Browser shared demo is Vercel-safe and works across multiple tabs on the same deployed URL using browser-native shared state.
        </p>
      ) : (
        <p className="muted-text">
          External relay mode uses the authoritative WebSocket server for stronger multi-device demos. Point this at your hosted relay first.
        </p>
      )}

      <div className="instruction-list">
        <p>1. {usesBrowserTransport ? 'Open a second tab on the same deployment, then host and join the same room.' : 'Host creates a room and invites nearby teammates using the same relay.'}</p>
        <p>2. Everyone marks ready, then the host establishes a shared origin.</p>
        <p>3. Guests confirm alignment, build the molecule together, then answer the quiz.</p>
      </div>

      {roomState && currentPlayer ? (
        <div className="session-actions">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={currentPlayer.ready}
              onChange={(event) => onReadyChange(event.target.checked)}
              disabled={roomState.phase !== 'lobby' && roomState.phase !== 'alignment'}
            />
            <span>Ready for shared lesson start</span>
          </label>

          {currentPlayer.isHost ? (
            <div className="button-row">
              <button className="secondary-button" onClick={() => onReset(true)}>
                Reset round
              </button>
              <button className="ghost-button" onClick={() => onReset(false)}>
                Full reset
              </button>
            </div>
          ) : null}

          <div className="meta-grid">
            <div>
              <span className="meta-label">Room</span>
              <strong>{roomState.roomId}</strong>
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
