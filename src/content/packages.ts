/**
 * Package catalog — the libraries CV practitioners actually ship with.
 * Each entry maps teaching topics to real APIs and install lines.
 */

import type { PackageInfo } from "../engine/types";

export const PACKAGES: readonly PackageInfo[] = [
  {
    id: "numpy",
    name: "NumPy",
    category: "core",
    oneLiner: "The array substrate every CV stack sits on.",
    useWhen: "Always. Images are tensors; ops are vectorized array math.",
    keyApis: ["ndarray", "transpose", "astype", "histogram", "clip", "einsum"],
    install: "pip install numpy",
    worlds: ["w1", "w2", "w5", "w8"],
  },
  {
    id: "pillow",
    name: "Pillow (PIL)",
    category: "core",
    oneLiner: "Load, save, and lightweight image edits.",
    useWhen: "I/O, resize, crop, format conversion — before heavy ops.",
    keyApis: ["Image.open", "resize", "convert", "crop", "save", "Enhance"],
    install: "pip install Pillow",
    worlds: ["w1", "w5"],
  },
  {
    id: "opencv",
    name: "OpenCV",
    category: "classical",
    oneLiner: "Industrial classical CV: color, filter, geometry, features, video.",
    useWhen: "Production classical pipelines, real-time video, C++ interop.",
    keyApis: [
      "cv2.imread",
      "cvtColor",
      "filter2D",
      "GaussianBlur",
      "Canny",
      "findContours",
      "goodFeaturesToTrack",
      "calcOpticalFlowPyrLK",
      "warpPerspective",
    ],
    install: "pip install opencv-python",
    worlds: ["w1", "w2", "w3", "w4", "w5", "w6", "w12"],
  },
  {
    id: "skimage",
    name: "scikit-image",
    category: "classical",
    oneLiner: "Readable implementations of classic algorithms + metrics.",
    useWhen: "Research-grade classical ops, segmentation labels, reference metrics.",
    keyApis: [
      "io.imread",
      "filters.sobel",
      "filters.gaussian",
      "morphology",
      "measure.label",
      "measure.regionprops",
      "feature.hog",
      "transform.estimate_transform",
      "metrics.structural_similarity",
    ],
    install: "pip install scikit-image",
    worlds: ["w3", "w4", "w6", "w7"],
  },
  {
    id: "matplotlib",
    name: "matplotlib",
    category: "core",
    oneLiner: "The inspection layer: histograms, overlays, grids.",
    useWhen: "Debugging and reporting — never skip visual inspection.",
    keyApis: ["imshow", "hist", "subplots", "Rectangle", "set_title", "colorbar"],
    install: "pip install matplotlib",
    worlds: ["w1", "w2", "w9"],
  },
  {
    id: "torchvision",
    name: "torchvision",
    category: "deep",
    oneLiner: "Datasets, transforms, and reference CNN detectors/segmenters.",
    useWhen: "PyTorch vision models, pretrained weights, standard transforms.",
    keyApis: [
      "datasets",
      "transforms",
      "models.resnet50",
      "models.detection.fasterrcnn",
      "models.segmentation",
      "utils.draw_bounding_boxes",
    ],
    install: "pip install torch torchvision",
    worlds: ["w8", "w9", "w10", "w11"],
  },
  {
    id: "albumentations",
    name: "albumentations",
    category: "pipeline",
    oneLiner: "Fast, label-aware image augmentation.",
    useWhen: "Train-time aug that must keep boxes/masks aligned.",
    keyApis: [
      "Compose",
      "HorizontalFlip",
      "RandomBrightnessContrast",
      "Normalize",
      "BboxParams",
      "MaskParams",
    ],
    install: "pip install albumentations",
    worlds: ["w11"],
  },
  {
    id: "ultralytics",
    name: "Ultralytics YOLO",
    category: "detection",
    oneLiner: "Modern single-shot detection with a small API surface.",
    useWhen: "Ship detection/pose/segment quickly on custom data.",
    keyApis: ["YOLO", "model.train", "model.val", "model.predict", "model.export", "results"],
    install: "pip install ultralytics",
    worlds: ["w9", "w10", "w12"],
  },
  {
    id: "mediapipe",
    name: "MediaPipe",
    category: "media",
    oneLiner: "On-device face, pose, hands, and holistic landmarks.",
    useWhen: "Real-time landmark tasks without training your own model.",
    keyApis: ["solutions.face_mesh", "pose", "hands", "selfie_segmentation", "Holistic"],
    install: "pip install mediapipe",
    worlds: ["w12"],
  },
  {
    id: "transformers",
    name: "Hugging Face transformers",
    category: "deep",
    oneLiner: "ViT / DETR / CLIP / SAM-style vision transformers in a few lines.",
    useWhen: "Transfer learning with large pretrained vision backbones.",
    keyApis: [
      "pipeline('image-classification')",
      "ViTForImageClassification",
      "DetrForObjectDetection",
      "AutoModel",
      "feature_extractor",
    ],
    install: "pip install transformers",
    worlds: ["w8", "w9"],
  },
  {
    id: "onnxruntime",
    name: "ONNX Runtime",
    category: "pipeline",
    oneLiner: "Portable inference across CPU/GPU/NPU.",
    useWhen: "Export once, deploy everywhere; latency budgets in production.",
    keyApis: ["InferenceSession", "session.run", "onnx.export", "providers"],
    install: "pip install onnx onnxruntime",
    worlds: ["w12"],
  },
  {
    id: "supervision",
    name: "supervision",
    category: "detection",
    oneLiner: "Draw, track, evaluate, and zone detections cleanly.",
    useWhen: "Post-processing and visualization around any detector.",
    keyApis: ["Detections", "BoxAnnotator", "ByteTrack", "InferenceSlicer", "metrics"],
    install: "pip install supervision",
    worlds: ["w9", "w12"],
  },
];

export function findPackage(idOrName: string): PackageInfo | undefined {
  const q = idOrName.toLowerCase().trim();
  return PACKAGES.find(
    (p) => p.id === q || p.name.toLowerCase() === q || p.name.toLowerCase().includes(q),
  );
}

export function packagesForWorld(world: string): PackageInfo[] {
  return PACKAGES.filter((p) => p.worlds.includes(world));
}

export function categoryLabel(cat: PackageInfo["category"]): string {
  switch (cat) {
    case "core":
      return "core";
    case "classical":
      return "classical CV";
    case "deep":
      return "deep learning";
    case "detection":
      return "detection";
    case "pipeline":
      return "pipeline / deploy";
    case "media":
      return "real-time media";
  }
}
