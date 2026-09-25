import { createEngine, resizeEngine } from '../engine/createEngine';
import { createScene } from '../scene/createScene';
import { attachPointerControls } from '../input/attachPointerControls';
import { createPlayerControls } from '../systems/createPlayerControls';

export function startApp(canvas: HTMLCanvasElement): () => void {
  const engine = createEngine(canvas);
  const { scene, camera, floor } = createScene(engine);
  const player = createPlayerControls(scene, camera, floor);
  const detachControls = attachPointerControls(canvas, player);
  const render = (): void => {
    player.update(engine.getDeltaTime() / 1000);
    scene.render();
  };
  const resize = (): void => resizeEngine(engine);
  const observer = new ResizeObserver(resize);

  observer.observe(canvas);
  window.addEventListener('resize', resize);
  engine.runRenderLoop(render);

  // The app owns lifecycle. Future systems can update before scene.render()
  // and release their resources here; environment builders only construct world data.
  return () => {
    detachControls();
    observer.disconnect();
    window.removeEventListener('resize', resize);
    engine.stopRenderLoop(render);
    scene.dispose();
    engine.dispose();
  };
}
