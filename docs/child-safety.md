# Child safety

Every intended user of ChessBob is a child under 13, sharing one device with siblings.
That fact drives more of this design than any hardware constraint does.

This document records the platform rules we must work within, what the device does
about them, and — importantly — what the device deliberately does *not* try to do.

## Platform age rules

| | ChessKid.com | Chess.com |
|---|---|---|
| Built for | Children | General audience |
| Minimum age | Designed for under-13 use under a parent account | **13+**; under-13 requires a Parental Consent Form filed with Chess.com |
| Kid-to-kid messaging | None — kids cannot message or chat with each other regardless of friend or club status | Exists; restricted by account settings |
| Social lockdown control | Per-kid **"Disable Social Access"** on the parent's *Edit Kid* page | **"Safe Mode"** — disables messages, chats and comments, but must be **requested through Chess.com support** per account |
| Account relationship | Parent account owns kid accounts | No parent/child account model |

Sources are linked at the bottom. **These policies change. Re-verify before any field
trial and before any distribution beyond your own household.**

## What the device does

**ChessKid is the default destination for every profile.** A new profile is a ChessKid
profile unless a parent deliberately changes it. See
[ADR 0005](adr/0005-chesskid-default-chesscom-parent-gated.md).

**Chess.com requires the parent gate plus an acknowledgment.** Before a profile can be
pointed at Chess.com, the parent must enter the PIN and confirm an on-screen notice
that states the 13+ requirement, the existence of the Parental Consent Form, and that
ChessKid is recommended for younger children. The device records only that the notice
was confirmed.

**Origin pinning is enforced by the browser, not by the UI.** Each profile's Chromium
runs under a managed policy with `URLBlocklist: ["*"]` and a narrow `URLAllowlist`.
Hiding the address bar is not a control; a default-deny policy is. A child following a
link out of a chess page lands on a blocked-page notice, not on the open web.

**Play-time limits are local and content-blind.** The supervisor counts how long a
profile's browser has been the focused surface. It does not know or care what was on
screen. Parents set a daily limit per profile behind the PIN.

**Profile switching does not leak sessions.** Each profile has its own Chromium
`--user-data-dir`, so signing in as one child does not sign in another.

**There is no engine and no hint mechanism.** A device that could assist a child in a
rated game would damage that child's account. See
[ADR 0002](adr/0002-no-engine-on-device.md).

## What the device deliberately does not do

**It does not monitor what the child does.** The supervisor cannot read the page, the
URL beyond the pinned origin, the moves, the chat, or the opponent
([ADR 0003](adr/0003-supervisor-never-inspects-page-content.md)). A parent asking
"what did my kid play today?" gets, at most, "profile *Sam* was active for 40 minutes."
Everything richer than that is the platform's job, through the platform's own parent
tools.

This is a deliberate trade. Building the surveillance would mean building the page
inspection, and the page inspection is the thing that makes an appliance untrustworthy
to the platform and to the child.

**It does not verify anyone's age.** No date of birth is collected, stored, or
transmitted. Age compliance is between the parent and the platform.

**It does not create accounts.** A parent creates ChessKid or Chess.com accounts
through the platform's own flow, on the platform's own origin. The device never sees
a password (it is typed into the site's own page) and never stores one.

**It does not phone home.** No telemetry leaves the device outside an explicit,
parent-initiated diagnostics export. Field-alpha metrics, if any, are opt-in per
household and cover boot time, crash counts, temperature, and session duration —
never moves, page content, chat, or any child's name.

## Setup checklist for a parent

Not enforced by software — this belongs in the printed guide:

1. Create a ChessKid parent account and one kid account per child, on chesskid.com.
2. On each kid's *Edit Kid* page, review **Disable Social Access**.
3. On the device, set a parent PIN that the children do not know.
4. Create one profile per child. Leave the destination as ChessKid.
5. Sign each child in once, behind the parent gate.
6. Set a daily play-time limit per profile if wanted.
7. Only if a child is 13+, or you have filed the Parental Consent Form: change that
   profile's destination to Chess.com, and separately request **Safe Mode** from
   Chess.com support for that account.

## Open question for the advisor

Chess.com's Safe Mode cannot be enabled from the device or by the parent directly — it
requires a support ticket per account. A family appliance that cannot lock down chat
without an off-device support interaction is arguably not fit for the purpose.

**Should the Chess.com destination be removed entirely until a partner agreement
resolves this?** This is currently unresolved and is question 2 in the advisor list.

## Sources

- [Chess.com — User Agreement](https://www.chess.com/legal/user-agreement)
- [Chess.com — Why do I need Parental Consent?](https://support.chess.com/en/articles/11070988-why-do-i-need-parental-consent)
- [Chess.com — What is Safe Mode?](https://support.chess.com/en/articles/8614033-what-is-safe-mode-on-chess-com)
- [ChessKid — Understanding ChessKid's safety features](https://www.chesskid.com/learn/articles/how-to-understand-chesskids-safety-features2)
