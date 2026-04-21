import { convertLocalToShared, identityTransform, type RoomClientEvent, type RoomHydrationPayload, type RoomLabError, type SharedTransform } from '../../../shared/src';
import type { AlignmentAdapter, AlignmentResult } from './AlignmentAdapter';
import type { GrabEventPayload, InteractionAdapter } from './InteractionAdapter';
import type { SyncAdapter } from './SyncAdapter';

export class MockAlignmentAdapter implements AlignmentAdapter {
  private sharedOrigin = identityTransform();

  private calibrationOffset = identityTransform();

  public async establishSharedOrigin(): Promise<SharedTransform> {
    this.sharedOrigin = identityTransform();
    return this.sharedOrigin;
  }

  public async confirmNearbyAlignment(): Promise<AlignmentResult> {
    this.calibrationOffset = identityTransform();
    return {
      localCalibrationOffset: this.calibrationOffset,
      confidence: 'high',
    };
  }

  public convertLocalToShared(localTransform: SharedTransform): SharedTransform {
    return convertLocalToShared(localTransform, this.sharedOrigin, this.calibrationOffset);
  }
}

export class MockInteractionAdapter implements InteractionAdapter {
  private grabStartedListeners: Array<(payload: GrabEventPayload) => void> = [];

  private grabMovedListeners: Array<(payload: GrabEventPayload) => void> = [];

  private grabReleasedListeners: Array<(payload: GrabEventPayload) => void> = [];

  public onGrabStarted(listener: (payload: GrabEventPayload) => void): void {
    this.grabStartedListeners.push(listener);
  }

  public onGrabMoved(listener: (payload: GrabEventPayload) => void): void {
    this.grabMovedListeners.push(listener);
  }

  public onGrabReleased(listener: (payload: GrabEventPayload) => void): void {
    this.grabReleasedListeners.push(listener);
  }

  public simulateGrabStart(payload: GrabEventPayload): void {
    this.grabStartedListeners.forEach((listener) => listener(payload));
  }

  public simulateGrabMove(payload: GrabEventPayload): void {
    this.grabMovedListeners.forEach((listener) => listener(payload));
  }

  public simulateGrabRelease(payload: GrabEventPayload): void {
    this.grabReleasedListeners.forEach((listener) => listener(payload));
  }
}

export class MockConnectedLensAdapter implements SyncAdapter {
  private stateListeners: Array<(payload: RoomHydrationPayload) => void> = [];

  private rejectedListeners: Array<(error: RoomLabError) => void> = [];

  public readonly sentEvents: RoomClientEvent[] = [];

  public async connect(): Promise<void> {
    return Promise.resolve();
  }

  public send(event: RoomClientEvent): void {
    this.sentEvents.push(event);
  }

  public onStateHydrated(listener: (payload: RoomHydrationPayload) => void): void {
    this.stateListeners.push(listener);
  }

  public onRejected(listener: (error: RoomLabError) => void): void {
    this.rejectedListeners.push(listener);
  }

  public emitState(payload: RoomHydrationPayload): void {
    this.stateListeners.forEach((listener) => listener(payload));
  }

  public emitRejected(error: RoomLabError): void {
    this.rejectedListeners.forEach((listener) => listener(error));
  }

  public disconnect(): void {}
}
