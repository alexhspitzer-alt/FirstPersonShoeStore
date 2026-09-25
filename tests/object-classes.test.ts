import assert from 'node:assert/strict';
import test from 'node:test';
import { createObjectDefinition } from '../src/objects/createObjectDefinition';
import { DEFAULT_OBJECT_PROPERTIES, OBJECT_CLASSES } from '../src/objects/objectClasses';

test('a shoe and a shelf can override their class without changing later objects', () => {
  const shoe = createObjectDefinition('left-sneaker', 'merchandise', {
    mass: 2,
    color: '#2365aa',
    size: { width: 0.32, height: 0.14, depth: 0.29 },
  }, { position: { x: 2, z: 3 } });
  const shelf = createObjectDefinition('shelf-01', 'fixture', {
    interactive: true,
    size: { width: 2 },
  });
  assert.equal(shoe.properties.interactive, true);
  assert.equal(shoe.properties.movable, true);
  assert.equal(shoe.properties.collidable, false);
  assert.deepEqual(shoe.transform.position, { x: 2, y: 0, z: 3 });
  assert.deepEqual(shelf.properties.size, { width: 2, height: 1, depth: 1 });
  shoe.properties.size.width = 9;
  const nextShoe = createObjectDefinition('right-sneaker', 'merchandise');
  assert.equal(nextShoe.properties.size.width, 1);
  assert.equal(OBJECT_CLASSES.fixture.defaults.interactive, false);
  assert.equal(DEFAULT_OBJECT_PROPERTIES.size.width, 1);
});

test('ratings and physical dimensions reject values outside their declared ranges', () => {
  for (const overrides of [
    { mass: -1 }, { albedo: 101 }, { luminescence: Number.NaN },
    { opacity: -1 }, { durability: Infinity }, { size: { depth: 0 } },
  ]) {
    assert.throws(() => createObjectDefinition('bad-object', 'looseProp', overrides));
  }
  assert.throws(() => createObjectDefinition(' ', 'fixture'));
  assert.throws(() => createObjectDefinition('bad-color', 'fixture', { color: 'blue' }));
  assert.throws(() => createObjectDefinition('bad-position', 'fixture', {}, { position: { x: Infinity } }));
});
