/**
 * Command interpreter for the LearnCV terminal.
 * Simulates CV library calls + meta commands. Not a real shell.
 */

import { findConcept, formatConcept } from "../content/concepts";
import { categoryLabel, findPackage, PACKAGES } from "../content/packages";
import type { Session } from "./session";
import type { CommandResult, ImageId, Level } from "./types";

export interface CommandContext {
  readonly session: Session;
  readonly level: Level | null;
  readonly sandbox: boolean;
  readonly onHelp?: () => void;
  readonly onLevels?: () => void;
  readonly onHint?: () => void;
  readonly onShowGoal?: () => void;
  readonly onSolution?: () => void;
  readonly onReset?: () => void;
  readonly onSandbox?: () => void;
  readonly onShare?: () => void;
}

function ok(session: Session, lines: string[]): CommandResult {
  session.bumpCommand();
  return { ok: true, lines, state: session.snapshot() };
}

function fail(session: Session, lines: string[]): CommandResult {
  session.bumpCommand();
  session.setError(lines[0] ?? "error");
  return { ok: false, lines, state: session.snapshot() };
}

function parseNum(tok: string | undefined, fallback: number): number {
  if (tok === undefined) return fallback;
  const n = Number(tok);
  return Number.isFinite(n) ? n : fallback;
}

const IMAGE_IDS = new Set<ImageId>([
  "shapes",
  "noise",
  "gradient",
  "checker",
  "text",
  "coins",
  "street",
  "faces",
  "empty",
]);

/**
 * Dispatch one terminal line.
 *
 * Args:
 *   raw: user input
 *   ctx: session + level + UI callbacks
 * Returns:
 *   CommandResult with lines and new snapshot
 */
