/**
 * Offline board: setup, rendering, touch interaction, and game flow.
 *
 * Two screens. **Setup** chooses opponent, difficulty, side and layout, and is the
 * only place those controls exist -- once a game is running the panel shows what a
 * player actually needs mid-game: whose turn it is, the notation, and the ways out.
 *
 * Interaction is tap-to-select then tap-to-destination, deliberately not drag.
 * Dragging from a board edge competes with the compositor's edge gestures, which is
 * one of the acceptance criteria in docs/test-plan.md.
 *
 * The engine runs in a Web Worker so a two-second search never freezes the board; on
 * a touchscreen a frozen UI reads as a broken device rather than a thinking opponent.
 */

import { Chess } from '../vendor/chess.js';
import { LEVELS, DEFAULT_LEVEL } from '../engine/levels.js';
import { pieceSvg, PIECE_NAME } from './pieces.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const el = (id) => document.getElementById(id);
const els = {
  board: el('board'),
  status: el('status'),
  substatus: el('substatus'),
  moves: el('moves'),
  undo: el('undo'),
  rotate: el('rotate'),
  draw: el('draw'),
  resign: el('resign'),
  exit: el('exit'),
  start: el('start'),
  opponentRow: el('opponent-row'),
  levelRow: el('level-row'),
  levelHint: el('level-hint'),
  sideRow: el('side-row'),
  layoutRow: el('layout-row'),
  fieldLevel: el('field-level'),
  fieldSide: el('field-side'),
  promo: el('promo'),
  promoChoices: el('promo-choices'),
  confirm: el('confirm'),
  confirmText: el('confirm-text'),
  confirmYes: el('confirm-yes'),
  confirmNo: el('confirm-no'),
};

const game = new Chess();

const settings = {
  opponent: 'engine', // 'engine' | 'two'
  level: DEFAULT_LEVEL,
  side: 'w', // 'w' | 'b' | 'random'
  layout: 'landscape', // 'landscape' | 'portrait'
};

const state = {
  engineColour: 'b',
  selected: null,
  legal: [],
  lastMove: null,
  thinking: false,
  pendingPromotion: null,
  over: null, // set once the game ends by resignation or agreement
  confirmAction: null,
};

/* ---------------------------------------------------------------- engine worker */

const worker = new Worker(new URL('./engine-worker.js', import.meta.url), {
  type: 'module',
});

worker.addEventListener('message', (event) => {
  const data = event.data;

  if (data.type === 'draw-response') {
    if (data.accepted) endGame('½–½', 'Draw agreed');
    else flash('Draw declined');
    return;
  }

  state.thinking = false;
  if (!data.ok) {
    // Never leave the player stuck staring at "Thinking".
    flash(`Opponent error: ${data.error}`);
    render();
    return;
  }
  if (data.move) {
    game.move(data.move);
    state.lastMove = { from: data.move.from, to: data.move.to };
  }
  render();
});

function askEngine() {
  if (settings.opponent !== 'engine' || game.isGameOver() || state.over) return;
  if (game.turn() !== state.engineColour) return;

  state.thinking = true;
  render();
  worker.postMessage({ type: 'move', fen: game.fen(), level: settings.level });
}

/* ---------------------------------------------------------------------- rendering */

const squareName = (rank, file) => FILES[file] + (8 - rank);

function findKingSquare(colour) {
  for (const row of game.board()) {
    for (const piece of row) {
      if (piece && piece.type === 'k' && piece.color === colour) return piece.square;
    }
  }
  return null;
}

/**
 * Draw from Black's point of view when the human has the black pieces. A player
 * expects their own men nearest them; showing them upside down is the kind of detail
 * that makes a device feel unfinished.
 */
const flipped = () => settings.opponent === 'engine' && state.engineColour === 'w';

