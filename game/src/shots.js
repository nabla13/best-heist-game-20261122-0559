// The screenshot scenes behind ?shot=start|play|alarm|end. Each one plays the real
// rules forward from a fresh world, steered by a small autopilot that samples eight
// directions and picks the one that best balances reaching the next loot against
// standing in a vision cone — so the frame is what a short game really looks like
// and the same seed always gives the same frame.
import { ALARM, CAMERA, GUARD, PLAYER, STEP } from './config.js';
import { CAMERAS, EXIT, PATROLS } from './level.js';
import { hasLineOfSight, inCone, isFree } from './vision.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 11;
const ALARM_LIMIT_SECONDS = 120;
const END_LIMIT_SECONDS = 240;
const LOOKAHEAD = 0.25;

const DIRECTIONS = [
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

/** Detection rate (per second) the thief would suffer standing at (x, y). */
function riskAt(state, x, y) {
  let risk = 0;
  for (const g of state.guards) {
    if (inCone(g.x, g.y, g.angle, GUARD.viewRange, GUARD.viewHalfAngle, x, y)
      && hasLineOfSight(g.x, g.y, x, y)) risk = Math.max(risk, ALARM.guardRate);
  }
  for (const cam of state.cameras) {
    if (inCone(cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, x, y)
      && hasLineOfSight(cam.x, cam.y, x, y)) risk = Math.max(risk, ALARM.cameraRate);
  }
  return risk;
}

/** Where the autopilot is headed: the nearest loot still there, else the exit. */
function currentTarget(state) {
  let target = null;
  let best = Infinity;
  for (const item of state.loot) {
    if (item.taken) continue;
    // The Sapphire is the job: head for it before the side loot.
    const d = item.kind === 'sapphire' ? 0 : Math.hypot(item.x - state.player.x, item.y - state.player.y);
    if (d < best) {
      best = d;
      target = item;
    }
  }
  if (target !== null) return { x: target.x, y: target.y };
  return { x: EXIT.x + EXIT.w / 2, y: EXIT.y + EXIT.h / 2 };
}

/** A hard penalty for stepping close to a guard: being seen is survivable, being
 * touched ends the run, so the autopilot keeps its distance even mid-dash. */
function touchPenalty(state, x, y) {
  let penalty = 0;
  for (const g of state.guards) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < 80) penalty += (80 - d) * 40;
  }
  return penalty;
}

/** Where the thief would end up after one step that way — the same axis-separated
 * slide the world uses, so a direction blocked by a case is never "best". */
function slidPosition(p, dx, dy) {
  const stepX = (dx / Math.max(1, Math.hypot(dx, dy))) * PLAYER.speed * LOOKAHEAD;
  const stepY = (dy / Math.max(1, Math.hypot(dx, dy))) * PLAYER.speed * LOOKAHEAD;
  let x = p.x;
  let y = p.y;
  if (isFree(x + stepX, y, PLAYER.radius)) x += stepX;
  if (isFree(x, y + stepY, PLAYER.radius)) y += stepY;
  return { x, y };
}

// --- A small grid pathfinder, so the autopilot routes around cases instead of
// pressing its nose against one forever. Cells are 40 px; a cell is walkable
// when a thief standing at its centre clears every wall and case. The search is
// Dijkstra over a danger-weighted cost: cells near a patrol route or a camera
// cost more, so the route prefers the quiet corridors (south, then the west
// edge) over the shortest line through the middle of the room.
const GRID = 40;
const COLS = Math.ceil(1280 / GRID);
const ROWS = Math.ceil(720 / GRID);

function cellFree(cx, cy) {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return false;
  return isFree(cx * GRID + GRID / 2, cy * GRID + GRID / 2, PLAYER.radius + 2);
}

