# Gameplay systems

`createPlayerControls.ts` handles looking, floor picking, and short bounded steps.
Pointer gesture recognition lives separately in `input/attachPointerControls.ts`.
Add concrete modules here when interactions, quests, dialogue, inventory, audio,
or saves are actually needed.
Compose their startup, updates, and cleanup in `app/startApp.ts`; keep room geometry
in `world/` and camera construction in `camera/`. Future input should expose player
actions independently of whether they originate from touch, keyboard, or a controller.
There is intentionally no system registry, event bus, or empty base class yet.
