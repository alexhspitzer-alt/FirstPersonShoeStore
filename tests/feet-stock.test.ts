import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Frustum } from '@babylonjs/core/Maths/math.frustum';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createScene } from '../src/scene/createScene';
import { CONTROLS } from '../src/config';
import { createObjectInteraction } from '../src/systems/createObjectInteraction';

test('feet stay on the floor, outside forward views, and project naturally when looking down', () => {
  for (const [width, height] of [[390, 844], [844, 390]]) {
    const engine = new NullEngine({ renderWidth: width, renderHeight: height, textureSize: 512, deterministicLockstep: false, lockstepMaxSteps: 4 });
    const { scene, camera, feet } = createScene(engine);
    for (const yaw of [0, 1.3, -2.4]) {
      camera.rotation.set(0, yaw, 0);
      camera.position.x += 0.7;
      feet.update();
      scene.updateTransformMatrix(true);
      const forwardFrustum = Frustum.GetPlanes(scene.getTransformMatrix());
      for (const side of ['left', 'right']) {
        const foot = scene.getMeshByName(`player-${side}-foot`)!;
        foot.computeWorldMatrix(true);
        assert(!foot.isInFrustum(forwardFrustum), 'Feet must never intrude while looking forward.');
        assert(Math.abs(foot.getBoundingInfo().boundingBox.minimumWorld.y) < 0.001);
        assert(!foot.isPickable && !foot.checkCollisions);
      }
      camera.rotation.x = CONTROLS.maxPitch;
      feet.update();
      scene.updateTransformMatrix(true);
      for (const side of ['left', 'right']) {
        const foot = scene.getMeshByName(`player-${side}-foot`)!;
        foot.computeWorldMatrix(true);
        for (const corner of foot.getBoundingInfo().boundingBox.vectorsWorld) {
          const p = Vector3.Project(corner, Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(width, height));
          assert(p.x > 0 && p.x < width && p.y > 0 && p.y < height && p.z > 0 && p.z < 1);
        }
        assert.equal(feet.root.rotation.x, 0, 'Looking down must not tilt the body.');
        assert.equal(foot.isVisible, true, 'Perspective, not visibility gating, reveals feet.');
      }
    }
    scene.dispose(); engine.dispose();
  }
});

test('all stock has size labels and is registered for independent box/lid pickup', () => {
  const engine = new NullEngine();
  const { scene, camera, stock } = createScene(engine);
  assert.equal(stock.restingPairs.length, 15);
  assert.equal(stock.definitions.length, 30);
  const objects = createObjectInteraction(scene, camera, stock.definitions, stock.restingPairs);
  for (const [boxId, lidId] of stock.restingPairs) {
    const box = scene.getMeshByName(boxId)!;
    const lid = scene.getMeshByName(lidId)!;
    const label = scene.getMeshByName(`${boxId}-size-label`)!;
    assert(box.metadata.shoeSize > 0);
    assert.equal(label.parent, box);
    assert(!label.isPickable && !label.checkCollisions);
    assert(lid.parent === null && lid.checkCollisions && box.checkCollisions);
  }
  // A new colored box uses the same runtime interaction path as the original.
  const box = scene.getMeshByName('shoebox-1')!;
  camera.position.set(box.position.x, box.position.y, -2);
  camera.setTarget(box.position);
  scene.updateTransformMatrix(true);
  for (const mesh of scene.meshes) mesh.computeWorldMatrix(true);
  const p = Vector3.Project(box.position, Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
  assert(objects.tapAt(p.x, p.y));
  assert.equal(box.parent, camera);
  assert.equal(scene.getMeshByName('shoebox-1-size-label')!.parent, box);
  scene.dispose(); engine.dispose();
});
