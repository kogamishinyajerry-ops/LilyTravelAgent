import {
  AmbientLight,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  FrontSide,
  BackSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  TorusGeometry,
} from "three";
import type { Light, Material, Side } from "three";
import type {
  LandmarkLight,
  LandmarkMaterialSide,
  LandmarkMaterialSpec,
  LandmarkPreset,
  LandmarkPrimitive,
  LandmarkPrimitiveType,
} from "./landmark-preset";

/**
 * landmark-renderer — generic Three.js renderer for a `LandmarkPreset`.
 *
 * Turns a JSON-serializable preset (materials + primitives + lights) into
 * an actual `THREE.Group` that can be plugged into
 * `components/dream-skyline-scene.tsx`. The renderer is intentionally
 * stateless and side-effect free apart from the disposables array, which
 * it pushes geometries, materials and lights into so the caller can
 * release GPU resources when the scene unmounts.
 *
 * Design notes:
 *  - Materials are de-duplicated by `materialId`, so two primitives
 *    that share a `materialId` reuse the same `Material` instance.
 *  - Primitives of type `"group"` are recursively rendered and their
 *    `children` (an optional extension on the primitive shape) become
 *    nested children of the resulting `Group`.
 *  - The renderer is additive only — it never mutates the preset.
 */

const DEFAULT_BOX_SIZE: [number, number, number] = [1, 1, 1];
const DEFAULT_SPHERE_RADIUS = 1;
const DEFAULT_SPHERE_SEGMENTS = 16;
const DEFAULT_CYLINDER_SEGMENTS = 16;
const DEFAULT_CONE_SEGMENTS = 16;
const DEFAULT_PLANE_SIZE: [number, number] = [1, 1];
const DEFAULT_TORUS_RADIUS = 1;
const DEFAULT_TORUS_TUBE = 0.4;
const DEFAULT_TORUS_RADIAL_SEGMENTS = 16;
const DEFAULT_TORUS_TUBULAR_SEGMENTS = 48;

/**
 * Optional extension on `LandmarkPrimitive` that allows nested groups.
 * The base type in `landmark-preset.ts` does not declare `children`, so
 * callers building a preset at runtime may attach it directly to the
 * primitive object — the renderer reads it defensively.
 */
export type RenderableLandmarkPrimitive = LandmarkPrimitive & {
  children?: RenderableLandmarkPrimitive[];
};

function sideToThree(side: LandmarkMaterialSide | undefined): Side {
  if (side === "back") return BackSide;
  if (side === "double") return DoubleSide;
  return FrontSide;
}

/**
 * Build a single `THREE.Material` from a material spec. The choice of
 * material class depends on whether the spec is emissive (Standard) or
 * plain (Basic) — for landmarks we keep the surface small enough that
 * Standard is fine, but transparent / unlit cases (e.g. glow billboards)
 * can pass through unchanged.
 */
function createMaterialFromSpec(spec: LandmarkMaterialSpec): Material {
  const hasEmissive = Boolean(spec.emissive);
  const isTransparent = spec.opacity !== undefined && spec.opacity < 1;
  const baseOptions = {
    color: spec.color,
    side: sideToThree(spec.side),
    transparent: isTransparent,
    opacity: spec.opacity ?? 1,
  };

  if (hasEmissive) {
    return new MeshStandardMaterial({
      ...baseOptions,
      roughness: spec.roughness ?? 0.7,
      metalness: spec.metalness ?? 0.1,
      emissive: spec.emissive,
      emissiveIntensity: spec.emissiveIntensity ?? 1,
    });
  }

  if (spec.roughness !== undefined || spec.metalness !== undefined) {
    return new MeshStandardMaterial({
      ...baseOptions,
      roughness: spec.roughness ?? 0.7,
      metalness: spec.metalness ?? 0.05,
    });
  }

  return new MeshBasicMaterial(baseOptions);
}

