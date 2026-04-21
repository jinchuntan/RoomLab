import type { RoomHydrationPayload, RoomState } from '../types/domain';
import { deepClone } from './clone';

export const createHydrationPayload = (
  state: RoomState,
  reason: RoomHydrationPayload['reason'],
  serverTime = Date.now(),
): RoomHydrationPayload => ({
  roomId: state.roomId,
  version: state.version,
  reason,
  state: deepClone(state),
  serverTime,
});

export const versionGapIsSuspicious = (localVersion: number | undefined, incomingVersion: number): boolean => {
  if (localVersion === undefined) {
    return false;
  }

  return incomingVersion < localVersion || incomingVersion > localVersion + 5;
};
