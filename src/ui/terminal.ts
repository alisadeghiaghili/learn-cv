/** Terminal view: history log + input line. */

export type LogLine = {
  kind: "cmd" | "out" | "err" | "ok";
  text: string;
};

export class TerminalView {
  private log: HTMLElement;
  private input: HTMLInputElement;
  private history: string[] = [];
  private histIdx = -1;

  constructor(
    root: HTMLElement,
    private readonly onSubmit: (cmd: string) => void,
  ) {
    root.innerHTML = "";
    this.log = document.createElement("div");
    this.log.className = "term-log";
    const row = document.createElement("div");
    row.className = "term-input-row";
    const prompt = document.createElement("span");
    prompt.className = "term-prompt";
    prompt.textContent = "cv›";
    this.input = document.createElement("input");
    this.input.className = "term-input";
    this.input.type = "text";
    this.input.spellcheck = false;
    this.input.autocomplete = "off";
    this.input.placeholder = "load shapes · sobel · yolo · help";
    row.append(prompt, this.input);
    root.append(this.log, row);

    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const v = this.input.value;
        this.input.value = "";
        if (v.trim()) {
          this.history.push(v);
          this.histIdx = this.history.length;
          this.push("cmd", `cv› ${v}`);
          this.onSubmit(v);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (this.histIdx > 0) {
          this.histIdx--;
          this.input.value = this.history[this.histIdx] ?? "";
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (this.histIdx < this.history.length - 1) {
          this.histIdx++;
          this.input.value = this.history[this.histIdx] ?? "";
        } else {
          this.histIdx = this.history.length;
          this.input.value = "";
        }
      }
    });

    this.push("out", "LearnCV terminal ready. Type `help`.");
    this.focus();
  }

  push(kind: LogLine["kind"], text: string): void {
    const line = document.createElement("div");
    line.className = `line ${kind}`;
    line.textContent = text;
    this.log.append(line);
    this.log.scrollTop = this.log.scrollHeight;
  }

  pushMany(kind: LogLine["kind"], texts: readonly string[]): void {
    for (const t of texts) this.push(kind, t);
  }

  focus(): void {
    this.input.focus();
  }

  clear(): void {
    this.log.replaceChildren();
  }
}
