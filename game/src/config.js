// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends on
// the screen size. The Gilded Vault is one museum gallery at night: a thief crosses
// it, guards and cameras sweep it, and the Star Sapphire waits on its pedestal.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  speed: 205,
  sneakSpeed: 115,
  smokeBombs: 3,
  grabRange: 46,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 78,
  chaseSpeed: 115,
  viewRange: 265,
  /** Half-angle of a guard's vision cone, in radians. */
  viewHalfAngle: 0.56,
  pauseAtWaypoint: 1.1,
  /** Seconds a guard keeps hunting the last seen spot before giving up. */
  huntTime: 4.5,
};

export const CAMERA = {
  range: 250,
  /** Half-angle of a camera's vision cone, in radians. */
  halfAngle: 0.42,
  /** Seconds for one full sweep out and back. */
  sweepPeriod: 5.2,
};

/** Alarm 0..100. Seen raises it; hidden lets it fall. At 100 the vault locks down. */
export const ALARM = {
  guardRate: 30,
  cameraRate: 22,
  decay: 8,
  /** Detection rate is multiplied by this inside a shadow pool. */
  shadowFactor: 0.45,
  /** Detection rate is multiplied by this while sneaking. */
  sneakFactor: 0.55,
  /** Alarm added when a glass case is smashed open for loot. */
  grabSpike: 8,
  sapphireSpike: 15,
  /** Above this, guards leave their patrols and hunt the last seen spot. */
  huntThreshold: 50,
};

export const SMOKE = { radius: 95, duration: 4.0 };

/** Loot values in dollars. The Sapphire is the job; the rest is bonus. */
export const LOOT_VALUES = { sapphire: 500, idol: 150, mask: 150, necklace: 100 };

export const SCORE = {
  timeBonusMax: 300,
  /** Seconds after which the time bonus has fully decayed. */
  timeBonusWindow: 150,
  stealthBonus: 100,
};

export const PALETTE = {
  floorA: '#1d2333',
  floorB: '#252e45',
  wall: '#3a2f4d',
  wallTop: '#4d3f66',
  rope: '#8a2f3c',
  gold: '#f2c94c',
  goldDim: '#a8873a',
  sapphire: '#59d8e8',
  shadow: '#0d1120',
  coneGuard: 'rgba(229, 83, 75, 0.20)',
  coneCamera: 'rgba(242, 201, 76, 0.16)',
  coneEdge: 'rgba(229, 83, 75, 0.55)',
  thief: '#e8e4d8',
  thiefCloak: '#2e3a56',
  guard: '#c94f43',
  guardCap: '#7c2f28',
  cameraBody: '#9aa3b2',
  panel: 'rgba(10, 13, 24, 0.82)',
  text: '#eef1f5',
  muted: '#9aa3b8',
  alarm: '#e5534b',
  safe: '#58c98a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gilded-vault.best';
