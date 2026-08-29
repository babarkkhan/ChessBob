# ADR 0006 — Power topology for Pi 5 + 7" display

- **Status:** **Open. The 2026-08-29 measurement was INVALID** — taken on the wrong
  power supply — and is retained only as a record of what not to do. The primary
  topology has not yet been fairly tested.
- **Date:** 2026-08-28
- **Updated:** 2026-08-29 with bench measurements from the actual hardware
- See also [`hardware/display-A1-7inch-V13.md`](../../hardware/display-A1-7inch-V13.md)

## ⚠ Read this before connecting anything

The display vendor's documentation says:

> "Do not connect the power supply to Raspberry Pi 4B's USB-C port, the screen will
> offer the power to bring up Raspberry Pi."

That is a **Raspberry Pi 4** instruction and it is wrong for a Pi 5. Separately, the
vendor's **"0.5 A max"** current figure is explicitly a standby number; early readings
suggest real operating draw is several times higher, though no valid measurement exists
yet. Neither figure should be used for sizing anything.

## Context

A Raspberry Pi 5 negotiates its power budget over USB-C PD. With the official 27 W
(5 V/5 A) supply it permits **1.6 A total across its USB-A ports**. With anything it
cannot negotiate 5 A from it drops to a restricted profile and limits total USB current
to 600 mA.

The controller board (`A1-7inch-V13`) has **exactly one USB-C port, silkscreened
`DC5V POWER & TOUCH`.** Power and USB touch data share that single connector, so there
is no way to feed the panel separately while routing touch to the Pi. That forced the
whole display load onto the Pi's USB-A budget.

The open question is whether that budget is big enough. **It has not yet been answered**
— the one attempt to measure it was made on the wrong power supply.

## Measurements — 2026-08-29 — INVALID, DO NOT ACT ON

**The Pi was powered from an old Raspberry Pi microUSB supply through a passive
microUSB-to-USB-C adapter, not the official 27 W PSU.** The readings below therefore
measure the supply, not the display, and the conclusion drawn from them was wrong. They
are kept because the failure mode is instructive, not because the numbers say anything
about the panel.

Bench rig as actually configured: Pi 5 Model B Rev 1.0, **old microUSB Pi PSU
(5 V/2–2.5 A, 10–12.5 W) via a passive adapter**, Active Cooler, third-party case.
Inline USB meter between the Pi's USB-A port and the display's USB-C.

| Condition | Bus voltage | Current | Outcome |
|---|---|---|---|
| Pi idle, display off-budget (PMIC `EXT5V_V`) | 5.06 V | — | stable |
| Backlight 50% | 4.9 V | **1.3 A** | holding |
| Backlight 75% | 4.8 V | **1.4–1.6 A** | holding, visible droop |
| Backlight 95% | — | — | **system restart** |

### Why these numbers say nothing about the display

Three independent faults in the supply path, any one of which explains the restart:

1. **Wattage.** An old Pi microUSB supply is 10–12.5 W. A Pi 5 under load draws roughly
   7–10 W on its own, and the display was pulling ~6.5 W at half brightness. Demand at
   95% brightness was around 15 W from a 12.5 W supply. It browned out because it ran
   out of watts.

2. **No PD negotiation, so the USB budget was 600 mA — not 1.6 A.** The Pi 5 sets its
   USB-A budget by negotiating over USB-C's CC pins. A passive microUSB-to-USB-C adapter
   has no PD controller, so the Pi sees a dumb 5 V source and drops to the restricted
   profile. The display drawing 1.3 A was already roughly double what the Pi believed it
   could supply.

3. **Connector and cable resistance.** microUSB-B is rated to about 1.8 A, and older Pi
   cables commonly use thin power conductors. The observed sag from 5.06 V idle to 4.8 V
   is substantially the *adapter and cable*, not the panel.

The experiment answered "can a 12.5 W microUSB supply run a Pi 5 plus a 7-inch display?"
— obviously not. It did **not** answer the real question: whether the display exceeds a
properly-supplied Pi 5's 1.6 A USB-A budget.

## Decision — deferred pending a valid retest

**Retest on the official 27 W (5 V/5 A) PSU before deciding anything. Do not buy a hub
yet.**

