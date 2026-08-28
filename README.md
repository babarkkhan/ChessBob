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

## Who it's for

A household with 2–4 children sharing one device. Because of this, **ChessKid.com is
the default destination for every profile.** Chess.com requires users to be 13 or
older; a Chess.com profile can only be created behind the parent gate, after an
explicit acknowledgment of that requirement.

See [`docs/child-safety.md`](docs/child-safety.md).

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
