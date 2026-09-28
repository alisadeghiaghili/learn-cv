import type { GoalStep, Level } from "../engine/types";
import { winFromSteps } from "./win";

export const WORLD_TITLE = "WORLD 8 · CNNS & TRANSFER";

const w8_1_steps: readonly GoalStep[] = [
  {
    id: "concept",
    label: "Read the CNN concept",
    detail: "Type `concept cnn` before building any architecture.",
    command: "concept cnn",
    check: (s) => s.conceptInspected.includes("cnn"),
  },
  {
    id: "cnn",
    label: "Build a tiny CNN",
    detail: "`cnn` constructs a small conv → pool → dense stack from scratch.",
    command: "cnn",
    check: (s) => s.cnnBuilt && !s.transferUsed,
  },
  {
    id: "inspect",
    label: "Inspect the training mental model",
    detail: "Re-run `show ops` and note the from-scratch toy CNN record.",
    command: "show ops",
    check: (s) => s.cnnBuilt && s.commandCount > 0,
  },
];

const w8_2_steps: readonly GoalStep[] = [
  {
    id: "transfer",
    label: "Build a transfer model",
    detail: "`cnn transfer` freezes a pretrained ResNet-style backbone and attaches a linear head.",
    command: "cnn transfer",
    check: (s) => s.transferUsed,
  },
  {
    id: "concept",
    label: "Why transfer works",
    detail: "Re-read `concept cnn` and connect early layers to Gabor-like filters.",
    command: "concept cnn",
    check: (s) => s.conceptInspected.includes("cnn"),
  },
  {
    id: "resize",
    label: "Match the input size",
    detail: "Pretrained nets expect fixed inputs — `resize 224 224` is the usual ImageNet shape.",
    command: "resize 224 224",
    check: (s) => s.resized,
  },
];

const w8_3_steps: readonly GoalStep[] = [
  {
    id: "tiny",
    label: "Start from scratch",
    detail: "Build the tiny CNN first so you see the data-hungry baseline.",
    command: "cnn",
    check: (s) => s.cnnBuilt,
  },
  {
    id: "transfer",
    label: "Switch to transfer",
    detail: "`cnn transfer` (or `finetune`) replaces the scratch stack with a pretrained backbone.",
    command: "cnn transfer",
    check: (s) => s.transferUsed,
  },
  {
    id: "compare",
    label: "Compare the two strategies",
    detail: "Notice which session flags flip and what `show ops` records for each path.",
    command: "show ops",
    check: (s) => s.transferUsed && s.commandCount > 0,
  },
];

