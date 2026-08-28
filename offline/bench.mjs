/**
 * Engine response-time benchmark.
 *
 * Run this on the target device, not just on a laptop:
 *
 *   node offline/bench.mjs
 *
 * The levels in engine/levels.js are tuned against a wall-clock budget, so the depth
 * they reach depends entirely on how fast the machine is. The numbers that matter are
 * the ones from the Pi driving the touchscreen -- record them in
 * docs/hardware-bringup.md and re-tune the budgets if a level feels sluggish or
 * pointlessly weak.
 */

import { Chess } from 'chess.js';
import { chooseMove, LEVELS, makeRng } from './engine/index.js';

const POSITIONS = {
  opening: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  middlegame: 'r1bq1rk1/pp2ppbp/2np1np1/8/2BNP3/2N1BP2/PPPQ2PP/R3K2R w KQ - 0 1',
  endgame: '8/5pk1/6p1/8/8/6P1/5PK1/8 w - - 0 1',
};

const REPEATS = 3;

console.log('\nChessBob engine benchmark');
console.log(`node ${process.version} on ${process.platform}/${process.arch}\n`);
console.log(
  'level'.padEnd(14) + Object.keys(POSITIONS).map((k) => k.padEnd(20)).join('')
);
console.log('-'.repeat(14 + Object.keys(POSITIONS).length * 20));

for (const [n, level] of Object.entries(LEVELS)) {
  const cells = [];
  for (const fen of Object.values(POSITIONS)) {
    let worst = 0;
    let depth = 0;
    for (let i = 0; i < REPEATS; i++) {
      const started = Date.now();
      const result = chooseMove(fen, { level: n, rng: makeRng(i + 1) });
      worst = Math.max(worst, Date.now() - started);
      depth = result.stats.completedDepth;
    }
    cells.push(`${worst}ms  depth ${depth}`.padEnd(20));
  }
  console.log(`${n} ${level.name}`.padEnd(14) + cells.join(''));
}

console.log(`
Worst of ${REPEATS} runs per cell.

What to look for:
  - Any cell over ~2.5s feels broken to a player waiting for a reply.
  - A level stuck at depth 1 in the middlegame is not meaningfully harder than
    the level below it; either raise its budget or drop the level.
  - Sanity check: the engine is meant to be beatable. If it feels strong, that is
    a bug in the product, not a win.
`);

// Quick legality soak -- a self-play game should never produce an illegal move.
const chess = new Chess();
const rng = makeRng(11);
let plies = 0;
const started = Date.now();
while (!chess.isGameOver() && plies < 120) {
  const { move } = chooseMove(chess.fen(), { level: 2, rng });
  if (!move) break;
  chess.move(move);
  plies++;
}
console.log(
  `Self-play sanity: ${plies} plies in ${Date.now() - started}ms, ` +
    `result ${chess.isGameOver() ? 'game over' : 'still running'}\n`
);
