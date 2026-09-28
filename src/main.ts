/**
 * LearnCV shell: chrome, level rail, concept brief, stage, command dock.
 */

import "./styles/app.css";
import { Session } from "./engine/session";
import { dispatch, type CommandContext } from "./engine/commands";
import { ALL_LEVELS, findLevel } from "./levels";
import type { Level, SessionSnapshot } from "./engine/types";
import { drawStage, drawHistogram } from "./ui/charts";
import { TerminalView, type LogLine } from "./ui/terminal";
import { escapeHtml, renderMarkdown, showModal, showHelp } from "./ui/dialog";
import { launchConfetti, playFanfare } from "./ui/confetti";
import {
  buildShareTargets,
  shareWithClipboard,
  COFFEE_BUTTON_HTML,
  REPO_URL,
  LIVE_URL,
} from "./ui/share";
import {
  loadProgress,
  saveProgress,
  summarizeCurriculum,
  resumeLine,
  type LevelProgress,
} from "./ui/progress";
import { PACKAGES, categoryLabel, findPackage } from "./content/packages";
import { CONCEPTS } from "./content/concepts";

type Mode = "level" | "sandbox";

const CHEERS = [
  "Locked in. That concept is yours now.",
  "Clean win. The stage told the truth.",
  "Good — you reasoned from pixels, not cargo cult.",
  "Nice. That is production hygiene, not notebook luck.",
];

function nextLevel(id: string): Level | undefined {
  const idx = ALL_LEVELS.findIndex((l) => l.id === id);
  return idx >= 0 ? ALL_LEVELS[idx + 1] : undefined;
}

function solutionTrail(level: Level): string[] {
  return level.steps.map((s, i) => `${i + 1}. ${s.command ?? s.label}`);
}

