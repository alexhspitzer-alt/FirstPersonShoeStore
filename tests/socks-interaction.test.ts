import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { createScene } from '../src/scene/createScene';
import { createPlayerControls } from '../src/systems/createPlayerControls';
import { createObjectInteraction } from '../src/systems/createObjectInteraction';
import { createObjectDefinition } from '../src/objects/createObjectDefinition';
import { CONTROLS, SOCK } from '../src/config';

function setup(width = 390, height = 844) {
  const engine = new NullEngine({ renderWidth: width, renderHeight: height, textureSize: 512, deterministicLockstep: false, lockstepMaxSteps: 4 });
  const game = createScene(engine);
  const { scene, camera, feet, stock, socks, equipment, floor } = game;
  const objects = createObjectInteraction(scene, camera,
    [...stock.definitions, ...socks.map(s => s.definition)], stock.restingPairs, equipment.interaction);
  const controls = createPlayerControls(scene, camera, floor);
  const refresh = () => {
    feet.update();
    for (const mesh of scene.meshes) mesh.computeWorldMatrix(true);
    scene.updateTransformMatrix(true);
  };
  const project = (point: Vector3, body = false) => {
    refresh();
    const view = body ? feet.viewCamera : camera;
    const p = Vector3.Project(point, Matrix.Identity(), view.getViewMatrix().multiply(view.getProjectionMatrix()), view.viewport.toGlobal(width, height));
    return [p.x, p.y] as const;
  };
  const bodyPoint = (side: 'left' | 'right') => {
    refresh();
    return project(Vector3.TransformCoordinates(new Vector3(0, 0.03, 0.05), feet.slots[side].getWorldMatrix()), true);
  };
  const sockPoint = (mesh: typeof socks[number]['mesh']) => {
    refresh();
    return project(Vector3.TransformCoordinates(new Vector3(0, 0.11, SOCK.ankleZ), mesh.getWorldMatrix()));
  };
  return { ...game, engine, objects, controls, project, bodyPoint, sockPoint, refresh,
    dispose() { scene.dispose(); engine.dispose(); } };
}

test('socks start worn, swap hands, fit either bare foot, drop, and can be picked up again', () => {
  for (const [width, height] of [[390, 844], [844, 390]]) {
    const h = setup(width, height);
    h.camera.rotation.x = CONTROLS.maxPitch;
    const leftSock = h.socks[0]!.mesh;
    const rightSock = h.socks[1]!.mesh;
    assert.equal(h.equipment.worn.get('left'), leftSock);
    assert.equal(h.equipment.worn.get('right'), rightSock);
    assert(!h.scene.getMeshByName('player-left-foot')!.isEnabled());
    const material = leftSock.material as unknown as { subMaterials: { diffuseColor: { toHexString(): string } }[] };
    const colors = material.subMaterials.map(m => m.diffuseColor.toHexString().toLowerCase());
    assert(colors.includes(SOCK.color) && colors.includes(SOCK.accentColor));
    assert(leftSock.isPickable && leftSock.checkCollisions);

    assert(h.objects.tapAt(...h.bodyPoint('left')));
    assert.equal(h.objects.heldObject, leftSock);
    assert.equal(h.equipment.worn.get('left'), undefined);
    assert(h.scene.getMeshByName('player-left-foot')!.isEnabled());
    assert.equal(leftSock.layerMask, h.camera.layerMask);
    // An occupied foot targets its sock: drop ours and pick up that one.
    assert(h.objects.tapAt(...h.bodyPoint('right')));
    assert.equal(h.objects.heldObject, rightSock);
    assert.equal(leftSock.parent, null);
    assert.equal(h.equipment.worn.size, 0);
    for (let i = 0; i < 60; i++) h.objects.update(0.05);

    assert(h.objects.tapAt(...h.bodyPoint('left')));
    assert.equal(h.objects.heldObject, undefined);
    assert.equal(h.equipment.worn.get('left'), rightSock);
    assert.equal(rightSock.parent, h.feet.slots.left);
    assert.equal(rightSock.scaling.x, -1); // Mirror a right-shaped sock onto the left.
    assert(!h.scene.getMeshByName('player-left-foot')!.isEnabled());
    assert.equal(h.objects.tapAt(...h.bodyPoint('right')), false); // Bare foot alone is inert.

    assert(h.objects.tapAt(...h.bodyPoint('left')));
    h.camera.position.x += 0.7; // Clear the previously dropped sock.
    h.refresh();
    assert(h.objects.tapAt(...h.sockPoint(rightSock)));
    assert.equal(h.objects.heldObject, undefined);
    assert.equal(rightSock.parent, null);
    const x = rightSock.position.x, z = rightSock.position.z;
    for (let i = 0; i < 60; i++) h.objects.update(0.05);
    rightSock.computeWorldMatrix(true);
    assert.equal(rightSock.position.x, x);
    assert.equal(rightSock.position.z, z);
    assert(Math.abs(rightSock.getBoundingInfo().boundingBox.minimumWorld.y) < 1e-4);
    assert(h.objects.tapAt(...h.sockPoint(rightSock)));
    assert(h.objects.tapAt(...h.bodyPoint('right')));
    assert.equal(h.equipment.worn.get('right'), rightSock);
    assert.equal(h.objects.heldObject, undefined);
    h.dispose();
  }
});

