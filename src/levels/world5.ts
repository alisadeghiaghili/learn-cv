import type { GoalStep, Level } from "../engine/types";
import { winFromSteps } from "./win";

export const WORLD_TITLE = "WORLD 5 · GEOMETRY";

const w5_1_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the geometry concept",
    detail: "Type `concept geometry` — resampling and transforms are matrix math.",
    command: "concept geometry",
    check: (s) => s.conceptInspected.includes("geometry"),
  },
  {
    id: "resize",
    label: "Resize the tensor",
    detail: "Run `resize 64 64` to resample to a square grid.",
    command: "resize 64 64",
    check: (s) => s.resized,
  },
  {
    id: "crop",
    label: "Crop a region",
    detail: "Extract a sub-window with `crop 32 32 64 64`.",
    command: "crop 32 32 64 64",
    check: (s) => s.ops.some((o) => o.kind === "crop"),
  },
];

const w5_2_steps: readonly GoalStep[] = [
  {
    id: "flip",
    label: "Mirror the image",
    detail: "`flip` (horizontal) is a cheap geometric augmentation.",
    command: "flip",
    check: (s) => s.augmented,
  },
  {
    id: "rotate",
    label: "Rotate the scene",
    detail: "`rotate 25` applies a rotation matrix with interpolation.",
    command: "rotate 25",
    check: (s) => s.ops.some((o) => o.kind === "rotate"),
  },
  {
    id: "warped",
    label: "Confirm the warp flag",
    detail: "Rotation writes interpolated pixels and marks the session warped.",
    command: "show image",
    check: (s) => s.warped,
  },
];

const w5_3_steps: readonly GoalStep[] = [
  {
    id: "warp",
    label: "Apply a perspective warp",
    detail: "`warp 0.2` simulates a keystone / camera-angle correction.",
    command: "warp 0.2",
    check: (s) => s.warped,
  },
  {
    id: "resize",
    label: "Resample after warping",
    detail: "Finish with `resize 128 128` so downstream nets get a fixed input size.",
    command: "resize 128 128",
    check: (s) => s.resized,
  },
  {
    id: "concept",
    label: "Connect to projective math",
    detail: "Re-read `concept geometry` and map warp to a homography.",
    command: "concept geometry",
    check: (s) => s.conceptInspected.includes("geometry"),
  },
];

export const WORLD5_LEVELS: readonly Level[] = [
  {
    id: "5.1",
    world: "w5",
    worldTitle: WORLD_TITLE,
    title: "Resize and crop are resampling",
    concept: {
      title: "Geometry is a matrix multiply",
      body:
        "Every geometric warp can be written as transforming output coordinates back to input coordinates " +
        "and sampling the source. Resize is just scaling the sampling grid (bilinear/bicubic interpolation " +
        "fills fractional pixels). Crop is a pure window cut with no interpolation. Neural nets almost always " +
        "need a fixed input size, so resize is the last step of every real pipeline.",
      whatHappens:
        "`resize 64 64` resamples the full frame onto a 64×64 grid (resized=true). `crop 32 32 64 64` " +
        "extracts a window at offset (32,32) with size 64×64 and also marks resized (the tensor shape changed).",
      why:
        "Aspect distortion, aliasing, and mis-cropped boxes all start here. Know whether you are scaling, " +
        "cutting, or warping.",
      formula: "I_out(x,y) = I_in( s·x + a,  s·y + b )  (bilinear sample)",
      callout: "OpenCV `resize`; Pillow `Image.resize`; torchvision `Resize` / `CenterCrop` in transforms.",
    },
    goal: "Resize the tensor, then crop a sub-window.",
    hints: [
      "`concept geometry` first.",
      "`resize 64 64` forces a fixed grid.",
      "`crop 32 32 64 64` cuts a window without interpolating.",
    ],
    learning: [
      "Resize is resampling on a scaled grid",
      "Crop is a window cut with no interpolation",
      "Fixed input sizes are required by almost every CNN",
    ],
    steps: w5_1_steps,
    seedImage: "checker",
    win: winFromSteps(w5_1_steps, "You control tensor geometry end to end."),
  },
  {
    id: "5.2",
    world: "w5",
    worldTitle: WORLD_TITLE,
    title: "Flip and rotate",
    concept: {
      title: "Rigid transforms and interpolation",
      body:
        "A horizontal flip is x → W−1−x — no interpolation required on a discrete grid. A rotation by θ " +
        "maps coordinates through a 2×2 rotation matrix; almost every output pixel lands between source " +
        "pixels, so interpolation fills the gaps. Rotations therefore resample the image (warped=true) " +
        "and are also a standard data augmentation that teaches orientation invariance.",
      whatHappens:
        "`flip` mirrors the image and flags the session as augmented. `rotate 25` applies a rotation and " +
        "marks both warped and augmented because pixels were interpolated.",
      why:
        "Augmentation is free invariance. Flips are exact; rotations cost interpolation quality — different tools.",
      formula: "R(θ) = [[cosθ, −sinθ], [sinθ, cosθ]]",
      callout: "OpenCV `flip`, `warpAffine`; albumentations / torchvision `RandomHorizontalFlip`, `RandomRotation`.",
    },
    goal: "Flip the image, then rotate it, and notice the warp flag.",
    hints: [
      "`flip` is the cheapest geometric augmentation.",
      "`rotate 25` interpolates — that is why the image warps.",
      "Both count as augmentation in the session flags.",
    ],
    learning: [
      "Flips are exact discrete remaps",
      "Rotations require interpolation",
      "Geometric transforms double as augmentation",
    ],
    steps: w5_2_steps,
    seedImage: "text",
    win: winFromSteps(w5_2_steps, "Rigid transforms are under your fingers."),
  },
  {
    id: "5.3",
    world: "w5",
    worldTitle: WORLD_TITLE,
    title: "Perspective warp",
    concept: {
      title: "Homographies undo the camera",
      body:
        "A perspective (projective) transform uses a 3×3 homography H that maps points in homogeneous " +
        "coordinates: [x', y', w']ᵀ = H [x, y, 1]ᵀ, then divides by w'. This models how a square looks " +
        "trapezoidal when viewed at an angle. Deskewing a document, rectifying a road surface, and stitching " +
        "panoramas all estimate H from point correspondences.",
      whatHappens:
        "`warp 0.2` applies a simulated keystone warp (warped=true) so you can see the projective effect " +
        "before estimating real correspondences. A follow-up `resize` restores a model-friendly input size.",
      why:
        "If your detector assumes fronto-parallel objects and the camera is tilted, geometry — not the model — " +
        "is the bug.",
      formula: "[x', y', w']ᵀ = H [x, y, 1]ᵀ,  (u,v) = (x'/w', y'/w')",
      callout: "OpenCV `warpPerspective`, `findHomography`; later levels use this for `match` and `panorama`.",
    },
    goal: "Warp perspective, then resize to a fixed tensor shape.",
    hints: [
      "`warp 0.2` simulates a keystone correction.",
      "`resize 128 128` is the usual model input size.",
      "`concept geometry` connects this to a homography matrix.",
    ],
    learning: [
      "Perspective warps are 3×3 homographies",
      "Homogeneous coordinates model camera tilt",
      "Resize after warp to restore fixed shapes",
    ],
    steps: w5_3_steps,
    seedImage: "text",
    win: winFromSteps(w5_3_steps, "Projective geometry is no longer abstract."),
  },
];
