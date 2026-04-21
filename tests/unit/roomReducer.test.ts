import { describe, expect, it } from 'vitest';
import {
  createRoomState,
  getLessonDefinition,
  identityTransform,
  makeTransform,
  reduceRoomEvent,
  type RoomDomainEvent,
  type RoomState,
} from '../../shared/src';

const lesson = getLessonDefinition('molecule-builder');

const buildEvent = <TEvent extends Omit<RoomDomainEvent, 'eventId' | 'timestamp'>>(
  event: TEvent,
  sequence: number,
): RoomDomainEvent => ({
  ...event,
  eventId: `evt-${sequence}`,
  timestamp: 1_000 + sequence,
}) as RoomDomainEvent;

const createSeedRoom = (): RoomState =>
  createRoomState({
    roomId: 'lab-101',
    lesson,
    hostId: 'host-player',
    displayName: 'Host',
    now: 1,
  });

const applyAccepted = (state: RoomState, event: Omit<RoomDomainEvent, 'eventId' | 'timestamp'>, sequence: number): RoomState => {
  const result = reduceRoomEvent(state, buildEvent(event, sequence), lesson);
  expect(result.accepted, result.error?.message).toBe(true);
  return result.state;
};

const prepareAlignedWaterRoom = (): RoomState => {
  let state = createSeedRoom();
  state = applyAccepted(
    state,
    {
      type: 'JOIN_ROOM',
      actorId: 'guest-player',
      payload: {
        roomId: 'lab-101',
        lessonId: lesson.id,
        playerId: 'guest-player',
        displayName: 'Guest',
      },
    },
    1,
  );
  state = applyAccepted(
    state,
    {
      type: 'PLAYER_READY',
      actorId: 'host-player',
      payload: {
        roomId: 'lab-101',
        ready: true,
      },
    },
    2,
  );
  state = applyAccepted(
    state,
    {
      type: 'PLAYER_READY',
      actorId: 'guest-player',
      payload: {
        roomId: 'lab-101',
        ready: true,
      },
    },
    3,
  );
  state = applyAccepted(
    state,
    {
      type: 'SET_SHARED_ORIGIN',
      actorId: 'host-player',
      payload: {
        roomId: 'lab-101',
        transform: makeTransform(0, 0, 0),
      },
    },
    4,
  );
  state = applyAccepted(
    state,
    {
      type: 'COLOCATION_CONFIRMED',
      actorId: 'guest-player',
      payload: {
        roomId: 'lab-101',
        localCalibrationOffset: identityTransform(),
        confidence: 'high',
      },
    },
    5,
  );
  state = applyAccepted(
    state,
    {
      type: 'SPAWN_LESSON',
      actorId: 'host-player',
      payload: {
        roomId: 'lab-101',
      },
    },
    6,
  );
  return state;
};

