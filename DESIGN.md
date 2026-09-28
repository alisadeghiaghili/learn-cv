# LearnCV — Design Spec

Interactive Computer Vision sandbox + tutorial: image stage, terminal, goal-driven levels.
Cover concepts from pixels upward and the packages practitioners actually ship with.

## Style anchor

- **Product genre**: terminal-native lab instrument for computer vision.
- **Real-world feel**: laboratory instrument face + cool editorial notebook.
  Concept brief on paper above a dark lab stage. Not a SaaS marketing page.
- **Mode**: expressive educational UI (game chrome + technical density).

## Palette

| Token          | Hex       | Role                                   |
|----------------|-----------|----------------------------------------|
| `--void`       | `#0a1018` | App chrome / deep stage background     |
| `--surface`    | `#13202c` | Raised panels, toolbar, cards          |
| `--surface-2`  | `#1a2c3a` | Nested chips, hover fills              |
| `--paper`      | `#e6e9e4` | Concept brief paper                    |
| `--paper-2`    | `#d5dad3` | Paper secondary / tables               |
| `--ink`        | `#0f1518` | Text on paper                          |
| `--chalk`      | `#c5ced6` | Primary text on dark                   |
| `--chalk-dim`  | `#7d8b96` | Secondary text on dark                 |
| `--signal`     | `#f0b429` | Accent / active / brand spark          |
| `--signal-dim` | `#8a6a1c` | Muted accent                           |
| `--alarm`      | `#e23d51` | Errors / hard fail                     |
| `--calm`       | `#2a9d8f` | Success / solved                       |
| `--class0`     | `#5b8def` | Class / channel blue                   |
| `--class1`     | `#f0b429` | Class / channel amber                  |
| `--class2`     | `#9b7ede` | Class / channel violet                 |

## Typography

| Role    | Stack                                                            | Usage                         |
|---------|------------------------------------------------------------------|-------------------------------|
| Display | `Newsreader, Iowan Old Style, Palatino Linotype, serif`          | Brand, world titles           |
| UI      | `IBM Plex Sans, Segoe UI, system-ui, sans-serif`                 | Dialogs, labels, body         |
| Mono    | `IBM Plex Mono, Cascadia Code, Consolas, monospace`              | Terminal, paths, tensors      |

- Title scale: 20–22px / 600; body 14–15px; mono 13–14px.
- Display personality comes from **density + mono data**, not decorative webfonts.

## Layout system

```
┌──────────────────────────────────────────────────────────────┐
│ chrome: brand · levels · sandbox · help · progress           │
├────────┬─────────────────────────────────────────────────────┤
│ rail   │ CONCEPT BRIEF (paper)                               │
│ levels │   title · body · why · formula · package callout    │
│        ├─────────────────────────────────────────────────────┤
│        │ STAGE                                               │
│        │  [image canvas]  |  [inspector / metrics / code]    │
├────────┴─────────────────────────────────────────────────────┤
│ dock: terminal · active package line · goal checklist        │
└──────────────────────────────────────────────────────────────┘
```

- Paper brief above dark stage — hard split, cool sage paper.
- Rail: worlds + levels, solved marks, par command counts.
- Stage: procedural image + live op result on canvas.
- Responsive: stack under ~900px; terminal always last.

## Signature moment

**Kernel sweep on the live image.** When a filter runs:
1. Source image freezes as a ghost tile.
2. A kernel matrix chip lights row-by-row while the result canvas rebuilds.
3. Edge/gradient maps can overlay as a second channel with a scrubber.
4. Package callout flips to the real API (`cv2.filter2D`, `skimage.filters`, `torchvision.transforms`).

That single motion teaches convolution better than a paragraph.

## What this is NOT

- Not a photo-sharing gallery or stock-image landing page.
- No purple AI gradient hero, no marketing home page as first screen.
- No claim that this runs real OpenCV/PyTorch — it is a teaching simulator.
- Never name third-party clone inspirations in product copy.

## Product surface

1. **Sandbox** — free CV pipeline: load procedural image, chain ops, inspect tensors.
2. **Levels** — worlds with start state, goal checks, hints, learning outcomes, par.
3. **Terminal** — simulated `cv.*` / `skimage.*` / `torchvision.*` style commands + meta.
4. **Concept briefs** — from pixels upward: tensors, color, convolution, features, geometry, CNNs, detection, segmentation.
5. **Package map** — the important libraries: NumPy, Pillow, OpenCV, scikit-image, matplotlib, torchvision, albumentations, ultralytics, mediapipe, transformers, onnxruntime, supervision.
6. **Persistence** — solved levels + best command counts in `localStorage`.

## Curriculum (v1)

| World | Theme | Teaches |
|-------|-------|---------|
| W1 | Pixels are tensors | shape, dtype, channels, color spaces, histograms, dtype ranges |
| W2 | Convolution is structure | kernels, blur, sharpen, emboss, separable filters |
| W3 | Edges and gradients | Sobel, Laplacian, Canny stages, magnitude/orientation |
| W4 | Threshold & morphology | binary threshold, Otsu, erosion/dilation, open/close, connected components |
| W5 | Geometry | resize, rotate, affine, perspective, warp, zoom, flip |
| W6 | Features & matching | Harris, FAST, ORB, descriptors, homography, panorama |
| W7 | Classical recognition | HOG, template match, bag of words, SVM on features |
| W8 | CNNs & transfer | conv layers, pooling, receptive field, ResNet, fine-tune |
| W9 | Detection | IoU, NMS, anchors, YOLO/SSD/Faster R-CNN, mAP |
| W10 | Segmentation | threshold → U-Net → Mask R-CNN, semantic vs instance |
| W11 | Augmentation & pipelines | albumentations, transforms, domain shift, leakage |
| W12 | Production | video, tracking, ONNX export, latency, mediapipe, monitoring |

Each level: concept brief, goal steps, hints, package notes, solution trail, par.

## Engine model (simplified but honest)

- `ImageTensor`: width, height, channels, float32/uint8 grid (procedural + synthetic).
- Ops are pure functions: `convolve`, `threshold`, `morph`, `resize`, `warp`, `histogram`, `detect`.
- Detection objects: boxes + scores + labels; segmentation: label masks.
- Package catalog maps each op to real APIs (OpenCV / skimage / torchvision / …).
- Goal checks compare a **projection** of state (image stats, op chain, detections, metrics).

## Engineering conventions

- TypeScript strict, English identifiers.
- Vitest for engine + level goal tests.
- No AI footprint in git history when committing.
- Files/docs in English; product voice is direct and technical.

## Future (out of v1)

- Real WASM OpenCV binding
- Multilingual full i18n packs
- Video timeline scrubber for tracking levels
