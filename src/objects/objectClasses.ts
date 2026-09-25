/** Ratings are game scales (0–100), not kilograms, physical reflectance, or light units. */
export interface ObjectProperties {
  interactive: boolean;
  movable: boolean;
  destructible: boolean;
  mass: number;
  albedo: number;
  luminescence: number;
  hasTexture: boolean;
  collidable: boolean;
  visible: boolean;
  opacity: number;
  durability: number;
  color: string;
  /** Size in world units (metres), before any instance transform. */
  size: { width: number; height: number; depth: number };
}

export type ObjectClassId = 'architecture' | 'fixture' | 'looseProp' | 'merchandise' | 'lightFixture';

export interface ObjectClass {
  label: string;
  examples: string;
  defaults: Readonly<ObjectProperties>;
}

export const DEFAULT_OBJECT_PROPERTIES: Readonly<ObjectProperties> = Object.freeze({
  interactive: false,
  movable: false,
  destructible: false,
  mass: 50,
  albedo: 65,
  luminescence: 0,
  hasTexture: false,
  collidable: true,
  visible: true,
  opacity: 100,
  durability: 100,
  color: '#808080',
  size: Object.freeze({ width: 1, height: 1, depth: 1 }),
});

function objectClass(label: string, examples: string, overrides: Partial<ObjectProperties>): ObjectClass {
  return Object.freeze({
    label,
    examples,
    defaults: Object.freeze({ ...DEFAULT_OBJECT_PROPERTIES, ...overrides }),
  });
}

/** Named starting points; individual objects may override any property. */
export const OBJECT_CLASSES: Readonly<Record<ObjectClassId, ObjectClass>> = Object.freeze({
  architecture: objectClass('Architecture', 'Walls, floor, ceiling', { mass: 100 }),
  fixture: objectClass('Fixture', 'Shelf, counter, bench', { mass: 75 }),
  looseProp: objectClass('Loose prop', 'Box, sign, discarded cup', {
    movable: true,
    destructible: true,
    mass: 20,
    durability: 40,
  }),
  merchandise: objectClass('Merchandise', 'Sneakers, socks, accessories', {
    interactive: true,
    movable: true,
    mass: 5,
    collidable: false,
  }),
  lightFixture: objectClass('Light fixture', 'Ceiling light, lit sign', {
    mass: 30,
    luminescence: 80,
  }),
});