let dangerMap = null;
function dangerAt(cx, cy) {
  if (dangerMap === null) {
    dangerMap = new Float32Array(COLS * ROWS);
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const wx = x * GRID + GRID / 2;
        const wy = y * GRID + GRID / 2;
        let danger = 0;
        for (const route of PATROLS) {
          for (const wp of route) {
            const d = Math.hypot(wp.x - wx, wp.y - wy);
            if (d < 320) danger += (1 - d / 320) * 2;
          }
        }
        for (const cam of CAMERAS) {
          const d = Math.hypot(cam.x - wx, cam.y - wy);
          if (d < 300) danger += (1 - d / 300) * 1.5;
        }
        dangerMap[y * COLS + x] = danger;
      }
    }
  }
  return dangerMap[cy * COLS + cx];
}

/**
 * The nearest walkable cell to (tx,ty) from which the target can be reached:
 * for loot, the cell centre must be within grab range of the piece (loot sits
 * in a glass case, so the cell right against the glass is the one to stand on);
 * for the exit, any walkable cell inside the vent will do.
 */
function nearestFreeCell(tx, ty, reach) {
  const gx = Math.floor(tx / GRID);
  const gy = Math.floor(ty / GRID);
  const candidates = [];
  for (let r = 0; r <= 4; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const cx = gx + dx;
        const cy = gy + dy;
        if (!cellFree(cx, cy)) continue;
        const wx = cx * GRID + GRID / 2;
        const wy = cy * GRID + GRID / 2;
        candidates.push({ x: cx, y: cy, d: Math.hypot(wx - tx, wy - ty) });
      }
    }
  }
  candidates.sort((a, b) => a.d - b.d);
  for (const c of candidates) {
    if (reach === undefined || c.d <= reach) return { x: c.x, y: c.y };
  }
  return candidates.length > 0 ? { x: candidates[0].x, y: candidates[0].y } : { x: gx, y: gy };
}

function findPath(sx, sy, tx, ty, reach, dangerFactor = 8) {
  const start = { x: Math.floor(sx / GRID), y: Math.floor(sy / GRID) };
  const goal = nearestFreeCell(tx, ty, reach);
  const key = (x, y) => y * COLS + x;
  // Dijkstra over the danger-weighted cost; the grid is small, so a plain
  // sorted list is the queue. Diagonal steps cost sqrt(2) as they should.
  const dist = new Map([[key(start.x, start.y), 0]]);
  const prev = new Map();
  const open = [{ x: start.x, y: start.y, cost: 0 }];
  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i].cost < open[best].cost) best = i;
    const cur = open.splice(best, 1)[0];
    if (cur.x === goal.x && cur.y === goal.y) break;
    if (cur.cost > (dist.get(key(cur.x, cur.y)) ?? Infinity)) continue;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (!cellFree(nx, ny)) continue;
        const stepCost = (dx !== 0 && dy !== 0 ? 1.414 : 1) * (1 + dangerAt(nx, ny) * dangerFactor);
        const next = cur.cost + stepCost;
        if (next < (dist.get(key(nx, ny)) ?? Infinity)) {
          dist.set(key(nx, ny), next);
          prev.set(key(nx, ny), cur);
          open.push({ x: nx, y: ny, cost: next });
        }
      }
    }
  }
  // Reconstruct from the goal; if unreachable, fall back to the goal cell itself.
  const cells = [];
  let cur = goal;
  let guard = 0;
  while (!(cur.x === start.x && cur.y === start.y) && guard < COLS * ROWS) {
    cells.unshift(cur);
    const p = prev.get(key(cur.x, cur.y));
    if (!p) break;
    cur = p;
    guard += 1;
  }
  return cells.map((c) => ({ x: c.x * GRID + GRID / 2, y: c.y * GRID + GRID / 2 }));
}

/**
 * A steering pilot that keeps a path to the current target and re-plans when the
 * target changes or the path runs out. Each step it steers toward the next
 * waypoint, trading progress against standing in a cone — and close to the
 * target it commits to the dash, because a short burst of exposure is
 * survivable and dithering in a cone is not.
 */
