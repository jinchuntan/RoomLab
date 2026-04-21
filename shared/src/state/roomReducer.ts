import { buildChallengeRuntime, calculateBuildPoints, calculateQuizPoints, createScoreEvent, getCurrentChallengeDefinition } from '../gameplay/moleculeRules';
import type { RoomDomainEvent } from '../network/events';
import type {
  ChallengeStatus,
  DiagnosticLevel,
  DiagnosticScope,
  LessonDefinition,
  PlayerState,
  RoomLabError,
  RoomState,
  TransitionResult,
} from '../types/domain';
import { deepClone } from '../utils/clone';
import { createRoomError, RoomLabDomainError } from '../utils/errors';
import { identityTransform } from '../utils/transforms';
import { allConnectedPlayersAligned, allConnectedPlayersReady, getConnectedPlayerIds } from './selectors';

const MAX_DIAGNOSTICS = 120;

const addDiagnostic = (
  state: RoomState,
  level: DiagnosticLevel,
  scope: DiagnosticScope,
  message: string,
  timestamp: number,
  context?: Record<string, string | number | boolean | null>,
): void => {
  state.diagnostics.unshift({
    id: `${scope}_${timestamp}_${state.version}`,
    level,
    scope,
    message,
    timestamp,
    ...(context ? { context } : {}),
  });

  state.diagnostics = state.diagnostics.slice(0, MAX_DIAGNOSTICS);
};

const accept = (
  state: RoomState,
  timestamp: number,
  options?: {
    scoreChanged?: boolean;
    scoreReason?: string;
    bumpVersion?: boolean;
  },
): TransitionResult => {
  state.lastError = null;
  state.updatedAt = timestamp;

  if (options?.bumpVersion ?? true) {
    state.version += 1;
  }

  return {
    accepted: true,
    state,
    scoreChanged: options?.scoreChanged ?? false,
    ...(options?.scoreReason ? { scoreReason: options.scoreReason } : {}),
  };
};

const reject = (state: RoomState, error: RoomLabError, timestamp: number): TransitionResult => {
  addDiagnostic(state, 'warn', 'session', error.message, timestamp, error.details);

  return {
    accepted: false,
    state,
    error,
    scoreChanged: false,
  };
};

const ensurePlayer = (state: RoomState, playerId: string): PlayerState => {
  const player = state.participants[playerId];

  if (!player) {
    throw new RoomLabDomainError(createRoomError('PLAYER_NOT_FOUND', `Player ${playerId} does not exist in room ${state.roomId}.`, true));
  }

  return player;
};

const ensureHost = (state: RoomState, playerId: string): PlayerState => {
  const player = ensurePlayer(state, playerId);

  if (!player.isHost) {
    throw new RoomLabDomainError(
      createRoomError('HOST_ONLY_ACTION', `Player ${player.displayName} is not allowed to perform this host-only action.`, true, {
        playerId,
      }),
    );
  }

  return player;
};

const ensureActiveChallenge = (state: RoomState): NonNullable<RoomState['lesson']['activeChallenge']> => {
  if (!state.lesson.activeChallenge) {
    throw new RoomLabDomainError(
      createRoomError('CHALLENGE_NOT_ACTIVE', 'There is no active molecule challenge to interact with right now.', true),
    );
  }

  return state.lesson.activeChallenge;
};

const ensureQuiz = (state: RoomState): NonNullable<RoomState['quiz']> => {
  if (!state.quiz) {
    throw new RoomLabDomainError(createRoomError('QUIZ_NOT_ACTIVE', 'Quiz mode is not currently active for this room.', true));
  }

  return state.quiz;
};

const ensurePhase = (state: RoomState, allowed: RoomState['phase'][]): void => {
  if (!allowed.includes(state.phase)) {
    throw new RoomLabDomainError(
      createRoomError('INVALID_STATE_TRANSITION', `Cannot perform this action while the room is in phase "${state.phase}".`, true, {
        phase: state.phase,
      }),
    );
  }
};

