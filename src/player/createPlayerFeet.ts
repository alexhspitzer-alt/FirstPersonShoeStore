import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { PLAYER_FEET } from '../config';

/** Feet occupy real floor space. Pitch belongs to the head, not the body. */
export function createPlayerFeet(scene: Scene, camera: TargetCamera) {
  const root = new TransformNode('player-feet-root', scene);
  const skin = new StandardMaterial('player-foot-skin', scene);
  skin.diffuseColor = Color3.FromHexString(PLAYER_FEET.color);
  skin.specularColor = Color3.Black();
  const { width, height, length } = PLAYER_FEET;
  const makeFoot = (side: 'left' | 'right', sign: number) => {
    // Equipment can later be parented to this floor-level slot and removed
    // independently. Bare feet are presentation, not pickup/collision objects.
    const slot = new TransformNode(`player-${side}-foot-slot`, scene);
    slot.parent = root;
    slot.position.set(sign * PLAYER_FEET.spacing / 2, 0, PLAYER_FEET.eyeToAnkleOffset);
    const parts: Mesh[] = [];
    const oval = (name: string, x: number, y: number, z: number, w: number, h: number, d: number) => {
      const part = CreateSphere(name, { diameterX: w, diameterY: h, diameterZ: d, segments: 12 }, scene);
      part.position.set(x, y, z);
      parts.push(part);
    };
    oval('heel', 0, height / 2, -length * 0.3, width * 0.7, height, length * 0.4);
    oval('arch', -sign * width * 0.05, height * 0.45, -length * 0.02, width * 0.8, height * 0.9, length * 0.65);
    oval('forefoot', 0, height * 0.33, length * 0.23, width, height * 0.66, length * 0.36);
    for (let toe = 0; toe < 5; toe++) {
      const scale = 1 - toe * 0.11;
      oval(`toe-${toe}`, sign * (-width * 0.34 + toe * width * 0.17), height * 0.23,
        length * (0.43 - toe * 0.025), width * 0.23 * scale, height * 0.46 * scale, length * 0.19 * scale);
    }
    const foot = Mesh.MergeMeshes(parts, true, true);
    if (!foot) throw new Error('Could not construct player foot.');
    foot.name = `player-${side}-foot`;
    foot.parent = slot;
    foot.material = skin;
    foot.isPickable = false;
    foot.checkCollisions = false;
    return slot;
  };
  const left = makeFoot('left', -1);
  const right = makeFoot('right', 1);
  const update = () => {
    root.position.set(camera.position.x, 0, camera.position.z);
    root.rotation.y = camera.rotation.y;
  };
  update();
  return { root, slots: { left, right }, update };
}
