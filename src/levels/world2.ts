import type { GoalStep, Level } from "../engine/types";
import { winFromSteps } from "./win";

export const WORLD_TITLE = "WORLD 2 · CONVOLUTION IS STRUCTURE";

const w2_1_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the convolution concept",
    detail: "Type `concept convolution` to see how kernels slide over pixels.",
    command: "concept convolution",
    check: (s) => s.conceptInspected.includes("convolution"),
  },
  {
    id: "blur",
    label: "Apply a blur",
    detail: "Smooth the image with `blur gaussian 2`.",
    command: "blur gaussian 2",
    check: (s) => s.blurred,
  },
  {
    id: "stats",
    label: "Check the result",
    detail: "Type `show image` (or `mean`) to confirm the high-frequency sparkle is gone.",
    command: "mean",
    check: (s) => s.blurred && s.commandCount > 0,
  },
];

const w2_2_steps: readonly GoalStep[] = [
  {
    id: "sharpen",
    label: "Sharpen edges",
    detail: "Boost local contrast with `sharpen`.",
    command: "sharpen",
    check: (s) => s.ops.some((o) => o.kind === "sharpen"),
  },
  {
    id: "emboss",
    label: "Emboss the surface",
    detail: "Run `emboss` to see a directional relief kernel at work.",
    command: "emboss",
    check: (s) => s.ops.some((o) => o.kind === "emboss"),
  },
  {
    id: "concept",
    label: "Connect kernel to effect",
    detail: "Re-read `concept convolution` and relate the emboss offset to the kernel taps.",
    command: "concept convolution",
    check: (s) => s.conceptInspected.includes("convolution"),
  },
];

const w2_3_steps: readonly GoalStep[] = [
  {
    id: "load",
    label: "Load noisy data",
    detail: "`load noise` so there is impulse noise to clean.",
    command: "load noise",
    check: (s) => s.ops.some((o) => o.kind === "load"),
  },
  {
    id: "gauss",
    label: "Try a Gaussian blur",
    detail: "`blur gaussian 1` softens noise but also softens edges.",
    command: "blur gaussian 1",
    check: (s) => s.blurred,
  },
  {
    id: "median",
    label: "Prefer a median blur",
    detail: "`medianBlur 1` (or `blur median 1`) is the right tool for salt-and-pepper noise.",
    command: "medianBlur 1",
    check: (s) => s.ops.some((o) => o.kind === "blur" && o.args.kind === "median"),
  },
];

