import { useEffect, useRef, useState } from 'react';
import { getLessonDefinition, makeTransform, type PlayerState, type RoomState } from '../../../shared/src';

interface SpatialWorkspaceProps {
  roomState: RoomState | null;
  currentPlayer: PlayerState | null;
  onPickup: (objectId: string) => void;
  onMove: (objectId: string, transform: RoomState['objects'][string]['transform']) => void;
  onPlace: (objectId: string, slotId: string) => void;
  onRelease: (objectId: string) => void;
}

const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 470;
const ORIGIN_X = CANVAS_WIDTH * 0.62;
const ORIGIN_Y = CANVAS_HEIGHT * 0.5;
const METERS_TO_PIXELS = 340;
const SLOT_THRESHOLD = 54;

const toCanvasPoint = (x: number, z: number) => ({
  x: ORIGIN_X + x * METERS_TO_PIXELS,
  y: ORIGIN_Y + z * METERS_TO_PIXELS,
});

const toSharedPosition = (clientX: number, clientY: number, bounds: DOMRect) => ({
  x: (clientX - bounds.left - ORIGIN_X) / METERS_TO_PIXELS,
  z: (clientY - bounds.top - ORIGIN_Y) / METERS_TO_PIXELS,
});

const findNearestSlotId = (
  activeChallenge: NonNullable<RoomState['lesson']['activeChallenge']> | null | undefined,
  clientX: number,
  clientY: number,
  bounds: DOMRect,
): string | null => {
  if (!activeChallenge) {
    return null;
  }

  const nearestSlot = activeChallenge.slotOrder
    .map((slotId) => activeChallenge.slots[slotId])
    .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot))
    .map((slot) => {
      const canvas = toCanvasPoint(slot.transform.position.x, slot.transform.position.z);
      const dx = canvas.x - (clientX - bounds.left);
      const dy = canvas.y - (clientY - bounds.top);
      return {
        slotId: slot.slotId,
        distance: Math.sqrt(dx * dx + dy * dy),
      };
    })
    .sort((left, right) => left.distance - right.distance)[0];

  return nearestSlot && nearestSlot.distance < SLOT_THRESHOLD ? nearestSlot.slotId : null;
};

