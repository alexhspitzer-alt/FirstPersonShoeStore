import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { ObjectDefinition } from '../objects/createObjectDefinition';
import { SHELF_BOARD_THICKNESS, SHELF_LEVELS } from './createShelf';
import { createShoebox, defineShoebox, GREY_SHOEBOX, GREY_SHOEBOX_LID } from './createShoebox';

// Starter stock is a small data recipe, separate from geometry and interaction.
// A future generator can supply these same IDs, colors, sizes, and placements.
const COLORS = ['#44464a', '#315a85', '#a94443', '#527951', '#ba8739', '#78568c', '#327f80', '#a26343'];
const SIZES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13];
const COLUMNS = [-0.85, 0, 0.85];

export function createShelfStock(scene: Scene) {
  const definitions: ObjectDefinition[] = [];
  const restingPairs: [string, string][] = [];
  SHELF_LEVELS.forEach((bottom, level) => {
    COLUMNS.forEach((x, column) => {
      const index = level * COLUMNS.length + column;
      const pair = level === 2 && column === 0
        ? { box: GREY_SHOEBOX, lid: GREY_SHOEBOX_LID }
        : defineShoebox(`shoebox-${index}`, COLORS[index % COLORS.length]!, SIZES[index]!);
      createShoebox(scene, pair, new Vector3(x, bottom + SHELF_BOARD_THICKNESS + pair.box.properties.height / 2, 0));
      definitions.push(pair.box, pair.lid);
      restingPairs.push([pair.box.id, pair.lid.id]);
    });
  });
  return { definitions, restingPairs };
}
