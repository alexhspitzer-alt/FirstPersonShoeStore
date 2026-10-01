import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { PLAYER_FEET } from '../config';
import type { createPlayerFeet } from '../player/createPlayerFeet';
import type { createSocks } from '../player/createSocks';
import type { ObjectInteractionOptions } from './createObjectInteraction';

type Side = 'left' | 'right';

/** Equipped/held/dropped are states of the same sock mesh and definition. */
export function createFootEquipment(
  scene: Scene,
  feet: ReturnType<typeof createPlayerFeet>,
  socks: ReturnType<typeof createSocks>,
) {
  const bareFeet = {
    left: scene.getMeshByName('player-left-foot') as Mesh,
    right: scene.getMeshByName('player-right-foot') as Mesh,
  };
  const worn = new Map<Side, Mesh>();
  const wearers = new Map<Mesh, Side>();
  const sockByMesh = new Map(socks.map((sock) => [sock.mesh, sock]));

  function equip(mesh: Mesh, side: Side): void {
    const sock = sockByMesh.get(mesh)!;
    mesh.parent = feet.slots[side];
    mesh.position.set(0, 0, 0);
    mesh.rotationQuaternion = null;
    mesh.rotation.set(0, 0, 0);
    mesh.scaling.set((side === 'left' ? -1 : 1) / sock.sign, 1, 1);
    mesh.layerMask = PLAYER_FEET.layerMask;
    worn.set(side, mesh);
    wearers.set(mesh, side);
    bareFeet[side].setEnabled(false);
  }
  for (const sock of socks) equip(sock.mesh, sock.sign < 0 ? 'left' : 'right');

  const interaction: ObjectInteractionOptions = {
    pickTarget(x, y, held) {
      feet.update();
      const canDressFoot = !!held && sockByMesh.has(held);
      // Body geometry is visually overlaid, so resolve that view first. Bare
      // feet participate only when empty and a relevant object is being held.
      const bodyHit = scene.pick(x, y, (candidate) => {
        if (!candidate.isEnabled() || !candidate.isVisible) return false;
        if (wearers.has(candidate as Mesh)) return true;
        return canDressFoot && (['left', 'right'] as const).some((side) =>
          !worn.has(side) && candidate === bareFeet[side]);
      }, false, feet.viewCamera);
      if (bodyHit?.hit) return bodyHit.pickedMesh as Mesh;
      const worldCamera = scene.cameraToUseForPointers!;
      return scene.pick(x, y, (candidate) => candidate.isEnabled()
        && candidate.isVisible && candidate.isPickable
        && (candidate.layerMask & worldCamera.layerMask) !== 0,
      false, worldCamera)?.pickedMesh as Mesh | null;
    },
    onPickup(mesh) {
      const side = wearers.get(mesh);
      if (!side) return;
      wearers.delete(mesh);
      worn.delete(side);
      bareFeet[side].setEnabled(true);
    },
    useHeldObject({ held, target, releaseHeld }) {
      if (!sockByMesh.has(held)) return false;
      const side = (['left', 'right'] as const).find((side) =>
        target === bareFeet[side] && !worn.has(side));
      if (!side) return false;
      releaseHeld();
      equip(held, side);
      return true;
    },
  };
  return { interaction, worn };
}
