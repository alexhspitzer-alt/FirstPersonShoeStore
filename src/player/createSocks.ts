import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateTube } from '@babylonjs/core/Meshes/Builders/tubeBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { PLAYER_FEET, SOCK } from '../config';
import { createObjectDefinition } from '../objects/createObjectDefinition';
import { createFootMesh } from './createPlayerFeet';

export function createSocks(scene: Scene) {
  const white = new StandardMaterial('sock-fabric-white', scene);
  white.diffuseColor = Color3.FromHexString(SOCK.color);
  white.specularColor = Color3.Black();
  const purple = new StandardMaterial('sock-zigzag-purple', scene);
  purple.diffuseColor = Color3.FromHexString(SOCK.accentColor);
  purple.specularColor = Color3.Black();
  return ([-1, 1] as const).map((sign) => {
    const definition = createObjectDefinition(`sock-${sign < 0 ? 'left' : 'right'}`, 'merchandise', {
      color: SOCK.color, mass: 1, interactive: true, movable: true,
      width: PLAYER_FEET.width * SOCK.shellScale,
      height: SOCK.cuffBottom + SOCK.cuffHeight,
      depth: PLAYER_FEET.length * SOCK.shellScale,
    });
    const fabric = createFootMesh(scene, `${definition.id}-fabric`, sign, true);
    fabric.scaling.setAll(SOCK.shellScale);
    fabric.position.y = 0.002;
    fabric.material = white;
    const cuff = CreateCylinder(`${definition.id}-cuff`, {
      height: SOCK.cuffHeight, diameterTop: SOCK.cuffDiameter,
      diameterBottom: SOCK.cuffDiameter * 0.85, tessellation: 16,
    }, scene);
    cuff.position.set(0, SOCK.cuffBottom + SOCK.cuffHeight / 2, SOCK.ankleZ);
    cuff.material = white;
    // Follow the front of the tapered cuff so the mark sits on the fabric.
    const path = [-0.028, -0.017, -0.006, 0.006, 0.017, 0.028].map((x, index) => {
      const y = 0.112 + (index % 2) * 0.014;
      const radius = SOCK.cuffDiameter / 2 * (0.85 + 0.15 * (y - SOCK.cuffBottom) / SOCK.cuffHeight);
      return new Vector3(x, y, SOCK.ankleZ + Math.sqrt(radius * radius - x * x) + SOCK.zigzagRadius);
    });
    const zigzag = CreateTube(`${definition.id}-zigzag`, {
      path, radius: SOCK.zigzagRadius, tessellation: 6, cap: Mesh.CAP_ALL,
    }, scene);
    zigzag.material = purple;
    // One pickable object, with white and purple submaterials preserved.
    const mesh = Mesh.MergeMeshes([fabric, cuff, zigzag], true, true, undefined, false, true);
    if (!mesh) throw new Error('Could not construct sock.');
    mesh.name = definition.id;
    mesh.isPickable = true;
    mesh.isVisible = true;
    mesh.checkCollisions = true;
    return { definition, mesh, sign };
  });
}
