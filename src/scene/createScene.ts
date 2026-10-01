import type { Engine } from '@babylonjs/core/Engines/engine';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { createCamera } from '../camera/createCamera';
import { RENDERING } from '../config';
import { createStore } from '../world/createStore';
import { createShelf } from '../world/createShelf';
import { createShelfStock } from '../world/createShelfStock';
import { createPlayerFeet } from '../player/createPlayerFeet';
import { createSocks } from '../player/createSocks';
import { createFootEquipment } from '../systems/createFootEquipment';
import { createCheckout } from '../world/createCheckout';

export function createScene(engine: Engine) {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.87, 0.86, 0.84, 1);

  const ambient = new HemisphericLight('ambient', Vector3.Up(), scene);
  ambient.intensity = RENDERING.ambientIntensity;
  ambient.groundColor = new Color3(0.55, 0.55, 0.58);

  // Angled fill gives differently oriented walls distinct shading without shadows.
  const fill = new DirectionalLight('fill', new Vector3(-0.6, -1, 0.4), scene);
  fill.intensity = RENDERING.directionalIntensity;

  const floor = createStore(scene);
  createShelf(scene);
  const stock = createShelfStock(scene);
  createCheckout(scene);
  const camera = createCamera(scene);
  const feet = createPlayerFeet(scene, camera);
  const socks = createSocks(scene);
  const equipment = createFootEquipment(scene, feet, socks);
  return { scene, camera, floor, feet, stock, socks, equipment };
}
