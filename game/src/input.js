// Keyboard and pointer input. Held keys give a steering vector; one-shot presses
// (grab, smoke, start, pause) are queued as bit flags and taken once by the loop,
// so a press between two frames is never lost and never counted twice. The mouse
// steers too: hold the button and the thief walks toward the pointer.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_GRAB = 4;
export const ACTION_SMOKE = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const GRAB = new Set(['KeyE']);
const SMOKE = new Set(['KeyQ']);

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  let pointer = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code)
      || RIGHT.has(event.code) || SNEAK.has(event.code)) {
      held.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (GRAB.has(event.code)) {
      if (!event.repeat) actions |= ACTION_GRAB;
    } else if (SMOKE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SMOKE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    held.clear();
    pointer = null;
  });
  target.addEventListener('pointerdown', (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointermove', (event) => {
    if (pointer !== null) pointer = { x: event.clientX, y: event.clientY };
  });
  target.addEventListener('pointerup', () => {
    pointer = null;
  });

  function keyVector() {
    let mx = 0;
    let my = 0;
    for (const code of held) {
      if (LEFT.has(code)) mx -= 1;
      else if (RIGHT.has(code)) mx += 1;
      else if (UP.has(code)) my -= 1;
      else if (DOWN.has(code)) my += 1;
    }
    return { mx, my };
  }

  return {
    /** Move vector in canvas pixels: keys, or toward the held pointer. */
    moveVector(rect, scale) {
      const keys = keyVector();
      if (keys.mx !== 0 || keys.my !== 0) return keys;
      if (pointer === null) return { mx: 0, my: 0 };
      const cx = (pointer.x - rect.left) / scale;
      const cy = (pointer.y - rect.top) / scale;
      return { mx: cx, my: cy, pointer: true };
    },
    sneaking() {
      for (const code of held) if (SNEAK.has(code)) return true;
      return false;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
