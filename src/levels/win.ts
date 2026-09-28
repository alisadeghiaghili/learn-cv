import type { GoalStep, SessionSnapshot, WinResult } from "../engine/types";

/**
 * Build a win function from goal steps.
 * Reports which steps are still open and keeps feedback actionable.
 */
export function winFromSteps(
  steps: readonly GoalStep[],
  success: string,
): (state: SessionSnapshot) => WinResult {
  return (state: SessionSnapshot): WinResult => {
    const pending = steps.filter((s) => !s.check(state));
    const done = steps.length - pending.length;
    if (pending.length === 0) {
      return { won: true, feedback: success };
    }
    return {
      won: false,
      feedback: `${done}/${steps.length} goals · next: ${pending[0].label}`,
    };
  };
}
