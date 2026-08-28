# ADR 0008 — Offline mode

- **Status:** Accepted for local two-player. Engine play **deferred**, with conditions.
- **Date:** 2026-08-28
- **Amends:** [ADR 0002](0002-no-engine-on-device.md)

## Context

The device should be playable without an internet connection. Two reasons, one
obvious and one that only shows up in use:

1. Somewhere without Wi-Fi, or on a network the device can't join.
2. **A browser appliance with no network is a brick.** Wi-Fi drops, routers reboot,
   ISPs fail. Right now the answer to all of those is a recovery screen apologising.

This is a good idea. It also runs straight into the most important constraint in the
project, so it needs stating carefully rather than being waved through.

## The collision

"Play offline" almost always means "play against the computer", and playing against
the computer means **a chess engine on the device** — which is exactly what
[ADR 0002](0002-no-engine-on-device.md) forbids, in the strongest terms available,
because a device that plays online chess *and* contains an engine is
indistinguishable from a cheating appliance to anyone who can't see inside it.

So offline mode has to be split, because the two halves carry completely different
risk.

## An important distinction: rules are not engines

A local board needs to know that a knight moves in an L, that you can't castle through
check, and that this position is checkmate. That is **move legality** — rules.

An engine **evaluates** positions and **searches** for good moves. That is the thing
that can tell a player what to play.

A rules library (`python-chess`, `chess.js`) is legality. Its *UCI client* submodule
(`chess.engine`, `popen_uci`, `SimpleEngine`) is how you talk to an engine, and that
is the dangerous surface — not the library itself.

This distinction is now reflected in
[`scripts/verify-fairplay.sh`](../../scripts/verify-fairplay.sh): rules libraries are
permitted, engine binaries and the UCI client surface are not.

## Decision

### Now — local two-player, no engine

Build a local chess board in the launcher for **two people playing each other on the
same screen**. Legal move generation, check and checkmate detection, a clock, undo,
and a new-game screen.

- Requires **no engine**. ADR 0002 holds completely, unamended
- Works with no network at all
- Fits a tabletop touch device naturally — two people either side of it
- Is genuinely useful when the Wi-Fi is down, which is the failure this is really for

This is the first piece of chess UI we render ourselves, which raises an asset
question — see below.

### Deferred — play against the computer

**Not built yet.** When it is, all of the following are required, and they are the
conditions [ADR 0002](0002-no-engine-on-device.md) already set out, made concrete:

**1. Mutual exclusion enforced by the init system, not by our own care.**

`chessbob-offline.target` and `chessbob-online.target` declare `Conflicts=` on each
other. Entering online mode stops the engine unit; entering offline mode stops the
session browser. systemd, not a Python `if`, is what guarantees they never coexist.

**2. The supervisor verifies before launching, and refuses if it can't.**

Before starting the online session browser, the supervisor enumerates processes and
confirms no engine process exists. If any remain, it **refuses to go online** and says
so. A failure to verify is a refusal, never a warning.

**3. Visibly different modes.**

Offline play looks different — different background, a persistent "Offline practice"
banner. Nobody should be able to glance at the screen and be unsure which mode they're
in.

**4. The transition is a full teardown.**

Switching modes kills processes and restarts, rather than hiding a window. Nothing
from the offline mode survives into an online session.

**5. CI enforces the boundary, not just the absence.**

The fair-play check changes from "no engine anywhere" to "no engine reachable from the
online path": an engine may exist only under a designated directory, and nothing in
`supervisor/`'s online path may import or exec it.

**6. Written review before the combination ships to anyone but Babar.**

Stage 1 is a desk prototype with no rated games at stake, so the risk today is
theoretical. It stops being theoretical at [stage 2](0007-build-stages.md).

## Which engine — decide later, but not Stockfish by default

Two reasons to think about this before reaching for the obvious:

**Licensing.** Stockfish is **GPLv3**. For a locked-down commercial appliance
([stage 3](0007-build-stages.md)) that is a real problem, not a formality — GPLv3's
installation-information requirement means shipping a device the user cannot install a
modified version onto is not compliant. A contract-manufactured sealed appliance
bundling GPLv3 needs legal advice, not an afternoon's reading.

**It's the wrong opponent anyway.** Stockfish at its lowest levels doesn't play like a
weak human; it plays strong moves punctuated by arbitrary blunders. For a beginner
that's a worse experience than a simple engine tuned to be gently bad.

A few hundred lines of minimax with piece-square tables, written for this project,
would beat most beginners, be tunable to a genuinely gentle level, and carry no
licence obligations at all. That is probably the right answer, and it is worth
evaluating properly rather than defaulting.

## Board assets

The local board is our own UI, so it needs pieces and a board. **Not** Chess.com's or
ChessKid's — their palettes, piece designs and sounds are explicitly their IP and the
README's "no platform assets" rule covers this.

Use a clearly-licensed set (the Wikimedia/Cburnett SVG pieces are the usual choice) and
**record the licence in the repo** at the time of adding them, not later. Stage 3
licence hygiene starts here.

## Consequences

- The device stops being a brick when the network fails. That is worth building on its
  own, before any engine question is settled.
- Two-player local play can be built now with no amendment to ADR 0002 and no new risk.
- The engine decision is deferred with its conditions written down, so it can be taken
  deliberately rather than drifted into during a quiet afternoon.
- `verify-fairplay.sh` becomes more precise: it now targets engine binaries and the UCI
  client surface rather than any mention of chess in a dependency name.
- A new state is needed: offline play is not `SESSION`, and the supervisor must know
  which mode it is in — which it can, since mode is process state, not page content
  ([ADR 0003](0003-supervisor-never-inspects-page-content.md) is unaffected).
