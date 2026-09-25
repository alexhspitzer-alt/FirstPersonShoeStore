import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import type { Scene } from '@babylonjs/core/scene';
import { STORE } from '../config';

export function createStore(scene: Scene): void {
  const { width, depth, height, shellThickness: thickness, colors } = STORE;

  const material = (name: string, color: string): StandardMaterial => {
    const result = new StandardMaterial(name, scene);
    result.diffuseColor = Color3.FromHexString(color);
    result.specularColor = Color3.Black();
    return result;
  };

  const floor = material('floor-material', colors.floor);
  const walls = material('wall-material', colors.walls);
  const ceiling = material('ceiling-material', colors.ceiling);

  const box = (
    name: string,
    size: { width: number; height: number; depth: number },
    position: readonly [number, number, number],
    surface: StandardMaterial,
  ): void => {
    const mesh = CreateBox(name, size, scene);
    mesh.position.set(...position);
    mesh.material = surface;
    mesh.isPickable = false;
  };

  // Six solid slabs expose their inward faces normally; no reversed normals or
  // double-sided materials are needed. Interior floor is exactly Y = 0.
  const slab = { width: width + 2 * thickness, height: thickness, depth: depth + 2 * thickness };
  box('floor', slab, [0, -thickness / 2, 0], floor);
  box('ceiling', slab, [0, height + thickness / 2, 0], ceiling);

  const endWall = { width: width + 2 * thickness, height, depth: thickness };
  box('front-wall', endWall, [0, height / 2, -(depth + thickness) / 2], walls);
  box('back-wall', endWall, [0, height / 2, (depth + thickness) / 2], walls);

  const sideWall = { width: thickness, height, depth };
  box('left-wall', sideWall, [-(width + thickness) / 2, height / 2, 0], walls);
  box('right-wall', sideWall, [(width + thickness) / 2, height / 2, 0], walls);
}
