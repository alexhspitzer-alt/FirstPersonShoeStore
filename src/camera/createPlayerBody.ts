import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';

/** A visual first-person body, anchored to the floor rather than camera pitch. */
export function createPlayerBody(scene: Scene, camera: TargetCamera): () => void {
  const root = new TransformNode('player-body', scene);
  const pants = new StandardMaterial('player-pants', scene);
  pants.diffuseColor = Color3.FromHexString('#354052');
  const shoes = new StandardMaterial('player-shoes', scene);
  shoes.diffuseColor = Color3.FromHexString('#526b84');

  for (const sign of [-1, 1]) {
    const leg = CreateBox(`player-leg-${sign}`, { width: 0.19, height: 0.86, depth: 0.22 }, scene);
    leg.parent = root;
    leg.position.set(sign * 0.15, 0.57, 0.05);
    leg.material = pants;
    leg.isPickable = false;

    const foot = CreateBox(`player-shoe-${sign}`, { width: 0.23, height: 0.13, depth: 0.32 }, scene);
    foot.parent = root;
    foot.position.set(sign * 0.15, 0.065, 0.19);
    foot.material = shoes;
    foot.isPickable = false;
  }

  const sync = (): void => {
    root.position.set(camera.position.x, 0, camera.position.z);
    root.rotation.y = camera.rotation.y;
  };
  sync();
  return sync;
}
