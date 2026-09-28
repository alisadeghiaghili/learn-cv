/** Minimal modal + markdown renderer. */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inCode = false;
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw;
    if (line.startsWith("```")) {
      closeList();
      html.push(inCode ? "</pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      html.push(escapeHtml(line));
      continue;
    }
    if (/^#{2,3}\s+/.test(line)) {
      closeList();
      const text = line.replace(/^#{2,3}\s+/, "");
      html.push(`<h3>${inline(text)}</h3>`);
      continue;
    }
    if (/^#{1}\s+/.test(line)) {
      closeList();
      html.push(`<h3>${inline(line.replace(/^#{1}\s+/, ""))}</h3>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  if (inCode) html.push("</code></pre>");
  return html.join("\n");

  function inline(text: string): string {
    let t = escapeHtml(text);
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return t;
  }
}

export interface ModalAction {
  label: string;
  className?: string;
  onClick: () => void;
}

export interface ModalOptions {
  title: string;
  bodyHtml: string;
  actions?: ModalAction[];
}

export function showModal(opts: ModalOptions): () => void {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `<h2>${escapeHtml(opts.title)}</h2><div class="md">${opts.bodyHtml}</div>`;
  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const close = () => {
    backdrop.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  const actionList: ModalAction[] =
    opts.actions && opts.actions.length
      ? opts.actions
      : [{ label: "Close", className: "ghost", onClick: () => undefined }];
  for (const a of actionList) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn ${a.className ?? ""}`;
    btn.textContent = a.label;
    btn.addEventListener("click", () => {
      a.onClick();
      close();
    });
    actions.append(btn);
  }
  modal.append(actions);
  backdrop.append(modal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener("keydown", onKey);
  document.body.append(backdrop);
  return close;
}

export function showHelp(): void {
  showModal({
    title: "How LearnCV works",
    bodyHtml: renderMarkdown(
      [
        "## Three layers",
        "",
        "1. **Concept brief** on the paper strip — the idea before the API.",
        "2. **Stage** — a live image tensor you transform.",
        "3. **Terminal** — type real-world command names (`cvtColor`, `sobel`, `yolo`).",
        "",
        "## Packages",
        "",
        "Type `packages` for the library map, `packages opencv` for one entry.",
        "Every op maps to something you would ship with.",
        "",
        "## Levels",
        "",
        "Open **levels** in the chrome. Each level has a goal checklist, hints, and learning outcomes. Progress is stored locally.",
        "",
        "## Meta commands",
        "",
        "```",
        "help · levels · hint · show goal · solution · reset · sandbox · share",
        "```",
      ].join("\n"),
    ),
  });
}
