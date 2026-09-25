import { createEngine, resizeEngine } from '../engine/createEngine';
import { createScene } from '../scene/createScene';

export function startApp(canvas: HTMLCanvasElement): () => void {
  const engine = createEngine(canvas);
  const scene = createScene(engine);
  const render = (): void => scene.render();
  const resize = (): void => resizeEngine(engine);
  const observer = new ResizeObserver(resize);

  observer.observe(canvas);
  window.addEventListener('resize', resize);
  engine.runRenderLoop(render);

  // The app owns lifecycle. Future systems can update before scene.render()
  // and release their resources here; environment builders only construct world data.
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', resize);
    engine.stopRenderLoop(render);
    scene.dispose();
    engine.dispose();
  };
}
