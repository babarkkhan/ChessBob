# launcher

The touch UI. Static pages served over loopback, displayed in a dedicated Chromium
instance with its own restrictive policy
([`launcher.json`](../packaging/chromium/policies/launcher.json)).

**Not implemented yet** — blocked on Phase 0 exit, in particular the on-screen
keyboard spike, which determines how the PIN pad and Wi-Fi password entry work.

## Screens

| Screen | Notes |
|---|---|
| **Profile picker** | The home screen. 2–4 large tiles. The entire kid-facing surface, along with Play, Home, and volume |
| Parent gate | PIN pad with increasing backoff on wrong attempts. No recovery path in the UI |
| Profile editor | Add / rename / remove, avatar, destination, daily limit. Behind the gate |
| Destination change | Selecting Chess.com shows the under-13 acknowledgment ([ADR 0005](../docs/adr/0005-chesskid-default-chesscom-parent-gated.md)) |
| Wi-Fi setup | Behind the gate. Must be completable with touch only |
| Captive portal handoff | Launches a separate restricted browser instance, returns here when done. **Never widen the launcher's own allowlist to solve this** |
| Recovery | Offline, DNS failure, clock unsynced, stuck browser |
| Diagnostics | Redacted export. Parent-initiated only |
| Factory test | Touch grid, audio, network, storage, temperature |
| About | Software version, the "not affiliated" notice |

## Design constraints

- 1024 × 600, landscape. Vertical space is the scarce resource
- Touch targets ≥ 48 px
- No hover-dependent interaction — there is no cursor
- No keyboard needed except the PIN pad and Wi-Fi password
- Kids see: pick a profile, play, go home, volume. Everything else is behind the gate
- High contrast, large type. The audience is children, and a parent squinting at a 7"
  screen during setup

## Boundaries

The launcher talks only to the loopback device API with a per-boot token. It cannot
reach the internet — policy blocks everything except `127.0.0.1`. If it could, the
origin pinning on the session browser would be pointless, because a child could
simply use the launcher's browser instead.
