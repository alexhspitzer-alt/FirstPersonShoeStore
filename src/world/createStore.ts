import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { CONTROLS, STORE } from '../config';

export function createStore(scene: Scene): Mesh {
  const { width, depth, height, shellThickness: thickness, colors } = STORE;
  const material = (name: string, color: string): StandardMaterial => {
    const result = new StandardMaterial(name, scene);
    result.diffuseColor = Color3.FromHexString(color);
    result.specularColor = Color3.Black();
    return result;
  };
  const floor = material('floor-material', colors.floor);
  const ceiling = material('ceiling-material', colors.ceiling);
  const north = material('north-wall-material', colors.north);
  const east = material('east-wall-material', colors.east);
  const south = material('south-wall-material', colors.south);
  const west = material('west-wall-material', colors.west);

  const box = (
    name: string,
    size: { width: number; height: number; depth: number },
    position: readonly [number, number, number],
    surface: StandardMaterial,
  ): Mesh => {
    const mesh = CreateBox(name, size, scene);
    mesh.position.set(...position);
    mesh.material = surface;
    return mesh;
  };

  // Solid slabs expose their inward faces. Interior floor is Y = 0.
  const slab = { width: width + 2 * thickness, height: thickness, depth: depth + 2 * thickness };
  const ground = box('floor', slab, [0, -thickness / 2, 0], floor);
  box('ceiling', slab, [0, height + thickness / 2, 0], ceiling);
  const endWall = { width: width + 2 * thickness, height, depth: thickness };
  box('south-wall', endWall, [0, height / 2, -(depth + thickness) / 2], south);
  box('north-wall', endWall, [0, height / 2, (depth + thickness) / 2], north);
  const sideWall = { width: thickness, height, depth };
  box('west-wall', sideWall, [-(width + thickness) / 2, height / 2, 0], west);
  box('east-wall', sideWall, [(width + thickness) / 2, height / 2, 0], east);

  // World-space lines match one step. Combine each grid into one draw call.
  const spacing = CONTROLS.stepDistance;
  const lines: Vector3[][] = [];
  const inset = 0.01;
  for (let i = -Math.floor(width / (2 * spacing)); i <= Math.floor(width / (2 * spacing)); i++) {
    const x = i * spacing;
    lines.push([new Vector3(x, 0, -depth / 2 + inset), new Vector3(x, 0, depth / 2 - inset)]);
  }
  for (let i = -Math.floor(depth / (2 * spacing)); i <= Math.floor(depth / (2 * spacing)); i++) {
    const z = i * spacing;
    lines.push([new Vector3(-width / 2 + inset, 0, z), new Vector3(width / 2 - inset, 0, z)]);
  }
  const addGrid = (name: string, y: number, color: string): void => {
    const grid = CreateLineSystem(name, {
      lines: lines.map(line => line.map(point => new Vector3(point.x, y, point.z))),
    }, scene);
    grid.color = Color3.FromHexString(color);
    grid.isPickable = false; // Taps still pick the floor beneath the lines.
  };
  addGrid('floor-step-grid', 0.006, colors.floorGrid);
  addGrid('ceiling-step-grid', height - 0.006, colors.ceilingGrid);
  return ground;
}
