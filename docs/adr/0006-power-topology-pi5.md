# ADR 0006 — Power topology for Pi 5 + EP-0177

- **Status:** Accepted, pending Phase 0 measurement
- **Date:** 2026-08-28

## ⚠ Read this before connecting anything

The display vendor's own documentation gives an instruction that is **wrong for a
Raspberry Pi 5.** Do not follow it.

The 52Pi wiki for the EP-0177 states:

> "Do not connect the power supply to Raspberry Pi 4B's USB-C port, the screen will
> offer the power to bring up Raspberry Pi."

That is a **Raspberry Pi 4** instruction. Following it on a Pi 5 causes real problems.

## Context

A Raspberry Pi 5 negotiates its power budget over USB-C PD. With the official 27 W
(5 V/5 A) supply it permits **1.6 A total across its USB-A ports**. With anything it
cannot negotiate 5 A from — including power arriving through a display's USB
pass-through — it drops to a restricted profile and limits **total USB current to
600 mA**, emits undervoltage warnings, and can reset USB devices under load.

Chromium rendering a chess board is a sustained CPU and GPU load. A Pi 5 in
low-current mode, driving a 500 cd/m² panel with speakers, is exactly the condition
that produces intermittent touch dropouts and unexplained reboots — the kind of fault
that costs days to diagnose because it looks like a software problem.

Back-feeding the Pi's USB-C from the display while a 27 W supply is also attached
means two sources contending on the same rail. Do not do it.

## Decision

**Primary topology, to be validated in Phase 0:**

```
[Official 27 W 5V/5A USB-C PSU] ──> [Pi 5 USB-C power in]
[EP-0177 touch + power]        ──> [Pi 5 USB-A port]   (draws against the 1.6 A budget)
[EP-0177 HDMI in]              <── [Pi 5 micro-HDMI 0]  (right-angle adapter)
```

The 27 W supply is **required, not preferred.** It is the thing that raises the USB-A
budget from 600 mA to 1.6 A, which is what makes powering the display from the Pi
viable at all.

**Never** have the display's power path feeding the Pi's USB-C while the 27 W supply
is attached.

**Fallback topology,** if measured peak draw exceeds roughly 1.2 A:

```
[27 W PSU] ──> [Pi 5 USB-C]
[5 V/3 A PSU] ──> [EP-0177 USB-C power in]
[EP-0177 touch USB] ──> [Pi 5 USB-A]     (data only)
```

The fallback depends on whether the physical unit exposes touch data on a port that
does not also require power from that same port. **This must be confirmed by
photographing the actual unit's ports and label before ordering the second supply.**

## Measurements required to close this ADR

Recorded in [`docs/hardware-bringup.md`](../hardware-bringup.md):

- [ ] Exact SKU from the label on the physical unit
- [ ] Port arrangement: does one USB-C carry both touch and power?
- [ ] Idle draw of the display
- [ ] Peak draw at 100% brightness with both speakers driven at full volume
- [ ] `vcgencmd get_throttled` = `0x0` after a 2-hour Chromium soak
- [ ] No USB reset or undervoltage lines in `dmesg` across that soak

The vendor's published figure is "0.5 A max (standby)". **Standby is not the operating
figure** and must not be used for sizing.

## Consequences

- An inline USB power meter is a required bring-up tool, not optional. Phase 0 cannot
  be closed without one.
- A 5 V/3 A supply is bought as a contingency even if the primary topology works.
- The enclosure design cannot be finalised until this ADR is closed, because the
  fallback topology needs a second cable entry and strain relief.
