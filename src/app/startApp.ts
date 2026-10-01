import { createEngine, resizeEngine } from '../engine/createEngine';
import { createScene } from '../scene/createScene';
import { attachPointerControls } from '../input/attachPointerControls';
import { createPlayerControls } from '../systems/createPlayerControls';
import { createObjectInteraction } from '../systems/createObjectInteraction';

export function startApp(canvas: HTMLCanvasElement): () => void {
  const engine = createEngine(canvas);
  const { scene, camera, floor, feet, stock, socks, equipment } = createScene(engine);
  const player = createPlayerControls(scene, camera, floor);
  const objects = createObjectInteraction(scene, camera,
    [...stock.definitions, ...socks.map((sock) => sock.definition)],
    stock.restingPairs, equipment.interaction);
  const detachControls = attachPointerControls(canvas, { ...player, tapAt: objects.tapAt });
  const render = (): void => {
    const deltaSeconds = engine.getDeltaTime() / 1000;
    player.update(deltaSeconds);
    feet.update();
    objects.update(deltaSeconds);
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
