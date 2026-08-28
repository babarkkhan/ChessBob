# Getting started — from two parts on a desk to a working bench rig

You have a Raspberry Pi 5 and a 52Pi EP-0177 display. This is the literal step-by-step
to get from there to a Pi booting into Chromium on that screen, with the Phase 0
measurements recorded.

**Read [ADR 0006](adr/0006-power-topology-pi5.md) before plugging anything in.** The
display vendor's own wiki gives an instruction that is wrong for a Pi 5 and will cause
intermittent faults that look like software bugs.

Work through this in order. Steps 1 and 2 you can do today with what's on the desk.

---

## Step 1 — Inventory what you already have (15 minutes, do this first)

**Open the display box and list its contents.** The 52Pi packaging for this model is
reported to include a full-size HDMI cable, a full-size-HDMI-to-micro-HDMI adapter, a
USB-C cable, two speakers, two plastic stands, two M3 screws, and two rubber feet.

If that's what's in your box, **you already have the video and touch cabling for bench
work**, and the shopping list in Step 2 gets much shorter.

| Check | Why it matters | Yours |
|---|---|---|
| SKU printed on the display | Marketplace listings for this panel contradict the vendor wiki. The SKU is the only trustworthy source | |
| **How many USB-C ports does the display have?** | If touch and power share one port, the fallback power topology may be impossible. Single most important thing to determine | |
| Separate touch USB and separate power USB? | | |
| HDMI cable + micro-HDMI adapter present? | If yes, skip buying an HDMI cable for now | |
| USB-C cable present? | | |
| Speakers — pre-attached or loose in sockets? | | |
| OSD / backlight buttons on the panel edge? | Determines whether brightness is software-controllable | |

📷 **Photograph the display's label and its port edge, and the Pi board.** Save them
into this repo under `hardware/`. They're the record, and the variant can't be
identified without them.

Also confirm the Pi says *Raspberry Pi 5 Model B*. The seller screenshot claimed
`ARMv7`, `DDR4` and `4 GB storage` — all three wrong for a Pi 5, which is
ARMv8/Cortex-A76, LPDDR4X, and has **no onboard storage at all**. You need an SD card;
it will not boot without one.

---

## Step 2 — Order the barebones list

Full list and reasoning in [`hardware/bom/bom.md`](../hardware/bom/bom.md). The minimum
to make progress:

### Must have — nothing works without these

1. **Official Raspberry Pi 27 W USB-C power supply (5 V/5 A).** Not a generic charger,
   not a 5 V/3 A phone brick. This specific supply is what raises the Pi 5's total
   USB-A budget from 600 mA to 1.6 A, which is what makes running the display off the
   Pi viable at all. Saving money here creates exactly the class of fault that takes
   days to diagnose.
2. **microSD card, 32–64 GB, A2, high-endurance.** "High endurance" matters — this is
   an appliance that gets power-cycled constantly.
3. **Raspberry Pi 5 Active Cooler.** Chromium is a sustained load and the Pi 5 throttles
   without active cooling. Roughly the cheapest item here and non-optional.
4. **A way to write the SD card** from your PC — built-in reader or a USB adapter.
5. **A USB keyboard and mouse** for bring-up. Temporary; not part of the product.

### Strongly recommended — buy alongside, not later

6. **Inline USB power meter.** Phase 0's power measurement is a gate; without a meter
   you're guessing. The Pi 5's PMIC gives you some of this in software (Step 7), but
   not the display's draw specifically.
7. **Second identical microSD.** Lets you keep a known-good image. Saves a day the
   first time a card corrupts, which it will.

### Only if Step 1 found the box empty of cables

8. Micro-HDMI to full-size HDMI cable, or adapter plus HDMI cable.
9. USB-C **data** cable for touch. Charge-only cables are a classic half-day of
   confusion — touch needs data, not just power.

Everything else in the BOM — second PSU, right-angle adapter, GPIO button, NVMe,
enclosure materials — is deliberately deferred. Don't buy it yet.

---

## Step 3 — Flash the SD card (on your Windows PC)

1. Install **Raspberry Pi Imager**: <https://www.raspberrypi.com/software/>
2. Choose device: **Raspberry Pi 5**
3. Choose OS: **Raspberry Pi OS (64-bit)** — the full desktop image, not Lite. You need
   the desktop stack for Wayland, Chromium, and the on-screen keyboard work.
