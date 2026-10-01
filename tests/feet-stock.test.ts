import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Frustum } from '@babylonjs/core/Maths/math.frustum';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createScene } from '../src/scene/createScene';
import { CONTROLS } from '../src/config';
import { createObjectInteraction } from '../src/systems/createObjectInteraction';

test('feet stay floor-anchored, hide in forward views, and frame low when looking down', () => {
  for (const [width, height] of [[390, 844], [844, 390]]) {
    const engine = new NullEngine({ renderWidth: width, renderHeight: height, textureSize: 512, deterministicLockstep: false, lockstepMaxSteps: 4 });
    const { scene, camera, feet } = createScene(engine);
    for (const yaw of [0, 1.3, -2.4]) {
      camera.rotation.set(0, yaw, 0);
      camera.position.x += 0.7;
      feet.update();
      scene.updateTransformMatrix(true);
      const forwardFrustum = Frustum.GetPlanes(feet.viewCamera.getViewMatrix().multiply(feet.viewCamera.getProjectionMatrix()));
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
      const bodyTransform = feet.viewCamera.getViewMatrix().multiply(feet.viewCamera.getProjectionMatrix());
      for (const side of ['left', 'right']) {
        const foot = scene.getMeshByName(`player-${side}-foot`)!;
        foot.computeWorldMatrix(true);
        const center = Vector3.Project(foot.getBoundingInfo().boundingBox.centerWorld, Matrix.Identity(), bodyTransform, feet.viewCamera.viewport.toGlobal(width, height));
        assert(center.y / height > 0.8 && center.y / height < 0.92, 'Feet should sit in the bottom of the frame.');
        const positions = foot.getVerticesData('position')!;
        const normals = foot.getVerticesData('normal')!;
        const highest = positions.findIndex((y, i) => i % 3 === 1 && y > 0.064);
        assert(normals[highest]! > 0.9, 'The foot upper must face upward for lighting and culling.');
        const pixels: Vector3[] = [];
        for (let i = 0; i < positions.length; i += 3) {
          const p = Vector3.Project(Vector3.FromArray(positions, i), foot.getWorldMatrix(), bodyTransform, feet.viewCamera.viewport.toGlobal(width, height));
          assert(p.x > 0 && p.x < width && p.y > 0 && p.y < height && p.z > 0 && p.z < 1);
          pixels.push(p);
        }
        const pixelWidth = Math.max(...pixels.map(p => p.x)) - Math.min(...pixels.map(p => p.x));
        assert(pixelWidth / Math.min(width, height) > 0.09, 'Each foot must have readable first-person scale.');
        assert.equal(foot.layerMask & camera.layerMask, 0);
        assert.equal(scene.cameraToUseForPointers, camera);
        assert.equal(feet.root.rotation.x, 0, 'Looking down must not tilt the body.');
        assert.equal(foot.isVisible, true, 'Perspective, not visibility gating, reveals feet.');
      }
    }
    scene.render();
    assert.equal(scene.activeCamera, camera, 'The body pass must restore the gameplay camera.');
    const floorPoint = new Vector3(camera.position.x + 0.2, 0, camera.position.z + 0.3);
    const pixel = Vector3.Project(floorPoint, Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(width, height));
    assert.equal(scene.pick(pixel.x, pixel.y)?.pickedMesh?.name, 'floor', 'Picking must still use the store camera.');
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
