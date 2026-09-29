import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { VIEW } from '../config';

/** World-space shoes appear only when the player looks nearly straight down. */
export function createPlayerBody(scene: Scene, camera: TargetCamera): () => void {
  const root = new TransformNode('player-body', scene);
  const shoes = new StandardMaterial('player-shoes', scene);
  shoes.diffuseColor = Color3.FromHexString('#526b84');
  const feet: Mesh[] = [];

  for (const sign of [-1, 1]) {
    const foot = CreateBox(`player-shoe-${sign}`, { width: 0.23, height: 0.13, depth: 0.32 }, scene);
    foot.parent = root;
    foot.position.set(sign * 0.15, 0.065, 0.19);
    foot.material = shoes;
    foot.isPickable = false;
    feet.push(foot);
  }

  const sync = (): void => {
    root.position.set(camera.position.x, 0, camera.position.z);
    root.rotation.y = camera.rotation.y;
    // Portrait phones have a very tall vertical field of view. Explicitly
    // hide the near-floor meshes until the view is almost fully downward.
    for (const foot of feet) foot.isVisible = camera.rotation.x >= VIEW.shoeRevealPitch;
  };
  sync();
  return sync;
}
