# Build plan — stage 1

The single place to look for "what am I doing next". Stage 1 only: a desk prototype for
one adult ([ADR 0007](adr/0007-build-stages.md)). The family device is stage 2 and its
requirements are deferred, not forgotten.

Hardware bring-up steps live in [`getting-started.md`](getting-started.md). Test
procedures live in [`test-plan.md`](test-plan.md).

---

## Where things stand

| | Status |
|---|---|
| Repo, ADRs, fair-play CI | ✅ done |
| Display board identified, power topology settled | ✅ done — [ADR 0006](adr/0006-power-topology-pi5.md) |
| Offline engine + tests | ✅ done — 17 tests, [`offline/`](../offline/README.md) |
| Parts ordered | ⬜ blocked on you |
| Phase 0 bring-up | ⬜ blocked on parts |
| Everything else | ⬜ blocked on Phase 0 |

**The critical path runs through hardware.** Software that can be written without the Pi
is being written first, deliberately, because the parts have not arrived.

---

## Track A — hardware (blocked on parts)

Full procedure in [`getting-started.md`](getting-started.md). Two blocking gates:

**A1. Power measurement.** The display's single USB-C carries power *and* touch, so the
whole display load sits on the Pi's USB-A budget with no way to offload it. Measure
peak draw at full brightness with speakers driven. Closes
[ADR 0006](adr/0006-power-topology-pi5.md).

**A2. On-screen keyboard.** Squeekboard renders below fullscreen Chromium on labwc. Five
approaches to work through; if all five fail, stop and re-plan input before spending
anything on an enclosure.

Then: display/touch validation, the `ddcutil` backlight test, a two-hour soak, and 20
boot cycles.

**Also run on the Pi:** `node offline/bench.mjs`. The engine's difficulty levels are
tuned against a wall-clock budget and have only been measured on a desktop.

---

## Track B — software (unblocked, do while waiting)

Ordered by value, and by how little each depends on hardware decisions.

### B1. Offline board UI ✅ engine done, UI next

The engine works and is tested. What it needs is a board to live in:

- Board rendering at 1024×600, square, ≥480 px, touch-friendly
- Tap-to-select, tap-to-move. **Not** drag — drag competes with edge gestures on a
  touchscreen
- Legal-move highlighting, check indication, promotion picker
- Two modes: **two-player on one screen**, and **vs computer** with a level picker
- Game-over states, new game, undo
- Assets: a CC0 or BSD piece set, **licence recorded when added**

Fully testable on a laptop in a browser. This is the best use of time until parts land.

### B2. Local device API + supervisor skeleton

- Loopback bind, per-boot token, `Origin` validation, POST-only state changes, every
  action allowlisted
- State machine per [`architecture.md`](architecture.md), including `OFFLINE_PLAY`
- `apply-policy <mode>` and `launch-content-browser <mode>` — the two scripts the
  systemd units call
- The precondition that **refuses to go online while an offline browser exists**

Depends on B1 only loosely. The browser-launch specifics may change based on the OSK
spike (A2), so build the shape and leave the flags configurable.

### B3. Launcher shell

Stage 1 is single-profile with no parent gate, so this is small: Play online, Play
offline, Wi-Fi status, restart browser, version, shutdown. Recovery screens matter more
than the home screen.

`RECOVERY_OFFLINE` should offer **Play offline** rather than apologising — that is the
whole point of having built B1.

### B4. Provisioning

Reproducible from the repo, no secrets, no undocumented manual steps. Reads
`config.local.json`; `config.example.json` is the tracked template.

---

## Deliberately not doing yet

| Not doing | Why |
|---|---|
| Profile picker, parent PIN, per-profile isolation | Stage 2 — [ADR 0007](adr/0007-build-stages.md) |
| ChessKid default / under-13 acknowledgment flow | Stage 2 |
| Signed updates, A/B images, full hardening | Phase 3, and stage 2 for the strict parts |
| Enclosure | Blocked on A1. A **back panel** is worth doing sooner — the PCB is bare |
| NVMe | Only if Phase 3 boot measurements demand it |
| PubAPI client | No feature needs it |
| Partner application | Drafted, on hold at your request |

---

## Standing rules

These are not staged and do not get relaxed for convenience:

- **No chess engine binary on the device.** The offline engine is JavaScript in a page
  ([ADR 0009](adr/0009-offline-engine-design.md))
- **The supervisor never inspects page content** ([ADR 0003](adr/0003-supervisor-never-inspects-page-content.md))
- **No platform assets or marks** — no Chess.com or ChessKid palettes, pieces or sounds
- **No secrets in the repo**, and it is public
- **Licence recorded for every bundled dependency at the time it is added**
- `scripts/verify-fairplay.sh` passes, with no carve-outs added to make something fit
