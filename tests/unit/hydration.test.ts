import { describe, expect, it } from 'vitest';
import { createHydrationPayload, createRoomState, getLessonDefinition } from '../../shared/src';

describe('hydration payloads', () => {
  it('captures a deep-cloned late-join snapshot', () => {
    const lesson = getLessonDefinition('molecule-builder');
    const state = createRoomState({
      roomId: 'lab-101',
      lesson,
      hostId: 'host-player',
      displayName: 'Host',
      now: 1,
    });

    const hydration = createHydrationPayload(state, 'hydrate', 2_000);
    hydration.state.participants['host-player']!.displayName = 'Mutated';

    expect(hydration.version).toBe(state.version);
    expect(hydration.roomId).toBe('lab-101');
    expect(state.participants['host-player']?.displayName).toBe('Host');
    expect(hydration.serverTime).toBe(2_000);
  });
});
