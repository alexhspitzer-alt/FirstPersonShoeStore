import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createScene } from '../src/scene/createScene';
import { createPlayerControls } from '../src/systems/createPlayerControls';
import { createObjectInteraction } from '../src/systems/createObjectInteraction';
import { CHECKOUT, CONTROLS, STORE, VIEW } from '../src/config';
import { CLERK, COUNTER, POS } from '../src/world/createCheckout';
import { GREY_SHOEBOX, GREY_SHOEBOX_LID } from '../src/world/createShoebox';
import { SHELF_BOARD_THICKNESS, SHELF_LEVELS } from '../src/world/createShelf';

function setup(width = 800, height = 600, scaling = 1) {
  const engine = new NullEngine({ renderWidth: width, renderHeight: height, textureSize: 512, deterministicLockstep: false, lockstepMaxSteps: 4 });
  engine.setHardwareScalingLevel(scaling);
  // NullEngine hard-codes this to 1; emulate the browser engine's configured DPI
  // so the test exercises Babylon's real CSS-pixel-to-render-pixel picking path.
  engine.getHardwareScalingLevel = () => scaling;
  const { scene, camera, floor, updatePlayerBody } = createScene(engine);
  for (const mesh of scene.meshes) mesh.computeWorldMatrix(true);
  const controls = createPlayerControls(scene, camera, floor);
  const screen = (world: Vector3) => {
    scene.updateTransformMatrix(true);
    const pixel = Vector3.Project(world, Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(width, height));
    return [pixel.x * scaling, pixel.y * scaling] as const;
  };
  return { engine, scene, camera, controls, screen, updatePlayerBody, dispose() { scene.dispose(); engine.dispose(); } };
}

test('look turns both axes, clamps pitch, and never moves or rolls the camera', () => {
  const h = setup();
  const position = h.camera.position.clone();
  const yaw = h.camera.rotation.y;
  h.controls.look(100, -100000);
  assert.equal(h.camera.rotation.y, yaw - 100 * CONTROLS.lookRadiansPerPixel);
  assert.equal(h.camera.rotation.x, CONTROLS.maxPitch);
  h.controls.look(-100, 100000);
  assert.equal(h.camera.rotation.x, -CONTROLS.maxPitch);
  assert.equal(h.camera.rotation.z, 0);
  assert(h.camera.position.equals(position));
  h.dispose();
});

