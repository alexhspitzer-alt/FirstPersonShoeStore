import { OBJECT_CLASSES, type ObjectClassId, type ObjectProperties } from './objectClasses';

export interface ObjectDefinition {
  id: string;
  classId: ObjectClassId;
  properties: ObjectProperties;
}

const RATED_PROPERTIES = ['mass', 'albedo', 'luminescence'] as const;
const DIMENSIONS = ['width', 'height', 'depth'] as const;

/** Describes an object; position and rotation belong to game state, not here. */
export function createObjectDefinition(
  id: string,
  classId: ObjectClassId,
  overrides: Partial<ObjectProperties> = {},
): ObjectDefinition {
  if (!id.trim()) throw new Error('Object id must not be empty.');

  const defaults = OBJECT_CLASSES[classId]?.defaults;
  if (!defaults) throw new Error(`Unknown object class: ${classId}`);

  const properties: ObjectProperties = { ...defaults, ...overrides };
  for (const key of RATED_PROPERTIES) {
    const value = properties[key];
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new RangeError(`${key} must be between 0 and 100.`);
    }
  }
  for (const key of DIMENSIONS) {
    const value = properties[key];
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${key} must be positive and finite.`);
    }
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(properties.color)) {
    throw new Error('Object color must be a six-digit hex color.');
  }
  return { id, classId, properties };
}
