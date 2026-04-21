import type { LessonDefinition, PlayerState, RoomState } from '../types/domain';
import { getCurrentChallengeDefinition as getCurrentChallengeDefinitionFromLesson } from '../gameplay/moleculeRules';

export const getConnectedPlayers = (state: RoomState): PlayerState[] =>
  state.participantOrder
    .map((playerId) => state.participants[playerId])
    .filter((player): player is PlayerState => Boolean(player))
    .filter((player) => player.presence.connectionStatus !== 'disconnected');

export const getConnectedPlayerIds = (state: RoomState): string[] => getConnectedPlayers(state).map((player) => player.id);

export const allConnectedPlayersReady = (state: RoomState): boolean => {
  const players = getConnectedPlayers(state);
  return players.length >= 1 && players.every((player) => player.ready);
};

export const allConnectedPlayersAligned = (state: RoomState): boolean => {
  const players = getConnectedPlayers(state);
  return players.length >= 1 && players.every((player) => player.alignment.status === 'aligned');
};

export const getCurrentChallengeDefinitionFromState = (state: RoomState, lesson: LessonDefinition) =>
  getCurrentChallengeDefinitionFromLesson(lesson, state.lesson.currentChallengeIndex);

export const getCurrentQuestion = (state: RoomState) => {
  if (!state.quiz) {
    return undefined;
  }

  return state.quiz.questions[state.quiz.currentQuestionIndex];
};

export const summarizeParticipants = (state: RoomState): string =>
  getConnectedPlayers(state)
    .map((player) => `${player.displayName} (${player.alignment.status}, ${player.presence.connectionStatus})`)
    .join(', ');
