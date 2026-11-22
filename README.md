# The Gilded Vault

A heist game for the make.fun best-heist-game bounty: one museum gallery at night,
one thief, three patrolling guards, two sweeping cameras, and the Star Sapphire on
its pedestal in the middle of the room.

## How to play

Open `game/index.html` in a desktop browser (or serve the folder: `node serve.ts`,
then http://localhost:8080).

- **WASD / arrow keys** — move (hold the mouse button to walk toward the pointer)
- **Shift** — sneak (slower, harder to spot)
- **E** — grab loot from a glass case or the pedestal
- **Q** — throw a smoke bomb (3 per run; smoke screens sight lines)
- **P / Esc** — pause

Steal the **Star Sapphire** ($500), grab the side loot if you dare (Gold Idol $150,
Jade Mask $150, Pearl Necklace $100), then slip out through the **exit vent** in the
top-left wall. The alarm meter rises while any guard or camera has you in its vision
cone — in shadow and while sneaking it rises slower; hidden, it falls. At 100% the
vault locks down. Above 50%, guards leave their patrols and hunt the last place they
saw you. A guard laying a hand on you ends the run the same way.

Score is loot plus a time bonus (up to $300 for a fast getaway) and a $100 stealth
bonus for never being spotted. Your best score is kept in the browser.

## The room

- **Three guards** walk fixed patrols and pause to scan at each waypoint; above 50%
  alarm they hunt the last seen spot for a few seconds before giving up.
- **Two wall cameras** sweep their arcs on a fixed period.
- **Shadow pools** (the dark patches on the floor) cut the detection rate by more
  than half — the dim corner by the exit vent is the last stretch of the getaway.
- **Display cases and pillars** block movement and line of sight: a cone stops at a
  case, so the room is read in lanes, not crossed in a straight line.
- **Smoke** blocks a watcher's sight line through the cloud, so a bomb thrown between
  you and a guard screens a retreat as well as a hiding place.

## Files

- `game/index.html` — the page; `game/src/main.js` — boot and the one loop
- `game/src/world.js` — the rules (thief, guards, cameras, loot, smoke, alarm)
- `game/src/vision.js` — vision cones, line of sight, shadow pools, collision
- `game/src/level.js` — the room: cover, patrols, cameras, loot, exit
- `game/src/render.js` — everything drawn (canvas 2D, no images)
- `game/src/input.js`, `game/src/audio.js` — keyboard/pointer, synthesised sounds
- `game/src/shots.js` — the screenshot scenes (`?shot=start|play|alarm|end`)
- `game/src/config.js`, `game/src/random.js` — tuning and the seeded RNG
- `main.ts` — hands the entry in (copies `game/` + `screenshots/`, writes the
  dossier with the vendored make.fun library); `serve.ts` — local static server
- `shots.json` — the four screenshot scenes; `vendor/makefun-game.ts` — the
  make.fun dossier library, copied unchanged from the bounty kit

## Screenshots

`?shot=start` (title), `?shot=play` (mid-heist), `?shot=alarm` (alarm at 68%),
`?shot=end` (clean getaway). Add `&seed=N` to fix the patrol pattern.

## License

MIT — see `LICENSE`.
