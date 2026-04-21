import { getLessonDefinition, type RoomState } from '../../../shared/src';

interface ScoreboardPanelProps {
  roomState: RoomState | null;
}

export const ScoreboardPanel = ({ roomState }: ScoreboardPanelProps) => {
  const lesson = roomState ? getLessonDefinition(roomState.lessonId) : null;
  const challenge = roomState && lesson ? lesson.challenges[roomState.lesson.currentChallengeIndex] : null;

  return (
    <section className="panel">
      <div className="panel-heading">
        <p className="eyebrow">Progress</p>
        <h2>Score</h2>
      </div>

      <div className="score-hero">
        <span>Team score</span>
        <strong>{roomState?.score.teamScore ?? 0}</strong>
      </div>

      {roomState ? (
        <>
          <div className="meta-grid">
            <div>
              <span className="meta-label">Round</span>
              <strong>{roomState.lesson.currentRound || 0}</strong>
            </div>
            <div>
              <span className="meta-label">Challenge</span>
              <strong>{challenge?.title ?? 'Not started'}</strong>
            </div>
            <div>
              <span className="meta-label">Complete</span>
              <strong>
                {roomState.lesson.completedChallengeIds.length}/{lesson?.challenges.length ?? 0}
              </strong>
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
                    <span>{participant.isHost ? 'Host' : 'Player'}</span>
                  </div>
                  <strong>{roomState.score.perPlayer[participantId] ?? 0}</strong>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="muted-text">Score appears here once the room starts.</p>
      )}
    </section>
  );
};