export function mount(root: HTMLElement): void {
  const progress: Record<string, LevelProgress> = loadProgress();
  let mode: Mode = "level";
  let levelId = ALL_LEVELS[0]?.id ?? "sandbox";
  const session = new Session();
  session.reset("shapes");
  let winFeedback: string | null = null;
  let winOk = false;
  let celebratedFor = "";

  function currentLevel(): Level | null {
    return mode === "sandbox" ? null : (findLevel(levelId) ?? null);
  }

  function persistProgress(id: string, cmds: number): void {
    const prev = progress[id] ?? { solved: false };
    progress[id] = {
      solved: true,
      bestCommands:
        prev.bestCommands === undefined ? cmds : Math.min(prev.bestCommands, cmds),
      solvedAt: prev.solvedAt ?? new Date().toISOString(),
    };
    saveProgress(progress);
  }

  // —— DOM ——
  const elChrome = document.createElement("header");
  elChrome.className = "chrome";
  elChrome.innerHTML = `
    <div class="brand">
      <img class="brand-logo" src="logo.svg" alt="" width="28" height="28" />
      <div>Learn<span>CV</span></div>
      <div class="brand-sub">VISION LAB</div>
    </div>
    <nav class="chrome-nav">
      <button type="button" data-nav="levels" class="is-active">levels</button>
      <button type="button" data-nav="sandbox">sandbox</button>
      <button type="button" data-nav="packages">packages</button>
      <button type="button" data-nav="help">help</button>
    </nav>
    <div class="chrome-meta">pixels → production · ${summarizeCurriculum(progress, ALL_LEVELS.length)}</div>
  `;

  const elBody = document.createElement("div");
  elBody.className = "body";
  const elRail = document.createElement("aside");
  elRail.className = "rail";
  const elMain = document.createElement("div");
  elMain.className = "main";
  const elBrief = document.createElement("section");
  elBrief.className = "brief";
  const elStage = document.createElement("section");
  elStage.className = "stage";
  const elViz = document.createElement("div");
  elViz.className = "stage-viz";
  const canvasWrap = document.createElement("div");
  canvasWrap.className = "canvas-wrap";
  const canvasLabel = document.createElement("div");
  canvasLabel.className = "canvas-label";
  canvasLabel.textContent = "stage";
  const canvas = document.createElement("canvas");
  canvasWrap.append(canvasLabel, canvas);
  const pipeline = document.createElement("div");
  pipeline.className = "pipeline-strip";
  elViz.append(canvasWrap, pipeline);

  const elSide = document.createElement("div");
  elSide.className = "stage-side";
  elStage.append(elViz, elSide);
  elMain.append(elBrief, elStage);
  elBody.append(elRail, elMain);

  const elDock = document.createElement("footer");
  elDock.className = "dock";
  const termRoot = document.createElement("div");
  termRoot.className = "term-root";
  const elSk = document.createElement("div");
  elSk.className = "dock-side";
  elDock.append(termRoot, elSk);

  root.append(elChrome, elBody, elDock);

  const terminal = new TerminalView(termRoot, (cmd) => runCommand(cmd));

  function setPackageLine(text: string | null): void {
    elSk.innerHTML = `
      <div class="pkg-line"><span class="lbl">package · </span>${escapeHtml(text ?? "ready")}</div>
      <div class="hint-btns">
        <button type="button" class="btn" data-action="hint">hint</button>
        <button type="button" class="btn" data-action="goal">goal</button>
        <button type="button" class="btn" data-action="solution">solution</button>
        <button type="button" class="btn" data-action="reset">reset</button>
        <button type="button" class="btn primary" data-action="levels">levels</button>
      </div>
      <div class="pkg-line" data-role="learning"></div>
    `;
  }

  function pushLines(kind: LogLine["kind"], texts: readonly string[]): void {
    for (const text of texts) terminal.push(kind, text);
  }

  function renderRail(): void {
    elRail.replaceChildren();
    const worlds = new Map<string, Level[]>();
    for (const lv of ALL_LEVELS) {
      const list = worlds.get(lv.world) ?? [];
      list.push(lv);
      worlds.set(lv.world, list);
    }
    for (const [world, levels] of worlds) {
      const label = document.createElement("div");
      label.className = "rail-world";
      label.textContent = levels[0]?.worldTitle ?? world;
      elRail.append(label);
      for (const lv of levels) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "level-btn";
        if (lv.id === levelId && mode === "level") btn.classList.add("is-active");
        if (progress[lv.id]?.solved) btn.classList.add("is-solved");
        btn.innerHTML = `
          <span class="id">${escapeHtml(lv.id)}</span>
          <span class="title">${escapeHtml(lv.title)}</span>
          <span class="mark">${progress[lv.id]?.solved ? "✓" : resumeLine(progress, lv.id)}</span>
        `;
        btn.addEventListener("click", () => {
          mode = "level";
          levelId = lv.id;
          session.reset(lv.seedImage ?? "shapes");
          winFeedback = null;
          celebratedFor = "";
          renderAll();
          terminal.push("ok", `Level ${lv.id} · ${lv.title}`);
        });
        elRail.append(btn);
      }
    }
  }

  function renderBrief(): void {
    const lv = currentLevel();
    if (!lv) {
      elBrief.innerHTML = `
        <div class="brief-kicker">SANDBOX · FREE PRACTICE</div>
        <h2>Open image lab</h2>
        <p class="brief-body">
          Chain real CV commands against a live tensor. No goal, no timer.
          Type <span class="brief-formula">help</span> or <span class="brief-formula">packages opencv</span> to orient.
        </p>
        <div class="brief-row">
          <span class="brief-callout">OpenCV · scikit-image · torchvision · ultralytics · albumentations · mediapipe</span>
        </div>
      `;
      return;
    }
    const c = lv.concept;
    elBrief.innerHTML = `
      <div class="brief-kicker">${escapeHtml(lv.worldTitle)} · LEVEL ${escapeHtml(lv.id)}</div>
      <h2>${escapeHtml(lv.title)}</h2>
      <p class="brief-body">${escapeHtml(c.body)}</p>
      <div class="brief-row">
        <span><strong>What happens</strong> · ${escapeHtml(c.whatHappens)}</span>
        <span><strong>Why</strong> · ${escapeHtml(c.why)}</span>
      </div>
      <div class="brief-row">
        ${c.formula ? `<span class="brief-formula">${escapeHtml(c.formula)}</span>` : ""}
        ${c.callout ? `<span class="brief-callout">${escapeHtml(c.callout)}</span>` : ""}
      </div>
      <div class="brief-goal"><strong>Goal</strong> · ${escapeHtml(lv.goal)}</div>
    `;
  }

  function renderSide(snap: SessionSnapshot): void {
    const lv = currentLevel();
    const stepsHtml =
      lv?.steps
        .map((s) => {
          const done = s.check(snap);
          return `<li class="${done ? "is-done" : ""}"><span class="box"></span><span>${escapeHtml(s.label)}<span class="detail">${escapeHtml(s.detail)}</span></span></li>`;
        })
        .join("") ?? `<li><span class="box"></span><span>No goal — sandbox mode</span></li>`;

    const pkgActive = snap.ops.at(-1)?.packageRef ?? "numpy · OpenCV";
    const learn =
      lv?.learning.map((l) => `• ${escapeHtml(l)}`).join(" ") ?? "Free practice";

    elSide.innerHTML = `
      ${winOk && winFeedback ? `<div class="win-banner">Level complete<span class="cheer">${escapeHtml(winFeedback)}</span></div>` : ""}
      <div class="panel">
        <h3>Goal checklist</h3>
        <ul class="goal-list">${stepsHtml}</ul>
      </div>
      <div class="panel">
        <h3>Tensor / stats</h3>
        <div class="metric-grid">
          <div><span class="k">shape</span><span class="v">${snap.image ? `${snap.image.height}×${snap.image.width}×${snap.image.channels}` : "—"}</span></div>
          <div><span class="k">dtype</span><span class="v">${snap.image?.dtype ?? "—"}</span></div>
          <div><span class="k">mean</span><span class="v">${snap.mean.toFixed(3)}</span></div>
          <div><span class="k">std</span><span class="v">${snap.std.toFixed(3)}</span></div>
          <div><span class="k">detections</span><span class="v">${snap.detections.length}</span></div>
          <div><span class="k">keypoints</span><span class="v">${snap.keypoints.length}</span></div>
        </div>
      </div>
      <div class="panel">
        <h3>Package map</h3>
        <div class="pkg-row">
          ${PACKAGES.map(
            (p) =>
              `<button type="button" class="pkg-chip" data-pkg="${escapeHtml(p.id)}">${escapeHtml(p.name)}</button>`,
          ).join("")}
        </div>
        <div class="pkg-line" style="margin-top:8px"><span class="lbl">active · </span>${escapeHtml(pkgActive)}</div>
      </div>
      <div class="panel">
        <h3>You are learning</h3>
        <div style="font-size:12px;color:var(--chalk-dim)">${learn}</div>
      </div>
      <div class="panel">
        <h3>Histogram</h3>
        <canvas data-role="hist" width="400" height="100" style="width:100%;height:80px;border-radius:4px"></canvas>
      </div>
    `;

    elSide.querySelectorAll<HTMLButtonElement>("[data-pkg]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = findPackage(btn.getAttribute("data-pkg") ?? "");
        if (!p) return;
        session.inspectPackage(p.id);
        setPackageLine(`${p.name} — ${p.oneLiner}`);
        showModal({
          title: p.name,
          bodyHtml: renderMarkdown(
            [
              `**${categoryLabel(p.category)}**`,
              "",
              p.oneLiner,
              "",
              `### When`,
              p.useWhen,
              "",
              `### Install`,
              `\`${p.install}\``,
              "",
              `### Key APIs`,
              p.keyApis.map((k) => `- \`${k}\``).join("\n"),
              "",
              `### Worlds`,
              p.worlds.join(", "),
            ].join("\n"),
          ),
        });
      });
    });

    const histCanvas = elSide.querySelector<HTMLCanvasElement>("[data-role='hist']");
    if (histCanvas) drawHistogram(histCanvas, snap.histogram);
  }

  function renderPipeline(snap: SessionSnapshot): void {
    pipeline.replaceChildren();
    for (const op of snap.ops.slice(-10)) {
      const chip = document.createElement("span");
      chip.className = "op-chip";
      chip.textContent = op.label;
      pipeline.append(chip);
    }
  }

  function renderStage(snap: SessionSnapshot): void {
    canvasLabel.textContent = `${snap.image?.id ?? "empty"} · ${snap.image?.height ?? 0}×${snap.image?.width ?? 0}`;
    drawStage(canvas, {
      image: snap.image,
      detections: snap.detections,
      keypoints: snap.keypoints,
      histogram: snap.histogram,
    });
    renderPipeline(snap);
  }

  function renderAll(): void {
    renderRail();
    renderBrief();
    const snap = session.snapshot();
    renderStage(snap);
    renderSide(snap);
    elChrome.querySelector(".chrome-meta")!.textContent =
      `pixels → production · ${summarizeCurriculum(progress, ALL_LEVELS.length)}`;
    const navBtns = elChrome.querySelectorAll<HTMLButtonElement>("[data-nav]");
    navBtns.forEach((b) => {
      const nav = b.getAttribute("data-nav");
      b.classList.toggle(
        "is-active",
        (nav === "levels" && mode === "level") || (nav === "sandbox" && mode === "sandbox"),
      );
    });
  }

  function maybeWin(snap: SessionSnapshot): void {
    const lv = currentLevel();
    if (!lv) return;
    const result = lv.win(snap);
    if (result.won && celebratedFor !== lv.id) {
      celebratedFor = lv.id;
      winOk = true;
      winFeedback = result.feedback || CHEERS[Math.floor(Math.random() * CHEERS.length)];
      persistProgress(lv.id, snap.commandCount);
      terminal.push("ok", `✓ ${lv.title} — ${winFeedback}`);
      launchConfetti(elMain);
      playFanfare();
      const nxt = nextLevel(lv.id);
      if (nxt) {
        terminal.push("out", `Next: ${nxt.id} · ${nxt.title}`);
      }
      renderAll();
    } else if (!result.won) {
      winOk = false;
    }
  }

  function runCommand(cmd: string): void {
    const level = currentLevel();
    const ctx: CommandContext = {
      session,
      level,
      sandbox: mode === "sandbox",
      onHelp: () => showHelp(),
      onLevels: () => openLevels(),
      onHint: () => {
        const lv = currentLevel();
        if (!lv) {
          terminal.push("out", "Sandbox mode — no hints.");
          return;
        }
        showModal({
          title: `Hint · ${lv.id}`,
          bodyHtml: renderMarkdown(lv.hints.map((h) => `- ${h}`).join("\n")),
        });
      },
      onShowGoal: () => {
        const lv = currentLevel();
        if (!lv) return;
        showModal({
          title: `Goal · ${lv.id}`,
          bodyHtml: renderMarkdown(
            [
              lv.goal,
              "",
              lv.steps.map((s) => `- [ ] ${s.label} — ${s.detail}`).join("\n"),
              "",
              lv.learning.map((l) => `- ${l}`).join("\n"),
            ].join("\n"),
          ),
        });
      },
      onSolution: () => {
        const lv = currentLevel();
        if (!lv) return;
        showModal({
          title: `Solution trail · ${lv.id}`,
          bodyHtml: renderMarkdown(solutionTrail(lv).join("\n")),
        });
      },
      onReset: () => {
        const lv = currentLevel();
        session.reset(lv?.seedImage ?? "shapes");
        winOk = false;
        winFeedback = null;
        terminal.push("out", "Session reset.");
        renderAll();
      },
      onSandbox: () => {
        mode = "sandbox";
        renderAll();
      },
      onShare: () => {
        const text = buildShareTargets(mode === "level" ? levelId : null);
        void shareWithClipboard(text).then((ok) => {
          terminal.push(ok ? "ok" : "err", ok ? "Share text copied." : "Clipboard blocked.");
        });
      },
    };

    const result = dispatch(cmd, ctx);
    if (result.ok) {
      pushLines("out", result.lines);
    } else {
      pushLines("err", result.lines);
    }
    renderAll();
    maybeWin(result.state);
  }

  function openLevels(): void {
    const body = document.createElement("div");
    body.className = "levels-grid";
    for (const lv of ALL_LEVELS) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "level-card";
      if (progress[lv.id]?.solved) card.classList.add("is-solved");
      card.innerHTML = `
        <div class="id">${escapeHtml(lv.id)} · ${escapeHtml(lv.worldTitle.split("·")[0]?.trim() ?? lv.world)}</div>
        <div class="title">${escapeHtml(lv.title)}</div>
      `;
      card.addEventListener("click", () => {
        mode = "level";
        levelId = lv.id;
        session.reset(lv.seedImage ?? "shapes");
        winOk = false;
        celebratedFor = "";
        document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
        renderAll();
        terminal.push("ok", `Level ${lv.id} · ${lv.title}`);
      });
      body.append(card);
    }
    const wrap = document.createElement("div");
    wrap.append(body);
    showModal({
      title: `Levels · ${summarizeCurriculum(progress, ALL_LEVELS.length)}`,
      bodyHtml: wrap.innerHTML,
    });
    // re-bind because innerHTML clone loses listeners — use live node instead
    const modal = document.querySelector(".modal .md");
    if (modal) {
      modal.replaceChildren(body);
      body.querySelectorAll<HTMLButtonElement>(".level-card").forEach((card, i) => {
        const lv = ALL_LEVELS[i];
        card.addEventListener("click", () => {
          mode = "level";
          levelId = lv.id;
          session.reset(lv.seedImage ?? "shapes");
          winOk = false;
          celebratedFor = "";
          document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
          renderAll();
          terminal.push("ok", `Level ${lv.id} · ${lv.title}`);
        });
      });
    }
  }

  function openPackages(): void {
    const rows = PACKAGES.map(
      (p) => `
      <tr>
        <td><strong>${escapeHtml(p.name)}</strong><br/><span style="color:var(--chalk-dim)">${escapeHtml(categoryLabel(p.category))}</span></td>
        <td>${escapeHtml(p.oneLiner)}</td>
        <td class="mono">${escapeHtml(p.install)}</td>
      </tr>`,
    ).join("");
    showModal({
      title: "Package map",
      bodyHtml: renderMarkdown(
        `The libraries CV practitioners actually ship with. Type \`packages <name>\` in the terminal for APIs.`,
      ) + `<table class="pkg-table"><thead><tr><th>Package</th><th>Role</th><th>Install</th></tr></thead><tbody>${rows}</tbody></table>`,
    });
  }

  // chrome nav
  elChrome.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nav = btn.getAttribute("data-nav");
      if (nav === "levels") {
        mode = "level";
        openLevels();
        renderAll();
      } else if (nav === "sandbox") {
        mode = "sandbox";
        session.reset("shapes");
        renderAll();
        terminal.push("ok", "Sandbox mode.");
      } else if (nav === "packages") {
        openPackages();
      } else {
        showHelp();
      }
    });
  });

  elDock.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
    if (!t) return;
    const action = t.getAttribute("data-action");
    if (action === "hint") runCommand("hint");
    if (action === "goal") runCommand("show goal");
    if (action === "solution") runCommand("solution");
    if (action === "reset") runCommand("reset");
    if (action === "levels") openLevels();
  });

  // concept list shortcut via terminal already; also expose quick concept chips in help
  renderAll();
  setPackageLine("OpenCV · scikit-image · torchvision");

  // deep link ?level=
  const params = new URLSearchParams(window.location.search);
  const lvParam = params.get("level");
  if (lvParam && findLevel(lvParam)) {
    mode = "level";
    levelId = lvParam;
    session.reset(findLevel(lvParam)?.seedImage ?? "shapes");
    renderAll();
  }

  (window as unknown as { learnCvApp: unknown }).learnCvApp = {
    session,
    getLevel: currentLevel,
    CONCEPTS,
    LIVE_URL,
    REPO_URL,
    COFFEE_BUTTON_HTML,
  };
}