export const WORLD8_LEVELS: readonly Level[] = [
  {
    id: "8.1",
    world: "w8",
    worldTitle: WORLD_TITLE,
    title: "Build a tiny CNN",
    concept: {
      title: "CNNs learn filters",
      body:
        "A convolutional network stacks learned filters with nonlinearities and pooling. Early layers learn " +
        "edge- and texture-like detectors; deeper layers combine them into parts and objects. Pooling (max/avg) " +
        "shrinks spatial size and adds a little translation tolerance. A dense head maps the final feature map " +
        "to class scores. Training is just gradient descent on a classification loss — the architecture is " +
        "still the same sliding-window convolution from World 2.",
      whatHappens:
        "`cnn` builds a toy conv → pool → dense model (cnnBuilt=true, transferUsed=false) so you can rehearse " +
        "the from-scratch path before touching pretrained weights.",
      why:
        "Before you fine-tune anything, you should know what is being optimized and which layers exist. " +
        "Scratch training is also the right call when your domain looks nothing like ImageNet and you have data.",
      formula: "y = softmax(W · pool(φ(k * x)) + b)",
      callout: "PyTorch `torch.nn` modules; torchvision reference models; timm / Hugging Face transformers for modern backbones.",
    },
    goal: "Build a from-scratch tiny CNN and inspect its pipeline record.",
    hints: [
      "`concept cnn` first.",
      "`cnn` without arguments builds the tiny stack.",
      "`show ops` lists what was constructed.",
    ],
    learning: [
      "CNNs are stacks of learned convolutions + pooling",
      "From-scratch training needs data and compute",
      "The operator is still convolution from World 2",
    ],
    steps: w8_1_steps,
    seedImage: "shapes",
    win: winFromSteps(w8_1_steps, "Tiny CNN assembled — deep learning started."),
  },
  {
    id: "8.2",
    world: "w8",
    worldTitle: WORLD_TITLE,
    title: "Transfer learning with ResNet",
    concept: {
      title: "Reuse the backbone, retrain the head",
      body:
        "A ResNet-50 pretrained on ImageNet already knows edges, textures, and object parts. Transfer learning " +
        "freezes those early layers and trains only a new classification head (or unfreezes the top blocks " +
        "for a light fine-tune). You get ImageNet-level feature quality with orders of magnitude less labeled " +
        "data. Always normalize and resize to the backbone's expected input (commonly 224×224).",
      whatHappens:
        "`cnn transfer` (aliases: `finetune`, `cnn resnet`) builds a frozen pretrained backbone + linear head " +
        "(transferUsed=true). `resize 224 224` aligns the tensor with typical ImageNet input geometry.",
      why:
        "Transfer is the default when you have <10k images per class. Training a deep net from scratch on a " +
        "small dataset almost always underperforms a fine-tuned foundation backbone.",
      formula: "features = backbone(x),  logits = W_head · features + b",
      callout: "torchvision `resnet50(weights=...)` / `models.*`; Hugging Face `transformers` for ViT/CLIP; `timm` for a model zoo.",
    },
    goal: "Run transfer learning and resize to the expected input size.",
    hints: [
      "`cnn transfer` or `finetune` enables the pretrained path.",
      "`resize 224 224` matches ImageNet geometry.",
      "transferUsed should flip true in the session.",
    ],
    learning: [
      "Frozen backbones provide reusable visual features",
      "Fine-tuning a head needs far less data",
      "Input size and normalization must match the pretraining recipe",
    ],
    steps: w8_2_steps,
    seedImage: "faces",
    win: winFromSteps(w8_2_steps, "Transfer learning is your default training move."),
  },
  {
    id: "8.3",
    world: "w8",
    worldTitle: WORLD_TITLE,
    title: "Scratch vs fine-tune",
    concept: {
      title: "When to freeze, when to train",
      body:
        "From-scratch models learn every filter yourself — flexible, data-hungry, slow to converge. Transfer " +
        "models start from a strong visual vocabulary and adapt the decision layer — fast, data-efficient, but " +
        "constrained by the pretraining domain. A practical rule: start with a frozen backbone, unfreeze the " +
        "last residual block if the domain is strange, and only train from scratch when you have both lots of " +
        "data and a visual domain far from natural photos.",
      whatHappens:
        "You first build the tiny CNN (`cnn`), then switch to transfer (`cnn transfer` / `finetune`). " +
        "`show ops` records both attempts so you can contrast the strategies.",
      why:
        "Choosing the training strategy is an engineering decision. Documenting which path you took — and why — " +
        "is part of shipping a model, not an optional footnote.",
      formula: "θ* = argmin L(f(x; θ_backbone, θ_head), y),  with θ_backbone often frozen",
      callout: "PyTorch Lightning / torchvision training references; timm; Hugging Face `Trainer` for transformer backbones.",
    },
    goal: "Build both a scratch CNN and a transfer model, then compare.",
    hints: [
      "`cnn` for the tiny baseline.",
      "`cnn transfer` for the ResNet-style path.",
      "`show ops` to compare the two records.",
    ],
    learning: [
      "Scratch = flexible and data-hungry",
      "Transfer = efficient and domain-biased",
      "Strategy choice is part of the model spec",
    ],
    steps: w8_3_steps,
    seedImage: "shapes",
    win: winFromSteps(w8_3_steps, "You can choose a training strategy on purpose."),
  },
];
