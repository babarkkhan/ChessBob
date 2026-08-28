/**
 * Negamax search with alpha-beta pruning and time-budgeted iterative deepening.
 *
 * Returns every root move with a score, rather than just the best one, because the
 * difficulty policy in levels.js needs the ranking in order to pick a plausibly-bad
 * move at low levels. See docs/adr/0009-offline-engine-design.md.
 *
 * ## Why a time budget rather than a fixed depth
 *
 * Measured on a desktop (Node 24), per call:
 *
 *   chess.moves({verbose: true})   815 us   <-- dominates everything
 *   move() + undo()                143 us
 *   board()                        1.5 us
 *   evaluate()                     2.8 us
 *
 * The cost is chess.js generating SAN for every move at every node, not our
 * evaluation. Depth 4 from the opening took 7.6 s on a desktop for only 17k leaves --
 * the search prunes fine, each node is just expensive.
 *
 * A Pi 5 running this in a browser is several times slower again, so a fixed depth
 * that feels responsive on a laptop would make a child wait half a minute for a move.
 * Iterative deepening against a wall-clock budget gives the same code a good answer on
 * both: it simply reaches a shallower depth on slower hardware.
 *
 * Passing `deadline: Infinity` disables the budget, which is what the tests do so that
 * results are reproducible by depth rather than by how busy the machine is.
 */

import { evaluate, terminalScore, PIECE_VALUE, MATE_SCORE } from './evaluate.js';

/** How often to check the clock, in nodes. Checking every node would itself be slow. */
const CLOCK_CHECK_INTERVAL = 512;

/** Thrown internally to unwind a search that ran out of time. */
class Timeout extends Error {}

/**
 * Cheap move ordering: captures first, best-looking captures first among those.
 * Roughly MVV-LVA -- most valuable victim, least valuable attacker.
 */
function orderMoves(moves) {
  return [...moves].sort((a, b) => moveScore(b) - moveScore(a));
}

function moveScore(move) {
  let s = 0;
  if (move.captured) {
    s += 10 * PIECE_VALUE[move.captured] - PIECE_VALUE[move.piece];
  }
  if (move.promotion) s += PIECE_VALUE[move.promotion];
  return s;
}

function negamax(chess, depth, alpha, beta, ply, ctx) {
  if (++ctx.nodes % CLOCK_CHECK_INTERVAL === 0 && Date.now() > ctx.deadline) {
    throw new Timeout();
  }

  const terminal = terminalScore(chess, ply);
  if (terminal !== null) return terminal;

  if (depth === 0) {
    ctx.leaves++;
    return evaluate(chess);
  }

  let best = -Infinity;
  for (const move of orderMoves(chess.moves({ verbose: true }))) {
    chess.move(move);
    const value = -negamax(chess, depth - 1, -beta, -alpha, ply + 1, ctx);
    chess.undo();

    if (value > best) best = value;
    if (best > alpha) alpha = best;
    if (alpha >= beta) {
      ctx.cutoffs++;
      break;
    }
  }
  return best;
}

/**
 * Score every legal move at one fixed depth.
 *
 * @param {import('chess.js').Chess} chess
 * @param {number} depth
 * @param {object} ctx  mutable search context: {deadline, nodes, leaves, cutoffs}
 * @param {string[]|null} preferredOrder  root moves in LAN order from a previous,
 *        shallower iteration -- searching the previously-best move first makes
 *        alpha-beta prune far more
 * @returns {Array<{move: object, score: number}>} best-first
 */
function searchAtDepth(chess, depth, ctx, preferredOrder) {
  let rootMoves = orderMoves(chess.moves({ verbose: true }));

  if (preferredOrder) {
    const rank = new Map(preferredOrder.map((lan, i) => [lan, i]));
    rootMoves.sort(
      (a, b) => (rank.get(lan(a)) ?? Infinity) - (rank.get(lan(b)) ?? Infinity)
    );
  }

  const scored = [];
  let alpha = -Infinity;

  for (const move of rootMoves) {
    chess.move(move);
    const value = -negamax(chess, depth - 1, -Infinity, -alpha, 1, ctx);
    chess.undo();
    scored.push({ move, score: value });
    if (value > alpha) alpha = value;
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/** Long algebraic form -- a stable identity for a move across iterations. */
function lan(move) {
  return move.from + move.to + (move.promotion ?? '');
}

/**
 * Search the position, deepening until the budget or the depth cap is reached.
 *
 * Only fully-completed iterations are used. A depth that ran out of time is
 * discarded, so the result is always a coherent ranking rather than a half-searched
 * one.
 *
 * @param {import('chess.js').Chess} chess  restored to its original position on return
 * @param {object} [options]
 * @param {number} [options.maxDepth=3]
 * @param {number} [options.timeBudgetMs=1000]  ignored when `deadline` is given
 * @param {number} [options.deadline]  absolute epoch ms; pass Infinity for no limit
 * @returns {{moves: Array<{move: object, score: number}>, stats: object}}
 */
export function searchRoot(chess, options = {}) {
  const { maxDepth = 3, timeBudgetMs = 1000 } = options;
  const deadline = options.deadline ?? Date.now() + timeBudgetMs;
  const startedAt = Date.now();

  const ctx = { deadline, nodes: 0, leaves: 0, cutoffs: 0 };

  let best = null;
  let completedDepth = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    try {
      const previousOrder = best ? best.map((entry) => lan(entry.move)) : null;
      best = searchAtDepth(chess, depth, ctx, previousOrder);
      completedDepth = depth;
    } catch (error) {
      if (error instanceof Timeout) break;
      throw error;
    }
  }

  return {
    moves: best ?? [],
    stats: {
      completedDepth,
      maxDepth,
      leaves: ctx.leaves,
      nodes: ctx.nodes,
      cutoffs: ctx.cutoffs,
      elapsedMs: Date.now() - startedAt,
      timedOut: completedDepth < maxDepth,
    },
  };
}

export { MATE_SCORE };
