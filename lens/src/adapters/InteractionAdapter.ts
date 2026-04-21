import type { SharedTransform } from '../../../shared/src';

export interface GrabEventPayload {
  objectId: string;
  sharedTransform: SharedTransform;
}

export interface InteractionAdapter {
  onGrabStarted(listener: (payload: GrabEventPayload) => void): void;
  onGrabMoved(listener: (payload: GrabEventPayload) => void): void;
  onGrabReleased(listener: (payload: GrabEventPayload) => void): void;
}
