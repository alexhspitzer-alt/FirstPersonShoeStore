import './style.css';
import { startApp } from './app/startApp';

const canvas = document.querySelector<HTMLCanvasElement>('#game');

if (!canvas) {
  throw new Error('Game canvas was not found.');
}

try {
  const dispose = startApp(canvas);

  // Vite can replace this module without leaving another engine or listener alive.
  if (import.meta.hot) {
    import.meta.hot.dispose(dispose);
  }
} catch (error) {
  // A failed WebGL context otherwise leaves only an empty canvas. This message
  // is a startup failure state, not part of the game's normal interface.
  console.error('The game could not start:', error);
  canvas.hidden = true;
  const message = document.createElement('p');
  message.className = 'startup-error';
  message.setAttribute('role', 'alert');
  message.textContent = error instanceof Error && /WebGL not supported/i.test(error.message)
    ? 'This browser could not start WebGL, which the 3D room needs. Open this page in a WebGL-enabled browser, or check that hardware acceleration is enabled.'
    : 'The 3D room could not start. Please reload the page. If it still fails, try another browser.';
  document.body.append(message);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      message.remove();
      canvas.hidden = false;
    });
  }
}
