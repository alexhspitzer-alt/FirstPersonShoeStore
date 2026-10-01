// One world unit is one metre. Y points up; the room's centre is X/Z = 0.
// Dimensions describe the usable interior; wall thickness extends outwards.
export const STORE = {
  width: 8,
  depth: 14,
  height: 3.2,
  shellThickness: 0.16,
  colors: {
    floor: '#b6b8b8',
    ceiling: '#e4e6e8',
    floorGrid: '#555b5f',
    ceilingGrid: '#69747b',
    // Cardinal axes: +Z north, +X east, -Z south, -X west.
    north: '#367acb',
    east: '#8fba45',
    south: '#e87937',
    west: '#9b6bd1',
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

export const CONTROLS = {
  lookRadiansPerPixel: 0.004,
  maxPitch: (85 * Math.PI) / 180,
  feetInspectionPitch: (80 * Math.PI) / 180,
  dragThresholdPixels: 8,
  maxTapMilliseconds: 300,
  doubleTapMilliseconds: 350,
  doubleTapRadiusPixels: 28,
  stepDistance: 0.7,
  stepDurationSeconds: 0.18,
  wallClearance: 0.25,
} as const;

// Checkout is toward the east wall, away from the starting camera and shelf.
export const CHECKOUT = {
  x: 2.35,
  z: 2.1,
  counter: { width: 2.3, height: 0.95, depth: 0.7 },
  clerkZ: 2.85,
  clerkHeight: 1.9,
} as const;

// Floor-anchored feet use a separate first-person view for size and framing.
export const PLAYER_FEET = {
  spacing: 0.32,
  length: 0.32,
  width: 0.15,
  height: 0.065,
  eyeToAnkleOffset: -0.035,
  color: '#bd927b',
  layerMask: 0x10000000,
  horizontalFov: (38 * Math.PI) / 180,
  minimumVerticalFov: (45 * Math.PI) / 180,
  screenCenterY: 0.86,
} as const;

export const SOCK = {
  color: '#f5f4ef',
  accentColor: '#8152bd',
  shellScale: 1.04,
  cuffHeight: 0.12,
  cuffDiameter: 0.10,
  cuffBottom: 0.04,
  ankleZ: -PLAYER_FEET.length * 0.25,
  zigzagRadius: 0.003,
} as const;
