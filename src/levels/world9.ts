import type { GoalStep, Level } from "../engine/types";
import { winFromSteps } from "./win";

export const WORLD_TITLE = "WORLD 9 · DETECTION";

const w9_1_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the detection concept",
    detail: "Type `concept detection` before running any detector.",
    command: "concept detection",
    check: (s) => s.conceptInspected.includes("detection"),
  },
  {
    id: "load",
    label: "Load a multi-object scene",
    detail: "`load street` so there is more than one thing to find.",
    command: "load street",
    check: (s) => s.ops.some((o) => o.kind === "load"),
  },
  {
    id: "yolo",
    label: "Run YOLO",
    detail: "`yolo` predicts boxes + classes in one shot and annotates the stage.",
    command: "yolo",
    check: (s) => s.detector === "yolo" && s.detections.length > 0,
  },
];

const w9_2_steps: readonly GoalStep[] = [
  {
    id: "ssd",
    label: "Run SSD",
    detail: "`ssd` is a single-shot multi-box detector — different anchor design, same output shape.",
    command: "ssd",
    check: (s) => s.ops.some((o) => o.kind === "ssd") && s.detections.length > 0,
  },
  {
    id: "fastrcnn",
    label: "Run Faster R-CNN",
    detail: "`fastrcnn` (or `faster-rcnn`) uses a two-stage region proposal path — slower, often more accurate.",
    command: "fastrcnn",
    check: (s) => s.ops.some((o) => o.kind === "fastrcnn") && s.detections.length > 0,
  },
  {
    id: "compare",
    label: "Compare detector families",
    detail: "Same scene, three architectures — note scores and box quality differences.",
    command: "show image",
    check: (s) => s.detector !== null && s.commandCount > 0,
  },
];

const w9_3_steps: readonly GoalStep[] = [
  {
    id: "yolo",
    label: "Detect first",
    detail: "Get boxes on the board with `yolo`.",
    command: "yolo",
    check: (s) => s.detections.length > 0,
  },
  {
    id: "iou",
    label: "Reason about IoU / NMS",
    detail: "Re-read `concept detection` and picture non-maximum suppression on overlapping boxes.",
    command: "concept detection",
    check: (s) => s.conceptInspected.includes("detection"),
  },
  {
    id: "more",
    label: "Run a second detector",
    detail: "Switch to `ssd` or `fastrcnn` and compare which boxes survive.",
    command: "ssd",
    check: (s) => s.ops.some((o) => o.kind === "ssd" || o.kind === "fastrcnn"),
  },
];

