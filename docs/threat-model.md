# Threat model

## Assets

| Asset | Why it matters |
|---|---|
| Children's chess account sessions (cookies) | Account takeover; a compromised kid account is a real harm |
| The parent PIN | Gates every protective control on the device |
| Wi-Fi credentials | Pivot into the home network |
| The device's reputation for fair play | Loss is unrecoverable and takes the project with it |
| The children's privacy | Names, play habits, anything that identifies a minor |

## Adversaries

### 1. A curious nine-year-old with unlimited time

**The most likely adversary, and the one most often left out of threat models.** Not
malicious, extremely persistent, and physically present.

| Attempt | Mitigation |
|---|---|
| Navigate off the chess site via a link or redirect | Managed policy `URLBlocklist: ["*"]` + narrow allowlist — enforced by the browser, not by hiding the address bar |
| Use a sibling's profile | Separate `--user-data-dir` per profile; switching restarts the browser |
| Get past the play-time limit by rebooting | Counters persist to disk and are read at boot |
| Guess the parent PIN | Rate-limit attempts with increasing backoff; no PIN recovery in the UI |
| Find the settings screen | Every settings path is behind the gate; no keyboard shortcut bypasses |
| Pull the microSD | Accepted — physical access wins. Mitigated only by making the card non-obvious in the enclosure |
| Plug in a USB keyboard | Kiosk session has no terminal, no shell, no launcher; policy blocks navigation regardless |

### 2. A hostile website reached from the chess site

Mitigated by the default-deny allowlist, normal browser sandboxing (never weakened —
see `verify-fairplay.sh`), no extensions, downloads blocked, and geolocation /
notifications / USB / serial / Bluetooth denied by policy.

### 3. Someone on the local network

| Attempt | Mitigation |
|---|---|
| Reach the local device API | Bound to `127.0.0.1` only; unguessable per-boot token; `Origin` validated; POST-only state changes; every action allowlisted |
| Reach an inbound service | No unsolicited inbound services. Firewall default-deny. SSH off by default, or key-only on a development VLAN |
| Attach to remote debugging | `--remote-debugging-port` is never used and is rejected by CI |
| Intercept TLS | No interception anywhere in the project; no custom CA is installed |

### 4. Someone with physical access and a shell

**Accepted risk, stated honestly.** Every profile runs as the same OS user, so a
process with code execution as that user can read every profile's cookies. The
profile split is isolation *between children on a family device*, not a security
boundary against a local attacker.

Reducing this properly means one OS user per profile, which brings its own complexity
(per-user sessions, per-user compositor, switching cost). Revisit only if the device
ever leaves a single household.

### 5. The device itself, as a fair-play risk

The threat is that ChessBob assists a player, or is *believed* to.

| Vector | Mitigation |
|---|---|
| Engine on the device | None installed at all; CI-enforced ([ADR 0002](adr/0002-no-engine-on-device.md)) |
| Overlay or second window showing a suggestion | Single fullscreen surface; no notification surface; no companion app |
| Page inspection feeding an external helper | Structurally impossible — the supervisor never reads the page ([ADR 0003](adr/0003-supervisor-never-inspects-page-content.md)) |
| Move automation | No automation framework may exist in the tree; CI-enforced |
| Belief without evidence | Publish the boundary and the CI check; seek formal review before any distribution |

## Hardening checklist before the device leaves the bench

- [ ] Unique non-default local account; no default password anywhere
- [ ] SSH disabled by default, or key-only and restricted to a development VLAN
- [ ] Firewall default-deny inbound; no listening services on non-loopback interfaces
- [ ] Local device API bound to loopback, token-authenticated, action-allowlisted
- [ ] Chromium managed policy directory root-owned, not writable by the kiosk user
- [ ] No remote debugging, no DevTools, no extensions, no custom CA
- [ ] Parent PIN stored hashed; never logged
- [ ] Log ring size-limited; diagnostics export redacted and parent-initiated
- [ ] Signed application releases, pinned channel
- [ ] Hardware watchdog; graceful shutdown; power-loss tested
- [ ] Repository free of secrets across full history, not just HEAD

## Privacy commitments

The device does not collect, store, log, or transmit: passwords, 2FA codes, page
content, chat, moves, opponents, results, URLs beyond the pinned origin, keystrokes,
screenshots, or any child's real name.

Field-alpha metrics, if collected at all, are opt-in per household and limited to
boot time, crash counts, temperature, setup completion, and session duration.

## Review cadence

Re-verify platform policies (age rules, chat controls, terms) and this document
before **any** field trial, any distribution outside your own household, any
partnership conversation, and any commercial step.
