import type { GoalStep, Level } from "../engine/types";
import { winFromSteps } from "./win";

export const WORLD_TITLE = "WORLD 10 · SEGMENTATION";

const w10_1_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the segmentation concept",
    detail: "Type `concept segmentation` — labels for every pixel, not just boxes.",
    command: "concept segmentation",
    check: (s) => s.conceptInspected.includes("segmentation"),
  },
  {
    id: "threshold",
    label: "Classical baseline first",
    detail: "Threshold a simple scene (`load coins` + `threshold otsu`) to see pixel labeling without a net.",
    command: "threshold otsu",
    check: (s) => s.thresholded,
  },
  {
    id: "unet",
    label: "Run a U-Net semantic mask",
    detail: "`unet` produces per-pixel class masks (segmenter=\"unet\").",
    command: "unet",
    check: (s) => s.segmenter === "unet" && s.detections.length > 0,
  },
];

const w10_2_steps: readonly GoalStep[] = [
  {
    id: "maskrcnn",
    label: "Run Mask R-CNN",
    detail: "`maskrcnn` predicts instance masks — one mask per object, not a single class map.",
    command: "maskrcnn",
    check: (s) => s.segmenter === "maskrcnn" && s.detections.length > 0,
  },
  {
    id: "concept",
    label: "Semantic vs instance",
    detail: "Re-read `concept segmentation` and contrast U-Net vs Mask R-CNN outputs.",
    command: "concept segmentation",
    check: (s) => s.conceptInspected.includes("segmentation"),
  },
  {
    id: "inspect",
    label: "Inspect the mask stage",
    detail: "`show image` to review instance-colored masks on the stage.",
    command: "show image",
    check: (s) => s.segmenter === "maskrcnn" && s.commandCount > 0,
  },
];

const w10_3_steps: readonly GoalStep[] = [
  {
    id: "yolo",
    label: "Detect objects",
    detail: "Start with `yolo` boxes so you know what instances exist.",
    command: "yolo",
    check: (s) => s.detector === "yolo" && s.detections.length > 0,
  },
  {
    id: "seg",
    label: "Add a segmentation head",
    detail: "`yolo mask` / `yolo seg` (or `unet` / `maskrcnn`) attaches masks to the scene.",
    command: "yolo mask",
    check: (s) => s.segmenter !== null,
  },
  {
    id: "compare",
    label: "Boxes vs masks",
    detail: "Note detections vs full pixel coverage — segmentation is denser supervision.",
    command: "show image",
    check: (s) => s.segmenter !== null && s.detections.length > 0,
  },
];

