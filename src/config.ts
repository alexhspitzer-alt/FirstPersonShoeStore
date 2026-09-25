// One world unit is one metre. Y points up; the room's centre is X/Z = 0.
// Dimensions describe the usable interior; wall thickness extends outwards.
export const STORE = {
  width: 8,
  depth: 14,
  height: 3.2,
  shellThickness: 0.16,
  colors: {
    floor: '#aaa59b',
    walls: '#deddd6',
    ceiling: '#eeeae2',
  },
} as const;

export const VIEW = {
  eyeHeight: 1.65,
  x: -STORE.width * 0.32,
  z: -STORE.depth * 0.39,
  target: { x: STORE.width * 0.1, y: 1.5, z: STORE.depth * 0.27 },
  horizontalFov: (80 * Math.PI) / 180,
  nearClip: 0.05,
  farClip: 100,
} as const;

export const RENDERING = {
  // Bound pixel cost on high-density phones; CSS still fills the viewport.
  maxPixelRatio: 1.5,
  ambientIntensity: 0.75,
  directionalIntensity: 0.5,
} as const;