4. Choose storage: your microSD
5. **Click the gear / "Edit Settings" before writing.** This saves real pain later:
   - Hostname: `chessbob`
   - Username and password: pick a non-default username, **not** `pi`
   - Configure Wi-Fi: SSID, password, country
   - Locale and timezone
   - Services tab: **Enable SSH → password authentication** for now. Phase 3 switches
     this to key-only, then off entirely
6. Write, and let verification finish.

> These credentials are for a bench device on your own network. They never go in the
> repo — see `.gitignore` and `config.example.json`.

---

## Step 4 — Fit the Active Cooler

Do this **before** first boot. A Pi 5 running Chromium without it will throttle.

1. Peel the film from the two pre-applied thermal pads.
2. Align the cooler over the SoC. The two nylon push-pins go through the Pi's mounting
   holes either side of the SoC — press until they click.
3. Plug the fan's 4-pin connector into the **JST-SH fan header**, the small white
   connector between the 40-pin GPIO header and the USB-C power port. It only fits one
   way.

The OS detects the fan and drives it by temperature automatically. If it never spins,
the connector isn't seated.

---

## Step 5 — Cable it up

**Order matters. Don't apply power until every cable is seated.**

```
[Official 27 W PSU]     ──────>  [Pi 5 USB-C power port]
[Pi 5 micro-HDMI 0]     ──────>  [Display HDMI in]
[Display touch USB]     ──────>  [Pi 5 USB-A port]
[USB keyboard + mouse]  ──────>  [Pi 5 USB-A ports]
```

Three things to get right:

- **Use HDMI0** — the micro-HDMI port **closest to the USB-C power connector**. HDMI1
  works, but HDMI0 is the primary and avoids a class of confusion later.
- **Never let the display feed power into the Pi's USB-C** while the 27 W supply is
  attached. The vendor wiki tells you to do exactly this; it's a Pi 4 instruction. Two
  sources contending on one rail is not something to experiment with.
- If the display has separate touch and power connectors, connect **touch to the Pi**
  and leave its power connector unplugged for now — the whole point of Step 7 is
  finding out whether the Pi can carry it.

Insert the SD card. Then connect the PSU.

---

## Step 6 — First boot

The Pi 5 boots when power is applied; the on-board button is for shutdown and wake.

Expect a rainbow splash, then the desktop. First boot is slower than later ones.

If the screen stays black:
- Confirm you used HDMI0 and the cable is fully seated at **both** ends
- Confirm the SD card is properly inserted
- Watch the green activity LED — steady-off usually means the card didn't take the
  image

At the desktop, open a terminal and confirm what you're actually running:

```bash
cat /proc/device-tree/model; echo; free -h; vcgencmd get_throttled; vcgencmd measure_temp
```

`get_throttled` should read `throttled=0x0`. **Anything else at idle means the power
supply is inadequate — stop and fix that before continuing.**

Bit meanings, worth knowing since you'll read this a lot:

| Bit | Meaning |
|---|---|
| 0 | under-voltage **now** |
| 1 | ARM frequency capped now |
| 2 | throttled now |
| 3 | soft temperature limit active now |
| 16 | under-voltage **has occurred** since boot |
| 17 | frequency capping has occurred |
| 18 | throttling has occurred |
| 19 | soft temperature limit has occurred |

The "has occurred" bits are the important ones — they catch a brownout you weren't
watching when it happened.

You can now work over SSH from Windows instead of the attached keyboard:

```bash
ssh yourusername@chessbob.local
```

---

## Step 7 — Power measurement (blocking gate)

Record everything in [`hardware-bringup.md`](hardware-bringup.md).

The Pi 5's PMIC exposes real rail measurements — useful, and free:

```bash
vcgencmd pmic_read_adc
```

That covers the Pi's own rails. For the **display's** draw specifically you need the
inline meter, sitting between the Pi's USB-A port and the display's cable.

Measure at each condition and write it down:

| Condition | Expected | Measured |
|---|---|---|
| Display idle, backlight minimum | | |
| Display idle, backlight 100% | | |
| Backlight 100% + both speakers at full volume | vendor claims 0.5 A "standby" — expect more | |
| Above, plus Chromium rendering a chess board | | |

**Decision point:** if peak stays comfortably under ~1.2 A, the primary topology holds
and you're done. If it exceeds that, you need the fallback — a separate 5 V/3 A supply
for the display — which is only possible if Step 1 found a port arrangement giving
touch data without power on the same port.

Either way, close [ADR 0006](adr/0006-power-topology-pi5.md) by recording the result.
The enclosure design is blocked on it.

---

## Step 8 — Display and touch validation

