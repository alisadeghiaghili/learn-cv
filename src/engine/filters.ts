/**
 * Spatial filters, edges, morphology, and geometry.
 */

import {
  cloneTensor,
  emptyTensor,
  mulberry32,
  samplePixel,
  setPixel,
  toGray,
} from "./image";
import type { ImageTensor } from "./types";

export type Kernel = {
  readonly size: number;
  readonly data: readonly number[];
  readonly divisor: number;
  readonly bias: number;
};

export const KERNELS: Record<string, Kernel> = {
  identity: { size: 3, data: [0, 0, 0, 0, 1, 0, 0, 0, 0], divisor: 1, bias: 0 },
  box: {
    size: 3,
    data: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    divisor: 9,
    bias: 0,
  },
  gaussian: {
    size: 3,
    data: [1, 2, 1, 2, 4, 2, 1, 2, 1],
    divisor: 16,
    bias: 0,
  },
  sharpen: {
    size: 3,
    data: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    divisor: 1,
    bias: 0,
  },
  emboss: {
    size: 3,
    data: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
    divisor: 1,
    bias: 0.5,
  },
  sobelX: {
    size: 3,
    data: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
    divisor: 1,
    bias: 0.5,
  },
  sobelY: {
    size: 3,
    data: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
    divisor: 1,
    bias: 0.5,
  },
  laplacian: {
    size: 3,
    data: [0, 1, 0, 1, -4, 1, 0, 1, 0],
    divisor: 1,
    bias: 0.5,
  },
  highpass: {
    size: 3,
    data: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
    divisor: 1,
    bias: 0.5,
  },
};

/**
 * Convolve an image with a kernel (per channel).
 *
 * Args:
 *   img: input tensor
 *   kernel: convolution kernel
 * Returns:
 *   new ImageTensor with same spatial size
 */
export function convolve(img: ImageTensor, kernel: Kernel): ImageTensor {
  const out = emptyTensor(img.width, img.height, img.channels);
  const k = kernel.size;
  const half = Math.floor(k / 2);
  const kd = kernel.data;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      for (let c = 0; c < img.channels; c++) {
        let acc = 0;
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const yy = Math.min(img.height - 1, Math.max(0, y + dy));
            const xx = Math.min(img.width - 1, Math.max(0, x + dx));
            const ki = (dy + half) * k + (dx + half);
            acc += img.data[(yy * img.width + xx) * img.channels + c] * kd[ki];
          }
        }
        const v = acc / (kernel.divisor || 1) + kernel.bias;
        out.data[(y * img.width + x) * img.channels + c] = Math.min(1, Math.max(0, v));
      }
    }
  }
  return { ...out, id: `${img.id}:conv` };
}

export function gaussianBlur(img: ImageTensor, radius = 1): ImageTensor {
  let out = img;
  const passes = Math.max(1, Math.round(radius));
  for (let i = 0; i < passes; i++) {
    out = convolve(out, KERNELS.gaussian);
  }
  return { ...cloneTensor(out), id: `${img.id}:blur` };
}

export function boxBlur(img: ImageTensor, radius = 1): ImageTensor {
  let out = img;
  for (let i = 0; i < Math.max(1, radius); i++) {
    out = convolve(out, KERNELS.box);
  }
  return out;
}

export function medianBlur(img: ImageTensor, radius = 1): ImageTensor {
  const r = Math.max(1, radius);
  const out = emptyTensor(img.width, img.height, img.channels);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      for (let c = 0; c < img.channels; c++) {
        const vals: number[] = [];
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            vals.push(samplePixel(img, x + dx, y + dy, c));
          }
        }
        vals.sort((a, b) => a - b);
        out.data[(y * img.width + x) * img.channels + c] = vals[vals.length >> 1];
      }
    }
  }
  return { ...out, id: `${img.id}:median` };
}

export function sharpen(img: ImageTensor): ImageTensor {
  return convolve(img, KERNELS.sharpen);
}

export function emboss(img: ImageTensor): ImageTensor {
  return convolve(img, KERNELS.emboss);
}

export type EdgeMap = "sobel" | "laplacian" | "canny";

/**
 * Compute an edge magnitude map as a single-channel image.
 */
