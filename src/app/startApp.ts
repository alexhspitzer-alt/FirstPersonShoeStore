import { createEngine, resizeEngine } from '../engine/createEngine';
import { createScene } from '../scene/createScene';
import { attachPointerControls } from '../input/attachPointerControls';
import { createPlayerControls } from '../systems/createPlayerControls';
import { createObjectInteraction } from '../systems/createObjectInteraction';
import { GREY_SHOEBOX, GREY_SHOEBOX_LID } from '../world/createShoebox';

export function startApp(canvas: HTMLCanvasElement): () => void {
  const engine = createEngine(canvas);
  const { scene, camera, floor, updatePlayerBody } = createScene(engine);
  const player = createPlayerControls(scene, camera, floor);
  const objects = createObjectInteraction(scene, camera, [GREY_SHOEBOX, GREY_SHOEBOX_LID], [[GREY_SHOEBOX.id, GREY_SHOEBOX_LID.id]]);
  const detachControls = attachPointerControls(canvas, { ...player, tapAt: objects.tapAt });
  const render = (): void => {
    const deltaSeconds = engine.getDeltaTime() / 1000;
    player.update(deltaSeconds);
    updatePlayerBody();
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