export const WORLD9_LEVELS: readonly Level[] = [
  {
    id: "9.1",
    world: "w9",
    worldTitle: WORLD_TITLE,
    title: "YOLO one-shot detection",
    concept: {
      title: "Detection is localization + classification",
      body:
        "An object detector must answer two questions per object: where is it (box: x, y, w, h) and what is it " +
        "(class + score). YOLO divides the image into a grid and predicts boxes and class probabilities in one " +
        "forward pass — 'you only look once'. Overlapping boxes are suppressed by non-maximum suppression (NMS) " +
        "using IoU, so each object keeps a single best box. Speed made YOLO the default for real-time systems.",
      whatHappens:
        "`yolo` runs a simulated Ultralytics-style detector, writes Detection boxes with labels and scores " +
        "onto the stage (detector=\"yolo\", detections.length > 0), and is annotated with supervision-style drawing.",
      why:
        "Detection is the workhorse of applied CV: people, cars, defects, shelves, safety gear. Learn the box " +
        "contract (xywh, score, class) once and every detector API looks familiar.",
      formula: "IoU = |A ∩ B| / |A ∪ B|  ·  keep box if IoU with better box < τ",
      callout: "Ultralytics YOLO (`ultralytics`), supervision for drawing/NMS utilities, OpenCV DNN as a runtime host.",
    },
    goal: "Run YOLO on a multi-object scene and get annotated detections.",
    hints: [
      "`concept detection` explains boxes, scores, and NMS.",
      "`load street` for a richer scene.",
      "`yolo` writes detections onto the stage.",
    ],
    learning: [
      "Detectors output boxes + class scores",
      "YOLO is a single-shot architecture",
      "NMS + IoU clean up duplicate boxes",
    ],
    steps: w9_1_steps,
    seedImage: "street",
    win: winFromSteps(w9_1_steps, "First real detector online."),
  },
  {
    id: "9.2",
    world: "w9",
    worldTitle: WORLD_TITLE,
    title: "SSD and Faster R-CNN",
    concept: {
      title: "One-shot vs two-stage detectors",
      body:
        "SSD predicts boxes at multiple feature-map scales in one pass — different anchors from YOLO, still " +
        "single-shot. Faster R-CNN is two-stage: a Region Proposal Network suggests candidate boxes, then a " +
        "head classifies and refines them. Two-stage models are usually more accurate on small objects and " +
        "dense scenes; one-shot models win on latency. Choose by your accuracy/latency budget, not by hype.",
      whatHappens:
        "`ssd` runs a single-shot multi-box detector. `fastrcnn` (alias `faster-rcnn`) runs a two-stage " +
        "region-proposal detector. Both write detections; detector flag tracks which family you last ran.",
      why:
        "Shipping systems juggle FPS vs mAP. Understanding the architecture family tells you where the compute " +
        "goes and which knobs (input size, NMS threshold, anchors) matter.",
      formula: "two-stage: proposals → classify/refine  ·  one-shot: grid/anchors → score+box",
      callout: "torchvision `ssd300_vgg16`, `fasterrcnn_resnet50_fpn`; Ultralytics YOLO variants; OpenCV DNN for deployment.",
    },
    goal: "Run SSD, then Faster R-CNN, and compare detector families.",
    hints: [
      "`ssd` — single-shot multi-box.",
      "`fastrcnn` — two-stage region proposals.",
      "Same scene, different compute/accuracy tradeoffs.",
    ],
    learning: [
      "SSD is single-shot; Faster R-CNN is two-stage",
      "Input design and anchors change what you can find",
      "Latency budgets pick the architecture",
    ],
    steps: w9_2_steps,
    seedImage: "street",
    win: winFromSteps(w9_2_steps, "Detector family tradeoffs are clear."),
  },
  {
    id: "9.3",
    world: "w9",
    worldTitle: WORLD_TITLE,
    title: "Boxes, IoU, and NMS in practice",
    concept: {
      title: "Post-processing is half the detector",
      body:
        "A raw detector head emits many overlapping candidate boxes. IoU measures overlap. NMS sorts by score " +
        "and suppresses boxes that overlap a kept box more than a threshold. Score thresholds drop weak " +
        "detections. These three knobs — score, IoU, max boxes — change your mAP and your false-positive rate " +
        "as much as the network itself. Always evaluate with them set deliberately (and log the values).",
      whatHappens:
        "After `yolo`, detections are already NMS-style boxes. Re-reading `concept detection` ties the " +
        "post-processing story together. Running `ssd` or `fastrcnn` lets you compare which boxes different " +
        "families keep on the same scene.",
      why:
        "Most production detection bugs are threshold bugs. Calibrating score/IoU on a validation set is " +
        "mandatory work, not optional tuning.",
      formula: "keep b if score(b) ≥ s_min and ∀ kept b': IoU(b, b') < iou_max",
      callout: "supervision `BoxAnnotator` / NMS helpers; torchvision `ops.nms`; Ultralytics `iou`, `conf`, `max_det` args.",
    },
    goal: "Detect with one model, study IoU/NMS, then run a second detector family.",
    hints: [
      "`yolo` first to get boxes on stage.",
      "`concept detection` for IoU and NMS.",
      "`ssd` or `fastrcnn` for a second opinion.",
    ],
    learning: [
      "NMS and score thresholds shape results",
      "IoU measures box overlap",
      "Post-processing needs validation like any hyperparameter",
    ],
    steps: w9_3_steps,
    seedImage: "street",
    win: winFromSteps(w9_3_steps, "You treat post-processing as part of the model."),
  },
];
