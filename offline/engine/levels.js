/**
 * Difficulty policy.
 *
 * Search depth alone makes a bad opponent for a beginner: a depth-1 engine plays
 * perfectly-calculated one-move chess, which reads as alien rather than weak. What
 * makes an opponent feel gently bad is *choosing a plausible move that isn't the best
 * one* -- the kind of mistake a person makes.
 *
 * So a level is a search depth plus a tolerance in centipawns. The engine considers
 * every move within `tolerance` of the best and picks among them, weighted towards the
 * better ones. A wide tolerance produces natural-looking inaccuracies; it does not
 * produce random garbage, because a move that hangs a queen scores ~900 below best and
 * falls outside any tolerance we use.
 *
 * See docs/adr/0009-offline-engine-design.md.
 */

import { MATE_SCORE } from './evaluate.js';

/** @typedef {{name: string, blurb: string, elo: string, maxDepth: number, timeBudgetMs: number, tolerance: number}} Level */

/**
 * A level is a depth cap, a wall-clock budget, and a tolerance.
 *
 * The budget matters as much as the cap: see the measurements in search.js. On slower
 * hardware a level simply reaches a shallower depth rather than making the player wait,
 * which is the behaviour we want on a Pi driving a touchscreen.
 *
 * Budgets are kept short deliberately. An opponent that thinks for four seconds feels
 * broken to a child, and this engine is not meant to be strong.
 *
 * ## About the elo field
 *
 * These are ROUGH, UNCALIBRATED ESTIMATES for a simple alpha-beta engine with a
 * material-plus-piece-square evaluation. Nobody has played this against rated
 * opposition. They exist to help someone pick a level, not to make a claim.
 *
 * They are also hardware-dependent, which is unusual and worth understanding: the
 * levels are budget-limited, so on slower hardware a level reaches a shallower depth
 * and plays weaker than the band suggests. On a Raspberry Pi the top levels may not
 * reach their nominal depth at all. Run bench.mjs on the target device before trusting
 * any of these numbers, and if two levels collapse to the same depth, delete one
 * rather than shipping two names for the same opponent.
 */
/** @type {Record<number, Level>} */
export const LEVELS = {
  1: { name: 'Beginner',  blurb: 'New to chess',  elo: '400-600',   maxDepth: 1, timeBudgetMs: 200,  tolerance: 250 },
  2: { name: 'Easy',      blurb: 'Learning',      elo: '600-900',   maxDepth: 2, timeBudgetMs: 400,  tolerance: 150 },
  3: { name: 'Steady',    blurb: 'Club beginner', elo: '900-1200',  maxDepth: 3, timeBudgetMs: 700,  tolerance: 60  },
  4: { name: 'Tricky',    blurb: 'Improving',     elo: '1200-1400', maxDepth: 4, timeBudgetMs: 1200, tolerance: 25  },
  5: { name: 'Toughest',  blurb: 'Strongest',     elo: '1400-1600', maxDepth: 4, timeBudgetMs: 2000, tolerance: 0   },
};

export const DEFAULT_LEVEL = 2;

/** Anything at or above this is a forced mate we found. */
const MATE_THRESHOLD = MATE_SCORE - 1000;

/**
 * Deterministic RNG so every level's behaviour is reproducible in tests.
 * mulberry32 -- small, fast, good enough for choosing between chess moves.
 *
 * @param {number} seed
 * @returns {() => number} generator returning [0, 1)
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick a move from a best-first ranked list according to a level.
 *
 * Two rules override the tolerance, both for the player's benefit:
 *  - a forced mate is always played, at every level, so games actually end
 *  - if only one move is legal, play it
 *
 * @param {Array<{move: object, score: number}>} ranked best-first, from searchRoot
 * @param {Level} level
 * @param {() => number} rng
 * @returns {object} the chosen chess.js move object
 */
export function chooseFromRanked(ranked, level, rng) {
  if (ranked.length === 0) throw new Error('no legal moves to choose from');
  if (ranked.length === 1) return ranked[0].move;

  const best = ranked[0].score;

  // Always take a forced mate, however easy the level.
  if (best >= MATE_THRESHOLD) {
    const mating = ranked.filter((r) => r.score >= MATE_THRESHOLD);
    return mating[Math.floor(rng() * mating.length)].move;
  }

  const candidates = ranked.filter((r) => r.score >= best - level.tolerance);

  // Weight towards the front of the list so the best move stays the most likely
  // choice even at wide tolerances. Weight n for the first candidate, 1 for the last.
  const n = candidates.length;
  const weights = candidates.map((_, i) => n - i);
  const total = weights.reduce((a, b) => a + b, 0);

  let ticket = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    ticket -= weights[i];
    if (ticket <= 0) return candidates[i].move;
  }
  return candidates[candidates.length - 1].move;
}

/**
 * @param {number|string} level
 * @returns {Level}
 */
export function resolveLevel(level) {
  const key = Number(level);
  return LEVELS[key] ?? LEVELS[DEFAULT_LEVEL];
}
