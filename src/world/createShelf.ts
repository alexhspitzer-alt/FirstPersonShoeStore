import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { createObjectDefinition } from '../objects/createObjectDefinition';

export const CENTER_SHELF = createObjectDefinition('center-shelf', 'fixture', {
  color: '#80502f',
  width: 3.5,
  height: 2.1,
  depth: 0.7,
  mass: 90,
});

/** The class describes the object; the room decides its placement. */
export function createShelf(scene: Scene): Mesh {
  const { properties } = CENTER_SHELF;
  const shelf = CreateBox(CENTER_SHELF.id, {
    width: properties.width,
    height: properties.height,
    depth: properties.depth,
  }, scene);
  // Bottom on the floor; centered along the room's X/Z axes.
  shelf.position.set(0, properties.height / 2, 0);

  const material = new StandardMaterial('center-shelf-brown', scene);
  material.diffuseColor = Color3.FromHexString(properties.color);
  material.specularColor = Color3.Black();
  shelf.material = material;

  // Mass-bearing objects must be visible and obstruct travel. The player system
  // reads this flag when computing a step; no physics engine is needed.
  shelf.isVisible = properties.mass > 0;
  shelf.checkCollisions = properties.mass > 0;
  return shelf;
}