export function makePilot(riskWeight, dangerFactor = 8) {
  let path = [];
  let targetKey = '';
  let replanIn = 0;

  return function autopilot(state) {
    const p = state.player;
    const target = currentTarget(state);
    const key = `${target.x},${target.y}`;
    replanIn -= 1;
    if (key !== targetKey || path.length === 0 || replanIn <= 0) {
      // Loot counts as reached from grab range; the exit only by standing in it.
      const isExit = target.x === EXIT.x + EXIT.w / 2 && target.y === EXIT.y + EXIT.h / 2;
      const reach = isExit ? undefined : PLAYER.grabRange;
      path = findPath(p.x, p.y, target.x, target.y, reach, dangerFactor);
      targetKey = key;
      replanIn = 30;
    }
    while (path.length > 0 && Math.hypot(path[0].x - p.x, path[0].y - p.y) < 24) path.shift();
    const steer = path.length > 0 ? path[0] : target;
    // Steer by angle toward the next waypoint: the direction is anchored to the
    // path, so it cannot flip-flop between two steps the way a pure distance
    // cost can when the lookahead overshoots a waypoint. Cones and nearby
    // guards bend the choice away from the straight line; close to the target
    // the thief commits to the dash.
    const want = Math.atan2(steer.y - p.y, steer.x - p.x);
    const close = Math.hypot(target.x - p.x, target.y - p.y) < 100;
    let bestDir = DIRECTIONS[0];
    let bestCost = Infinity;
    for (const [dx, dy] of DIRECTIONS) {
      const ang = Math.atan2(dy, dx);
      let diff = Math.abs(ang - want);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      const pos = slidPosition(p, dx, dy);
      const risk = close ? 0 : riskAt(state, pos.x, pos.y) * riskWeight;
      // A direction that runs straight into a case moves nobody: it must lose
      // to one that slides along the case, even if the angle looks worse.
      const moved = Math.hypot(pos.x - p.x, pos.y - p.y);
      const blocked = moved < 1 ? 1000 : 0;
      const cost = diff * 60 + risk + touchPenalty(state, pos.x, pos.y) + blocked;
      if (cost < bestCost) {
        bestCost = cost;
        bestDir = [dx, dy];
      }
    }
    const len = Math.hypot(bestDir[0], bestDir[1]);
    return { mx: bestDir[0] / len, my: bestDir[1] / len };
  };
}

function nearLoot(state) {
  for (const item of state.loot) {
    if (item.taken) continue;
    const dx = state.player.x - item.x;
    const dy = state.player.y - item.y;
    if (dx * dx + dy * dy <= PLAYER.grabRange * PLAYER.grabRange) return true;
  }
  return false;
}

/**
 * Set `world` to the named scene (start, play, alarm or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name !== 'play' && name !== 'alarm' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { mx: 0, my: 0, sneak: false, smoke: false, grab: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'alarm') {
    // A reckless thief: the shortest line at the Sapphire, no regard for cones
    // and no danger-avoiding route, until the alarm is screaming — then freeze
    // on the tension, before the lockdown.
    const pilot = makePilot(0, 0);
    for (let i = 0; i < ALARM_LIMIT_SECONDS / STEP; i += 1) {
      const move = pilot(state);
      const input = { mx: move.mx, my: move.my, sneak: false, smoke: false, grab: nearLoot(state) };
      world.step(STEP, input, false);
      if (state.status !== 'playing') break;
      if (state.alarm >= 68) break;
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const pilot = makePilot(name === 'end' ? 150 : 300);
  for (let i = 0; i < limit / STEP; i += 1) {
    const move = pilot(state);
    const useSmoke = state.seen && state.alarm > 15 && state.player.smoke > 0;
    const input = {
      mx: move.mx, my: move.my, sneak: state.seen, smoke: useSmoke, grab: nearLoot(state),
    };
    world.step(STEP, input, false);
    if (state.status !== 'playing') break;
  }
  if (state.status === 'escaped') return { screen: SCREEN_WIN, best: state.score };
  if (state.status === 'caught') return { screen: SCREEN_OVER, best: state.score };
  return { screen: SCREEN_PLAY, best: state.score };
}
