import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import { createObjectDefinition, type ObjectDefinition } from '../objects/createObjectDefinition';
import { SHELF_BOARD_THICKNESS, SHELF_LEVELS } from './createShelf';

export interface ShoeboxDefinition extends ObjectDefinition {
  readonly shoeSize: number;
}

/** Reusable data factory: generated stock only needs an ID, color, and size. */
export function defineShoebox(id: string, color: string, shoeSize: number) {
  if (!Number.isFinite(shoeSize) || shoeSize <= 0) throw new Error('Shoe size must be positive.');
  const box: ShoeboxDefinition = {
    ...createObjectDefinition(id, 'merchandise', {
      color, width: 0.42, height: 0.22, depth: 0.28,
      mass: 4, interactive: true, movable: true,
    }),
    shoeSize,
  };
  const lid = createObjectDefinition(`${id}-lid`, 'merchandise', {
    color: Color3.FromHexString(color).scale(0.85).add(new Color3(0.15, 0.15, 0.15)).toHexString(),
    width: 0.44, height: 0.055, depth: 0.30,
    mass: 1, interactive: true, movable: true,
  });
  return { box, lid };
}

const original = defineShoebox('grey-shoebox', '#44464a', 9);
export const GREY_SHOEBOX = original.box;
export const GREY_SHOEBOX_LID = original.lid;

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

/** Placement belongs to the world; the box and lid remain independent objects. */
export function createShoebox(
  scene: Scene,
  definition = original,
  position = new Vector3(-0.85, SHELF_LEVELS[2]! + SHELF_BOARD_THICKNESS + definition.box.properties.height / 2, 0),
): { box: Mesh; lid: Mesh } {
  const box = makeTray(scene, definition.box, true);
  box.position.copyFrom(position);
  box.metadata = { shoeSize: definition.box.shoeSize };
  addSizeLabel(scene, box, definition.box);
  const lid = makeTray(scene, definition.lid, false);
  lid.position.set(box.position.x, box.position.y + definition.box.properties.height / 2 + definition.lid.properties.height / 2, box.position.z);
  return { box, lid };
}

// Small seven-segment numerals avoid font downloads and one canvas texture per box.
// Both the background and digits are visual children; picking still hits the box.
const DIGITS = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgecd', 'abc', 'abcdefg', 'abfgcd'];
const SEGMENTS: Record<string, readonly [number, number, boolean]> = {
  a: [0, 1, true], b: [1, 0.5, false], c: [1, -0.5, false],
  d: [0, -1, true], e: [-1, -0.5, false], f: [-1, 0.5, false], g: [0, 0, true],
};

function addSizeLabel(scene: Scene, box: Mesh, definition: ShoeboxDefinition): void {
  const material = (name: string, color: string) => {
    const existing = scene.getMaterialByName(name);
    if (existing) return existing;
    const created = new StandardMaterial(name, scene);
    created.diffuseColor = Color3.FromHexString(color);
    created.specularColor = Color3.Black();
    return created;
  };
  const text = String(definition.shoeSize);
  const advance = 0.035;
  const faceZ = -definition.properties.depth / 2;
  const panel = CreateBox(`${definition.id}-label-panel`, { width: text.length * advance + 0.02, height: 0.085, depth: 0.002 }, scene);
  panel.parent = box;
  panel.position.z = faceZ - 0.002;
  panel.material = material('shoe-size-paper', '#f4eddb');
  panel.isPickable = false;
  const strokes: Mesh[] = [];
  const stroke = (x: number, y: number, width: number, height: number) => {
    const part = CreateBox('size-stroke', { width, height, depth: 0.001 }, scene);
    part.position.set(x, y, faceZ - 0.0036);
    strokes.push(part);
  };
  [...text].forEach((character, index) => {
    const x = (index - (text.length - 1) / 2) * advance;
    if (character === '.') { stroke(x, -0.025, 0.005, 0.005); return; }
    for (const segment of DIGITS[Number(character)] ?? '') {
      const [dx, dy, horizontal] = SEGMENTS[segment]!;
      stroke(x + dx * 0.011, dy * 0.027, horizontal ? 0.024 : 0.004, horizontal ? 0.004 : 0.026);
    }
  });
  const label = Mesh.MergeMeshes(strokes, true, true);
  if (!label) throw new Error('Could not construct shoe size label.');
  label.name = `${definition.id}-size-label`;
  label.parent = box;
  label.material = material('shoe-size-ink', '#202326');
  label.isPickable = false;
}
