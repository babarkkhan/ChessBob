# Display controller board — as-built findings

Identified from a photograph of the actual unit's rear PCB, 2026-08-28. **This
supersedes the vendor wiki wherever the two disagree** — the wiki describes a product
line, this describes the board in hand.

## Board identification

| | |
|---|---|
| Silkscreen revision | **`A1-7inch-V13`** |
| Product marking | `Portable Screen  7 inch_IPS  1024X600@60HZ` |
| Scaler | **Realtek RTD2660H** (HDMI/VGA → LVDS scaler) |
| Panel interface | 50-pin FFC to the LVDS panel, plus a wide FFC to the touch digitiser |
| Compliance marks | Pb-free, WEEE, FCC, CE, RoHS |
| Mounting | 4 × brass standoffs at the corners — usable M3 enclosure mounting points |

**The board carries no `EP-0177` marking.** It appears to be a generic OEM controller
that 52Pi rebadges. Treat the 52Pi wiki as indicative only, and measure rather than
assume — particularly the current figures.

## Ports and controls

Reading along one edge:

| Marking | What it is |
|---|---|
| `HDMI-IN` | Full-size HDMI input |
| **`DC5V  POWER & TOUCH`** | **A single USB-C port carrying both power and USB touch data** |
| (unmarked, adjacent) | Appears to be a 3.5 mm audio output jack — *confirm visually from the outside edge* |
| `VOL` + rotary wheel | Physical volume control (analogue potentiometer) |
| `BACK-LIGHT ON/OFF` | Physical backlight control |

Two JST speaker connectors, wired to the two on-board speakers.

---

## Finding 1 — There is only ONE USB-C, and it is power *and* touch

This is the answer to the question that was blocking
[ADR 0006](../docs/adr/0006-power-topology-pi5.md), and it **removes the fallback
topology that ADR previously assumed.**

The display is a USB device that draws its power from the same connection that carries
touch. You cannot feed it from a separate 5 V supply while routing touch to the Pi,
because there is no separate port to route touch through.

**The topology is therefore forced, and it is the simple one:**

```
[Official 27 W PSU]  ──>  [Pi 5 USB-C]
[Display USB-C]      ──>  [Pi 5 USB-A]      power + touch, one cable
[Display HDMI-IN]    <──  [Pi 5 micro-HDMI 0]
```

This makes the 27 W supply **structurally required**, not merely preferred. The entire
display load now sits on the Pi's USB-A budget, which is 1.6 A only with a supply the
Pi can negotiate 5 A from, and 600 mA otherwise.

### Revised fallback, if measured draw exceeds the budget

A second PSU into the display is no longer an option. The fallback becomes a
**powered USB hub** between the Pi and the display: the hub's own supply carries the
display's current, and touch data passes through to the Pi.

Requirements for such a hub, if it comes to that:

- Must **not back-feed** power into the Pi's USB-A port
- Must pass USB HID cleanly — some cheap hubs are unreliable with touch digitisers
- Adds a component, a cable and a failure mode to a product that wanted neither

Measure first. This may well not be needed.

## Finding 2 — Backlight is probably not software-controllable

`BACK-LIGHT ON/OFF` is a **physical control on the PCB edge**, and the panel is driven
by an RTD2660H HDMI scaler. There is no backlight interface exposed to the Pi the way
there is on a DSI panel.

Consequence: **"brightness control" may not be implementable in software at all.** Any
launcher brightness slider would be a lie.

Worth one test before accepting that — some RTD-based boards expose DDC/CI:

```bash
sudo apt install ddcutil
sudo ddcutil detect
sudo ddcutil getvcp 10        # 10 = brightness
```

If `detect` finds the display and `getvcp 10` returns a value, brightness is
controllable. If not, it is a physical dial and the launcher must not pretend
otherwise.

**Also note:** if backlight is hardware-only, the "blank the screen and wake" idea
that replaces fast boot needs rethinking. Blanking the *video signal* from the Pi (DPMS
via the compositor) may or may not cause this board to drop its backlight — most
scalers do enter standby on signal loss, but that needs testing, and it is a different
mechanism from controlling brightness.

## Finding 3 — Audio should be software-controllable

The RTD2660H extracts audio from HDMI and drives the two speakers, with the physical
`VOL` wheel as an analogue master.

So Pi-side volume and mute via ALSA **should** work, with the wheel setting the ceiling.
That means the launcher's mute control is implementable even though brightness may not
be. Set the physical wheel once during assembly and control level in software.

## Finding 4 — The PCB back is fully exposed

Bare board, exposed components, and two thin speaker wires on JST connectors that a
child could catch and pull off.

For a device aimed at 2–4 children under 13
([ADR 0004](../docs/adr/0004-multi-profile-family-device.md)), a back cover moves from
"Phase 6 enclosure work" to **something needed before the device is in front of a
child at all** — even a rough printed or laser-cut back panel during Phase 1.

The four corner standoffs give clean M3 mounting points to build against.

---

## Actions arising

- [ ] Confirm visually whether the unmarked connector is a 3.5 mm audio jack
- [ ] Confirm whether `BACK-LIGHT ON/OFF` is a switch or a second potentiometer
- [ ] Run the `ddcutil` test above and record the result
- [ ] Test whether compositor DPMS blanking causes the scaler to drop the backlight
- [ ] Measure display draw on the Pi's USB-A rail (the forced topology makes this the
      single most important Phase 0 number)
- [ ] Photograph the outside port edge and add both photos to this directory
