import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { createObjectDefinition, type ObjectDefinition } from '../objects/createObjectDefinition';
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

export const GREY_SHOEBOX_LID = createObjectDefinition('grey-shoebox-lid', 'merchandise', {
  color: '#53555a', width: 0.44, height: 0.055, depth: 0.30,
  mass: 2, interactive: true, movable: true,
});

const WALL_THICKNESS = 0.012;

/** Five thin panels per object: the box opens upward and the lid opens downward. */
function makeTray(scene: Scene, definition: ObjectDefinition, openTop: boolean): Mesh {
  const { width, height, depth, color, mass } = definition.properties;
  const parts: Mesh[] = [];
  const panel = (name: string, w: number, h: number, d: number, x: number, y: number, z: number) => {
    const mesh = CreateBox(`${definition.id}-${name}`, { width: w, height: h, depth: d }, scene);
    mesh.position.set(x, y, z);
    parts.push(mesh);
  };
  panel('face', width, WALL_THICKNESS, depth, 0, (openTop ? -1 : 1) * (height - WALL_THICKNESS) / 2, 0);
  for (const sign of [-1, 1]) {
    panel(`side-${sign}`, WALL_THICKNESS, height, depth, sign * (width - WALL_THICKNESS) / 2, 0, 0);
    panel(`end-${sign}`, width - 2 * WALL_THICKNESS, height, WALL_THICKNESS, 0, 0, sign * (depth - WALL_THICKNESS) / 2);
  }
  const box = Mesh.MergeMeshes(parts, true, true);
  if (!box) throw new Error(`Could not construct ${definition.id}.`);
  box.name = definition.id;
  const material = new StandardMaterial(`${definition.id}-material`, scene);
  material.diffuseColor = Color3.FromHexString(color);
  material.specularColor = Color3.Black();
  box.material = material;
  box.isVisible = mass > 0;
  box.checkCollisions = mass > 0;
  return box;
}

/** Placement belongs to the world; these are independent objects. */
export function createShoebox(scene: Scene): { box: Mesh; lid: Mesh } {
  const box = makeTray(scene, GREY_SHOEBOX, true);
  box.position.set(-0.85, SHELF_LEVELS[1] + SHELF_BOARD_THICKNESS + GREY_SHOEBOX.properties.height / 2, 0);
  const lid = makeTray(scene, GREY_SHOEBOX_LID, false);
  lid.position.set(box.position.x, box.position.y + GREY_SHOEBOX.properties.height / 2 + GREY_SHOEBOX_LID.properties.height / 2, box.position.z);
  return { box, lid };
}
