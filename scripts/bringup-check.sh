#!/usr/bin/env bash
#
# bringup-check.sh -- Phase 0 readout, run ON THE PI.
#
#   git clone https://github.com/babarkkhan/ChessBob.git
#   bash ChessBob/scripts/bringup-check.sh
#
# Read-only: it inspects and prints, it never configures anything. Paste the output
# into docs/hardware-bringup.md as the record for this device.
#
# It cannot measure the display's current draw -- that needs the inline USB meter,
# because the display's single USB-C carries power and touch together and sits on the
# Pi's USB-A budget (docs/adr/0006-power-topology-pi5.md).

set -uo pipefail

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
head2() { printf '\n\033[1;36m== %s ==\033[0m\n' "$*"; }
ok()    { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn()  { printf '  \033[33m!\033[0m %s\n' "$*"; }
bad()   { printf '  \033[31m✗\033[0m %s\n' "$*"; }
info()  { printf '    %s\n' "$*"; }

bold "ChessBob bring-up check -- $(date -u '+%Y-%m-%d %H:%M:%SZ')"

# ---------------------------------------------------------------- identity
head2 "Identity"
info "$(tr -d '\0' < /proc/device-tree/model 2>/dev/null || echo 'unknown model')"
info "$(grep PRETTY_NAME /etc/os-release | cut -d'"' -f2)"
info "kernel $(uname -r) $(uname -m)"
info "RAM: $(free -h | awk '/^Mem:/ {print $2}')"
info "session: ${XDG_SESSION_TYPE:-unknown}  desktop: ${XDG_CURRENT_DESKTOP:-unknown}"

# ---------------------------------------------------------------- power
head2 "Power and throttling"

THROTTLED_RAW="$(vcgencmd get_throttled 2>/dev/null | cut -d= -f2)"
if [ -z "$THROTTLED_RAW" ]; then
  bad "vcgencmd unavailable"
else
  T=$((THROTTLED_RAW))
  if [ "$T" -eq 0 ]; then
    ok "throttled=0x0 -- no undervoltage or throttling, now or since boot"
  else
    bad "throttled=$THROTTLED_RAW"
    # The "has occurred" bits are the important ones: they catch a brownout that
    # happened while nobody was watching.
    (( T & 1 ))       && bad  "  bit0  UNDERVOLTAGE NOW"
    (( T & 2 ))       && warn "  bit1  ARM frequency capped now"
    (( T & 4 ))       && warn "  bit2  throttled now"
    (( T & 8 ))       && warn "  bit3  soft temperature limit now"
    (( T & 65536 ))   && bad  "  bit16 UNDERVOLTAGE HAS OCCURRED since boot"
    (( T & 131072 ))  && warn "  bit17 frequency capping has occurred"
    (( T & 262144 ))  && warn "  bit18 throttling has occurred"
    (( T & 524288 ))  && warn "  bit19 soft temperature limit has occurred"
  fi
fi

if vcgencmd pmic_read_adc >/dev/null 2>&1; then
  EXT5V="$(vcgencmd pmic_read_adc | awk '/EXT5V_V/ {print $2}' | cut -d= -f2)"
  info "EXT5V_V = ${EXT5V:-?}   (expect ~5.0-5.2 V; sagging below ~4.8 V is a bad supply or cable)"
  info "full PMIC readout:"
  vcgencmd pmic_read_adc 2>/dev/null | sed 's/^/      /'
fi

# ---------------------------------------------------------------- thermal
head2 "Thermal and fan"
info "$(vcgencmd measure_temp 2>/dev/null || echo 'temp unavailable')"

FAN_RPM=""
for f in /sys/devices/platform/cooling_fan/hwmon/hwmon*/fan1_input; do
  [ -r "$f" ] && FAN_RPM="$(cat "$f")" && break
done

if [ -n "$FAN_RPM" ]; then
  if [ "$FAN_RPM" -gt 0 ]; then
    ok "fan is spinning: ${FAN_RPM} RPM"
  else
    warn "fan reports 0 RPM -- normal if the SoC is cool, since the Pi 5 only spins"
    info "the fan above ~50 C. Re-run under load (see the soak step) before"
    info "concluding it is not connected."
  fi
else
  warn "no fan tachometer found -- the Active Cooler may not be detected."
  info "Check the 4-pin JST-SH header between the GPIO header and the USB-C port."
fi

for c in /sys/class/thermal/cooling_device*/cur_state; do
  [ -r "$c" ] || continue
  d="$(dirname "$c")"
  info "$(cat "$d/type" 2>/dev/null): state $(cat "$c") / $(cat "$d/max_state" 2>/dev/null)"
done

# ---------------------------------------------------------------- display
head2 "Display"
FOUND_DISPLAY=0
for s in /sys/class/drm/card*-HDMI-A-*/status; do
  [ -r "$s" ] || continue
  conn="$(basename "$(dirname "$s")")"
  state="$(cat "$s")"
  if [ "$state" = "connected" ]; then
    FOUND_DISPLAY=1
    ok "$conn: connected"
    modes="$(dirname "$s")/modes"
    [ -r "$modes" ] && info "preferred mode: $(head -1 "$modes")"
    [ -r "$modes" ] && info "modes offered: $(tr '\n' ' ' < "$modes" | cut -c1-160)"
    edid="$(dirname "$s")/edid"
    if [ -s "$edid" ] && command -v edid-decode >/dev/null 2>&1; then
      info "EDID name: $(edid-decode < "$edid" 2>/dev/null | grep -m1 -i 'display product name' || echo 'n/a')"
    fi
  else
    info "$conn: $state"
  fi
done
[ "$FOUND_DISPLAY" -eq 0 ] && bad "no connected HDMI output -- check HDMI0 (the port nearest USB-C power)"

# ---------------------------------------------------------------- touch / input
head2 "Touch and input"
if [ -r /proc/bus/input/devices ]; then
  TOUCH="$(grep -i -B2 -A4 'touch' /proc/bus/input/devices | grep -i '^N: Name' | sed 's/^N: Name=//' | tr -d '"')"
  if [ -n "$TOUCH" ]; then
    ok "touch device(s) detected:"
    printf '%s\n' "$TOUCH" | sed 's/^/      /'
  else
    bad "no touch device found -- is the display's USB-C connected, and is that cable"
    info "a DATA cable? A charge-only cable powers the panel but gives no touch."
  fi
  info "all input devices:"
  grep '^N: Name' /proc/bus/input/devices | sed 's/^N: Name=//' | tr -d '"' | sed 's/^/      /'
fi

# ---------------------------------------------------------------- usb
head2 "USB"
command -v lsusb >/dev/null 2>&1 && lsusb | sed 's/^/    /'

RESETS="$(dmesg 2>/dev/null | grep -ci 'usb.*reset' || true)"
UNDERV="$(dmesg 2>/dev/null | grep -ci 'under-voltage\|undervoltage' || true)"
if [ "${RESETS:-0}" -gt 0 ]; then
  warn "$RESETS USB reset lines in dmesg -- some are normal at enumeration;"
  info "repeated resets during use mean a power or cable problem."
else
  ok "no USB resets in dmesg"
fi
if [ "${UNDERV:-0}" -gt 0 ]; then
  bad "$UNDERV undervoltage lines in dmesg"
else
  ok "no undervoltage messages in dmesg"
fi

# ---------------------------------------------------------------- storage / net
head2 "Storage and network"
df -h / | tail -1 | awk '{print "    root: "$2" total, "$4" free ("$5" used)"}'
info "boot media: $(findmnt -n -o SOURCE / 2>/dev/null)"
info "IP: $(hostname -I 2>/dev/null)"

# ---------------------------------------------------------------- offline board
head2 "Offline board prerequisites"
if command -v node >/dev/null 2>&1; then
  ok "node $(node --version) -- the offline board can run here"
else
  warn "node not installed. To play offline chess on this device:"
  info "sudo apt install -y nodejs && node offline/serve.mjs"
fi

# ---------------------------------------------------------------- summary
head2 "Still needs the inline meter"
cat <<'NOTE'
    This script cannot measure the display's draw. With the meter inline between
    the Pi's USB-A port and the display's USB-C, record:

      idle, backlight minimum        ______ A
      idle, backlight 100%           ______ A
      backlight 100% + speakers      ______ A
      + Chromium rendering a board   ______ A

    Under ~1.2 A: the forced topology holds and ADR 0006 closes.
    Above that: the fallback is a non-back-feeding powered USB hub -- NOT a second
    PSU, because the display has only one USB-C and it carries touch as well.
NOTE

printf '\n'
bold "Record this output in docs/hardware-bringup.md"
