import { describe, expect, it } from "vitest";
import {
  histogram,
  makeImage,
  meanStd,
  toGray,
  toRgba8,
  harrisCorners,
  detectFakeObjects,
} from "../src/engine/image";
import {
  convolve,
  gaussianBlur,
  edges,
  threshold,
  morph,
  resize,
  flip,
  KERNELS,
} from "../src/engine/filters";
import { Session } from "../src/engine/session";
import { dispatch } from "../src/engine/commands";
import { PACKAGES, findPackage } from "../src/content/packages";
import { CONCEPTS, findConcept } from "../src/content/concepts";

function ctx(session: Session) {
  return {
    session,
    level: null,
    sandbox: true,
  };
}

describe("image tensors", () => {
  it("builds procedural images with stable shape", () => {
    const img = makeImage("shapes", 64, 48);
    expect(img.width).toBe(64);
    expect(img.height).toBe(48);
    expect(img.channels).toBe(3);
    expect(img.data.length).toBe(64 * 48 * 3);
  });

  it("converts to gray with luma weights", () => {
    const img = makeImage("gradient", 32, 32);
    const g = toGray(img);
    expect(g.channels).toBe(1);
    expect(g.data.length).toBe(32 * 32);
  });

  it("produces rgba for canvas", () => {
    const img = makeImage("coins", 16, 16);
    const rgba = toRgba8(img);
    expect(rgba.length).toBe(16 * 16 * 4);
  });

  it("computes mean and std", () => {
    const img = makeImage("shapes", 64, 64);
    const { mean, std } = meanStd(img);
    expect(mean).toBeGreaterThan(0);
    expect(std).toBeGreaterThan(0);
  });

  it("builds histogram bins", () => {
    const img = makeImage("shapes", 32, 32);
    const h = histogram(img);
    expect(h.binCount).toBe(32);
    expect(h.bins.reduce((a, b) => a + b, 0)).toBe(32 * 32);
  });

  it("detects corners on shapes", () => {
    const img = makeImage("shapes", 128, 128);
    const kps = harrisCorners(img, 10);
    expect(kps.length).toBeGreaterThan(0);
  });

  it("returns detections for known scenes", () => {
    const dets = detectFakeObjects("street", "yolo");
    expect(dets.length).toBeGreaterThan(0);
    expect(dets[0].score).toBeGreaterThan(0);
  });
});

describe("filters", () => {
  it("convolve keeps spatial size", () => {
    const img = makeImage("gradient", 32, 32);
    const out = convolve(img, KERNELS.gaussian);
    expect(out.width).toBe(32);
    expect(out.height).toBe(32);
    expect(out.channels).toBe(3);
  });

  it("gaussian blur reduces std of noise", () => {
    const img = makeImage("noise", 64, 64);
    const before = meanStd(img).std;
    const after = meanStd(gaussianBlur(img, 2)).std;
    expect(after).toBeLessThan(before);
  });

  it("edges produce single channel magnitude", () => {
    const img = makeImage("shapes", 64, 64);
    const e = edges(img, "sobel");
    expect(e.channels).toBe(1);
  });

  it("canny produces binary-ish map", () => {
    const img = makeImage("shapes", 64, 64);
    const e = edges(img, "canny");
    expect(e.channels).toBe(1);
  });

  it("otsu threshold splits image", () => {
    const img = makeImage("coins", 64, 64);
    const { image, usedThreshold } = threshold(img, 0.5, "otsu");
    expect(usedThreshold).toBeGreaterThan(0);
    expect(usedThreshold).toBeLessThan(1);
    expect(image.channels).toBe(1);
  });

  it("morphology runs on binary", () => {
    const img = makeImage("coins", 32, 32);
    const { image } = threshold(img, 0.5, "otsu");
    const m = morph(image, "open", 1);
    expect(m.channels).toBe(1);
  });

  it("resize changes dimensions", () => {
    const img = makeImage("shapes", 64, 64);
    const r = resize(img, 32, 16);
    expect(r.width).toBe(32);
    expect(r.height).toBe(16);
  });

  it("flip preserves size", () => {
    const img = makeImage("shapes", 32, 32);
    const f = flip(img, "h");
    expect(f.width).toBe(32);
  });
});

describe("session + commands", () => {
  it("loads and transforms", () => {
    const s = new Session();
    s.reset("shapes");
    const r = dispatch("load coins", ctx(s));
    expect(r.ok).toBe(true);
    expect(r.state.image?.id).toContain("coins");
  });

  it("tracks ops through blur and sobel", () => {
    const s = new Session();
    s.reset("shapes");
    dispatch("gaussianBlur 2", ctx(s));
    dispatch("sobel", ctx(s));
    const snap = s.snapshot();
    expect(snap.blurred).toBe(true);
    expect(snap.edgeMap).toBe("sobel");
    expect(snap.ops.length).toBeGreaterThan(2);
  });

  it("runs detector and records boxes", () => {
    const s = new Session();
    s.reset("street");
    const r = dispatch("yolo", ctx(s));
    expect(r.ok).toBe(true);
    expect(s.snapshot().detections.length).toBeGreaterThan(0);
    expect(s.snapshot().detector).toBe("yolo");
  });

  it("records package and concept inspection", () => {
    const s = new Session();
    s.reset("shapes");
    dispatch("packages opencv", ctx(s));
    dispatch("concept convolution", ctx(s));
    const snap = s.snapshot();
    expect(snap.packageInspected).toContain("opencv");
    expect(snap.conceptInspected).toContain("convolution");
  });

  it("fails unknown commands", () => {
    const s = new Session();
    s.reset("shapes");
    const r = dispatch("not_a_real_command", ctx(s));
    expect(r.ok).toBe(false);
    expect(r.lines[0]).toContain("Unknown");
  });

  it("threshold otsu sets thresholded flag", () => {
    const s = new Session();
    s.reset("coins");
    dispatch("threshold otsu", ctx(s));
    expect(s.snapshot().thresholded).toBe(true);
    expect(s.snapshot().gray).toBe(true);
  });

  it("cnn transfer sets flags", () => {
    const s = new Session();
    s.reset("faces");
    dispatch("cnn transfer", ctx(s));
    const snap = s.snapshot();
    expect(snap.cnnBuilt).toBe(true);
    expect(snap.transferUsed).toBe(true);
  });

  it("onnx export sets export flag", () => {
    const s = new Session();
    s.reset("shapes");
    dispatch("onnx", ctx(s));
    expect(s.snapshot().exportedOnnx).toBe(true);
  });
});

describe("content catalog", () => {
  it("has the core package set", () => {
    const ids = PACKAGES.map((p) => p.id);
    for (const id of ["numpy", "opencv", "skimage", "torchvision", "ultralytics", "albumentations", "mediapipe", "onnxruntime"]) {
      expect(ids).toContain(id);
    }
    expect(PACKAGES.length).toBeGreaterThanOrEqual(12);
  });

  it("finds packages by name", () => {
    expect(findPackage("opencv")?.name).toBe("OpenCV");
    expect(findPackage("ultralytics")?.id).toBe("ultralytics");
  });

  it("covers all 12 worlds in concepts", () => {
    const worlds = new Set(CONCEPTS.map((c) => c.world));
    for (let i = 1; i <= 12; i++) {
      expect(worlds.has(`w${i}`)).toBe(true);
    }
    expect(CONCEPTS.length).toBeGreaterThanOrEqual(15);
  });

  it("finds concepts by keyword", () => {
    expect(findConcept("convolution")?.id).toBe("convolution");
    expect(findConcept("iou")?.id).toBe("detection");
  });
});
