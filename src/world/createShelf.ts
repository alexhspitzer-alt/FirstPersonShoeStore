import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { createObjectDefinition } from '../objects/createObjectDefinition';

export const CENTER_SHELF = createObjectDefinition('center-shelf', 'fixture', {
  color: '#80502f',
  width: 3.5,
  height: 2.1,
  depth: 0.7,
  mass: 90,
});

export const SHELF_BOARD_THICKNESS = 0.08;
export const SHELF_LEVELS = [0, CENTER_SHELF.properties.height / 2, CENTER_SHELF.properties.height - SHELF_BOARD_THICKNESS] as const;

/** The class describes the object; the room decides its placement. */
export function createShelf(scene: Scene): Mesh {
  const { properties } = CENTER_SHELF;
  const boards = SHELF_LEVELS.map((bottom, index) => {
    const board = CreateBox(`shelf-board-${index}`, {
      width: properties.width,
      height: SHELF_BOARD_THICKNESS,
      depth: properties.depth,
    }, scene);
    board.position.y = bottom + SHELF_BOARD_THICKNESS / 2;
    return board;
  });
  const sides = [-1, 1].map((sign, index) => {
    const side = CreateBox(`shelf-side-${index}`, {
      width: SHELF_BOARD_THICKNESS,
      height: properties.height,
      depth: properties.depth,
    }, scene);
    side.position.set(sign * (properties.width - SHELF_BOARD_THICKNESS) / 2, properties.height / 2, 0);
    return side;
  });
  // Merge the visible pieces so step blocking uses the complete shelf footprint.
  const shelf = Mesh.MergeMeshes([...boards, ...sides], true, true);
  if (!shelf) throw new Error('Could not construct the center shelf.');
  shelf.name = CENTER_SHELF.id;

  const material = new StandardMaterial('center-shelf-brown', scene);
  material.diffuseColor = Color3.FromHexString(properties.color);
  material.specularColor = Color3.Black();
  shelf.material = material;

  // The player system reads this flag when computing a step.
  shelf.isVisible = properties.mass > 0;
  shelf.checkCollisions = properties.mass > 0;
  return shelf;
}
