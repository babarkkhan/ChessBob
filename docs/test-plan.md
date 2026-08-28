# Test plan

Phase 0 procedures live in [`hardware-bringup.md`](hardware-bringup.md). This document
covers Phase 1 onward.

## Phase 1 — Functional kiosk with profiles

| # | Test | Pass condition |
|---|---|---|
| 1.1 | Cold boot | Lands on the profile picker, no desktop or browser chrome visible at any point |
| 1.2 | Profile sign-in | Parent signs two kid profiles into ChessKid behind the gate, touch only |
| 1.3 | Session persistence | Reboot; both profiles still signed in |
| 1.4 | **Session isolation** | Sign in as A, switch to B — B is not signed in as A. Reboot, re-check |
| 1.5 | **Origin pinning** | From a kid profile, attempt to reach an off-allowlist URL. Browser blocks it *at policy level* — verify the blocked-page notice, not just an absent address bar |
| 1.6 | Launcher containment | The launcher's own browser cannot reach any internet origin |
| 1.7 | **Home button safety** | Start a game, press Home, return. Game still live; clock behaved as expected; browser was never terminated |
| 1.8 | Power long-press | Confirms before shutdown while a session is focused |
| 1.9 | Sustained play | Two profiles play five complete games each, no browser restart |
| 1.10 | Chess.com gate | Creating a Chess.com profile requires the PIN and shows the under-13 acknowledgment; cancelling leaves the profile unchanged |
| 1.11 | Boot time | **Measured and recorded, not gated.** See ADR discussion in the plan |

## Phase 2 — Appliance shell

| # | Test | Pass condition |
|---|---|---|
| 2.1 | Wi-Fi setup | A parent joins a WPA2 network using touch only |
| 2.2 | Captive portal | Device detects it, opens a restricted temporary browser, returns to the launcher on completion, and does **not** widen the launcher allowlist |
| 2.3 | Network loss mid-session | Friendly offline screen with retry and status; recovers when the network returns |
| 2.4 | Clock loss | `TIME_UNSYNCED` state shown rather than a confusing TLS error |
| 2.5 | **Stuck browser during a session** | User-visible "This looks stuck — restart?" prompt. **No silent kill while a session is focused** |
| 2.6 | Stuck browser at picker | Silent auto-restart is acceptable here |
| 2.7 | Play-time limit | Warns at 5 min remaining, then returns to picker. Counter survives a reboot |
| 2.8 | Per-profile wipe | Wipes that profile's user-data-dir completely; other profiles untouched and still signed in |
| 2.9 | PIN backoff | Wrong PIN attempts back off with increasing delay; no recovery path in the UI |
| 2.10 | Diagnostics export | Redacted: contains no URLs beyond the pinned origin, no cookies, no page content, no child's name |
| 2.11 | Factory test screen | Exercises touch grid, audio, network, storage, temperature |
| 2.12 | **Non-developer walkthrough** | A parent unboxes, joins Wi-Fi, creates two profiles, signs them in, recovers from network loss, and shuts down — **no terminal, no hardware keyboard** |

## Phase 3 — Reliability and security

### Fault matrix

Every row needs a documented result, including the ones that pass.

| Fault | Expected behaviour |
|---|---|
| Forced power loss during a session | Boots clean; no filesystem corruption; profiles intact |
| Forced power loss during an update | Rolls back to the previous known-good app version |
| Full disk | Degrades gracefully with a clear message; log ring does not fill the disk |
| Clock loss | `TIME_UNSYNCED` state; recovers on sync |
| Expired session | Returns the user to the site's own login; no credentials touched by our code |
| DNS failure | Distinguished from "no network" in the message shown |
| Weak / flapping Wi-Fi | No restart loop; retries with backoff |
| Browser crash | Restart per the ADR 0003 rules — prompt if a session was focused |
| Interrupted update | Rollback; device remains usable |
| Update while a session is focused | Deferred, not applied |

### Security verification

| # | Test | Pass condition |
|---|---|---|
| 3.1 | Port scan from the LAN | No unsolicited inbound services on any non-loopback interface |
| 3.2 | Local API from another host | Refused — bound to loopback only |
| 3.3 | Local API without token | Refused |
| 3.4 | Local API with a forged `Origin` | Refused |
| 3.5 | Policy directory permissions | Root-owned; **not writable by the kiosk user** |
| 3.6 | Credential leakage sweep | No password, 2FA code, or cookie appears in any log or diagnostics bundle |
| 3.7 | Update signature | An unsigned or tampered bundle is rejected |
| 3.8 | Repository secret scan | Full history, not just HEAD |
| 3.9 | `verify-fairplay.sh` | Passes; and deliberately introducing a violation makes it fail |

### Soak

Eight hours inside the enclosure at maximum brightness with periodic interaction.
Log temperature, throttling, memory, and crash counts throughout.

## Phase 4 — Field alpha

5–10 consenting households on dedicated test devices.

- Written parental consent for any household with under-13 participants
- Opt-in metrics only: boot time, crash/restart counts, temperature, setup
  completion, session duration
- **Never** collected: moves, page content, chat, URLs, screenshots, children's names
- Record usability problems and physical wear
- Do not imply platform endorsement anywhere in the materials

**Exit gate:** setup success above 90%; no critical security or fair-play issue;
browser crash-free sessions above 99%; a prioritised revision list.

## Continuous

| Cadence | Check |
|---|---|
| Every push | `verify-fairplay.sh`, shellcheck, policy JSON validity |
| Weekly, manual | Load both destinations at 1024×600 and walk the smoke checklist — the sites change and we do not control them |
| Before any field trial, distribution, partner conversation, or commercial step | Re-verify platform age rules, chat controls, terms, and fair-play policy. Re-read `child-safety.md` and `threat-model.md` |
