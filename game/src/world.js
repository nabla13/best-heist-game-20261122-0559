// The game's rules and state, with no drawing and no browser in it: the thief, the
// patrolling guards, the sweeping cameras, the loot, the smoke and the alarm meter.
// step() advances one fixed step and returns what happened as bit flags, so the caller
// can react without the world knowing about screens or sound. Nothing here allocates
// after createWorld returns, except the small event list the caller reads.
import {
  ALARM, CAMERA, GUARD, PLAYER, SCORE, SMOKE,
} from './config.js';
import {
  CAMERAS, COVER, EXIT, LOOT, PATROLS, SHADOWS, START,
} from './level.js';
import { hasLineOfSight, inCone, inShadow, isFree } from './vision.js';

export const EVENT_SPOTTED = 1;
export const EVENT_LOOT = 2;
export const EVENT_SMOKE = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_ESCAPED = 16;
export const EVENT_ALARM_HIGH = 32;

const TAU = Math.PI * 2;

function angleTo(x0, y0, x1, y1) {
  return Math.atan2(y1 - y0, x1 - x0);
}

function moveCircle(x, y, dx, dy, radius) {
  // Axis-separated slide: try x, then y, so a thief slides along walls and cases.
  const nx = x + dx;
  if (isFree(nx, y, radius)) x = nx;
  const ny = y + dy;
  if (isFree(x, ny, radius)) y = ny;
  return { x, y };
}

