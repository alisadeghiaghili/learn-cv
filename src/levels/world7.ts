import type { GoalStep, Level } from "../engine/types";
import { winFromSteps } from "./win";

export const WORLD_TITLE = "WORLD 7 · CLASSICAL RECOGNITION";

const w7_1_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the HOG concept",
    detail: "Type `concept hog` to see gradient orientation histograms.",
    command: "concept hog",
    check: (s) => s.conceptInspected.includes("hog"),
  },
  {
    id: "hog",
    label: "Compute a HOG descriptor",
    detail: "Run `hog` to build the oriented-gradient feature vector.",
    command: "hog",
    check: (s) => s.featuresExtracted && s.ops.some((o) => o.kind === "hog"),
  },
  {
    id: "gray",
    label: "Confirm grayscale path",
    detail: "HOG forces a single-channel working image — check `show tensor` after.",
    command: "show tensor",
    check: (s) => s.gray && s.featuresExtracted,
  },
];

const w7_2_steps: readonly GoalStep[] = [
  {
    id: "load",
    label: "Load a scene with repeats",
    detail: "`load faces` or `load shapes` so a template has somewhere to match.",
    command: "load faces",
    check: (s) => s.ops.some((o) => o.kind === "load"),
  },
  {
    id: "template",
    label: "Run template matching",
    detail: "`template` slides a patch and reports the best correlation peaks.",
    command: "template",
    check: (s) => s.featuresExtracted && s.detections.length > 0,
  },
  {
    id: "inspect",
    label: "Inspect detections",
    detail: "Note the score on each box — correlation confidence is not a calibrated probability.",
    command: "show image",
    check: (s) => s.detections.length > 0 && s.commandCount > 0,
  },
];

const w7_3_steps: readonly GoalStep[] = [
  {
    id: "harris",
    label: "Seed with corners",
    detail: "`harris` or `orb` to get interest points before matching.",
    command: "harris",
    check: (s) => s.featuresExtracted,
  },
  {
    id: "match",
    label: "Match across views",
    detail: "`match` builds correspondences and a robust homography — the classical 'recognition' backbone.",
    command: "match",
    check: (s) => s.featuresExtracted && s.warped,
  },
  {
    id: "concept",
    label: "Think like a classical pipeline",
    detail: "Re-read `concept features` / `concept hog` and picture a sliding-window + linear SVM detector.",
    command: "concept hog",
    check: (s) => s.conceptInspected.includes("hog") || s.conceptInspected.includes("features"),
  },
];

