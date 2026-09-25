# First Person Shoe Store

An empty rectangular store with touch-first looking and single-step movement.
There are no HUD, external assets, physics, or backend.

## Controls

- Drag anywhere to look left, right, up, or down. Vertical looking stops short of flipping over.
- Double-tap the visible floor to take one 0.7 m step toward that spot (shorter if nearby).
- Single taps, long presses, drags, and taps on walls/ceiling do not move you.
- Steps ease over 0.18 seconds and stop short of walls. Double-taps during a step
  are ignored rather than queued; looking still works during movement.

The same gestures work with a mouse or pen. There are no keyboard controls,
joystick, pointer lock, or buttons. Sensitivity, gesture thresholds, step size,
and room clearance live in `src/config.ts`.

## Run

Use Node.js 22.12+ (22.x) or Node.js 24+ and npm.

```sh
npm install
npm run dev
```

Open the URL Vite prints. To check from a phone on the same network, run
`npm run dev -- --host 0.0.0.0` and open the printed network URL.

```sh
npm run typecheck  # TypeScript checks only
npm test           # Gesture and headless scene movement checks
npm run build      # TypeScript checks and production output in dist/
npm run preview    # Serve the production build locally
```

The lockfile pins dependency versions; use `npm ci` for reproducible clean installs.
The browser must support WebGL. A startup failure displays a brief explanation;
successful startup shows only the room. Vite is a development/build tool, not a game backend.

## Structure

```text
src/
  main.ts                 DOM entry point and development cleanup
  style.css               Full-viewport canvas only
  config.ts               Room dimensions, viewpoint, rendering constants
  app/startApp.ts          Application lifecycle, render loop, resize, disposal
  engine/createEngine.ts  Babylon WebGL engine and capped pixel density
  scene/createScene.ts    Scene composition and lighting
  camera/createCamera.ts  Camera construction without built-in input handlers
  input/attachPointerControls.ts  Drag/double-tap recognition and cancellation
  world/createStore.ts    Six primitive room surfaces and neutral materials
  systems/createPlayerControls.ts  Look, floor picking, bounded step animation
```

One world unit is one metre. The room is 8 m wide × 14 m deep × 3.2 m high;
Y is up, the floor is at Y = 0, and X/Z = 0 is the room centre. A camera at
1.65 m eye height looks into the room from near the front-left corner. Shared
materials and simple lighting keep rendering inexpensive. Pixel density is capped
at 1.5, the canvas resizes with the viewport, and no desktop input API is assumed.
The camera maintains horizontal field of view across portrait/landscape layouts.

The application owns lifecycle and cleanup; the scene composes camera, lights, and
world. Add rooms/objects in `world/` and concrete gameplay modules in `systems/` as
needed. There is no framework or speculative gameplay infrastructure to maintain.

## GitHub Pages

`vite.config.ts` uses `base: './'`, so built asset URLs are relative to `index.html`.
The same `dist/` works at `/FirstPersonShoeStore/` or a custom domain root.
`.github/workflows/deploy.yml` installs locked dependencies, typechecks/builds, and
deploys only `dist/` after each push to `main`. It can also be run manually from
the Actions tab. In repository **Settings → Pages → Build and deployment**, choose
**GitHub Actions** as the source. Publishing the source branch directly serves
uncompiled TypeScript and produces a blank page.

Do not publish the source root or `node_modules/`.
Import future assets through Vite or use `import.meta.env.BASE_URL`
for public assets; avoid hard-coded root-relative URLs. Revisit routing separately
if URL-based navigation is ever introduced.

## Manual smoke check

Open the dev server or production preview: the floor, walls, and ceiling should
form a lit, empty room. Resize between portrait and landscape. Drag to look in all
four directions, then double-tap the floor: exactly one short step should result.
A single tap or a drag ending on the floor must not move the camera. Double-tap a
wall: no movement. Try multi-touch and interrupt a gesture by switching apps:
neither should leave controls stuck or trigger a step. Walk toward each wall to
check that movement stops inside the room. Confirm floor picking after rotation.

Natural next milestone: add the first simple object and interaction using the
existing input/action separation, while keeping the rest of the room empty.
