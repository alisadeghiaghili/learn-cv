/**
 * Concept glossary — from pixels to production.
 * Dense mental models, not textbook padding.
 */

import type { ConceptBrief } from "../engine/types";

export interface ConceptCard extends ConceptBrief {
  readonly id: string;
  readonly world: string;
  readonly keywords: readonly string[];
}

export const CONCEPTS: readonly ConceptCard[] = [
  {
    id: "pixels",
    world: "w1",
    title: "Pixels are numbers",
    body:
      "An image is a tensor. Height × width × channels. Each value is intensity. " +
      "uint8 stores 0–255; float32 is usually normalized to 0–1. Every later algorithm is array math on that grid.",
    whatHappens: "You inspect shape, dtype, and a single pixel value.",
    why: "If you cannot reason about shape and range, every OpenCV call becomes cargo cult.",
    formula: "I ∈ ℝ^{H×W×C}",
    callout: "numpy · Pillow · OpenCV",
    keywords: ["pixel", "tensor", "dtype", "shape", "uint8"],
  },
  {
    id: "channels",
    world: "w1",
    title: "Channels and color spaces",
    body:
      "RGB is storage convention; HSV separates hue (what) from value (how bright); gray collapses channels. " +
      "Convert deliberately — edge detection wants luma; color segmentation wants hue.",
    whatHappens: "cvtColor moves between RGB/gray/HSV.",
    why: "Wrong color space is a silent accuracy tax.",
    formula: "Y = 0.299R + 0.587G + 0.114B",
    callout: "cv2.cvtColor · skimage.color",
    keywords: ["rgb", "hsv", "gray", "cvtColor", "luma"],
  },
  {
    id: "histogram",
    world: "w1",
    title: "Histograms diagnose contrast",
    body:
      "A histogram is the distribution of intensities. Bunched left = dark. Spike at one bin = flat/overexposed. " +
      "Equalization redistributes mass; CLAHE does it locally so you do not amplify noise globally.",
    whatHappens: "You plot bins and apply equalize/CLAHE.",
    why: "Exposure problems look like model problems until you plot the histogram.",
    callout: "cv2.calcHist · skimage.exposure.equalize_hist",
    keywords: ["histogram", "equalize", "clahe", "contrast"],
  },
  {
    id: "convolution",
    world: "w2",
    title: "Convolution builds structure",
    body:
      "A kernel slides over the image; at each position it is a dot product with the local patch. " +
      "Box/gaussian smooth, sharpen cancels blur, emboss fakes lighting. Same math powers CNN filters — learned, not hand-designed.",
    whatHappens: "Kernel sweep rebuilds the output image.",
    why: "Once convolution is visceral, CNNs stop being magic.",
    formula: "g(x,y) = Σ_{i,j} f(x-i, y-j) · k(i,j)",
    callout: "cv2.filter2D · skimage.filters · torch.nn.Conv2d",
    keywords: ["kernel", "convolution", "blur", "sharpen", "filter"],
  },
  {
    id: "edges",
    world: "w3",
    title: "Edges are high-frequency energy",
    body:
      "Sobel approximates ∂I/∂x and ∂I/∂y. Magnitude is edge strength; orientation is edge direction. " +
      "Laplacian is second derivative (zero-crossings). Canny stacks blur, gradient, NMS, and hysteresis.",
    whatHappens: "You watch gradient maps and double thresholds.",
    why: "Edges are the cheapest feature — and the failure mode when lighting shifts.",
    formula: "G = √(G_x² + G_y²),  θ = atan2(G_y, G_x)",
    callout: "cv2.Sobel · cv2.Canny · skimage.filters.sobel",
    keywords: ["sobel", "canny", "laplacian", "gradient", "hysteresis"],
  },
  {
    id: "threshold",
    world: "w4",
    title: "Thresholding segments intensity",
    body:
      "Binary threshold is a cut at t. Otsu finds t by maximizing between-class variance. " +
      "Adaptive thresholds compare each pixel to its neighborhood — better for uneven lighting.",
    whatHappens: "Images become binary masks.",
    why: "Classical pipelines still win on coins, documents, and controlled lighting.",
    formula: "argmax_t ω₀ω₁(μ₀−μ₁)²",
    callout: "cv2.threshold · skimage.filters.threshold_otsu",
    keywords: ["otsu", "binary", "adaptive", "segmentation"],
  },
  {
    id: "morphology",
    world: "w4",
    title: "Morphology cleans masks",
    body:
      "Erode shrinks white regions (removes speckles). Dilate grows them (closes gaps). " +
      "Open = erode then dilate. Close = dilate then erode. Connected components turn blobs into objects.",
    whatHappens: "Binary masks get cleaner; blobs get labels.",
    why: "A model-free cleanup stage often beats a bigger network.",
    callout: "cv2.morphologyEx · skimage.morphology · cv2.connectedComponents",
    keywords: ["erode", "dilate", "open", "close", "connected components"],
  },
  {
    id: "geometry",
    world: "w5",
    title: "Geometry is a matrix multiply",
    body:
      "Resize, rotate, flip, crop, and warp are samplings of the same continuous image. " +
      "Affine keeps parallel lines; perspective (homography) is 3×3 and handles camera tilt.",
    whatHappens: "Pixels move under an inverse warp.",
    why: "Data augmentation and document scan are the same math.",
    formula: "x' = A · [x y 1]^T",
    callout: "cv2.warpAffine · skimage.transform · torchvision.transforms",
    keywords: ["affine", "homography", "resize", "warp", "augmentation"],
  },
  {
    id: "features",
    world: "w6",
    title: "Features must be repeatable",
    body:
      "Harris/FAST find corners. ORB/SIFT describe patches so they can be matched across images. " +
      "RANSAC fits a homography that most matches agree on and throws out outliers.",
    whatHappens: "Keypoints light up; matches stitch two views.",
    why: "Without repeatability, matching is noise with extra steps.",
    callout: "cv2.goodFeaturesToTrack · cv2.ORB_create · cv2.findHomography",
    keywords: ["harris", "orb", "sift", "descriptor", "ransac", "match"],
  },
  {
    id: "hog",
    world: "w7",
    title: "HOG + classical detectors",
    body:
      "Histogram of Oriented Gradients bins gradient directions in cells. A sliding window + linear SVM " +
      "was the pedestrian detector of record for years. Template matching is the naive cousin — strict, brittle.",
    whatHappens: "HOG vectors feed a linear classifier.",
    why: "Classic pipelines teach inductive bias; deep nets learn it.",
    callout: "skimage.feature.hog · cv2.matchTemplate · cv2.HOGDescriptor",
    keywords: ["hog", "svm", "template", "sliding window"],
  },
  {
    id: "cnn",
    world: "w8",
    title: "CNNs learn filters",
    body:
      "A stack of conv + nonlinearity + pool builds hierarchical features: edges → textures → parts → objects. " +
      "Receptive field grows with depth. ResNets add identity shortcuts so depth stays trainable.",
    whatHappens: "You build a tiny CNN and inspect feature maps.",
    why: "Transfer learning works because early filters are universal.",
    formula: "z = σ(W * x + b)",
    callout: "torch.nn.Conv2d · torchvision.models.resnet50",
    keywords: ["cnn", "resnet", "pooling", "receptive field", "transfer"],
  },
  {
    id: "detection",
    world: "w9",
    title: "Detection is localization + classification",
    body:
      "IoU scores box overlap. NMS kills duplicates. Anchor-based models regress offsets; " +
      "YOLO is one-shot and fast; Faster R-CNN is two-stage and accurate; mAP averages precision over IoU thresholds.",
    whatHappens: "Boxes + scores + labels appear on the image.",
    why: "mAP without IoU understanding is a vanity metric.",
    formula: "IoU = |A∩B| / |A∪B|",
    callout: "torchvision.ops · ultralytics · supervision",
    keywords: ["iou", "nms", "yolo", "map", "anchors", "box"],
  },
  {
    id: "segmentation",
    world: "w10",
    title: "Segmentation labels every pixel",
    body:
      "Semantic = class per pixel. Instance = separate objects. Panoptic = both. " +
      "U-Net upsamples with skip connections; Mask R-CNN adds a mask head to a detector.",
    whatHappens: "Masks paint over objects.",
    why: "When a box is not enough (medical, drive, copy-paste), masks win.",
    callout: "torchvision.models.segmentation · ultralytics SAM/Mask · cv2.watershed",
    keywords: ["unet", "mask", "semantic", "instance", "watershed"],
  },
  {
    id: "augmentation",
    world: "w11",
    title: "Augmentation is regularization",
    body:
      "Flips, crops, color jitter, and blur teach invariance. Boxes and masks must transform together " +
      "(albumentations exists for that). Augment train only — never leak test-time transforms into evaluation.",
    whatHappens: "Same label, different pixels.",
    why: "Most 'model' bugs are data-distribution bugs wearing a costume.",
    callout: "albumentations.Compose · torchvision.transforms",
    keywords: ["augment", "albumentations", "regularization", "leakage"],
  },
  {
    id: "production",
    world: "w12",
    title: "Production is latency and monitoring",
    body:
      "Export (ONNX/TorchScript), pick a runtime, budget latency per frame, and track drift. " +
      "Tracking (ByteTrack/Kalman) stabilizes frame-to-frame IDs. MediaPipe owns real-time landmarks.",
    whatHappens: "Model → export → session.run → metrics.",
    why: "A 95% mAP model that misses the 33ms budget is not a product.",
    callout: "onnxruntime · supervision.ByteTrack · mediapipe",
    keywords: ["onnx", "latency", "tracking", "export", "drift"],
  },
];

export function findConcept(idOrTitle: string): ConceptCard | undefined {
  const q = idOrTitle.toLowerCase().trim();
  return (
    CONCEPTS.find((c) => c.id === q) ??
    CONCEPTS.find((c) => c.title.toLowerCase() === q) ??
    CONCEPTS.find((c) => c.title.toLowerCase().includes(q)) ??
    CONCEPTS.find((c) => c.keywords.some((k) => k.includes(q)))
  );
}

export function conceptsForWorld(world: string): ConceptCard[] {
  return CONCEPTS.filter((c) => c.world === world);
}

export function formatConcept(c: ConceptCard): string[] {
  const lines = [
    `## ${c.title}`,
    c.body,
    "",
    `**What happens** · ${c.whatHappens}`,
    `**Why it matters** · ${c.why}`,
  ];
  if (c.formula) lines.push("", `Formula · \`${c.formula}\``);
  if (c.callout) lines.push(`Packages · ${c.callout}`);
  return lines;
}
