/**
 * Runs the engine off the main thread.
 *
 * A level-5 search can take two seconds. On the main thread that would freeze the
 * board and the "Thinking" indicator, which on a touchscreen appliance reads as a
 * crashed device rather than a thinking opponent.
 */

import { Chess } from '../vendor/chess.js';
import { chooseMove } from '../engine/index.js';
import { searchRoot } from '../engine/search.js';
import { resolveLevel } from '../engine/levels.js';

/**
 * How badly the engine must judge its own position before it accepts a draw offer.
 * A pawn and a half down is enough to take a half point rather than play on.
 */
const DRAW_ACCEPT_THRESHOLD = -150;

self.addEventListener('message', (event) => {
  const { type = 'move', fen, level, engineColour } = event.data;

  try {
    if (type === 'draw') {
      self.postMessage({
        type: 'draw-response',
        accepted: judgeDrawOffer(fen, level, engineColour),
      });
      return;
    }

    const { move } = chooseMove(fen, { level });
    self.postMessage({ ok: true, move });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
});

/**
 * Decide whether to accept a draw, so the offer means something rather than being a
 * button that always works.
 *
 * searchRoot scores from the side-to-move's point of view, so the score is negated
 * when it is not the engine's turn -- which it usually is not, since a draw is
 * normally offered by the player on move.
 *
 * @returns {boolean}
 */
function judgeDrawOffer(fen, level, engineColour) {
  const chess = new Chess(fen);
  const lv = resolveLevel(level);

  // A shallow look is enough for a yes/no, and the player is waiting.
  const { moves } = searchRoot(chess, {
    maxDepth: Math.min(lv.maxDepth, 2),
    timeBudgetMs: 300,
  });
  if (moves.length === 0) return true; // no legal moves: nothing to play on for

  const scoreForMover = moves[0].score;
  const scoreForEngine = chess.turn() === engineColour ? scoreForMover : -scoreForMover;

  return scoreForEngine <= DRAW_ACCEPT_THRESHOLD;
}