```bash
wlr-randr                       # resolution and refresh, under Wayland
libinput list-devices | less    # is the touch panel detected?
sudo libinput debug-events      # touch a corner, watch the coordinates
```

Check, and record in `hardware-bringup.md`:

- [ ] Native **1024 × 600 @ 60 Hz**, no scaling
- [ ] Touch registers, and coordinates match where you actually touched
- [ ] **Multitouch** — two fingers produce two slots
- [ ] Touch still correct **after a reboot** (a classic regression)
- [ ] Audio plays through the speakers
- [ ] Audio does **not** start unexpectedly on boot

Then the layout question that decides whether this product works at all. Open Chromium
fullscreen on ChessKid at native resolution:

- [ ] Board renders square and **≥ 480 px** wide
- [ ] Clock visible without scrolling
- [ ] Move controls reachable
- [ ] Resign / draw not somewhere a child will hit by accident
- [ ] No edge gesture fires while dragging a piece

---

## Step 9 — Two-hour soak (blocking gate)

Chromium fullscreen on a chess page, brightness at maximum, left alone:

```bash
while true; do printf '%s temp=%s %s\n' "$(date +%H:%M:%S)" "$(vcgencmd measure_temp)" "$(vcgencmd get_throttled)"; sleep 30; done | tee ~/soak.log
```

Afterwards:

```bash
grep -v '0x0' ~/soak.log | head
dmesg | grep -i -E 'under-voltage|usb.*reset|hwmon'
```

**Pass:** `throttled=0x0` throughout, no undervoltage lines, no USB resets.

---

## Step 10 — On-screen keyboard spike (blocking go/no-go)

**This is the step that can kill the approach. Don't skip it and don't leave it
until last.**

Raspberry Pi OS 6.2 defaults to labwc on Wayland. Squeekboard renders on the `top`
layer; fullscreen and `--kiosk` Chromium sit above it, so the keyboard **never becomes
visible** ([labwc#2926](https://github.com/labwc/labwc/issues/2926)).

Reproduce it first, so you know what failure looks like:

```bash
chromium --ozone-platform=wayland --kiosk https://www.chesskid.com
```

Tap the username field. Does any keyboard appear? Then work the list:

| # | Try | Notes |
|---|---|---|
| 1 | **`wvkbd` on the overlay layer** | Best first bet — built for exactly this. `apt search wvkbd`; if unpackaged it's a small C program that builds easily |
| 2 | Fullscreen-undecorated instead of `--kiosk` | Cheap to test; changes the layer interaction |
| 3 | labwc layer-order config | Look for a config knob before considering a patched build |
| 4 | `cage` or `sway` with an explicit layer rule | Swaps compositor — more control, more for us to own |
| 5 | Launcher-owned sign-in mode | We compose a windowed browser above our own keyboard pane. Always works, most build effort |

**Acceptance — touch only, with the USB keyboard physically unplugged:**

- [ ] Open a real ChessKid login in fullscreen Chromium
- [ ] Focus username — keyboard appears **above** the browser
- [ ] Type a full username
- [ ] Type a password with an uppercase letter, a digit, and a symbol
- [ ] Submit and reach a signed-in state
- [ ] Keyboard dismisses cleanly; board fully visible afterwards

📷 Record this working. It is the phase evidence.

**If all five fail:** stop, and don't buy enclosure materials. The fallbacks — a small
keyboard in the box, or signing in from a phone — are real products but noticeably
worse ones. That's a decision to take deliberately rather than drift into.

---

## Step 11 — Twenty boot/shutdown cycles

Graceful shutdown each time (`sudo poweroff`, or the Pi 5's power button), then power
back on. Log boot time and note anything that isn't clean.

**Measure boot time; don't gate on it.** The original 35 s target is optimistic —
40–55 s is honest for Pi 5 + microSD + Wayland + Chromium first paint — and it's the
wrong lever anyway. A family appliance should blank and wake, not reboot. Revisited in
Phase 3.

---

## Phase 0 exit gate

- [ ] SKUs and port arrangement recorded, with photographs
- [ ] `vcgencmd get_throttled` = `0x0` after the two-hour soak
- [ ] No undervoltage or USB resets in `dmesg`
- [ ] Peak display current measured; ADR 0006 closed
- [ ] **On-screen keyboard completes a real sign-in, touch only** — with evidence
- [ ] Touch mapped correctly after reboot
- [ ] 20 clean boot/shutdown cycles
- [ ] Board renders ≥ 480 px square on ChessKid at native resolution

Only then Phase 1 — and only then is it worth thinking about an enclosure.
