import type { GoalStep, Level } from "../engine/types";
import { winFromSteps } from "./win";

export const WORLD_TITLE = "WORLD 11 · AUGMENTATION & PIPELINES";

const w11_1_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the augmentation concept",
    detail: "Type `concept augmentation` — augmentation is regularization you can see.",
    command: "concept augmentation",
    check: (s) => s.conceptInspected.includes("augmentation"),
  },
  {
    id: "brightness",
    label: "Shift brightness",
    detail: "`brightness 0.1` simulates exposure change.",
    command: "brightness 0.1",
    check: (s) => s.augmented,
  },
  {
    id: "contrast",
    label: "Shift contrast",
    detail: "`contrast 1.2` stretches dynamic range.",
    command: "contrast 1.2",
    check: (s) => s.augmented && s.ops.some((o) => o.kind === "augment"),
  },
];

const w11_2_steps: readonly GoalStep[] = [
  {
    id: "albu",
    label: "Run an albumentations compose",
    detail: "`albu` applies a label-aware Compose pipeline in one step.",
    command: "albu",
    check: (s) => s.augmented && s.ops.some((o) => o.kind === "albu"),
  },
  {
    id: "flip",
    label: "Add a geometric transform",
    detail: "`flip` layers a spatial augmentation on top.",
    command: "flip",
    check: (s) => s.augmented,
  },
  {
    id: "concept",
    label: "Think about label consistency",
    detail: "Re-read `concept augmentation` and note why boxes/masks must move with pixels.",
    command: "concept augmentation",
    check: (s) => s.conceptInspected.includes("augmentation"),
  },
];

const w11_3_steps: readonly GoalStep[] = [
  {
    id: "noise",
    label: "Inject noise",
    detail: "`noise 0.08 7` adds sensor-like grain with a seed.",
    command: "noise 0.08 7",
    check: (s) => s.ops.some((o) => o.kind === "augment" && o.label.includes("noise")),
  },
  {
    id: "albu",
    label: "Apply a full compose",
    detail: "`albu` stacks photometric + geometric transforms the way a real train loader does.",
    command: "albu",
    check: (s) => s.augmented,
  },
  {
    id: "resize",
    label: "Finish with fixed size",
    detail: "Every training batch ends in `resize` to a model input shape.",
    command: "resize 128 128",
    check: (s) => s.resized,
  },
];

export const WORLD11_LEVELS: readonly Level[] = [
  {
    id: "11.1",
    world: "w11",
    worldTitle: WORLD_TITLE,
    title: "Photometric augmentation",
    concept: {
      title: "Augmentation is regularization",
      body:
        "Augmentation multiplies your dataset by injecting label-preserving variation: brightness, contrast, " +
        "color jitter, noise, blur. The model is forced to stop relying on brittle cues (a specific exposure, " +
        "a particular noise floor) and learn stable structure. Photometric transforms change appearance but " +
        "not geometry — labels stay valid without moving boxes or keypoints.",
      whatHappens:
        "`brightness 0.1` and `contrast 1.2` adjust the image (augmented=true). The albumentations/torchvision " +
        "packageRef on those ops reminds you this is the same family used in training dataloaders.",
      why:
        "When validation accuracy collapses under camera changes, the fix is often better augmentation, not a " +
        "bigger net. Augmentation is how you encode known invariances.",
      formula: "aug(x) = contrast(brightness(x, δ), α)  ·  y unchanged",
      callout: "albumentations `Compose` + `RandomBrightnessContrast`; torchvision `ColorJitter`; PIL ImageEnhance.",
    },
    goal: "Apply brightness and contrast augmentation.",
    hints: [
      "`concept augmentation` first.",
      "`brightness 0.1` and `contrast 1.2`.",
      "Labels stay put — only appearance changes.",
    ],
    learning: [
      "Photometric aug changes appearance, not labels",
      "Invariance can be trained in via data",
      "Brightness/contrast are the cheapest regularizers",
    ],
    steps: w11_1_steps,
    seedImage: "faces",
    win: winFromSteps(w11_1_steps, "Photometric augmentation applied."),
  },
  {
    id: "11.2",
    world: "w11",
    worldTitle: WORLD_TITLE,
    title: "Albumentations pipelines",
    concept: {
      title: "Label-aware transform graphs",
      body:
        "Real training pipelines combine many transforms and must update targets together: a horizontal flip " +
        "moves boxes and keypoints, a crop must clip labels, a rotation must transform masks. albumentations " +
        "builds this as a Compose of fast, label-aware ops. Using one library end-to-end avoids the classic " +
        "bug where pixels are augmented but boxes are not.",
      whatHappens:
        "`albu` runs a simulated Compose (flip + contrast) and flags augmented with the albumentations package " +
        "reference. Pairing it with `flip` shows geometric ops stacking.",
      why:
        "Silent label desynchronization is one of the most expensive dataset bugs. Centralize augmentation in " +
        "one tested library instead of hand-rolling per-project flips.",
      formula: "x', y' = T(x, y)  for every transform T in the compose",
      callout: "albumentations is the de-facto fast augmentation library; torchvision `v2` transforms also carry targets; supervision for viz.",
    },
    goal: "Run a Compose-style augmentation and a geometric flip.",
    hints: [
      "`albu` is the one-shot Compose pipeline.",
      "`flip` layers a spatial transform.",
      "`concept augmentation` covers label consistency.",
    ],
    learning: [
      "Transforms must update targets and pixels together",
      "Compose graphs are the production pattern",
      "Label desync is a silent dataset killer",
    ],
    steps: w11_2_steps,
    seedImage: "street",
    win: winFromSteps(w11_2_steps, "Label-aware pipelines are in place."),
  },
  {
    id: "11.3",
    world: "w11",
    worldTitle: WORLD_TITLE,
    title: "Noise, domain shift, leakage",
    concept: {
      title: "Augmentation is not free of risk",
      body:
        "Noise and blur simulate sensor limits and domain shift (train on clean studio photos, deploy on rainy " +
        "street cameras). But you can over-augment until signals disappear, or leak validation content into " +
        "training by augmenting before the split. Keep seeds recorded, apply heavy transforms only on the " +
        "training split, and monitor a clean validation set. Augmentation quality is a data-governance problem.",
      whatHappens:
        "`noise 0.08 7` adds seeded grain. `albu` applies a broader compose. `resize` ends the pipeline at a " +
        "fixed tensor size — the shape every training batch must share.",
      why:
        "Models that only work on augmented-easy inputs fail in the field. Reproducible seeds and clean " +
        "evaluation are the difference between a demo and a system.",
      formula: "train_loss sees aug(x);  val_loss sees clean x_val (no leakage)",
      callout: "albumentations ReplayCompose for reproducibility; torchvision v2; track seeds in your experiment log (W&B, MLflow).",
    },
    goal: "Add noise, run a full compose, and finish with a fixed resize.",
    hints: [
      "`noise 0.08 7` for sensor-like grain.",
      "`albu` for the full train-time compose.",
      "`resize 128 128` locks the input shape.",
    ],
    learning: [
      "Noise/blur simulate domain shift",
      "Augmentation can leak or destroy signal if careless",
      "Seeds and clean validation sets keep you honest",
    ],
    steps: w11_3_steps,
    seedImage: "noise",
    win: winFromSteps(w11_3_steps, "Augmentation with production discipline."),
  },
];
