import type { Level } from "../engine/types";

import { WORLD1_LEVELS, WORLD_TITLE as W1_TITLE } from "./world1";
import { WORLD2_LEVELS, WORLD_TITLE as W2_TITLE } from "./world2";
import { WORLD3_LEVELS, WORLD_TITLE as W3_TITLE } from "./world3";
import { WORLD4_LEVELS, WORLD_TITLE as W4_TITLE } from "./world4";
import { WORLD5_LEVELS, WORLD_TITLE as W5_TITLE } from "./world5";
import { WORLD6_LEVELS, WORLD_TITLE as W6_TITLE } from "./world6";
import { WORLD7_LEVELS, WORLD_TITLE as W7_TITLE } from "./world7";
import { WORLD8_LEVELS, WORLD_TITLE as W8_TITLE } from "./world8";
import { WORLD9_LEVELS, WORLD_TITLE as W9_TITLE } from "./world9";
import { WORLD10_LEVELS, WORLD_TITLE as W10_TITLE } from "./world10";
import { WORLD11_LEVELS, WORLD_TITLE as W11_TITLE } from "./world11";
import { WORLD12_LEVELS, WORLD_TITLE as W12_TITLE } from "./world12";

export { WORLD1_LEVELS, WORLD2_LEVELS, WORLD3_LEVELS, WORLD4_LEVELS, WORLD5_LEVELS, WORLD6_LEVELS, WORLD7_LEVELS, WORLD8_LEVELS, WORLD9_LEVELS, WORLD10_LEVELS, WORLD11_LEVELS, WORLD12_LEVELS };

export const WORLD_TITLES = {
  w1: W1_TITLE,
  w2: W2_TITLE,
  w3: W3_TITLE,
  w4: W4_TITLE,
  w5: W5_TITLE,
  w6: W6_TITLE,
  w7: W7_TITLE,
  w8: W8_TITLE,
  w9: W9_TITLE,
  w10: W10_TITLE,
  w11: W11_TITLE,
  w12: W12_TITLE,
} as const;

export const ALL_LEVELS: readonly Level[] = [
  ...WORLD1_LEVELS,
  ...WORLD2_LEVELS,
  ...WORLD3_LEVELS,
  ...WORLD4_LEVELS,
  ...WORLD5_LEVELS,
  ...WORLD6_LEVELS,
  ...WORLD7_LEVELS,
  ...WORLD8_LEVELS,
  ...WORLD9_LEVELS,
  ...WORLD10_LEVELS,
  ...WORLD11_LEVELS,
  ...WORLD12_LEVELS,
];

/**
 * Find a level by id such as "1.1" or "12.3".
 *
 * Args:
 *   id: level id string
 * Returns:
 *   Level if present; otherwise undefined
 */
export function findLevel(id: string): Level | undefined {
  return ALL_LEVELS.find((level) => level.id === id);
}