export const SpatialWorkspace = ({
  roomState,
  currentPlayer,
  onPickup,
  onMove,
  onPlace,
  onRelease,
}: SpatialWorkspaceProps) => {
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const dragObjectIdRef = useRef<string | null>(null);
  const hoverSlotIdRef = useRef<string | null>(null);
  const [hoverSlotId, setHoverSlotId] = useState<string | null>(null);

  const activeChallenge = roomState?.lesson.activeChallenge;
  const lesson = roomState ? getLessonDefinition(roomState.lessonId) : getLessonDefinition('molecule-builder');
  const challengeDefinition = roomState ? lesson.challenges[roomState.lesson.currentChallengeIndex] : undefined;
  const centralSlotId = activeChallenge?.slotOrder.find((slotId) => activeChallenge.slots[slotId]?.isCentralAtom) ?? null;
  const canInteract = roomState?.phase === 'building' && currentPlayer?.alignment.status === 'aligned';
  const workspaceSubtitle = challengeDefinition
    ? `${challengeDefinition.formula} · ${challengeDefinition.geometry} · ${challengeDefinition.bondCount} bonds`
    : roomState?.phase === 'lessonIntro'
      ? 'Host can spawn the next molecule.'
      : 'Start a room to begin.';

  useEffect(() => {
    const releaseDraggedAtom = () => {
      if (!dragObjectIdRef.current) {
        return;
      }

      if (hoverSlotIdRef.current) {
        onPlace(dragObjectIdRef.current, hoverSlotIdRef.current);
      } else {
        onRelease(dragObjectIdRef.current);
      }

      dragObjectIdRef.current = null;
      hoverSlotIdRef.current = null;
      setHoverSlotId(null);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragObjectIdRef.current || !workspaceRef.current || !canInteract) {
        return;
      }

      if (event.pointerType === 'mouse' && event.buttons === 0) {
        releaseDraggedAtom();
        return;
      }

      const bounds = workspaceRef.current.getBoundingClientRect();
      const sharedPosition = toSharedPosition(event.clientX, event.clientY, bounds);
      const transform = makeTransform(sharedPosition.x, 0, sharedPosition.z);
      onMove(dragObjectIdRef.current, transform);

      const nextHoverSlotId = findNearestSlotId(activeChallenge, event.clientX, event.clientY, bounds);
      hoverSlotIdRef.current = nextHoverSlotId;
      setHoverSlotId(nextHoverSlotId);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', releaseDraggedAtom);
    window.addEventListener('pointercancel', releaseDraggedAtom);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', releaseDraggedAtom);
      window.removeEventListener('pointercancel', releaseDraggedAtom);
    };
  }, [activeChallenge, canInteract, onMove, onPlace, onRelease]);

  return (
    <section className="panel panel-workspace">
      <div className="panel-heading">
        <p className="eyebrow">Spatial scene</p>
        <h2>{challengeDefinition?.title ?? 'Shared workspace'}</h2>
      </div>

      <div className="workspace-toolbar">
        <div className="workspace-tags">
          {challengeDefinition ? (
            <>
              <span className="mini-pill">{challengeDefinition.formula}</span>
              <span className="mini-pill">{challengeDefinition.geometry}</span>
              <span className="mini-pill">{challengeDefinition.bondCount} bonds</span>
            </>
          ) : null}
        </div>
        <p className="muted-text">{workspaceSubtitle}</p>
      </div>

      <div className="workspace" ref={workspaceRef}>
        <div className="workspace-backdrop" />
        <div className="shared-origin-marker">
          <span>Shared origin</span>
        </div>

        {activeChallenge && centralSlotId ? (
          <svg className="workspace-bonds" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
            {activeChallenge.slotOrder
              .filter((slotId) => slotId !== centralSlotId)
              .map((slotId) => {
                const slot = activeChallenge.slots[slotId];
                const central = activeChallenge.slots[centralSlotId];
                if (!slot || !central) {
                  return null;
                }

                const start = toCanvasPoint(central.transform.position.x, central.transform.position.z);
                const end = toCanvasPoint(slot.transform.position.x, slot.transform.position.z);
                return (
                  <line
                    key={slotId}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="rgba(245, 239, 220, 0.3)"
                    strokeWidth="4"
                    strokeDasharray="10 8"
                  />
                );
              })}
          </svg>
        ) : null}

        {activeChallenge
          ? activeChallenge.slotOrder.map((slotId) => {
              const slot = activeChallenge.slots[slotId];
              if (!slot) {
                return null;
              }

              const point = toCanvasPoint(slot.transform.position.x, slot.transform.position.z);
              const occupiedAtom = slot.occupiedObjectId ? roomState?.objects[slot.occupiedObjectId] : null;
              return (
                <div
                  className={`slot ${hoverSlotId === slot.slotId ? 'slot-hover' : ''} ${occupiedAtom ? 'slot-filled' : ''}`}
                  key={slot.slotId}
                  style={{
                    left: point.x,
                    top: point.y,
                  }}
                >
                  <span>{slot.expectedElement}</span>
                  <small>{slot.label}</small>
                </div>
              );
            })
          : null}

        {roomState
          ? Object.values(roomState.objects).map((atom) => {
              const point = toCanvasPoint(atom.transform.position.x, atom.transform.position.z);
              const isOwnedByCurrentPlayer = atom.ownerId === currentPlayer?.id;
              const isInteractable = canInteract && (!atom.ownerId || isOwnedByCurrentPlayer) && atom.lifecycle !== 'slotted';

              return (
                <button
                  key={atom.objectId}
                  className={`atom-chip ${isOwnedByCurrentPlayer ? 'atom-owned' : ''} ${
                    atom.lifecycle === 'slotted' ? 'atom-slotted' : ''
                  }`}
                  style={{
                    left: point.x,
                    top: point.y,
                    backgroundColor: atom.colorHex,
                  }}
                  onPointerDown={(event) => {
                    if (!isInteractable) {
                      return;
                    }

                    event.preventDefault();
                    dragObjectIdRef.current = atom.objectId;
                    onPickup(atom.objectId);
                  }}
                  disabled={!isInteractable}
                >
                  <strong>{atom.element}</strong>
                  <span>{atom.ownerId ? `Held by ${roomState.participants[atom.ownerId]?.displayName ?? 'peer'}` : atom.label}</span>
                </button>
              );
            })
          : null}

        {roomState?.lesson.celebration ? (
          <div className="celebration-banner">
            <strong>{roomState.lesson.celebration.moleculeName}</strong>
            <p>{roomState.lesson.celebration.quickFact}</p>
            <span>{roomState.lesson.celebration.callToAction}</span>
          </div>
        ) : null}
      </div>

      <div className="workspace-legend">
        <span>Drag atoms into matching slots.</span>
        <span>Wrong drops snap back to the tray.</span>
        <span>Open another tab if you want to test sync.</span>
      </div>
    </section>
  );
};
