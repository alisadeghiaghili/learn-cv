# LearnCV

An interactive **Computer Vision** sandbox, concept lab, and leveled tutorial.

**Live:** https://alisadeghiaghili.github.io/learn-cv/

Pixels are the start, not the finish. LearnCV teaches CV from image tensors upward —
color, convolution, edges, morphology, geometry, features, CNNs, detection,
segmentation, augmentation, and production — while mapping every idea to the
packages you actually use: OpenCV, scikit-image, Pillow, torchvision, albumentations,
ultralytics, mediapipe, and more.

## Features

- **Concept briefs** from the ground up (shape, dtype, kernels, IoU, mAP, …)
- **Live image stage** — procedural images, kernel sweep, edge overlays, boxes/masks
- **Levels** across 12 worlds: Pixels → Production
- **Terminal** simulating CV calls (`cv.blur`, `cv.canny`, `detect.yolo`, …)
- **Package map** — what to reach for in NumPy / OpenCV / skimage / PyTorch / HF
- **Goal panel** with live checks, hints, learning outcomes, par command golf
- Progress saved in `localStorage`

## Quick start

```bash
npm install
npm run dev
```

GitHub Pages deploys automatically from `main` via `.github/workflows/deploy-pages.yml`.

Production build:

```bash
npm run build
npm test
```

## Useful commands inside the app

```
help
levels
hint
show goal
load shapes
show image
show tensor
cv.cvtColor gray
cv.blur 5
cv.sobel
cv.canny 50 150
cv.threshold otsu
cv.erode 3
resize 256 256
detect.harris
detect.orb
detect.yolo
segment.unet
packages opencv
concept convolution
```

Share links: open with `?NODEMO` to skip the welcome dialog.

## Project layout

```
src/engine/   # image tensors, ops, session, commands
src/content/  # concepts, packages, curriculum notes
src/levels/   # level definitions (start state, goal, solution)
src/ui/       # stage, terminal, dialogs, app shell
tests/        # vitest coverage for engine + levels
```

## Notes

This is a **teaching simulator**, not a real OpenCV/PyTorch runtime. Image ops are
deterministic educational approximations. For production APIs, see the package
docs linked inside the app (`packages <name>`).

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

Independent teaching project. Not affiliated with OpenCV, PyTorch, or any package maintainers.
