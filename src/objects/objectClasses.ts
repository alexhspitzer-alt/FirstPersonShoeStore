/** Ratings are game scales (0–100), not kilograms, physical reflectance, or light units. */
export interface ObjectProperties {
  interactive: boolean;
  movable: boolean;
  destructible: boolean;
  /** A positive mass implies visibility and collision when the object is spawned. */
  mass: number;
  albedo: number;
  luminescence: number;
  hasTexture: boolean;
  color: string;
  /** Dimensions in world units (metres). */
  width: number;
  height: number;
  depth: number;
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
  color: '#808080',
  width: 1,
  height: 1,
  depth: 1,
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
  }),
  merchandise: objectClass('Merchandise', 'Sneakers, socks, accessories', {
    interactive: true,
    movable: true,
    mass: 5,
  }),
  lightFixture: objectClass('Light fixture', 'Ceiling light, lit sign', {
    mass: 30,
    luminescence: 80,
  }),
});
