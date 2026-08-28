# supervisor

The device state machine. Small Python service under systemd.

**Not implemented yet** — blocked on Phase 0 exit
([`docs/hardware-bringup.md`](../docs/hardware-bringup.md)). The on-screen keyboard
spike in particular can change how the session browser is launched, which changes
this component.

## Responsibilities

- Own the state machine in [`docs/architecture.md`](../docs/architecture.md)
- Launch and monitor the launcher browser and the session browser
- Swap the Chromium managed-policy file before each session launch
  (see [`packaging/chromium/policies/README.md`](../packaging/chromium/policies/README.md))
- Handle the GPIO Home/Power button
- Track per-profile focused wall-clock time for play limits
- Monitor temperature, throttling, storage, and network reachability
- Serve the loopback-bound device API
- Request safe shutdown

## Hard constraints — read before writing any code

From [ADR 0003](../docs/adr/0003-supervisor-never-inspects-page-content.md). These are
enforced by [`scripts/verify-fairplay.sh`](../scripts/verify-fairplay.sh) in CI.

**May observe:** process existence and status, focused compositor surface and its
`app_id`, the profile dir a process was launched with, IP/DNS-level reachability,
clock sync, temperature, throttling, storage, GPIO events, its own API calls.

**Must never:** read the DOM, execute JavaScript in a page, attach a debugger, use
`--remote-debugging-port`, proxy or inspect TLS traffic, read cookies or browser
storage, screenshot the session browser, log URLs beyond the pinned origin, or infer
anything about game state.

`SESSION(profile)` means *"a browser process for that profile exists and is focused"*.
It does **not** mean a game is in progress, and the supervisor must not try to find
out. Where that ambiguity matters — Home button, watchdog, shutdown, updates — the
supervisor prompts rather than guesses. Losing someone's game is worse than asking.

## Device API

Loopback only. Unguessable per-boot token. `Origin` validated. State changes POST-only.
Every action explicitly allowlisted — no generic command endpoint.
