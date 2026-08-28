# ChessBob

A dedicated touchscreen chess appliance for families. It boots into a profile picker,
a kid taps their name, and they land in a signed-in chess session — no desktop, no
browser chrome, no keyboard, no computer.

**Status: planning / pre-bring-up.** Nothing here runs yet.

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

- run a chess engine, tablebase, or evaluation of any kind — no engine binary is
  installed on the device at all
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

A browser appliance with no network is a brick, so the device also plays offline —
**two people on the same screen**, with local move validation, a clock and undo. No
engine involved, so [ADR 0002](docs/adr/0002-no-engine-on-device.md) holds unchanged.

Playing *against the computer* would need an engine, which collides directly with that
ADR. It's deferred behind a hard, machine-enforced mode boundary — the conditions are
written down in [ADR 0008](docs/adr/0008-offline-mode.md) so the decision gets taken
deliberately rather than drifted into.

## Hardware

| | |
|---|---|
| Compute | Raspberry Pi 5, 4 GB (BCM2712, Cortex-A76 @ 2.4 GHz) |
| Display | 52Pi / GeeekPi EP-0177 — 7" IPS, 1024×600 @ 60 Hz, capacitive touch, 500 cd/m² |
| OS | Raspberry Pi OS 6.2 (64-bit), labwc / Wayland |
| Storage | High-endurance A2 microSD (NVMe held in reserve) |

Power topology is **not** what the display vendor's wiki says — see
[ADR 0006](docs/adr/0006-power-topology-pi5.md) before plugging anything in.

## Start here

New to the build? [`docs/getting-started.md`](docs/getting-started.md) is the
step-by-step from bare parts to a working bench rig, including what to buy.

## Layout

```
docs/          architecture, ADRs, threat model, child safety, bring-up, test plan
launcher/      touch UI: profile picker, parent gate, setup, recovery
supervisor/    state machine, browser + GPIO + profile control
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
