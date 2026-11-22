// Vision cones and line of sight: the geometry every guard, camera and thief reads.
// A watcher sees a point when it is inside the cone's range and half-angle AND the
// segment between them crosses no wall or cover rectangle. Pure functions, no state.

import { COVER, SHADOWS, WALL } from './level.js';

function segmentHitsRect(x0, y0, x1, y1, r) {
  // Slab test: does segment (x0,y0)->(x1,y1) cross rectangle r?
  const dx = x1 - x0;
  const dy = y1 - y0;
  let lo = 0;
  let hi = 1;
  const dims = [
    { d: dx, p: x0, min: r.x, max: r.x + r.w },
    { d: dy, p: y0, min: r.y, max: r.y + r.h },
  ];
  for (const { d, p, min, max } of dims) {
    if (Math.abs(d) < 1e-9) {
      if (p < min || p > max) return false;
    } else {
      let t1 = (min - p) / d;
      let t2 = (max - p) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      lo = Math.max(lo, t1);
      hi = Math.min(hi, t2);
      if (lo > hi) return false;
    }
  }
  return true;
}

/** True when no wall or cover stands between (x0,y0) and (x1,y1). */
export function hasLineOfSight(x0, y0, x1, y1) {
  for (const rect of COVER) {
    if (segmentHitsRect(x0, y0, x1, y1, rect)) return false;
  }
  return true;
}

/** True when point (x,y) is inside the cone from (ox,oy) facing `angle`. */
export function inCone(ox, oy, angle, range, halfAngle, x, y) {
  const dx = x - ox;
  const dy = y - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1e-6) return true;
  const target = Math.atan2(dy, dx);
  let diff = target - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return Math.abs(diff) <= halfAngle;
}

/** True when (x,y) stands in one of the room's shadow pools. */
export function inShadow(x, y) {
  for (const s of SHADOWS) {
    const dx = x - s.x;
    const dy = y - s.y;
    if (dx * dx + dy * dy <= s.r * s.r) return true;
  }
  return false;
}

/** True when (x,y) is inside the walls and clear of every cover rectangle. */
export function isFree(x, y, radius) {
  if (x - radius < WALL || x + radius > 1280 - WALL) return false;
  if (y - radius < WALL || y + radius > 720 - WALL) return false;
  for (const rect of COVER) {
    if (x + radius > rect.x && x - radius < rect.x + rect.w && y + radius > rect.y && y - radius < rect.y + rect.h) return false;
  }
  return true;
}
