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
        <h2>Players</h2>
      </div>

      {!roomState ? (
        <p className="muted-text">Players appear here after you connect.</p>
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
                  <span>{participant.isHost ? 'Host' : 'Participant'}</span>
                </div>
                <div className="presence-meta">
                  <span>{participant.ready ? 'Ready' : 'Not ready'}</span>
                  <span>{participant.alignment.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
