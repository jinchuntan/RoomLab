import type { SharedTransform, SpatialConfidence } from '../../../shared/src';
import { identityTransform, makeTransform } from '../../../shared/src';

const hashPlayerId = (playerId: string): number =>
  playerId.split('').reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);

export class BrowserAlignmentAdapter {
  public constructor(private readonly playerId: string) {}

  public establishSharedOrigin(): SharedTransform {
    return makeTransform(0, 0, 0);
  }

  public confirmNearbyAlignment(): { localCalibrationOffset: SharedTransform; confidence: SpatialConfidence } {
    const hash = hashPlayerId(this.playerId);
    const offsetX = ((hash % 5) - 2) * 0.01;
    const offsetZ = (((hash >> 2) % 5) - 2) * 0.01;

    return {
      localCalibrationOffset: {
        ...identityTransform(),
        position: {
          x: offsetX,
          y: 0,
          z: offsetZ,
        },
      },
      confidence: Math.abs(offsetX) + Math.abs(offsetZ) < 0.02 ? 'high' : 'medium',
    };
  }
}
