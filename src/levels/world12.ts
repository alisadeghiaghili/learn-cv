import type { GoalStep, Level } from "../engine/types";
import { winFromSteps } from "./win";

export const WORLD_TITLE = "WORLD 12 · PRODUCTION";

const w12_1_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the production concept",
    detail: "Type `concept production` — production is latency and monitoring, not just accuracy.",
    command: "concept production",
    check: (s) => s.conceptInspected.includes("production"),
  },
  {
    id: "video",
    label: "Load a video source",
    detail: "`video` opens a frame stream (simulated) instead of a still.",
    command: "video",
    check: (s) => s.videoLoaded,
  },
  {
    id: "track",
    label: "Track across frames",
    detail: "`track` assigns stable IDs with a ByteTrack-style tracker.",
    command: "track",
    check: (s) => s.tracked,
  },
];

const w12_2_steps: readonly GoalStep[] = [
  {
    id: "model",
    label: "Have a model to export",
    detail: "Build one first — `yolo` or `cnn transfer`.",
    command: "yolo",
    check: (s) => s.detector !== null || s.cnnBuilt,
  },
  {
    id: "onnx",
    label: "Export to ONNX",
    detail: "`onnx` records a portable graph for onnxruntime.",
    command: "onnx",
    check: (s) => s.exportedOnnx,
  },
  {
    id: "concept",
    label: "Read the production story",
    detail: "`concept production` covers latency budgets and runtime choice.",
    command: "concept production",
    check: (s) => s.conceptInspected.includes("production"),
  },
];

const w12_3_steps: readonly GoalStep[] = [
  {
    id: "media",
    label: "Run on-device landmarks",
    detail: "`mediapipe` (or `pose` / `hands`) for real-time landmark models.",
    command: "mediapipe",
    check: (s) => s.mediapipeUsed && s.keypoints.length > 0,
  },
  {
    id: "onnx",
    label: "Export a portable model",
    detail: "`onnx` so the stack can leave the training environment.",
    command: "onnx",
    check: (s) => s.exportedOnnx,
  },
  {
    id: "track",
    label: "Add temporal tracking",
    detail: "`video` + `track` turns per-frame predictions into identities.",
    command: "track",
    check: (s) => s.tracked && s.videoLoaded,
  },
];

export const WORLD12_LEVELS: readonly Level[] = [
  {
    id: "12.1",
    world: "w12",
    worldTitle: WORLD_TITLE,
    title: "Video and multi-object tracking",
    concept: {
      title: "Frames need identities",
      body:
        "Detection runs per frame; tracking links those detections over time. A tracker (ByteTrack, SORT/DeepSORT) " +
        "matches current boxes to previous trajectories using motion (Kalman) and appearance/box IoU, then " +
        "assigns stable IDs. Without tracking you cannot count unique people, measure dwell time, or smooth " +
        "jittery box outputs. Video I/O is its own engineering problem: frame rate, drop, and latency budgets.",
      whatHappens:
        "`video` loads a frame stream (videoLoaded=true). `track` runs a ByteTrack-style association so " +
        "detections get persistent IDs across frames (tracked=true).",
      why:
        "Production CV is temporal. Single-frame metrics hide ID switches and stutter that users feel immediately.",
      formula: "assign ID via min-cost matching (IoU / appearance), predict next with Kalman filter",
      callout: "supervision trackers, ByteTrack, boxmot; OpenCV `VideoCapture`; decord/torchvision for fast decode.",
    },
    goal: "Load a video and track objects across frames.",
    hints: [
      "`concept production` first.",
      "`video` opens the frame stream.",
      "`track` assigns stable IDs.",
    ],
    learning: [
      "Tracking links detections into identities",
      "ByteTrack-style association is the modern default",
      "Video I/O has its own latency and drop concerns",
    ],
    steps: w12_1_steps,
    seedImage: "street",
    win: winFromSteps(w12_1_steps, "Temporal identities are under control."),
  },
  {
    id: "12.2",
    world: "w12",
    worldTitle: WORLD_TITLE,
    title: "ONNX export for portable inference",
    concept: {
      title: "Train in Python, ship in ONNX",
      body:
        "ONNX is a neutral graph format: your trained model becomes operators and initializers any runtime can " +
        "execute. Exporting to ONNX separates the training stack (PyTorch) from the serving stack " +
        "(onnxruntime, TensorRT, OpenVINO, mobile NNAPI). You must freeze preprocessing (resize, normalization) " +
        "into the graph or the runtime, profile latency on target hardware, and version the artifact. " +
        "A model that cannot leave the training notebook is not production.",
      whatHappens:
        "After building a model (`yolo` or `cnn transfer`), `onnx` records an export (exportedOnnx=true) and " +
        "points at onnxruntime.InferenceSession as the portable consumer.",
      why:
        "Portability and latency are product constraints. ONNX is how you keep one training codebase and many " +
        "deployment targets without rewriting the net.",
      formula: "torch.onnx.export(model, dummy_in, 'model.onnx', opset_version=…)",
      callout: "onnx + onnxruntime; ultralytics `model.export(format='onnx')`; Netron for graph inspection; TensorRT/OpenVINO as optimizers.",
    },
    goal: "Build a model and export it to ONNX.",
    hints: [
      "You need a model first — `yolo` or `cnn transfer`.",
      "`onnx` records the export.",
      "`concept production` for the shipping story.",
    ],
    learning: [
      "ONNX is a portable inference graph",
      "Preprocessing must ship with the model",
      "Latency profiles belong to the deployment target",
    ],
    steps: w12_2_steps,
    seedImage: "shapes",
    win: winFromSteps(w12_2_steps, "Model is export-ready and portable."),
  },
  {
    id: "12.3",
    world: "w12",
    worldTitle: WORLD_TITLE,
    title: "On-device landmarks and the full stack",
    concept: {
      title: "Ship the whole loop",
      body:
        "A complete CV product combines: a fast on-device model (MediaPipe pose/hands/face), a heavier " +
        "detector when needed, export to a portable runtime, and tracking for temporal stability — plus " +
        "monitoring for drift, latency, and failures. MediaPipe-style pipelines show that not everything needs " +
        "a giant server model: landmark graphs run at 30fps on a phone. Design the lightest pipeline that hits " +
        "the product metric, then instrument it.",
      whatHappens:
        "`mediapipe` runs a landmark graph (mediapipeUsed + keypoints). `onnx` prepares a portable export. " +
        "`video` + `track` add temporal identity. Together these flags represent a deployable stack.",
      why:
        "Interviewers and stakeholders care about the end-to-end story: I/O → model → postprocess → track → " +
        "monitor. The last 20% of work is what makes a demo a product.",
      formula: "pipeline: decode → infer (mediapipe/onnx) → track → log/metrics",
      callout: "MediaPipe solutions; onnxruntime; supervision for drawing/tracking; OpenCV for I/O and calibration.",
    },
    goal: "Run landmarks, export ONNX, and track over a video source.",
    hints: [
      "`mediapipe` (or `pose` / `hands`).",
      "`onnx` for portable inference.",
      "`video` then `track` for identities over time.",
    ],
    learning: [
      "On-device graphs can beat a server round-trip",
      "Export + tracking + monitoring is the production stack",
      "Lightest pipeline that meets the metric wins",
    ],
    steps: w12_3_steps,
    seedImage: "faces",
    win: winFromSteps(w12_3_steps, "Full production loop rehearsed — you can ship this."),
  },
];
