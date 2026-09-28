import { describe, expect, it } from "vitest";
import { ALL_LEVELS, findLevel } from "../src/levels";
import { Session } from "../src/engine/session";
import { dispatch } from "../src/engine/commands";

function ctx(session: Session) {
  return { session, level: null, sandbox: true };
}

describe("level registry", () => {
  it("has a solid curriculum", () => {
    expect(ALL_LEVELS.length).toBeGreaterThanOrEqual(24);
  });

  it("covers 12 worlds", () => {
    const worlds = new Set(ALL_LEVELS.map((l) => l.world));
    for (let i = 1; i <= 12; i++) {
      expect(worlds.has(`w${i}`)).toBe(true);
    }
  });

  it("has unique ids", () => {
    const ids = ALL_LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each level has concept, hints, learning, steps, win", () => {
    for (const lv of ALL_LEVELS) {
      expect(lv.title.length).toBeGreaterThan(3);
      expect(lv.concept.body.length).toBeGreaterThan(40);
      expect(lv.goal.length).toBeGreaterThan(10);
      expect(lv.hints.length).toBeGreaterThan(0);
      expect(lv.learning.length).toBeGreaterThan(0);
      expect(lv.steps.length).toBeGreaterThan(0);
      expect(typeof lv.win).toBe("function");
    }
  });

  it("findLevel resolves known ids", () => {
    const first = ALL_LEVELS[0];
    expect(findLevel(first.id)).toBe(first);
  });
});

describe("level goals are achievable", () => {
  it("first level of each world can be won by its step commands", () => {
    const byWorld = new Map<string, (typeof ALL_LEVELS)[number]>();
    for (const lv of ALL_LEVELS) {
      if (!byWorld.has(lv.world)) byWorld.set(lv.world, lv);
    }
    for (const lv of byWorld.values()) {
      const commands = lv.steps
        .map((s) => s.command)
        .filter((c): c is string => Boolean(c));
      if (commands.length === 0) continue;
      const session = new Session();
      session.reset(lv.seedImage ?? "shapes");
      for (const c of commands) {
        dispatch(c, ctx(session));
      }
      const snap = session.snapshot();
      const stepsOk = lv.steps.every((s) => s.check(snap));
      const win = lv.win(snap);
      expect(win.won, `${lv.id} ${lv.title} trail=${commands.join(" | ")} feedback=${win.feedback}`).toBe(
        true,
      );
      expect(stepsOk).toBe(true);
    }
  });

  it("unfinished state does not win", () => {
    const lv = ALL_LEVELS[0];
    const session = new Session();
    session.reset(lv.seedImage ?? "shapes");
    const snap = session.snapshot();
    // level 1.1 might be inspection-only; if it has image-required steps it should not win yet
    const win = lv.win(snap);
    if (lv.steps.some((s) => !s.check(snap))) {
      expect(win.won).toBe(false);
    }
  });
});
