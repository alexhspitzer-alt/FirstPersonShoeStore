import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { createObjectDefinition } from '../objects/createObjectDefinition';
import { SHELF_BOARD_THICKNESS, SHELF_LEVELS } from './createShelf';

export const GREY_SHOEBOX = createObjectDefinition('grey-shoebox', 'merchandise', {
  color: '#44464a',
  width: 0.42,
  height: 0.22,
  depth: 0.28,
  mass: 5,
  interactive: true,
  movable: true,
});

/** Placement belongs to the world; the object's class only describes its properties. */
export function createShoebox(scene: Scene): Mesh {
  const { properties } = GREY_SHOEBOX;
  const box = CreateBox(GREY_SHOEBOX.id, {
    width: properties.width,
    height: properties.height,
    depth: properties.depth,
  }, scene);
  box.position.set(-0.85, SHELF_LEVELS[1] + SHELF_BOARD_THICKNESS + properties.height / 2, 0);
  const material = new StandardMaterial('grey-shoebox-material', scene);
  material.diffuseColor = Color3.FromHexString(properties.color);
  material.specularColor = Color3.Black();
  box.material = material;
  box.isVisible = properties.mass > 0;
  box.checkCollisions = properties.mass > 0;
  return box;
}
