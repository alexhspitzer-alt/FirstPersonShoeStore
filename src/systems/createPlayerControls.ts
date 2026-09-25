// Registers scene.pick for Babylon's modular imports.
import '@babylonjs/core/Culling/ray';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { CONTROLS, STORE, VIEW } from '../config';

export function createPlayerControls(scene: Scene, camera: TargetCamera, floor: Mesh) {
  let step: { start: Vector3; end: Vector3; elapsed: number } | undefined;
  const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

  return {
    look(deltaX: number, deltaY: number): void {
      camera.rotation.y -= deltaX * CONTROLS.lookRadiansPerPixel;
      camera.rotation.x = clamp(
        camera.rotation.x - deltaY * CONTROLS.lookRadiansPerPixel,
        -CONTROLS.maxPitch,
        CONTROLS.maxPitch,
      );
    },

    stepAt(x: number, y: number): void {
      // Don't queue steps: releasing a rapid sequence of double-taps must not cause
      // movement to continue later. Looking remains available during a step.
      if (step) return;
      const hit = scene.pick(x, y);
      // Pick all visible surfaces, so a wall/ceiling occludes the floor behind it.
      if (!hit?.hit || hit.pickedMesh !== floor || !hit.pickedPoint) return;
      const direction = hit.pickedPoint.subtract(camera.position);
      direction.y = 0;
      const distance = direction.length();
      if (distance < 0.001) return;
      const end = camera.position.add(direction.scale(Math.min(CONTROLS.stepDistance, distance) / distance));
      // Simple rectangular bounds for this empty room; no physics dependency.
      const halfWidth = STORE.width / 2 - CONTROLS.wallClearance;
      const halfDepth = STORE.depth / 2 - CONTROLS.wallClearance;
      end.x = clamp(end.x, -halfWidth, halfWidth);
      end.z = clamp(end.z, -halfDepth, halfDepth);
      end.y = VIEW.eyeHeight;
      step = { start: camera.position.clone(), end, elapsed: 0 };
    },

    update(deltaSeconds: number): void {
      if (!step) return;
      step.elapsed += deltaSeconds;
      const progress = Math.min(step.elapsed / CONTROLS.stepDurationSeconds, 1);
      const eased = progress * progress * (3 - 2 * progress);
      Vector3.LerpToRef(step.start, step.end, eased, camera.position);
      if (progress === 1) step = undefined;
    },
  };
}
