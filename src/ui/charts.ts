/** Canvas drawing for the image stage. */

import { toRgba8 } from "../engine/image";
import type { Detection, HistogramData, ImageTensor, Keypoint } from "../engine/types";

export interface DrawState {
  readonly image: ImageTensor | null;
  readonly detections: readonly Detection[];
  readonly keypoints: readonly Keypoint[];
  readonly histogram: HistogramData | null;
  readonly edgeOverlay?: boolean;
}

function fit(canvas: HTMLCanvasElement, img: ImageTensor): void {
  const maxW = Math.max(160, Math.floor(canvas.parentElement?.clientWidth ?? 360) - 24);
  const maxH = 320;
  const scale = Math.min(maxW / img.width, maxH / img.height, 2);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
}

export function drawStage(canvas: HTMLCanvasElement, state: DrawState): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = state.image;
  if (!img) {
    canvas.width = 320;
    canvas.height = 200;
    ctx.fillStyle = "#0c141c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#7d8b96";
    ctx.font = "12px monospace";
    ctx.fillText("no image — load shapes", 16, 100);
    return;
  }

  fit(canvas, img);
  const off = document.createElement("canvas");
  off.width = img.width;
  off.height = img.height;
  const octx = off.getContext("2d");
  if (!octx) return;
  const rgba = toRgba8(img);
  const copy = new Uint8ClampedArray(rgba);
  const imageData = new ImageData(copy as unknown as ImageDataArray, img.width, img.height);
  octx.putImageData(imageData, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(off, 0, 0, canvas.width, canvas.height);

  const sx = canvas.width / img.width;
  const sy = canvas.height / img.height;

  // keypoints
  for (const k of state.keypoints) {
    ctx.beginPath();
    ctx.arc(k.x * sx, k.y * sy, Math.max(2, 3 * Math.min(sx, sy)), 0, Math.PI * 2);
    ctx.fillStyle = k.kind === "template" ? "#9B7EDE" : "#F0B429";
    ctx.fill();
  }

  // detections
  for (const d of state.detections) {
    const x = d.box.x * sx;
    const y = d.box.y * sy;
    const w = d.box.w * sx;
    const h = d.box.h * sy;
    ctx.lineWidth = 2;
    ctx.strokeStyle = d.label.includes("mask") ? "#2A9D8F" : "#5B8DEF";
    ctx.strokeRect(x, y, w, h);
    const label = `${d.label} ${(d.score * 100).toFixed(0)}%`;
    ctx.font = "11px sans-serif";
    const tw = ctx.measureText(label).width + 8;
    ctx.fillStyle = d.label.includes("mask") ? "rgba(42,157,143,0.9)" : "rgba(91,141,239,0.9)";
    ctx.fillRect(x, Math.max(0, y - 16), tw, 15);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x + 4, Math.max(11, y - 4));
    if (d.label.includes("mask")) {
      ctx.fillStyle = "rgba(42,157,143,0.25)";
      ctx.fillRect(x, y, w, h);
    }
  }
}

export function drawHistogram(canvas: HTMLCanvasElement, hist: HistogramData | null): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = canvas.clientWidth * 2;
  canvas.height = 100;
  ctx.fillStyle = "#0c141c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!hist) {
    ctx.fillStyle = "#7d8b96";
    ctx.fillText("no histogram", 10, 50);
    return;
  }
  const max = Math.max(...hist.bins, 1);
  const bw = canvas.width / hist.binCount;
  for (let i = 0; i < hist.binCount; i++) {
    const h = (hist.bins[i] / max) * (canvas.height - 16);
    ctx.fillStyle = "#F0B429";
    ctx.fillRect(i * bw, canvas.height - h - 2, Math.max(1, bw - 1), h);
  }
}
