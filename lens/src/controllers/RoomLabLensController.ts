import type { RoomState, SharedTransform } from '../../../shared/src';
import type { AlignmentAdapter } from '../adapters/AlignmentAdapter';
import type { InteractionAdapter } from '../adapters/InteractionAdapter';
import type { SyncAdapter } from '../adapters/SyncAdapter';

export interface RoomLabLensControllerOptions {
  playerId: string;
  roomId: string;
  displayName: string;
  lessonId?: string;
  syncAdapter: SyncAdapter;
  alignmentAdapter: AlignmentAdapter;
  interactionAdapter: InteractionAdapter;
  onStateChanged?: (state: RoomState) => void;
  onError?: (message: string) => void;
}

export class RoomLabLensController {
  private state: RoomState | null = null;

  private readonly lessonId: string;

  public constructor(private readonly options: RoomLabLensControllerOptions) {
    this.lessonId = options.lessonId ?? 'molecule-builder';
  }

  public async connect(): Promise<void> {
    await this.options.syncAdapter.connect();

    this.options.syncAdapter.onStateHydrated((payload) => {
      this.state = payload.state;
      this.options.onStateChanged?.(payload.state);
    });

    this.options.syncAdapter.onRejected((error) => {
      this.options.onError?.(error.message);
    });

    this.bindInteractions();
  }

  public hostRoom(): void {
    this.options.syncAdapter.send(
      {
        type: 'CREATE_ROOM',
        payload: {
          roomId: this.options.roomId,
          lessonId: this.lessonId,
          playerId: this.options.playerId,
          displayName: this.options.displayName,
        },
      },
      this.options.playerId,
      this.state?.version,
    );
  }

  public joinRoom(): void {
    this.options.syncAdapter.send(
      {
        type: 'JOIN_ROOM',
        payload: {
          roomId: this.options.roomId,
          lessonId: this.lessonId,
          playerId: this.options.playerId,
          displayName: this.options.displayName,
        },
      },
      this.options.playerId,
      this.state?.version,
    );
  }

  public setReady(ready: boolean): void {
    this.options.syncAdapter.send(
      {
        type: 'PLAYER_READY',
        payload: {
          roomId: this.options.roomId,
          ready,
        },
      },
      this.options.playerId,
      this.state?.version,
    );
  }

  public async establishSharedOrigin(): Promise<void> {
    const transform = await this.options.alignmentAdapter.establishSharedOrigin();
    this.options.syncAdapter.send(
      {
        type: 'SET_SHARED_ORIGIN',
        payload: {
          roomId: this.options.roomId,
          transform,
        },
      },
      this.options.playerId,
      this.state?.version,
    );
  }

  public async confirmAlignment(): Promise<void> {
    const alignment = await this.options.alignmentAdapter.confirmNearbyAlignment();
    this.options.syncAdapter.send(
      {
        type: 'COLOCATION_CONFIRMED',
        payload: {
          roomId: this.options.roomId,
          localCalibrationOffset: alignment.localCalibrationOffset,
          confidence: alignment.confidence,
        },
      },
      this.options.playerId,
      this.state?.version,
    );
  }

  public spawnLesson(): void {
    this.options.syncAdapter.send(
      {
        type: 'SPAWN_LESSON',
        payload: {
          roomId: this.options.roomId,
        },
      },
      this.options.playerId,
      this.state?.version,
    );
  }

  public startQuiz(): void {
    this.options.syncAdapter.send(
      {
        type: 'QUIZ_START',
        payload: {
          roomId: this.options.roomId,
        },
      },
      this.options.playerId,
      this.state?.version,
    );
  }

  public submitQuiz(questionId: string, optionId: string): void {
    this.options.syncAdapter.send(
      {
        type: 'QUIZ_SUBMIT',
        payload: {
          roomId: this.options.roomId,
          questionId,
          optionId,
        },
      },
      this.options.playerId,
      this.state?.version,
    );
  }

  private bindInteractions(): void {
    this.options.interactionAdapter.onGrabStarted(({ objectId }) => {
      this.options.syncAdapter.send(
        {
          type: 'PICKUP_ATOM',
          payload: {
            roomId: this.options.roomId,
            objectId,
          },
        },
        this.options.playerId,
        this.state?.version,
      );
    });

    this.options.interactionAdapter.onGrabMoved(({ objectId, sharedTransform }) => {
      this.options.syncAdapter.send(
        {
          type: 'MOVE_ATOM',
          payload: {
            roomId: this.options.roomId,
            objectId,
            transform: sharedTransform,
          },
        },
        this.options.playerId,
        this.state?.version,
      );
    });

    this.options.interactionAdapter.onGrabReleased(({ objectId, sharedTransform }) => {
      const slotId = this.findNearestSlot(sharedTransform);
      if (slotId) {
        this.options.syncAdapter.send(
          {
            type: 'PLACE_ATOM',
            payload: {
              roomId: this.options.roomId,
              objectId,
              slotId,
            },
          },
          this.options.playerId,
          this.state?.version,
        );
        return;
      }

      this.options.syncAdapter.send(
        {
          type: 'RELEASE_ATOM',
          payload: {
            roomId: this.options.roomId,
            objectId,
          },
        },
        this.options.playerId,
        this.state?.version,
      );
    });
  }

  private findNearestSlot(sharedTransform: SharedTransform): string | null {
    const challenge = this.state?.lesson.activeChallenge;
    if (!challenge) {
      return null;
    }

    const nearest = challenge.slotOrder
      .map((slotId) => challenge.slots[slotId])
      .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot))
      .map((slot) => ({
        slotId: slot.slotId,
        distance: Math.hypot(
          slot.transform.position.x - sharedTransform.position.x,
          slot.transform.position.z - sharedTransform.position.z,
        ),
      }))
      .sort((left, right) => left.distance - right.distance)[0];

    return nearest && nearest.distance < 0.12 ? nearest.slotId : null;
  }
}