export const WORLD10_LEVELS: readonly Level[] = [
  {
    id: "10.1",
    world: "w10",
    worldTitle: WORLD_TITLE,
    title: "Semantic segmentation with U-Net",
    concept: {
      title: "Segmentation labels every pixel",
      body:
        "Detection draws boxes; segmentation assigns a class (or background) to every pixel. Semantic " +
        "segmentation asks 'what is this pixel?' and merges all objects of a class. U-Net is the classic " +
        "encoder-decoder: a contracting path captures context, an expanding path restores resolution, and " +
        "skip connections carry fine detail across the gap. Even before deep nets, thresholding on a clean " +
        "background is a form of segmentation — always try the simple baseline first.",
      whatHappens:
        "First a classical baseline (`threshold otsu`) shows pixel labels without learning. Then `unet` " +
        "runs a simulated encoder-decoder and writes semantic mask detections (segmenter=\"unet\").",
      why:
        "Medical imaging, road/drive scenes, and any task where the silhouette matters needs masks, not boxes. " +
        "Thresholding teaches the target; U-Net is how you get it at scale.",
      formula: "per-pixel:  ĉ(x,y) = argmax_c p(c | x,y)",
      callout: "torchvision `segmentation` models; `segmentation_models_pytorch` for U-Net variants; scikit-image for classical masks.",
    },
    goal: "Run a threshold baseline, then a U-Net semantic mask.",
    hints: [
      "`concept segmentation` first.",
      "`threshold otsu` is the classical pixel-label baseline.",
      "`unet` produces the learned semantic mask.",
    ],
    learning: [
      "Segmentation is per-pixel classification",
      "U-Net is encoder-decoder with skip connections",
      "Classical thresholds still matter as baselines",
    ],
    steps: w10_1_steps,
    seedImage: "coins",
    win: winFromSteps(w10_1_steps, "Pixel-level labeling is working."),
  },
  {
    id: "10.2",
    world: "w10",
    worldTitle: WORLD_TITLE,
    title: "Instance masks with Mask R-CNN",
    concept: {
      title: "Semantic vs instance segmentation",
      body:
        "Semantic segmentation maps each pixel to a class — all cars share one label. Instance segmentation " +
        "separates each object: car₁, car₂, car₃ get distinct masks and IDs. Mask R-CNN extends Faster R-CNN " +
        "with a parallel mask head on each proposed region (RoI), so it detects, classifies, and segments at " +
        "once. Use semantic masks for background/region understanding; use instance masks when you must count " +
        "or measure individual objects.",
      whatHappens:
        "`maskrcnn` runs a two-stage instance segmenter and writes per-object masks to the stage " +
        "(segmenter=\"maskrcnn\"). Re-reading `concept segmentation` contrasts this with U-Net's class map.",
      why:
        "Counting people, measuring crop rows, or tracking individual parcels needs instance identity. " +
        "Picking the wrong mask type silently breaks the product metric.",
      formula: "Mask R-CNN: box + class + mask  per RoI",
      callout: "torchvision `maskrcnn_resnet50_fpn`; Detectron2 / MMDetection for research stacks; ultralytics YOLO-seg for single-shot instances.",
    },
    goal: "Run Mask R-CNN and contrast instance vs semantic output.",
    hints: [
      "`maskrcnn` for per-instance masks.",
      "`concept segmentation` for the semantic/instance split.",
      "`show image` to review the masks.",
    ],
    learning: [
      "Instance masks separate objects; semantic masks do not",
      "Mask R-CNN attaches a mask head to a detector",
      "The right mask type is a product requirement",
    ],
    steps: w10_2_steps,
    seedImage: "street",
    win: winFromSteps(w10_2_steps, "Instance segmentation demystified."),
  },
  {
    id: "10.3",
    world: "w10",
    worldTitle: WORLD_TITLE,
    title: "From boxes to masks",
    concept: {
      title: "Dense predictions stack on detection",
      body:
        "Modern pipelines often run detection first (what objects exist?) then a segmentation head or model " +
        "for pixel coverage. Single-shot variants (YOLO-seg) fold both into one network. Two-stage pipelines " +
        "keep them modular so you can swap heads. Either way, boxes give you identity and counting; masks give " +
        "you area, shape, and occlusion reasoning. You usually need both in a serious CV product.",
      whatHappens:
        "`yolo` establishes detections. `yolo mask` / `yolo seg` attaches a segmentation branch " +
        "(or run `unet` / `maskrcnn` directly). The session tracks detector and segmenter flags separately " +
        "so you can see which heads fired.",
      why:
        "Understanding the box→mask relationship prevents re-architecting later. It also clarifies when a " +
        "cheap detector plus a classical mask (threshold + morphology) is enough.",
      formula: "pipeline = detect → (optional) segment → measure/track",
      callout: "Ultralytics YOLO-seg; torchvision Mask R-CNN; supervision for drawing boxes and masks consistently.",
    },
    goal: "Run a detector, then attach segmentation (mask/seg/unet/maskrcnn).",
    hints: [
      "`yolo` first to get instances.",
      "`yolo mask` or `unet` / `maskrcnn` for masks.",
      "Compare box coverage with pixel coverage.",
    ],
    learning: [
      "Detection and segmentation are complementary heads",
      "Single-shot vs modular pipelines are both valid",
      "Boxes identify; masks measure shape and area",
    ],
    steps: w10_3_steps,
    seedImage: "street",
    win: winFromSteps(w10_3_steps, "You can escalate from boxes to full masks."),
  },
];
