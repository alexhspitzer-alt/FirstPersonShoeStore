import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createScene } from '../src/scene/createScene';
import { createPlayerControls } from '../src/systems/createPlayerControls';
import { CONTROLS, STORE, VIEW } from '../src/config';

function setup(width = 800, height = 600, scaling = 1) {
  const engine = new NullEngine({ renderWidth: width, renderHeight: height, textureSize: 512, deterministicLockstep: false, lockstepMaxSteps: 4 });
  engine.setHardwareScalingLevel(scaling);
  // NullEngine hard-codes this to 1; emulate the browser engine's configured DPI
  // so the test exercises Babylon's real CSS-pixel-to-render-pixel picking path.
  engine.getHardwareScalingLevel = () => scaling;
  const { scene, camera, floor } = createScene(engine);
  for (const mesh of scene.meshes) mesh.computeWorldMatrix(true);
  const controls = createPlayerControls(scene, camera, floor);
  const screen = (world: Vector3) => {
    scene.updateTransformMatrix(true);
    const pixel = Vector3.Project(world, Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(width, height));
    return [pixel.x * scaling, pixel.y * scaling] as const;
  };
  return { engine, scene, camera, controls, screen, dispose() { scene.dispose(); engine.dispose(); } };
}

test('look turns both axes, clamps pitch, and never moves or rolls the camera', () => {
  const h = setup();
  const position = h.camera.position.clone();
  const yaw = h.camera.rotation.y;
  h.controls.look(100, -100000);
  assert.equal(h.camera.rotation.y, yaw + 100 * CONTROLS.lookRadiansPerPixel);
  assert.equal(h.camera.rotation.x, -CONTROLS.maxPitch);
  h.controls.look(-100, 100000);
  assert.equal(h.camera.rotation.x, CONTROLS.maxPitch);
  assert.equal(h.camera.rotation.z, 0);
  assert(h.camera.position.equals(position));
  h.dispose();
});

test('actual floor picks take one eased step at eye height in portrait, landscape, and high DPI', () => {
  for (const [width, height, scale] of [[800, 600, 1], [390, 844, 1], [585, 1266, 1 / 1.5]]) {
    const h = setup(width, height, scale);
    const start = h.camera.position.clone();
    const point = new Vector3(0, 0, 2);
    h.controls.stepAt(...h.screen(point));
    h.controls.update(CONTROLS.stepDurationSeconds / 2);
    assert(Math.abs(Vector3.Distance(start, h.camera.position) - CONTROLS.stepDistance / 2) < 1e-5);
    h.controls.stepAt(...h.screen(point)); // No queued extra step during movement.
    h.controls.update(CONTROLS.stepDurationSeconds / 2);
    assert(Math.abs(Vector3.Distance(start, h.camera.position) - CONTROLS.stepDistance) < 1e-5);
    assert.equal(h.camera.position.y, VIEW.eyeHeight);
    const end = h.camera.position.clone();
    h.controls.update(1);
    assert(h.camera.position.equals(end));
    h.dispose();
  }
});

test('walls and ceiling occlude the ground and do not cause a step', () => {
  const h = setup();
  const start = h.camera.position.clone();
  for (const point of [new Vector3(0, 1.5, STORE.depth / 2), new Vector3(0, STORE.height, 2)]) {
    h.controls.stepAt(...h.screen(point));
    h.controls.update(1);
    assert(h.camera.position.equals(start));
  }
  h.dispose();
});

test('nearby targets are not overshot and steps stop inside the room boundary', () => {
  const h = setup();
  h.camera.position.set(0, VIEW.eyeHeight, 0);
  const near = new Vector3(0, 0, 0.2);
  h.camera.setTarget(near);
  h.controls.stepAt(...h.screen(near));
  h.controls.update(1);
  assert(Math.abs(h.camera.position.z - 0.2) < 1e-5);
  h.camera.position.set(STORE.width / 2 - 0.3, VIEW.eyeHeight, 0);
  const edge = new Vector3(STORE.width / 2 - 0.01, 0, 0);
  h.camera.setTarget(edge);
  h.controls.stepAt(...h.screen(edge));
  h.controls.update(1);
  assert(Math.abs(h.camera.position.x - (STORE.width / 2 - CONTROLS.wallClearance)) < 1e-5);
  h.dispose();
});