function render() {
  const board = game.board();
  const checkSquare = game.inCheck() && !state.over ? findKingSquare(game.turn()) : null;
  const destinations = new Map(state.legal.map((m) => [m.to, m]));

  let html = '';
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const rank = flipped() ? 7 - r : r;
      const file = flipped() ? 7 - f : f;
      const name = squareName(rank, file);
      const piece = board[rank][file];
      const move = destinations.get(name);

      const cls = ['sq', (rank + file) % 2 === 0 ? 'sq--light' : 'sq--dark'];
      if (state.selected === name) cls.push('sq--selected');
      if (state.lastMove && (state.lastMove.from === name || state.lastMove.to === name)) {
        cls.push('sq--last');
      }
      if (checkSquare === name) cls.push('sq--check');
      if (move) cls.push(move.captured ? 'sq--capture' : 'sq--move');

      html += `<div class="${cls.join(' ')}" data-square="${name}">`;
      if (f === 7) html += `<span class="coord coord--rank">${8 - rank}</span>`;
      if (r === 7) html += `<span class="coord coord--file">${FILES[file]}</span>`;
      if (piece) html += pieceSvg(piece.type, piece.color);
      html += '</div>';
    }
  }
  els.board.innerHTML = html;

  renderStatus();
  renderMoves();

  const finished = game.isGameOver() || Boolean(state.over);
  els.undo.disabled = state.thinking || finished || game.history().length === 0;
  els.draw.disabled = state.thinking || finished;
  els.resign.disabled = finished;
  document.body.dataset.turn = game.turn();
}

function renderStatus() {
  if (state.over) {
    els.status.textContent = state.over.result;
    setSub(state.over.reason);
    return;
  }
  if (game.isCheckmate()) {
    els.status.textContent = `${game.turn() === 'w' ? 'Black' : 'White'} wins`;
    setSub('Checkmate');
    return;
  }
  if (game.isStalemate()) {
    els.status.textContent = 'Draw';
    setSub('Stalemate');
    return;
  }
  if (game.isInsufficientMaterial()) {
    els.status.textContent = 'Draw';
    setSub('Not enough pieces');
    return;
  }
  if (game.isThreefoldRepetition()) {
    els.status.textContent = 'Draw';
    setSub('Threefold repetition');
    return;
  }
  if (game.isDraw()) {
    els.status.textContent = 'Draw';
    setSub('Fifty-move rule');
    return;
  }
  if (state.thinking) {
    els.status.textContent = 'Thinking…';
    setSub('');
    return;
  }
  els.status.textContent = `${game.turn() === 'w' ? 'White' : 'Black'} to play`;
  setSub(game.inCheck() ? 'Check!' : '', game.inCheck());
}

function setSub(text, alert = false) {
  els.substatus.textContent = text;
  els.substatus.classList.toggle('alert', Boolean(alert));
}

/** Transient message; the next render restores the real status. */
let flashTimer = null;
function flash(text) {
  setSub(text, true);
  clearTimeout(flashTimer);
  flashTimer = setTimeout(render, 2500);
}

function renderMoves() {
  const history = game.history();
  let html = '';
  for (let i = 0; i < history.length; i += 2) {
    html +=
      `<span class="num">${i / 2 + 1}.</span> ${history[i] ?? ''} ` +
      `${history[i + 1] ?? ''}<br>`;
  }
  els.moves.innerHTML = html;
  els.moves.scrollTop = els.moves.scrollHeight;
}

/* ------------------------------------------------------------------- interaction */

function humanMayMove() {
  if (game.isGameOver() || state.over || state.thinking || state.pendingPromotion) return false;
  if (settings.opponent === 'two') return true;
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
      (t) =>
        `<button data-promote="${t}" aria-label="${PIECE_NAME[t]}">${pieceSvg(t, colour)}</button>`
    )
    .join('');
  els.promo.dataset.open = 'true';
}

function closePromotion() {
  els.promo.dataset.open = 'false';
  state.pendingPromotion = null;
}

/* ---------------------------------------------------------- resign / draw / exit */

function endGame(result, reason) {
  state.over = { result, reason };
  clearSelection();
  render();
}

function askConfirm(text, action) {
  els.confirmText.textContent = text;
  state.confirmAction = action;
  els.confirm.dataset.open = 'true';
}

function closeConfirm() {
  els.confirm.dataset.open = 'false';
  state.confirmAction = null;
}

const humanColour = () => (state.engineColour === 'w' ? 'b' : 'w');

function offerDraw() {
  if (settings.opponent === 'two') {
    // Both players are present, so agreement is the whole of it.
    askConfirm('Agree to a draw?', () => endGame('½–½', 'Draw agreed'));
    return;
  }
  // Against the engine a draw offer should mean something, so ask it: it accepts only
  // if it judges its own position bad enough to be worth a half point.
  flash('Draw offered…');
  worker.postMessage({
    type: 'draw',
    fen: game.fen(),
    level: settings.level,
    engineColour: state.engineColour,
  });
}

function resign() {
  const loser = settings.opponent === 'two' ? game.turn() : humanColour();
  const winner = loser === 'w' ? 'Black' : 'White';
  askConfirm('Resign this game?', () =>
    endGame(`${winner} wins`, `${loser === 'w' ? 'White' : 'Black'} resigned`)
  );
}