const ensureAlignedForInteraction = (player: PlayerState): void => {
  if (player.alignment.status !== 'aligned') {
    throw new RoomLabDomainError(
      createRoomError('ALIGNMENT_REQUIRED', `${player.displayName} must complete co-location alignment before interacting.`, true),
    );
  }
};

const releaseAllOwnershipBy = (state: RoomState, playerId: string): void => {
  Object.values(state.objects).forEach((object) => {
    if (object.ownerId === playerId) {
      object.ownerId = null;
      object.lifecycle = object.slotId ? 'slotted' : 'tray';
      if (!object.slotId) {
        object.transform = deepClone(object.trayTransform);
      }
      object.revision += 1;
      object.lastUpdatedBy = playerId;
    }
  });

  const player = state.participants[playerId];
  if (player) {
    player.presence.heldObjectId = null;
  }
};

const selectNextHost = (state: RoomState): string | null => {
  const nextHost = getConnectedPlayerIds(state).find((playerId) => playerId !== state.hostId);
  return nextHost ?? null;
};

const updateChallengeStatus = (state: RoomState, status: ChallengeStatus): void => {
  if (state.lesson.activeChallenge) {
    state.lesson.activeChallenge.status = status;
  }
};

const awardBuildScore = (
  state: RoomState,
  eventId: string,
  timestamp: number,
  challengeId: string,
  note: string,
): { amount: number; reason: string } => {
  const connectedPlayerIds = getConnectedPlayerIds(state);
  const teamPoints = calculateBuildPoints(connectedPlayerIds.length);
  state.score.teamScore += teamPoints;

  connectedPlayerIds.forEach((playerId) => {
    state.score.perPlayer[playerId] = (state.score.perPlayer[playerId] ?? 0) + 10;
  });

  state.score.history.unshift(
    createScoreEvent(eventId, 'build-complete', teamPoints, 'system', challengeId, timestamp, note),
  );

  return {
    amount: teamPoints,
    reason: note,
  };
};

const awardQuizScore = (
  state: RoomState,
  eventId: string,
  timestamp: number,
  playerId: string,
  challengeId: string,
  correct: boolean,
): { amount: number; reason: string } => {
  const points = calculateQuizPoints(correct);
  if (points <= 0) {
    return {
      amount: 0,
      reason: 'No score awarded for incorrect quiz answer.',
    };
  }

  state.score.teamScore += points;
  state.score.perPlayer[playerId] = (state.score.perPlayer[playerId] ?? 0) + points;
  state.score.history.unshift(
    createScoreEvent(eventId, 'quiz-correct', points, playerId, challengeId, timestamp, 'Correct quiz answer'),
  );

  return {
    amount: points,
    reason: 'Correct quiz answer',
  };
};

const startChallenge = (state: RoomState, lesson: LessonDefinition, timestamp: number): void => {
  const challengeDefinition = getCurrentChallengeDefinition(lesson, state.lesson.currentChallengeIndex);
  if (!challengeDefinition) {
    state.phase = 'completed';
    state.lesson.currentChallengeId = null;
    state.lesson.activeChallenge = null;
    state.lesson.celebration = {
      moleculeName: 'Lesson complete',
      formula: '',
      quickFact: 'All starter molecules are complete. Reset the room to replay the collaborative lesson.',
      callToAction: 'Review the score breakdown or restart the room.',
      completedAt: timestamp,
    };
    state.quiz = null;
    return;
  }

  const runtime = buildChallengeRuntime(challengeDefinition, timestamp);
  state.lesson.currentChallengeId = challengeDefinition.id;
  state.lesson.currentRound = state.lesson.currentChallengeIndex + 1;
  state.lesson.activeChallenge = runtime.activeChallenge;
  state.lesson.celebration = null;
  state.objects = runtime.objects;
  state.quiz = null;
  state.phase = 'building';
  addDiagnostic(state, 'info', 'session', `Spawned challenge ${challengeDefinition.title}.`, timestamp, {
    challengeId: challengeDefinition.id,
  });
};

