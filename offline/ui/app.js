/**
 * Offline board: rendering, touch interaction, and game flow.
 *
 * Two modes -- two players on one screen, or against the engine. The engine runs in a
 * Web Worker so a two-second search never freezes the board; on a touchscreen a frozen
 * UI reads as a broken device.
 *
 * Interaction is tap-to-select then tap-to-destination, deliberately not drag.
 * Dragging from a board edge competes with the compositor's edge gestures, which is
 * one of the acceptance criteria in docs/test-plan.md.
 */

import { Chess } from '../vendor/chess.js';
import { pieceSvg, PIECE_NAME } from './pieces.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const els = {
  board: document.getElementById('board'),
  status: document.getElementById('status'),
  substatus: document.getElementById('substatus'),
  moves: document.getElementById('moves'),
  undo: document.getElementById('undo'),
  newGame: document.getElementById('new-game'),
  modeTwo: document.getElementById('mode-two'),
  modeEngine: document.getElementById('mode-engine'),
  levelRow: document.getElementById('level-row'),
  promo: document.getElementById('promo'),
  promoChoices: document.getElementById('promo-choices'),
};

const game = new Chess();

const state = {
  mode: 'engine', // 'engine' | 'two'
  level: 2,
  engineColour: 'b', // the human plays White by default
  selected: null,
  legal: [],
  lastMove: null,
  thinking: false,
  pendingPromotion: null,
};

/* ---------------------------------------------------------------- engine worker */

const worker = new Worker(new URL('./engine-worker.js', import.meta.url), {
  type: 'module',
});

worker.addEventListener('message', (event) => {
  const { ok, move, error } = event.data;
  state.thinking = false;

  if (!ok) {
    // Never leave the player stuck staring at "Thinking".
    els.substatus.textContent = `The opponent could not move (${error}).`;
    render();
    return;
  }
  if (move) {
    game.move(move);
    state.lastMove = { from: move.from, to: move.to };
  }
  render();
});

function askEngine() {
  if (state.mode !== 'engine' || game.isGameOver()) return;
  if (game.turn() !== state.engineColour) return;

  state.thinking = true;
  render();
  worker.postMessage({ fen: game.fen(), level: state.level });
}

/* ---------------------------------------------------------------------- rendering */

function squareName(rank, file) {
  return FILES[file] + (8 - rank);
}

function findKingSquare(colour) {
  for (const row of game.board()) {
    for (const piece of row) {
      if (piece && piece.type === 'k' && piece.color === colour) return piece.square;
    }
  }
  return null;
}

function render() {
  const board = game.board();
  const checkSquare = game.inCheck() ? findKingSquare(game.turn()) : null;
  const destinations = new Map(state.legal.map((m) => [m.to, m]));

  let html = '';
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const name = squareName(rank, file);
      const piece = board[rank][file];
      const move = destinations.get(name);

      const classes = ['sq', (rank + file) % 2 === 0 ? 'sq--light' : 'sq--dark'];
      if (state.selected === name) classes.push('sq--selected');
      if (state.lastMove && (state.lastMove.from === name || state.lastMove.to === name)) {
        classes.push('sq--last');
      }
      if (checkSquare === name) classes.push('sq--check');
      if (move) classes.push(move.captured ? 'sq--capture' : 'sq--move');

      html += `<div class="${classes.join(' ')}" data-square="${name}">`;
      if (file === 7) html += `<span class="coord coord--rank">${8 - rank}</span>`;
      if (rank === 7) html += `<span class="coord coord--file">${FILES[file]}</span>`;
      if (piece) html += pieceSvg(piece.type, piece.color);
      html += '</div>';
    }
  }
  els.board.innerHTML = html;

  renderStatus();
  renderMoves();

  els.undo.disabled = state.thinking || game.history().length === 0;
  els.modeTwo.setAttribute('aria-pressed', String(state.mode === 'two'));
  els.modeEngine.setAttribute('aria-pressed', String(state.mode === 'engine'));
  els.levelRow.style.visibility = state.mode === 'engine' ? 'visible' : 'hidden';
}

function renderStatus() {
  const toMove = game.turn() === 'w' ? 'White' : 'Black';

  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'Black' : 'White';
    els.status.textContent = `${winner} wins`;
    els.substatus.textContent = 'Checkmate';
    return;
  }
  if (game.isStalemate()) {
    els.status.textContent = 'Draw';
    els.substatus.textContent = 'Stalemate — no legal moves, but not in check';
    return;
  }
  if (game.isInsufficientMaterial()) {
    els.status.textContent = 'Draw';
    els.substatus.textContent = 'Not enough pieces left to checkmate';
    return;
  }
  if (game.isThreefoldRepetition()) {
    els.status.textContent = 'Draw';
    els.substatus.textContent = 'Same position three times';
    return;
  }
  if (game.isDraw()) {
    els.status.textContent = 'Draw';
    els.substatus.textContent = 'Fifty moves without a capture or a pawn move';
    return;
  }

  if (state.thinking) {
    els.status.textContent = 'Thinking…';
    els.substatus.textContent = '';
    return;
  }

  els.status.textContent = `${toMove} to play`;
  els.substatus.textContent = game.inCheck() ? 'Check!' : '';
}

