import { Camera } from '@babylonjs/core/Cameras/camera';
import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { PLAYER_FEET } from '../config';

// A continuous footprint with a broad ball, inset arch, rounded heel, and five
// short toe tips. Mirroring puts each big toe on the inside of the stance.
const OUTLINE: readonly (readonly [number, number])[] = [
  [0, -0.5], [0.22, -0.48], [0.33, -0.4], [0.36, -0.24], [0.38, -0.08],
  [0.47, 0.12], [0.5, 0.25], [0.49, 0.32],
  [0.47, 0.36], [0.41, 0.38], [0.35, 0.35],
  [0.32, 0.4], [0.27, 0.43], [0.21, 0.42], [0.17, 0.39],
  [0.13, 0.46], [0.06, 0.48], [0.01, 0.46], [-0.02, 0.41],
  [-0.06, 0.49], [-0.13, 0.51], [-0.2, 0.49], [-0.23, 0.44],
  [-0.26, 0.49], [-0.35, 0.51], [-0.43, 0.48], [-0.47, 0.42],
  [-0.48, 0.3], [-0.43, 0.17], [-0.34, 0.02], [-0.29, -0.14],
  [-0.33, -0.32], [-0.27, -0.44], [-0.14, -0.49],
];

const SOCK_OUTLINE: readonly (readonly [number, number])[] = [
  [0, -0.5], [0.22, -0.48], [0.33, -0.4], [0.36, -0.24], [0.38, -0.08],
  [0.47, 0.12], [0.5, 0.30], [0.46, 0.44], [0.30, 0.51],
  [0.05, 0.53], [-0.24, 0.53], [-0.43, 0.48], [-0.49, 0.35],
  [-0.43, 0.17], [-0.34, 0.02], [-0.29, -0.14],
  [-0.33, -0.32], [-0.27, -0.44], [-0.14, -0.49],
];

/** Shared foot-shaped geometry; covered toes have a smooth fabric silhouette. */
export function createFootMesh(scene: Scene, name: string, sign: number, covered = false): Mesh {
  const outline = covered ? SOCK_OUTLINE : OUTLINE;
  const { width, height, length } = PLAYER_FEET;
  const positions: number[] = [];
  const indices: number[] = [];
  // Three connected contour rings bevel the sole and upper into one surface.
  for (const [scale, rise] of [[0.92, 0], [1, 0.28], [0.86, 0.72]]) {
    for (const [x, z] of outline) {
      const toeTaper = 1 - Math.max(0, z) * 0.55;
      positions.push(sign * x * width * scale!, height * rise! * toeTaper, z * length * scale!);
    }
  }
  const triangle = (a: number, b: number, c: number) => {
    // Babylon's default left-handed winding; mirror without flipping normals.
    indices.push(a, sign < 0 ? b : c, sign < 0 ? c : b);
  };
  const count = outline.length;
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < count; i++) {
      const next = (i + 1) % count;
      const a = ring * count + i;
      const b = ring * count + next;
      triangle(a, b + count, b);
      triangle(a, a + count, b + count);
    }
  }
  const sole = positions.length / 3;
  positions.push(0, 0, -length * 0.05);
  const upper = positions.length / 3;
  positions.push(0, height, -length * 0.08);
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    triangle(sole, i, next);
    triangle(upper, 2 * count + next, 2 * count + i);
  }
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  // Match primitive vertex attributes so fabric/cuffs can form one object.
  data.uvs = [];
  for (let i = 0; i < positions.length; i += 3) {
    data.uvs.push(positions[i]! / width + 0.5, positions[i + 2]! / length + 0.5);
  }
  const foot = new Mesh(name, scene);
  data.applyToMesh(foot);
  foot.layerMask = PLAYER_FEET.layerMask;
  foot.isPickable = false;
  foot.checkCollisions = false;
  return foot;
}

/** A first-person body view keeps the feet readable across viewport shapes. */
export function createPlayerFeet(scene: Scene, camera: TargetCamera) {
  const root = new TransformNode('player-feet-root', scene);
  const skin = new StandardMaterial('player-foot-skin', scene);
  skin.diffuseColor = Color3.FromHexString(PLAYER_FEET.color);
  skin.specularColor = Color3.Black();
  const makeFoot = (side: 'left' | 'right', sign: number) => {
    // Future removable shoes attach to this slot and use the same rendering layer.
    // The body still follows position/yaw at floor height, independently of pitch.
    const slot = new TransformNode(`player-${side}-foot-slot`, scene);
    slot.parent = root;
    slot.position.set(sign * PLAYER_FEET.spacing / 2, 0, PLAYER_FEET.eyeToAnkleOffset);
    const foot = createFootMesh(scene, `player-${side}-foot`, sign);
    foot.parent = slot;
    foot.material = skin;
    return slot;
  };
  const left = makeFoot('left', -1);
  const right = makeFoot('right', 1);

  // This pass only renders feet/equipment. Its tighter FOV enlarges the body
  // without changing the store camera, movement, or world-space object picking.
  const viewCamera = new TargetCamera('player-feet-camera', camera.position.clone(), scene);
  viewCamera.layerMask = PLAYER_FEET.layerMask;
  camera.layerMask &= ~PLAYER_FEET.layerMask;
  viewCamera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
  viewCamera.fov = PLAYER_FEET.horizontalFov;
  viewCamera.minZ = camera.minZ;
  viewCamera.maxZ = camera.maxZ;
  scene.activeCameras = [camera, viewCamera];
  scene.cameraToUseForPointers = camera;
  // Babylon leaves the last rendered camera active; restore the gameplay view.
  scene.onAfterRenderObservable.add(() => {
    scene.activeCamera = camera;
    scene.updateTransformMatrix();
  });

  const update = () => {
    root.position.set(camera.position.x, 0, camera.position.z);
    root.rotation.y = camera.rotation.y;
    viewCamera.position.copyFrom(camera.position);
    const aspect = scene.getEngine().getAspectRatio(viewCamera);
    // Keep the entire foot in frame when a phone rotates to landscape.
    viewCamera.fov = Math.max(PLAYER_FEET.horizontalFov,
      2 * Math.atan(Math.tan(PLAYER_FEET.minimumVerticalFov / 2) * aspect));
    const halfVerticalFovTangent = Math.tan(viewCamera.fov / 2) / aspect;
    const angleToFoot = Math.atan2(camera.position.y - PLAYER_FEET.height * 0.4, PLAYER_FEET.eyeToAnkleOffset);
    const lowerFrameAngle = Math.atan((2 * PLAYER_FEET.screenCenterY - 1) * halfVerticalFovTangent);
    // A continuous pitch clamp keeps the feet low instead of drifting to screen
    // center at full look-down. Frustum clipping reveals them without a toggle.
    viewCamera.rotation.set(Math.min(camera.rotation.x, angleToFoot - lowerFrameAngle), camera.rotation.y, 0);
  };
  update();
  return { root, slots: { left, right }, viewCamera, update };
}