export function edges(img: ImageTensor, mode: EdgeMap): ImageTensor {
  const gray = toGray(img);
  if (mode === "laplacian") {
    return convolve(gray, KERNELS.laplacian);
  }
  if (mode === "canny") {
    // Educational Canny: blur → Sobel magnitude → double-ish threshold
    const blur = gaussianBlur(gray, 1);
    const gx = convolve(blur, KERNELS.sobelX);
    const gy = convolve(blur, KERNELS.sobelY);
    const out = emptyTensor(gray.width, gray.height, 1);
    for (let i = 0; i < gray.width * gray.height; i++) {
      const dx = gx.data[i] - 0.5;
      const dy = gy.data[i] - 0.5;
      const mag = Math.sqrt(dx * dx + dy * dy) * 2.2;
      out.data[i] = mag > 0.35 ? 1 : mag > 0.18 ? 0.55 : 0;
    }
    return { ...out, id: `${img.id}:canny` };
  }
  const gx = convolve(gray, KERNELS.sobelX);
  const gy = convolve(gray, KERNELS.sobelY);
  const out = emptyTensor(gray.width, gray.height, 1);
  for (let i = 0; i < gray.width * gray.height; i++) {
    const dx = gx.data[i] - 0.5;
    const dy = gy.data[i] - 0.5;
    out.data[i] = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
  }
  return { ...out, id: `${img.id}:sobel` };
}

/**
 * Global threshold. If `mode === 'otsu'`, threshold is estimated from the
 * histogram; otherwise a fixed level is used.
 */
export function threshold(
  img: ImageTensor,
  level = 0.5,
  mode: "binary" | "otsu" | "adaptive" = "binary",
): { image: ImageTensor; usedThreshold: number } {
  const gray = toGray(img);
  let t = level;
  if (mode === "otsu") {
    t = otsuThreshold(gray);
  }
  const out = emptyTensor(gray.width, gray.height, 1);
  for (let i = 0; i < gray.width * gray.height; i++) {
    if (mode === "adaptive") {
      // local mean-ish: compare to a shifted sample (cheap teaching approx)
      const x = i % gray.width;
      const y = Math.floor(i / gray.width);
      const local = samplePixel(gray, x - 4, y, 0) * 0.5 + samplePixel(gray, x + 4, y, 0) * 0.5;
      out.data[i] = gray.data[i] > local + 0.05 ? 1 : 0;
    } else {
      out.data[i] = gray.data[i] >= t ? 1 : 0;
    }
  }
  return {
    image: { ...out, id: `${img.id}:thresh` },
    usedThreshold: t,
  };
}

export function otsuThreshold(img: ImageTensor): number {
  const binCount = 256;
  const bins = new Array<number>(binCount).fill(0);
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) {
    bins[Math.min(255, Math.max(0, Math.round(img.data[i] * 255)))]++;
  }
  let sum = 0;
  for (let i = 0; i < binCount; i++) sum += i * bins[i];
  let sumB = 0;
  let wB = 0;
  let max = 0;
  let threshold = 128;
  for (let i = 0; i < binCount; i++) {
    wB += bins[i];
    if (wB === 0) continue;
    const wF = n - wB;
    if (wF === 0) break;
    sumB += i * bins[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) {
      max = between;
      threshold = i;
    }
  }
  return threshold / 255;
}

export function morph(
  img: ImageTensor,
  mode: "erode" | "dilate" | "open" | "close",
  radius = 1,
): ImageTensor {
  const bin = toGray(img);
  const apply = (src: ImageTensor, isErode: boolean): ImageTensor => {
    const out = emptyTensor(src.width, src.height, 1);
    const r = Math.max(1, radius);
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        let acc = isErode ? 1 : 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const v = samplePixel(src, x + dx, y + dy, 0);
            acc = isErode ? Math.min(acc, v) : Math.max(acc, v);
          }
        }
        out.data[y * src.width + x] = acc;
      }
    }
    return { ...out, id: `${src.id}:morph` };
  };

  if (mode === "erode") return apply(bin, true);
  if (mode === "dilate") return apply(bin, false);
  if (mode === "open") return apply(apply(bin, true), false);
  return apply(apply(bin, false), true);
}

export function resize(
  img: ImageTensor,
  width: number,
  height: number,
  method: "nearest" | "bilinear" = "bilinear",
): ImageTensor {
  const out = emptyTensor(width, height, img.channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = (x / Math.max(1, width - 1)) * (img.width - 1);
      const sy = (y / Math.max(1, height - 1)) * (img.height - 1);
      for (let c = 0; c < img.channels; c++) {
        if (method === "nearest") {
          setPixel(out, x, y, c, samplePixel(img, sx, sy, c));
        } else {
          const x0 = Math.floor(sx);
          const y0 = Math.floor(sy);
          const x1 = Math.min(img.width - 1, x0 + 1);
          const y1 = Math.min(img.height - 1, y0 + 1);
          const fx = sx - x0;
          const fy = sy - y0;
          const v00 = samplePixel(img, x0, y0, c);
          const v10 = samplePixel(img, x1, y0, c);
          const v01 = samplePixel(img, x0, y1, c);
          const v11 = samplePixel(img, x1, y1, c);
          const v =
            v00 * (1 - fx) * (1 - fy) +
            v10 * fx * (1 - fy) +
            v01 * (1 - fx) * fy +
            v11 * fx * fy;
          setPixel(out, x, y, c, v);
        }
      }
    }
  }
  return { ...out, id: `${img.id}:${width}x${height}` };
}

