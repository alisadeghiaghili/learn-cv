/**
 * Shared engine types for the LearnCV sandbox.
 *
 * Teaching simulator model — not a real OpenCV/PyTorch runtime.
 */

export type ChannelMode = "gray" | "rgb" | "rgba";

export type DType = "uint8" | "float32";

export type ImageId =
  | "shapes"
  | "noise"
  | "gradient"
  | "checker"
  | "text"
  | "coins"
  | "street"
  | "faces"
  | "empty";

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface BBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Detection {
  readonly box: BBox;
  readonly label: string;
  readonly score: number;
  readonly classId: number;
}

export interface Keypoint {
  readonly x: number;
  readonly y: number;
  readonly score: number;
  readonly kind: "corner" | "orb" | "hog" | "template";
}

export interface ImageTensor {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly channels: number;
  readonly dtype: DType;
  /** Flattened pixel grid: length = width * height * channels. */
  readonly data: Float32Array;
  readonly meta?: Readonly<Record<string, string | number | boolean>>;
}

export type OpKind =
  | "load"
  | "cvtColor"
  | "blur"
  | "gaussian"
  | "median"
  | "sharpen"
  | "emboss"
  | "sobel"
  | "laplacian"
  | "canny"
  | "threshold"
  | "otsu"
  | "adaptive"
  | "erode"
  | "dilate"
  | "open"
  | "close"
  | "resize"
  | "crop"
  | "flip"
  | "rotate"
  | "warp"
  | "histogram"
  | "equalize"
  | "clahe"
  | "harris"
  | "fast"
  | "orb"
  | "hog"
  | "template"
  | "match"
  | "homography"
  | "panorama"
  | "cnn"
  | "finetune"
  | "yolo"
  | "ssd"
  | "fastrcnn"
  | "unet"
  | "maskrcnn"
  | "augment"
  | "albu"
  | "onnx"
  | "track"
  | "video"
  | "mediapipe"
  | "pipeline";

export interface OpRecord {
  readonly kind: OpKind;
  readonly label: string;
  readonly args: Readonly<Record<string, number | string | boolean>>;
  readonly packageRef: string;
  readonly note?: string;
}

export interface HistogramData {
  readonly bins: readonly number[];
  readonly channel: number;
  readonly binCount: number;
}

export interface ConceptBrief {
  readonly title: string;
  readonly body: string;
  readonly whatHappens: string;
  readonly why: string;
  readonly formula?: string;
  readonly callout?: string;
}

export interface GoalStep {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly command?: string;
  readonly check: (state: SessionSnapshot) => boolean;
}

export interface WinResult {
  readonly won: boolean;
  readonly feedback: string;
}

export interface Level {
  readonly id: string;
  readonly world: string;
  readonly worldTitle: string;
  readonly title: string;
  readonly concept: ConceptBrief;
  readonly goal: string;
  readonly hints: readonly string[];
  readonly learning: readonly string[];
  readonly steps: readonly GoalStep[];
  readonly seedImage?: ImageId;
  readonly win: (state: SessionSnapshot) => WinResult;
}

export interface SessionSnapshot {
  readonly image: ImageTensor | null;
  readonly original: ImageTensor | null;
  readonly ops: readonly OpRecord[];
  readonly detections: readonly Detection[];
  readonly keypoints: readonly Keypoint[];
  readonly histogram: HistogramData | null;
  readonly gray: boolean;
  readonly blurred: boolean;
  readonly edgeMap: "sobel" | "laplacian" | "canny" | null;
  readonly thresholded: boolean;
  readonly morphed: boolean;
  readonly resized: boolean;
  readonly warped: boolean;
  readonly featuresExtracted: boolean;
  readonly cnnBuilt: boolean;
  readonly transferUsed: boolean;
  readonly detector: "yolo" | "ssd" | "fastrcnn" | null;
  readonly segmenter: "unet" | "maskrcnn" | null;
  readonly augmented: boolean;
  readonly exportedOnnx: boolean;
  readonly tracked: boolean;
  readonly videoLoaded: boolean;
  readonly mediapipeUsed: boolean;
  readonly packageInspected: readonly string[];
  readonly conceptInspected: readonly string[];
  readonly mean: number;
  readonly std: number;
  readonly commandCount: number;
  readonly lastError: string | null;
  readonly steps: readonly string[];
}

export interface CommandResult {
  readonly ok: boolean;
  readonly lines: readonly string[];
  readonly state: SessionSnapshot;
  readonly won?: WinResult;
  readonly screenshotHint?: string;
}

export interface PackageInfo {
  readonly id: string;
  readonly name: string;
  readonly category: "core" | "classical" | "deep" | "detection" | "pipeline" | "media";
  readonly oneLiner: string;
  readonly useWhen: string;
  readonly keyApis: readonly string[];
  readonly install: string;
  readonly worlds: readonly string[];
}
