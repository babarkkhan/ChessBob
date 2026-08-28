# ADR 0006 — Power topology for Pi 5 + 7" display

- **Status:** Accepted; topology now **forced** by the board's port layout. Pending Phase 0 measurement.
- **Date:** 2026-08-28
- **Updated:** 2026-08-28 after inspecting the actual controller board — see
  [`hardware/display-A1-7inch-V13.md`](../../hardware/display-A1-7inch-V13.md)

## ⚠ Read this before connecting anything

The display vendor's documentation gives an instruction that is **wrong for a
Raspberry Pi 5.** Do not follow it.

The 52Pi wiki for this display line states:

> "Do not connect the power supply to Raspberry Pi 4B's USB-C port, the screen will
> offer the power to bring up Raspberry Pi."

That is a **Raspberry Pi 4** instruction. Following it on a Pi 5 causes real problems.

## Context

A Raspberry Pi 5 negotiates its power budget over USB-C PD. With the official 27 W
(5 V/5 A) supply it permits **1.6 A total across its USB-A ports**. With anything it
cannot negotiate 5 A from — including power arriving through a display's USB
pass-through — it drops to a restricted profile, limits **total USB current to
600 mA**, emits undervoltage warnings, and can reset USB devices under load.

Chromium rendering a chess board is a sustained CPU and GPU load. A Pi 5 in
low-current mode, driving a 500 cd/m² panel with speakers, is exactly the condition
that produces intermittent touch dropouts and unexplained reboots — the kind of fault
that costs days to diagnose because it presents as a software problem.

### What the board inspection changed

The controller board is marked `A1-7inch-V13` and has **exactly one USB-C port,
silkscreened `DC5V POWER & TOUCH`.** Power and USB touch data share that single
connector.

This removes an option this ADR previously assumed. There is no way to feed the
display from its own supply while routing touch separately to the Pi, because there is
no separate touch port.

## Decision

**The topology is forced, and it is the simple one:**

```
[Official 27 W 5V/5A USB-C PSU] ──> [Pi 5 USB-C power in]
[Display USB-C: POWER & TOUCH]  ──> [Pi 5 USB-A port]      (single cable, both)
[Display HDMI-IN]               <── [Pi 5 micro-HDMI 0]
```

The 27 W supply is **structurally required, not preferred.** The whole display load
sits on the Pi's USB-A budget, and that budget is 1.6 A only with a supply the Pi can
negotiate 5 A from. On anything else it is 600 mA and the system will be unstable.

**Never** connect a second power source to the display or let the display's port
feed the Pi's USB-C.

## Revised fallback

A separate PSU into the display is **no longer possible** — the port layout rules it
out. If measured peak draw exceeds the Pi's USB-A budget, the fallback is a **powered
USB hub** between the Pi and the display: the hub's supply carries the display's
current while touch data passes through to the Pi.

```
[27 W PSU] ──> [Pi 5 USB-C]
[Pi 5 USB-A] <──> [powered USB hub] <──> [Display USB-C]
                        ^
                  [hub's own PSU]
```

Requirements if it comes to this:

- Must **not back-feed** into the Pi's USB-A port
- Must pass USB HID reliably — cheap hubs are often unreliable with touch digitisers
- Adds a component, a cable and a failure mode to a product that wanted neither

Measure before buying one. It may well not be needed.

## Measurements required to close this ADR

Recorded in [`docs/hardware-bringup.md`](../hardware-bringup.md). Now the single most
important Phase 0 number, since the forced topology puts the entire display load on
one rail.

- [x] Board revision identified — `A1-7inch-V13`, RTD2660H scaler
- [x] Port arrangement — **one USB-C, power and touch combined**
- [ ] Idle draw of the display
- [ ] Peak draw at 100% brightness with both speakers driven at full volume
- [ ] Peak draw with Chromium rendering a board
- [ ] `vcgencmd get_throttled` = `0x0` after a 2-hour Chromium soak
- [ ] No USB reset or undervoltage lines in `dmesg` across that soak

The vendor's published figure is "0.5 A max (standby)". **Standby is not the operating
figure** and must not be used for sizing. The board in hand is not even marked with
the vendor's SKU, so treat that figure as indicative at best.

## Consequences

- An inline USB power meter is a required bring-up tool. Phase 0 cannot be closed
  without one.
- **Do not buy a second 5 V/3 A supply** — the earlier BOM contingency is void. If a
  contingency is needed it is a powered USB hub instead.
- The enclosure needs only one external power entry, which simplifies it. But it must
  route a USB-C cable from the display's edge round to a Pi USB-A port with proper
  strain relief.
- If the powered-hub fallback is ever required, the enclosure gains a second cable
  entry and the ADR should be revisited before any enclosure is finalised.
