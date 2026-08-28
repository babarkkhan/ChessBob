# ADR 0002 — No chess engine on the device, at all

- **Status:** Accepted. Amended by [ADR 0008](0008-offline-mode.md) — offline two-player needs no engine and leaves this unchanged; offline *engine* play is deferred behind the conditions this ADR sets out, made concrete there.
- **Date:** 2026-08-28

## Context

A device that plays online chess and also contains a chess engine is, from the
perspective of a fair-play team, indistinguishable from a cheating appliance. It does
not matter that the engine is "only for offline analysis" or "disabled during online
play" — the presence of the binary is the problem, because the promise that it stays
off is unverifiable by anyone outside the project.

This risk is amplified by the target user: children. A device marketed to families
that could assist a child in a rated game is worse than useless; it is actively
harmful to the child's account and to the project's credibility.

## Decision

**No chess engine, tablebase, opening book, evaluation function, or move-suggestion
mechanism is installed on the device.** Not disabled. Not present-but-unused. Not
shipped and gated. Absent.

This covers, non-exhaustively: Stockfish, Fairy-Stockfish, Leela Chess Zero, GNU
Chess, Crafty, Komodo, and any library that computes an evaluation or a best move.

The device also provides no mechanism by which an external suggestion could reach the
screen: no second window, no overlay, no notification surface, no remote display, no
clipboard bridge, no companion app.

## Enforcement

This is checked mechanically rather than asserted. [`scripts/verify-fairplay.sh`](../../scripts/verify-fairplay.sh)
fails the build if an engine package name appears in any provisioning manifest or
dependency list, and runs in CI on every push.

The check existing and passing is itself the artifact we bring to a partner
conversation. A promise in a README is worth very little; a red CI badge is worth
something.

## If offline analysis is ever wanted

It is not in scope, and adding it would require all of:

1. A visibly different device mode with its own distinct appearance.
2. A hard process-level boundary: entering online play terminates engine processes
   and removes their UI, verified by test.
3. Written review by the chess platform before shipping.

Absent all three, the answer is no.

## Consequences

- No post-game analysis, no puzzle hints beyond what the site itself provides, no
  "play the computer" mode outside of what the website offers.
- The fair-play story becomes simple enough to state in one sentence, which matters
  more than any feature we would have gained.
