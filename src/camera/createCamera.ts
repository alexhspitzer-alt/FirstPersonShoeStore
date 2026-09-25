import { Camera } from '@babylonjs/core/Cameras/camera';
import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import { VIEW } from '../config';

export function createCamera(scene: Scene): TargetCamera {
  // TargetCamera has no keyboard/mouse/touch input manager. No attachControl call.
  const camera = new TargetCamera(
    'store-camera',
    new Vector3(VIEW.x, VIEW.eyeHeight, VIEW.z),
    scene,
  );
  camera.setTarget(new Vector3(VIEW.target.x, VIEW.target.y, VIEW.target.z));
  // Preserve the room's horizontal composition when a phone rotates to portrait.
  camera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
  camera.fov = VIEW.horizontalFov;
  camera.minZ = VIEW.nearClip;
  camera.maxZ = VIEW.farClip;
  scene.activeCamera = camera;
  return camera;
}
