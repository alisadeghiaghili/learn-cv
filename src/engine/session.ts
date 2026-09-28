/**
 * Session state for the LearnCV sandbox.
 * Immutable snapshots + a mutable working session.
 */

import {
  cloneTensor,
  detectFakeObjects,
  equalizeHistogram as eqHist,
  histogram,
  makeImage,
  meanStd,
  orbKeypoints,
  harrisCorners,
  toGray,
} from "./image";
import {
  addNoise,
  adjustBrightness,
  adjustContrast,
  boxBlur,
  crop,
  edges,
  emboss,
  flip,
  gaussianBlur,
  medianBlur,
  morph,
  resize,
  rgbToHsvPreview,
  rotate,
  sharpen,
  threshold,
  warp,
  type EdgeMap,
} from "./filters";
import type {
  Detection,
  ImageId,
  ImageTensor,
  Keypoint,
  OpKind,
  OpRecord,
  SessionSnapshot,
} from "./types";

export class Session {
  private image: ImageTensor | null = null;
  private original: ImageTensor | null = null;
  private ops: OpRecord[] = [];
  private detections: Detection[] = [];
  private keypoints: Keypoint[] = [];
  private gray = false;
  private blurred = false;
  private edgeMap: EdgeMap | null = null;
  private thresholded = false;
  private morphed = false;
  private resized = false;
  private warped = false;
  private featuresExtracted = false;
  private cnnBuilt = false;
  private transferUsed = false;
  private detector: "yolo" | "ssd" | "fastrcnn" | null = null;
  private segmenter: "unet" | "maskrcnn" | null = null;
  private augmented = false;
  private exportedOnnx = false;
  private tracked = false;
  private videoLoaded = false;
  private mediapipeUsed = false;
  private packageInspected: string[] = [];
  private conceptInspected: string[] = [];
  private steps: string[] = [];
  private commandCount = 0;
  private lastError: string | null = null;
  private scene: ImageId | "custom" = "shapes";

  reset(image?: ImageId): void {
    this.scene = image ?? "shapes";
    this.load(this.scene, true);
    this.commandCount = 0;
    this.lastError = null;
    this.steps = [];
  }

  load(id: ImageId, quiet = false): ImageTensor {
    this.scene = id;
    const ImageTensor = makeImage(id);
    this.original = cloneTensor(ImageTensor);
    this.image = ImageTensor;
    this.ops = [
      {
        kind: "load",
        label: `load ${id}`,
        args: { id },
        packageRef: "numpy · Pillow",
      },
    ];
    this.detections = [];
    this.keypoints = [];
    this.gray = false;
    this.blurred = false;
    this.edgeMap = null;
    this.thresholded = false;
    this.morphed = false;
    this.resized = false;
    this.warped = false;
    this.featuresExtracted = false;
    this.cnnBuilt = false;
    this.transferUsed = false;
    this.detector = null;
    this.segmenter = null;
    this.augmented = false;
    this.exportedOnnx = false;
    this.tracked = false;
    this.videoLoaded = false;
    this.mediapipeUsed = false;
    if (!quiet) this.steps.push(`load ${id}`);
    return ImageTensor;
  }

  bumpCommand(): void {
    this.commandCount++;
  }

  setError(msg: string | null): void {
    this.lastError = msg;
  }

  inspectPackage(id: string): void {
    if (!this.packageInspected.includes(id)) this.packageInspected.push(id);
  }

  inspectConcept(id: string): void {
    if (!this.conceptInspected.includes(id)) this.conceptInspected.push(id);
  }

  private pushOp(kind: OpKind, label: string, args: Record<string, number | string | boolean>, packageRef: string, note?: string): void {
    this.ops.push({ kind, label, args, packageRef, note });
    this.steps.push(label);
  }

  private requireImage(): ImageTensor {
    if (!this.image) throw new Error("No image loaded. Try `load shapes`.");
    return this.image;
  }

  ensureLoaded(): void {
    if (!this.image) this.load(this.scene === "custom" ? "shapes" : this.scene, true);
  }

  applyCvtColor(space: "gray" | "rgb" | "hsv"): { image: ImageTensor; side?: { hue: ImageTensor; sat: ImageTensor; val: ImageTensor } } {
    const ImageTensor = this.requireImage();
    if (space === "gray") {
      this.image = toGray(ImageTensor);
      this.gray = true;
      this.pushOp("cvtColor", "cv.cvtColor gray", { space }, "OpenCV", "Rec.601 luma");
      return { image: this.image };
    }
    if (space === "hsv") {
      const preview = rgbToHsvPreview(ImageTensor);
      this.pushOp("cvtColor", "cv.cvtColor hsv", { space }, "OpenCV", "H/S/V channels");
      return { image: ImageTensor, side: preview };
    }
    this.gray = false;
    this.pushOp("cvtColor", "cv.cvtColor rgb", { space }, "OpenCV");
    return { image: this.requireImage() };
  }

