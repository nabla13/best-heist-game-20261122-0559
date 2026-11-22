// Tiny synthesised sound effects (WebAudio oscillators, no audio files): a chime
// for loot, a low pulse while the alarm runs high, a sting for being caught and a
// little arpeggio for the getaway. Nothing plays before the first user gesture.

export function createAudio() {
  let ctx = null;
  let alarmTimer = null;

  function ensure() {
    if (ctx === null) {
      try {
        const AC = window.AudioContext ?? window.webkitAudioContext;
        ctx = new AC();
      } catch {
        ctx = null;
      }
    }
    if (ctx !== null && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, gain, when = 0) {
    const c = ensure();
    if (c === null) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    /** Call on the first gesture so later sounds are allowed. */
    unlock() {
      ensure();
    },
    loot() {
      tone(880, 0.14, 'sine', 0.12);
      tone(1318, 0.2, 'sine', 0.1, 0.07);
    },
    smoke() {
      tone(220, 0.3, 'triangle', 0.08);
      tone(165, 0.35, 'triangle', 0.06, 0.05);
    },
    caught() {
      tone(196, 0.5, 'sawtooth', 0.12);
      tone(147, 0.7, 'sawtooth', 0.12, 0.12);
    },
    escaped() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.11, i * 0.09));
    },
    /** A soft pulse while the alarm is high; call every frame, it throttles itself. */
    alarmPulse(high) {
      if (!high) return;
      if (alarmTimer !== null) return;
      tone(440, 0.12, 'square', 0.045);
      alarmTimer = setTimeout(() => { alarmTimer = null; }, 420);
    },
  };
}
