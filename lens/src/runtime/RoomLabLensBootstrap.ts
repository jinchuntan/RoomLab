import { MockAlignmentAdapter, MockConnectedLensAdapter, MockInteractionAdapter } from '../adapters/MockSpectaclesAdapters';
import { RoomLabLensController } from '../controllers/RoomLabLensController';

export const bootstrapRoomLabLensMocks = () => {
  const syncAdapter = new MockConnectedLensAdapter();
  const alignmentAdapter = new MockAlignmentAdapter();
  const interactionAdapter = new MockInteractionAdapter();

  const controller = new RoomLabLensController({
    playerId: 'lens-player-demo',
    roomId: 'lens-room-demo',
    displayName: 'Spectacles Demo User',
    syncAdapter,
    alignmentAdapter,
    interactionAdapter,
    onError: (message) => {
      console.warn(`[lens] ${message}`);
    },
  });

  return {
    controller,
    syncAdapter,
    alignmentAdapter,
    interactionAdapter,
  };
};