const completeChallengeAssembly = (state: RoomState, lesson: LessonDefinition, eventId: string, timestamp: number): string => {
  const challenge = state.lesson.activeChallenge;
  const challengeDefinition = getCurrentChallengeDefinition(lesson, state.lesson.currentChallengeIndex);

  if (!challenge || !challengeDefinition) {
    throw new RoomLabDomainError(
      createRoomError('CHALLENGE_NOT_ACTIVE', 'Cannot complete a challenge before one is active.', true),
    );
  }

  challenge.status = 'assembled';
  challenge.assembledAt = timestamp;
  state.phase = 'roundComplete';
  state.lesson.celebration = {
    moleculeName: challengeDefinition.title,
    formula: challengeDefinition.formula,
    quickFact: challengeDefinition.quickFact,
    callToAction: 'Start the quiz to reinforce the molecule geometry and bonding concept.',
    completedAt: timestamp,
  };

  const score = awardBuildScore(
    state,
    eventId,
    timestamp,
    challengeDefinition.id,
    `Build complete: ${challengeDefinition.title}`,
  );

  addDiagnostic(state, 'info', 'score', `Awarded ${score.amount} team points for assembly.`, timestamp, {
    challengeId: challengeDefinition.id,
  });

  return score.reason;
};

const markChallengeCompleted = (state: RoomState, lesson: LessonDefinition, timestamp: number): void => {
  const challengeDefinition = getCurrentChallengeDefinition(lesson, state.lesson.currentChallengeIndex);
  const activeChallenge = ensureActiveChallenge(state);

  activeChallenge.status = 'completed';
  activeChallenge.completedAt = timestamp;
  if (!state.lesson.completedChallengeIds.includes(activeChallenge.challengeId)) {
    state.lesson.completedChallengeIds.push(activeChallenge.challengeId);
  }

  const hasNextChallenge = state.lesson.currentChallengeIndex + 1 < lesson.challenges.length;
  state.phase = hasNextChallenge ? 'roundComplete' : 'completed';
  state.lesson.celebration = {
    moleculeName: challengeDefinition?.title ?? 'Round complete',
    formula: challengeDefinition?.formula ?? '',
    quickFact: challengeDefinition?.learningGoal ?? 'Round complete.',
    callToAction: hasNextChallenge
      ? 'Host can spawn the next molecule challenge.'
      : 'All starter molecules are complete. Reset to replay or continue iterating on lesson content.',
    completedAt: timestamp,
  };
};

const resetReadyStateForLateJoinIfNeeded = (state: RoomState, timestamp: number): void => {
  if (state.phase === 'building' || state.phase === 'quiz' || state.phase === 'roundComplete') {
    state.coLocation.reAlignmentNeeded = true;
    state.coLocation.statusMessage = 'A new participant joined late. Ask them to align near the host before interacting.';
    addDiagnostic(state, 'info', 'alignment', 'Late joiner requires nearby-host alignment before interaction.', timestamp);
  }
};

