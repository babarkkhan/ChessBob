# Phase 0 — Hardware bring-up

Two spikes in this phase are **blocking**: power topology and the on-screen keyboard.
Neither the enclosure nor the supervisor should be started until both are closed.

Fill this document in as you go. It is the record, not a template to be copied
elsewhere.

---

## 0.1 Identify the hardware

Do this before ordering anything else. Marketplace listings for this display
contradict the manufacturer's own wiki, and the seller screenshot for the Pi claimed
`ARMv7`, `DDR4`, and `4 GB storage` — all three are wrong for a Pi 5.

| Item | Expected | Observed 2026-08-29 |
|---|---|---|
| Pi model / revision | Raspberry Pi 5 Model B Rev 1.x | ✅ **Rev 1.0**, BCM2712 |
| RAM | 4 GB LPDDR4X | ✅ 3.9 GiB usable |
| OS | current 64-bit Pi OS | ✅ Debian 13 (trixie), kernel 6.18.34+rpt-rpi-2712 aarch64 |
| Display board marking | EP-0177 | ⚠️ **`A1-7inch-V13`** — no EP-0177 marking; generic OEM board, RTD2660H scaler |
| Display port arrangement | does one USB-C carry both? | ⚠️ **Yes** — single USB-C `DC5V POWER & TOUCH` |
| Supplied USB cable — data or charge-only? | must be data | ✅ data — touch enumerates |
| Boot media | high-endurance A2 microSD | ✅ `/dev/mmcblk0p2`, 117 G, 5% used |

📷 Attach photographs of the display label and the Pi board to this directory.

---

## 0.2 Power spike (blocking)

Read [ADR 0006](adr/0006-power-topology-pi5.md) first. **The vendor wiki's
instruction is wrong for a Pi 5 — do not power the Pi from the screen.**

### Topology tested — REJECTED

```
[Official 27 W 5V/5A USB-C PSU] ──> [Pi 5 USB-C]
[Display touch + power]         ──> [Pi 5 USB-A]      <-- exceeds the 1.6 A budget
[Display HDMI]                  <── [Pi 5 micro-HDMI 0]
```

### Required topology

```
[27 W PSU]   ──> [Pi 5 USB-C]
[Pi 5 USB-A] <──data──> [powered USB hub] <──data+power──> [Display USB-C]
                             ^
                       [hub's own 5 V / 3 A+ PSU]
```

### Measurements

Requires an inline USB power meter. Phase 0 cannot be closed without one.

**Measured 2026-08-29 — INVALID.** Taken on an old microUSB Pi supply via a passive
adapter, not the official 27 W PSU. Retained as a record of the failure mode only; see
[ADR 0006](adr/0006-power-topology-pi5.md) for why these numbers say nothing about the
display, and for the retest procedure.

| Condition | Bus voltage | Current | Outcome |
|---|---|---|---|
| Pi idle (PMIC `EXT5V_V`) | 5.06 V | — | stable |
| Backlight 50% | 4.9 V | **1.3 A** | holding |
| Backlight 75% | 4.8 V | **1.4–1.6 A** | holding, visible droop |
| Backlight 95% | — | — | **system restart** |

On a supply the Pi cannot negotiate 5 A from, the USB-A budget is 600 mA rather than
1.6 A, and the ~15 W total demand at 95% brightness exceeded the 12.5 W supply outright.
The sag from 5.06 V to 4.8 V is substantially the adapter and cable.

**Retest on the official 27 W PSU before concluding anything.**

**Do not run the soak until the hub is fitted.** A soak at 50% brightness proves
nothing about the shipping configuration.

### Soak

Two hours of Chromium at maximum brightness on a chess page.

```bash
while true; do date; vcgencmd measure_temp; vcgencmd get_throttled; sleep 30; done | tee soak.log
```

| Check | Pass condition | Result |
|---|---|---|
| `vcgencmd get_throttled` | `0x0` throughout | ✅ at idle; ⬜ under soak |
| Active Cooler running | fan spins under load | ✅ 2382 RPM at 49.9 °C, `pwm-fan` state 1/4 |
| Peak SoC temperature | no thermal throttle flag | |
| `dmesg` USB resets | none | |
| `dmesg` undervoltage | none | |
| Chromium RSS drift over 2 h | no unbounded growth | |

**Exit:** `throttled=0x0`, no USB resets, no undervoltage.

---

## 0.3 On-screen keyboard spike (blocking, go/no-go)

### The known problem

