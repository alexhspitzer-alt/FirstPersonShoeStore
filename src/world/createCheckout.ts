import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { CHECKOUT } from '../config';
import { createObjectDefinition } from '../objects/createObjectDefinition';

export const COUNTER = createObjectDefinition('checkout-counter', 'fixture', {
  ...CHECKOUT.counter, mass: 85, color: '#9b7151',
});
export const POS = createObjectDefinition('checkout-pos', 'fixture', {
  width: 0.35, height: 0.3, depth: 0.28, mass: 12, color: '#303840',
});
export const CLERK = createObjectDefinition('store-clerk', 'npc', {
  width: 0.55, height: CHECKOUT.clerkHeight, depth: 0.35, mass: 70, color: '#315d72',
});

function material(scene: Scene, name: string, color: string): StandardMaterial {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = Color3.FromHexString(color);
  result.specularColor = Color3.Black();
  return result;
}

function solid(mesh: Mesh, mass: number, surface: StandardMaterial): Mesh {
  mesh.material = surface;
  mesh.isVisible = mass > 0;
  mesh.checkCollisions = mass > 0;
  return mesh;
}

/** Geometry and placement live here; the definitions carry no scene transforms. */
export function createCheckout(scene: Scene): void {
  const counterMaterial = material(scene, 'counter-wood', COUNTER.properties.color);
  const counter = solid(CreateBox(COUNTER.id, CHECKOUT.counter, scene), COUNTER.properties.mass, counterMaterial);
  counter.position.set(CHECKOUT.x, CHECKOUT.counter.height / 2, CHECKOUT.z);
  const top = solid(CreateBox('counter-top', {
    width: CHECKOUT.counter.width + 0.06, height: 0.06, depth: CHECKOUT.counter.depth + 0.06,
  }, scene), COUNTER.properties.mass, material(scene, 'counter-top-material', '#b18865'));
  top.position.set(CHECKOUT.x, CHECKOUT.counter.height + 0.03, CHECKOUT.z);

  const posMaterial = material(scene, 'pos-casing', POS.properties.color);
  const posX = CHECKOUT.x - 0.45;
  const posZ = CHECKOUT.z;
  const posBottom = CHECKOUT.counter.height + 0.06;
  const base = solid(CreateBox(POS.id, { width: POS.properties.width, height: 0.07, depth: POS.properties.depth }, scene), POS.properties.mass, posMaterial);
  base.position.set(posX, posBottom + 0.035, posZ);
  const monitor = solid(CreateBox('pos-monitor', { width: 0.23, height: 0.21, depth: 0.055 }, scene), POS.properties.mass, posMaterial);
  monitor.position.set(posX, posBottom + 0.175, posZ + 0.06);
  monitor.rotation.x = -0.18;
  const screenMaterial = material(scene, 'pos-screen-material', '#398ca2');
  screenMaterial.emissiveColor = new Color3(0.03, 0.10, 0.13);
  const screen = solid(CreateBox('pos-screen', { width: 0.19, height: 0.16, depth: 0.005 }, scene), POS.properties.mass, screenMaterial);
  screen.position.set(posX, posBottom + 0.18, posZ + 0.026);
  screen.rotation.x = -0.18;

  const uniform = material(scene, 'clerk-uniform', CLERK.properties.color);
  const skin = material(scene, 'clerk-skin', '#b98a68');
  const pants = material(scene, 'clerk-pants', '#343b4b');
  const eye = material(scene, 'clerk-eyes', '#20232a');
  const body = solid(CreateBox(CLERK.id, { width: 0.46, height: 0.95, depth: 0.3 }, scene), CLERK.properties.mass, uniform);
  body.position.set(CHECKOUT.x, 1.12, CHECKOUT.clerkZ);
  const head = solid(CreateSphere('clerk-head', { diameter: 0.34, segments: 12 }, scene), CLERK.properties.mass, skin);
  head.position.set(CHECKOUT.x, 1.64, CHECKOUT.clerkZ - 0.025);
  for (const sign of [-1, 1]) {
    const leg = solid(CreateBox(`clerk-leg-${sign}`, { width: 0.17, height: 0.64, depth: 0.19 }, scene), CLERK.properties.mass, pants);
    leg.position.set(CHECKOUT.x + sign * 0.13, 0.32, CHECKOUT.clerkZ);
    const arm = solid(CreateBox(`clerk-arm-${sign}`, { width: 0.13, height: 0.65, depth: 0.17 }, scene), CLERK.properties.mass, uniform);
    arm.position.set(CHECKOUT.x + sign * 0.30, 1.18, CHECKOUT.clerkZ);
    const pupil = solid(CreateSphere(`clerk-eye-${sign}`, { diameter: 0.035, segments: 8 }, scene), CLERK.properties.mass, eye);
    pupil.position.set(CHECKOUT.x + sign * 0.075, 1.67, CHECKOUT.clerkZ - 0.184);
  }
}
