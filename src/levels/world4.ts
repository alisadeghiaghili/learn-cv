import type { GoalStep, Level } from "../engine/types";
import { winFromSteps } from "./win";

export const WORLD_TITLE = "WORLD 4 · THRESHOLD & MORPHOLOGY";

const w4_1_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the threshold concept",
    detail: "Type `concept threshold` before splitting pixels into foreground/background.",
    command: "concept threshold",
    check: (s) => s.conceptInspected.includes("threshold"),
  },
  {
    id: "gray",
    label: "Grayscale first",
    detail: "Thresholds work on intensity — `cvtColor gray`.",
    command: "cvtColor gray",
    check: (s) => s.gray,
  },
  {
    id: "threshold",
    label: "Cut a binary mask",
    detail: "Run `threshold 0.5` to produce a 0/1 mask.",
    command: "threshold 0.5",
    check: (s) => s.thresholded,
  },
];

const w4_2_steps: readonly GoalStep[] = [
  {
    id: "otsu",
    label: "Let Otsu choose T",
    detail: "`threshold otsu` finds the threshold that maximizes between-class variance.",
    command: "threshold otsu",
    check: (s) => s.thresholded && s.ops.some((o) => o.kind === "otsu" || (o.kind === "threshold" && o.args.mode === "otsu")),
  },
  {
    id: "adaptive",
    label: "Try adaptive thresholding",
    detail: "`threshold adaptive` uses local neighborhoods — better under uneven lighting.",
    command: "threshold adaptive",
    check: (s) => s.ops.some((o) => o.kind === "adaptive" || (o.kind === "threshold" && o.args.mode === "adaptive")),
  },
  {
    id: "hist",
    label: "Relate to the histogram",
    detail: "Look at `show histogram` and see why a single global cut can fail.",
    command: "show histogram",
    check: (s) => s.thresholded && s.commandCount > 0,
  },
];

const w4_3_steps: readonly GoalStep[] = [
  {
    id: "threshold",
    label: "Start from a mask",
    detail: "Create a binary mask first — try `load coins` then `threshold otsu`.",
    command: "threshold otsu",
    check: (s) => s.thresholded,
  },
  {
    id: "erode",
    label: "Erode speckle",
    detail: "`erode 1` shrinks foreground and kills thin noise bridges.",
    command: "erode 1",
    check: (s) => s.morphed,
  },
  {
    id: "open",
    label: "Open the mask",
    detail: "`open 1` (erode then dilate) removes small blobs while keeping object size roughly stable.",
    command: "open 1",
    check: (s) => s.ops.some((o) => o.kind === "open"),
  },
];

