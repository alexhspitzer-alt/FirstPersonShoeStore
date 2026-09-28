import '@babylonjs/core/Culling/ray';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { ObjectDefinition } from '../objects/createObjectDefinition';

const HOLD_OFFSET = new Vector3(0, -0.18, 0.85);
const MAX_PICKUP_MASS = 25;
const GRAVITY = 9.8;

/** Game state owns carried and falling positions; definitions remain immutable. */
export function createObjectInteraction(
  scene: Scene,
  camera: TargetCamera,
  objects: readonly ObjectDefinition[],
  restingPairs: readonly (readonly [baseId: string, topId: string])[] = [],
) {
  const definitions = new Map(objects.map((object) => [object.id, object]));
  let held: Mesh | undefined;
  let fall: { mesh: Mesh; bottom: number; speed: number } | undefined;
  let attached: Mesh | undefined;

  function attachRestingObject(base: Mesh): void {
    for (const [baseId, topId] of restingPairs) {
      if (base.name !== baseId) continue;
      const top = scene.getMeshByName(topId) as Mesh | null;
      if (!top || top.parent || fall?.mesh === top) continue;
      base.computeWorldMatrix(true);
      top.computeWorldMatrix(true);
      const baseBounds = base.getBoundingInfo().boundingBox;
      const topBounds = top.getBoundingInfo().boundingBox;
      const baseTop = baseBounds.maximumWorld.y;
      const topBottom = topBounds.minimumWorld.y;
      if (Math.abs(baseTop - topBottom) > 0.025) continue;
      if (topBounds.maximumWorld.x < baseBounds.minimumWorld.x || topBounds.minimumWorld.x > baseBounds.maximumWorld.x
        || topBounds.maximumWorld.z < baseBounds.minimumWorld.z || topBounds.minimumWorld.z > baseBounds.maximumWorld.z) continue;
      top.setParent(base); // Temporary game-state relationship while the base travels.
      attached = top;
      break;
    }
  }

  function drop(): void {
    if (!held) return;
    const mesh = held;
    mesh.setParent(null); // Keeps the world-space position and orientation.
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;
    const halfHeight = (bounds.maximumWorld.y - bounds.minimumWorld.y) / 2;
    const bottom = bounds.minimumWorld.y;
    const ray = new Ray(new Vector3(mesh.position.x, bottom + 0.001, mesh.position.z), Vector3.Down(), 100);
    // Use actual shelf triangles, not its enclosing collision box: open levels
    // let the shoebox settle on whichever board is directly below it.
    const support = scene.pickWithRay(ray, (candidate) => candidate !== mesh && candidate !== attached && candidate.isVisible && candidate.checkCollisions);
    const restingCenter = (support?.hit && support.pickedPoint ? support.pickedPoint.y : 0) + halfHeight;
    mesh.position.y = Math.max(mesh.position.y, restingCenter);
    fall = { mesh, bottom: restingCenter, speed: 0 };
    held = undefined;
  }

  return {
    tapAt(x: number, y: number): boolean {
      // The held object can be tapped even when another mesh is behind it.
      if (held) {
        if (!scene.pick(x, y, (mesh) => mesh === held || mesh === attached)?.hit) return false;
        drop();
        return true;
      }
      const picked = scene.pick(x, y)?.pickedMesh as Mesh | null | undefined;
      const definition = picked && definitions.get(picked.name);
      if (!picked || !definition) return false;
      const { interactive, movable, mass } = definition.properties;
      if (!interactive || !movable || mass >= MAX_PICKUP_MASS || mass <= 0) return false;
      if (fall?.mesh === picked) fall = undefined;
      if (picked === attached) attached = undefined;
      attachRestingObject(picked);
      held = picked;
      picked.setParent(camera);
      picked.position.copyFrom(HOLD_OFFSET);
      picked.rotation.set(0, 0, 0);
      return true;
    },
    update(deltaSeconds: number): void {
      if (!fall) return;
      const seconds = Math.max(0, Math.min(deltaSeconds, 0.05));
      fall.speed += GRAVITY * seconds;
      fall.mesh.position.y = Math.max(fall.bottom, fall.mesh.position.y - fall.speed * seconds);
      if (fall.mesh.position.y <= fall.bottom) {
        if (attached?.parent === fall.mesh) {
          attached.setParent(null);
          attached = undefined;
        }
        fall = undefined;
      }
    },
  };
}
