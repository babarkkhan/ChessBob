# ChessBob

A dedicated touchscreen chess appliance: a Raspberry Pi 5 and a 7" touchscreen that
boots straight into a chess board. No desktop, no browser chrome, no keyboard, no
computer. It plays online through the chess site's own web app, and offline against
a local opponent when there is no network.

**Status: stage 1, pre-bring-up.** The offline engine works and is tested; everything
else is waiting on hardware. See [`docs/build-plan.md`](docs/build-plan.md).

---

## Not affiliated with Chess.com or ChessKid

ChessBob is an independent hobby project. It is **not affiliated with, endorsed by,
sponsored by, or approved by** Chess.com, ChessKid.com, or Chess.com Inc.

This repository contains no Chess.com or ChessKid trademarks, logos, board colour
palettes, piece artwork, sound effects, or other assets, and none will be added
without written permission. "ChessBob" is a neutral working name, not a product name.

---

## What it is

A Raspberry Pi 5 with a 7" capacitive touchscreen, running a locked-down Chromium
session pointed at a chess website. The device owns boot, Wi-Fi, display, touch,
recovery, updates, safe shutdown, and a family profile model. The website owns
everything about the game.

## What it deliberately is **not**

ChessBob does not, and will not:

- **install a chess engine binary** — there is none on the device, and CI fails the
  build if one appears
- speak **UCI**, or ship any engine-client code
- use a tablebase, NNUE, or opening book
- run *any* chess evaluation during online play — the offline opponent is our own
  JavaScript, it lives inside a page, and browser policy blocks that page from loading
  while the chess site is open ([ADR 0009](docs/adr/0009-offline-engine-design.md))
- read, scrape, or inspect the contents of any page
- inject JavaScript, automate moves, or drive the DOM
- intercept, proxy, or inspect network traffic
- handle, store, log, or transmit passwords or two-factor codes
- use any private or undocumented API

These are enforced mechanically, not just promised — see
[`scripts/verify-fairplay.sh`](scripts/verify-fairplay.sh), which runs in CI on
every push. See [ADR 0002](docs/adr/0002-no-engine-on-device.md) and
[ADR 0003](docs/adr/0003-supervisor-never-inspects-page-content.md).

## Build stages

Three devices, not one — see [ADR 0007](docs/adr/0007-build-stages.md).

| Stage | User | What it is |
|---|---|---|
| **1 — bench prototype** ← *current* | One adult, on a desk | Single profile, one destination in config, no parent gate. Get it booting into a board |
| 2 — family device | 2–4 children under 13 | Profile picker, parent PIN, ChessKid default, play limits, proper enclosure |
| 3 — commercial | — | Regulatory, licence hygiene, contract manufacture |

Stage 1 is deliberately simpler than stage 2. **The fair-play and page-inspection
boundaries are not staged** — they're cheap to hold from the start and expensive to
retrofit.

For the family device, **ChessKid.com is the default destination**: Chess.com requires
users to be 13 or older, so a Chess.com profile sits behind the parent gate and an
explicit acknowledgment. See [`docs/child-safety.md`](docs/child-safety.md).

## Offline play

A browser appliance with no network is a brick, so the device also plays offline: **two
people on one screen**, or **against a deliberately beatable opponent**.

That opponent is our own JavaScript, running inside the offline board page — **not** an
engine binary, and not Stockfish. Three independent layers stop it running during an
online game: online and offline share one content-browser process slot; Chromium
managed policy is default-deny in both directions, so each mode's allowlist excludes
the other's URLs; and `Conflicts=` between two systemd units.

Difficulty is a depth cap, a wall-clock budget, and a tolerance in centipawns — not
depth alone, because a shallow-but-perfect engine feels alien rather than weak. It is
meant to be beatable by a beginner; if it ever feels strong, that is a product bug.

[`offline/README.md`](offline/README.md) — runnable on a laptop today.
[ADR 0008](docs/adr/0008-offline-mode.md), [ADR 0009](docs/adr/0009-offline-engine-design.md).

## Hardware

| | |
|---|---|
| Compute | Raspberry Pi 5, 4 GB (BCM2712, Cortex-A76 @ 2.4 GHz) |
| Display | 7" IPS, 1024×600 @ 60 Hz, board rev `A1-7inch-V13`, RTD2660H scaler — [findings](hardware/display-A1-7inch-V13.md) |
| OS | Raspberry Pi OS 6.2 (64-bit), labwc / Wayland |
| Storage | High-endurance A2 microSD (NVMe held in reserve) |

Power topology is **not** what the display vendor's wiki says — see
[ADR 0006](docs/adr/0006-power-topology-pi5.md) before plugging anything in.

## Start here

- [`docs/build-plan.md`](docs/build-plan.md) — what to do next, and what is deliberately not being done yet
- [`docs/getting-started.md`](docs/getting-started.md) — step-by-step from bare parts to a working bench rig, including what to buy
- [`offline/README.md`](offline/README.md) — the offline board and engine, runnable on a laptop today

## Layout

```
docs/          architecture, ADRs, threat model, child safety, bring-up, build plan
offline/       local board + our own engine (no binary, no UCI)
launcher/      touch UI: home, setup, recovery
supervisor/    state machine, browser + GPIO control
packaging/     systemd units, Chromium managed policy, image provisioning
hardware/      BOM, enclosure, test fixture
scripts/       developer and verification commands
tests/         unit, integration, hardware
```

## Contributing / security

Do not commit credentials, keys, PINs, Wi-Fi configuration, or any real person's
name. `config.example.json` is tracked; `config.local.json` is not.

## Licence

[MIT](LICENSE).
