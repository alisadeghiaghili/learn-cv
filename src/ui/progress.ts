/** Progress persistence in localStorage. */

export interface LevelProgress {
  solved: boolean;
  bestCommands?: number;
  solvedAt?: string;
}

const KEY = "learncv.progress.v1";

export function loadProgress(): Record<string, LevelProgress> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LevelProgress>;
  } catch {
    return {};
  }
}

export function saveProgress(progress: Record<string, LevelProgress>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // ignore quota
  }
}

export function summarizeCurriculum(
  progress: Record<string, LevelProgress>,
  totalLevels: number,
): string {
  const solved = Object.values(progress).filter((p) => p.solved).length;
  return `${solved}/${totalLevels} levels solved`;
}

export function resumeLine(
  progress: Record<string, LevelProgress>,
  levelId: string,
): string {
  const p = progress[levelId];
  if (!p) return "not started";
  if (!p.solved) return "in progress";
  return p.bestCommands !== undefined
    ? `solved · best ${p.bestCommands} cmds`
    : "solved";
}
