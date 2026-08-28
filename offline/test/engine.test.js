import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';

import { chooseMove, makeRng, LEVELS } from '../engine/index.js';
import { searchRoot } from '../engine/search.js';
import { evaluate, terminalScore, MATE_SCORE } from '../engine/evaluate.js';
import { chooseFromRanked, resolveLevel } from '../engine/levels.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

test('every level returns a legal move from the opening position', () => {
  for (const level of Object.keys(LEVELS)) {
    const { move, san } = chooseMove(START, { level, deadline: Infinity, rng: makeRng(1) });
    const legal = new Chess(START).moves();
    assert.ok(legal.includes(san), `level ${level} played illegal move ${san}`);
    assert.equal(move.color, 'w');
  }
});

test('returns null and a reason when the game is already over', () => {
  // Fool's mate, already delivered.
  const mated = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
  const result = chooseMove(mated, { level: 5 });
  assert.equal(result.move, null);
  assert.equal(result.reason, 'black-mates');
});

test('finds mate in one', () => {
  // Back-rank mate: Ra8#.
  const fen = '6k1/5ppp/8/8/8/8/8/R3K3 w Q - 0 1';
  const { moves } = searchRoot(new Chess(fen), { maxDepth: 2, deadline: Infinity });
  assert.equal(moves[0].move.san, 'Ra8#');
  assert.ok(moves[0].score > MATE_SCORE - 1000, 'mate should score near MATE_SCORE');
});

test('plays a forced mate at every level, including the easiest', () => {
  const fen = '6k1/5ppp/8/8/8/8/8/R3K3 w Q - 0 1';
  for (const level of Object.keys(LEVELS)) {
    for (let seed = 1; seed <= 20; seed++) {
      const { san } = chooseMove(fen, { level, maxDepth: 2, deadline: Infinity, rng: makeRng(seed) });
      assert.equal(san, 'Ra8#', `level ${level} seed ${seed} missed mate in one`);
    }
  }
});

test('takes a free queen rather than a quiet move', () => {
  // Black queen on d5 is undefended; white pawn on e4 can capture it.
  const fen = '4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 1';
  for (const level of Object.keys(LEVELS)) {
    for (let seed = 1; seed <= 10; seed++) {
      const { san } = chooseMove(fen, { level, maxDepth: 2, deadline: Infinity, rng: makeRng(seed) });
      assert.ok(
        san.startsWith('exd5'),
        `level ${level} seed ${seed} declined a free queen, played ${san}`
      );
    }
  }
});

test('is deterministic for a given seed', () => {
  const a = chooseMove(START, { level: 1, deadline: Infinity, rng: makeRng(42) }).san;
  const b = chooseMove(START, { level: 1, deadline: Infinity, rng: makeRng(42) }).san;
  assert.equal(a, b);
});

test('tolerance, not depth, is what makes low levels vary', () => {
  // Held at a fixed depth so this isolates the selection policy from search strength.
  const opts = { maxDepth: 1, deadline: Infinity };
  const ranked = searchRoot(new Chess(START), opts).moves;
  const topScore = ranked[0].score;
  const bestMoves = new Set(ranked.filter((r) => r.score === topScore).map((r) => r.move.san));

  const easy = new Set();
  const hard = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    easy.add(chooseMove(START, { ...opts, level: 1, rng: makeRng(seed) }).san);
    hard.add(chooseMove(START, { ...opts, level: 5, rng: makeRng(seed) }).san);
  }

  // Level 5 has zero tolerance, so it may still choose freely among EQUAL-best moves --
  // that is variety without weakness, and desirable. What it must never do is play
  // anything scored below the best.
  for (const san of hard) {
    assert.ok(bestMoves.has(san), `level 5 played ${san}, which is not a top-scoring move`);
  }
  assert.ok(easy.size > hard.size, 'a wide tolerance should produce more variety than none');
});

