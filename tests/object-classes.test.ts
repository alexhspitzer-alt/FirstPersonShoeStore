import assert from 'node:assert/strict';
import test from 'node:test';
import { createObjectDefinition } from '../src/objects/createObjectDefinition';
import { DEFAULT_OBJECT_PROPERTIES, OBJECT_CLASSES } from '../src/objects/objectClasses';

test('a shoe and a shelf can override their class without changing later objects', () => {
  const shoe = createObjectDefinition('left-sneaker', 'merchandise', {
    mass: 2,
    color: '#2365aa',
    width: 0.32,
    height: 0.14,
    depth: 0.29,
  });
  const shelf = createObjectDefinition('shelf-01', 'fixture', {
    interactive: true,
    width: 2,
  });
  assert.equal(shoe.properties.interactive, true);
  assert.equal(shoe.properties.movable, true);
  assert.deepEqual([shelf.properties.width, shelf.properties.height, shelf.properties.depth], [2, 1, 1]);
  assert.equal('transform' in shoe, false);
  shoe.properties.width = 9;
  const nextShoe = createObjectDefinition('right-sneaker', 'merchandise');
  assert.equal(nextShoe.properties.width, 1);
  assert.equal(OBJECT_CLASSES.fixture.defaults.interactive, false);
  assert.equal(DEFAULT_OBJECT_PROPERTIES.width, 1);
  assert.deepEqual(Object.keys(nextShoe.properties).sort(), [
    'interactive', 'movable', 'destructible', 'mass', 'albedo', 'luminescence',
    'hasTexture', 'color', 'width', 'height', 'depth',
  ].sort());
});

test('ratings and physical dimensions reject values outside their declared ranges', () => {
  for (const overrides of [
    { mass: -1 }, { albedo: 101 }, { luminescence: Number.NaN },
    { width: -1 }, { height: Infinity }, { depth: 0 },
  ]) {
    assert.throws(() => createObjectDefinition('bad-object', 'looseProp', overrides));
  }
  assert.throws(() => createObjectDefinition(' ', 'fixture'));
  assert.throws(() => createObjectDefinition('bad-color', 'fixture', { color: 'blue' }));
});
