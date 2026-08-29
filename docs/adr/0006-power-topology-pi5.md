# ADR 0006 — Power topology for Pi 5 + 7" display

- **Status:** **Primary topology measured and REJECTED, 2026-08-29.** The powered-hub
  fallback is now required.
- **Date:** 2026-08-28
- **Updated:** 2026-08-29 with bench measurements from the actual hardware
- See also [`hardware/display-A1-7inch-V13.md`](../../hardware/display-A1-7inch-V13.md)

## ⚠ Read this before connecting anything

The display vendor's documentation says:

> "Do not connect the power supply to Raspberry Pi 4B's USB-C port, the screen will
> offer the power to bring up Raspberry Pi."

That is a **Raspberry Pi 4** instruction and it is wrong for a Pi 5. Separately, the
vendor's **"0.5 A max"** current figure is a standby number and understates real
operating draw by roughly **3×**, as measured below. Neither figure should be used for
sizing anything.

## Context

A Raspberry Pi 5 negotiates its power budget over USB-C PD. With the official 27 W
(5 V/5 A) supply it permits **1.6 A total across its USB-A ports**. With anything it
cannot negotiate 5 A from it drops to a restricted profile and limits total USB current
to 600 mA.

The controller board (`A1-7inch-V13`) has **exactly one USB-C port, silkscreened
`DC5V POWER & TOUCH`.** Power and USB touch data share that single connector, so there
is no way to feed the panel separately while routing touch to the Pi. That forced the
whole display load onto the Pi's USB-A budget.

The open question was whether the budget was big enough. It is not.

## Measurements — 2026-08-29

Bench rig: Pi 5 Model B Rev 1.0, official 27 W PSU, Active Cooler, third-party case
with cooler cutout. Inline USB meter between the Pi's USB-A port and the display's
USB-C.

| Condition | Bus voltage | Current | Outcome |
|---|---|---|---|
| Pi idle, display off-budget (PMIC `EXT5V_V`) | 5.06 V | — | stable |
| Backlight 50% | 4.9 V | **1.3 A** | holding |
| Backlight 75% | 4.8 V | **1.4–1.6 A** | holding, visible droop |
| Backlight 95% | — | — | **system restart** |

Two things to read from this:

1. **The display alone consumes the entire 1.6 A USB-A budget** by 75% brightness,
   leaving nothing for any other USB device.
2. **Voltage is already sagging under load** — 5.06 V idle down to 4.8 V at 75%. The
   restart at 95% is the rail collapsing, not a clean current-limit cutoff.

Running at ≤50% brightness "works", but with no headroom: any additional USB device, or
a warm day, pushes it over. That is not a design, it is a coincidence.

## Decision

**The display must not be powered from the Pi's USB-A ports.**

Required topology:

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

## Rejected: a second PSU into the display

Not possible. The display has one USB-C and it carries touch as well as power, so there
is no port to feed independently. This was already noted when the board was identified;
the measurements simply confirm the fallback is now mandatory rather than contingent.

## Consequences

- **The BOM changes.** A powered USB hub moves from a tier-3 contingency to a tier-1
  requirement. Do not order a second bare 5 V PSU.
- **The enclosure gains a second power entry**, or houses a single supply feeding two
  protected rails internally. Enclosure design was already gated on this ADR; this is
  the answer it was waiting for.
- **Brightness is not a free variable.** Even with a hub, the panel at full brightness
  is a ~8 W load. Any battery-powered variant is off the table without a rethink.
- **Stage 3 implication.** A retail product should not ship a Pi, a display, a PSU and a
  hub in a box. This measurement is the concrete argument for a custom power
  distribution board with one input and two protected rails, which
  [ADR 0007](0007-build-stages.md) already anticipated for the commercial stage.
- **Interim working configuration:** the bench rig is usable at **≤50% brightness**
  while a hub is sourced. Do not run the soak test until the hub is in place — a soak
  at 50% proves nothing about the shipping configuration.

## Follow-up

- [ ] Source a non-back-feeding powered hub and re-measure all four brightness points
- [ ] Confirm the Pi's USB-A draw drops to ~0 with the hub in place
- [ ] Check the microSD filesystem after the brownout restart — sudden power loss during
      a write is exactly how cards corrupt, and this is an argument for the read-only
      or overlay root that Phase 3 already plans
- [ ] Re-run the 2-hour soak at 100% brightness once the hub is fitted