test('evaluation is symmetric between colours', () => {
  // Same structure, colours swapped: evaluation from the mover's view should match.
  const white = new Chess('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
  const black = new Chess('4k3/4p3/8/8/8/8/8/4K3 b - - 0 1');
  assert.equal(evaluate(white), evaluate(black));
});

test('evaluation prefers being a queen up', () => {
  const up = new Chess('4k3/8/8/8/8/8/8/3QK3 w - - 0 1');
  const level = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
  assert.ok(evaluate(up) > evaluate(level));
});

test('terminalScore reports mate, stalemate and nothing-yet', () => {
  const mate = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
  assert.ok(terminalScore(mate, 0) < -(MATE_SCORE - 1000));

  const stale = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.equal(terminalScore(stale, 0), 0);

  assert.equal(terminalScore(new Chess(START), 0), null);
});

test('mate is scored better the sooner it arrives', () => {
  const soon = terminalScore(
    new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'),
    1
  );
  const later = terminalScore(
    new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'),
    5
  );
  assert.ok(soon < later, 'a mate delivered sooner should be a worse score for the mated side');
});

test('chooseFromRanked plays the only legal move without consulting the rng', () => {
  const only = [{ move: { san: 'Kb1' }, score: 0 }];
  const explode = () => {
    throw new Error('rng should not be called');
  };
  assert.equal(chooseFromRanked(only, resolveLevel(1), explode).san, 'Kb1');
});

test('chooseFromRanked never picks a move outside the level tolerance', () => {
  const ranked = [
    { move: { san: 'good' }, score: 0 },
    { move: { san: 'ok' }, score: -50 },
    { move: { san: 'terrible' }, score: -900 },
  ];
  const level = resolveLevel(2); // tolerance 150
  for (let seed = 1; seed <= 200; seed++) {
    const san = chooseFromRanked(ranked, level, makeRng(seed)).san;
    assert.notEqual(san, 'terrible', `seed ${seed} picked a move outside tolerance`);
  }
});

test('an unknown level falls back to the default rather than throwing', () => {
  const { san } = chooseMove(START, { level: 99, deadline: Infinity, rng: makeRng(1) });
  assert.ok(new Chess(START).moves().includes(san));
});

test('a full game between two levels terminates legally', () => {
  const chess = new Chess();
  const rng = makeRng(7);
  let plies = 0;

  while (!chess.isGameOver() && plies < 300) {
    const level = chess.turn() === 'w' ? 3 : 1;
    const { move } = chooseMove(chess.fen(), { level, maxDepth: 2, deadline: Infinity, rng });
    assert.ok(move, 'engine returned no move in a live position');
    chess.move(move);
    plies++;
  }

  // The point is that nothing threw and every move was accepted as legal by chess.js.
  assert.ok(plies > 0);
  assert.ok(chess.history().length === plies);
});

test('searching deeper finds a mate in two that a shallow search misses', () => {
  // Two-rook ladder: 1.Ra7 forces Kg8 (h7 and g7 are covered), then 2.Rb8#.
  // Verified against the search itself -- depth 1 and 2 play Ka1, depth 3 plays Ra7.
  const fen = '7k/8/R7/1R6/8/8/8/1K6 w - - 0 1';
  const shallow = searchRoot(new Chess(fen), { maxDepth: 2, deadline: Infinity });
  const deep = searchRoot(new Chess(fen), { maxDepth: 3, deadline: Infinity });

  assert.ok(shallow.moves[0].score < MATE_SCORE - 1000, 'depth 2 should not see the mate');
  assert.ok(deep.moves[0].score > MATE_SCORE - 1000, 'depth 3 should see the forced mate');
  assert.equal(deep.moves[0].move.san, 'Ra7');
});

test('a time budget produces a usable move rather than running to the depth cap', () => {
  const result = searchRoot(new Chess(START), { maxDepth: 6, timeBudgetMs: 300 });
  assert.ok(result.moves.length > 0, 'must return moves even when the clock runs out');
  assert.ok(result.stats.completedDepth >= 1, 'at least one depth must complete');
  assert.ok(result.stats.timedOut, 'depth 6 from the opening cannot finish in 300ms');
  assert.ok(result.stats.elapsedMs < 3000, `took ${result.stats.elapsedMs}ms, budget was 300ms`);
});
