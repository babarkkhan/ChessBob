# systemd units

Not installed yet -- these are the intended shape, pending Phase 1.

| Unit | Role |
|---|---|
| `chessbob-supervisor.service` | State machine, device API, GPIO. Always running |
| `chessbob-online.service` | Content browser pointed at the chess site |
| `chessbob-offline.service` | Content browser pointed at the local board + engine |

## The mode boundary

`chessbob-online.service` and `chessbob-offline.service` declare `Conflicts=` on each
other. Starting one stops the other, enforced by the init system rather than by our own
code remembering to.

This is one of three independent layers keeping the offline engine away from online
play (see [ADR 0009](../../docs/adr/0009-offline-engine-design.md)):

1. Both modes use the **same single content-browser process slot**
2. Chromium **managed policy is default-deny in both directions**
3. This `Conflicts=`

`ExecStartPre=apply-policy <mode>` matters and is not decoration: Chromium reads
managed policy **only at startup**, so the policy file must be swapped before the
browser launches. Writing it afterwards does nothing until the next launch.