export const reduceRoomEvent = (
  currentState: RoomState,
  event: RoomDomainEvent,
  lesson: LessonDefinition,
): TransitionResult => {
  const state = deepClone(currentState);
  const timestamp = event.timestamp;

  try {
    switch (event.type) {
      case 'JOIN_ROOM': {
        const connectedPlayers = getConnectedPlayerIds(state);
        const existingPlayer = state.participants[event.payload.playerId];

        if (!existingPlayer && connectedPlayers.length >= lesson.targetPlayers.max) {
          throw new RoomLabDomainError(
            createRoomError('ROOM_FULL', `Room ${state.roomId} is full. RoomLab currently supports up to ${lesson.targetPlayers.max} participants.`, true),
          );
        }

        if (existingPlayer) {
          existingPlayer.displayName = event.payload.displayName;
          existingPlayer.presence.connectionStatus = 'connected';
          existingPlayer.presence.lastHeartbeatAt = timestamp;
          existingPlayer.ready = true;
          existingPlayer.alignment.instructions =
            state.coLocation.sharedOrigin.establishedAt === null
              ? 'Wait for the host to establish the shared origin, then confirm alignment.'
              : 'Use the nearby-host alignment flow to rejoin the shared scene.';
          addDiagnostic(state, 'info', 'session', `${existingPlayer.displayName} reconnected to the room.`, timestamp, {
            playerId: existingPlayer.id,
          });
        } else {
          state.participants[event.payload.playerId] = {
            id: event.payload.playerId,
            displayName: event.payload.displayName,
            isHost: false,
            ready: true,
            joinedAt: timestamp,
            presence: {
              connectionStatus: 'connected',
              heldObjectId: null,
              lastHeartbeatAt: timestamp,
            },
            alignment: {
              status: state.coLocation.sharedOrigin.establishedAt ? 'pending' : 'awaiting-origin',
              confidence: 'low',
              lastConfirmedAt: null,
              localCalibrationOffset: null,
              instructions:
                state.coLocation.sharedOrigin.establishedAt === null
                  ? 'Host still needs to establish the shared origin.'
                  : 'Stand near the host, view the same reference point, and confirm alignment.',
            },
          };
          state.participantOrder.push(event.payload.playerId);
          state.score.perPlayer[event.payload.playerId] = state.score.perPlayer[event.payload.playerId] ?? 0;
          addDiagnostic(state, 'info', 'session', `${event.payload.displayName} joined room ${state.roomId}.`, timestamp, {
            playerId: event.payload.playerId,
          });
        }

        resetReadyStateForLateJoinIfNeeded(state, timestamp);
        if (allConnectedPlayersReady(state) && state.phase === 'lobby') {
          state.phase = 'alignment';
          state.coLocation.statusMessage = 'All players are ready. Host can establish the shared origin.';
        }

        return accept(state, timestamp);
      }

      case 'PLAYER_READY': {
        ensurePhase(state, ['lobby', 'alignment']);
        const player = ensurePlayer(state, event.actorId);
        player.ready = event.payload.ready;
        addDiagnostic(state, 'info', 'session', `${player.displayName} set ready=${event.payload.ready}.`, timestamp, {
          playerId: player.id,
        });

        if (allConnectedPlayersReady(state)) {
          state.phase = 'alignment';
          state.coLocation.statusMessage = 'Everyone is ready. Host should place the shared origin in the room.';
        } else if (state.phase !== 'lobby') {
          state.coLocation.statusMessage = 'Waiting for every connected learner to mark ready.';
        }

        return accept(state, timestamp);
      }

      case 'SET_SHARED_ORIGIN': {
        ensureHost(state, event.actorId);
        ensurePhase(state, ['alignment', 'lobby']);
        const host = ensurePlayer(state, event.actorId);

        host.alignment.status = 'aligned';
        host.alignment.confidence = 'high';
        host.alignment.lastConfirmedAt = timestamp;
        host.alignment.localCalibrationOffset = identityTransform();
        host.alignment.instructions = 'Shared origin established.';
        state.coLocation.sharedOrigin.establishedBy = event.actorId;
        state.coLocation.sharedOrigin.establishedAt = timestamp;
        state.coLocation.sharedOrigin.transform = event.payload.transform;
        state.phase = 'alignment';
        state.coLocation.statusMessage = 'Shared origin established. Ask nearby participants to confirm alignment.';
        addDiagnostic(state, 'info', 'alignment', `${host.displayName} established the shared origin.`, timestamp, {
          playerId: host.id,
        });

        return accept(state, timestamp);
      }

      case 'COLOCATION_CONFIRMED': {
        const player = ensurePlayer(state, event.actorId);
        if (!state.coLocation.sharedOrigin.establishedAt) {
          throw new RoomLabDomainError(
            createRoomError('ALIGNMENT_REQUIRED', 'The host must establish the shared origin before participants can align.', true),
          );
        }

        player.alignment.status = 'aligned';
        player.alignment.confidence = event.payload.confidence;
        player.alignment.lastConfirmedAt = timestamp;
        player.alignment.localCalibrationOffset = event.payload.localCalibrationOffset;
        player.alignment.instructions = 'Alignment confirmed. Shared content should now appear stable.';
        state.coLocation.reAlignmentNeeded = !allConnectedPlayersAligned(state);
        state.coLocation.statusMessage = allConnectedPlayersAligned(state)
          ? 'Alignment confirmed for all connected participants. Host can launch the lesson.'
          : 'Waiting for remaining participants to complete nearby-host alignment.';

        addDiagnostic(state, 'info', 'alignment', `${player.displayName} confirmed co-location alignment.`, timestamp, {
          playerId: player.id,
          confidence: player.alignment.confidence,
        });

        if (allConnectedPlayersAligned(state) && state.phase === 'alignment') {
          state.phase = 'lessonIntro';
        }

        return accept(state, timestamp);
      }

      case 'SPAWN_LESSON': {
        ensureHost(state, event.actorId);
        if (!allConnectedPlayersAligned(state)) {
          throw new RoomLabDomainError(
            createRoomError('ALIGNMENT_REQUIRED', 'All connected participants must align before lesson content can spawn.', true),
          );
        }

        if (state.phase === 'roundComplete' && state.lesson.activeChallenge && state.lesson.activeChallenge.status !== 'completed') {
          throw new RoomLabDomainError(
            createRoomError(
              'INVALID_STATE_TRANSITION',
              'Finish the quiz before spawning the next lesson challenge.',
              true,
            ),
          );
        }

        if (state.phase === 'completed') {
          throw new RoomLabDomainError(
            createRoomError('INVALID_STATE_TRANSITION', 'The lesson is already complete. Reset the room to replay.', true),
          );
        }

        if (state.lesson.activeChallenge?.status === 'completed') {
          state.lesson.currentChallengeIndex += 1;
        }

        startChallenge(state, lesson, timestamp);
        return accept(state, timestamp);
      }

      case 'PICKUP_ATOM': {
        ensurePhase(state, ['building']);
        const player = ensurePlayer(state, event.actorId);
        ensureAlignedForInteraction(player);
        const object = state.objects[event.payload.objectId];

        if (!object) {
          throw new RoomLabDomainError(
            createRoomError('CHALLENGE_NOT_ACTIVE', `Object ${event.payload.objectId} does not exist.`, true),
          );
        }

        if (object.ownerId && object.ownerId !== event.actorId) {
          throw new RoomLabDomainError(
            createRoomError('OWNERSHIP_CONFLICT', `${object.label} is already being manipulated by another participant.`, true, {
              ownerId: object.ownerId,
            }),
          );
        }

        if (object.lifecycle === 'slotted') {
          throw new RoomLabDomainError(
            createRoomError('INVALID_STATE_TRANSITION', 'Slotted atoms are locked into the molecule for this prototype.', true),
          );
        }

        object.ownerId = event.actorId;
        object.lifecycle = 'held';
        object.revision += 1;
        object.updatedAt = timestamp;
        object.lastUpdatedBy = event.actorId;
        player.presence.heldObjectId = object.objectId;
        addDiagnostic(state, 'info', 'interaction', `${player.displayName} picked up ${object.label}.`, timestamp, {
          objectId: object.objectId,
        });

        return accept(state, timestamp);
      }

      case 'MOVE_ATOM': {
        ensurePhase(state, ['building']);
        const player = ensurePlayer(state, event.actorId);
        ensureAlignedForInteraction(player);
        const object = state.objects[event.payload.objectId];

        if (!object || object.ownerId !== event.actorId) {
          throw new RoomLabDomainError(
            createRoomError('OWNERSHIP_CONFLICT', 'Only the current owner can move this atom.', true, {
              objectId: event.payload.objectId,
            }),
          );
        }

        object.transform = event.payload.transform;
        object.revision += 1;
        object.updatedAt = timestamp;
        object.lastUpdatedBy = event.actorId;
        return accept(state, timestamp);
      }

      case 'PLACE_ATOM': {
        ensurePhase(state, ['building']);
        const player = ensurePlayer(state, event.actorId);
        ensureAlignedForInteraction(player);
        const challenge = ensureActiveChallenge(state);
        const object = state.objects[event.payload.objectId];
        const slot = challenge.slots[event.payload.slotId];

        if (!object || object.ownerId !== event.actorId) {
          throw new RoomLabDomainError(
            createRoomError('OWNERSHIP_CONFLICT', 'Only the current owner can place this atom.', true, {
              objectId: event.payload.objectId,
            }),
          );
        }

        if (!slot) {
          throw new RoomLabDomainError(
            createRoomError('INVALID_PLACEMENT', `Slot ${event.payload.slotId} does not exist.`, true),
          );
        }

        if (!slot.accepts.includes(object.element) || slot.occupiedObjectId !== null) {
          throw new RoomLabDomainError(
            createRoomError('INVALID_PLACEMENT', `${object.label} cannot be placed into slot "${slot.label}".`, true, {
              slotId: slot.slotId,
              expected: slot.expectedElement,
              actual: object.element,
            }),
          );
        }

        object.transform = deepClone(slot.transform);
        object.ownerId = null;
        object.lifecycle = 'slotted';
        object.slotId = slot.slotId;
        object.revision += 1;
        object.updatedAt = timestamp;
        object.lastUpdatedBy = event.actorId;
        slot.occupiedObjectId = object.objectId;
        player.presence.heldObjectId = null;
        addDiagnostic(state, 'info', 'interaction', `${player.displayName} placed ${object.label} into ${slot.label}.`, timestamp, {
          objectId: object.objectId,
          slotId: slot.slotId,
        });

        const allSlotsFilled = challenge.slotOrder.every((slotId) => {
          const currentSlot = challenge.slots[slotId];
          if (!currentSlot?.occupiedObjectId) {
            return false;
          }

          const slottedAtom = state.objects[currentSlot.occupiedObjectId];
          return slottedAtom?.element === currentSlot.expectedElement;
        });

        if (allSlotsFilled) {
          const scoreReason = completeChallengeAssembly(state, lesson, event.eventId, timestamp);
          return accept(state, timestamp, {
            scoreChanged: true,
            scoreReason,
          });
        }

        return accept(state, timestamp);
      }

      case 'RELEASE_ATOM': {
        ensurePhase(state, ['building']);
        const player = ensurePlayer(state, event.actorId);
        const object = state.objects[event.payload.objectId];

        if (!object || object.ownerId !== event.actorId) {
          throw new RoomLabDomainError(
            createRoomError('OWNERSHIP_CONFLICT', 'Only the current owner can release this atom.', true, {
              objectId: event.payload.objectId,
            }),
          );
        }

        object.ownerId = null;
        object.lifecycle = 'tray';
        object.slotId = null;
        object.revision += 1;
        object.updatedAt = timestamp;
        object.lastUpdatedBy = event.actorId;
        player.presence.heldObjectId = null;
        addDiagnostic(state, 'info', 'interaction', `${player.displayName} released ${object.label}.`, timestamp, {
          objectId: object.objectId,
        });

        return accept(state, timestamp);
      }

      case 'QUIZ_START': {
        ensureHost(state, event.actorId);
        ensurePhase(state, ['roundComplete']);
        const activeChallenge = ensureActiveChallenge(state);
        if (activeChallenge.status !== 'assembled') {
          throw new RoomLabDomainError(
            createRoomError(
              'INVALID_STATE_TRANSITION',
              'Quiz can only start after the molecule has been assembled.',
              true,
            ),
          );
        }

        const challengeDefinition = getCurrentChallengeDefinition(lesson, state.lesson.currentChallengeIndex);
        if (!challengeDefinition) {
          throw new RoomLabDomainError(
            createRoomError('CHALLENGE_NOT_ACTIVE', 'Unable to locate quiz content for the current challenge.', true),
          );
        }

        updateChallengeStatus(state, 'quiz');
        state.phase = 'quiz';
        state.quiz = {
          challengeId: activeChallenge.challengeId,
          status: 'active',
          currentQuestionIndex: 0,
          questions: challengeDefinition.quizQuestions,
          submissionsByQuestion: {},
          revealedQuestionIds: [],
          completedAt: null,
        };
        state.lesson.celebration = {
          moleculeName: challengeDefinition.title,
          formula: challengeDefinition.formula,
          quickFact: challengeDefinition.quickFact,
          callToAction: 'Answer the quiz together to reinforce geometry, bond count, and real-world meaning.',
          completedAt: timestamp,
        };
        addDiagnostic(state, 'info', 'session', `Quiz started for ${challengeDefinition.title}.`, timestamp, {
          challengeId: challengeDefinition.id,
        });

        return accept(state, timestamp);
      }

      case 'QUIZ_SUBMIT': {
        ensurePhase(state, ['quiz']);
        const player = ensurePlayer(state, event.actorId);
        const quiz = ensureQuiz(state);
        const question = quiz.questions[quiz.currentQuestionIndex];

        if (!question || question.id !== event.payload.questionId) {
          throw new RoomLabDomainError(
            createRoomError(
              'INVALID_STATE_TRANSITION',
              'Quiz submission does not match the active question.',
              true,
            ),
          );
        }

        const existingSubmissions = quiz.submissionsByQuestion[question.id] ?? {};
        if (existingSubmissions[event.actorId]) {
          throw new RoomLabDomainError(
            createRoomError('INVALID_STATE_TRANSITION', 'Each participant can only submit one answer per question.', true),
          );
        }

        const correct = question.correctOptionId === event.payload.optionId;
        existingSubmissions[event.actorId] = {
          playerId: event.actorId,
          questionId: question.id,
          optionId: event.payload.optionId,
          correct,
          submittedAt: timestamp,
        };
        quiz.submissionsByQuestion[question.id] = existingSubmissions;
        addDiagnostic(state, 'info', 'score', `${player.displayName} answered ${question.promptShort}.`, timestamp, {
          correct,
          questionId: question.id,
        });

        const score = awardQuizScore(state, event.eventId, timestamp, event.actorId, quiz.challengeId, correct);
        const connectedPlayerIds = getConnectedPlayerIds(state);
        const everyoneAnswered = connectedPlayerIds.every((playerId) => Boolean(existingSubmissions[playerId]));

        if (everyoneAnswered) {
          quiz.revealedQuestionIds.push(question.id);
          const nextQuestionIndex = quiz.currentQuestionIndex + 1;
          if (nextQuestionIndex >= quiz.questions.length) {
            quiz.status = 'complete';
            quiz.completedAt = timestamp;
            markChallengeCompleted(state, lesson, timestamp);
          } else {
            quiz.currentQuestionIndex = nextQuestionIndex;
          }
        }

        return accept(state, timestamp, {
          scoreChanged: score.amount > 0,
          scoreReason: score.reason,
        });
      }

      case 'PLAYER_LEFT': {
        const leavingPlayer = ensurePlayer(state, event.payload.playerId);
        releaseAllOwnershipBy(state, leavingPlayer.id);
        leavingPlayer.presence.connectionStatus = 'disconnected';
        leavingPlayer.ready = false;
        leavingPlayer.presence.lastHeartbeatAt = timestamp;
        addDiagnostic(state, 'warn', 'session', `${leavingPlayer.displayName} left the room.`, timestamp, {
          playerId: leavingPlayer.id,
          reason: event.payload.reason,
        });

        if (leavingPlayer.isHost) {
          const nextHostId = selectNextHost(state);
          if (nextHostId) {
            Object.values(state.participants).forEach((playerEntry) => {
              playerEntry.isHost = playerEntry.id === nextHostId;
            });
            state.hostId = nextHostId;
            addDiagnostic(state, 'info', 'session', `Host migrated to ${state.participants[nextHostId]?.displayName ?? nextHostId}.`, timestamp, {
              hostId: nextHostId,
            });
          }
        }

        if (getConnectedPlayerIds(state).length < lesson.targetPlayers.min && state.phase !== 'completed') {
          state.phase = 'alignment';
          state.coLocation.reAlignmentNeeded = true;
          state.coLocation.statusMessage = 'Waiting for enough connected participants to continue the shared lesson.';
        }

        return accept(state, timestamp);
      }

      case 'ROOM_RESET': {
        ensureHost(state, event.actorId);
        const preserveAlignment = event.payload.preserveAlignment ?? true;

        Object.values(state.participants).forEach((player) => {
          player.presence.heldObjectId = null;
          player.ready = preserveAlignment;
          if (!preserveAlignment) {
            player.alignment.status = player.isHost ? 'awaiting-origin' : 'not-started';
            player.alignment.confidence = 'low';
            player.alignment.lastConfirmedAt = null;
            player.alignment.localCalibrationOffset = null;
          }
        });

        state.lesson.currentRound = 0;
        state.lesson.currentChallengeIndex = 0;
        state.lesson.currentChallengeId = lesson.challenges[0]?.id ?? null;
        state.lesson.activeChallenge = null;
        state.lesson.completedChallengeIds = [];
        state.lesson.celebration = null;
        state.objects = {};
        state.quiz = null;
        state.score = {
          teamScore: 0,
          perPlayer: Object.fromEntries(state.participantOrder.map((playerId) => [playerId, 0])),
          history: [],
        };
        state.phase = preserveAlignment && allConnectedPlayersAligned(state) ? 'lessonIntro' : 'alignment';
        state.coLocation.reAlignmentNeeded = !preserveAlignment;
        if (!preserveAlignment) {
          state.coLocation.sharedOrigin.establishedBy = null;
          state.coLocation.sharedOrigin.establishedAt = null;
          state.coLocation.sharedOrigin.transform = identityTransform();
        }
        state.coLocation.statusMessage = preserveAlignment
          ? 'Room reset complete. Host can spawn the lesson again.'
          : 'Room reset complete. Re-establish the shared origin before starting again.';
        addDiagnostic(state, 'info', 'session', 'Room reset by host.', timestamp, {
          preserveAlignment,
        });

        return accept(state, timestamp);
      }

      case 'HEARTBEAT': {
        const player = ensurePlayer(state, event.actorId);
        player.presence.lastHeartbeatAt = timestamp;
        if (player.presence.connectionStatus === 'reconnecting') {
          player.presence.connectionStatus = 'connected';
        }
        return accept(state, timestamp, {
          bumpVersion: false,
        });
      }

      case 'REQUEST_STATE_SYNC': {
        addDiagnostic(state, 'debug', 'network', 'Client requested a state sync.', timestamp, {
          actorId: event.actorId,
          reason: event.payload.reason,
        });
        return accept(state, timestamp, {
          bumpVersion: false,
        });
      }
    }
  } catch (error) {
    if (error instanceof RoomLabDomainError) {
      return reject(currentState, error.issue, timestamp);
    }

    return reject(
      currentState,
      createRoomError('INVALID_STATE_TRANSITION', 'Unexpected state transition failure.', true, {
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      timestamp,
    );
  }
};