const root = document.querySelector("#app");
if (!root) throw new Error("#app root missing");
mount(root as HTMLElement);

const params = new URLSearchParams(window.location.search);
if (!params.has("NODEMO") && !params.get("level")) {
  showModal({
    title: "LearnCV",
    bodyHtml: renderMarkdown(
      [
        "Computer Vision from **pixels** to **production packages**.",
        "",
        "## What you will learn",
        "- Tensors, color, histograms � before any framework",
        "- Convolution, edges, morphology, geometry",
        "- Features, HOG, CNNs, transfer learning",
        "- Detection (IoU/NMS/mAP), segmentation, augmentation",
        "- ONNX export, tracking, MediaPipe, latency budgets",
        "",
        "## Packages covered",
        "NumPy � Pillow � OpenCV � scikit-image � matplotlib � torchvision � albumentations � ultralytics � mediapipe � transformers � onnxruntime � supervision",
        "",
        "Type `help` in the terminal. Open **levels** to start the curriculum.",
        "",
        COFFEE_BUTTON_HTML,
      ].join("\n"),
    ),
    actions: [
      { label: "Sandbox", className: "ghost", onClick: () => undefined },
      {
        label: "Open levels",
        className: "primary",
        onClick: () => {
          document.querySelector<HTMLButtonElement>('[data-nav="levels"]')?.click();
        },
      },
    ],
  });
}
