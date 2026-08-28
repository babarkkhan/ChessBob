# ADR 0009 — Offline engine: our own, in the content browser, no binary

- **Status:** Accepted
- **Date:** 2026-08-28
- **Implements:** the deferred half of [ADR 0008](0008-offline-mode.md)

## Context

Play-against-the-computer offline is now in scope. [ADR 0008](0008-offline-mode.md)
deferred it behind conditions; this ADR is the decision that satisfies them.

The naive implementation — `apt install stockfish`, talk UCI from the supervisor — is
the worst available option on every axis that matters here:

- It puts a **chess engine binary on the device**, which is the exact thing
  [ADR 0002](0002-no-engine-on-device.md) exists to prevent
- It requires a **UCI client** in our code, the surface `verify-fairplay.sh` bans
- Stockfish is **GPLv3**, which is a genuine obstacle for a sealed commercial appliance
- Stockfish at low levels plays strong moves punctuated by arbitrary blunders, which is
  a **worse beginner opponent** than something built to be gently bad

## Decision

### The engine is ours, written in JavaScript, and runs in the content browser

There are three browser roles on the device, and the important one is the middle:

| Role | Lifetime | What it may load |
|---|---|---|
| **Launcher browser** | Always running | Loopback launcher UI only. **No engine code is served to it** |
| **Content browser** | Exactly one, or none | **Either** the chess site **or** the local offline board. Never both |
| Captive-portal browser | Short-lived, rare | The portal, then dies |

The offline board and its engine are a page served over loopback and opened in the
**content browser** — the same single process slot that otherwise shows the chess site.

### Why this satisfies the ADR 0008 conditions better than a separate engine process

**There is no engine binary on the device.** Nothing to find, nothing to exec, nothing
for `apt list` to reveal. The engine is a few files of our own JavaScript that only
exist inside a page.

**The exclusion is structural, not procedural.** Online and offline are the same
process slot. One content browser exists at a time, so the engine cannot be running
during an online game — not because we remember to stop it, but because the thing it
lives inside has been replaced.

**Chromium managed policy enforces it a second time, in both directions.** During
online play the content browser's `URLAllowlist` contains only the chess origin, so the
offline board's loopback URL is **blocked by the browser**. During offline play the
allowlist contains only the loopback offline path, so the chess site is blocked. Each
mode is default-deny against the other.

**systemd `Conflicts=` is the third layer**, covering the case where something tries to
start both units.

**No UCI anywhere.** Because the engine is ours and in-process, there is no engine
protocol to speak. The `UCI_CLIENT` ban in `verify-fairplay.sh` can stay absolute
forever rather than needing a carve-out — which is exactly what ADR 0008 worried about.

That is a materially stronger position to take to a fair-play reviewer than "we
install Stockfish but promise to kill it."

### Design of the engine itself

Deliberately small, and deliberately beatable:

- **Rules:** `chess.js` (BSD-2-Clause) for move generation, check/checkmate, draws.
  Rules are not evaluation — see [ADR 0008](0008-offline-mode.md). Writing correct move
  generation ourselves would be weeks of subtle bugs for no benefit.
- **Evaluation:** material plus piece-square tables. No NNUE, no tablebases, no opening
  book.
- **Search:** negamax with alpha-beta and simple capture-first move ordering.
- **Difficulty is not just depth.** A shallow-but-perfect engine still feels inhuman.
  Levels combine search depth with a *selection* policy that picks from ranked moves
  with controlled randomness, so a beginner level makes plausible mistakes rather than
  playing perfectly to depth 1.
- **Deterministic under test.** The random number generator is injected, so every
  level's behaviour is reproducible in CI.

### Measured consequence: budget, not depth

Building this surfaced a result worth recording, because it changed the design.

With `chess.js` on Node 24, per call: `moves({verbose: true})` costs **815 µs**,
`move()`+`undo()` 143 µs, `board()` 1.5 µs, and our `evaluate()` **2.8 µs**. The cost
is chess.js generating SAN at every node — our evaluation is three orders of magnitude
cheaper and is not worth optimising. Fixed depth 4 from the opening took **7.6 s** for
only 17k leaves: alpha-beta prunes fine, each node is simply expensive.

A fixed depth that feels responsive on a laptop would therefore leave a player waiting
half a minute on a Pi. **Levels are defined by a wall-clock budget with a depth cap**,
and iterative deepening takes whatever depth fits. The same code adapts to hardware we
have not benchmarked yet, which matters because the Pi is still on order.

Known limitation to re-check on hardware: in a middlegame even the top level only
reaches depth 2 within budget *on a desktop*. On the Pi the top levels may not be
meaningfully harder than the middle ones. `offline/bench.mjs` exists to measure this on
the device; if a level is stuck at depth 1, raise its budget or delete the level rather
than shipping a difficulty setting that does nothing.

### Assets

The board and pieces are ours to choose and must not be any platform's. Whatever set is
used, **record its licence in the repo when it is added.** Prefer a CC0 or BSD set over
CC-BY-SA, because share-alike on artwork is an avoidable complication for
[stage 3](0007-build-stages.md).

## Consequences

- ADR 0002's invariant survives intact in the form that actually matters: **no chess
  engine binary is installed on the device**, and no engine can run during online play.
- `verify-fairplay.sh` needs no carve-out. Engine binaries, tablebase/NNUE data and the
  UCI client surface all stay permanently banned.
- The engine is testable on a laptop with `node --test`, with no hardware, which makes
  it the right thing to build while waiting for parts.
- Engine strength is capped by JavaScript and a simple evaluation. That is a feature:
  the opponent is meant to be beatable by a child, and a strong engine would be both
  worse product and worse optics.
- One genuine limitation to state plainly: a page in a browser is a weaker technical
  boundary than a killed process would be *if* an attacker controls the device. The
  threat here is not an attacker — it is a fair-play reviewer asking whether the device
  can assist during a rated game, and for that question "the engine's page is blocked by
  browser policy and no engine binary exists" is a good answer.

## Verification

- [ ] During online mode, navigating the content browser to the offline board's loopback
      URL is **blocked by policy** — demonstrated, not asserted
- [ ] During offline mode, navigating to the chess site is blocked by policy
- [ ] `find / -name '*stockfish*'` and equivalents return nothing on a provisioned device
- [ ] Only one content browser process exists at any time
- [ ] `verify-fairplay.sh` passes with the engine present, with no carve-out added
