import type { GoalStep, Level } from "../engine/types";
import { winFromSteps } from "./win";

export const WORLD_TITLE = "WORLD 1 · PIXELS ARE TENSORS";

const w1_1_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the pixels concept",
    detail: "Open the brief with `concept pixels` so the tensor model is in place before you touch data.",
    command: "concept pixels",
    check: (s) => s.conceptInspected.includes("pixels"),
  },
  {
    id: "load",
    label: "Load a scene",
    detail: "Bring an image into the sandbox with `load shapes`.",
    command: "load shapes",
    check: (s) => s.ops.some((o) => o.kind === "load"),
  },
  {
    id: "tensor",
    label: "Inspect the tensor",
    detail: "Print shape and dtype with `show tensor`. Note height × width × channels.",
    command: "show tensor",
    check: (s) => s.commandCount > 0 && s.image !== null,
  },
];

const w1_2_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the channels concept",
    detail: "Run `concept channels` to see how RGB becomes luma.",
    command: "concept channels",
    check: (s) => s.conceptInspected.includes("channels"),
  },
  {
    id: "gray",
    label: "Convert to grayscale",
    detail: "Collapse color to one channel with `cvtColor gray`.",
    command: "cvtColor gray",
    check: (s) => s.gray,
  },
  {
    id: "mean",
    label: "Read mean intensity",
    detail: "Type `mean` and compare the single-channel statistics to what you expected from color.",
    command: "mean",
    check: (s) => s.commandCount > 0 && s.gray,
  },
];

const w1_3_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the histogram concept",
    detail: "`concept histogram` explains why bins diagnose exposure and contrast.",
    command: "concept histogram",
    check: (s) => s.conceptInspected.includes("histogram"),
  },
  {
    id: "hist",
    label: "Plot the histogram",
    detail: "Type `show histogram` to see where the mass of intensities sits.",
    command: "show histogram",
    check: (s) => s.histogram !== null && s.commandCount > 0,
  },
  {
    id: "equalize",
    label: "Equalize contrast",
    detail: "Spread the histogram with `equalize`, then look at mean/std again.",
    command: "equalize",
    check: (s) => s.ops.some((o) => o.kind === "equalize"),
  },
];

export const WORLD1_LEVELS: readonly Level[] = [
  {
    id: "1.1",
    world: "w1",
    worldTitle: WORLD_TITLE,
    title: "An image is just a tensor",
    concept: {
      title: "Pixels are numbers",
      body:
        "A digital image is a dense grid of numbers. Color photos usually store three channels (R, G, B); " +
        "each channel is a 2-D array of intensity values. In memory that is one flat buffer of length " +
        "height × width × channels. Libraries like NumPy expose it as `shape=(H, W, C)` and a `dtype` " +
        "such as uint8 (0–255) or float32 (often 0–1). Once you see pixels as tensors, every CV operation " +
        "is just array math.",
      whatHappens:
        "`load shapes` builds an image tensor and keeps a pristine copy as `original`. `show tensor` prints " +
        "the live shape and dtype so you can verify rank and channel count before filtering.",
      why:
        "Debugging starts with shape checks. A silent channel swap or dtype surprise explains more 'weird model' " +
        "bugs than any architecture change.",
      formula: "image ∈ ℝ^{H×W×C},  dtype ∈ {uint8, float32}",
      callout: "NumPy + Pillow for I/O; OpenCV and scikit-image both expect H×W×C arrays at the boundary.",
    },
    goal: "Load the shapes scene and inspect its tensor shape.",
    hints: [
      "Start with `concept pixels`, then `load shapes`.",
      "`show tensor` prints (H, W, C) and dtype — that is your ground truth.",
      "`show image` keeps the stage in sync if you want a visual check.",
    ],
    learning: [
      "Images are dense numeric tensors with a fixed shape",
      "Height, width, and channel count define the array rank",
      "Always inspect dtype and shape before running algorithms",
    ],
    steps: w1_1_steps,
    seedImage: "empty",
    win: winFromSteps(w1_1_steps, "Tensor literacy unlocked — pixels are numbers."),
  },
  {
    id: "1.2",
    world: "w1",
    worldTitle: WORLD_TITLE,
    title: "Channels and grayscale luma",
    concept: {
      title: "Channels and color spaces",
      body:
        "RGB is a convenient display encoding, not a perceptual one. Most classical pipelines drop to a single " +
        "luma channel first because edges, corners, and thresholds care about intensity, not hue. The common " +
        "Rec.601 luma is a weighted sum of R, G, and B that matches human sensitivity (green dominates). " +
        "HSV is another useful space: hue carries color, value carries brightness — handy for lighting changes.",
      whatHappens:
        "`cvtColor gray` replaces the 3-channel image with a 1-channel luma image. Flags update so later " +
        "edge/threshold steps know you are already single-channel. `mean` then reports intensity statistics " +
        "on that channel.",
      why:
        "Grayscale halves (or thirds) compute and removes color as a confounder. Stabilizing on luma early " +
        "makes every later detector comparable.",
      formula: "Y = 0.299 R + 0.587 G + 0.114 B",
      callout: "OpenCV `cvtColor` COLOR_BGR2GRAY / COLOR_BGR2HSV; scikit-image `rgb2gray`; torchvision Grayscale.",
    },
    goal: "Convert the image to grayscale and read its mean intensity.",
    hints: [
      "`cvtColor gray` collapses R/G/B into one luma channel.",
      "`cvtColor hsv` is a useful preview when color itself matters.",
      "`mean` / `std` summarize the current tensor after conversion.",
    ],
    learning: [
      "RGB is a display encoding; luma is the working channel",
      "Rec.601 weights green most heavily",
      "Single-channel ops are cheaper and more stable",
    ],
    steps: w1_2_steps,
    seedImage: "shapes",
    win: winFromSteps(w1_2_steps, "You can move between color spaces on purpose."),
  },
  {
    id: "1.3",
    world: "w1",
    worldTitle: WORLD_TITLE,
    title: "Histograms diagnose contrast",
    concept: {
      title: "Histograms diagnose contrast",
      body:
        "A histogram counts how many pixels land in each intensity bin. A spike on the left means a dark image; " +
        "a spike on the right means blown highlights; mass only in the middle means low contrast. Equalization " +
        "redistributes ranks so bins fill more evenly — it cannot invent detail, but it can reveal it. " +
        "Always look at the histogram before blaming your model for 'hard' data.",
      whatHappens:
        "`show histogram` bins the current tensor. `equalize` applies histogram equalization and rewrites the " +
        "image, which usually widens the intensity spread (higher std).",
      why:
        "Contrast problems are data problems. Fixing exposure in preprocessing is cheaper than hoping a network " +
        "will learn invariance to a flat histogram.",
      formula: "cdf(i) = Σ_{k≤i} hist(k) / N",
      callout: "OpenCV `equalizeHist` and CLAHE; scikit-image `exposure.equalize_hist`; matplotlib for plotting.",
    },
    goal: "Inspect the histogram, then equalize contrast.",
    hints: [
      "`show histogram` first — see where the intensity mass sits.",
      "`equalize` stretches ranks across the full range.",
      "Compare `mean` and `std` before and after.",
    ],
    learning: [
      "Histograms expose exposure and contrast pathologies",
      "Equalization redistributes ranks; it does not add detail",
      "Preprocessing for contrast beats hoping models will compensate",
    ],
    steps: w1_3_steps,
    seedImage: "gradient",
    win: winFromSteps(w1_3_steps, "You can read and repair contrast from a histogram."),
  },
];
