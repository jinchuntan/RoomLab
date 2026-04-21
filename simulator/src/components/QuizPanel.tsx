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
          <h2>Answer together</h2>
        </div>
        <p className="muted-text">The quiz unlocks after you finish a molecule.</p>
      </section>
    );
  }

  if (!roomState.quiz) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <p className="eyebrow">Quiz</p>
          <h2>Answer together</h2>
        </div>

        {roomState.phase === 'roundComplete' && activeChallengeStatus === 'assembled' ? (
          <>
            <p className="muted-text">The molecule is complete. Start the quiz when you are ready.</p>
            {currentPlayer.isHost ? (
              <button className="primary-button" onClick={onStartQuiz}>
                Start quiz
              </button>
            ) : (
              <p className="muted-text">Waiting for the host to start the quiz.</p>
            )}
          </>
        ) : roomState.phase === 'completed' ? (
          <p className="muted-text">Lesson complete. Reset the room to play again.</p>
        ) : (
          <p className="muted-text">Finish the current molecule to unlock the quiz.</p>
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
          <h2>Waiting for question</h2>
        </div>
        <p className="muted-text">The quiz is active, but the current question has not loaded yet.</p>
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

      <div className="status-strip">
        <span className="status-pill">
          Question {roomState.quiz.currentQuestionIndex + 1}/{roomState.quiz.questions.length}
        </span>
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
            : 'Answer locked in. Waiting for everyone else.'
          : 'Pick one answer.'}
      </p>
    </section>
  );
};
