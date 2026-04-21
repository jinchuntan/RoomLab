import type {
  ActiveChallengeState,
  LessonDefinition,
  MoleculeChallengeDefinition,
  ScoreEvent,
  SyncedAtomState,
} from '../types/domain';
import { atomCatalog } from '../content/moleculeBuilderLesson';
import type { PlayerId } from '../types/primitives';
import { makeTransform } from '../utils/transforms';

const trayX = -0.46;
const trayZStart = -0.24;
const trayZStep = 0.12;

export const getChallengeDefinition = (
  lesson: LessonDefinition,
  challengeId: string,
): MoleculeChallengeDefinition | undefined => lesson.challenges.find((challenge) => challenge.id === challengeId);

export const getCurrentChallengeDefinition = (
  lesson: LessonDefinition,
  challengeIndex: number,
): MoleculeChallengeDefinition | undefined => lesson.challenges[challengeIndex];

export const buildChallengeRuntime = (
  challenge: MoleculeChallengeDefinition,
  now: number,
): {
  activeChallenge: ActiveChallengeState;
  objects: Record<string, SyncedAtomState>;
} => {
  const objects: Record<string, SyncedAtomState> = {};
  const atomOrder = challenge.trayAtoms.map((_element, index) => `${challenge.id}-atom-${index + 1}`);

  challenge.trayAtoms.forEach((element, index) => {
    const objectId = atomOrder[index]!;
    const atom = atomCatalog[element];

    objects[objectId] = {
      objectId,
      kind: 'atom',
      element,
      label: atom.label,
      colorHex: atom.colorHex,
      transform: makeTransform(trayX, 0, trayZStart + trayZStep * index),
      trayTransform: makeTransform(trayX, 0, trayZStart + trayZStep * index),
      ownerId: null,
      lifecycle: 'tray',
      slotId: null,
      revision: 1,
      updatedAt: now,
      lastUpdatedBy: null,
    };
  });

  return {
    activeChallenge: {
      challengeId: challenge.id,
      status: 'building',
      atomOrder,
      slotOrder: challenge.slots.map((slot) => slot.slotId),
      slots: Object.fromEntries(
        challenge.slots.map((slot) => [
          slot.slotId,
          {
            slotId: slot.slotId,
            label: slot.label,
            expectedElement: slot.expectedElement,
            accepts: [...slot.accepts],
            bondOrder: slot.bondOrder,
            transform: slot.transform,
            occupiedObjectId: null,
            isCentralAtom: slot.isCentralAtom,
          },
        ]),
      ),
      assembledAt: null,
      completedAt: null,
    },
    objects,
  };
};

export const canAtomOccupySlot = (atom: SyncedAtomState, slot: ActiveChallengeState['slots'][string]): boolean =>
  slot.accepts.includes(atom.element) && slot.occupiedObjectId === null;

export const isChallengeAssembled = (
  activeChallenge: ActiveChallengeState,
  objects: Record<string, SyncedAtomState>,
): boolean =>
  activeChallenge.slotOrder.every((slotId) => {
    const slot = activeChallenge.slots[slotId];
    if (!slot?.occupiedObjectId) {
      return false;
    }

    const atom = objects[slot.occupiedObjectId];
    return atom?.element === slot.expectedElement;
  });

export const calculateBuildPoints = (participantCount: number): number => 80 + participantCount * 10;

export const calculateQuizPoints = (correct: boolean): number => (correct ? 20 : 0);

export const createScoreEvent = (
  eventId: string,
  reason: ScoreEvent['reason'],
  amount: number,
  awardedBy: PlayerId | 'system',
  challengeId: string | null,
  timestamp: number,
  note: string,
): ScoreEvent => ({
  eventId,
  reason,
  amount,
  awardedBy,
  challengeId,
  timestamp,
  note,
});
