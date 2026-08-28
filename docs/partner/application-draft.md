# Chess.com OAuth / Connected Board application — draft

**Status: draft for Babar to review and submit. Do not submit without reading it end
to end and correcting anything that overstates where the project actually is.**

- Form: <https://forms.gle/RwGLuZkwDysCj2GV7>
- Announcement: [Chess.com OAuth / Login / Connected Board Application](https://www.chess.com/blog/CHESScom/chess-com-oauth-login-connected-board-application)
- Attach or link: [`one-pager.md`](one-pager.md) and <https://github.com/babarkkhan/ChessBob>

## Why submit now rather than after a demo

The application is free, and the queue has historically been slow — the developer
forum thread has staff acknowledging delays. The answer determines whether an
approved sign-in flow is ever available to us, which changes the roadmap. Getting
into the queue in week 1 costs nothing and the substantive conversation still happens
later, with a working device.

**Be honest that it is a prototype.** Do not imply a shipping product, a company, or
users who do not exist. Overstating here is the one thing that could poison a
relationship we actually want.

---

## Suggested answers

**What are you building?**

> A dedicated touchscreen chess appliance for families — a small tabletop device with
> a 7" touch screen that boots straight into ChessKid, with a profile picker so 2–4
> children in one household can each have their own signed-in session. No desktop, no
> browser chrome, no keyboard.
>
> It is a browser appliance, not a client. ChessKid's own web application renders
> everything and owns the account and the game. Our software owns boot, Wi-Fi,
> display and touch, the family profile model, recovery, updates, and safe shutdown.
>
> It is currently a personal prototype on a Raspberry Pi. There is no product, no
> company, and no users beyond my own household.

**What do you need access for?**

> Primarily an approved sign-in flow. Today a parent has to type a child's password
> and any 2FA code on a 7" on-screen keyboard, which is the worst part of the
> experience. An OAuth or device-code flow would remove it entirely.
>
> I am not asking for a gameplay or move-submission API. The device does not submit
> moves and is not designed to — children tap the board in your own web UI.

**Which platform?**

> ChessKid primarily. Every intended user is under 13, and your own guidance points
> families with younger children to ChessKid rather than Chess.com. Chess.com is
> available on the device only for a profile a parent explicitly enables behind a PIN,
> after acknowledging the 13+ requirement and the Parental Consent Form.

**Connected board?**

> No. This is a touch terminal. There is no physical sensing board, and none is
> planned.

**How do you handle fair play?**

> No chess engine is installed on the device at all — not disabled, not present and
> gated, absent. The software never reads page content, injects JavaScript, attaches
> a debugger, or intercepts traffic, so it structurally cannot feed an external
> helper. There is no automation framework anywhere in the codebase.
>
> These are enforced by a check that runs in CI on every push, in a public
> repository, so they can be inspected rather than taken on trust:
> <https://github.com/babarkkhan/ChessBob>
>
> I would welcome a review of this boundary by your fair-play team.

**How do you handle credentials?**

> Passwords and 2FA codes are typed only into your own HTTPS origin. Our code never
> reads, proxies, logs, or transmits them. Password saving is disabled by browser
> policy. Session cookies are treated as account tokens: dedicated per-profile browser
> profile, no remote debugging, and a parent-initiated "sign out and wipe".

**What data do you collect?**

> Nothing about gameplay, because nothing about gameplay is observable to the device.
> No moves, chat, opponents, results, page content, URLs beyond the pinned origin,
> screenshots, keystrokes, or children's names. Locally the device stores network
> configuration, profile display names and settings, a hashed parent PIN, software
> version, and coarse health data such as temperature and crash counts. Nothing is
> transmitted without an explicit parent action.

**Branding?**

> The device uses entirely neutral assets. No Chess.com or ChessKid marks, logos,
> board colour palettes, piece artwork, or sounds are used anywhere, and the public
> repository carries an explicit "not affiliated with or endorsed by" notice. Any use
> of your assets would only happen with written permission.

**Anything else?**

> Two questions I would value guidance on:
>
> 1. Is a dedicated family appliance pointed at ChessKid something you are comfortable
>    existing? If there are conditions that would make you more comfortable, I would
>    rather hear them now than after building.
> 2. Chess.com's Safe Mode currently requires a support ticket per account. For a
>    children's device that is a meaningful gap. Is there a path to enabling chat
>    lockdown without one? If not, I am inclined to remove the Chess.com destination
>    from the device entirely.

---

## Before submitting — checklist

- [ ] Repository is public, CI is green, and the fair-play check visibly passes
- [ ] README carries the "not affiliated" notice
- [ ] No secrets in the repository, across full history
- [ ] `one-pager.md` reviewed and accurate
- [ ] Nothing in the above overstates the project's stage
- [ ] Contact email is one you will actually monitor for months