/* ------------------------------------------------------------------ setup screen */

function renderLevels() {
  els.levelRow.innerHTML = Object.entries(LEVELS)
    .map(
      ([n, lv]) =>
        `<button data-level="${n}" aria-pressed="${Number(n) === settings.level}">` +
        `<span class="lvl-n">${n}</span><span class="lvl-elo">${lv.elo}</span></button>`
    )
    .join('');
  const lv = LEVELS[settings.level];
  // Stated as an estimate on purpose: nothing here has been played against rated
  // opposition, and levels are budget-limited so real strength varies by hardware.
  els.levelHint.textContent = `${lv.name} — ${lv.blurb}. Rough estimate, not a rating.`;
}

function pressGroup(row, attr, value) {
  for (const b of row.querySelectorAll(`[data-${attr}]`)) {
    b.setAttribute('aria-pressed', String(b.dataset[attr] === String(value)));
  }
}

function renderSetup() {
  pressGroup(els.opponentRow, 'opponent', settings.opponent);
  pressGroup(els.sideRow, 'side', settings.side);
  pressGroup(els.layoutRow, 'layout', settings.layout);
  renderLevels();
  const vsEngine = settings.opponent === 'engine';
  els.fieldLevel.style.display = vsEngine ? '' : 'none';
  els.fieldSide.style.display = vsEngine ? '' : 'none';
}

function applyLayout() {
  document.body.dataset.layout = settings.layout;
  pressGroup(els.layoutRow, 'layout', settings.layout);
}

function startGame() {
  game.reset();
  state.lastMove = null;
  state.thinking = false;
  state.over = null;
  clearSelection();
  closePromotion();
  closeConfirm();

  const side = settings.side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : settings.side;
  state.engineColour = side === 'w' ? 'b' : 'w';

  document.body.dataset.screen = 'game';
  render();
  askEngine();
}

/* ------------------------------------------------------------------------ events */

els.board.addEventListener('click', (e) => {
  const sq = e.target.closest('.sq');
  if (sq) onSquare(sq.dataset.square);
});

els.promo.addEventListener('click', (e) => {
  const choice = e.target.closest('[data-promote]');
  if (!choice) return;
  const { from, to } = state.pendingPromotion;
  closePromotion();
  commitMove({ from, to, promotion: choice.dataset.promote });
});

els.confirmYes.addEventListener('click', () => {
  const action = state.confirmAction;
  closeConfirm();
  if (action) action();
});
els.confirmNo.addEventListener('click', closeConfirm);

els.opponentRow.addEventListener('click', (e) => {
  const b = e.target.closest('[data-opponent]');
  if (!b) return;
  settings.opponent = b.dataset.opponent;
  renderSetup();
});

els.levelRow.addEventListener('click', (e) => {
  const b = e.target.closest('[data-level]');
  if (!b) return;
  settings.level = Number(b.dataset.level);
  renderLevels();
});

els.sideRow.addEventListener('click', (e) => {
  const b = e.target.closest('[data-side]');
  if (!b) return;
  settings.side = b.dataset.side;
  pressGroup(els.sideRow, 'side', settings.side);
});

els.layoutRow.addEventListener('click', (e) => {
  const b = e.target.closest('[data-layout]');
  if (!b) return;
  settings.layout = b.dataset.layout;
  applyLayout();
});

// Mid-game layout switch, so the device can be turned without abandoning the game.
els.rotate.addEventListener('click', () => {
  settings.layout = settings.layout === 'landscape' ? 'portrait' : 'landscape';
  applyLayout();
});

els.start.addEventListener('click', startGame);

els.undo.addEventListener('click', () => {
  if (state.thinking) return;
  game.undo();
  // Against the engine take back the pair, so the human is on move again rather than
  // handing the engine a free extra move.
  if (
    settings.opponent === 'engine' &&
    game.history().length > 0 &&
    game.turn() === state.engineColour
  ) {
    game.undo();
  }
  const h = game.history({ verbose: true });
  state.lastMove = h.length ? { from: h.at(-1).from, to: h.at(-1).to } : null;
  state.over = null;
  clearSelection();
  render();
});

els.draw.addEventListener('click', offerDraw);
els.resign.addEventListener('click', resign);

els.exit.addEventListener('click', () => {
  askConfirm('Exit to the menu? This game will be lost.', () => {
    document.body.dataset.screen = 'setup';
    renderSetup();
  });
});

renderSetup();
applyLayout();
render();
