import { Engine } from '@babylonjs/core/Engines/engine';
import { RENDERING } from '../config';

export function createEngine(canvas: HTMLCanvasElement): Engine {
  const engine = new Engine(canvas, true, { stencil: false });
  engine.renderEvenInBackground = false;
  resizeEngine(engine);
  return engine;
}

export function resizeEngine(engine: Engine): void {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, RENDERING.maxPixelRatio);
  engine.setHardwareScalingLevel(1 / pixelRatio);
  engine.resize();
}
