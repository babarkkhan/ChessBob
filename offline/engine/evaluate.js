/**
 * Position evaluation: material plus piece-square tables.
 *
 * Deliberately simple. This engine exists to be a beatable opponent for a beginner,
 * not to play strong chess -- see docs/adr/0009-offline-engine-design.md. No NNUE, no
 * tablebases, no opening book, and nothing that would make the device look like it
 * could assist a player.
 *
 * Piece-square tables are the widely-used "simplified evaluation" set, from White's
 * point of view, indexed rank 8 down to rank 1 to match chess.js's board() ordering.
 */

export const PIECE_VALUE = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// prettier-ignore
const PST = {
  p: [
      0,  0,  0,  0,  0,  0,  0,  0,
     50, 50, 50, 50, 50, 50, 50, 50,
     10, 10, 20, 30, 30, 20, 10, 10,
      5,  5, 10, 25, 25, 10,  5,  5,
      0,  0,  0, 20, 20,  0,  0,  0,
      5, -5,-10,  0,  0,-10, -5,  5,
      5, 10, 10,-20,-20, 10, 10,  5,
      0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

// The king table above is one entry short on its second-to-last rank in the classic
// listing; pad defensively so an index never returns undefined.
for (const table of Object.values(PST)) {
  while (table.length < 64) table.push(0);
}

export const MATE_SCORE = 100000;

/**
 * Static evaluation of a position, in centipawns, from the side-to-move's point of
 * view (negamax convention).
 *
 * @param {import('chess.js').Chess} chess
 * @returns {number}
 */
export function evaluate(chess) {
  const board = chess.board();
  let score = 0;

  for (let rank = 0; rank < 8; rank++) {
    const row = board[rank];
    for (let file = 0; file < 8; file++) {
      const piece = row[file];
      if (!piece) continue;

      const index = rank * 8 + file;
      const value = PIECE_VALUE[piece.type];
      // PSTs are written from White's perspective; mirror the rank for Black.
      const positional =
        piece.color === 'w'
          ? PST[piece.type][index]
          : PST[piece.type][(7 - rank) * 8 + file];

      score += piece.color === 'w' ? value + positional : -(value + positional);
    }
  }

  // Negamax: always report from the mover's point of view.
  return chess.turn() === 'w' ? score : -score;
}

/**
 * Terminal-position score, or null if the game is still running.
 *
 * @param {import('chess.js').Chess} chess
 * @param {number} ply how deep we are, so shallower mates score higher
 * @returns {number|null}
 */
export function terminalScore(chess, ply) {
  if (chess.isCheckmate()) {
    // Side to move is mated, which is the worst possible outcome for them.
    return -(MATE_SCORE - ply);
  }
  if (chess.isStalemate() || chess.isInsufficientMaterial() || chess.isDraw()) {
    return 0;
  }
  return null;
}