  applyBlur(kind: "box" | "gaussian" | "median", radius: number): void {
    const ImageTensor = this.requireImage();
    if (kind === "box") this.image = boxBlur(ImageTensor, radius);
    else if (kind === "gaussian") this.image = gaussianBlur(ImageTensor, radius);
    else this.image = medianBlur(ImageTensor, radius);
    this.blurred = true;
    this.pushOp("blur", `cv.${kind}Blur ${radius}`, { kind, radius }, "OpenCV · scikit-image");
  }

  applySharpen(): void {
    this.image = sharpen(this.requireImage());
    this.pushOp("sharpen", "cv.sharpen", {}, "OpenCV · scikit-image");
  }

  applyEmboss(): void {
    this.image = emboss(this.requireImage());
    this.pushOp("emboss", "cv.emboss", {}, "OpenCV");
  }

  applyEdges(mode: EdgeMap): void {
    this.image = edges(this.requireImage(), mode);
    this.edgeMap = mode;
    this.gray = true;
    this.pushOp("canny", `cv.${mode}`, { mode }, "OpenCV · scikit-image", "gradient magnitude");
  }

  applyThreshold(level: number, mode: "binary" | "otsu" | "adaptive"): number {
    const { image, usedThreshold } = threshold(this.requireImage(), level, mode);
    this.image = image;
    this.thresholded = true;
    this.gray = true;
    this.pushOp("threshold", `cv.threshold ${mode} t=${usedThreshold.toFixed(2)}`, { level: usedThreshold, mode }, "OpenCV · scikit-image");
    return usedThreshold;
  }

  applyMorph(mode: "erode" | "dilate" | "open" | "close", radius: number): void {
    this.image = morph(this.requireImage(), mode, radius);
    this.morphed = true;
    this.gray = true;
    this.pushOp(mode === "erode" ? "erode" : mode === "dilate" ? "dilate" : mode === "open" ? "open" : "close", `cv.${mode} r=${radius}`, { mode, radius }, "OpenCV · scikit-image");
  }

  applyResize(w: number, h: number): void {
    this.image = resize(this.requireImage(), w, h);
    this.resized = true;
    this.pushOp("resize", `cv.resize ${w}x${h}`, { w, h }, "OpenCV · Pillow · torchvision");
  }

  applyFlip(axis: "h" | "v"): void {
    this.image = flip(this.requireImage(), axis);
    this.augmented = true;
    this.pushOp("flip", `aug.flip ${axis}`, { axis }, "albumentations · torchvision");
  }

  applyRotate(deg: number): void {
    this.image = rotate(this.requireImage(), deg);
    this.augmented = true;
    this.warped = true;
    this.pushOp("rotate", `cv.rotate ${deg}°`, { deg }, "OpenCV · torchvision");
  }

  applyCrop(x: number, y: number, w: number, h: number): void {
    this.image = crop(this.requireImage(), x, y, w, h);
    this.resized = true;
    this.pushOp("crop", `cv.crop ${x},${y} ${w}x${h}`, { x, y, w, h }, "OpenCV · Pillow");
  }

  applyWarp(strength: number): void {
    this.image = warp(this.requireImage(), strength);
    this.warped = true;
    this.pushOp("warp", `cv.warpPerspective s=${strength}`, { strength }, "OpenCV", "keystone approximation");
  }

  applyEqualize(): void {
    this.image = eqHist(this.requireImage());
    this.pushOp("equalize", "cv.equalizeHist", {}, "OpenCV · scikit-image");
  }

  applyBrightness(delta: number): void {
    this.image = adjustBrightness(this.requireImage(), delta);
    this.augmented = true;
    this.pushOp("augment", `aug.brightness ${delta}`, { delta }, "albumentations");
  }

  applyContrast(factor: number): void {
    this.image = adjustContrast(this.requireImage(), factor);
    this.augmented = true;
    this.pushOp("augment", `aug.contrast ${factor}`, { factor }, "albumentations");
  }

  applyNoise(amount: number, seed: number): void {
    this.image = addNoise(this.requireImage(), amount, seed);
    this.pushOp("augment", `aug.noise ${amount}`, { amount, seed }, "albumentations");
  }

  extractHarris(): void {
    this.keypoints = harrisCorners(this.requireImage());
    this.featuresExtracted = true;
    this.pushOp("harris", `detect.harris n=${this.keypoints.length}`, { n: this.keypoints.length }, "OpenCV · scikit-image");
  }

  extractOrb(): void {
    this.keypoints = orbKeypoints(this.requireImage());
    this.featuresExtracted = true;
    this.pushOp("orb", `detect.orb n=${this.keypoints.length}`, { n: this.keypoints.length }, "OpenCV");
  }

  extractHog(): void {
    this.featuresExtracted = true;
    this.gray = true;
    this.pushOp("hog", "detect.hog", {}, "scikit-image · OpenCV", "gradient orientation histogram");
  }

  runTemplateMatch(): void {
    this.featuresExtracted = true;
    this.keypoints = [
      { x: 40, y: 80, score: 0.9, kind: "template" },
      { x: 120, y: 80, score: 0.9, kind: "template" },
      { x: 40, y: 160, score: 0.9, kind: "template" },
      { x: 120, y: 160, score: 0.9, kind: "template" },
    ];
    this.detections = [
      { box: { x: 40, y: 80, w: 80, h: 80 }, label: "template", score: 0.81, classId: 0 },
      { box: { x: 140, y: 90, w: 70, h: 60 }, label: "template", score: 0.74, classId: 0 },
    ];
    this.pushOp("template", "detect.template", {}, "OpenCV · scikit-image");
  }