export function dispatch(raw: string, ctx: CommandContext): CommandResult {
  const session = ctx.session;
  session.ensureLoaded();
  const line = raw.trim();
  if (!line) return ok(session, []);
  const parts = line.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  // —— meta ——
  if (cmd === "help" || cmd === "?") {
    return ok(session, helpLines());
  }
  if (cmd === "levels") {
    ctx.onLevels?.();
    return ok(session, ["Opening level browser…"]);
  }
  if (cmd === "hint") {
    ctx.onHint?.();
    return ok(session, ["Hint requested."]);
  }
  if (cmd === "goal" || (cmd === "show" && args[0] === "goal")) {
    ctx.onShowGoal?.();
    return ok(session, ["Goal panel refreshed."]);
  }
  if (cmd === "solution" || (cmd === "show" && args[0] === "solution")) {
    ctx.onSolution?.();
    return ok(session, ["Solution trail shown in goal panel."]);
  }
  if (cmd === "reset") {
    ctx.onReset?.();
    return ok(session, ["Session reset."]);
  }
  if (cmd === "sandbox") {
    ctx.onSandbox?.();
    return ok(session, ["Sandbox mode."]);
  }
  if (cmd === "share") {
    ctx.onShare?.();
    return ok(session, ["Share link ready."]);
  }
  if (cmd === "packages" || cmd === "package") {
    if (args.length) {
      const p = findPackage(args.join(" "));
      if (p) session.inspectPackage(p.id);
    } else {
      for (const p of PACKAGES) session.inspectPackage(p.id);
    }
    return ok(session, packageLines(args));
  }
  if (cmd === "concept" || cmd === "concepts") {
    return conceptLines(session, args);
  }
  if (cmd === "load") {
    const id = (args[0] ?? "shapes").toLowerCase() as ImageId;
    if (!IMAGE_IDS.has(id)) {
      return fail(session, [
        `Unknown image '${args[0]}'. Try: shapes, coins, street, faces, gradient, noise, checker, text, empty`,
      ]);
    }
    session.load(id);
    return ok(session, [
      `Loaded ${id} · ${session.currentImage?.width}x${session.currentImage?.height}x${session.currentImage?.channels}`,
    ]);
  }

  if (cmd === "show" || cmd === "img" || cmd === "image") {
    const what = (args[0] ?? "image").toLowerCase();
    if (what === "image" || what === "img") {
      return ok(session, ["Stage updated to current image."]);
    }
    if (what === "tensor" || what === "shape") {
      const img = session.currentImage;
      if (!img) return fail(session, ["No image."]);
      return ok(session, [
        `shape=(${img.height}, ${img.width}, ${img.channels}) dtype=${img.dtype}`,
        `id=${img.id}`,
      ]);
    }
    if (what === "hist" || what === "histogram") {
      const h = session.getHistogram();
      if (!h) return fail(session, ["No image."]);
      const top = [...h.bins].sort((a, b) => b - a).slice(0, 5);
      return ok(session, [
        `histogram channel=${h.channel} bins=${h.binCount}`,
        `max bins ≈ ${top.join(", ")}`,
      ]);
    }
    if (what === "ops" || what === "pipeline") {
      const snap = session.snapshot();
      return ok(
        session,
        snap.ops.map((o, i) => `${i + 1}. ${o.label}  ·  ${o.packageRef}`),
      );
    }
    return fail(session, [`show what? image | tensor | histogram | ops`]);
  }

  // —— load aliases ——
  if (cmd === "cv.imread" || cmd === "imread") {
    const id = (args[0] ?? "shapes").toLowerCase() as ImageId;
    if (!IMAGE_IDS.has(id)) return fail(session, [`imread: unknown '${args[0]}'`]);
    session.load(id);
    return ok(session, [`cv.imread('${id}') → array`]);
  }

  // —— color ——
  if (cmd === "cvtcolor" || cmd === "cv.cvtcolor" || cmd === "cvtColor") {
    const space = (args[0] ?? "gray").toLowerCase();
    if (space === "gray" || space === "rgb" || space === "hsv") {
      const r = session.applyCvtColor(space);
      return ok(session, [
        `cvtColor → ${space}`,
        r.side ? `HSV preview ready (H/S/V channels)` : `channels=${r.image.channels}`,
      ]);
    }
    return fail(session, ["cvtColor gray | rgb | hsv"]);
  }

  // —— blur ——
  if (cmd === "blur" || cmd === "cv.blur" || cmd === "gaussianblur" || cmd === "cv.gaussianblur") {
    const kind = cmd.includes("gaussian") ? "gaussian" : ((args[0] ?? "gaussian").toLowerCase() as "box" | "gaussian" | "median");
    const radius = parseNum(cmd.includes("gaussian") ? args[0] : args[1], 1);
    session.applyBlur(kind, radius);
    return ok(session, [`${kind} blur radius=${radius}`]);
  }
  if (cmd === "medianblur" || cmd === "cv.medianblur") {
    session.applyBlur("median", parseNum(args[0], 1));
    return ok(session, ["median blur applied"]);
  }
  if (cmd === "sharpen" || cmd === "cv.sharpen") {
    session.applySharpen();
    return ok(session, ["sharpen applied"]);
  }
  if (cmd === "emboss" || cmd === "cv.emboss") {
    session.applyEmboss();
    return ok(session, ["emboss applied"]);
  }

  // —— edges ——
  if (cmd === "sobel" || cmd === "cv.sobel" || cmd === "laplacian" || cmd === "cv.laplacian" || cmd === "canny" || cmd === "cv.canny") {
    const mode = cmd.includes("canny") ? "canny" : cmd.includes("laplacian") ? "laplacian" : "sobel";
    session.applyEdges(mode);
    return ok(session, [`${mode} edge map on stage`]);
  }

  // —— threshold / morph ——
  if (cmd === "threshold" || cmd === "cv.threshold") {
    const modeArg = (args[0] ?? "binary").toLowerCase();
    const mode = modeArg === "otsu" || modeArg === "adaptive" ? modeArg : "binary";
    const level = parseNum(mode === "binary" ? args[0] : args[1], 0.5);
    const t = session.applyThreshold(level, mode);
    return ok(session, [`threshold (${mode}) t=${t.toFixed(3)}`, "binary mask on stage"]);
  }
  if (cmd === "erode" || cmd === "dilate" || cmd === "open" || cmd === "close" || cmd === "morphologyex" || cmd === "cv.morphologyex") {
    let mode: "erode" | "dilate" | "open" | "close" = "erode";
    if (cmd === "dilate") mode = "dilate";
    if (cmd === "open") mode = "open";
    if (cmd === "close") mode = "close";
    if (cmd === "morphologyex") {
      mode = (args[0] ?? "open") as typeof mode;
    }
    const radius = parseNum(args[cmd === "morphologyex" ? 1 : 0], 1);
    session.applyMorph(mode, radius);
    return ok(session, [`morphology ${mode} radius=${radius}`]);
  }

  // —— geometry ——
  if (cmd === "resize" || cmd === "cv.resize") {
    const w = parseNum(args[0], 128);
    const h = parseNum(args[1], 128);
    session.applyResize(w, h);
    return ok(session, [`resize → ${w}x${h}`]);
  }
  if (cmd === "crop" || cmd === "cv.crop") {
    const x = parseNum(args[0], 16);
    const y = parseNum(args[1], 16);
    const w = parseNum(args[2], 128);
    const h = parseNum(args[3], 128);
    session.applyCrop(x, y, w, h);
    return ok(session, [`crop (${x},${y}) ${w}x${h}`]);
  }
  if (cmd === "flip" || cmd === "hflip" || cmd === "vflip") {
    const axis = cmd === "vflip" || args[0] === "v" ? "v" : "h";
    session.applyFlip(axis);
    return ok(session, [`flip ${axis}`]);
  }
  if (cmd === "rotate" || cmd === "cv.rotate") {
    session.applyRotate(parseNum(args[0], 90));
    return ok(session, [`rotate ${args[0] ?? 90}°`]);
  }
  if (cmd === "warp" || cmd === "warpperspective" || cmd === "cv.warpperspective") {
    session.applyWarp(parseNum(args[0], 0.15));
    return ok(session, ["perspective warp applied"]);
  }

  // —— hist ops ——
  if (cmd === "equalize" || cmd === "cv.equalizehist" || cmd === "clahe") {
    session.applyEqualize();
    return ok(session, ["histogram equalization applied"]);
  }

  // —— augment ——
  if (cmd === "brightness" || cmd === "aug.brightness") {
    session.applyBrightness(parseNum(args[0], 0.1));
    return ok(session, ["brightness adjusted"]);
  }
  if (cmd === "contrast" || cmd === "aug.contrast") {
    session.applyContrast(parseNum(args[0], 1.2));
    return ok(session, ["contrast adjusted"]);
  }
  if (cmd === "noise" || cmd === "aug.noise") {
    session.applyNoise(parseNum(args[0], 0.08), parseNum(args[1], 7));
    return ok(session, ["noise added"]);
  }
  if (cmd === "albu" || cmd === "augment" || cmd === "albumentations") {
    session.runAugment();
    return ok(session, ["albumentations.Compose applied (label-aware)"]);
  }

  // —— features ——
  if (cmd === "harris" || cmd === "detect.harris" || cmd === "goodfeaturestotrack") {
    session.extractHarris();
    return ok(session, ["Harris corners extracted — see keypoints on stage"]);
  }
  if (cmd === "orb" || cmd === "detect.orb") {
    session.extractOrb();
    return ok(session, ["ORB keypoints extracted"]);
  }
  if (cmd === "hog" || cmd === "detect.hog") {
    session.extractHog();
    return ok(session, ["HOG descriptor computed (gradient orientation histogram)"]);
  }
  if (cmd === "template" || cmd === "matchtemplate" || cmd === "detect.template") {
    session.runTemplateMatch();
    return ok(session, ["template matching complete"]);
  }
  if (cmd === "match" || cmd === "detect.match") {
    session.runMatch();
    return ok(session, ["feature matching + RANSAC homography"]);
  }
  if (cmd === "panorama" || cmd === "detect.panorama") {
    session.runPanorama();
    return ok(session, ["panorama stitch simulated"]);
  }

  // —— deep ——
  if (cmd === "cnn" || cmd === "detect.cnn" || cmd === "train" || cmd === "finetune") {
    const transfer = args.some((a) => a === "transfer" || a === "resnet" || a === "pretrained");
    session.buildCnn(transfer);
    return ok(session, [
      transfer ? "Transfer learning: frozen backbone + linear head" : "Tiny CNN built (conv → pool → dense)",
      "torchvision mental model",
    ]);
  }

  if (cmd === "yolo" || cmd === "detect.yolo") {
    session.runDetector("yolo", args.includes("mask") || args.includes("seg"));
    return ok(session, ["YOLO detections on stage", "ultralytics + supervision annotators"]);
  }
  if (cmd === "ssd" || cmd === "detect.ssd") {
    session.runDetector("ssd");
    return ok(session, ["SSD detections on stage"]);
  }
  if (cmd === "fastrcnn" || cmd === "detect.fastrcnn" || cmd === "faster-rcnn" || cmd === "detect.fasterrcnn") {
    session.runDetector("fastrcnn");
    return ok(session, ["Faster R-CNN detections on stage"]);
  }
  if (cmd === "unet" || cmd === "segment.unet") {
    session.runSegment("unet");
    return ok(session, ["U-Net semantic mask on stage"]);
  }
  if (cmd === "maskrcnn" || cmd === "segment.maskrcnn") {
    session.runSegment("maskrcnn");
    return ok(session, ["Mask R-CNN instance masks on stage"]);
  }

  // —— production ——
  if (cmd === "onnx" || cmd === "export" || cmd === "onnx.export") {
    session.exportOnnx();
    return ok(session, ["ONNX export recorded", "runtime: onnxruntime.InferenceSession"]);
  }
  if (cmd === "track" || cmd === "bytetrack") {
    session.runTrack();
    return ok(session, ["ByteTrack IDs assigned across frames"]);
  }
  if (cmd === "video") {
    session.loadVideo();
    return ok(session, ["video source loaded (simulated)"]);
  }
  if (cmd === "mediapipe" || cmd === "pose" || cmd === "hands" || cmd === "face_mesh") {
    session.runMediapipe();
    return ok(session, ["MediaPipe landmarks on stage"]);
  }

  // —— numpy-ish introspection ——
  if (cmd === "mean" || cmd === "std" || cmd === "stats") {
    const snap = session.snapshot();
    return ok(session, [`mean=${snap.mean.toFixed(4)} std=${snap.std.toFixed(4)}`]);
  }

  return fail(session, [
    `Unknown command: ${cmd}`,
    "Type `help` for the command list, `packages` for the library map.",
  ]);
}

