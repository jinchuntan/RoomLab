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
          <h2>Line up</h2>
        </div>
        <p className="muted-text">Create or join a room first.</p>
      </section>
    );
  }

  const sharedOriginEstablished = Boolean(roomState.coLocation.sharedOrigin.establishedAt);
  const canEstablishOrigin = currentPlayer.isHost && !sharedOriginEstablished;
  const canConfirmAlignment = sharedOriginEstablished && currentPlayer.alignment.status !== 'aligned';
  const canSpawnLesson = currentPlayer.isHost && roomState.phase === 'lessonIntro';
  const connectedCount = roomState.participantOrder.filter(
    (participantId) => roomState.participants[participantId]?.presence.connectionStatus !== 'disconnected',
  ).length;
  const alignedCount = roomState.participantOrder.filter(
    (participantId) =>
      roomState.participants[participantId]?.presence.connectionStatus !== 'disconnected' &&
      roomState.participants[participantId]?.alignment.status === 'aligned',
  ).length;
  const nextAction = canEstablishOrigin
    ? 'Place the shared origin.'
    : canConfirmAlignment
      ? 'Confirm your alignment.'
      : canSpawnLesson
        ? 'Everyone is aligned. Start the molecule.'
        : roomState.coLocation.statusMessage;

  return (
    <section className="panel">
      <div className="panel-heading">
        <p className="eyebrow">Co-location</p>
        <h2>Line up</h2>
      </div>

      <p className="muted-text">{nextAction}</p>

      <div className="alignment-card">
        <p className="alignment-label">Shared origin</p>
        <strong>{sharedOriginEstablished ? 'Ready' : 'Waiting for host'}</strong>
        <span>
          {alignedCount}/{connectedCount} aligned
        </span>
      </div>

      <div className="button-row">
        {canEstablishOrigin ? (
          <button className="primary-button" onClick={onEstablishSharedOrigin}>
            Establish origin
          </button>
        ) : null}
        {canConfirmAlignment ? (
          <button className="secondary-button" onClick={onConfirmAlignment}>
            Confirm alignment
          </button>
        ) : null}
        {canSpawnLesson ? (
          <button className="primary-button" onClick={onSpawnLesson}>
            Start molecule
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
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
