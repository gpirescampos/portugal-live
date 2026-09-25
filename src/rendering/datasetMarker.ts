import * as Cesium from 'cesium';

/** Filled icons registered by the browser entry point from Phosphor assets. */
let icons: Readonly<Record<string, string>> = {};

export function registerDatasetMarkerIcons(datasetIcons: Readonly<Record<string, string>>): void {
  icons = datasetIcons;
  imageCache.clear();
}

const imageCache = new Map<string, HTMLCanvasElement>();
const scenesAwaitingAtlasUpdate = new WeakSet<Cesium.Scene>();
const appliedState = new WeakMap<Cesium.BillboardGraphics, {
  kind: string;
  selected: boolean;
  baseColor: Cesium.Color;
  size: number;
}>();

function datasetMarkerImage(kind: string): HTMLCanvasElement | undefined {
  const icon = icons[kind] ?? icons['map-pin'];
  const cached = imageCache.get(kind);
  if (cached) return cached;
  if (typeof document === 'undefined') return undefined;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) return undefined;

  const viewBox = icon.match(/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/);
  const paths = [...icon.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((match) => match[1]);
  if (!viewBox || paths.length === 0) return undefined;
  const [, , , viewWidthText, viewHeightText] = viewBox;
  const viewWidth = Number(viewWidthText);
  const viewHeight = Number(viewHeightText);
  const size = 50;
  const offsetX = (64 - size) / 2;
  const offsetY = (64 - size) / 2;
  const scale = size / Math.max(viewWidth, viewHeight);
  context.translate(offsetX, offsetY);
  context.scale(scale, scale);
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#071015';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(viewWidth, viewHeight) * 0.025;
  for (const data of paths) {
    const path = new Path2D(data);
    context.fill(path);
    context.strokeStyle = '#071015';
    context.stroke(path);
  }

  imageCache.set(kind, canvas);
  return canvas;
}

/** Creates or updates a dataset marker without replacing its Cesium graphics. */
export function updateDatasetMarker(
  entity: Cesium.Entity,
  kind: string,
  baseColor: Cesium.Color,
  size: number,
  selected: boolean,
  viewer?: Cesium.Viewer | null,
): void {
  const targets = new Set([entity, viewer?.entities.getById(entity.id)].filter((target): target is Cesium.Entity => Boolean(target)));
  let changed = false;
  let imageChanged = false;
  for (const target of targets) {
    if (!target.billboard) {
      target.billboard = new Cesium.BillboardGraphics({ disableDepthTestDistance: Number.POSITIVE_INFINITY });
      changed = true;
    }
    const billboard = target.billboard;
    const previous = appliedState.get(billboard);
    if (!previous || previous.kind !== kind) {
      const image = datasetMarkerImage(kind);
      if (image) {
        billboard.image = new Cesium.ConstantProperty(image);
        imageChanged = true;
      }
      changed = true;
    }
    if (!previous || previous.selected !== selected || !previous.baseColor.equals(baseColor)) {
      billboard.color = new Cesium.ConstantProperty(selected ? Cesium.Color.fromCssColorString('#ff4d6d') : baseColor);
      changed = true;
    }
    if (!previous || previous.selected !== selected) {
      billboard.scale = new Cesium.ConstantProperty(selected ? 1.5 : 1);
      changed = true;
    }
    if (!previous || previous.size !== size) {
      billboard.width = new Cesium.ConstantProperty(size);
      billboard.height = new Cesium.ConstantProperty(size);
      changed = true;
    }
    appliedState.set(billboard, { kind, selected, baseColor, size });
  }
  if (changed && viewer) requestMarkerRender(viewer.scene, imageChanged);
}

/**
 * Cesium adds billboard images to its texture atlas asynchronously. In
 * request-render mode, ask for one more frame after the first atlas update so
 * those newly ready textures are drawn without waiting for user interaction.
 */
function requestMarkerRender(scene: Cesium.Scene, imageChanged: boolean): void {
  if (imageChanged && !scenesAwaitingAtlasUpdate.has(scene)) {
    scenesAwaitingAtlasUpdate.add(scene);
    const removePostRenderListener = scene.postRender.addEventListener(() => {
      removePostRenderListener();
      scenesAwaitingAtlasUpdate.delete(scene);
      scene.requestRender();
    });
  }
  scene.requestRender();
}

/** Applies selection while retaining marker kind, color, and size from its renderer. */
export function applyDatasetMarkerState(
  entity: Cesium.Entity,
  kind: string,
  baseColor: Cesium.Color,
  selected: boolean,
  viewer?: Cesium.Viewer | null,
): void {
  const previous = entity.billboard ? appliedState.get(entity.billboard) : undefined;
  updateDatasetMarker(entity, kind, baseColor, previous?.size ?? 24, selected, viewer);
}

export function datasetMarkerSize(pixelSize: number): number {
  return Math.max(18, Math.min(30, pixelSize * 1.65));
}
