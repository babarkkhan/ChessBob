# Architecture

## Shape

```
Power on
  └─ Raspberry Pi OS 6.2 (64-bit) — labwc / Wayland
       └─ systemd: chessbob-supervisor.service
            │
            ├─ NetworkManager + time sync
            │
            ├─ Launcher browser  (Chromium, own profile, loopback UI)
            │    ├─ PROFILE PICKER   ← home screen, 2–4 kid tiles
            │    ├─ PARENT GATE (PIN) → Wi-Fi, profiles, destinations,
            │    │                       play limits, wipe, diagnostics, shutdown
            │    └─ RECOVERY screens  → offline, captive portal, clock, stuck browser
            │
            ├─ Session browser   (Chromium, --user-data-dir per profile,
            │                     managed policy pins allowed origins)
            │
            ├─ On-screen keyboard (must render on the OVERLAY layer)
            │
            ├─ Health monitor    (temperature, throttling, storage, watchdog)
            │
            └─ GPIO Home/Power button
```

Two Chromium instances, deliberately. The launcher has its own profile and its own
policy; the session browser is launched per profile and pinned to one origin. They
never share a user-data-dir.

## State machine

```
BOOTING
   ├─→ TIME_UNSYNCED ──┐
   ├─→ SETUP  (no Wi-Fi / no profiles)
   │      └─→ CAPTIVE_PORTAL ──┐
   └─→ PICKER  ←───────────────┴──── (recovered)
         ├─→ PARENT_GATE ─→ SETTINGS ─→ PICKER
         ├─→ SIGNIN(profile)  ─→ SESSION(profile)
         ├─→ OFFLINE_PLAY      (local two-player board — no network needed)
         │      └─→ PICKER
         └─→ SESSION(profile)
                ├─→ PICKER            (Home button — browser stays alive)
                ├─→ LIMIT_REACHED     (play-time limit) ─→ PICKER
                ├─→ RECOVERY_OFFLINE  ─→ SESSION | PICKER | OFFLINE_PLAY
                └─→ RECOVERY_STUCK    (user-confirmed restart) ─→ SESSION
SHUTDOWN  ← long-press power, always confirmed when a session is focused
UPDATE    ← app-layer bundle, symlink swap, rollback on failed health check
```

`TIME_UNSYNCED` and `CAPTIVE_PORTAL` are first-class states, not error branches — TLS
fails confusingly with a wrong clock, and a captive portal looks exactly like a
working network until a page load fails.

### What the supervisor is allowed to know

`SESSION(profile)` means **"a browser process for that profile exists and is the
focused compositor surface, launched pinned to an allowlisted origin."** It does not
mean a game is in progress; the supervisor cannot know that and must not try to find
out. This is the whole of
[ADR 0003](adr/0003-supervisor-never-inspects-page-content.md) and it constrains
several behaviours below.

## Components

### Supervisor

Small Python service, root-adjacent, owns the state machine. Responsibilities: start
and monitor browsers, own the GPIO button, track per-profile focused time, watch
temperature/throttling/storage, serve the local device API, request safe shutdown.

**Never** reads page content, attaches a debugger, proxies traffic, reads cookies, or
screenshots the session browser.

### Launcher

Static touch UI served over loopback and displayed in its own Chromium instance.
Screens: profile picker, parent gate, profile editor, Wi-Fi setup, captive-portal
handoff, recovery, diagnostics, factory test, about/version.

Touch targets ≥ 48 px. No hover-dependent interaction. Nothing that requires a
keyboard except the PIN pad and the parent's Wi-Fi password entry.

### Local device API

Bound to `127.0.0.1` only. Requires an unguessable per-boot token passed by the
launcher's launch URL. Validates `Origin`. State changes are POST-only. Every action
is explicitly allowlisted — there is no generic "run command" endpoint. The API can
switch profiles, start/stop browsers, read health, manage Wi-Fi, and request
shutdown. It cannot execute arbitrary code, and it exposes nothing about page content
because the supervisor has nothing to expose.

