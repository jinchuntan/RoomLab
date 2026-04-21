import type { PlayerState, RoomState } from '../../../shared/src';

interface AlignmentPanelProps {
  roomState: RoomState | null;
  currentPlayer: PlayerState | null;
  onEstablishSharedOrigin: () => void;
  onConfirmAlignment: () => void;
  onSpawnLesson: () => void;
}

export const AlignmentPanel = ({
  roomState,
  currentPlayer,
  onEstablishSharedOrigin,
  onConfirmAlignment,
  onSpawnLesson,
}: AlignmentPanelProps) => {
  if (!roomState || !currentPlayer) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <p className="eyebrow">Co-location</p>
          <h2>Shared-origin alignment</h2>
        </div>
        <p className="muted-text">Create or join a room to begin the co-located alignment flow.</p>
      </section>
    );
  }

  const sharedOriginEstablished = Boolean(roomState.coLocation.sharedOrigin.establishedAt);
  const canEstablishOrigin = currentPlayer.isHost && !sharedOriginEstablished;
  const canConfirmAlignment = sharedOriginEstablished && currentPlayer.alignment.status !== 'aligned';
  const canSpawnLesson = currentPlayer.isHost && roomState.phase === 'lessonIntro';

  return (
    <section className="panel">
      <div className="panel-heading">
        <p className="eyebrow">Co-location</p>
        <h2>Nearby-host alignment flow</h2>
      </div>

      <p className="muted-text">{roomState.coLocation.statusMessage}</p>

      <div className="alignment-card">
        <p className="alignment-label">Shared origin</p>
        <strong>{sharedOriginEstablished ? 'Established' : 'Waiting for host'}</strong>
        <span>{roomState.coLocation.sharedOrigin.nearbyUserAssumption}</span>
      </div>

      <div className="button-row">
        {canEstablishOrigin ? (
          <button className="primary-button" onClick={onEstablishSharedOrigin}>
            Establish shared origin
          </button>
        ) : null}
        {canConfirmAlignment ? (
          <button className="secondary-button" onClick={onConfirmAlignment}>
            Confirm nearby alignment
          </button>
        ) : null}
        {canSpawnLesson ? (
          <button className="primary-button" onClick={onSpawnLesson}>
            Spawn lesson
          </button>
        ) : null}
      </div>

      <div className="participant-stack">
        {roomState.participantOrder.map((participantId) => {
          const participant = roomState.participants[participantId];
          if (!participant) {
            return null;
          }

          return (
            <div className="participant-row" key={participant.id}>
              <div>
                <strong>{participant.displayName}</strong>
                <span>{participant.isHost ? 'Host' : 'Participant'}</span>
              </div>
              <div className="participant-tags">
                <span className="mini-pill">{participant.alignment.status}</span>
                <span className="mini-pill">{participant.alignment.confidence}</span>
                <span className="mini-pill">{participant.presence.connectionStatus}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
