# ADR 0003 — The supervisor never inspects page content

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

The original planning document specified a device state machine containing a
`PLAYING` state, while simultaneously forbidding the supervisor from inspecting page
content or browser traffic.

**These two requirements contradict each other.** There is no way to know that a chess
game is in progress without looking at the page, the DOM, or the network. Left
unresolved, this contradiction gets settled at implementation time by whoever needs
`PLAYING` to work — and it gets settled the wrong way, quietly, with a small piece of
JavaScript or a CDP call that nobody writes down.

This ADR settles it explicitly and in advance.

## Decision

**The supervisor derives all state from the operating system and the compositor. It
never reads page content.**

Specifically, the supervisor may observe:

- process existence, PID, exit status, CPU and memory of the browser process
- which window/surface the compositor reports as focused, and its `app_id`
- the browser profile directory a process was launched with
- network reachability at the IP/DNS layer (has an interface, has a route, resolves)
- system clock sync status, temperature, throttling flags, storage headroom
- GPIO button events and its own local API calls

The supervisor may **not**:

- read the DOM, execute JavaScript in the page, or attach a debugger
- enable or connect to `--remote-debugging-port`
- proxy, intercept, or inspect the browser's TLS traffic
- read cookies, local storage, or the browser profile's contents
- capture screenshots of the session browser
- log URLs beyond the pinned origin the profile was launched with
- infer anything about game state, opponent, result, or rating

## Redefinition of `PLAYING`

`PLAYING` means: **a browser process for profile *N* exists and is the focused surface,
and it was launched pinned to an allowlisted origin.**

That is all it means. The device cannot tell a live rated game from a puzzle, a
lesson, a settings page, or an idle tab, and it does not need to. Every behaviour that
would have depended on knowing "a real game is in progress" is redesigned to work
without that knowledge:

| Wanted behaviour | Without page inspection |
|---|---|
| Don't kill the browser mid-game | Never auto-kill a *focused* session browser. Prompt the user instead |
| Don't shut down mid-game | Long-press power always confirms when a session is focused |
| Home button doesn't forfeit | Home switches surfaces; it never terminates the browser |
| Per-profile play-time limits | Count focused wall-clock time per profile. No page knowledge needed |

## Consequences

- The device is structurally incapable of the surveillance a parent might otherwise
  ask for ("what games did my kid play?"). That is a deliberate trade, and the
  child-safety story is built on the site's own parent controls instead.
- Some conservatism is forced on us: we prompt where a smarter device would decide.
  Prompting is the correct default when the alternative is losing someone's game.
- This constraint is checkable — `verify-fairplay.sh` rejects debugging flags and
  automation libraries in `supervisor/`.

## Related

- [ADR 0002 — No engine on device](0002-no-engine-on-device.md)
- [`docs/threat-model.md`](../threat-model.md)
