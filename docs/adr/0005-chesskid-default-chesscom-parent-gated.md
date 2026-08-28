# ADR 0005 — ChessKid is the default destination; Chess.com is parent-gated

- **Status:** Accepted
- **Date:** 2026-08-28
- **Staged:** deferred to stage 2 by [ADR 0007](0007-build-stages.md). The bench prototype has one adult user and one destination set in config; this ADR describes the family device.

## Context

Every intended user of this device is **under 13**.

Chess.com's User Agreement requires users to be at least 13 years of age. Under-13
use requires a parent or guardian to complete Chess.com's Parental Consent Form.
Chess.com itself directs families with younger children to **ChessKid.com**, its
purpose-built platform for children.

The two platforms also differ sharply in how much parental control is self-serve:

| | ChessKid | Chess.com |
|---|---|---|
| Minimum age | Built for under-13 | 13+, or Parental Consent Form on file |
| Kid-to-kid messaging | None, at all | Exists; restricted by settings |
| Social lockdown | Per-kid "Disable Social Access" toggle on the parent's Edit Kid page | "Safe Mode" must be **requested through a support ticket** per account |
| Parent account model | Parent account owns kid accounts | No parent/child relationship |

A device aimed at under-13s that defaults to the 13+ platform, where locking down
chat requires a support ticket per account, is the wrong default.

## Decision

**ChessKid.com is the default destination for every new profile.**

**Chess.com is available per profile, but only behind the parent gate.** Creating or
switching a profile to Chess.com requires:

1. The parent PIN.
2. An acknowledgment screen that states plainly: Chess.com requires users to be 13 or
   older; for a younger child a Parental Consent Form must be completed with
   Chess.com; ChessKid is the recommended platform for under-13s.
3. An explicit confirmation tap.

The device **records that the acknowledgment was shown and confirmed.** It does not
attempt to verify anyone's age, does not collect a date of birth, and does not
transmit the acknowledgment anywhere. Age verification is the platform's job and the
parent's responsibility, not the appliance's.

## Origin pinning

Each profile's browser is pinned to its destination via **Chromium managed policy**,
not merely by kiosk mode. Kiosk mode hides the address bar; it does not prevent
navigation. A link, a redirect, or a curious nine-year-old will find the difference.

Policy is written to `/etc/chromium/policies/managed/` and sets, per destination:

- `URLBlocklist: ["*"]` — default deny
- `URLAllowlist` — the destination origin plus the minimum auth/CDN origins it needs
- `DeveloperToolsAvailability: 2` (disallowed)
- `IncognitoModeAvailability: 1` (disabled)
- `PasswordManagerEnabled: false`
- `BrowserSignin: 0`
- `ExtensionInstallBlocklist: ["*"]`

The exact allowlist for each destination must be derived empirically during bring-up
by loading the site with a default-deny policy and adding only what genuinely breaks —
never by allowlisting a broad wildcard to make an error go away.

## Consequences

- The primary pitch to the platform becomes "a safe, distraction-free ChessKid
  appliance for families", which is a stronger and far less fair-play-fraught ask
  than "a Chess.com terminal".
- Both platforms are operated by the same company, so a single partner conversation
  can cover both.
- If the Chess.com support-ticket requirement for Safe Mode proves unworkable, the
  fallback is to remove the Chess.com destination entirely until a partner agreement
  resolves it. This is an open question for the advisor.

## Related

- [ADR 0004 — Multi-profile family device](0004-multi-profile-family-device.md)
- [`docs/child-safety.md`](../child-safety.md)