### Session browser lockdown

Command-line kiosk flags hide UI; **managed policy is the actual control.** Policy
lives in `/etc/chromium/policies/managed/` and is templated per destination — see
[`packaging/chromium/policies/`](../packaging/chromium/policies/) and
[ADR 0005](adr/0005-chesskid-default-chesscom-parent-gated.md).

Password saving is off. Session cookies persist so children do not sign in every
boot. "Sign out and wipe this profile" is a parent action that deletes the profile's
entire user-data-dir.

### On-screen keyboard

**The known hard problem.** Raspberry Pi OS 6.2 defaults to labwc/Wayland, where
squeekboard renders on the `top` layer and fullscreen or `--kiosk` Chromium covers
it, so the keyboard never appears
([labwc#2926](https://github.com/labwc/labwc/issues/2926)).

Resolved by a Phase 0 go/no-go spike; see
[`hardware-bringup.md`](hardware-bringup.md). Candidate approaches in preference
order: `wvkbd` on the overlay layer; fullscreen-undecorated instead of `--kiosk`;
labwc layer-order configuration; `cage`/`sway` with an explicit layer rule; a
launcher-owned sign-in mode that composes a windowed browser above our own keyboard
pane.

Mitigating factor: parents sign children in once during setup and sessions persist,
so this is a setup-time problem rather than an every-session one — but sessions do
expire.

## Behaviours constrained by ADR 0003

Because the device cannot tell a live game from a puzzle, it is conservative wherever
the cost of being wrong is someone losing a game:

| Behaviour | Rule |
|---|---|
| Home button | Switches surfaces. **Never terminates the session browser.** Returning is instant |
| Power long-press | Always confirms while a session is focused |
| Stuck-browser watchdog | While a session is focused, prompts *"This looks stuck — restart?"*. Silent auto-restart only from PICKER or idle |
| Play-time limit | Warns at 5 minutes remaining, then returns to PICKER — it does not kill mid-interaction without warning |
| Updates | Never applied while a session is focused |

## Data on the device

Stored: network configuration, profile metadata (display name, avatar, destination,
limits), hashed parent PIN, software version, coarse health counters, and each
profile's Chromium user-data-dir.

Not stored, not logged, ever: passwords, 2FA codes, cookies (outside the browser's
own profile), URLs beyond the pinned origin, page content, chat, moves, keystrokes,
screenshots.

Logs are a size-limited ring. Diagnostics export is an explicit parent action and is
redacted.

## Offline play

`OFFLINE_PLAY` is a local two-player board rendered by the launcher — legal move
generation, check/checkmate detection, clock, undo, new game. No network, no browser
session, **no engine** ([ADR 0008](adr/0008-offline-mode.md)).

It is reachable from the picker at any time, and it is the correct destination from
`RECOVERY_OFFLINE` — when the network is down, offering a game beats apologising.

Two constraints on it:

- **Rules, not evaluation.** A rules library for move legality is fine and necessary;
  anything that evaluates positions or talks UCI is not. `verify-fairplay.sh` enforces
  that distinction.
- **Our own assets, clearly licensed.** The board and pieces must not be any
  platform's. Record the licence when the assets are added, not later.

Playing against the computer is deferred. If it is ever built, the mode boundary is
`Conflicts=` between two systemd targets plus a supervisor precondition that refuses
to go online while any engine process exists — not a Python `if`.

## Deliberately excluded from v1

- **PubAPI client.** Adds a network dependency and rate-limit etiquette surface for a
  home-screen tile nobody asked for. Revisit only if a concrete feature needs it.
- **Full A/B OS images.** Phase 3 ships app-layer signed updates with symlink swap and
  rollback. Image-level A/B is a Phase 6 / CM5 concern and would consume the alpha.
- **NVMe.** Held in reserve behind a Phase 3 boot-time measurement.
- **Any native chess UI, lobby, or move transport.** Partner-gated
  ([ADR 0001](adr/0001-browser-appliance-not-native-client.md)).
