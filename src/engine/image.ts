/**
 * Image tensor construction and pure pixel operations.
 *
 * Procedural images are deterministic (seeded) so goals stay stable across runs.
 * Ops are educational approximations — not a production vision library.
 */

import type {
  BBox,
  Detection,
  HistogramData,
  ImageId,
  ImageTensor,
  Keypoint,
} from "./types";

/** Stable tiny PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clampU8(v: number): number {
  const x = Math.round(v);
  return x < 0 ? 0 : x > 255 ? 255 : x;
}

export function emptyTensor(
  width: number,
  height: number,
  channels: number,
  fill = 0,
): ImageTensor {
  const data = new Float32Array(width * height * channels);
  if (fill !== 0) data.fill(fill);
  return {
    id: `img-${width}x${height}c${channels}`,
    width,
    height,
    channels,
    dtype: "float32",
    data,
  };
}

export function cloneTensor(src: ImageTensor): ImageTensor {
  return {
    ...src,
    data: new Float32Array(src.data),
  };
}

export function samplePixel(
  img: ImageTensor,
  x: number,
  y: number,
  channel: number,
): number {
  const xi = Math.min(img.width - 1, Math.max(0, Math.round(x)));
  const yi = Math.min(img.height - 1, Math.max(0, Math.round(y)));
  const c = Math.min(img.channels - 1, Math.max(0, channel));
  return img.data[(yi * img.width + xi) * img.channels + c];
}

export function setPixel(
  img: ImageTensor,
  x: number,
  y: number,
  channel: number,
  value: number,
): void {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const c = Math.min(img.channels - 1, Math.max(0, channel));
  img.data[(Math.floor(y) * img.width + Math.floor(x)) * img.channels + c] = value;
}

export function meanStd(img: ImageTensor): { mean: number; std: number } {
  const n = img.data.length;
  if (n === 0) return { mean: 0, std: 0 };
  let sum = 0;
  for (let i = 0; i < n; i++) sum += img.data[i];
  const mean = sum / n;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const d = img.data[i] - mean;
    acc += d * d;
  }
  return { mean, std: Math.sqrt(acc / n) };
}

/** RGB float 0..1 for canvas drawing. */
export function toRgba8(img: ImageTensor): Uint8ClampedArray {
  const out = new Uint8ClampedArray(img.width * img.height * 4);
  for (let i = 0, p = 0; i < img.width * img.height; i++, p += 4) {
    if (img.channels === 1) {
      const g = clampU8(img.data[i] * 255);
      out[p] = g;
      out[p + 1] = g;
      out[p + 2] = g;
      out[p + 3] = 255;
    } else {
      out[p] = clampU8(img.data[i * img.channels] * 255);
      out[p + 1] = clampU8(img.data[i * img.channels + 1] * 255);
      out[p + 2] = clampU8(img.data[i * img.channels + 2] * 255);
      out[p + 3] =
        img.channels >= 4 ? clampU8(img.data[i * img.channels + 3] * 255) : 255;
    }
  }
  return out;
}

function fillRgb(
  img: ImageTensor,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
): void {
  const i = (y * img.width + x) * img.channels;
  img.data[i] = r;
  img.data[i + 1] = g;
  img.data[i + 2] = b;
}

function drawRect(
  img: ImageTensor,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  g: number,
  b: number,
  filled = true,
): void {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      const edge = !filled && x > x0 + 1 && x < x1 - 1 && y > y0 + 1 && y < y1 - 1;
      if (edge) continue;
      fillRgb(img, x, y, r, g, b);
    }
  }
}

function drawCircle(
  img: ImageTensor,
  cx: number,
  cy: number,
  radius: number,
  r: number,
  g: number,
  b: number,
  filled = true,
): void {
  const r2 = radius * radius;
  for (let y = cy - radius - 1; y <= cy + radius + 1; y++) {
    for (let x = cx - radius - 1; x <= cx + radius + 1; x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d2 > r2) continue;
      if (!filled && d2 < (radius - 2) * (radius - 2)) continue;
      fillRgb(img, x, y, r, g, b);
    }
  }
}

/**
 * Build a deterministic teaching image.
 *
 * Args:
 *   id: which procedural scene
 *   width: image width (default 256)
 *   height: image height (default 256)
 * Returns:
 *   ImageTensor in RGB float32 (0..1 channels)
 */
