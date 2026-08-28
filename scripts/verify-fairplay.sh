#!/usr/bin/env bash
#
# verify-fairplay.sh — mechanical enforcement of the invariants in ADR 0002 and 0003.
#
# The ChessBob README makes three promises: no chess engine on the device, no page
# inspection, and no browser automation. A promise in a README is worth very little.
# This script is what makes them checkable, and it runs in CI on every push.
#
# It is deliberately blunt. A false positive costs someone thirty seconds of thought;
# a false negative costs the project its credibility.
#
# Exit 0 = invariants hold. Exit 1 = a violation was found.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

FAILURES=0
CHECKS=0

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
dim()   { printf '\033[2m%s\033[0m\n' "$*"; }

# What lands on the device is scripts, source, policy and unit files. Markdown is
# prose *about* the device — and the ADRs and component READMEs necessarily name
# every forbidden flag and package in order to forbid them, so scanning them
# guarantees false positives. Provisioning lives in scripts, not in prose.
EXCLUDES=(
  ':!*.md'
  ':!scripts/verify-fairplay.sh'
  ':!.github/'
)

fail() {
  red "  ✗ $1"
  FAILURES=$((FAILURES + 1))
}

pass() {
  green "  ✓ $1"
}

# scan <description> <extended-regex> [path-restriction...]
scan() {
  local desc="$1"; shift
  local pattern="$1"; shift
  local paths=("$@")
  CHECKS=$((CHECKS + 1))

  local hits
  if [ ${#paths[@]} -gt 0 ]; then
    hits="$(git grep -n -I -E -i -e "$pattern" -- "${paths[@]}" "${EXCLUDES[@]}" 2>/dev/null || true)"
  else
    hits="$(git grep -n -I -E -i -e "$pattern" -- "${EXCLUDES[@]}" 2>/dev/null || true)"
  fi

  if [ -n "$hits" ]; then
    fail "$desc"
    printf '%s\n' "$hits" | sed 's/^/      /'
  else
    pass "$desc"
  fi
}

echo
echo "ChessBob fair-play verification"
echo "==============================="
echo

# ---------------------------------------------------------------------------
# ADR 0002 — no chess engine may reach the device.
# ---------------------------------------------------------------------------
echo "ADR 0002 — no engine on device"

ENGINES='\b(stockfish|fairy-stockfish|lc0|leela[-_ ]?chess|gnuchess|gnu[-_ ]chess|crafty|komodo|dragon-?engine|texel|cfish|berserk-?chess)\b'
scan "no chess engine named in provisioning or source" "$ENGINES"

# Evaluation and tablebase data. Note what is NOT here: python-chess and chess.js are
# permitted. They are RULES libraries -- legal move generation, check and checkmate
# detection -- which the offline two-player board in ADR 0008 legitimately needs.
# Rules are not evaluation. What makes a rules library dangerous is its UCI client
# submodule, which is checked separately below.
EVAL_LIBS='\b(syzygy|tablebase|nnue|pyffish|polyglot[-_]?book)\b'
scan "no evaluation or tablebase dependency" "$EVAL_LIBS"

# The UCI client surface -- how you talk to an engine. This is the dangerous half of
# an otherwise fine rules library, and it stays banned even once ADR 0008's offline
# engine mode exists, outside the designated engine directory.
UCI_CLIENT='(chess\.engine|SimpleEngine|popen_uci|popen_xboard|UciProtocol|XBoardProtocol|\buci_?(cmd|command|handler)\b)'
scan "no UCI engine-client surface" "$UCI_CLIENT"

echo

# ---------------------------------------------------------------------------
# ADR 0003 — the supervisor never inspects page content.
# ---------------------------------------------------------------------------
echo "ADR 0003 — no page inspection, no automation"

# Remote debugging is the single flag that would make every other promise void.
DEBUG_FLAGS='--remote-debugging-(port|pipe|address)|--auto-open-devtools|--disable-web-security|--load-extension|--disable-site-isolation|--ignore-certificate-errors|--allow-running-insecure-content'
scan "no debugging or sandbox-weakening Chromium flags" "$DEBUG_FLAGS"

# Browser automation frameworks have no legitimate use in this codebase.
AUTOMATION='\b(selenium|playwright|puppeteer|pyppeteer|webdriver|chromedriver|marionette|cdp[-_]?client|websockets?\.connect\(.{0,40}9222)\b'
scan "no browser-automation framework" "$AUTOMATION"

# TLS interception / traffic inspection.
INTERCEPT='\b(mitmproxy|sslsplit|burp[-_ ]?suite|mitm_?dump|SSLKEYLOGFILE)\b'
scan "no TLS interception tooling" "$INTERCEPT"

# Screenshotting the session browser would capture page content indirectly.
CAPTURE='\b(grim|wayshot|scrot|import -window|screencapture|CaptureScreenshot)\b'
scan "no screen-capture of the session browser" "$CAPTURE" 'supervisor/' 'packaging/'

echo

# ---------------------------------------------------------------------------
# Public-repo hygiene — this repository is public.
# ---------------------------------------------------------------------------
echo "Repository hygiene"

CHECKS=$((CHECKS + 1))
SECRET_FILES="$(git ls-files | grep -E '(^|/)(config\.local\.json|.*\.pem|.*\.key|id_rsa|id_ed25519|authorized_keys|wpa_supplicant.*\.conf|.*\.nmconnection)$' || true)"
if [ -n "$SECRET_FILES" ]; then
  fail "credential-shaped files are tracked"
  printf '%s\n' "$SECRET_FILES" | sed 's/^/      /'
else
  pass "no credential-shaped files tracked"
fi

# Chess platform assets must not be vendored — see README trademark notice.
CHECKS=$((CHECKS + 1))
ASSETS="$(git ls-files | grep -E -i '(chesscom|chess\.com|chesskid)[-_.].*\.(png|jpg|jpeg|svg|webp|mp3|ogg|wav|ttf|woff2?)$' || true)"
if [ -n "$ASSETS" ]; then
  fail "platform-branded asset files are vendored"
  printf '%s\n' "$ASSETS" | sed 's/^/      /'
else
  pass "no platform-branded assets vendored"
fi

echo
echo "-------------------------------"
if [ "$FAILURES" -eq 0 ]; then
  green "All $CHECKS checks passed."
  echo
  exit 0
else
  red "$FAILURES of $CHECKS checks FAILED."
  echo
  dim "These invariants are documented in docs/adr/0002 and docs/adr/0003."
  dim "If a hit is a genuine false positive, narrow the pattern deliberately —"
  dim "do not add a blanket exclusion."
  echo
  exit 1
fi
