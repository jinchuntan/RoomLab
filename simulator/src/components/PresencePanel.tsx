import type { PlayerState, RoomState } from '../../../shared/src';

interface PresencePanelProps {
  roomState: RoomState | null;
  currentPlayer: PlayerState | null;
}

export const PresencePanel = ({ roomState, currentPlayer }: PresencePanelProps) => {
  return (
    <section className="panel">
      <div className="panel-heading">
        <p className="eyebrow">Presence</p>
        <h2>Who is in the scene</h2>
      </div>

      {!roomState ? (
        <p className="muted-text">Participant presence is shown after you connect to a room.</p>
      ) : (
        <div className="participant-stack">
          {roomState.participantOrder.map((participantId) => {
            const participant = roomState.participants[participantId];
            if (!participant) {
              return null;
            }

            return (
              <div className="participant-row participant-row-rich" key={participant.id}>
                <div>
                  <strong>
                    {participant.displayName}
                    {participant.id === currentPlayer?.id ? ' (You)' : ''}
                  </strong>
                  <span>{participant.alignment.instructions}</span>
                </div>
                <div className="presence-meta">
                  <span>{participant.ready ? 'Ready' : 'Not ready'}</span>
                  <span>{participant.presence.heldObjectId ? `Holding ${participant.presence.heldObjectId}` : 'Hands free'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
