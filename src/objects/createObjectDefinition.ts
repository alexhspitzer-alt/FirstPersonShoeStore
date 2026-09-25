import { OBJECT_CLASSES, type ObjectClassId, type ObjectProperties } from './objectClasses';

export interface ObjectTransform {
  position: { x: number; y: number; z: number };
  /** Rotation in radians, matching Babylon's convention. */
  rotation: { x: number; y: number; z: number };
}

export interface ObjectDefinition {
  id: string;
  classId: ObjectClassId;
  properties: ObjectProperties;
  transform: ObjectTransform;
}

type ObjectOverrides = Partial<Omit<ObjectProperties, 'size'>> & {
  size?: Partial<ObjectProperties['size']>;
};

const RATED_PROPERTIES = ['mass', 'albedo', 'luminescence', 'opacity', 'durability'] as const;

/** Describes an object without creating a mesh or enabling gameplay systems. */
export function createObjectDefinition(
  id: string,
  classId: ObjectClassId,
  overrides: ObjectOverrides = {},
  transform: Partial<{ position: Partial<ObjectTransform['position']>; rotation: Partial<ObjectTransform['rotation']> }> = {},
): ObjectDefinition {
  if (!id.trim()) throw new Error('Object id must not be empty.');

  const defaults = OBJECT_CLASSES[classId]?.defaults;
  if (!defaults) throw new Error(`Unknown object class: ${classId}`);

  // Copy the nested size too, so changing one instance cannot change a class
  // or another instance. No Babylon type belongs in the reusable catalog.
  const properties: ObjectProperties = {
    ...defaults,
    ...overrides,
    size: { ...defaults.size, ...overrides.size },
  };
  for (const key of RATED_PROPERTIES) {
    const value = properties[key];
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new RangeError(`${key} must be between 0 and 100.`);
    }
  }
  for (const value of Object.values(properties.size)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError('Object size must be positive and finite.');
    }
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(properties.color)) {
    throw new Error('Object color must be a six-digit hex color.');
  }
  const position = { x: 0, y: 0, z: 0, ...transform.position };
  const rotation = { x: 0, y: 0, z: 0, ...transform.rotation };
  if (![...Object.values(position), ...Object.values(rotation)].every(Number.isFinite)) {
    throw new RangeError('Object position and rotation must be finite.');
  }

  return { id, classId, properties, transform: { position, rotation } };
}
