import type { Quaternion, SharedTransform, Vec3 } from '../types/primitives';

export const identityQuaternion = (): Quaternion => ({
  x: 0,
  y: 0,
  z: 0,
  w: 1,
});

export const vec3 = (x = 0, y = 0, z = 0): Vec3 => ({
  x,
  y,
  z,
});

export const identityTransform = (): SharedTransform => ({
  position: vec3(),
  rotation: identityQuaternion(),
  scale: vec3(1, 1, 1),
});

export const makeTransform = (x: number, y: number, z: number): SharedTransform => ({
  position: vec3(x, y, z),
  rotation: identityQuaternion(),
  scale: vec3(1, 1, 1),
});

export const distanceBetween = (a: Vec3, b: Vec3): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const addVec3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

export const subtractVec3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

export const convertLocalToShared = (
  local: SharedTransform,
  sharedOrigin: SharedTransform,
  calibrationOffset: SharedTransform,
): SharedTransform => ({
  position: addVec3(sharedOrigin.position, subtractVec3(local.position, calibrationOffset.position)),
  rotation: local.rotation,
  scale: local.scale,
});

export const convertSharedToLocal = (
  shared: SharedTransform,
  sharedOrigin: SharedTransform,
  calibrationOffset: SharedTransform,
): SharedTransform => ({
  position: addVec3(calibrationOffset.position, subtractVec3(shared.position, sharedOrigin.position)),
  rotation: shared.rotation,
  scale: shared.scale,
});
