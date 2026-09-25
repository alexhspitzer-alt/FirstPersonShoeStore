# First Person Shoe Store

Milestone 1: open the game and see a completely empty rectangular store. Nothing
moves. There are no controls, HUD, gameplay, external assets, physics, or backend.

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
npm run build      # TypeScript checks and production output in dist/
npm run preview    # Serve the production build locally
```

The lockfile pins dependency versions; use `npm ci` for reproducible clean installs.
The browser must support WebGL. Vite is a development/build tool, not a game backend.

## Structure

```text
src/
  main.ts                 DOM entry point and development cleanup
  style.css               Full-viewport canvas only
  config.ts               Room dimensions, viewpoint, rendering constants
  app/startApp.ts          Application lifecycle, render loop, resize, disposal
  engine/createEngine.ts  Babylon WebGL engine and capped pixel density
  scene/createScene.ts    Scene composition and lighting
  camera/createCamera.ts  Stationary, input-free camera
  world/createStore.ts    Six primitive room surfaces and neutral materials
  systems/README.md       Guidance for future gameplay modules; none exist yet
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

## GitHub Pages later

`vite.config.ts` uses `base: './'`, so built asset URLs are relative to `index.html`.
The same `dist/` works at `/FirstPersonShoeStore/` or a custom domain root. A future
Pages workflow only needs `npm ci`, `npm run build`, and deployment of `dist/`;
deployment is not configured in this milestone. Do not publish the source root or
`node_modules/`. Import future assets through Vite or use `import.meta.env.BASE_URL`
for public assets; avoid hard-coded root-relative URLs. Revisit routing separately
if URL-based navigation is ever introduced.

## Manual smoke check

Open the dev server or production preview: the floor, walls, and ceiling should
form a lit, empty room. Resize between portrait and landscape. Drag, tap, scroll,
and press movement/arrow keys: the viewpoint must stay unchanged.

Natural next milestone: add a device-independent player input layer and basic
first-person movement/look with desktop and mobile controls, keeping the room empty.