Raspberry Pi OS (Debian 13 trixie, confirmed on this device) defaults to **labwc on Wayland**. Squeekboard is hardcoded to the
`top` layer; fullscreen and `--kiosk` Chromium sit above it, so **the keyboard never
becomes visible.** Reported upstream at
[labwc#2926](https://github.com/labwc/labwc/issues/2926) and on the
[Raspberry Pi forums](https://forums.raspberrypi.com/viewtopic.php?t=390053).

The original plan's Phase 1 gate — "login works without a hardware keyboard" — is not
achievable with the default stack. This spike decides how we get there.

### Approaches, in order

| # | Approach | Result | Notes |
|---|---|---|---|
| 1 | `wvkbd` forced to the **overlay** layer | | Most likely to work; targets exactly this case |
| 2 | Chromium fullscreen-undecorated instead of `--kiosk` | | Cheap to test; changes the layer interaction |
| 3 | labwc layer-order configuration | | Check whether a config knob exists before patching |
| 4 | `cage` or `sway` with an explicit layer rule | | Swaps compositor: more control, more to own |
| 5 | Launcher-owned sign-in mode | | We compose a windowed browser above our own keyboard pane. Always works, most build effort |

### Acceptance test

Using **touch only**, with no hardware keyboard attached:

- [ ] Open a real ChessKid login page in fullscreen Chromium
- [ ] Focus the username field — keyboard appears **above** the browser
- [ ] Type a full username
- [ ] Type a password containing an uppercase letter, a digit, and a symbol
- [ ] Submit and reach a signed-in state
- [ ] Repeat on Chess.com's login, including a 2FA code field
- [ ] Keyboard dismisses cleanly and the board is fully visible afterwards

📷 Photograph or record the successful sign-in. This is the phase evidence.

**If all five approaches fail:** stop. Do not proceed to Phase 1. Re-plan the input
approach — a small hardware keyboard in the box, or a companion-phone sign-in, are
both worse products but they are products. Discovering this in Phase 1 costs a week.

---

## 0.4 Display and touch

| Check | Pass condition | Result |
|---|---|---|
| Resolution | native 1024×600, no scaling | ✅ preferred mode reported as 1024x600 on `card1-HDMI-A-1` |
| Refresh | 60 Hz | ⬜ confirm in a desktop session |
| Touch detected | USB HID enumerates | ✅ `ILITEK-TOUCH`, USB `222a:0001 ILI Technology Multi-Touch Screen` |
| Multitouch | 2+ points register | ⬜ |
| Touch mapping | correct after reboot | ⬜ |
| Touch mapping after rotation | correct, or rotation ruled out | |
| Audio out | plays; mute state visible | |
| Audio on boot | does **not** start unexpectedly | |
| Backlight control | adjustable from software, or documented as OSD-only | |

### Layout check at 1024×600

Load ChessKid and Chess.com at native resolution with no browser chrome:

| Check | Target | ChessKid | Chess.com |
|---|---|---|---|
| Board stays square | | | |
| Board width | ≥ 480 px | | |
| Clock visible without scrolling | | | |
| Move controls reachable | | | |
| Resign/draw not accidentally tappable | | | |
| No edge gesture fires during a drag | | | |

Try portrait as an experiment. Keep it only if the board is genuinely larger **and**
the responsive layout, cable routing, and enclosure all remain better.

---

## 0.5 Boot and shutdown cycles

Twenty clean power-on → usable → graceful shutdown cycles.

| Cycle | Boot time (s) | Clean shutdown | Notes |
|---|---|---|---|
| 1–20 | | | |

**Measure boot time; do not gate on it.** The original 35 s target is optimistic
(40–55 s is the honest range for Pi 5 + microSD + Wayland + Chromium first paint), and
it is the wrong lever — a family appliance should blank and wake, not reboot. Boot
time is revisited in Phase 3, with NVMe held in reserve.

---

## Phase 0 exit gate

- [ ] Exact SKUs and port arrangement recorded, with photographs
- [ ] `vcgencmd get_throttled` = `0x0` after the 2-hour soak
- [ ] No undervoltage or USB resets in `dmesg`
- [ ] Peak display current measured and topology decided; ADR 0006 closed
- [ ] **An on-screen keyboard completes a real sign-in, touch only** — with evidence
- [ ] Touch mapped correctly after reboot
- [ ] 20 clean boot/shutdown cycles
- [ ] Board renders ≥ 480 px square on at least ChessKid at native resolution
