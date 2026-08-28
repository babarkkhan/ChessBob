# Bill of materials — prototype

## Already owned

| Part | Notes |
|---|---|
| Raspberry Pi 5, 4 GB | BCM2712, quad Cortex-A76 @ 2.4 GHz, LPDDR4X. **The seller listing's `ARMv7`, `DDR4` and `4 GB storage` fields are all wrong** — the Pi has no onboard general storage |
| 52Pi / GeeekPi EP-0177 7" display | 1024×600 @ 60 Hz IPS, capacitive touch, 500 cd/m², 165 × 100 × 8 mm, ~0.50 kg. Full-size HDMI in, USB-C, 3.5 mm out, 2 speakers. **Confirm the SKU on the physical unit** — marketplace listings conflict with the vendor wiki |

## Required before Phase 0

| Part | Why | Status |
|---|---|---|
| **Official 27 W (5 V/5 A) USB-C supply** | **Required, not preferred.** It is what raises the Pi 5's total USB-A budget from 600 mA to 1.6 A, which is what makes powering the display from the Pi viable at all. See [ADR 0006](../../docs/adr/0006-power-topology-pi5.md) | |
| **Inline USB power meter** (USB-C PD capable) | Phase 0 cannot be closed without measuring real draw. Cheapest risk reduction on this list — the alternative is days spent diagnosing "software" faults that are brownouts | |
| Raspberry Pi 5 Active Cooler | Chromium generates sustained load; an enclosure reduces airflow | |
| High-endurance A2 microSD, 32–64 GB | Boot media | |
| **Second identical microSD** | Keeps a known-good image. Card corruption otherwise costs a day of re-provisioning | |
| **Right-angle micro-HDMI → HDMI** adapter or cable | Reduces enclosure depth and connector strain; better than a straight short cable | |
| Known-good USB **data** cable for touch | Touch needs data, not just power. Charge-only cables are a classic half-day of confusion | |
| Momentary tactile button + leads | GPIO Home (short) / safe shutdown (long) | |
| Small USB or Bluetooth keyboard | Development and recovery only. Not shipped | |

## Contingency

| Part | Trigger |
|---|---|
| **5 V/3 A supply for the display** | Buy alongside the above. Needed if measured peak display draw exceeds ~1.2 A, forcing the fallback topology in ADR 0006. Only usable if Phase 0.1 confirms touch data is available without power on the same port |
| NVMe HAT + drive | **Held in reserve.** Only if Phase 3 boot-time or microSD-reliability measurements demand it. Adds cost, heat, mechanical complexity, and another board and cable |

## Enclosure (after Phase 0 closes)

Do not design the enclosure until [ADR 0006](../../docs/adr/0006-power-topology-pi5.md)
is closed — the fallback topology needs a second cable entry.

Requirements, with the kid/family context in mind:

- Clear intake and exhaust for the active cooler; the Pi must not sit flat against the
  LCD controller board
- Strain relief on HDMI and USB
- Metal fasteners and display boards clear of the Pi's antenna area
- **microSD not obvious or reachable** — this is a shared children's device
- Recovery button serviceable on prototype units, hidden on later ones
- Captive fasteners; nothing a child can unscrew and lose
- Enough base weight that tapping the board does not tip it; slight backward viewing
  angle
- Tolerant of being knocked, and of sticky hands

## Thermal and interaction testing

Test at maximum brightness, with Wi-Fi traffic, audio playing, any charging accessory
attached, and a warm ambient temperature — not on an open bench at room temperature.