describe('roomReducer', () => {
  it('lets a single host progress from setup into the first lesson', () => {
    let state = createSeedRoom();

    state = applyAccepted(
      state,
      {
        type: 'PLAYER_READY',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          ready: true,
        },
      },
      1,
    );

    state = applyAccepted(
      state,
      {
        type: 'SET_SHARED_ORIGIN',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          transform: makeTransform(0, 0, 0),
        },
      },
      2,
    );

    expect(state.phase).toBe('lessonIntro');

    state = applyAccepted(
      state,
      {
        type: 'SPAWN_LESSON',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
        },
      },
      3,
    );

    expect(state.phase).toBe('building');
    expect(state.lesson.currentChallengeId).toBe('water-build');
  });

  it('validates a correct H2O assembly and awards shared score', () => {
    let state = prepareAlignedWaterRoom();

    state = applyAccepted(
      state,
      {
        type: 'PICKUP_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-1',
        },
      },
      7,
    );
    state = applyAccepted(
      state,
      {
        type: 'PLACE_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-1',
          slotId: 'water-center',
        },
      },
      8,
    );

    state = applyAccepted(
      state,
      {
        type: 'PICKUP_ATOM',
        actorId: 'guest-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-2',
        },
      },
      9,
    );
    state = applyAccepted(
      state,
      {
        type: 'PLACE_ATOM',
        actorId: 'guest-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-2',
          slotId: 'water-h1',
        },
      },
      10,
    );

    state = applyAccepted(
      state,
      {
        type: 'PICKUP_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-3',
        },
      },
      11,
    );
    state = applyAccepted(
      state,
      {
        type: 'PLACE_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-3',
          slotId: 'water-h2',
        },
      },
      12,
    );

    expect(state.phase).toBe('roundComplete');
    expect(state.lesson.activeChallenge?.status).toBe('assembled');
    expect(state.score.teamScore).toBe(100);
    expect(state.lesson.celebration?.formula).toBe('H2O');
  });

  it('rejects an invalid placement when the wrong atom is used', () => {
    let state = prepareAlignedWaterRoom();
    state = applyAccepted(
      state,
      {
        type: 'PICKUP_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-4',
        },
      },
      7,
    );

    const result = reduceRoomEvent(
      state,
      buildEvent(
        {
          type: 'PLACE_ATOM',
          actorId: 'host-player',
          payload: {
            roomId: 'lab-101',
            objectId: 'water-build-atom-4',
            slotId: 'water-h1',
          },
        },
        8,
      ),
      lesson,
    );

    expect(result.accepted).toBe(false);
    expect(result.error?.code).toBe('INVALID_PLACEMENT');
    expect(state.lesson.activeChallenge?.slots['water-h1']?.occupiedObjectId).toBeNull();
  });

  it('enforces ownership and then allows transfer after release', () => {
    let state = prepareAlignedWaterRoom();
    state = applyAccepted(
      state,
      {
        type: 'PICKUP_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-1',
        },
      },
      7,
    );

    const conflict = reduceRoomEvent(
      state,
      buildEvent(
        {
          type: 'PICKUP_ATOM',
          actorId: 'guest-player',
          payload: {
            roomId: 'lab-101',
            objectId: 'water-build-atom-1',
          },
        },
        8,
      ),
      lesson,
    );

    expect(conflict.accepted).toBe(false);
    expect(conflict.error?.code).toBe('OWNERSHIP_CONFLICT');

    state = applyAccepted(
      state,
      {
        type: 'RELEASE_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-1',
        },
      },
      9,
    );
    state = applyAccepted(
      state,
      {
        type: 'PICKUP_ATOM',
        actorId: 'guest-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-1',
        },
      },
      10,
    );

    expect(state.objects['water-build-atom-1']?.ownerId).toBe('guest-player');
  });

  it('returns released atoms to their tray position', () => {
    let state = prepareAlignedWaterRoom();
    const trayTransform = state.objects['water-build-atom-1']!.trayTransform;

    state = applyAccepted(
      state,
      {
        type: 'PICKUP_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-1',
        },
      },
      7,
    );

    state = applyAccepted(
      state,
      {
        type: 'MOVE_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-1',
          transform: makeTransform(0.35, 0, 0.18),
        },
      },
      8,
    );

    state = applyAccepted(
      state,
      {
        type: 'RELEASE_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-1',
        },
      },
      9,
    );

    expect(state.objects['water-build-atom-1']?.lifecycle).toBe('tray');
    expect(state.objects['water-build-atom-1']?.transform).toEqual(trayTransform);
  });

  it('migrates the host role and marks the departed player disconnected', () => {
    let state = prepareAlignedWaterRoom();

    state = applyAccepted(
      state,
      {
        type: 'PLAYER_LEFT',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          playerId: 'host-player',
          reason: 'disconnect',
        },
      },
      7,
    );

    expect(state.hostId).toBe('guest-player');
    expect(state.participants['host-player']?.presence.connectionStatus).toBe('disconnected');
    expect(state.participants['guest-player']?.isHost).toBe(true);
  });

  it('keeps the room playable when one participant remains connected', () => {
    let state = prepareAlignedWaterRoom();

    state = applyAccepted(
      state,
      {
        type: 'PLAYER_LEFT',
        actorId: 'guest-player',
        payload: {
          roomId: 'lab-101',
          playerId: 'guest-player',
          reason: 'disconnect',
        },
      },
      7,
    );

    expect(state.phase).toBe('building');
    expect(state.participants['guest-player']?.presence.connectionStatus).toBe('disconnected');
  });

  it('marks late joiners for guided re-alignment during an active build', () => {
    let state = prepareAlignedWaterRoom();

    state = applyAccepted(
      state,
      {
        type: 'JOIN_ROOM',
        actorId: 'late-player',
        payload: {
          roomId: 'lab-101',
          lessonId: lesson.id,
          playerId: 'late-player',
          displayName: 'Late learner',
        },
      },
      7,
    );

    expect(state.participants['late-player']?.alignment.status).toBe('pending');
    expect(state.coLocation.reAlignmentNeeded).toBe(true);
    expect(state.phase).toBe('building');
  });

  it('advances quiz state and awards quiz points for correct answers', () => {
    let state = prepareAlignedWaterRoom();
    state = applyAccepted(
      state,
      {
        type: 'PICKUP_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-1',
        },
      },
      7,
    );
    state = applyAccepted(
      state,
      {
        type: 'PLACE_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-1',
          slotId: 'water-center',
        },
      },
      8,
    );
    state = applyAccepted(
      state,
      {
        type: 'PICKUP_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-2',
        },
      },
      9,
    );
    state = applyAccepted(
      state,
      {
        type: 'PLACE_ATOM',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-2',
          slotId: 'water-h1',
        },
      },
      10,
    );
    state = applyAccepted(
      state,
      {
        type: 'PICKUP_ATOM',
        actorId: 'guest-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-3',
        },
      },
      11,
    );
    state = applyAccepted(
      state,
      {
        type: 'PLACE_ATOM',
        actorId: 'guest-player',
        payload: {
          roomId: 'lab-101',
          objectId: 'water-build-atom-3',
          slotId: 'water-h2',
        },
      },
      12,
    );

    state = applyAccepted(
      state,
      {
        type: 'QUIZ_START',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
        },
      },
      13,
    );

    state = applyAccepted(
      state,
      {
        type: 'QUIZ_SUBMIT',
        actorId: 'host-player',
        payload: {
          roomId: 'lab-101',
          questionId: 'water-geometry',
          optionId: 'bent',
        },
      },
      14,
    );

    state = applyAccepted(
      state,
      {
        type: 'QUIZ_SUBMIT',
        actorId: 'guest-player',
        payload: {
          roomId: 'lab-101',
          questionId: 'water-geometry',
          optionId: 'linear',
        },
      },
      15,
    );

    expect(state.phase).toBe('quiz');
    expect(state.quiz?.currentQuestionIndex).toBe(1);
    expect(state.score.teamScore).toBe(120);
    expect(state.score.perPlayer['host-player']).toBeGreaterThan(state.score.perPlayer['guest-player'] ?? 0);
  });
});