export function makeImage(
  id: ImageId,
  width = 256,
  height = 256,
): ImageTensor {
  const img = emptyTensor(width, height, 3);
  const rnd = mulberry32(hashId(id));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1);
      const v = y / (height - 1);
      let r = 0.12;
      let g = 0.14;
      let b = 0.18;

      if (id === "gradient") {
        r = 0.1 + u * 0.8;
        g = 0.1 + v * 0.8;
        b = 0.2 + (u + v) * 0.3;
      } else if (id === "noise") {
        const n = rnd();
        r = 0.2 + n * 0.6;
        g = 0.2 + rnd() * 0.6;
        b = 0.2 + rnd() * 0.6;
      } else if (id === "checker") {
        const cell = Math.floor(x / 32) + Math.floor(y / 32);
        const on = cell % 2 === 0;
        r = g = b = on ? 0.9 : 0.12;
      } else if (id === "text") {
        r = g = b = 0.92;
      } else if (id === "empty") {
        r = g = b = 0.08;
      } else {
        // base for shapes / coins / street / faces
        r = 0.1 + u * 0.15;
        g = 0.12 + v * 0.18;
        b = 0.16 + (1 - u) * 0.12;
      }
      fillRgb(img, x, y, clamp01(r), clamp01(g), clamp01(b));
    }
  }

  if (id === "shapes") {
    drawRect(img, 28, 28, 110, 110, 0.92, 0.28, 0.32);
    drawCircle(img, 180, 90, 48, 0.25, 0.55, 0.95);
    drawRect(img, 40, 160, 140, 230, 0.95, 0.75, 0.2);
    drawCircle(img, 190, 190, 36, 0.35, 0.8, 0.55);
  } else if (id === "coins") {
    drawCircle(img, 70, 80, 42, 0.85, 0.72, 0.25);
    drawCircle(img, 170, 70, 38, 0.8, 0.68, 0.22);
    drawCircle(img, 90, 180, 48, 0.88, 0.75, 0.28);
    drawCircle(img, 190, 175, 36, 0.78, 0.65, 0.2);
    drawCircle(img, 130, 120, 28, 0.82, 0.7, 0.24);
  } else if (id === "street") {
    drawRect(img, 0, 180, 256, 256, 0.25, 0.25, 0.28);
    drawRect(img, 20, 40, 70, 180, 0.45, 0.35, 0.3);
    drawRect(img, 90, 20, 150, 180, 0.35, 0.4, 0.5);
    drawRect(img, 170, 50, 230, 180, 0.5, 0.38, 0.32);
    drawRect(img, 110, 140, 160, 190, 0.7, 0.2, 0.15);
    drawCircle(img, 125, 195, 12, 0.15, 0.15, 0.15);
    drawCircle(img, 155, 195, 12, 0.15, 0.15, 0.15);
    drawRect(img, 200, 120, 220, 170, 0.2, 0.45, 0.25);
  } else if (id === "faces") {
    for (const [cx, cy, s] of [
      [80, 100, 55],
      [175, 120, 50],
    ] as const) {
      drawCircle(img, cx, cy, s, 0.85, 0.7, 0.55);
      drawCircle(img, cx - 18, cy - 10, 6, 0.15, 0.15, 0.18);
      drawCircle(img, cx + 18, cy - 10, 6, 0.15, 0.15, 0.18);
      drawRect(img, cx - 12, cy + 18, cx + 12, cy + 28, 0.55, 0.25, 0.25);
    }
  } else if (id === "text") {
    // block glyphs for template matching
    for (let y = 80; y < 160; y += 20) {
      for (let x = 40; x < 210; x += 30) {
        drawRect(img, x, y, x + 18, y + 14, 0.1, 0.12, 0.15);
      }
    }
    drawRect(img, 40, 80, 120, 160, 0.15, 0.2, 0.35);
    drawRect(img, 140, 90, 210, 150, 0.25, 0.3, 0.45);
  }

  return {
    ...img,
    id: `gen:${id}`,
    meta: { source: id, width, height },
  };
}

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function toGray(img: ImageTensor): ImageTensor {
  if (img.channels === 1) return cloneTensor(img);
  const out = emptyTensor(img.width, img.height, 1);
  for (let i = 0; i < img.width * img.height; i++) {
    const r = img.data[i * img.channels];
    const g = img.data[i * img.channels + 1];
    const b = img.data[i * img.channels + 2];
    // Rec.601 luma
    out.data[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return { ...out, id: `${img.id}:gray` };
}

export function histogram(img: ImageTensor, channel = 0, binCount = 32): HistogramData {
  const bins = new Array<number>(binCount).fill(0);
  const c = Math.min(channel, img.channels - 1);
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) {
    const v = img.data[i * img.channels + c];
    const b = Math.min(binCount - 1, Math.max(0, Math.floor(v * binCount)));
    bins[b]++;
  }
  return { bins, channel: c, binCount };
}

export function equalizeHistogram(img: ImageTensor): ImageTensor {
  const out = cloneTensor(img);
  const binCount = 256;
  const n = img.width * img.height;
  for (let c = 0; c < img.channels; c++) {
    const bins = new Array<number>(binCount).fill(0);
    for (let i = 0; i < n; i++) {
      const v = img.data[i * img.channels + c];
      bins[Math.min(255, Math.max(0, Math.round(v * 255)))]++;
    }
    const cdf = new Array<number>(binCount).fill(0);
    let acc = 0;
    for (let i = 0; i < binCount; i++) {
      acc += bins[i];
      cdf[i] = acc / n;
    }
    for (let i = 0; i < n; i++) {
      const v = Math.min(255, Math.max(0, Math.round(out.data[i * img.channels + c] * 255)));
      out.data[i * img.channels + c] = cdf[v];
    }
  }
  return { ...out, id: `${img.id}:eq` };
}

/**
 * Extract Harris corner responses (simplified Shi-Tomasi style).
 *
 * Returns top-N keypoints sorted by score.
 */
export function harrisCorners(
  img: ImageTensor,
  maxKeypoints = 12,
  threshold = 0.015,
): Keypoint[] {
  const gray = toGray(img);
  const { width, height } = gray;
  const ix = new Float32Array(width * height);
  const iy = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      ix[i] = gray.data[i + 1] - gray.data[i - 1];
      iy[i] = gray.data[i + width] - gray.data[i - width];
    }
  }
  const kps: Keypoint[] = [];
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      let ixx = 0;
      let iyy = 0;
      let ixy = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const i = (y + dy) * width + (x + dx);
          ixx += ix[i] * ix[i];
          iyy += iy[i] * iy[i];
          ixy += ix[i] * iy[i];
        }
      }
      const det = ixx * iyy - ixy * ixy;
      const trace = ixx + iyy;
      const resp = det - 0.04 * trace * trace;
      if (resp > threshold) {
        kps.push({ x, y, score: resp, kind: "corner" });
      }
    }
  }
  kps.sort((a, b) => b.score - a.score);
  return kps.slice(0, maxKeypoints);
}

