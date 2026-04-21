import type { RoomState } from '../../../shared/src';

interface ScoreboardPanelProps {
  roomState: RoomState | null;
}

export const ScoreboardPanel = ({ roomState }: ScoreboardPanelProps) => {
  return (
    <section className="panel">
      <div className="panel-heading">
        <p className="eyebrow">Score</p>
        <h2>Shared progress</h2>
      </div>

      <div className="score-hero">
        <span>Team score</span>
        <strong>{roomState?.score.teamScore ?? 0}</strong>
      </div>

      {roomState ? (
        <>
          <div className="meta-grid">
            <div>
              <span className="meta-label">Current round</span>
              <strong>{roomState.lesson.currentRound || 0}</strong>
            </div>
            <div>
              <span className="meta-label">Challenge</span>
              <strong>{roomState.lesson.currentChallengeId ?? 'Not started'}</strong>
            </div>
            <div>
              <span className="meta-label">Version</span>
              <strong>{roomState.version}</strong>
            </div>
          </div>

          <div className="participant-stack">
            {roomState.participantOrder.map((participantId) => {
              const participant = roomState.participants[participantId];
              if (!participant) {
                return null;
              }

              return (
                <div className="participant-row" key={participantId}>
                  <div>
                    <strong>{participant.displayName}</strong>
                    <span>{participant.isHost ? 'Host contribution' : 'Contribution'}</span>
                  </div>
                  <strong>{roomState.score.perPlayer[participantId] ?? 0}</strong>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="muted-text">Room score appears here once the session is active.</p>
      )}
    </section>
  );
};