export const WORLD7_LEVELS: readonly Level[] = [
  {
    id: "7.1",
    world: "w7",
    worldTitle: WORLD_TITLE,
    title: "HOG features",
    concept: {
      title: "HOG + classical detectors",
      body:
        "Histogram of Oriented Gradients splits the image into cells, accumulates gradient orientations " +
        "weighted by magnitude, and normalizes blocks to resist lighting changes. The resulting vector is a " +
        "strong appearance descriptor that powered pedestrian detection (Dalal & Triggs) and classic face " +
        "detectors. Feed HOG into a linear SVM and you have a sliding-window detector — the pre-CNN default.",
      whatHappens:
        "`hog` computes gradient orientation histograms cell-by-cell, normalizes local blocks, and flags " +
        "featuresExtracted (plus gray, because HOG runs on intensity).",
      why:
        "HOG makes pose and shape explicit. Even after CNNs, understanding HOG teaches why orientation " +
        "histograms and local normalization are powerful.",
      formula: "cell histogram bins = weighted vote of atan2(Iy, Ix)",
      callout: "scikit-image `feature.hog`; OpenCV `HOGDescriptor`; classic companion to `sklearn.svm.LinearSVC`.",
    },
    goal: "Compute a HOG descriptor and notice it forces grayscale.",
    hints: [
      "`concept hog` first.",
      "`hog` builds the orientation histogram feature.",
      "`show tensor` confirms the single-channel path.",
    ],
    learning: [
      "HOG is a local gradient orientation histogram",
      "Block normalization stabilizes lighting",
      "HOG + linear SVM was the classical detection stack",
    ],
    steps: w7_1_steps,
    seedImage: "faces",
    win: winFromSteps(w7_1_steps, "Classical appearance features are in your hands."),
  },
  {
    id: "7.2",
    world: "w7",
    worldTitle: WORLD_TITLE,
    title: "Template matching",
    concept: {
      title: "Slide, correlate, peak-pick",
      body:
        "Template matching slides a small patch across every position and scores similarity (SSD, " +
        "cross-correlation, or normalized correlation). Peaks in the score map are candidate locations. " +
        "It is exact and interpretable but brittle: scale, rotation, and lighting break it. Still perfect for " +
        "fixed-camera UI inspection, logo locations, and any task where appearance is nearly constant.",
      whatHappens:
        "`template` searches for the patch, writes detections with correlation-style scores and keypoints " +
        "at match centers (featuresExtracted=true, detections.length > 0).",
      why:
        "Sometimes you do not need a detector — you need one exact pattern. Know when correlation is enough.",
      formula: "R(x,y) = Σ (I(x+i,y+j) − T(i,j))²   (SSD; lower is better)",
      callout: "OpenCV `matchTemplate`; scikit-image `feature.match_template`; often used before classical OCR/QR pipelines.",
    },
    goal: "Load a scene and run template matching to get detections.",
    hints: [
      "`load faces` or `load shapes` first.",
      "`template` slides a patch and peaks at matches.",
      "Scores are similarity, not calibrated confidence.",
    ],
    learning: [
      "Template matching is exhaustive patch search",
      "It fails under scale/rotation/light changes",
      "Score maps are interpretable and cheap",
    ],
    steps: w7_2_steps,
    seedImage: "faces",
    win: winFromSteps(w7_2_steps, "Correlation matching demystified."),
  },
  {
    id: "7.3",
    world: "w7",
    worldTitle: WORLD_TITLE,
    title: "Classical matching pipeline",
    concept: {
      title: "Detect → describe → match → verify",
      body:
        "A classical recognition pipeline has a fixed recipe: (1) detect interest points, (2) describe them, " +
        "(3) match descriptors across images, (4) robustly estimate geometry (RANSAC) or vote in a feature " +
        "space (bag-of-words + SVM). That recipe — not end-to-end learning — built panorama apps, visual SLAM, " +
        "and object recognition systems through the 2000s. Knowing it explains what CNNs replaced and which " +
        "invariances they still lack by default.",
      whatHappens:
        "`harris` or `orb` extracts points and descriptors. `match` verifies them with RANSAC and produces a " +
        "homography. Re-reading `concept features` / `concept hog` frames the full classical stack.",
      why:
        "When data is tiny or you need geometric guarantees, classical pipelines still win. They are also the " +
        "mental model behind keypoint layers and retrieval systems.",
      formula: "matches = {(i,j) : d(desc_i, desc_j) < τ},  H = RANSAC(matches)",
      callout: "OpenCV features2d + calib3d; scikit-image `feature` + `transform`; scikit-learn SVMs on HOG/bow histograms.",
    },
    goal: "Extract features, match them with geometry verification, and study the classical recipe.",
    hints: [
      "`harris` or `orb` first.",
      "`match` for correspondence + RANSAC.",
      "`concept hog` / `concept features` to seal the story.",
    ],
    learning: [
      "Classical recognition is a fixed detect-describe-match-verify loop",
      "RANSAC gives geometric robustness",
      "CNNs replaced handcrafted descriptors but not the need for invariance",
    ],
    steps: w7_3_steps,
    seedImage: "shapes",
    win: winFromSteps(w7_3_steps, "You can run a full classical recognition pipeline."),
  },
];
