import assert from 'node:assert/strict';
import test from 'node:test';
import { attachPointerControls } from '../src/input/attachPointerControls';

class TestCanvas extends EventTarget {
  ownerDocument = Object.assign(new EventTarget(), { defaultView: new EventTarget() });
  captured = new Set<number>();
  setPointerCapture(id: number) { this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); }
  getBoundingClientRect() { return { left: 20, top: 30, width: 400, height: 800 }; }
}

function setup() {
  const canvas = new TestCanvas();
  const looks: number[][] = [];
  const steps: number[][] = [];
  const dispose = attachPointerControls(canvas as unknown as HTMLCanvasElement, {
    look: (x, y) => looks.push([x, y]),
    stepAt: (x, y) => steps.push([x, y]),
  });
  const send = (type: string, time: number, x = 100, y = 200, extra = {}) => {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries({
      pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: y, timeStamp: time, ...extra,
    })) Object.defineProperty(event, key, { value });
    canvas.dispatchEvent(event);
  };
  const tap = (time: number, x = 100, y = 200) => {
    send('pointerdown', time, x, y);
    send('pointerup', time + 30, x, y);
  };
  return { canvas, looks, steps, dispose, send, tap };
}

test('single tap does nothing; each nearby double-tap emits exactly one canvas-local step', () => {
  const h = setup();
  h.tap(0);
  assert.equal(h.steps.length, 0);
  h.tap(150, 102, 202);
  assert.deepEqual(h.steps, [[82, 172]]);
  h.tap(270);
  assert.equal(h.steps.length, 1);
  h.tap(410);
  assert.equal(h.steps.length, 2);
  h.dispose();
});

test('dragging and returning to the start looks but never counts as a tap', () => {
  const h = setup();
  h.tap(0);
  h.send('pointerdown', 80);
  h.send('pointermove', 100, 104, 203);
  assert.equal(h.looks.length, 0);
  h.send('pointermove', 120, 125, 180);
  h.send('pointermove', 140, 100, 200);
  h.send('pointerup', 160);
  h.tap(220);
  assert.equal(h.steps.length, 0);
  assert.deepEqual(h.looks.slice(0, 2), [[25, -20], [-25, 20]]);
  h.dispose();
});

test('slow, distant, and long-held taps do not form a double-tap', () => {
  const h = setup();
  h.tap(0);
  h.tap(500);
  h.tap(650, 220, 200);
  h.send('pointerdown', 800, 220, 200);
  h.send('pointerup', 1200, 220, 200);
  h.tap(1250, 220, 200);
  assert.equal(h.steps.length, 0);
  h.dispose();
});

test('cancellation, lost capture, multitouch, blur, resize, and hiding reset pending taps', () => {
  for (const interrupt of ['pointercancel', 'lostpointercapture', 'second-finger', 'blur', 'resize', 'visibilitychange']) {
    const h = setup();
    h.tap(0);
    h.send('pointerdown', 100);
    if (interrupt === 'second-finger') h.send('pointerdown', 110, 200, 200, { pointerId: 2, isPrimary: false });
    else if (interrupt === 'blur' || interrupt === 'resize') h.canvas.ownerDocument.defaultView.dispatchEvent(new Event(interrupt));
    else if (interrupt === 'visibilitychange') h.canvas.ownerDocument.dispatchEvent(new Event(interrupt));
    else h.send(interrupt, 110);
    h.send('pointerup', 150);
    h.tap(200);
    assert.equal(h.steps.length, 0, interrupt);
    h.tap(300);
    assert.equal(h.steps.length, 1, `${interrupt}: controls recover`);
    h.dispose();
  }
});

test('disposing releases capture and removes gesture listeners', () => {
  const h = setup();
  h.send('pointerdown', 0);
  assert.equal(h.canvas.captured.size, 1);
  h.dispose();
  assert.equal(h.canvas.captured.size, 0);
  h.tap(100);
  h.tap(200);
  assert.equal(h.steps.length, 0);
});