The question is genuinely open. The display's ~1.3–1.6 A sits right at the edge of the
Pi 5's 1.6 A budget, so the primary topology may still fail — but it may equally pass
with headroom once the Pi can actually negotiate 5 A. Buying hardware to solve a problem
that has not been demonstrated is how a BOM fills with parts nobody needs.

### Retest procedure

1. Fit the **official 27 W PSU**. Confirm the Pi accepted it:
   `dmesg | grep -iE 'power|current'`. A warning that the supply cannot provide 5 A means
   the budget is still 600 mA and the test is invalid again.
2. Re-measure all four brightness points with the inline meter.
3. Confirm `throttled` stays `0x0` at 100% brightness.

**If the display peaks comfortably under ~1.5 A with nothing throttling**, the primary
topology holds and no hub is needed.

**Only if it still exceeds the budget or the rail sags**, fall back to:

```
[Official 27 W 5V/5A PSU] ──> [Pi 5 USB-C power in]
[Pi 5 micro-HDMI 0]       ──> [Display HDMI-IN]

[Pi 5 USB-A] <──data──> [powered USB hub] <──data+power──> [Display USB-C]
                              ^
                        [hub's own 5V PSU, >= 3A]
```

The hub's supply carries the display's current; only data passes to the Pi.

**Requirements for the hub:**

- **Must not back-feed** power into the Pi's USB-A port. This is the one property that
  actually matters and the one cheap hubs get wrong.
- Own supply rated **5 V / 3 A or better** — the panel peaks around 1.6 A+ and headroom
  costs nothing.
- USB 2.0 is sufficient. Touch is a low-bandwidth HID device; USB 3 buys nothing here
  and adds 2.4 GHz noise near the Pi's antenna.
- Must pass USB HID reliably. Some cheap hubs are unreliable with touch digitisers.

A **USB power-injector Y-cable** (data from the Pi, power from a separate supply,
merged into one USB-C) is a cheaper alternative that solves the same problem. It is
listed as an alternative rather than the recommendation because back-feed behaviour on
those cables is inconsistent and rarely documented.

## Rejected regardless of the retest: a second PSU into the display

Not possible. The display has one USB-C and it carries touch as well as power, so there
is no port to feed independently. This follows from the board layout alone and does not
depend on any measurement, so it holds regardless of how the retest goes.

## Consequences

- **The BOM does not change yet.** A powered USB hub stays a contingency until a valid
  measurement demands one. A second bare 5 V PSU is wrong in any case.
- **The enclosure is still blocked on this ADR.** If the retest passes, one power entry
  suffices; if it fails, the design needs a second entry plus somewhere to mount a hub.
  That is exactly why enclosure work waits for this answer.
- **Brightness is not a free variable.** Even on the most favourable reading, the panel
  at full brightness is a multi-watt load on a shared 5 V rail. Any battery-powered
  variant is off the table without a rethink.
- **Stage 3 implication, independent of the retest.** A retail product should not ship a
  Pi, a display, a PSU and possibly a hub as four boxed items sharing one marginal 5 V
  rail. A custom power distribution board with one input and two protected rails is the
  right answer at that stage, as [ADR 0007](0007-build-stages.md) anticipated.
- **Interim working configuration:** the rig is usable at **≤50% brightness** on the
  microUSB supply. Do not soak on it — that measures the supply, not the device.
- **A laptop-style USB-C hub with PD passthrough is not the answer**, even if a hub is
  eventually needed. Those exist to push power *up* the cable to charge a host laptop,
  which is exactly the back-feeding this ADR forbids. The right part is a classic
  self-powered hub with its own DC barrel-jack supply, where power flows downstream only.

## Follow-up

- [ ] **Retest on the official 27 W PSU** — supersedes everything below
- [ ] Confirm via `dmesg` that the Pi negotiated a 5 A supply, not a default profile
- [ ] Confirm the Pi's USB-A draw drops to ~0 with the hub in place
- [ ] Check the microSD filesystem after the brownout restart — sudden power loss during
      a write is exactly how cards corrupt, and this is an argument for the read-only
      or overlay root that Phase 3 already plans
- [ ] Re-run the 2-hour soak at 100% brightness once the hub is fitted
