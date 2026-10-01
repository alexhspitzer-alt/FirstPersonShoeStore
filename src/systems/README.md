# Gameplay systems

`createPlayerControls.ts` handles looking, floor picking, and short bounded steps.
Pointer gesture recognition lives separately in `input/attachPointerControls.ts`.
Object class defaults and instance definitions live in `objects/`; gameplay systems
can consume those definitions when actual objects enter the scene.
Add concrete modules here when interactions, quests, dialogue, inventory, audio,
or saves are actually needed.
Compose their startup, updates, and cleanup in `app/startApp.ts`; keep room geometry
in `world/` and camera construction in `camera/`. Future input should expose player
actions independently of whether they originate from touch, keyboard, or a controller.
There is intentionally no system registry, event bus, or empty base class yet.

`createObjectInteraction.ts` owns the held object and vertical settling. Its
optional `useHeldObject` handler runs before pickup fallback; `releaseHeld()`
transfers an item to the handler without starting a fall. `onPickup` detaches
item-specific state, and `pickTarget` can resolve additional presentation views.
`createFootEquipment.ts` uses these hooks for sock/foot interactions; movement
is canceled at the foot-inspection pitch while look input stays enabled.
