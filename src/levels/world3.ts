import type { GoalStep, Level } from "../engine/types";
import { winFromSteps } from "./win";

export const WORLD_TITLE = "WORLD 3 · EDGES AND GRADIENTS";

const w3_1_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the edges concept",
    detail: "Type `concept edges` before running any derivative filter.",
    command: "concept edges",
    check: (s) => s.conceptInspected.includes("edges"),
  },
  {
    id: "gray",
    label: "Work in grayscale",
    detail: "Edges are intensity phenomena — run `cvtColor gray` first.",
    command: "cvtColor gray",
    check: (s) => s.gray,
  },
  {
    id: "sobel",
    label: "Compute a Sobel map",
    detail: "Type `sobel` to visualize gradient magnitude.",
    command: "sobel",
    check: (s) => s.edgeMap === "sobel",
  },
];

const w3_2_steps: readonly GoalStep[] = [
  {
    id: "laplacian",
    label: "Run a Laplacian",
    detail: "`laplacian` is a second-derivative operator — great at blob borders and fine lines.",
    command: "laplacian",
    check: (s) => s.ops.some((o) => o.args.mode === "laplacian" || o.label.includes("laplacian")),
  },
  {
    id: "canny",
    label: "Switch to Canny",
    detail: "`canny` gives thin, thresholded edge lines after hysteresis.",
    command: "canny",
    check: (s) => s.edgeMap === "canny",
  },
  {
    id: "compare",
    label: "Compare operators",
    detail: "Notice Sobel/Laplacian keep magnitude while Canny outputs a binary edge set.",
    command: "show image",
    check: (s) => s.edgeMap === "canny" && s.commandCount > 0,
  },
];

const w3_3_steps: readonly GoalStep[] = [
  {
    id: "load",
    label: "Load a complex scene",
    detail: "`load street` so there are many junctions and texture boundaries.",
    command: "load street",
    check: (s) => s.ops.some((o) => o.kind === "load"),
  },
  {
    id: "blur",
    label: "Pre-smooth the image",
    detail: "`blur gaussian 1` suppresses speckle before differentiation.",
    command: "blur gaussian 1",
    check: (s) => s.blurred,
  },
  {
    id: "canny",
    label: "Extract a clean edge map",
    detail: "Finish with `canny` for a sparse, thin outline of the scene.",
    command: "canny",
    check: (s) => s.edgeMap === "canny",
  },
];