export function flip(img: ImageTensor, axis: "h" | "v" = "h"): ImageTensor {
  const out = emptyTensor(img.width, img.height, img.channels);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const sx = axis === "h" ? img.width - 1 - x : x;
      const sy = axis === "v" ? img.height - 1 - y : y;
      for (let c = 0; c < img.channels; c++) {
        setPixel(out, x, y, c, samplePixel(img, sx, sy, c));
      }
    }
  }
  return { ...out, id: `${img.id}:flip${axis}` };
}

export function rotate(img: ImageTensor, degrees: number): ImageTensor {
  const out = emptyTensor(img.width, img.height, img.channels);
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = img.width / 2;
  const cy = img.height / 2;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = cos * dx + sin * dy + cx;
      const sy = -sin * dx + cos * dy + cy;
      for (let c = 0; c < img.channels; c++) {
        setPixel(out, x, y, c, samplePixel(img, sx, sy, c));
      }
    }
  }
  return { ...out, id: `${img.id}:rot${degrees}` };
}

export function crop(
  img: ImageTensor,
  x: number,
  y: number,
  w: number,
  h: number,
): ImageTensor {
  const out = emptyTensor(w, h, img.channels);
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      for (let c = 0; c < img.channels; c++) {
        setPixel(out, xx, yy, c, samplePixel(img, x + xx, y + yy, c));
      }
    }
  }
  return { ...out, id: `${img.id}:crop` };
}

/**
 * Perspective-ish warp (simplified bilinear with a shear/keystone).
 */
export function warp(
  img: ImageTensor,
  strength = 0.15,
): ImageTensor {
  const out = emptyTensor(img.width, img.height, img.channels);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const u = x / img.width;
      const v = y / img.height;
      const sx = x + (u - 0.5) * strength * img.width * (0.5 + v);
      const sy = y + (v - 0.5) * strength * img.height * (0.5 + u);
      for (let c = 0; c < img.channels; c++) {
        setPixel(out, x, y, c, samplePixel(img, sx, sy, c));
      }
    }
  }
  return { ...out, id: `${img.id}:warp` };
}

export function addNoise(img: ImageTensor, amount = 0.08, seed = 7): ImageTensor {
  const rnd = mulberry32(seed);
  const out = cloneTensor(img);
  for (let i = 0; i < out.data.length; i++) {
    out.data[i] = Math.min(1, Math.max(0, out.data[i] + (rnd() - 0.5) * amount * 2));
  }
  return { ...out, id: `${img.id}:noise` };
}

export function adjustBrightness(img: ImageTensor, delta: number): ImageTensor {
  const out = cloneTensor(img);
  for (let i = 0; i < out.data.length; i++) {
    out.data[i] = Math.min(1, Math.max(0, out.data[i] + delta));
  }
  return out;
}

export function adjustContrast(img: ImageTensor, factor: number): ImageTensor {
  const out = cloneTensor(img);
  for (let i = 0; i < out.data.length; i++) {
    out.data[i] = Math.min(1, Math.max(0, (out.data[i] - 0.5) * factor + 0.5));
  }
  return out;
}

/** Color space toy conversions (RGB ↔ gray already in image.ts). */
export function rgbToHsvPreview(img: ImageTensor): {
  hue: ImageTensor;
  sat: ImageTensor;
  val: ImageTensor;
} {
  const hue = emptyTensor(img.width, img.height, 1);
  const sat = emptyTensor(img.width, img.height, 1);
  const val = emptyTensor(img.width, img.height, 1);
  for (let i = 0; i < img.width * img.height; i++) {
    const r = img.data[i * img.channels];
    const g = img.data[i * img.channels + 1];
    const b = img.data[i * img.channels + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d > 1e-6) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
      if (h < 0) h += 1;
    }
    hue.data[i] = h;
    sat.data[i] = max === 0 ? 0 : d / max;
    val.data[i] = max;
  }
  return {
    hue: { ...hue, id: `${img.id}:h` },
    sat: { ...sat, id: `${img.id}:s` },
    val: { ...val, id: `${img.id}:v` },
  };
}