export function orbKeypoints(img: ImageTensor, maxKeypoints = 16): Keypoint[] {
  return harrisCorners(img, maxKeypoints, 0.01).map((k) => ({
    ...k,
    kind: "orb" as const,
    score: k.score * 1.2,
  }));
}

export function detectFakeObjects(
  scene: string,
  detector: "yolo" | "ssd" | "fastrcnn",
  segmenter?: "unet" | "maskrcnn" | null,
): Detection[] {
  const table: Record<string, Detection[]> = {
    shapes: [
      { box: { x: 28, y: 28, w: 82, h: 82 }, label: "rectangle", score: 0.92, classId: 0 },
      { box: { x: 132, y: 42, w: 96, h: 96 }, label: "circle", score: 0.88, classId: 1 },
      { box: { x: 40, y: 160, w: 100, h: 70 }, label: "rectangle", score: 0.81, classId: 0 },
      { box: { x: 154, y: 154, w: 72, h: 72 }, label: "circle", score: 0.79, classId: 1 },
    ],
    coins: [
      { box: { x: 28, y: 38, w: 84, h: 84 }, label: "coin", score: 0.95, classId: 2 },
      { box: { x: 132, y: 32, w: 76, h: 76 }, label: "coin", score: 0.93, classId: 2 },
      { box: { x: 42, y: 132, w: 96, h: 96 }, label: "coin", score: 0.91, classId: 2 },
      { box: { x: 154, y: 139, w: 72, h: 72 }, label: "coin", score: 0.87, classId: 2 },
      { box: { x: 102, y: 92, w: 56, h: 56 }, label: "coin", score: 0.84, classId: 2 },
    ],
    street: [
      { box: { x: 20, y: 40, w: 50, h: 140 }, label: "building", score: 0.86, classId: 3 },
      { box: { x: 90, y: 20, w: 60, h: 160 }, label: "building", score: 0.9, classId: 3 },
      { box: { x: 170, y: 50, w: 60, h: 130 }, label: "building", score: 0.84, classId: 3 },
      { box: { x: 110, y: 140, w: 50, h: 50 }, label: "car", score: 0.94, classId: 4 },
      { box: { x: 200, y: 120, w: 20, h: 50 }, label: "person", score: 0.77, classId: 5 },
    ],
    faces: [
      { box: { x: 25, y: 45, w: 110, h: 110 }, label: "face", score: 0.97, classId: 6 },
      { box: { x: 125, y: 70, w: 100, h: 100 }, label: "face", score: 0.95, classId: 6 },
    ],
  };

  const base = table[scene] ?? [];
  const boost = detector === "yolo" ? 0.03 : detector === "ssd" ? 0.0 : -0.02;
  const dets = base.map((d) => ({
    ...d,
    score: Math.min(0.99, Math.max(0.2, d.score + boost)),
    label: segmenter && d.label === "face" ? `${d.label}/mask` : d.label,
  }));
  return dets;
}

export function matchTemplates(): {
  matches: { a: BBox; b: BBox; score: number }[];
  keypoints: Keypoint[];
} {
  const a: BBox = { x: 40, y: 80, w: 80, h: 80 };
  const b: BBox = { x: 140, y: 90, w: 70, h: 60 };
  return {
    matches: [{ a, b, score: 0.81 }],
    keypoints: [
      { x: 40, y: 80, score: 0.9, kind: "template" },
      { x: 120, y: 80, score: 0.9, kind: "template" },
      { x: 40, y: 160, score: 0.9, kind: "template" },
      { x: 120, y: 160, score: 0.9, kind: "template" },
    ],
  };
}