export const WORLD3_LEVELS: readonly Level[] = [
  {
    id: "3.1",
    world: "w3",
    worldTitle: WORLD_TITLE,
    title: "Sobel and gradient magnitude",
    concept: {
      title: "Edges are high-frequency energy",
      body:
        "Where intensity changes quickly you have an edge. The Sobel operator convolves with two small " +
        "kernels to estimate horizontal (Gx) and vertical (Gy) derivatives. Combining them as a magnitude " +
        "√(Gx²+Gy²) (or |Gx|+|Gy|) highlights boundaries. Orientation is atan2(Gy, Gx). Sobel includes a " +
        "light smoothing term so pure noise does not dominate the derivative.",
      whatHappens:
        "`cvtColor gray` reduces color to luma. `sobel` writes a gradient-magnitude map to the stage and " +
        "marks the session as edgeMap=\"sobel\". Bright pixels mean strong intensity change.",
      why:
        "Corners, contours, optical flow, and many detectors start from gradients. If the edge map is noisy, " +
        "smooth first — differentiating noise is unforgiving.",
      formula: "Gx = [[-1,0,1],[-2,0,2],[-1,0,1]] * I  ·  |G| = √(Gx² + Gy²)",
      callout: "OpenCV `Sobel` / `spatial_gradient`; scikit-image `filters.sobel`; common first layer pattern in classical pipelines.",
    },
    goal: "Convert to gray and visualize Sobel gradient magnitude.",
    hints: [
      "`concept edges` explains what a derivative filter is looking for.",
      "`cvtColor gray` then `sobel` is the classic opening pair.",
      "Look at the stage: white = strong gradient.",
    ],
    learning: [
      "Edges are local intensity derivatives",
      "Sobel estimates Gx and Gy with 3×3 kernels",
      "Gradient magnitude is the standard edge energy map",
    ],
    steps: w3_1_steps,
    seedImage: "shapes",
    win: winFromSteps(w3_1_steps, "Gradient magnitude is under your control."),
  },
  {
    id: "3.2",
    world: "w3",
    worldTitle: WORLD_TITLE,
    title: "Laplacian vs Canny",
    concept: {
      title: "From raw derivatives to thin edges",
      body:
        "The Laplacian is a second derivative (sum of second-order partials). It responds to rapid change " +
        "in any direction and is useful for zero-crossings and blob-like structure, but it is noise-sensitive " +
        "and unsigned. Canny is a pipeline: Gaussian smooth → gradient → non-maximum suppression → hysteresis " +
        "thresholding. The output is a thin, binary edge map that is far easier to feed into contour finding.",
      whatHappens:
        "`laplacian` shows second-derivative energy. `canny` replaces the stage with a sparse binary edge " +
        "set after thinning and dual-threshold linking (edgeMap=\"canny\").",
      why:
        "Pick the operator that matches your next step. Raw gradients for measurement, Canny for clean outlines " +
        "before morphology or contour extraction.",
      formula: "∇²I = ∂²I/∂x² + ∂²I/∂y²",
      callout: "OpenCV `Laplacian`, `Canny`; scikit-image `feature.canny` (with hysteresis).",
    },
    goal: "Compare a Laplacian response with a Canny edge map.",
    hints: [
      "`laplacian` first — second derivative, more speckle.",
      "`canny` second — thin, linked edge curves.",
      "Both force a grayscale working channel.",
    ],
    learning: [
      "Laplacian is a second-derivative operator",
      "Canny is a multi-stage edge detector",
      "Thin binary edges beat raw magnitude for contour work",
    ],
    steps: w3_2_steps,
    seedImage: "shapes",
    win: winFromSteps(w3_2_steps, "You know when to use Laplacian versus Canny."),
  },
  {
    id: "3.3",
    world: "w3",
    worldTitle: WORLD_TITLE,
    title: "Pre-smooth before detecting",
    concept: {
      title: "Derivatives amplify noise",
      body:
        "Differentiation multiplies high frequencies by frequency — tiny sensor noise becomes large gradient " +
        "spikes. The standard fix is to blur slightly before taking derivatives (this is even baked into Sobel " +
        "and Canny). On a busy scene like a street, pre-smoothing suppresses texture speckle so structural " +
        "boundaries (road, cars, buildings) dominate the edge map.",
      whatHappens:
        "`load street` brings in texture-heavy content. `blur gaussian 1` damps high-frequency noise. " +
        "`canny` then outlines major structures instead of every grain of pavement.",
      why:
        "Edge quality is mostly about SNR. A clean derivative of a slightly smooth image beats a pure derivative " +
        "of a noisy one.",
      formula: "I_smooth = G_σ * I,   edges ≈ ∇(G_σ * I)",
      callout: "OpenCV `GaussianBlur` before `Canny`; scikit-image `feature.canny` already integrates Gaussian smoothing.",
    },
    goal: "Load a busy scene, pre-blur, then extract clean Canny edges.",
    hints: [
      "`load street` for multi-scale texture.",
      "`blur gaussian 1` before any derivative.",
      "Finish with `canny` and compare to a raw edge guess.",
    ],
    learning: [
      "Derivatives amplify high-frequency noise",
      "Pre-smoothing is part of a real edge pipeline",
      "Structural edges should dominate after SNR control",
    ],
    steps: w3_3_steps,
    seedImage: "street",
    win: winFromSteps(w3_3_steps, "You build edge maps with SNR in mind."),
  },
];
