import type { SharedTransform } from '../../../shared/src';

export interface AlignmentResult {
  localCalibrationOffset: SharedTransform;
  confidence: 'low' | 'medium' | 'high';
}

export interface AlignmentAdapter {
  establishSharedOrigin(): Promise<SharedTransform>;
  confirmNearbyAlignment(): Promise<AlignmentResult>;
  convertLocalToShared(localTransform: SharedTransform): SharedTransform;
}
