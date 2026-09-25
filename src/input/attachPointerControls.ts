import { CONTROLS } from '../config';

export interface PointerActions {
  look(deltaX: number, deltaY: number): void;
  stepAt(x: number, y: number): void;
}

export function attachPointerControls(canvas: HTMLCanvasElement, actions: PointerActions): () => void {
  let previousTap: { x: number; y: number; time: number } | undefined;
  let gesture: {
    id: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    startedAt: number;
    dragged: boolean;
  } | undefined;

  const resetGesture = (): void => {
    const id = gesture?.id;
    gesture = undefined;
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  };
  const cancel = (): void => {
    previousTap = undefined;
    resetGesture();
  };

  const down = (event: PointerEvent): void => {
    // A second finger cancels the gesture; pinching must never cause a step.
    if (!event.isPrimary) {
      cancel();
      return;
    }
    if (event.button !== 0) return;
    event.preventDefault();
    resetGesture();
    gesture = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startedAt: event.timeStamp,
      dragged: false,
    };
    canvas.setPointerCapture(event.pointerId);
  };

  const move = (event: PointerEvent): void => {
    if (!gesture || event.pointerId !== gesture.id) return;
    event.preventDefault();
    if (!gesture.dragged) {
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY)
        <= CONTROLS.dragThresholdPixels) return;
      gesture.dragged = true;
      previousTap = undefined;
    }
    actions.look(event.clientX - gesture.lastX, event.clientY - gesture.lastY);
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
  };

  const up = (event: PointerEvent): void => {
    if (!gesture || event.pointerId !== gesture.id) return;
    move(event); // Account for any final motion even if a move event was coalesced.
    const tapped = !gesture.dragged
      && event.timeStamp - gesture.startedAt <= CONTROLS.maxTapMilliseconds;
    resetGesture();
    if (tapped) {
      const rect = canvas.getBoundingClientRect();
      // Babylon's picking API expects canvas-local CSS pixels, not device pixels.
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
        previousTap = undefined;
        return;
      }
      if (previousTap && event.timeStamp - previousTap.time <= CONTROLS.doubleTapMilliseconds
        && Math.hypot(x - previousTap.x, y - previousTap.y) <= CONTROLS.doubleTapRadiusPixels) {
        previousTap = undefined;
        actions.stepAt(x, y);
      } else {
        previousTap = { x, y, time: event.timeStamp };
      }
    } else {
      previousTap = undefined;
    }
  };

  const interrupted = (event: PointerEvent): void => {
    if (event.pointerId === gesture?.id) cancel();
  };
  const preventContextMenu = (event: Event): void => event.preventDefault();
  const document = canvas.ownerDocument;
  const window = document.defaultView;

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', interrupted);
  canvas.addEventListener('lostpointercapture', interrupted);
  canvas.addEventListener('contextmenu', preventContextMenu);
  window?.addEventListener('blur', cancel);
  window?.addEventListener('resize', cancel);
  document.addEventListener('visibilitychange', cancel);

  return () => {
    cancel();
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', interrupted);
    canvas.removeEventListener('lostpointercapture', interrupted);
    canvas.removeEventListener('contextmenu', preventContextMenu);
    window?.removeEventListener('blur', cancel);
    window?.removeEventListener('resize', cancel);
    document.removeEventListener('visibilitychange', cancel);
  };
}
