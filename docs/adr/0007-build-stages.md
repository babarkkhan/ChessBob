# ADR 0007 — Three build stages, and what each one owes

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

The project has been planned as though one device is being built. It isn't. There are
three, with different users, different risk profiles, and different obligations:

1. A prototype on Babar's desk, used by Babar.
2. A family device used by children.
3. A commercial product, possibly manufactured in China.

Earlier ADRs ([0004](0004-multi-profile-family-device.md),
[0005](0005-chesskid-default-chesscom-parent-gated.md)) were written for stage 2 and
loaded stage 1 with parent gates, PIN backoff, under-13 acknowledgment flows and
per-profile session isolation. None of that is needed to get a Pi booting into a chess
board on a desk, and building it first delays the only thing that currently matters:
finding out whether the hardware and the on-screen keyboard work at all.

## Decision

Work is staged. Each stage is allowed to be genuinely simpler than the next, and the
requirements deferred are recorded rather than forgotten.

### Stage 1 — Bench prototype (current)

**User: Babar. Location: a desk. Risk: none.**

- **Single profile.** No picker, no parent PIN, no acknowledgment flow
- **One destination**, configured in a file — Chess.com is fine, since the user is an adult
- No play-time limits, no per-profile wipe, no session isolation work
- SSH on, password auth, whatever is convenient
- No enclosure beyond a back panel to stop the exposed PCB shorting on the desk
- **Keep:** origin pinning by managed policy (it costs nothing and it's how the browser
  gets locked down anyway), and every fair-play boundary in
  [ADR 0002](0002-no-engine-on-device.md) and [ADR 0003](0003-supervisor-never-inspects-page-content.md)

The fair-play and page-inspection boundaries are **not** staged. They are cheap to hold
from the start and expensive to retrofit, and they are what the partner conversation
rests on.

### Stage 2 — Family device

**Users: 2–4 children under 13. Risk: real.**

Everything in [ADR 0004](0004-multi-profile-family-device.md) and
[ADR 0005](0005-chesskid-default-chesscom-parent-gated.md) becomes required:
profile picker, parent PIN gate, ChessKid default, Chess.com behind the under-13
acknowledgment, per-profile browser profiles and wipe, play-time limits, and the
hardening checklist in [`threat-model.md`](../threat-model.md).

Also required before a child touches it: a proper back panel, captive fasteners,
inaccessible microSD, and strain relief.

### Stage 3 — Commercial

**Risk: regulatory, legal, supply-chain.**

Not planned in detail here. What stage 1 and 2 must not do is make stage 3 impossible:

- **No platform assets or marks** anywhere, at any stage, without written permission
- **Licence hygiene from the start** — every bundled dependency's licence recorded.
  This matters more than it looks; see [ADR 0008](0008-offline-mode.md) on GPL and
  chess engines
- Neutral branding; the "not affiliated" notice stays until permission says otherwise
- Regulatory work (EMC, radio, power-supply safety, RoHS/WEEE, packaging, warranty)
  belongs here and nowhere earlier
- Contract manufacture means the provisioning must be reproducible from the repo, with
  no secrets in it and no undocumented manual steps

## Consequences

- **Phase 1 gets substantially smaller.** Single profile, no gate, no acknowledgment
  screen. Get to "boots into a chess board" and stop.
- ADRs 0004 and 0005 are not wrong and are not withdrawn — they are stage 2, and the
  design work in them stands.
- Anything built at stage 1 that stage 2 will need should be built so it *can* grow: a
  single profile is a list of one, not a hardcoded path. That's a naming discipline,
  not extra work.
- When something is deferred, it gets deferred **here**, in writing, rather than
  silently dropped.

## Deferred to stage 2 — the list

| Deferred | From |
|---|---|
| Profile picker and multiple profiles | ADR 0004 |
| Parent PIN gate and backoff | ADR 0004 |
| Per-profile browser profiles and session isolation | ADR 0004 |
| Per-profile wipe | ADR 0004 |
| Play-time limits | ADR 0004 |
| ChessKid-default / Chess.com acknowledgment flow | ADR 0005 |
| Full hardening checklist (SSH off, firewall, signed updates) | threat-model.md |
| Enclosure, captive fasteners, inaccessible microSD | bom.md |
