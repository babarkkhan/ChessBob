# ADR 0001 — Browser appliance, not a native client

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

ChessBob needs to let a child play chess online with as little computer-like friction
as possible. There are two broad ways to do that: build a native application that
speaks to the chess site's servers, or ship a locked-down browser pointed at the
site's own web application.

Chess.com's Published Data API (PubAPI) is read-only. It returns public player, game,
club, and tournament data. It cannot authenticate a gameplay session and it cannot
submit moves. Chess.com directs developers who need user authentication or connected
board capability to an application form; scopes are not published and are granted
only after approval.

There is therefore **no sanctioned way to build a native gameplay client today.** The
only unsanctioned routes — private endpoints, DOM automation, credential replay —
are fragile, violate the site's terms, and would poison any future partnership.

## Decision

The device is a **browser appliance**. Chromium renders the chess site; the site owns
the account, the game, and the moves. ChessBob owns everything around it: boot,
Wi-Fi, time sync, display and touch, the profile model, launch and recovery, updates,
diagnostics, and safe shutdown.

We do not build a native gameplay client, a move transport, or any custom chess UI
unless and until a partner agreement defines one.

## Consequences

- We inherit the site's responsive layout and its changes. We mitigate by never
  depending on the DOM (see [ADR 0003](0003-supervisor-never-inspects-page-content.md))
  and by keeping a small manual smoke checklist.
- We cannot deep-link into game state, show a native lobby, or render our own board.
- Full Chromium is used rather than an embedded WebView or Electron. An embedded
  browser would add authentication, cookie, update, codec, and security-maintenance
  work with no prototype benefit, and would drift from the engine the site is
  actually tested against.
- The path to a sanctioned native client stays clean, because we will not have built
  anything that has to be unwound or apologised for.

## Related

- [ADR 0003 — Supervisor never inspects page content](0003-supervisor-never-inspects-page-content.md)
- [ADR 0005 — ChessKid default, Chess.com parent-gated](0005-chesskid-default-chesscom-parent-gated.md)
