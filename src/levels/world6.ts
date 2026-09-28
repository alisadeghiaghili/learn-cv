import type { GoalStep, Level } from "../engine/types";
import { winFromSteps } from "./win";

export const WORLD_TITLE = "WORLD 6 · FEATURES & MATCHING";

const w6_1_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the features concept",
    detail: "Type `concept features` — repeatability is the whole game.",
    command: "concept features",
    check: (s) => s.conceptInspected.includes("features"),
  },
  {
    id: "gray",
    label: "Grayscale for corners",
    detail: "Corner response is intensity-based: `cvtColor gray`.",
    command: "cvtColor gray",
    check: (s) => s.gray,
  },
  {
    id: "harris",
    label: "Extract Harris corners",
    detail: "Run `harris` to mark high cornerness points on the stage.",
    command: "harris",
    check: (s) => s.featuresExtracted && s.keypoints.length > 0,
  },
];

const w6_2_steps: readonly GoalStep[] = [
  {
    id: "orb",
    label: "Extract ORB keypoints",
    detail: "`orb` gives oriented binary descriptors — fast to match and robust to rotation.",
    command: "orb",
    check: (s) => s.featuresExtracted && s.keypoints.length > 0,
  },
  {
    id: "compare",
    label: "Compare with Harris",
    detail: "Run `harris` as well and note how the keypoint set differs.",
    command: "harris",
    check: (s) => s.featuresExtracted && s.commandCount > 0,
  },
  {
    id: "concept",
    label: "Revisit descriptors",
    detail: "Re-read `concept features` and note why binary descriptors were a breakthrough.",
    command: "concept features",
    check: (s) => s.conceptInspected.includes("features"),
  },
];

const w6_3_steps: readonly GoalStep[] = [
  {
    id: "match",
    label: "Match and fit a homography",
    detail: "`match` runs feature matching + RANSAC homography between views.",
    command: "match",
    check: (s) => s.featuresExtracted && s.warped,
  },
  {
    id: "panorama",
    label: "Stitch a panorama",
    detail: "Finish with `panorama` to compose two views into one wide frame.",
    command: "panorama",
    check: (s) => s.ops.some((o) => o.kind === "panorama"),
  },
  {
    id: "concept",
    label: "Connect to geometry",
    detail: "The fitted H is the same projective transform from World 5.",
    command: "concept geometry",
    check: (s) => s.conceptInspected.includes("geometry") || s.conceptInspected.includes("features"),
  },
];

export const WORLD6_LEVELS: readonly Level[] = [
  {
    id: "6.1",
    world: "w6",
    worldTitle: WORLD_TITLE,
    title: "Harris corners",
    concept: {
      title: "Features must be repeatable",
      body:
        "A good feature is a point you can find again after the camera moves, the light changes, or the image " +
        "is resized. Harris measures local structure with a 2×2 gradient covariance matrix M. Where both " +
        "eigenvalues are large you have a corner (strong change in every direction). Edges have one large " +
        "eigenvalue; flat regions have none. Corners are the classic interest points for matching and tracking.",
      whatHappens:
        "`cvtColor gray` prepares intensity. `harris` computes the cornerness response, keeps local maxima, " +
        "and writes keypoints onto the stage (featuresExtracted=true, keypoints.length > 0).",
      why:
        "Detection, stitching, and SLAM start from repeatable points. If your keypoints move when they should " +
        "not, everything downstream drifts.",
      formula: "M = Σ_w [Ix², IxIy; IxIy, Iy²],  R = det(M) − k (trace(M))²",
      callout: "OpenCV `cornerHarris` / `goodFeaturesToTrack`; scikit-image `feature.corner_harris`; scipy for eigen analysis of M.",
    },
    goal: "Convert to gray and extract Harris corners as keypoints.",
    hints: [
      "`concept features` explains repeatability.",
      "`cvtColor gray` then `harris`.",
      "Watch the stage — keypoints should light up on structure.",
    ],
    learning: [
      "Corners have large curvature in all directions",
      "Harris scores cornerness from the gradient covariance",
      "Repeatable keypoints are the foundation of matching",
    ],
    steps: w6_1_steps,
    seedImage: "shapes",
    win: winFromSteps(w6_1_steps, "Interest points detected — matching unlocked."),
  },
  {
    id: "6.2",
    world: "w6",
    worldTitle: WORLD_TITLE,
    title: "ORB keypoints and descriptors",
    concept: {
      title: "Binary descriptors changed the game",
      body:
        "Detecting points is only half the task — you also need a descriptor: a short vector that fingerprints " +
        "the local patch. ORB builds on FAST detection and BRIEF binary strings, adding orientation so matching " +
        "survives rotation. Binary descriptors are compared with Hamming distance (bit XOR + popcount), which " +
        "is dramatically faster than float L2 on CPUs and was a practical breakthrough for real-time matching.",
      whatHappens:
        "`orb` extracts oriented keypoints and attaches binary descriptors (featuresExtracted=true). " +
        "Comparing with `harris` shows detector choice changes which points you keep.",
      why:
        "Detector + descriptor is a pair. ORB is the default 'good enough and free' choice for classical " +
        "geometry pipelines.",
      formula: "d(a,b) = popcount(a ⊕ b)",
      callout: "OpenCV `ORB.create`, `BFMatcher(NORM_HAMMING)`; scikit-image `feature.BRIEF`; foundation of many pose/AR pipelines.",
    },
    goal: "Extract ORB keypoints and compare them to Harris corners.",
    hints: [
      "`orb` — oriented binary features.",
      "`harris` afterwards shows a different keypoint set.",
      "Descriptors matter as much as detection.",
    ],
    learning: [
      "Descriptors fingerprint local patches",
      "ORB = FAST + oriented BRIEF",
      "Hamming distance makes binary matching cheap",
    ],
    steps: w6_2_steps,
    seedImage: "shapes",
    win: winFromSteps(w6_2_steps, "You understand detector + descriptor pairs."),
  },
  {
    id: "6.3",
    world: "w6",
    worldTitle: WORLD_TITLE,
    title: "Matching, RANSAC, panorama",
    concept: {
      title: "From matches to a homography",
      body:
        "Putative feature matches contain outliers (repetitive texture, motion). RANSAC fits a model — here a " +
        "3×3 homography — by sampling minimal point sets, scoring inlier counts, and keeping the best consensus. " +
        "With a reliable H you can warp one view into the other's frame and blend them into a panorama. This " +
        "is pure geometry: no neural network required.",
      whatHappens:
        "`match` extracts features, matches them, and fits a RANSAC homography (featuresExtracted + warped). " +
        "`panorama` simulates stitching two views into one wide image.",
      why:
        "RANSAC is the standard robust estimator whenever your correspondences are dirty. Photogrammetry, " +
        "SLAM, and document scanning all run this loop.",
      formula: "find H maximizing |{i : ||H x_i − x'_i|| < ε}|",
      callout: "OpenCV `findHomography(RANSAC)`, `Stitcher`; scikit-image `transform.ProjectiveTransform` + `ransac`.",
    },
    goal: "Match features into a homography, then stitch a panorama.",
    hints: [
      "`match` runs matching + RANSAC.",
      "`panorama` composes two views.",
      "The fitted H is World 5's projective transform.",
    ],
    learning: [
      "RANSAC rejects outlier correspondences",
      "Homographies register two views",
      "Panorama stitching is feature matching in production form",
    ],
    steps: w6_3_steps,
    seedImage: "street",
    win: winFromSteps(w6_3_steps, "You can register views and stitch them."),
  },
];