test('full look-down stops and cancels steps, while looking remains responsive', () => {
  const h = setup();
  const target = new Vector3(0, 0, -3);
  h.controls.stepAt(...h.project(target));
  h.controls.update(CONTROLS.stepDurationSeconds / 2);
  const stopped = h.camera.position.clone();
  h.controls.look(0, -10000);
  h.controls.update(1);
  assert(h.camera.position.equals(stopped));
  h.controls.stepAt(...h.project(target));
  h.controls.update(1);
  assert(h.camera.position.equals(stopped));
  const yaw = h.camera.rotation.y;
  h.controls.look(30, 10000);
  assert.notEqual(h.camera.rotation.y, yaw);
  assert.equal(h.camera.rotation.x, -CONTROLS.maxPitch);
  h.controls.update(1);
  assert(h.camera.position.equals(stopped), 'The canceled stride must not resume.');
  h.camera.setTarget(new Vector3(0, 1.5, -3));
  h.controls.stepAt(...h.project(target));
  h.controls.update(1);
  assert(!h.camera.position.equals(stopped));
  h.dispose();
});

test('held-item effects precede pickup; irrelevant targets retain items and pickups swap hands', () => {
  const h = setup();
  const item = createObjectDefinition('test-item', 'merchandise');
  const other = createObjectDefinition('test-other', 'merchandise');
  const target = CreateBox('test-target', {}, h.scene);
  const itemMesh = CreateBox(item.id, {}, h.scene);
  const otherMesh = CreateBox(other.id, {}, h.scene);
  let picked = target;
  let used = 0;
  const objects = createObjectInteraction(h.scene, h.camera, [item, other], [], {
    pickTarget: () => picked,
    useHeldObject: ({ definition, target: clicked }) => {
      if (definition.id !== item.id || clicked !== target) return false;
      used++;
      return true; // This effect keeps its item held.
    },
  });
  assert.equal(objects.tapAt(0, 0), false);
  assert.equal(used, 0);
  picked = itemMesh;
  assert(objects.tapAt(0, 0));
  picked = target;
  assert(objects.tapAt(0, 0));
  assert.equal(used, 1);
  assert.equal(objects.heldObject, itemMesh);
  picked = otherMesh;
  assert(objects.tapAt(0, 0));
  assert.equal(objects.heldObject, otherMesh);
  assert.equal(itemMesh.parent, null);
  picked = target;
  assert.equal(objects.tapAt(0, 0), false);
  assert.equal(used, 1);
  assert.equal(objects.heldObject, otherMesh);
  h.dispose();
});
