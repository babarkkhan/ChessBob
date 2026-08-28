/**
 * ChessBob offline engine -- public API.
 *
 * A small, deliberately beatable opponent. It runs inside the offline board page in
 * the content browser; there is no engine binary on the device and no UCI anywhere.
 * See docs/adr/0009-offline-engine-design.md.
 *
 * Usage:
 *   import { chooseMove } from './engine/index.js';
 *   const { move } = chooseMove(fen, { level: 2 });
 */

import { Chess } from 'chess.js';
import { searchRoot } from './search.js';
import { chooseFromRanked, resolveLevel, makeRng, LEVELS, DEFAULT_LEVEL } from './levels.js';

export { LEVELS, DEFAULT_LEVEL, makeRng };

/**
 * Choose a move for the side to play.
 *
 * @param {string} fen  position in Forsyth-Edwards notation
 * @param {object} [options]
 * @param {number} [options.level=2]  1..5, see LEVELS
 * @param {() => number} [options.rng] injectable for deterministic tests
 * @param {number} [options.maxDepth]  override the level depth cap; tests use this to
 *        exercise selection policy without paying for a deep search
 * @param {number} [options.deadline]  absolute epoch ms, overriding the level budget.
 *        Tests pass Infinity so results depend on depth alone and not on how busy the
 *        machine is; production leaves this unset.
 * @returns {{move: object|null, san: string|null, level: object, reason?: string, stats: object}}
 *          move is null when the game is already over
 */
export function chooseMove(fen, options = {}) {
  const level = resolveLevel(options.level ?? DEFAULT_LEVEL);
  const rng = options.rng ?? Math.random;

  const chess = new Chess(fen);

  if (chess.isGameOver()) {
    return { move: null, san: null, level, reason: gameOverReason(chess), stats: {} };
  }

  const { moves, stats } = searchRoot(chess, {
    maxDepth: options.maxDepth ?? level.maxDepth,
    timeBudgetMs: level.timeBudgetMs,
    ...(options.deadline !== undefined ? { deadline: options.deadline } : {}),
  });

  const move = chooseFromRanked(moves, level, rng);

  return {
    move,
    san: move.san,
    level,
    stats: { ...stats, considered: moves.length, bestScore: moves[0].score },
  };
}

/**
 * Why the game ended, for the offline board to display.
 *
 * @param {Chess} chess
 * @returns {string}
 */
export function gameOverReason(chess) {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? 'black-mates' : 'white-mates';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isInsufficientMaterial()) return 'insufficient-material';
  if (chess.isThreefoldRepetition()) return 'threefold-repetition';
  if (chess.isDraw()) return 'draw';
  return 'in-progress';
}
