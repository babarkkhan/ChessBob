# offline

Play without a network: a local board, and a deliberately beatable opponent.

Design and rationale: [ADR 0008](../docs/adr/0008-offline-mode.md) (why offline at all,
and the fair-play collision) and [ADR 0009](../docs/adr/0009-offline-engine-design.md)
(why our own engine in the content browser rather than Stockfish in a process).

```bash
npm --prefix offline install    # dev only -- the device needs no npm
npm --prefix offline test       # 19 tests
node offline/serve.mjs          # then open http://127.0.0.1:8137/offline/
node offline/bench.mjs          # response times -- run this on the Pi
```

The board is playable in a browser today: tap a piece, tap a destination, pick a
difficulty, or switch to two-player. Verified end to end — opening moves, engine
replies, check and checkmate detection, promotion picker, take-back.

## What this is not

**There is no chess engine binary on the device.** The engine is a few files of our own
JavaScript that run inside the offline board page. Nothing to install, nothing to exec,
no UCI protocol anywhere — which is why
[`scripts/verify-fairplay.sh`](../scripts/verify-fairplay.sh) can keep banning engine
binaries and the UCI client surface absolutely, with no carve-out.

It cannot run during an online game, for three independent reasons:

1. The offline board and the chess site share **one content-browser process slot**. One
   or the other, never both.
2. Chromium managed policy is **default-deny in both directions** — the online profile's
   allowlist excludes the offline board's loopback URL, and vice versa.
3. systemd `Conflicts=` between the two units.

## Layout

| Path | What |
|---|---|
| `engine/evaluate.js` | Material + piece-square tables. No NNUE, no tablebases, no opening book |
| `engine/search.js` | Negamax, alpha-beta, time-budgeted iterative deepening |
| `engine/levels.js` | Difficulty: depth cap + wall-clock budget + tolerance |
| `engine/index.js` | Public API — `chooseMove(fen, {level, rng})` |
| `ui/index.html` | The board page, laid out for 1024×600 |
| `ui/app.js` | Rendering, tap-to-move, game flow |
| `ui/pieces.js` | Piece artwork, drawn for this project |
| `ui/engine-worker.js` | Runs the engine off the main thread |
| `ui/pieces-preview.html` | Dev page for judging the pieces at size |
| `serve.mjs` | Loopback static server, used in dev and on the device |
| `vendor/` | chess.js, vendored — see below |
| `bench.mjs` | Response-time benchmark. **Run this on the Pi** |
| `test/` | `node --test`, deterministic via injected RNG |

Rules (legal moves, check, draws) come from `chess.js` (BSD-2-Clause). Rules are not
evaluation — that distinction is the whole of the CI check's precision.

## Why chess.js is vendored

**Import maps do not apply to Web Workers.** A bare `import { Chess } from 'chess.js'`
resolves fine in Node and on the main thread, then fails inside the engine worker —
the board simply sits on "Thinking…" forever, with the failure invisible to any Node
test.

So the ESM build is vendored to `vendor/chess.js` and imported by relative path
everywhere, which resolves identically in Node, the main thread and the worker, with
no import map and no bundler. It also means **the device needs no npm at all**, which
makes provisioning reproducible.

`test/imports.test.js` guards against the bare specifier creeping back. Refresh the
vendored copy with `npm --prefix offline run vendor` after bumping the devDependency.

## Interaction

Tap-to-select then tap-to-destination — **deliberately not drag**. Dragging from a
board edge competes with the compositor's edge gestures, which is an explicit
acceptance criterion in `docs/test-plan.md`. Legal destinations show as dots, captures
as rings.

The engine runs in a Web Worker so a two-second search never freezes the board; a
frozen UI on a touchscreen reads as a broken device.

## How difficulty works

Depth alone makes a bad beginner opponent: a depth-1 engine plays perfectly-calculated
one-move chess, which reads as alien rather than weak. What feels human is choosing a
*plausible* move that isn't the best one.

So a level is **depth cap + time budget + tolerance in centipawns**. The engine
considers every move within `tolerance` of the best and picks among them, weighted
towards the better ones. A wide tolerance produces natural inaccuracies without
producing garbage — hanging a queen scores ~900 below best and falls outside any
tolerance in use.

Two rules override tolerance at every level, both for the player's benefit: a **forced
mate is always played** (so games end), and a **single legal move is played** without
consulting the RNG.

| Level | Name | Depth cap | Budget | Tolerance |
|---|---|---|---|---|
| 1 | Beginner | 1 | 200 ms | 250 cp |
| 2 | Easy | 2 | 400 ms | 150 cp |
| 3 | Steady | 3 | 700 ms | 60 cp |
| 4 | Tricky | 4 | 1200 ms | 25 cp |
| 5 | Toughest | 4 | 2000 ms | 0 cp |

Tolerance 0 still allows choosing freely among *equal-best* moves. That is variety
without weakness, and it stops the top level opening identically every game.

## Why a time budget rather than a fixed depth

Measured with `chess.js` 1.4 on Node 24, per call:

| Call | Cost |
|---|---|
| `chess.moves({verbose: true})` | **815 µs** |
| `move()` + `undo()` | 143 µs |
| `board()` | 1.5 µs |
| `evaluate()` (ours) | 2.8 µs |

The bottleneck is chess.js generating SAN for every move at every node — **not** our
evaluation, which is three orders of magnitude cheaper. Fixed depth 4 from the opening
took 7.6 s for only 17k leaves: the search prunes fine, each node is simply expensive.

A Pi 5 running this in a browser is slower again, so a depth that feels responsive on a
laptop would leave a player waiting half a minute. Iterative deepening against a
wall-clock budget gives the same code a sensible answer on both — it just reaches a
shallower depth on slower hardware.

## Baseline measurements

Desktop, Node 24 — **worst case per level, not the Pi**:

| Level | Opening | Middlegame | Endgame |
|---|---|---|---|
| 1 Beginner | 17 ms (d1) | 36 ms (d1) | 1 ms (d1) |
| 2 Easy | 39 ms (d2) | 194 ms (d2) | 16 ms (d2) |
| 3 Steady | 318 ms (d3) | 838 ms (d2) | 76 ms (d3) |
| 4 Tricky | 1422 ms (d3) | 1229 ms (d2) | 318 ms (d4) |
| 5 Toughest | 1994 ms (d4) | 2117 ms (d2) | 300 ms (d4) |

**Known limitation, to re-check on hardware:** in the middlegame even level 5 only
reaches depth 2 within its budget on a *desktop*. On a Pi it will reach less. That means
the top levels may not be meaningfully harder than the middle ones on the real device.

Run `node offline/bench.mjs` on the Pi, record the result in
[`docs/hardware-bringup.md`](../docs/hardware-bringup.md), and re-tune the budgets. If a
level is stuck at depth 1 in the middlegame, either raise its budget or drop the level
rather than shipping a difficulty setting that does nothing.

This engine is *meant* to be beatable. If it ever feels strong, that is a product bug.

## Assets

The pieces in `ui/pieces.js` were **drawn for this project**, so the repository carries
no third-party asset licence at all — no attribution requirement, no share-alike,
nothing to resolve before a commercial build
([ADR 0007](../docs/adr/0007-build-stages.md)). They are MIT with the rest of the repo.

They are geometric rather than Staunton: a flat set reads more clearly at the ~65px
squares this board uses on a 1024×600 panel, and it is honest about being its own thing
rather than an imitation of anyone's. `ui/pieces-preview.html` shows them at size.

No Chess.com or ChessKid palettes, piece artwork or sounds are used anywhere.