export const WORLD4_LEVELS: readonly Level[] = [
  {
    id: "4.1",
    world: "w4",
    worldTitle: WORLD_TITLE,
    title: "Binary thresholding",
    concept: {
      title: "Thresholding segments intensity",
      body:
        "A binary threshold answers a single question per pixel: is intensity above T? Pixels above T become " +
        "foreground (1), below become background (0). This is the simplest possible segmentation — perfect " +
        "when objects are brighter or darker than a flat background, and fragile when lighting varies. " +
        "Always threshold on a grayscale (or a single channel such as V in HSV).",
      whatHappens:
        "`cvtColor gray` prepares a single intensity channel. `threshold 0.5` (or `threshold 128` style levels " +
        "depending on dtype) writes a binary mask to the stage and sets thresholded=true.",
      why:
        "Binary masks unlock contours, morphology, area measurement, and classical trackers. It is the bridge " +
        "from pixels to objects.",
      formula: "mask(x,y) = 1 if I(x,y) ≥ T else 0",
      callout: "OpenCV `threshold`; scikit-image `threshold_otsu` + `img_as_ubyte`; classic first stage of coin/blob pipelines.",
    },
    goal: "Grayscale the image and produce a binary mask with a fixed threshold.",
    hints: [
      "`concept threshold` then `cvtColor gray`.",
      "`threshold 0.5` cuts intensity into 0/1.",
      "Try `show histogram` if you are unsure where T should sit.",
    ],
    learning: [
      "Thresholding is a per-pixel intensity decision",
      "Masks convert gray images into object candidates",
      "Fixed T is simple but lighting-sensitive",
    ],
    steps: w4_1_steps,
    seedImage: "coins",
    win: winFromSteps(w4_1_steps, "You can split an image into foreground and background."),
  },
  {
    id: "4.2",
    world: "w4",
    worldTitle: WORLD_TITLE,
    title: "Otsu and adaptive thresholds",
    concept: {
      title: "Choosing T automatically",
      body:
        "Otsu's method treats the histogram as two classes and picks T that maximizes between-class variance " +
        "(equivalently, minimizes within-class variance). It is excellent for bimodal histograms. Adaptive " +
        "thresholding computes T from a local window (mean or Gaussian of the neighborhood), which survives " +
        "shadows and gradients that destroy a single global cut.",
      whatHappens:
        "`threshold otsu` estimates T from the image histogram and binarizes. `threshold adaptive` replaces " +
        "a global T with local statistics so uneven illumination does not merge objects into the background.",
      why:
        "Manual T does not transfer across cameras or scenes. Automatic selection is what you actually ship.",
      formula: "T* = argmax_T ω0(T)·ω1(T)·(μ0(T) − μ1(T))²",
      callout: "OpenCV `threshold` with THRESH_OTSU / THRESH_ADAPTIVE; scikit-image `filters.threshold_local`.",
    },
    goal: "Apply Otsu, then adaptive thresholding, and inspect the histogram story.",
    hints: [
      "`threshold otsu` lets the histogram pick T.",
      "`threshold adaptive` handles uneven lighting.",
      "`show histogram` shows why bimodal data is Otsu-friendly.",
    ],
    learning: [
      "Otsu maximizes between-class variance",
      "Adaptive methods use local windows",
      "Bimodal histograms are the ideal Otsu case",
    ],
    steps: w4_2_steps,
    seedImage: "gradient",
    win: winFromSteps(w4_2_steps, "Automatic thresholds are in your toolkit."),
  },
  {
    id: "4.3",
    world: "w4",
    worldTitle: WORLD_TITLE,
    title: "Morphology cleans masks",
    concept: {
      title: "Morphology cleans masks",
      body:
        "Morphological operators probe a binary mask with a structuring element (usually a small disk or square). " +
        "Erosion keeps a pixel only if the entire element fits inside foreground — it shrinks objects and deletes " +
        "thin noise. Dilation does the opposite: it grows objects and closes small holes. Opening = erosion then " +
        "dilation (remove specks). Closing = dilation then erosion (fill gaps). Morphology is the standard cleanup " +
        "step after thresholding and before connected components.",
      whatHappens:
        "After a threshold, `erode 1` shrinks foreground blobs. `open 1` removes tiny noise islands more " +
        "gently than aggressive erosion. Morphology sets morphed=true and keeps the mask single-channel.",
      why:
        "Raw thresholds are noisy. Morphological cleanup is what turns a dirty mask into measurable objects.",
      formula: "erosion: A ⊖ B  ·  dilation: A ⊕ B  ·  open: (A ⊖ B) ⊕ B",
      callout: "OpenCV `erode` / `dilate` / `morphologyEx`; scikit-image `morphology.binary_opening`; try `morphologyex open 1`.",
    },
    goal: "Threshold, then clean the mask with erosion and an opening.",
    hints: [
      "Start with `threshold otsu` or `threshold 0.5` on `load coins`.",
      "`erode 1` shrinks foreground and breaks thin bridges.",
      "`open 1` removes small blobs while keeping object scale.",
    ],
    learning: [
      "Erosion shrinks; dilation grows",
      "Opening removes speckle; closing fills holes",
      "Morphology is mandatory cleanup after thresholding",
    ],
    steps: w4_3_steps,
    seedImage: "coins",
    win: winFromSteps(w4_3_steps, "Masks cleaned — ready for contours and blobs."),
  },
];
