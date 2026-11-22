// The Gilded Vault's one room: walls, cover, shadow pools, patrol routes, cameras,
// loot and the exit. Nothing here moves; world.js moves the things that live in it.
// Coordinates are in the 1280x720 field. Cover blocks movement and line of sight;
// shadow pools only slow detection, so a thief must read both before moving.

export const WALL = 26;

/** Axis-aligned rectangles the thief and guards cannot cross, and that block sight. */
export const COVER = [
  // West wing display cases — the camera route.
  { x: 150, y: 150, w: 120, h: 54, kind: 'case' },
  { x: 150, y: 500, w: 120, h: 54, kind: 'case' },
  // Centre pillars — the guard route.
  { x: 560, y: 130, w: 46, h: 46, kind: 'pillar' },
  { x: 560, y: 544, w: 46, h: 46, kind: 'pillar' },
  { x: 760, y: 130, w: 46, h: 46, kind: 'pillar' },
  { x: 760, y: 544, w: 46, h: 46, kind: 'pillar' },
  // East wing long cases — the shadow route.
  { x: 1010, y: 150, w: 120, h: 54, kind: 'case' },
  { x: 1010, y: 500, w: 120, h: 54, kind: 'case' },
  // (The Sapphire stands on an open pedestal, not behind cover: the roving
  // guard walks straight past it, so the grab is a matter of timing, not of
  // finding a way through a wall.)
];

/** Dark pools where a thief is harder to spot. Circles: {x, y, r}. */
export const SHADOWS = [
  { x: 210, y: 360, r: 78 },
  { x: 1070, y: 360, r: 78 },
  { x: 660, y: 640, r: 66 },
  // A dim corner by the exit vent: the last stretch of the getaway.
  { x: 180, y: 140, r: 62 },
];

/** Guard patrol loops: lists of waypoints a guard walks in order, pausing at each. */
export const PATROLS = [
  // North guard sweeps the top corridor past the Sapphire.
  [
    { x: 380, y: 110 },
    { x: 900, y: 110 },
    { x: 900, y: 230 },
    { x: 380, y: 230 },
  ],
  // South guard sweeps the bottom corridor and the shadowed south lane.
  [
    { x: 900, y: 650 },
    { x: 380, y: 650 },
    { x: 380, y: 490 },
    { x: 900, y: 490 },
  ],
  // Roving guard crosses the middle, past the pedestal.
  [
    { x: 660, y: 250 },
    { x: 660, y: 470 },
  ],
];

/** Wall cameras: a fixed mount, a centre sweep angle and a sweep arc. */
export const CAMERAS = [
  { x: 300, y: 40, baseAngle: Math.PI / 2, arc: 1.5, phase: 0 },
  { x: 980, y: 680, baseAngle: -Math.PI / 2, arc: 1.5, phase: 0.5 },
];

/** Loot on the floor: the Sapphire on its pedestal, the rest in glass cases. */
export const LOOT = [
  { id: 'sapphire', kind: 'sapphire', x: 660, y: 360, value: 500 },
  { id: 'idol', kind: 'idol', x: 210, y: 177, value: 150 },
  { id: 'mask', kind: 'mask', x: 1070, y: 177, value: 150 },
  { id: 'necklace', kind: 'necklace', x: 1070, y: 527, value: 100 },
];

export const START = { x: 90, y: 640 };
export const EXIT = { x: 78, y: 96, w: 64, h: 30 };

/** The room's inner bounds (inside the walls). */
export function innerBounds() {
  return { x0: WALL, y0: WALL, x1: 1280 - WALL, y1: 720 - WALL };
}