  runMatch(): void {
    this.featuresExtracted = true;
    this.pushOp("match", "detect.match", {}, "OpenCV", "RANSAC homography");
    this.warped = true;
  }

  runPanorama(): void {
    this.featuresExtracted = true;
    this.warped = true;
    this.pushOp("panorama", "detect.panorama", {}, "OpenCV", "stitch two views");
  }

  buildCnn(transfer: boolean): void {
    this.cnnBuilt = true;
    this.transferUsed = transfer;
    this.pushOp("cnn", transfer ? "cnn.resnet50 finetune" : "cnn.tiny", { transfer }, "torchvision · transformers", transfer ? "pretrained backbone" : "from-scratch toy CNN");
  }

  runDetector(kind: "yolo" | "ssd" | "fastrcnn", segment = false): void {
    this.detector = kind;
    if (segment) this.segmenter = kind === "yolo" ? "unet" : "maskrcnn";
    const scene = this.scene === "custom" ? "shapes" : this.scene;
    this.detections = detectFakeObjects(scene, kind, segment ? (this.segmenter ?? undefined) : undefined);
    this.pushOp(
      segment ? "unet" : kind === "yolo" ? "yolo" : kind === "ssd" ? "ssd" : "fastrcnn",
      `detect.${kind}${segment ? " +mask" : ""} n=${this.detections.length}`,
      { kind, segment },
      kind === "yolo" ? "ultralytics · supervision" : "torchvision · ultralytics",
    );
    if (segment) this.segmenter = kind === "yolo" ? "unet" : "maskrcnn";
  }

  runSegment(kind: "unet" | "maskrcnn"): void {
    this.segmenter = kind;
    const scene = this.scene === "custom" ? "shapes" : this.scene;
    this.detections = detectFakeObjects(scene, "yolo", kind);
    this.pushOp(kind === "unet" ? "unet" : "maskrcnn", `segment.${kind}`, { kind }, "torchvision · ultralytics");
  }

  runAugment(): void {
    this.augmented = true;
    const ImageTensor = this.requireImage();
    this.image = adjustContrast(adjustBrightness(ImageTensor, 0.05), 1.15);
    this.pushOp("albu", "albu.Compose flip+contrast", {}, "albumentations", "label-aware");
  }

  exportOnnx(): void {
    this.exportedOnnx = true;
    this.pushOp("onnx", "onnx.export", {}, "onnxruntime", "portable inference");
  }

  runTrack(): void {
    this.tracked = true;
    this.videoLoaded = true;
    this.pushOp("track", "track.ByteTrack", {}, "supervision · OpenCV");
  }

  loadVideo(): void {
    this.videoLoaded = true;
    this.pushOp("video", "video.load", {}, "OpenCV · decord");
  }

  runMediapipe(): void {
    this.mediapipeUsed = true;
    this.pushOp("mediapipe", "mediapipe.pose", {}, "MediaPipe", "on-device landmarks");
    this.keypoints = [
      { x: 80, y: 100, score: 0.95, kind: "orb" },
      { x: 175, y: 120, score: 0.93, kind: "orb" },
      { x: 80, y: 180, score: 0.9, kind: "orb" },
      { x: 175, y: 190, score: 0.88, kind: "orb" },
    ];
  }

  getHistogram(): ReturnType<typeof histogram> | null {
    if (!this.image) return null;
    return histogram(this.image);
  }

  snapshot(): SessionSnapshot {
    const ImageTensor = this.image;
    const stats = ImageTensor ? meanStd(ImageTensor) : { mean: 0, std: 0 };
    return {
      image: ImageTensor,
      original: this.original,
      ops: [...this.ops],
      detections: [...this.detections],
      keypoints: [...this.keypoints],
      histogram: this.getHistogram(),
      gray: this.gray,
      blurred: this.blurred,
      edgeMap: this.edgeMap,
      thresholded: this.thresholded,
      morphed: this.morphed,
      resized: this.resized,
      warped: this.warped,
      featuresExtracted: this.featuresExtracted,
      cnnBuilt: this.cnnBuilt,
      transferUsed: this.transferUsed,
      detector: this.detector,
      segmenter: this.segmenter,
      augmented: this.augmented,
      exportedOnnx: this.exportedOnnx,
      tracked: this.tracked,
      videoLoaded: this.videoLoaded,
      mediapipeUsed: this.mediapipeUsed,
      packageInspected: [...this.packageInspected],
      conceptInspected: [...this.conceptInspected],
      mean: stats.mean,
      std: stats.std,
      commandCount: this.commandCount,
      lastError: this.lastError,
      steps: [...this.steps],
    };
  }

  get currentImage(): ImageTensor | null {
    return this.image;
  }

  get currentScene(): string {
    return this.scene;
  }
}