export const WORLD2_LEVELS: readonly Level[] = [
  {
    id: "2.1",
    world: "w2",
    worldTitle: WORLD_TITLE,
    title: "Kernels slide over pixels",
    concept: {
      title: "Convolution builds structure",
      body:
        "A kernel (or filter) is a small matrix of weights. At every pixel you take a local neighborhood, " +
        "multiply element-wise by the kernel, and sum — that sum is the output pixel. A uniform kernel blurs; " +
        "a kernel that subtracts neighbors sharpens or detects edges. The same math underpins classical filters " +
        "and the learned convolutions inside CNNs — only the weights change.",
      whatHappens:
        "`blur gaussian 2` convolves with a Gaussian (bell-shaped) kernel. Neighboring pixels are averaged " +
        "with weights that fall off with distance, so noise shrinks and fine texture melts together.",
      why:
        "Almost every low-level CV operator is a convolution. Understand the sliding window once and filters, " +
        "Sobel, and CNN layers all become variations on one idea.",
      formula: "out(x,y) = Σ_{i,j} in(x+i, y+j) · k(i,j)",
      callout: "OpenCV `filter2D`, `GaussianBlur`; scikit-image `filters`; torchvision `GaussianBlur` for training-time noise.",
    },
    goal: "Blur the image and connect the kernel math to what you see.",
    hints: [
      "`concept convolution` first — the formula is the whole idea.",
      "`blur gaussian 2` is a gentle smoothing pass.",
      "`mean` before and after shows how much energy you averaged away.",
    ],
    learning: [
      "Convolution is a sliding weighted sum of a neighborhood",
      "Gaussian kernels smooth by distance-weighted averaging",
      "Classical filters and CNN layers share the same operator",
    ],
    steps: w2_1_steps,
    seedImage: "noise",
    win: winFromSteps(w2_1_steps, "Convolution is no longer a black box."),
  },
  {
    id: "2.2",
    world: "w2",
    worldTitle: WORLD_TITLE,
    title: "Sharpen and emboss kernels",
    concept: {
      title: "Signed kernels reshape detail",
      body:
        "Blur kernels have all-positive weights that sum to 1. Sharpen kernels keep the center strong and " +
        "subtract neighbors (they can sum to 1 with negative lobes). Emboss kernels are directional: they " +
        "compare a pixel to a diagonally offset neighbor and bias the result, producing a relief lighting " +
        "effect. Changing the signs of the taps is how you turn smoothing into enhancement or edge energy.",
      whatHappens:
        "`sharpen` applies an unsharp-style kernel that amplifies local contrast. `emboss` applies a " +
        "directional difference kernel so flat regions go mid-gray and gradients look like raised metal.",
      why:
        "When a filter 'does something weird', inspect the kernel. Sign and normalization explain 90% of " +
        "classical filter behavior.",
      formula: "sharpen = original + α · (original − blur)",
      callout: "OpenCV `filter2D` with a hand-built kernel; scikit-image `filters.unsharp_mask`; Pillow ImageFilter.SHARPEN.",
    },
    goal: "Run sharpen, then emboss, and see how kernel signs change the output.",
    hints: [
      "`sharpen` first — high-frequency detail pops.",
      "`emboss` second — look for the diagonal relief.",
      "Both are still convolutions with different weight patterns.",
    ],
    learning: [
      "Negative kernel lobes create enhancement and relief",
      "Sharpening is original plus scaled high-pass energy",
      "Emboss is a directional derivative with an intensity bias",
    ],
    steps: w2_2_steps,
    seedImage: "text",
    win: winFromSteps(w2_2_steps, "You can steer convolution with kernel design."),
  },
  {
    id: "2.3",
    world: "w2",
    worldTitle: WORLD_TITLE,
    title: "Gaussian vs median on noise",
    concept: {
      title: "Not every blur is the same",
      body:
        "Gaussian blur averages — it is great for sensor grain but treats a salt-and-pepper impulse as just " +
        "another bright sample, so white/black dots smear into blobs. Median blur replaces each pixel with " +
        "the median of its neighborhood, which discards outliers entirely. Median also preserves edges better " +
        "than a strong Gaussian of similar radius. Choosing the right smoother is a data question, not a habit.",
      whatHappens:
        "`load noise` injects impulse-like noise. A Gaussian pass softens it but leaves ghost dots. " +
        "`medianBlur` replaces outlier pixels with the local median and cleans them away.",
      why:
        "A wrong denoiser can make edge maps and thresholds worse. Match the smoother to the noise model.",
      formula: "median(x,y) = median{ in(x+i, y+j) | (i,j) ∈ window }",
      callout: "OpenCV `medianBlur`; scikit-image `filters.median`; torchvision MedianBlur for augmentation.",
    },
    goal: "Load noisy pixels, try Gaussian smoothing, then clean with a median blur.",
    hints: [
      "`load noise` to get salt-and-pepper style corruption.",
      "`blur gaussian 1` — note dots still ghost through.",
      "`medianBlur 1` is the outlier-friendly choice.",
    ],
    learning: [
      "Gaussian averages; median rejects outliers",
      "Impulse noise needs a median filter",
      "Filter choice depends on the noise distribution",
    ],
    steps: w2_3_steps,
    seedImage: "noise",
    win: winFromSteps(w2_3_steps, "You pick blurs by noise model, not habit."),
  },
];
