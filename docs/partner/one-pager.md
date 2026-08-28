# ChessBob — architecture and fair-play summary

*Draft. Attach to the Chess.com OAuth / Connected Board application, or bring to a
partner conversation. One page — resist the urge to grow it.*

---

## What it is

A dedicated tabletop touchscreen appliance that boots into a profile picker and opens
**ChessKid.com** in a locked-down browser session. Built for a household with 2–4
children sharing one device. No desktop, no browser chrome, no keyboard, no computer.

Raspberry Pi 5 · 7" 1024×600 capacitive touch · Raspberry Pi OS · Chromium.

## What it is not

It is **not** a Chess.com or ChessKid client. It does not reimplement your product,
reverse-engineer your protocol, or route around your web application. Your site
renders the game, owns the account, and receives every move. We own the appliance
around it: boot, Wi-Fi, display, touch, recovery, updates, and safe shutdown.

## Boundaries we hold, and how they are enforced

| Boundary | Enforcement |
|---|---|
| **No chess engine on the device** — not installed, not disabled, absent | CI check fails the build if any engine package or evaluation library appears anywhere in the tree |
| **No page inspection** — no DOM reads, no injected JavaScript, no debugger | The supervisor derives all state from process and compositor status only. Documented as an architecture decision record before any code was written |
| **No automation** — no Selenium, Playwright, Puppeteer, CDP | CI check rejects every such dependency |
| **No traffic interception** — TLS verification never weakened, no custom CA | CI check rejects `--disable-web-security`, `--ignore-certificate-errors`, `--remote-debugging-port` |
| **No credential handling** — passwords and 2FA are typed into your origin only | Local code never reads, proxies, logs, or transmits them. Password saving disabled by policy |
| **No private APIs** | The only API we would use is one you publish |

These are not assertions in a README. They run on every push, and the repository is
public so the checks can be inspected.

## Why ChessKid is the default

Every intended user is under 13. Chess.com requires users to be 13+, and your own
guidance directs younger families to ChessKid. ChessKid also gives parents a
self-serve per-kid "Disable Social Access" control, whereas Chess.com's Safe Mode
requires a support ticket per account.

So: ChessKid is the default destination for every profile. Chess.com is available per
profile only behind a parent PIN and an explicit acknowledgment of the 13+
requirement and the Parental Consent Form. The device does not attempt to verify age.

## Privacy

Nothing about gameplay leaves the device, because nothing about gameplay is
observable to it. No moves, no chat, no opponents, no results, no URLs beyond the
pinned origin, no screenshots, no child's name. No telemetry without an explicit
parent action.

## Browser lockdown

Each profile runs Chromium under managed policy with `URLBlocklist: ["*"]` and a
narrow allowlist for its destination — enforced by the browser, not by hiding the
address bar. Extensions blocked, DevTools disabled, downloads blocked, incognito
disabled, geolocation/notifications/USB/serial/Bluetooth denied.

## What we would like to discuss

1. **Authentication** — an approved OAuth or device-code sign-in flow, so a parent
   can sign a child in without typing a password on a 7" on-screen keyboard.
2. **ChessKid-specific terms** — whether a dedicated family appliance pointed at
   ChessKid raises any concern we have not anticipated.
3. **Fair-play review** — we would like the boundary above reviewed by your team, and
   we will publish whatever you ask us to publish.
4. **Branding** — the device currently uses neutral assets and carries an explicit
   "not affiliated with or endorsed by Chess.com or ChessKid" notice. Any use of your
   name, marks, board palettes, piece artwork, or sounds would happen only with
   written permission.
5. **The Safe Mode gap** — if the Chess.com destination is to exist at all, is there a
   path to enabling chat lockdown without a per-account support ticket?

We are not asking for a gameplay API. We are asking whether this is something you are
comfortable existing, and what would make you more comfortable.

---

*ChessBob is an independent hobby project, not affiliated with, endorsed by,
sponsored by, or approved by Chess.com Inc. Source: <https://github.com/babarkkhan/ChessBob>*