/**
 * Build a `THREE.Light` from a `LandmarkLight` spec. Mirrors the three
 * supported light types in `lib/landmark-preset.ts`: point, directional,
 * ambient.
 */
export function renderLandmarkLight(light: LandmarkLight): Light {
  if (light.type === "directional") {
    const threeLight = new DirectionalLight(light.color, light.intensity);
    if (light.position) threeLight.position.set(...light.position);
    return threeLight;
  }

  if (light.type === "ambient") {
    return new AmbientLight(light.color, light.intensity);
  }

  const threeLight = new PointLight(light.color, light.intensity);
  if (light.position) threeLight.position.set(...light.position);
  return threeLight;
}

/**
 * Build a `THREE.BoxGeometry` for a primitive, falling back to a unit
 * cube if no size is provided.
 */
function buildBoxGeometry(primitive: RenderableLandmarkPrimitive): BoxGeometry {
  const size = primitive.size ?? DEFAULT_BOX_SIZE;
  return new BoxGeometry(size[0], size[1], size[2]);
}

function buildSphereGeometry(primitive: RenderableLandmarkPrimitive): SphereGeometry {
  const radius = primitive.radius ?? DEFAULT_SPHERE_RADIUS;
  const segments = primitive.segments ?? DEFAULT_SPHERE_SEGMENTS;
  return new SphereGeometry(radius, segments, segments);
}

function buildCylinderGeometry(primitive: RenderableLandmarkPrimitive): CylinderGeometry {
  const size = primitive.size ?? [primitive.radius ?? 0.5, 1, primitive.radius ?? 0.5];
  const radiusTop = size[0];
  const height = size[1];
  const radiusBottom = size[2] ?? radiusTop;
  const segments = primitive.segments ?? DEFAULT_CYLINDER_SEGMENTS;
  return new CylinderGeometry(radiusTop, radiusBottom, height, segments);
}

function buildConeGeometry(primitive: RenderableLandmarkPrimitive): ConeGeometry {
  const size = primitive.size ?? [primitive.radius ?? 0.5, 1, 0];
  const radius = size[0];
  const height = size[1];
  const segments = primitive.segments ?? DEFAULT_CONE_SEGMENTS;
  return new ConeGeometry(radius, height, segments);
}

function buildPlaneGeometry(primitive: RenderableLandmarkPrimitive): PlaneGeometry {
  const size = primitive.size ?? [DEFAULT_PLANE_SIZE[0], DEFAULT_PLANE_SIZE[1], 0];
  return new PlaneGeometry(size[0], size[1]);
}

function buildTorusGeometry(primitive: RenderableLandmarkPrimitive): TorusGeometry {
  const size = primitive.size ?? [DEFAULT_TORUS_RADIUS, DEFAULT_TORUS_TUBE, 0, 0];
  const radius = size[0];
  const tube = size[1] ?? DEFAULT_TORUS_TUBE;
  const radialSegments = primitive.segments ?? DEFAULT_TORUS_RADIAL_SEGMENTS;
  const tubularSegments = DEFAULT_TORUS_TUBULAR_SEGMENTS;
  return new TorusGeometry(radius, tube, radialSegments, tubularSegments);
}

function buildPrimitiveGeometry(primitive: RenderableLandmarkPrimitive) {
  const type: LandmarkPrimitiveType = primitive.type;
  switch (type) {
    case "box":
      return buildBoxGeometry(primitive);
    case "sphere":
      return buildSphereGeometry(primitive);
    case "cylinder":
      return buildCylinderGeometry(primitive);
    case "cone":
      return buildConeGeometry(primitive);
    case "plane":
      return buildPlaneGeometry(primitive);
    case "torus":
      return buildTorusGeometry(primitive);
    case "group":
      return null;
    default: {
      // Exhaustiveness check — should never reach here in TS, but the
      // runtime path stays safe if a future schema is added.
      const exhaustive: never = type;
      throw new Error(`landmark-renderer: unknown primitive type ${String(exhaustive)}`);
    }
  }
}