test('actual floor picks take one eased step at eye height in portrait, landscape, and high DPI', () => {
  for (const [width, height, scale] of [[800, 600, 1], [390, 844, 1], [585, 1266, 1 / 1.5]]) {
    const h = setup(width, height, scale);
    const start = h.camera.position.clone();
    const point = new Vector3(0, 0, -3); // Clear floor in front of the shelf.
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
  h.camera.position.set(0, VIEW.eyeHeight, -3);
  const near = new Vector3(0, 0, -2.8);
  h.camera.setTarget(near);
  h.controls.stepAt(...h.screen(near));
  h.controls.update(1);
  assert(Math.abs(h.camera.position.z - (-2.8)) < 1e-5);
  h.camera.position.set(STORE.width / 2 - 0.3, VIEW.eyeHeight, -3);
  const edge = new Vector3(STORE.width / 2 - 0.01, 0, -3);
  h.camera.setTarget(edge);
  h.controls.stepAt(...h.screen(edge));
  h.controls.update(1);
  assert(Math.abs(h.camera.position.x - (STORE.width / 2 - CONTROLS.wallClearance)) < 1e-5);
  h.dispose();
});

test('four colored directions and both step-spaced grids preserve floor picking', () => {
  const h = setup();
  const walls = [
    ['north-wall', STORE.colors.north],
    ['east-wall', STORE.colors.east],
    ['south-wall', STORE.colors.south],
    ['west-wall', STORE.colors.west],
  ] as const;
  for (const [name, color] of walls) {
    const mesh = h.scene.getMeshByName(name);
    assert(mesh?.material instanceof StandardMaterial);
    assert.equal(mesh.material.diffuseColor.toHexString().toLowerCase(), color.toLowerCase());
  }
  assert.equal(new Set(walls.map(([, color]) => color)).size, 4);
  for (const [name, y] of [['floor-step-grid', 0.006], ['ceiling-step-grid', STORE.height - 0.006]] as const) {
    const mesh = h.scene.getMeshByName(name);
    assert(mesh && !mesh.isPickable);
    const positions = mesh.getVerticesData('position');
    assert(positions && positions.length > 0);
    const xs = new Set<number>();
    const zs = new Set<number>();
    for (let i = 0; i < positions.length; i += 3) {
      assert(Math.abs(positions[i + 1]! - y) < 1e-5);
      xs.add(Math.round(positions[i]! * 100));
      zs.add(Math.round(positions[i + 2]! * 100));
    }
    assert(xs.has(0) && xs.has(70) && xs.has(-70));
    assert(zs.has(0) && zs.has(70) && zs.has(-70));
  }
  h.controls.stepAt(...h.screen(new Vector3(0, 0, -3)));
  h.controls.update(1);
  assert(h.camera.position.z > VIEW.z);
  h.dispose();
});

test('shelf has three open levels within its original footprint and a grey shoebox on the middle level', () => {
  const h = setup();
  const shelf = h.scene.getMeshByName('center-shelf');
  assert(shelf?.material instanceof StandardMaterial);
  assert.equal(shelf.material.diffuseColor.toHexString().toLowerCase(), '#80502f');
  assert.equal(shelf.checkCollisions, true);
  assert.equal(shelf.isVisible, true);
  shelf.computeWorldMatrix(true);
  const bounds = shelf.getBoundingInfo().boundingBox;
  for (const [actual, expected] of [
    [bounds.minimumWorld.x, -1.75], [bounds.minimumWorld.y, 0], [bounds.minimumWorld.z, -0.35],
    [bounds.maximumWorld.x, 1.75], [bounds.maximumWorld.y, 2.1], [bounds.maximumWorld.z, 0.35],
  ]) {
    assert(Math.abs(actual - expected) < 1e-5);
  }
  // Each board contributes a pair of horizontal surfaces at its own height.
  const vertices = shelf.getVerticesData('position');
  assert(vertices);
  const heights = new Set<number>();
  for (let index = 1; index < vertices.length; index += 3) heights.add(Math.round(vertices[index]! * 100));
  for (const bottom of SHELF_LEVELS) {
    assert(heights.has(Math.round(bottom * 100)));
    assert(heights.has(Math.round((bottom + SHELF_BOARD_THICKNESS) * 100)));
  }

  assert.equal(GREY_SHOEBOX.properties.mass, 4);
  assert.equal(GREY_SHOEBOX.properties.interactive, true);
  assert.equal(GREY_SHOEBOX.properties.movable, true);
  const box = h.scene.getMeshByName(GREY_SHOEBOX.id);
  assert(box?.material instanceof StandardMaterial);
  assert.equal(box.material.diffuseColor.toHexString().toLowerCase(), '#44464a');
  assert.equal(box.checkCollisions, true);
  assert.equal(box.isVisible, true);
  assert(Math.abs(box.position.y - box.getBoundingInfo().boundingBox.extendSize.y - (SHELF_LEVELS[1] + SHELF_BOARD_THICKNESS)) < 1e-5);
  const lid = h.scene.getMeshByName(GREY_SHOEBOX_LID.id);
  assert(lid?.material instanceof StandardMaterial);
  assert.equal(GREY_SHOEBOX_LID.properties.mass, 1);
  assert.equal(lid.checkCollisions, true);
  assert.equal(lid.parent, null);
  assert(GREY_SHOEBOX_LID.properties.width > GREY_SHOEBOX.properties.width);
  assert(GREY_SHOEBOX_LID.properties.depth > GREY_SHOEBOX.properties.depth);
  assert(Math.abs(lid.position.y - GREY_SHOEBOX_LID.properties.height / 2 - (box.position.y + GREY_SHOEBOX.properties.height / 2)) < 1e-5);
  assert.equal(box.getTotalVertices(), 5 * 24);
  assert.equal(lid.getTotalVertices(), 5 * 24);
  h.dispose();
});

test('checkout counter, POS, and clerk occupy distinct collidable spaces', () => {
  const h = setup();
  const counter = h.scene.getMeshByName(COUNTER.id);
  const terminal = h.scene.getMeshByName(POS.id);
  const clerk = h.scene.getMeshByName(CLERK.id);
  assert(counter && terminal && clerk);
  for (const mesh of [counter, terminal, clerk]) {
    assert(mesh.isVisible && mesh.checkCollisions);
    assert(mesh.material instanceof StandardMaterial);
  }
  assert.equal(COUNTER.properties.movable, false);
  assert.equal(POS.properties.movable, false);
  assert.equal(CLERK.properties.interactive, false);
  assert.equal(counter.position.x, CHECKOUT.x);
  assert.equal(clerk.position.z, CHECKOUT.clerkZ);
  assert(CHECKOUT.clerkZ > CHECKOUT.z + CHECKOUT.counter.depth / 2);
  assert(h.scene.getMeshByName('pos-screen'));
  assert(h.scene.getMeshByName('clerk-head'));
  assert(h.scene.getMeshByName('clerk-neck'));
  assert(h.scene.getMeshByName('clerk-shoe--1'));
  assert(h.scene.getMeshByName('clerk-shoe-1'));
  h.dispose();
});

test('player shoes appear only when looking nearly straight down and do not block floor taps', () => {
  const h = setup();
  assert.equal(h.scene.getMeshByName('player-leg--1'), null);
  const rightShoe = h.scene.getMeshByName('player-shoe-1');
  assert(rightShoe);
  assert.equal(rightShoe.isVisible, false);
  assert(!rightShoe.isPickable && !rightShoe.checkCollisions);
  const original = rightShoe.getAbsolutePosition().clone();
  h.camera.position.x += 0.7;
  h.camera.rotation.y += 0.3;
  h.updatePlayerBody();
  assert.equal(rightShoe.isVisible, false);
  rightShoe.computeWorldMatrix(true);
  assert(rightShoe.getAbsolutePosition().x > original.x + 0.5);
  assert(Math.abs(rightShoe.getAbsolutePosition().y - 0.065) < 1e-5);
  const before = h.camera.position.clone();
  h.controls.stepAt(...h.screen(new Vector3(0, 0, -3)));
  h.controls.update(1);
  assert(!h.camera.position.equals(before));
  h.camera.rotation.x = VIEW.shoeRevealPitch;
  h.updatePlayerBody();
  assert.equal(rightShoe.isVisible, true);
  h.camera.rotation.x = 0;
  h.updatePlayerBody();
  assert.equal(rightShoe.isVisible, false);
  h.dispose();
});

test('offset lid stops when it overlaps a box wall without snapping to the box center', () => {
  const h = setup();
  const box = h.scene.getMeshByName(GREY_SHOEBOX.id);
  const lid = h.scene.getMeshByName(GREY_SHOEBOX_LID.id);
  assert(box && lid);
  const objects = createObjectInteraction(h.scene, h.camera, [GREY_SHOEBOX, GREY_SHOEBOX_LID], [[box.name, lid.name]]);
  h.scene.updateTransformMatrix(true);
  assert(objects.tapAt(...h.screen(lid.position)));
  const offsetX = box.position.x + 0.23; // Center outside the box; lid still overlaps its right wall.
  h.camera.position.set(offsetX, VIEW.eyeHeight, -0.85);
  h.camera.setTarget(new Vector3(offsetX, VIEW.eyeHeight, 0));
  h.scene.updateTransformMatrix(true);
  lid.computeWorldMatrix(true);
  assert(objects.tapAt(...h.screen(lid.getBoundingInfo().boundingBox.centerWorld)));
  for (let i = 0; i < 50; i++) objects.update(0.02);
  lid.computeWorldMatrix(true);
  box.computeWorldMatrix(true);
  assert(Math.abs(lid.getBoundingInfo().boundingBox.minimumWorld.y - box.getBoundingInfo().boundingBox.maximumWorld.y) < 1e-4);
  assert(Math.abs(lid.position.x - offsetX) < 1e-4);
  h.dispose();
});

test('picking up the box carries its resting lid, while picking up the lid leaves the box', () => {
  const h = setup();
  const box = h.scene.getMeshByName(GREY_SHOEBOX.id);
  const lid = h.scene.getMeshByName(GREY_SHOEBOX_LID.id);
  assert(box && lid);
  const objects = createObjectInteraction(h.scene, h.camera, [GREY_SHOEBOX, GREY_SHOEBOX_LID], [[box.name, lid.name]]);
  h.scene.updateTransformMatrix(true);
  assert(objects.tapAt(...h.screen(lid.position)));
  assert.equal(lid.parent, h.camera);
  assert.equal(box.parent, null);
  lid.computeWorldMatrix(true);
  assert(objects.tapAt(...h.screen(lid.getBoundingInfo().boundingBox.centerWorld)));
  for (let i = 0; i < 100; i++) objects.update(0.02);
  assert.equal(lid.parent, null);

  // Put the lid back on the box, then lift the base.
  lid.position.set(box.position.x, box.position.y + GREY_SHOEBOX.properties.height / 2 + GREY_SHOEBOX_LID.properties.height / 2, box.position.z);
  lid.computeWorldMatrix(true);
  h.scene.updateTransformMatrix(true);
  assert(objects.tapAt(...h.screen(box.position)));
  assert.equal(box.parent, h.camera);
  assert.equal(lid.parent, null);
  lid.computeWorldMatrix(true);
  const lidBefore = lid.getBoundingInfo().boundingBox.centerWorld.x;
  h.camera.position.x += 0.6;
  objects.update(0);
  box.computeWorldMatrix(true);
  lid.computeWorldMatrix(true);
  assert(Math.abs(lid.getBoundingInfo().boundingBox.centerWorld.x - lidBefore - 0.6) < 1e-5);
  assert(objects.tapAt(...h.screen(box.getBoundingInfo().boundingBox.centerWorld)));
  for (let i = 0; i < 100; i++) objects.update(0.02);
  assert.equal(lid.parent, null);
  h.dispose();
});

test('an angled lid touching the box is not carried when the box is picked up', () => {
  const h = setup();
  const box = h.scene.getMeshByName(GREY_SHOEBOX.id);
  const lid = h.scene.getMeshByName(GREY_SHOEBOX_LID.id);
  assert(box && lid);
  // One edge touches the rim, but the lid is leaning beside the box.
  lid.rotation.z = 0.65;
  lid.position.set(box.position.x + 0.16, box.position.y + GREY_SHOEBOX.properties.height / 2 + 0.005, box.position.z);
  lid.computeWorldMatrix(true);
  const original = lid.getBoundingInfo().boundingBox.centerWorld.clone();
  const objects = createObjectInteraction(h.scene, h.camera, [GREY_SHOEBOX, GREY_SHOEBOX_LID], [[box.name, lid.name]]);
  h.scene.updateTransformMatrix(true);
  assert(objects.tapAt(...h.screen(box.position)));
  lid.computeWorldMatrix(true);
  assert(lid.getBoundingInfo().boundingBox.centerWorld.equalsWithEpsilon(original, 1e-5));
  assert.equal(lid.parent, null);
  h.dispose();
});

test('one tap carries the shoebox at screen center; a second tap drops it onto the floor', () => {
  const h = setup();
  const box = h.scene.getMeshByName(GREY_SHOEBOX.id);
  assert(box);
  const objects = createObjectInteraction(h.scene, h.camera, [GREY_SHOEBOX]);
  h.scene.updateTransformMatrix(true);
  assert.equal(objects.tapAt(...h.screen(box.position)), true);
  assert.equal(box.parent, h.camera);
  assert.deepEqual([box.position.x, box.position.y, box.position.z], [0, -0.18, 0.85]);
  h.controls.look(55, 10);
  h.camera.position.z += 0.7;
  h.scene.updateTransformMatrix(true);
  box.computeWorldMatrix(true);
  const heldCenter = box.getBoundingInfo().boundingBox.centerWorld;
  assert.equal(objects.tapAt(...h.screen(heldCenter)), true);
  assert.equal(box.parent, null);
  for (let i = 0; i < 100; i++) objects.update(0.02);
  box.computeWorldMatrix(true);
  assert(Math.abs(box.getBoundingInfo().boundingBox.minimumWorld.y) < 1e-4);
  h.dispose();
});

test('shoebox drops onto the shelf board directly below it', () => {
  const h = setup();
  const box = h.scene.getMeshByName(GREY_SHOEBOX.id);
  assert(box);
  const objects = createObjectInteraction(h.scene, h.camera, [GREY_SHOEBOX]);
  h.scene.updateTransformMatrix(true);
  assert(objects.tapAt(...h.screen(box.position)));
  h.camera.position.set(0, VIEW.eyeHeight, -1.05);
  h.camera.setTarget(new Vector3(0, VIEW.eyeHeight, 0));
  h.scene.updateTransformMatrix(true);
  box.computeWorldMatrix(true);
  assert(objects.tapAt(...h.screen(box.getBoundingInfo().boundingBox.centerWorld)));
  for (let i = 0; i < 100; i++) objects.update(0.02);
  box.computeWorldMatrix(true);
  assert(Math.abs(box.getBoundingInfo().boundingBox.minimumWorld.y - (SHELF_LEVELS[1] + SHELF_BOARD_THICKNESS)) < 1e-4);
  h.dispose();
});