export function createWorld(random) {
  const player = {
    x: START.x, y: START.y, angle: -Math.PI / 2, sneaking: false, smoke: PLAYER.smokeBombs,
  };
  const guards = PATROLS.map((route) => ({
    route,
    index: 0,
    x: route[0].x,
    y: route[0].y,
    angle: angleTo(route[0].x, route[0].y, route[1].x, route[1].y),
    pause: 0,
    scanDir: 1,
    hunting: false,
    huntTimer: 0,
    targetX: 0,
    targetY: 0,
  }));
  const cameras = CAMERAS.map((c) => ({ ...c, angle: c.baseAngle }));
  const loot = LOOT.map((item) => ({ ...item, taken: false }));
  const clouds = [];
  const state = {
    player, guards, cameras, loot, clouds,
    alarm: 0, elapsed: 0, score: 0, lootValue: 0,
    seen: false, status: 'playing', sapphireTaken: false,
    spotted: false, highAlarmAnnounced: false,
  };

  function reset() {
    player.x = START.x;
    player.y = START.y;
    player.angle = -Math.PI / 2;
    player.sneaking = false;
    player.smoke = PLAYER.smokeBombs;
    for (let i = 0; i < guards.length; i += 1) {
      const g = guards[i];
      g.index = 0;
      g.x = g.route[0].x;
      g.y = g.route[0].y;
      g.angle = angleTo(g.route[0].x, g.route[0].y, g.route[1].x, g.route[1].y);
      g.pause = 0;
      g.hunting = false;
      g.huntTimer = 0;
    }
    for (const item of loot) item.taken = false;
    clouds.length = 0;
    state.alarm = 0;
    state.elapsed = 0;
    state.score = 0;
    state.lootValue = 0;
    state.seen = false;
    state.status = 'playing';
    state.sapphireTaken = false;
    state.spotted = false;
    state.highAlarmAnnounced = false;
  }

  function playerInSmoke() {
    for (const c of clouds) {
      const dx = player.x - c.x;
      const dy = player.y - c.y;
      if (dx * dx + dy * dy <= c.r * c.r) return true;
    }
    return false;
  }

  /** True when a smoke cloud stands between the watcher and the thief: the
   * cloud screens the sight line, so the thief need not stand inside it. */
  function smokeScreens(wx, wy) {
    for (const c of clouds) {
      const dx = player.x - wx;
      const dy = player.y - wy;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-6) return true;
      let t = ((c.x - wx) * dx + (c.y - wy) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const cx = wx + t * dx - c.x;
      const cy = wy + t * dy - c.y;
      if (cx * cx + cy * cy <= c.r * c.r) return true;
    }
    return false;
  }

  function stepGuard(g, dt) {
    if (g.hunting) {
      const dx = g.targetX - g.x;
      const dy = g.targetY - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        g.angle = angleTo(g.x, g.y, g.targetX, g.targetY);
        const moved = moveCircle(g.x, g.y, (dx / dist) * GUARD.chaseSpeed * dt, (dy / dist) * GUARD.chaseSpeed * dt, GUARD.radius);
        g.x = moved.x;
        g.y = moved.y;
      } else {
        g.huntTimer -= dt;
        g.angle += g.scanDir * 1.4 * dt;
        if (g.huntTimer <= 0) g.hunting = false;
      }
      return;
    }
    if (g.pause > 0) {
      g.pause -= dt;
      g.angle += g.scanDir * 0.9 * dt;
      return;
    }
    const target = g.route[(g.index + 1) % g.route.length];
    const dx = target.x - g.x;
    const dy = target.y - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      g.index = (g.index + 1) % g.route.length;
      g.pause = GUARD.pauseAtWaypoint;
      g.scanDir = -g.scanDir;
      return;
    }
    g.angle = angleTo(g.x, g.y, target.x, target.y);
    const moved = moveCircle(g.x, g.y, (dx / dist) * GUARD.patrolSpeed * dt, (dy / dist) * GUARD.patrolSpeed * dt, GUARD.radius);
    g.x = moved.x;
    g.y = moved.y;
  }

  /**
   * One fixed step. `input` is {mx, my, sneak, smoke, grab}: a move vector (each
   * component -1..1), whether Shift is held, and one-shot smoke/grab presses.
   * With `harmless` set (the title screen's backdrop) the patrols walk but nobody
   * is spotted, nothing is taken and the alarm never moves.
   */
  function step(dt, input, harmless) {
    let events = 0;
    if (state.status !== 'playing') return events;
    state.elapsed += dt;

    // The thief moves; sneaking is slower and harder to spot.
    const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.speed;
    player.sneaking = input.sneak;
    const len = Math.hypot(input.mx, input.my);
    if (len > 0.01) {
      const nx = (input.mx / Math.max(1, len)) * speed * dt;
      const ny = (input.my / Math.max(1, len)) * speed * dt;
      const moved = moveCircle(player.x, player.y, nx, ny, PLAYER.radius);
      player.x = moved.x;
      player.y = moved.y;
      player.angle = Math.atan2(ny, nx);
    }

    // Smoke bombs: a cloud the watchers cannot see through.
    if (input.smoke && player.smoke > 0 && !harmless) {
      player.smoke -= 1;
      clouds.push({ x: player.x, y: player.y, r: SMOKE.radius, t: SMOKE.duration });
      events |= EVENT_SMOKE;
    }
    for (let i = clouds.length - 1; i >= 0; i -= 1) {
      clouds[i].t -= dt;
      if (clouds[i].t <= 0) clouds.splice(i, 1);
    }

    // Cameras sweep; guards walk their patrols (or hunt the last seen spot).
    for (const cam of cameras) {
      cam.angle = cam.baseAngle + Math.sin((state.elapsed / CAMERA.sweepPeriod) * TAU + cam.phase * TAU) * (cam.arc / 2);
    }
    for (const g of guards) stepGuard(g, dt);

    // Detection: a watcher sees the thief inside its cone with a clear line of sight.
    let seen = false;
    let rate = 0;
    if (!harmless && !playerInSmoke()) {
      const shadow = inShadow(player.x, player.y);
      const sneak = player.sneaking ? ALARM.sneakFactor : 1;
      const factor = (shadow ? ALARM.shadowFactor : 1) * sneak;
      for (const g of guards) {
        if (inCone(g.x, g.y, g.angle, GUARD.viewRange, GUARD.viewHalfAngle, player.x, player.y)
          && hasLineOfSight(g.x, g.y, player.x, player.y)
          && !smokeScreens(g.x, g.y)) {
          seen = true;
          rate = Math.max(rate, ALARM.guardRate * factor);
          g.targetX = player.x;
          g.targetY = player.y;
        }
      }
      for (const cam of cameras) {
        if (inCone(cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, player.x, player.y)
          && hasLineOfSight(cam.x, cam.y, player.x, player.y)
          && !smokeScreens(cam.x, cam.y)) {
          seen = true;
          rate = Math.max(rate, ALARM.cameraRate * factor);
        }
      }
    }
    state.seen = seen;
    if (seen) {
      state.alarm = Math.min(100, state.alarm + rate * dt);
      if (!state.spotted) {
        state.spotted = true;
        events |= EVENT_SPOTTED;
      }
      if (state.alarm >= ALARM.huntThreshold) {
        for (const g of guards) {
          if (!g.hunting) {
            g.hunting = true;
            g.huntTimer = GUARD.huntTime;
          }
        }
      }
      if (state.alarm >= 75 && !state.highAlarmAnnounced) {
        state.highAlarmAnnounced = true;
        events |= EVENT_ALARM_HIGH;
      }
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
      if (state.alarm < ALARM.huntThreshold - 10) state.highAlarmAnnounced = false;
    }

    // Grab loot: smashing a glass case spikes the alarm.
    if (input.grab && !harmless) {
      for (const item of loot) {
        if (item.taken) continue;
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        if (dx * dx + dy * dy <= PLAYER.grabRange * PLAYER.grabRange) {
          item.taken = true;
          state.lootValue += item.value;
          state.score += item.value;
          state.alarm = Math.min(100, state.alarm + (item.kind === 'sapphire' ? ALARM.sapphireSpike : ALARM.grabSpike));
          if (item.kind === 'sapphire') state.sapphireTaken = true;
          events |= EVENT_LOOT;
          break;
        }
      }
    }

    // Caught: the alarm hits 100, or a guard lays a hand on the thief.
    if (state.alarm >= 100) {
      state.status = 'caught';
      events |= EVENT_CAUGHT;
      return events;
    }
    for (const g of guards) {
      const dx = player.x - g.x;
      const dy = player.y - g.y;
      if (dx * dx + dy * dy <= (PLAYER.radius + GUARD.radius) * (PLAYER.radius + GUARD.radius)) {
        state.status = 'caught';
        events |= EVENT_CAUGHT;
        return events;
      }
    }

    // Escape: the Sapphire in hand and the thief back at the exit vent.
    if (state.sapphireTaken
      && player.x > EXIT.x && player.x < EXIT.x + EXIT.w
      && player.y > EXIT.y && player.y < EXIT.y + EXIT.h) {
      const timeBonus = Math.max(0, Math.round(SCORE.timeBonusMax * (1 - state.elapsed / SCORE.timeBonusWindow)));
      const stealth = state.spotted ? 0 : SCORE.stealthBonus;
      state.score += timeBonus + stealth;
      state.status = 'escaped';
      events |= EVENT_ESCAPED;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
