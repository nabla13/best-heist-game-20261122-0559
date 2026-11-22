// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what
// is there. The game moves between five screens: title, play, paused, caught and
// escaped (a clean getaway).
//
// ?seed=N fixes the patrol pattern. ?shot=start|play|alarm|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_CAUGHT, EVENT_ESCAPED, EVENT_LOOT, EVENT_SMOKE,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_GRAB, ACTION_PAUSE, ACTION_SMOKE, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
// For play-tests and screenshots: the live world, readable from the console.
window.__vault = world;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, world.state.elapsed);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let pendingGrab = false;
  let pendingSmoke = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    pendingGrab = false;
    pendingSmoke = false;
    screen = SCREEN_PLAY;
    announce('Playing. Steal the Star Sapphire, then reach the exit.');
  }

  function endRun(win) {
    screen = win ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(win
      ? `Clean getaway. Score ${world.state.score}. Best ${best}.`
      : `Caught. Score ${world.state.score}. Best ${best}.`);
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { mx: 0, my: 0, sneak: false, smoke: false, grab: false }, true);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const mv = input.moveVector(rect, scale);
    let mx = mv.mx;
    let my = mv.my;
    if (mv.pointer) {
      // Walk toward the held pointer; stop when close.
      const dx = mv.mx - world.state.player.x;
      const dy = mv.my - world.state.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 16) {
        mx = dx / dist;
        my = dy / dist;
      } else {
        mx = 0;
        my = 0;
      }
    }
    const events = world.step(STEP, {
      mx, my, sneak: input.sneaking(), smoke: pendingSmoke, grab: pendingGrab,
    }, false);
    pendingSmoke = false;
    pendingGrab = false;
    if (events & EVENT_LOOT) audio.loot();
    if (events & EVENT_SMOKE) audio.smoke();
    if (events & EVENT_CAUGHT) {
      audio.caught();
      endRun(false);
    } else if (events & EVENT_ESCAPED) {
      audio.escaped();
      endRun(true);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_GRAB) pendingGrab = true;
    if (actions & ACTION_SMOKE) pendingSmoke = true;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    audio.alarmPulse(screen === SCREEN_PLAY && world.state.alarm > 60);
    renderer.draw(world.state, screen, best, world.state.elapsed);
  }

  // Leaving the tab pauses a running game rather than letting the alarm rise unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Gilded Vault. Press Space or click to begin the heist.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