function renderMoves() {
  const history = game.history();
  let html = '';
  for (let i = 0; i < history.length; i += 2) {
    const number = i / 2 + 1;
    const white = history[i] ?? '';
    const black = history[i + 1] ?? '';
    html += `${number}. <b>${white}</b> ${black}<br>`;
  }
  els.moves.innerHTML = html;
  els.moves.scrollTop = els.moves.scrollHeight;
}

/* ------------------------------------------------------------------- interaction */

function humanMayMove() {
  if (game.isGameOver() || state.thinking || state.pendingPromotion) return false;
  if (state.mode === 'two') return true;
  return game.turn() !== state.engineColour;
}

function onSquare(name) {
  if (!humanMayMove()) return;

  const chosen = state.legal.find((m) => m.to === name);
  if (chosen) {
    // A promotion needs the player to say which piece; ask rather than assume a queen.
    if (chosen.promotion) {
      state.pendingPromotion = { from: chosen.from, to: chosen.to };
      openPromotion();
      return;
    }
    commitMove({ from: chosen.from, to: chosen.to });
    return;
  }

  // Tapping the selected piece again clears the selection.
  if (state.selected === name) {
    clearSelection();
    render();
    return;
  }

  const piece = game.get(name);
  if (piece && piece.color === game.turn()) {
    state.selected = name;
    state.legal = game.moves({ square: name, verbose: true });
  } else {
    clearSelection();
  }
  render();
}

function commitMove(move) {
  const played = game.move(move);
  if (!played) return; // defensive: chess.js is the authority on legality
  state.lastMove = { from: played.from, to: played.to };
  clearSelection();
  render();
  askEngine();
}

function clearSelection() {
  state.selected = null;
  state.legal = [];
}

/* -------------------------------------------------------------------- promotion */

function openPromotion() {
  const colour = game.turn();
  els.promoChoices.innerHTML = ['q', 'r', 'b', 'n']
    .map(
      (type) =>
        `<button data-promote="${type}" aria-label="${PIECE_NAME[type]}">${pieceSvg(
          type,
          colour
        )}</button>`
    )
    .join('');
  els.promo.dataset.open = 'true';
}

function closePromotion() {
  els.promo.dataset.open = 'false';
  state.pendingPromotion = null;
}

/* ------------------------------------------------------------------------ events */

els.board.addEventListener('click', (event) => {
  const square = event.target.closest('.sq');
  if (square) onSquare(square.dataset.square);
});

els.promo.addEventListener('click', (event) => {
  const choice = event.target.closest('[data-promote]');
  if (!choice) return;
  const { from, to } = state.pendingPromotion;
  closePromotion();
  commitMove({ from, to, promotion: choice.dataset.promote });
});

els.newGame.addEventListener('click', () => {
  game.reset();
  state.lastMove = null;
  state.thinking = false;
  clearSelection();
  closePromotion();
  render();
  askEngine();
});

els.undo.addEventListener('click', () => {
  if (state.thinking) return;
  game.undo();
  // In engine mode take back the pair, so the human is on move again rather than
  // handing the engine a free extra move.
  if (state.mode === 'engine' && game.history().length > 0 && game.turn() === state.engineColour) {
    game.undo();
  }
  const history = game.history({ verbose: true });
  state.lastMove = history.length ? { from: history.at(-1).from, to: history.at(-1).to } : null;
  clearSelection();
  render();
});

els.modeTwo.addEventListener('click', () => {
  state.mode = 'two';
  render();
});

els.modeEngine.addEventListener('click', () => {
  state.mode = 'engine';
  render();
  askEngine();
});

els.levelRow.addEventListener('click', (event) => {
  const button = event.target.closest('[data-level]');
  if (!button) return;
  state.level = Number(button.dataset.level);
  for (const b of els.levelRow.querySelectorAll('[data-level]')) {
    b.setAttribute('aria-pressed', String(Number(b.dataset.level) === state.level));
  }
});

for (const b of els.levelRow.querySelectorAll('[data-level]')) {
  b.setAttribute('aria-pressed', String(Number(b.dataset.level) === state.level));
}

render();
