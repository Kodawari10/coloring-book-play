/* Soft sounds for the coloring book.
   Everything is synthesized here. No samples are downloaded, so the book
   stays offline and nothing extra needs a license. */
(function () {
  'use strict';

  const SOUNDS = [
    { id: 'rain', label: 'Soft rain', emoji: '🌧️', group: 'world' },
    { id: 'thunder', label: 'Faraway storm', emoji: '⛈️', group: 'world' },
    { id: 'waves', label: 'Ocean hush', emoji: '🌊', group: 'world' },
    { id: 'stream', label: 'Babbling brook', emoji: '💧', group: 'world' },
    { id: 'wind', label: 'Gentle breeze', emoji: '🍃', group: 'world' },
    { id: 'campfire', label: 'Cozy fire', emoji: '🔥', group: 'world' },
    { id: 'brown', label: 'Warm hush', emoji: '🤍', group: 'world' },
    { id: 'birds', label: 'Little birds', emoji: '🐦', group: 'friends' },
    { id: 'crickets', label: 'Night crickets', emoji: '🦗', group: 'friends' },
    { id: 'frogs', label: 'Pond frogs', emoji: '🐸', group: 'friends' },
    { id: 'whale', label: 'Whale song', emoji: '🐋', group: 'friends' },
    { id: 'purr', label: 'Kitty purr', emoji: '🐱', group: 'friends' },
    { id: 'flute', label: 'Soft flute', emoji: '🎶', group: 'tunes' },
    { id: 'harp', label: 'Tiny harp', emoji: '🪕', group: 'tunes' },
    { id: 'bowl', label: 'Singing bowl', emoji: '🔔', group: 'tunes' },
    { id: 'musicbox', label: 'Music box', emoji: '🎵', group: 'tunes' },
    { id: 'chimes', label: 'Wind chimes', emoji: '🎐', group: 'tunes' },
    { id: 'kalimba', label: 'Little kalimba', emoji: '✨', group: 'tunes' },
    { id: 'tone432', label: '432 Hz tone', emoji: '🫧', group: 'tones' },
    { id: 'tone528', label: '528 Hz tone', emoji: '🌕', group: 'tones' },
  ];

  const GROUP_LABELS = {
    world: 'Soft world',
    friends: 'Little friends',
    tunes: 'Lullabies',
    tones: 'Steady tones',
  };

  /* Noise beds stay put. These restart with a short crossfade when tuning changes. */
  const UNTUNED = ['rain', 'thunder', 'waves', 'stream', 'wind', 'campfire'];
  const PITCHED = ['birds', 'crickets', 'frogs', 'whale', 'purr', 'brown', 'flute', 'harp', 'bowl', 'musicbox', 'chimes', 'kalimba'];

  /* 432: A4 is 432, and every other note is that many semitones away.
     528: the lullaby's key note (C5) is 528, and the other notes sit around it. */
  const ROOT_MIDI = 72;

  function normalizeTuning(mode) {
    return mode === '528' || mode === 528 ? '528' : '432';
  }
  function a4Of(mode) {
    if (normalizeTuning(mode) === '528') return 528 / Math.pow(2, 3 / 12);
    return 432;
  }
  function hzOf(mode, midi) {
    if (normalizeTuning(mode) === '528') return 528 * Math.pow(2, (midi - ROOT_MIDI) / 12);
    return 432 * Math.pow(2, (midi - 69) / 12);
  }
  function rootOf(mode) {
    return hzOf(mode, ROOT_MIDI);
  }
  function centerOf(mode) {
    return normalizeTuning(mode) === '528' ? 528 : 432;
  }

  /* Older ids, if a backup ever stored them, still point at a current sound. */
  const ALIASES = {
    thunderstorm: 'thunder',
    storm: 'thunder',
    ocean: 'waves',
    sea: 'waves',
    brook: 'stream',
    creek: 'stream',
    babble: 'stream',
    breeze: 'wind',
    fire: 'campfire',
    fireplace: 'campfire',
    noise: 'brown',
    brownnoise: 'brown',
    hush: 'brown',
    bird: 'birds',
    cricket: 'crickets',
    nightcrickets: 'crickets',
    frog: 'frogs',
    whales: 'whale',
    cat: 'purr',
    kitty: 'purr',
    lullaby: 'musicbox',
    box: 'musicbox',
    chime: 'chimes',
    thumbpiano: 'kalimba',
  };

  const IDS = new Set(SOUNDS.map((s) => s.id));

  function migrateSoundId(id) {
    if (typeof id !== 'string') return null;
    if (IDS.has(id)) return id;
    const next = ALIASES[id];
    return next && IDS.has(next) ? next : null;
  }

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function gainNode(ctx, v, to) {
    const g = ctx.createGain();
    g.gain.value = v;
    g.connect(to);
    return g;
  }

function filt(ctx, type, f, q, to) {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  if (to) b.connect(to);
  return b;
}

  function lfo(k, freq, depth, param) {
    const o = k.ctx.createOscillator();
    o.frequency.value = freq;
    const g = k.ctx.createGain();
    g.gain.value = depth;
    o.connect(g);
    g.connect(param);
    o.start();
    k.add(o);
  }

  /* A note that starts at silence, so the attack cannot click. */
  function voice(k, to, o) {
    const t = o.when;
    const osc = k.ctx.createOscillator();
    osc.type = o.type || 'sine';
    const f0 = Math.max(24, o.f);
    osc.frequency.setValueAtTime(f0, t);
    if (o.endF) osc.frequency.exponentialRampToValueAtTime(Math.max(24, o.endF), t + o.attack + o.dur);
    const g = k.ctx.createGain();
    const peak = Math.max(0.0008, o.peak);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + o.attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + o.attack + o.dur);
    osc.connect(g);
    let dest = g;
    if (o.pan != null && k.ctx.createStereoPanner) {
      const p = k.ctx.createStereoPanner();
      p.pan.setValueAtTime(Math.max(-1, Math.min(1, o.pan)), t);
      g.connect(p);
      dest = p;
    }
    dest.connect(to);
    const end = t + o.attack + o.dur + 0.06;
    if (o.vib) {
      const v = k.ctx.createOscillator();
      v.frequency.value = o.vibF || 4.2;
      const vg = k.ctx.createGain();
      vg.gain.setValueAtTime(0, t);
      vg.gain.linearRampToValueAtTime(o.vib, t + Math.min(0.4, o.attack + 0.2));
      v.connect(vg);
      vg.connect(osc.frequency);
      v.start(t);
      v.stop(end);
      k.add(v, end);
    }
    osc.start(t);
    osc.stop(end);
    k.add(osc, end);
  }

  /* A held tone: two close sines, a soft octave, and a quiet bowl partial. */
  function holdPad(k, dest, freq, level) {
    const lp = filt(k.ctx, 'lowpass', Math.max(700, freq * 4), 0.6, dest);
    const g = gainNode(k.ctx, level, lp);
    lfo(k, 0.09, level * 0.18, g.gain);
    [[1, 1, 'sine'], [1.004, 0.6, 'sine'], [2, 0.26, 'triangle'], [2.76, 0.14, 'sine']].forEach((part) => {
      const osc = k.ctx.createOscillator();
      osc.type = part[2];
      osc.frequency.value = Math.max(24, freq * part[0]);
      const vg = k.ctx.createGain();
      vg.gain.value = part[1];
      osc.connect(vg);
      vg.connect(g);
      osc.start();
      k.add(osc);
    });
  }

  function drip(k, to, when, peak, dur, center) {
    const src = k.ctx.createBufferSource();
    src.buffer = k.buf('pink');
    const bp = filt(k.ctx, 'bandpass', center, 2.2, null);
    const g = k.ctx.createGain();
    g.gain.setValueAtTime(0.0008, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, when + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(to);
  src.start(when, Math.random() * 5);
  src.stop(when + dur + 0.04);
}

  function bed(k, kind, level, hpF, lpF) {
    const g = gainNode(k.ctx, level, k.out);
    const lp = filt(k.ctx, 'lowpass', lpF, 0.7, g);
    const hp = filt(k.ctx, 'highpass', hpF, 0.7, lp);
    const src = k.noise(kind);
    src.connect(hp);
    return { g, lp, hp };
  }

  const BUILD = {
    rain(k) {
      const layer = bed(k, 'pink', 0.2, 380, 2200);
      lfo(k, 0.07, 0.035, layer.g.gain);
      lfo(k, 0.05, 180, layer.lp.frequency);
      k.loop(0.18, 0.55, (when) => {
        drip(k, k.out, when, rnd(0.012, 0.032), rnd(0.04, 0.07), rnd(1400, 2400));
      });
    },
    thunder(k) {
      bed(k, 'pink', 0.14, 400, 1800);
      const rumble = bed(k, 'brown', 0.001, 30, 110);
      k.loop(12, 22, (when) => {
        const g = rumble.g.gain;
        const peak = rnd(0.22, 0.38);
        g.cancelScheduledValues(when);
        g.setValueAtTime(0.02, when);
        g.linearRampToValueAtTime(peak, when + rnd(1.4, 2.4));
        g.linearRampToValueAtTime(0.02, when + rnd(5, 8));
        return rnd(12, 22);
      });
    },
    waves(k) {
      const a = bed(k, 'pink', 0.1, 80, 420);
      const b = bed(k, 'pink', 0.06, 60, 240);
      lfo(k, 0.065, 0.07, a.g.gain);
      lfo(k, 0.065, 160, a.lp.frequency);
      lfo(k, 0.041, 0.04, b.g.gain);
      lfo(k, 0.041, 80, b.lp.frequency);
    },
    stream(k) {
      const a = bed(k, 'pink', 0.11, 280, 900);
      const b = bed(k, 'pink', 0.06, 500, 1600);
      lfo(k, 0.23, 120, a.lp.frequency);
      lfo(k, 0.17, 0.02, a.g.gain);
      lfo(k, 0.41, 220, b.lp.frequency);
      k.loop(0.45, 1.3, (when) => {
        const f = rnd(420, 760);
        voice(k, k.out, { when, f, endF: f * 0.35, attack: 0.02, dur: rnd(0.12, 0.2), peak: rnd(0.012, 0.026), pan: rnd(-0.4, 0.4) });
      });
    },
    wind(k) {
      const layer = bed(k, 'pink', 0.16, 140, 520);
      lfo(k, 0.05, 90, layer.lp.frequency);
      lfo(k, 0.08, 0.04, layer.g.gain);
      lfo(k, 0.13, 40, layer.hp.frequency);
    },
    brown(k) {
      bed(k, 'brown', 0.14, 40, 420);
      holdPad(k, k.out, k.center() / 2, 0.02);
    },
    campfire(k) {
      const warm = bed(k, 'brown', 0.16, 40, 260);
      lfo(k, 0.2, 0.03, warm.g.gain);
      k.loop(0.09, 0.42, (when) => {
        const loud = Math.random() < 0.12;
        drip(k, k.out, when, loud ? rnd(0.04, 0.07) : rnd(0.012, 0.03), rnd(0.02, 0.055), rnd(1600, 3200));
      });
    },
    birds(k) {
      const sp = k.space(0.22, 0.2);
      const scale = [79, 81, 83, 84, 86];
      k.loop(2.2, 5.2, (when) => {
        const n = 2 + Math.floor(rnd(0, 3));
        let idx = 1 + Math.floor(rnd(0, 2));
        const pan = rnd(-0.55, 0.55);
        for (let i = 0; i < n; i++) {
          idx = Math.max(0, Math.min(scale.length - 1, idx + pick([-1, 0, 1, 1])));
          const f = k.hz(scale[idx]);
          voice(k, sp, {
            when: when + i * rnd(0.16, 0.24),
            f, endF: f * rnd(1.01, 1.06),
            attack: 0.04, dur: rnd(0.14, 0.26), peak: 0.034, pan, vib: f * 0.004, vibF: 5.5,
          });
        }
      });
    },
    crickets(k) {
      const sp = k.space(0.14, 0.16);
      const one = (midi, pan, gap) => {
        k.loop(gap * 0.85, gap * 1.15, (when) => {
          const f = k.hz(midi);
          for (let i = 0; i < 5; i++) {
            voice(k, sp, { when: when + i * 0.07, f, attack: 0.012, dur: 0.045, peak: 0.016, pan });
          }
          return gap + rnd(-0.08, 0.12);
        });
      };
      one(99, -0.45, 0.95);
      one(101, 0.5, 1.15);
    },
    frogs(k) {
      const sp = k.space(0.2, 0.22);
      k.loop(3.2, 6.4, (when) => {
        const pan = rnd(-0.4, 0.4);
        voice(k, sp, { when, f: k.hz(69), attack: 0.02, dur: 0.11, peak: 0.04, pan });
        voice(k, sp, { when, f: k.hz(70), attack: 0.02, dur: 0.11, peak: 0.016, pan });
        voice(k, sp, { when: when + 0.14, f: k.hz(62), attack: 0.025, dur: 0.16, peak: 0.042, pan });
      });
    },
    whale(k) {
      bed(k, 'brown', 0.05, 30, 180);
      const sp = k.space(0.45, 0.28);
      k.loop(9, 15, (when) => {
        const up = Math.random() < 0.5;
        const f = k.hz(43 + Math.floor(rnd(0, 7)));
        const end = up ? f * rnd(1.35, 1.7) : f * rnd(0.62, 0.8);
        voice(k, sp, { when, f, endF: end, attack: 0.9, dur: rnd(3.2, 4.6), peak: 0.07, vib: 1.4, vibF: 3.2 });
        voice(k, sp, { when, f: f * 2, endF: end * 2, attack: 1.1, dur: rnd(2.4, 3.4), peak: 0.018, type: 'sine' });
        return rnd(9, 15);
      });
    },
    purr(k) {
      const layer = bed(k, 'brown', 0.18, 50, 220);
      lfo(k, 25, 0.08, layer.g.gain);
      lfo(k, 0.16, 0.035, layer.g.gain);
      const osc = k.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = k.center() / 8;
      const g = gainNode(k.ctx, 0.012, k.out);
      osc.connect(g);
      osc.start();
      k.add(osc);
    },
    flute(k) {
      const sp = k.space(0.28, 0.22);
      const phrase = [74, 76, 78, 81, 78, 76, 74, 74, 71, 69, 71, 74, 76, 74, 71, 69];
      k.pattern(phrase, 0.62, 20, (when, midi) => {
        const f = k.hz(midi);
        voice(k, sp, { when, f, attack: 0.14, dur: 0.7, peak: 0.055, vib: f * 0.006, vibF: 4.6 });
        voice(k, sp, { when, f: f * 2, attack: 0.18, dur: 0.5, peak: 0.01, type: 'triangle' });
      });
    },
    harp(k) {
      const sp = k.space(0.32, 0.24);
      const chords = [
        [60, 64, 67, 72, 76],
        [57, 60, 64, 69, 72],
        [53, 57, 60, 65, 69],
        [55, 59, 62, 67, 71],
      ];
      let i = 0;
      k.loop(7.5, 7.5, (when) => {
        const chord = chords[i % chords.length];
        i += 1;
        const up = Math.random() < 0.65;
        chord.forEach((midi, n) => {
          const at = when + (up ? n : chord.length - 1 - n) * 0.28;
          const f = k.hz(midi);
          voice(k, sp, { when: at, f, attack: 0.012, dur: 2.6, peak: 0.04, type: 'triangle', pan: (n - 2) * 0.12 });
          voice(k, sp, { when: at, f, attack: 0.02, dur: 2.2, peak: 0.022 });
        });
        return 8;
      });
    },
    bowl(k) {
      const sp = k.space(0.4, 0.26);
      const roots = [55, 57, 60, 62];
      k.loop(11, 16, (when) => {
        const f = k.hz(pick(roots));
        [[1, 0.07], [2.76, 0.028], [5.15, 0.012]].forEach((part, i) => {
          voice(k, sp, { when, f: f * part[0], attack: 0.03, dur: 8 / (i + 1), peak: part[1] });
          voice(k, sp, { when, f: f * part[0] * 1.004, attack: 0.03, dur: 8 / (i + 1), peak: part[1] * 0.55 });
        });
        return rnd(11, 16);
      });
    },
    musicbox(k) {
      const sp = k.space(0.18, 0.16);
      /* An original little lullaby in C pentatonic. One note of rest is a 0. */
      const phrase = [76, 79, 81, 79, 76, 74, 72, 74, 76, 79, 81, 0, 79, 76, 74, 72];
      k.pattern(phrase, 0.5, 16, (when, midi) => {
        if (!midi) return;
        const f = k.hz(midi);
        voice(k, sp, { when, f, attack: 0.008, dur: 1.15, peak: 0.045 });
        voice(k, sp, { when, f: f * 2.003, attack: 0.006, dur: 0.7, peak: 0.016 });
        voice(k, sp, { when, f: f * 4.01, attack: 0.004, dur: 0.28, peak: 0.006 });
      });
    },
    chimes(k) {
      const sp = k.space(0.34, 0.22);
      const bells = [84, 86, 88, 91, 93];
      k.loop(2.6, 5.8, (when) => {
        const n = Math.random() < 0.35 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const f = k.hz(pick(bells));
          const at = when + i * rnd(0.2, 0.55);
          [[1, 0.028], [2.01, 0.012], [2.97, 0.006]].forEach((part) => {
            voice(k, sp, { when: at, f: f * part[0], attack: 0.01, dur: 3.6, peak: part[1], pan: rnd(-0.7, 0.7) });
          });
        }
      });
    },
    kalimba(k) {
      const sp = k.space(0.16, 0.14);
      const phrase = [60, 64, 67, 72, 67, 64, 65, 69, 72, 69, 67, 64, 60, 62, 64, 60];
      k.pattern(phrase, 0.42, 16, (when, midi) => {
        const f = k.hz(midi);
        voice(k, sp, { when, f, attack: 0.005, dur: 0.95, peak: 0.05 });
        voice(k, sp, { when, f: f * 2.8, attack: 0.004, dur: 0.22, peak: 0.01, type: 'triangle' });
        voice(k, sp, { when, f: f * 5.05, attack: 0.003, dur: 0.1, peak: 0.005 });
      });
    },
    tone432(k) {
      holdPad(k, k.space(0.46, 0.22), 432, 0.048);
    },
    tone528(k) {
      holdPad(k, k.space(0.46, 0.22), 528, 0.048);
    },
  };

  SOUNDS.forEach((s) => {
    if (typeof BUILD[s.id] !== 'function') throw new Error('missing sound ' + s.id);
  });

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.sfxGain = null;
      this.bufs = {};
      this.active = new Map();
      this.volume = 0.6;
      this.sfxOn = false;
      this.sfxVolume = 0.35;
      this.tuning = '432';
      this.lastUi = 0;
    }

    hz(midi) { return hzOf(this.tuning, midi); }

    ensure() {
      if (!this.ctx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) throw new Error('no audio');
        this.ctx = new Ctor();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.knee.value = 16;
        comp.ratio.value = 2.2;
        comp.attack.value = 0.03;
        comp.release.value = 0.3;
        const air = filt(this.ctx, 'highpass', 28, 0.7, comp);
        this.bus = air;
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        comp.connect(this.master);
        this.master.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxOn ? this.sfxVolume : 0;
        this.sfxGain.connect(this.master);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    }

    buf(kind) {
      const ctx = this.ensure();
      if (this.bufs[kind]) return this.bufs[kind];
      const rate = ctx.sampleRate;
      const fade = Math.floor(rate * 0.3);
      const len = rate * 8;
      const src = new Float32Array(len + fade);
      let b0 = 0, b1 = 0, b2 = 0, last = 0;
      for (let i = 0; i < src.length; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'pink') {
          b0 = 0.99765 * b0 + w * 0.099046;
          b1 = 0.963 * b1 + w * 0.2965164;
          b2 = 0.57 * b2 + w * 1.0526913;
          src[i] = (b0 + b1 + b2 + w * 0.1848) * 0.05;
        } else {
          last = (last + 0.02 * w) / 1.02;
          src[i] = last * 2.2;
        }
      }
      let prevIn = 0, prevOut = 0;
      const R = 0.995;
      for (let i = 0; i < src.length; i++) {
        const x = src[i];
        prevOut = x - prevIn + R * prevOut;
        prevIn = x;
        src[i] = prevOut;
      }
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) data[i] = src[i];
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        data[i] = src[i] * t + src[len + i] * (1 - t);
      }
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
      const norm = peak > 0.0001 ? 0.5 / peak : 1;
      const buffer = ctx.createBuffer(1, len, rate);
      const ch = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = data[i] * norm;
      this.bufs[kind] = buffer;
      return buffer;
    }

    setVolume(v) {
      this.volume = v;
      if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.06);
    }

    setSfx(on, volume) {
      this.sfxOn = !!on;
      if (typeof volume === 'number') this.sfxVolume = Math.max(0, Math.min(1, volume));
      if (this.sfxGain && this.ctx) {
        this.sfxGain.gain.setTargetAtTime(this.sfxOn ? this.sfxVolume : 0, this.ctx.currentTime, 0.03);
      }
    }

    setTuning(mode) {
      const next = normalizeTuning(mode);
      if (this.tuning === next) return;
      this.tuning = next;
      PITCHED.forEach((id) => {
        if (!this.active.has(id)) return;
        this.stop(id, 0.4);
        this.start(id, 0.55);
      });
    }

    start(id, fadeIn) {
      const canon = migrateSoundId(id);
      if (!canon || this.active.has(canon)) return;
      const ctx = this.ensure();
      if (!this.bus) return;
      const now = ctx.currentTime;
      const out = ctx.createGain();
      const fade = typeof fadeIn === 'number' ? fadeIn : 1.7;
      out.gain.setValueAtTime(0.0008, now);
      out.gain.exponentialRampToValueAtTime(1, now + fade);
      out.connect(this.bus);
      const sources = [];
      const timers = [];
      let alive = true;
      const self = this;
      const kit = {
        ctx,
        out,
        add(node, endTime) {
          sources.push(node);
          if (typeof endTime === 'number') {
            const ms = Math.max(0, (endTime - ctx.currentTime) * 1000) + 30;
            const tid = window.setTimeout(() => {
              const i = sources.indexOf(node);
              if (i >= 0) sources.splice(i, 1);
            }, ms);
            timers.push(() => window.clearTimeout(tid));
          }
        },
        noise(kind) {
          const s = ctx.createBufferSource();
          s.buffer = self.buf(kind);
          s.loop = true;
          s.start(now, Math.random() * 6);
          sources.push(s);
          return s;
        },
        buf(kind) { return self.buf(kind); },
        hz(midi) { return hzOf(self.tuning, midi); },
        center() { return centerOf(self.tuning); },
        loop(minGap, maxGap, fn) {
          let next = ctx.currentTime + 0.45 + Math.random() * 0.5;
          const id = window.setInterval(() => {
            if (!alive) return;
            const horizon = ctx.currentTime + 0.35;
            let guard = 0;
            while (next <= horizon && guard++ < 6) {
              let gap;
              try { gap = fn(next); } catch (e) { gap = minGap; }
              if (typeof gap !== 'number' || !isFinite(gap)) gap = minGap + Math.random() * Math.max(0, maxGap - minGap);
              next += Math.max(0.05, gap);
            }
          }, 90);
          timers.push(() => window.clearInterval(id));
        },
        pattern(notes, beat, bars, play) {
          const loopDur = bars * beat;
          this.loop(loopDur, loopDur, (when) => {
            notes.forEach((midi, i) => { if (midi) play(when + i * beat, midi); });
            return loopDur;
          });
        },
        space(time, fb) {
          const input = ctx.createGain();
          input.connect(out);
          const delay = ctx.createDelay(1.5);
          delay.delayTime.value = time;
          const fbg = ctx.createGain();
          fbg.gain.value = fb;
          const lp = filt(ctx, 'lowpass', 1800, 0.6, fbg);
          input.connect(delay);
          delay.connect(lp);
          fbg.connect(delay);
          const wet = gainNode(ctx, 0.32, out);
          delay.connect(wet);
          return input;
        },
      };
      BUILD[canon](kit);
      this.active.set(canon, (fadeSec) => {
        alive = false;
        timers.forEach((stop) => stop());
        const t = ctx.currentTime;
        const fadeOut = typeof fadeSec === 'number' ? fadeSec : 0.9;
        const current = Math.max(0.001, out.gain.value || 0.001);
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(current, t);
        out.gain.linearRampToValueAtTime(0.0008, t + fadeOut);
        window.setTimeout(() => {
          sources.forEach((s) => { try { s.stop(); } catch (e) { /* already stopped */ } });
          try { out.disconnect(); } catch (e) { /* already gone */ }
        }, Math.ceil(fadeOut * 1000) + 80);
      });
    }

    stop(id, fadeSec) {
      const canon = migrateSoundId(id) || id;
      const stop = this.active.get(canon);
      if (!stop) return;
      stop(fadeSec);
      this.active.delete(canon);
    }

    stopAll() {
      Array.from(this.active.keys()).forEach((id) => this.stop(id));
    }

    ui(kind) {
      if (!this.sfxOn) return;
      const ctx = this.ensure();
      const now = ctx.currentTime;
      if (kind === 'pop' && now - this.lastUi < 0.07) return;
      this.lastUi = now;
      const to = this.sfxGain;
      if (!to) return;
      if (kind === 'pop') {
        voice({ ctx, add() {} }, to, { when: now, f: this.hz(84), attack: 0.006, dur: 0.12, peak: 0.12 });
        voice({ ctx, add() {} }, to, { when: now + 0.05, f: this.hz(88), attack: 0.006, dur: 0.14, peak: 0.07 });
      } else if (kind === 'sparkle') {
        [84, 88, 91].forEach((m, i) => {
          voice({ ctx, add() {} }, to, { when: now + i * 0.09, f: this.hz(m), attack: 0.006, dur: 0.22, peak: 0.08 });
        });
      } else if (kind === 'rustle') {
        const src = ctx.createBufferSource();
        src.buffer = this.buf('pink');
        const bp = filt(ctx, 'bandpass', 1100, 0.8, null);
        bp.frequency.setValueAtTime(1600, now);
        bp.frequency.exponentialRampToValueAtTime(700, now + 0.22);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0008, now);
        g.gain.linearRampToValueAtTime(0.09, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.24);
        src.connect(bp);
        bp.connect(g);
        g.connect(to);
        src.start(now, Math.random() * 4);
        src.stop(now + 0.28);
      }
    }

    close() {
      this.stopAll();
      const c = this.ctx;
      this.ctx = null;
      if (c) window.setTimeout(() => { void c.close(); }, 1100);
    }
  }

  window.CB_SOUNDS = SOUNDS;
  window.CB_SOUND_GROUPS = GROUP_LABELS;
  window.CB_SOUND_ALIASES = ALIASES;
  window.CB_PITCHED = PITCHED;
  window.CB_UNTUNED = UNTUNED;
  window.CB_migrateSoundId = migrateSoundId;
  window.CB_normalizeTuning = normalizeTuning;
  window.CB_a4 = a4Of;
  window.CB_hz = hzOf;
  window.CB_rootHz = rootOf;
  window.CB_centerHz = centerOf;
  window.CBSound = SoundEngine;
})();
