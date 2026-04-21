export type PlayerId = string;
export type RoomId = string;
export type LessonId = string;
export type ChallengeId = string;
export type ObjectId = string;
export type SlotId = string;
export type EventId = string;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface SharedTransform {
  position: Vec3;
  rotation: Quaternion;
  scale: Vec3;
}
