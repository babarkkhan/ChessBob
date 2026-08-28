# ADR 0004 — Multi-profile family device, not one owner per device

- **Status:** Accepted
- **Date:** 2026-08-28
- **Supersedes:** the "one owner per device" assumption in the original planning document

## Context

The original plan assumed a single adult owner per device and deferred multi-user
support to "later, partner-dependent". The actual target is **2–4 children under 13
sharing one device in a household.**

Retrofitting multi-user onto a single-user appliance is expensive: it touches the
launcher, the browser invocation, the session model, the wipe path, and the security
model. It is much cheaper to design for it now.

## Decision

The device supports **2–4 profiles**, plus a parent gate.

### Profile

A profile is a directory under the device's state root containing:

| Field | Notes |
|---|---|
| `id` | Opaque, generated. Never derived from the child's name |
| `display_name` | Shown on the picker tile. May be a nickname |
| `avatar` | Choice from a bundled neutral set. Not a photo |
| `destination` | `chesskid` (default) or `chesscom` (parent-gated) |
| `browser_profile_dir` | Chromium `--user-data-dir` for this profile |
| `play_time` | Local counters for the daily limit. Reset on a schedule |

The **profile picker is the home screen.** Kids can: pick a profile, play, go home,
change volume. That is the entire kid-facing surface.

### Parent gate

A PIN protects: Wi-Fi setup, add/remove/rename a profile, change a profile's
destination, sign in or sign out a profile, wipe a profile, set play-time limits,
export diagnostics, run the factory test, and shut down.

The PIN is stored hashed, is never logged, and is not recoverable from the device UI —
recovery is a physical factory reset that wipes all profiles.

### Session isolation

Each profile gets its own Chromium `--user-data-dir`. This gives clean cookie,
storage, and session separation between profiles: signing in as one child does not
sign in the others, and switching profiles does not leak a session.

**Stated limit, to be documented honestly and not oversold:** every profile runs as
the same operating-system user. This is isolation *between children on a family
device*, not a security boundary against someone with a shell on the box. A
determined local attacker with code execution can read every profile's cookies. That
is an accepted risk for a home appliance and is recorded in the threat model.

## Consequences

- The launcher becomes the most substantial piece of UI in the project, not a thin
  shim in front of the browser.
- "Fast secure wipe" moves from a deferred nice-to-have to a Phase 2 requirement,
  because a shared device needs per-profile sign-out.
- Play-time limits become natural and cheap: the supervisor already knows which
  profile is focused and for how long, with no page inspection
  ([ADR 0003](0003-supervisor-never-inspects-page-content.md)).
- Browser lockdown must be per-profile, which pushes us to Chromium managed policy
  rather than command-line kiosk flags alone.

## Related

- [ADR 0005 — ChessKid default, Chess.com parent-gated](0005-chesskid-default-chesscom-parent-gated.md)
- [`docs/child-safety.md`](../child-safety.md)
