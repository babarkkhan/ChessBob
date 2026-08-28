# Bill of materials

Organised by **when you need it**, not by category. Buy tier 1 and 2 now; everything
below that is deliberately deferred until a measurement or a gate says otherwise.

Step-by-step usage is in [`docs/getting-started.md`](../../docs/getting-started.md).

---

## Tier 0 — Already on the desk

| Part | Notes |
|---|---|
| Raspberry Pi 5, 4 GB | BCM2712, quad Cortex-A76 @ 2.4 GHz, LPDDR4X. **The seller listing's `ARMv7`, `DDR4` and `4 GB storage` fields are all wrong** — the Pi has no onboard general storage and will not boot without an SD card |
| 7" IPS display, board rev **`A1-7inch-V13`** | 1024×600 60 Hz, capacitive touch, RTD2660H scaler. Sold as 52Pi/GeeekPi EP-0177 but **the board carries no such marking** — treat vendor specs as indicative and measure instead. Ports: full-size `HDMI-IN`, **one USB-C marked `DC5V POWER & TOUCH`**, physical `VOL` wheel and `BACK-LIGHT ON/OFF`. See [`display-A1-7inch-V13.md`](../display-A1-7inch-V13.md) |

### Probably in the display box — check before ordering

The 52Pi packaging for this model is reported to include these. Open the box first
(Step 1 of the getting-started guide); if they're there, skip the corresponding tier-2
items.

- Full-size HDMI cable
- Full-size HDMI → micro-HDMI adapter
- USB-C cable
- 2 × speakers, 2 × plastic stands, 2 × M3 screws, 2 × rubber feet

---

## Tier 1 — Must have, nothing works without these

| Part | Why | Ordered |
|---|---|---|
| **Official Raspberry Pi 27 W USB-C PSU (5 V/5 A)** | **Required, not preferred.** It is what raises the Pi 5's total USB-A budget from 600 mA to 1.6 A, which is what makes powering the display from the Pi viable at all. A generic 5 V/3 A brick drops the Pi into low-current mode and produces brownout faults that read as software bugs. See [ADR 0006](../../docs/adr/0006-power-topology-pi5.md) | |
| **microSD, 32–64 GB, A2, high-endurance** | Boot media. "High endurance" matters for something power-cycled constantly | |
| **Raspberry Pi 5 Active Cooler** | Chromium is a sustained load; the Pi 5 throttles without it. Cheapest item here and non-optional | |
| **SD card reader** | To write the card from your PC — built-in or USB adapter. Only if you don't have one | |
| **USB keyboard + mouse** | Bring-up and recovery only. Not part of the product | |

---

## Tier 2 — Strongly recommended, buy alongside tier 1

| Part | Why | Ordered |
|---|---|---|
| **Inline USB power meter** (USB-C PD capable) | Phase 0's power measurement is a gate and can't be closed without it. `vcgencmd pmic_read_adc` covers the Pi's own rails but not the display's draw. Cheapest risk reduction on this list — the alternative is days spent diagnosing brownouts as software faults | |
| **Second identical microSD** | Keeps a known-good image. Saves a day the first time a card corrupts, which it will | |

### Only if the display box was empty of cables

| Part | Why | Ordered |
|---|---|---|
| Micro-HDMI → full-size HDMI cable, or adapter + HDMI cable | Pi 5 has micro-HDMI; the display takes full-size | |
| USB-C **data** cable | Touch needs data, not just power. Charge-only cables are a classic half-day of confusion | |

---

## Tier 3 — Deferred until a measurement says otherwise

Don't buy these yet. Each has a specific trigger.

| Part | Trigger |
|---|---|
| **Powered USB hub** (non-back-feeding) | Only if Step 7 measures peak display draw above the Pi's USB-A budget. **A second 5 V PSU is NOT an option** — the display has one USB-C carrying power and touch together, so the hub carries the current and passes touch through. See [ADR 0006](../../docs/adr/0006-power-topology-pi5.md) |
| **Right-angle micro-HDMI adapter** | Enclosure work. Reduces depth and connector strain versus the boxed adapter-plus-cable, which is bulky and a strain risk once packaged |
| **Momentary tactile button + leads** | Phase 1, for GPIO Home (short press) / safe shutdown (long press) |
| **NVMe HAT + drive** | **Held in reserve.** Only if Phase 3 boot-time or microSD-reliability measurements demand it. Adds cost, heat, mechanical complexity, another board and another cable |

---

## Tier 4 — Enclosure, after Phase 0 closes

**A back panel is needed earlier than the full enclosure.** The controller PCB is
fully exposed, with two thin speaker wires on JST connectors a child can catch and
pull off. Even a rough printed or laser-cut back panel should exist before the device
is in front of a child. The four corner brass standoffs give clean M3 mounting points
to build against.

For the **full** enclosure, wait until
[ADR 0006](../../docs/adr/0006-power-topology-pi5.md) is closed. The forced topology
needs only one external power entry, which simplifies things — but the powered-hub
fallback would add a second, which changes the design.

Requirements, with the kid/family context in mind
([ADR 0004](../../docs/adr/0004-multi-profile-family-device.md)):

- Clear intake and exhaust for the active cooler; the Pi must not sit flat against the
  LCD controller board
- Strain relief on HDMI and USB
- Metal fasteners and display boards clear of the Pi's antenna area
- **microSD not obvious or reachable** — this is a shared children's device
- Recovery button serviceable on prototypes, hidden on later units
- Captive fasteners; nothing a child can unscrew and lose
- Enough base weight that tapping the board doesn't tip it; slight backward viewing
  angle
- Tolerant of knocks and sticky hands

## Thermal and interaction testing

Test at maximum brightness, with Wi-Fi traffic, audio playing, any charging accessory
attached, and a warm ambient temperature — **not** on an open bench at room
temperature with nothing else running.
