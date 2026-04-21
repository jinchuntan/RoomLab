import type { PlayerState, RoomState } from '../../../shared/src';

interface QuizPanelProps {
  roomState: RoomState | null;
  currentPlayer: PlayerState | null;
  onStartQuiz: () => void;
  onSubmit: (questionId: string, optionId: string) => void;
}

export const QuizPanel = ({ roomState, currentPlayer, onStartQuiz, onSubmit }: QuizPanelProps) => {
  const activeChallengeStatus = roomState?.lesson.activeChallenge?.status;

  if (!roomState || !currentPlayer) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <p className="eyebrow">Quiz</p>
          <h2>Learning reinforcement</h2>
        </div>
        <p className="muted-text">The synchronized quiz appears after a molecule is assembled.</p>
      </section>
    );
  }

  if (!roomState.quiz) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <p className="eyebrow">Quiz</p>
          <h2>Learning reinforcement</h2>
        </div>

        {roomState.phase === 'roundComplete' && activeChallengeStatus === 'assembled' ? (
          <>
            <p className="muted-text">
              The team has assembled the molecule. Start the shared quiz to reinforce geometry, bond count, and application.
            </p>
            {currentPlayer.isHost ? (
              <button className="primary-button" onClick={onStartQuiz}>
                Start synchronized quiz
              </button>
            ) : (
              <p className="muted-text">Waiting for the host to start the quiz.</p>
            )}
          </>
        ) : roomState.phase === 'completed' ? (
          <p className="muted-text">All starter challenges are complete. Reset the room to replay the lesson.</p>
        ) : (
          <p className="muted-text">Build the active molecule to unlock the quiz stage.</p>
        )}
      </section>
    );
  }

  const question = roomState.quiz.questions[roomState.quiz.currentQuestionIndex];
  if (!question) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <p className="eyebrow">Quiz</p>
          <h2>Waiting for synchronized question</h2>
        </div>
        <p className="muted-text">Quiz state is active, but the current question has not been hydrated yet.</p>
      </section>
    );
  }
  const submissions = roomState.quiz.submissionsByQuestion[question.id] ?? {};
  const alreadyAnswered = Boolean(submissions[currentPlayer.id]);
  const everyoneAnswered = roomState.participantOrder.every((participantId) => {
    const participant = roomState.participants[participantId];
    return participant?.presence.connectionStatus === 'disconnected' || Boolean(submissions[participantId]);
  });

  return (
    <section className="panel">
      <div className="panel-heading">
        <p className="eyebrow">Quiz</p>
        <h2>{question.promptShort}</h2>
      </div>

      <p className="quiz-prompt">{question.prompt}</p>
      <div className="quiz-options">
        {question.options.map((option) => {
          const isCorrectReveal = everyoneAnswered && option.id === question.correctOptionId;
          return (
            <button
              key={option.id}
              className={`quiz-option ${isCorrectReveal ? 'quiz-option-correct' : ''}`}
              onClick={() => onSubmit(question.id, option.id)}
              disabled={alreadyAnswered}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="muted-text">
        {alreadyAnswered
          ? everyoneAnswered
            ? question.explanation
            : 'Answer submitted. Waiting for the rest of the group.'
          : 'Each participant submits one synchronized answer per question.'}
      </p>
    </section>
  );
};