function applyTransform(
  object: Mesh | Group,
  primitive: RenderableLandmarkPrimitive,
): void {
  object.position.set(...primitive.position);
  if (primitive.rotation) object.rotation.set(...primitive.rotation);
  if (primitive.scale) object.scale.set(...primitive.scale);
}

/**
 * Render a single primitive into an Object3D. Returns a `Mesh` for
 * geometry primitives and a `Group` for nested-group primitives. The
 * caller is responsible for adding the result into a scene graph.
 */
function renderPrimitive(
  primitive: RenderableLandmarkPrimitive,
  materialsById: Map<string, Material>,
  disposables: Array<{ dispose: () => void }>,
): Mesh | Group {
  if (primitive.type === "group") {
    const group = new Group();
    applyTransform(group, primitive);
    for (const child of primitive.children ?? []) {
      const rendered = renderPrimitive(child, materialsById, disposables);
      group.add(rendered);
    }
    return group;
  }

  const geometry = buildPrimitiveGeometry(primitive);
  if (!geometry) {
    // TS exhaustiveness — should not be reachable.
    throw new Error("landmark-renderer: missing geometry for non-group primitive");
  }
  disposables.push(geometry);

  const material = materialsById.get(primitive.materialId);
  if (!material) {
    throw new Error(
      `landmark-renderer: primitive ${primitive.id} references unknown materialId ${primitive.materialId}`,
    );
  }

  const mesh = new Mesh(geometry, material);
  applyTransform(mesh, primitive);
  return mesh;
}

/**
 * Render a `LandmarkPreset` into a `THREE.Group`. The returned group's
 * children are the meshes described by `preset.primitives` (recursively
 * expanded for nested groups) plus the lights in `preset.lights`.
 *
 * Every geometry, material and light created by this function is pushed
 * to `disposables` so the caller can `dispose()` them in one place when
 * the scene unmounts. Materials are de-duplicated by `materialId`, so
 * disposing once is enough.
 */
export function renderLandmarkPreset(
  preset: LandmarkPreset,
  disposables: Array<{ dispose: () => void }>,
): Group {
  const group = new Group();
  group.name = `landmark:${preset.id}`;

  // Build and de-duplicate materials by materialId. We push each unique
  // material to the disposables array exactly once.
  const materialsById = new Map<string, Material>();
  for (const [materialId, spec] of Object.entries(preset.materials)) {
    if (materialsById.has(materialId)) continue;
    const material = createMaterialFromSpec(spec);
    materialsById.set(materialId, material);
    disposables.push(material);
  }

  // Render primitives. Cast to RenderableLandmarkPrimitive so we can
  // read the optional `children` field on group nodes — the base
  // LandmarkPrimitive type does not declare it.
  const renderable = preset.primitives as RenderableLandmarkPrimitive[];
  for (const primitive of renderable) {
    const node = renderPrimitive(primitive, materialsById, disposables);
    group.add(node);
  }

  // Add lights as direct children of the group. Lights are themselves
  // disposable in Three.js.
  if (preset.lights) {
    for (const lightSpec of preset.lights) {
      const light = renderLandmarkLight(lightSpec);
      group.add(light);
      disposables.push(light);
    }
  }

  return group;
}

/**
 * Count the total number of primitives (including descendants inside
 * nested groups) defined on a preset. Useful for debugging and for
 * gating heavy scenes behind a primitive budget.
 */
export function countPresetsPrimitives(preset: LandmarkPreset): number {
  let total = 0;
  const walk = (primitives: RenderableLandmarkPrimitive[]): void => {
    for (const primitive of primitives) {
      total += 1;
      if (primitive.type === "group" && primitive.children) {
        walk(primitive.children);
      }
    }
  };
  walk(preset.primitives as RenderableLandmarkPrimitive[]);
  return total;
}
