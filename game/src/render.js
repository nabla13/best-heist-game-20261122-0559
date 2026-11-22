// Everything the player sees: the museum floor, the cases and pillars, the sweeping
// vision cones, the thief, the guards, the loot and the HUD — plus the title,
// pause, caught and getaway screens. One canvas, one fixed 1280x720 logical field,
// scaled to the window with letterboxing. No images: every shape is drawn.
import { CAMERA, FIELD, FONT, GUARD, PALETTE, PLAYER } from './config.js';
import { COVER, EXIT, SHADOWS, WALL } from './level.js';

// Smoke clouds fade out over their last 1.2 seconds.
const SMOKE_FADE = 1.2;

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_WIN = 4;

function conePath(ctx, x, y, angle, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, halfAngle, fill, edge) {
  const grad = ctx.createRadialGradient(x, y, 10, x, y, range);
  grad.addColorStop(0, fill);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  conePath(ctx, x, y, angle, range, halfAngle);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - halfAngle) * range, y + Math.sin(angle - halfAngle) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + halfAngle) * range, y + Math.sin(angle + halfAngle) * range);
  ctx.stroke();
}

function drawLoot(ctx, item, time) {
  const pulse = 1 + 0.12 * Math.sin(time * 3 + item.x);
  ctx.save();
  ctx.translate(item.x, item.y);
  if (item.kind === 'sapphire') {
    ctx.shadowColor = PALETTE.sapphire;
    ctx.shadowBlur = 22;
    ctx.fillStyle = PALETTE.sapphire;
    ctx.beginPath();
    ctx.moveTo(0, -16 * pulse);
    ctx.lineTo(12 * pulse, 0);
    ctx.lineTo(0, 16 * pulse);
    ctx.lineTo(-12 * pulse, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -16 * pulse);
    ctx.lineTo(6 * pulse, 0);
    ctx.lineTo(0, 16 * pulse);
    ctx.lineTo(-6 * pulse, 0);
    ctx.closePath();
    ctx.fill();
  } else if (item.kind === 'idol') {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(0, -4, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-7, 2, 14, 12);
    ctx.fillStyle = PALETTE.goldDim;
    ctx.fillRect(-10, 12, 20, 4);
  } else if (item.kind === 'mask') {
    ctx.fillStyle = '#3fae7a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#123524';
    ctx.beginPath();
    ctx.arc(-4, -1, 2.4, 0, Math.PI * 2);
    ctx.arc(4, -1, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#f5ead2';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(-10 + i * 5, Math.sin(i * 1.2) * 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawThief(ctx, p, time) {
  // A soft gold ring so the player is findable at a glance, even shrunk small.
  ctx.strokeStyle = 'rgba(242, 201, 76, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  // Cloak: a hooded triangle pointing where the thief walks.
  ctx.fillStyle = PALETTE.thiefCloak;
  ctx.beginPath();
  ctx.moveTo(21, 0);
  ctx.lineTo(-14, -13);
  ctx.lineTo(-9, 0);
  ctx.lineTo(-14, 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  // Hood shadow + the glint of an eye.
  ctx.fillStyle = '#20263a';
  ctx.beginPath();
  ctx.arc(2, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.sapphire;
  ctx.beginPath();
  ctx.arc(6, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(238,241,245,0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawGuard(ctx, g, time) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.angle);
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.arc(0, 0, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guardCap;
  ctx.beginPath();
  ctx.arc(3, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  // Torch beam stub: a short bright nose in the facing direction.
  ctx.fillStyle = 'rgba(255,240,200,0.9)';
  ctx.fillRect(GUARD.radius - 2, -2, 8, 4);
  ctx.restore();
  if (g.hunting) {
    ctx.fillStyle = '#ff5a4e';
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - GUARD.radius - 8);
  }
}

function drawCamera(ctx, cam) {
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.rotate(cam.angle);
  ctx.fillStyle = PALETTE.cameraBody;
  ctx.fillRect(-4, -6, 14, 12);
  ctx.fillStyle = '#20242e';
  ctx.beginPath();
  ctx.arc(11, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff5a4e';
  ctx.beginPath();
  ctx.arc(11, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, state, best) {
  const s = state;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, 46);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // Alarm meter.
  ctx.fillText('ALARM', 18, 24);
  const ax = 90;
  const aw = 220;
  ctx.fillStyle = '#2a2f42';
  ctx.fillRect(ax, 12, aw, 22);
  ctx.fillStyle = s.alarm > 75 ? '#ff2e22' : s.alarm > 50 ? '#ff8a3c' : PALETTE.alarm;
  ctx.fillRect(ax, 12, (aw * s.alarm) / 100, 22);
  ctx.strokeStyle = 'rgba(238,241,245,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ax, 12, aw, 22);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`${Math.floor(s.alarm)}%`, ax + aw + 10, 24);
  // Loot, smoke, timer.
  ctx.fillText(`LOOT  $${s.lootValue}`, 380, 24);
  ctx.fillText(`SMOKE  ${'●'.repeat(s.player.smoke)}${'○'.repeat(PLAYER.smokeBombs - s.player.smoke)}`, 520, 24);
  const mins = Math.floor(s.elapsed / 60);
  const secs = Math.floor(s.elapsed % 60);
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, 700, 24);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(s.sapphireTaken ? 'Sapphire secured — reach the exit!' : 'Steal the Star Sapphire, then reach the exit', FIELD.width - 18, 24);
  ctx.textAlign = 'left';
  // Objective hint at the bottom.
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, FIELD.height - 30, FIELD.width, 30);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.fillText('WASD / arrows move · Shift sneak · E grab · Q smoke bomb · P pause', 18, FIELD.height - 15);
  ctx.textAlign = 'right';
  ctx.fillText(`BEST  $${best}`, FIELD.width - 18, FIELD.height - 15);
  ctx.textAlign = 'left';
  if (s.seen) {
    ctx.fillStyle = '#ff5a4e';
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED!', FIELD.width / 2, 78);
    ctx.textAlign = 'left';
  }
}

function overlay(ctx, title, lines, accent, dim = 0.72) {
  ctx.fillStyle = `rgba(8, 10, 20, ${dim})`;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `bold 54px ${FONT}`;
  ctx.fillText(title, FIELD.width / 2, 300);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `20px ${FONT}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, FIELD.width / 2, 350 + i * 32);
  });
  ctx.textAlign = 'left';
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function draw(state, screen, best, time) {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0d18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);

    // Marble floor: two-tone checker.
    const tile = 80;
    for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
      for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
    // Walls.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, WALL);
    ctx.fillRect(0, FIELD.height - WALL, FIELD.width, WALL);
    ctx.fillRect(0, 0, WALL, FIELD.height);
    ctx.fillRect(FIELD.width - WALL, 0, WALL, FIELD.height);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(0, 0, FIELD.width, 6);
    ctx.fillRect(0, FIELD.height - 6, FIELD.width, 6);
    // Gold-framed pictures along the walls.
    ctx.strokeStyle = PALETTE.goldDim;
    ctx.lineWidth = 3;
    for (let x = 120; x < FIELD.width - 100; x += 180) {
      ctx.strokeRect(x, 8, 90, 12);
      ctx.strokeRect(x, FIELD.height - 20, 90, 12);
    }

    // Shadow pools: dark, soft-edged.
    for (const s of SHADOWS) {
      const grad = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
      grad.addColorStop(0, 'rgba(6, 8, 16, 0.85)');
      grad.addColorStop(1, 'rgba(6, 8, 16, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cover: cases, pillars, plinths.
    for (const rect of COVER) {
      if (rect.kind === 'pillar') {
        ctx.fillStyle = '#4a3f63';
        ctx.beginPath();
        ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6a5c8c';
        ctx.beginPath();
        ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w / 2 - 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#2c3350';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = PALETTE.goldDim;
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
        ctx.fillStyle = 'rgba(180, 210, 255, 0.10)';
        ctx.fillRect(rect.x + 6, rect.y + 6, rect.w - 12, 10);
      }
    }

    // The exit vent: a green-lit doorway in the top-left wall.
    ctx.fillStyle = '#123524';
    ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
    ctx.fillStyle = state.sapphireTaken ? '#58c98a' : '#2c7a4e';
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(state.sapphireTaken ? 'EXIT ◀' : 'EXIT', EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2 + 5);
    ctx.textAlign = 'left';

    // Vision cones under the figures that cast them.
    for (const cam of state.cameras) {
      drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, PALETTE.coneCamera, 'rgba(242,201,76,0.35)');
    }
    for (const g of state.guards) {
      drawCone(ctx, g.x, g.y, g.angle, GUARD.viewRange, GUARD.viewHalfAngle, PALETTE.coneGuard, PALETTE.coneEdge);
    }

    // Smoke clouds.
    for (const c of state.clouds) {
      const alpha = Math.min(0.75, (c.t / SMOKE_FADE) * 0.75);
      ctx.fillStyle = `rgba(190, 196, 210, ${alpha})`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // The Sapphire's pedestal, drawn under the gem.
    ctx.fillStyle = '#3a3350';
    ctx.fillRect(648, 348, 24, 24);
    ctx.strokeStyle = PALETTE.goldDim;
    ctx.lineWidth = 2;
    ctx.strokeRect(648, 348, 24, 24);

    // Loot that is still there.
    for (const item of state.loot) {
      if (!item.taken) drawLoot(ctx, item, time);
    }

    for (const cam of state.cameras) drawCamera(ctx, cam);
    for (const g of state.guards) drawGuard(ctx, g, time);
    drawThief(ctx, state.player, time);

    drawHud(ctx, state, best);

    if (screen === SCREEN_TITLE) {
      overlay(ctx, 'THE GILDED VAULT', [
        'One room. Three guards. Two cameras. One Star Sapphire.',
        'Cross the gallery unseen — grab the Sapphire and slip out the vent.',
        'WASD / arrows move · Shift sneak · E grab · Q smoke bomb',
        'Press Space or click to begin',
        best > 0 ? `Best getaway so far: $${best}` : '',
      ].filter(Boolean), PALETTE.gold, 0.55);
    } else if (screen === SCREEN_PAUSED) {
      overlay(ctx, 'PAUSED', ['The gallery holds its breath.', 'Press P or Space to keep moving.'], PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      overlay(ctx, 'CAUGHT!', [
        'The vault locks down. The Sapphire stays where it is.',
        `Loot carried: $${state.lootValue}   ·   Time: ${Math.floor(state.elapsed)}s`,
        'Press Space or click to try again.',
      ], PALETTE.alarm);
    } else if (screen === SCREEN_WIN) {
      overlay(ctx, 'CLEAN GETAWAY!', [
        'The Star Sapphire is yours. The night is quiet again.',
        `Loot $${state.lootValue}   ·   Score $${state.score}   ·   Time ${Math.floor(state.elapsed)}s`,
        'Press Space or click to run it again.',
      ], PALETTE.safe);
    }
  }

  return { draw };
}
