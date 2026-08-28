# Chromium managed policy

Kiosk flags hide browser UI. **They do not prevent navigation.** A link, a redirect,
or a curious nine-year-old will find the difference. The actual lockdown is Chromium
*managed policy* with a default-deny URL blocklist.

## The per-profile wrinkle

On Linux, managed policy is read from `/etc/chromium/policies/managed/` and applies
**machine-wide**. There is no documented per-instance or per-`--user-data-dir` policy
override.

ChessBob works around this by having the supervisor **write the destination's policy
file into the managed directory immediately before launching the session browser**,
and only ever running one session browser at a time. Switching profiles stops the
current browser, swaps the policy file, and starts the new one.

Consequences to respect in the implementation:

- The managed directory is **owned by the supervisor**, root-writable only. The kiosk
  user must not be able to write it — otherwise the lockdown is self-serve.
- The swap must complete *before* the browser starts. Chromium reads policy at
  startup; writing it afterwards does nothing until the next launch.
- Two session browsers must never run concurrently. If that ever becomes a
  requirement, this whole mechanism needs replacing.
- The launcher browser runs with its own restrictive policy and its own profile.

## Deriving the allowlists

The `URLAllowlist` entries below are a **starting point, not a verified set.** Derive
the real list empirically during bring-up:

1. Start with `URLBlocklist: ["*"]` and only the destination's own origin allowed.
2. Load the site, sign in, play a game, open the settings the parent needs.
3. Watch `chrome://net-export` or the blocked-page notices for what genuinely breaks.
4. Add **only** the specific origins required, one at a time.

Never add a broad wildcard to make an error go away. If a site needs a CDN, allowlist
that CDN, not `*`.

Record the final derived list, and the date it was verified, in
`docs/hardware-bringup.md`. These origins change; treat the list as something that
needs re-verification, not a constant.

## Files

| File | Applies to |
|---|---|
| `common.json` | Settings shared by every profile — merged into each destination policy |
| `chesskid.json` | ChessKid destination |
| `chesscom.json` | Chess.com destination (parent-gated — see ADR 0005) |
| `launcher.json` | The launcher's own browser instance |

Policy reference: <https://chromeenterprise.google/policies/>
