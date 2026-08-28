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

| Item | Expected | Observed |
|---|---|---|
| Pi model / revision (`cat /proc/cpuinfo`, `cat /proc/device-tree/model`) | Raspberry Pi 5 Model B Rev 1.x, BCM2712 | |
| RAM (`free -h`) | 4 GB LPDDR4X | |
| Display SKU (printed on the unit) | EP-0177 | |
| Display port arrangement | **Does one USB-C carry both touch and power?** | |
| Supplied HDMI cable type | Full-size HDMI + micro-HDMI adapter | |
| Supplied USB cable — data or charge-only? | Must be data | |

📷 Attach photographs of the display label and the Pi board to this directory.

---

## 0.2 Power spike (blocking)

Read [ADR 0006](adr/0006-power-topology-pi5.md) first. **The vendor wiki's
instruction is wrong for a Pi 5 — do not power the Pi from the screen.**

### Topology under test

```
[Official 27 W 5V/5A USB-C PSU] ──> [Pi 5 USB-C]
[EP-0177 touch + power]         ──> [Pi 5 USB-A]
[EP-0177 HDMI]                  <── [Pi 5 micro-HDMI 0]
```

### Measurements

Requires an inline USB power meter. Phase 0 cannot be closed without one.

| Condition | Expected | Measured V | Measured A |
|---|---|---|---|
| Display idle, backlight minimum | | | |
| Display idle, backlight 100% | | | |
| Backlight 100% + both speakers at full volume | vendor claims 0.5 A "standby" — expect more | | |
| Above + Chromium rendering a board | | | |

**Decision point:** if peak exceeds ~1.2 A, switch to the fallback topology in ADR 0006
(separate 5 V/3 A supply for the display) — which is only possible if 0.1 confirmed
that touch data is available without power on that same port.

### Soak

Two hours of Chromium at maximum brightness on a chess page.

```bash
while true; do date; vcgencmd measure_temp; vcgencmd get_throttled; sleep 30; done | tee soak.log
```

| Check | Pass condition | Result |
|---|---|---|
| `vcgencmd get_throttled` | `0x0` throughout | |
| Peak SoC temperature | no thermal throttle flag | |
| `dmesg` USB resets | none | |
| `dmesg` undervoltage | none | |
| Chromium RSS drift over 2 h | no unbounded growth | |

**Exit:** `throttled=0x0`, no USB resets, no undervoltage.

---

## 0.3 On-screen keyboard spike (blocking, go/no-go)

### The known problem

Raspberry Pi OS 6.2 defaults to **labwc on Wayland**. Squeekboard is hardcoded to the
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
| Resolution | native 1024×600, no scaling | |
| Refresh | 60 Hz | |
| Multitouch | 2+ points register | |
| Touch mapping | correct after reboot | |
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
