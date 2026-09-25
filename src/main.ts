import './style.css';
import { startApp } from './app/startApp';

const canvas = document.querySelector<HTMLCanvasElement>('#game');

if (!canvas) {
  throw new Error('Game canvas was not found.');
}

const dispose = startApp(canvas);

// Vite can replace this module without leaving another engine or listener alive.
if (import.meta.hot) {
  import.meta.hot.dispose(dispose);
}
