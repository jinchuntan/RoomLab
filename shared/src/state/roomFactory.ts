import type { CreateRoomOptions, LessonDefinition, PlayerState, RoomState } from '../types/domain';
import { getCurrentChallengeDefinition } from '../gameplay/moleculeRules';
import { identityTransform } from '../utils/transforms';

const createPlayerState = ({
  playerId,
  displayName,
  isHost,
  now,
}: {
  playerId: string;
  displayName: string;
  isHost: boolean;
  now: number;
}): PlayerState => ({
  id: playerId,
  displayName,
  isHost,
  ready: false,
  joinedAt: now,
  presence: {
    connectionStatus: 'connected',
    heldObjectId: null,
    lastHeartbeatAt: now,
  },
  alignment: {
    status: isHost ? 'awaiting-origin' : 'not-started',
    confidence: 'low',
    lastConfirmedAt: null,
    localCalibrationOffset: null,
    instructions: isHost
      ? 'Establish a shared origin on the floor or table where everyone can look.'
      : 'Wait for the host to establish the shared origin, then confirm nearby alignment.',
  },
});

export const createRoomState = ({ roomId, lesson, hostId, displayName, now }: CreateRoomOptions): RoomState => {
  const firstChallenge = getCurrentChallengeDefinition(lesson, 0);

  return {
    roomId,
    lessonId: lesson.id,
    hostId,
    phase: 'lobby',
    participants: {
      [hostId]: createPlayerState({
        playerId: hostId,
        displayName,
        isHost: true,
        now,
      }),
    },
    participantOrder: [hostId],
    coLocation: {
      mode: 'nearby-friend',
      sharedOrigin: {
        anchorId: 'shared-origin-anchor',
        establishedBy: null,
        establishedAt: null,
        transform: identityTransform(),
        nearbyUserAssumption:
          'Players are standing or seated close enough to view the same physical reference point during calibration.',
      },
      reAlignmentNeeded: false,
      lateJoinFallback:
        'Late joiners receive the current room snapshot, then complete a guided nearby-host calibration before interacting.',
      statusMessage: 'Invite nearby learners, mark everyone ready, then establish a shared origin.',
    },
    lesson: {
      lessonId: lesson.id,
      currentRound: 0,
      currentChallengeIndex: 0,
      currentChallengeId: firstChallenge?.id ?? null,
      activeChallenge: null,
      completedChallengeIds: [],
      celebration: null,
    },
    objects: {},
    score: {
      teamScore: 0,
      perPlayer: {
        [hostId]: 0,
      },
      history: [],
    },
    quiz: null,
    diagnostics: [],
    lastError: null,
    version: 1,
    updatedAt: now,
  };
};

export const getLessonByState = (state: RoomState, lesson: LessonDefinition): LessonDefinition => {
  if (lesson.id !== state.lessonId) {
    throw new Error(`Lesson mismatch. Expected ${state.lessonId}, received ${lesson.id}.`);
  }

  return lesson;
};
