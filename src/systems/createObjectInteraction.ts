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
  const falls = new Map<Mesh, { bottom: number; speed: number }>();
  let supported: { mesh: Mesh; lastBaseCenter: Vector3 } | undefined;

  const overlap = (aMin: number, aMax: number, bMin: number, bMax: number) => aMin < bMax && aMax > bMin;

  function touchesRim(top: Mesh, base: Mesh): boolean {
    top.computeWorldMatrix(true);
    base.computeWorldMatrix(true);
    const lid = top.getBoundingInfo().boundingBox;
    const box = base.getBoundingInfo().boundingBox;
    const rim = 0.012; // Wall thickness of the simple shoebox mesh.
    const crossesX = overlap(lid.minimumWorld.x, lid.maximumWorld.x, box.minimumWorld.x, box.maximumWorld.x);
    const crossesZ = overlap(lid.minimumWorld.z, lid.maximumWorld.z, box.minimumWorld.z, box.maximumWorld.z);
    const touchesSide = overlap(lid.minimumWorld.x, lid.maximumWorld.x, box.minimumWorld.x, box.minimumWorld.x + rim)
      || overlap(lid.minimumWorld.x, lid.maximumWorld.x, box.maximumWorld.x - rim, box.maximumWorld.x);
    const touchesEnd = overlap(lid.minimumWorld.z, lid.maximumWorld.z, box.minimumWorld.z, box.minimumWorld.z + rim)
      || overlap(lid.minimumWorld.z, lid.maximumWorld.z, box.maximumWorld.z - rim, box.maximumWorld.z);
    return (touchesSide && crossesZ) || (touchesEnd && crossesX);
  }

  function isResting(top: Mesh, base: Mesh): boolean {
    if (top.parent || falls.has(top) || !touchesRim(top, base)) return false;
    const topBounds = top.getBoundingInfo().boundingBox;
    const baseBounds = base.getBoundingInfo().boundingBox;
    // An angled lid next to the box is not a lid supported by its rim.
    const up = Vector3.TransformNormal(Vector3.Up(), top.getWorldMatrix()).normalize();
    return up.y > 0.98 && Math.abs(topBounds.minimumWorld.y - baseBounds.maximumWorld.y) < 0.015;
  }

  function attachRestingObject(base: Mesh): void {
    for (const [baseId, topId] of restingPairs) {
      if (base.name !== baseId) continue;
      const top = scene.getMeshByName(topId) as Mesh | null;
      if (!top || !isResting(top, base)) continue;
      supported = { mesh: top, lastBaseCenter: base.getBoundingInfo().boundingBox.centerWorld.clone() };
      break;
    }
  }

  function startFall(mesh: Mesh): void {
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;
    const halfHeight = (bounds.maximumWorld.y - bounds.minimumWorld.y) / 2;
    const bottom = bounds.minimumWorld.y;
    const ray = new Ray(new Vector3(mesh.position.x, bottom + 0.001, mesh.position.z), Vector3.Down(), 100);
    // Use actual shelf triangles, not its enclosing collision box: open levels
    // let the shoebox settle on whichever board is directly below it.
    const support = scene.pickWithRay(ray, (candidate) => candidate !== mesh && candidate !== supported?.mesh && candidate.isVisible && candidate.checkCollisions);
    let supportHeight = support?.hit && support.pickedPoint ? support.pickedPoint.y : 0;
    // The center ray can pass through a hollow box. Check whether the lid's
    // footprint actually crosses any of its four thin walls instead.
    for (const [baseId, topId] of restingPairs) {
      if (mesh.name !== topId) continue;
      const base = scene.getMeshByName(baseId) as Mesh | null;
      if (!base || !base.isVisible || !base.checkCollisions || base.parent) continue;
      base.computeWorldMatrix(true);
      const box = base.getBoundingInfo().boundingBox;
      if (bottom + 0.001 < box.maximumWorld.y) continue;
      if (!touchesRim(mesh, base)) continue;
      supportHeight = Math.max(supportHeight, box.maximumWorld.y);
    }
    const restingCenter = supportHeight + halfHeight;
    mesh.position.y = Math.max(mesh.position.y, restingCenter);
    falls.set(mesh, { bottom: restingCenter, speed: 0 });
  }

  function moveSupported(): void {
    if (!supported) return;
    const base = held ?? [...falls.keys()].find((mesh) => restingPairs.some(([id]) => id === mesh.name));
    if (!base) { supported = undefined; return; }
    base.computeWorldMatrix(true);
    const nextCenter = base.getBoundingInfo().boundingBox.centerWorld;
    supported.mesh.position.addInPlace(nextCenter.subtract(supported.lastBaseCenter));
    supported.lastBaseCenter.copyFrom(nextCenter);
    // No rigid parent link: an unsupported or tilted lid falls independently.
    if (!isResting(supported.mesh, base)) {
      const lid = supported.mesh;
      supported = undefined;
      startFall(lid);
      return;
    }
  }

  function drop(): void {
    if (!held) return;
    moveSupported();
    const mesh = held;
    mesh.setParent(null); // Keeps the world-space position and orientation.
    startFall(mesh);
    held = undefined;
  }

  return {
    tapAt(x: number, y: number): boolean {
      // The held object can be tapped even when another mesh is behind it.
      if (held) {
        if (!scene.pick(x, y, (mesh) => mesh === held || mesh === supported?.mesh)?.hit) return false;
        drop();
        return true;
      }
      const picked = scene.pick(x, y)?.pickedMesh as Mesh | null | undefined;
      const definition = picked && definitions.get(picked.name);
      if (!picked || !definition) return false;
      const { interactive, movable, mass } = definition.properties;
      if (!interactive || !movable || mass >= MAX_PICKUP_MASS || mass <= 0) return false;
      falls.delete(picked);
      if (picked === supported?.mesh) supported = undefined;
      attachRestingObject(picked);
      held = picked;
      picked.setParent(camera);
      picked.position.copyFrom(HOLD_OFFSET);
      picked.rotation.set(0, 0, 0);
      moveSupported();
      return true;
    },
    update(deltaSeconds: number): void {
      moveSupported();
      const seconds = Math.max(0, Math.min(deltaSeconds, 0.05));
      for (const [mesh, fall] of falls) {
        fall.speed += GRAVITY * seconds;
        mesh.position.y = Math.max(fall.bottom, mesh.position.y - fall.speed * seconds);
        if (mesh.position.y <= fall.bottom) {
          falls.delete(mesh);
          if (supported && restingPairs.some(([id]) => id === mesh.name)) supported = undefined;
        }
      }
      moveSupported();
    },
  };
}