function helpLines(): string[] {
  return [
    "LearnCV commands",
    "───────────────",
    "load <image>          shapes|coins|street|faces|gradient|noise|checker|text|empty",
    "show image|tensor|histogram|ops",
    "cvtColor gray|rgb|hsv",
    "blur|gaussianBlur|medianBlur [r]",
    "sharpen · emboss · sobel · laplacian · canny",
    "threshold [t]|otsu|adaptive · erode|dilate|open|close [r]",
    "resize w h · crop x y w h · flip · rotate deg · warp [s]",
    "equalize · brightness d · contrast f · noise a · albu",
    "harris · orb · hog · template · match · panorama",
    "cnn [transfer|resnet] · yolo · ssd · faster-rcnn · unet · maskrcnn",
    "onnx · track · video · mediapipe",
    "concept <id> · packages [name]",
    "levels · hint · show goal · solution · reset · sandbox · share · help",
  ];
}

function packageLines(args: string[]): string[] {
  if (args.length) {
    const p = findPackage(args.join(" "));
    if (!p) return [`Unknown package '${args.join(" ")}'`];
    return [
      `${p.name}  ·  ${categoryLabel(p.category)}`,
      p.oneLiner,
      "",
      `When · ${p.useWhen}`,
      `Install · ${p.install}`,
      `Key APIs · ${p.keyApis.join(", ")}`,
      `Worlds · ${p.worlds.join(", ")}`,
    ];
  }
  const byCat = new Map<string, string[]>();
  for (const p of PACKAGES) {
    const list = byCat.get(p.category) ?? [];
    list.push(p.name);
    byCat.set(p.category, list);
  }
  const lines = ["Package map", "───────────"];
  for (const [cat, names] of byCat) {
    lines.push(`${categoryLabel(cat as never)}: ${names.join(", ")}`);
  }
  lines.push("", "Details: packages <name>");
  return lines;
}

function conceptLines(session: Session, args: string[]): CommandResult {
  if (!args.length) {
    return ok(session, [
      "Concepts: pixels, channels, histogram, convolution, edges, threshold,",
      "          morphology, geometry, features, hog, cnn, detection,",
      "          segmentation, augmentation, production",
      "Usage: concept <id>",
    ]);
  }
  const c = findConcept(args.join(" "));
  if (!c) return fail(session, [`Unknown concept '${args.join(" ")}'`]);
  session.inspectConcept(c.id);
  return ok(session, formatConcept(c));
}
