/* Relaxing sounds synthesized in the browser. No samples are downloaded. */
(function () {
'use strict';
const SOUNDS = [
    { id: "rain", label: "Rain" }, { id: "thunder", label: "Thunderstorm" }, { id: "waves", label: "Waves" },
    { id: "stream", label: "Stream" }, { id: "wind", label: "Wind" }, { id: "birds", label: "Birds" },
    { id: "crickets", label: "Night crickets" }, { id: "campfire", label: "Campfire" }, { id: "flute", label: "Flute" },
    { id: "harp", label: "Harp arpeggios" }, { id: "bowl", label: "Singing bowl" }, { id: "whale", label: "Whale song" },
    { id: "brown", label: "Brown noise" },
];
const rnd = (a, b) => a + Math.random() * (b - a);
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
    b.connect(to);
    return b;
}
function lfo(k, freq, depth, target) {
    const o = k.ctx.createOscillator();
    o.frequency.value = freq;
    const g = k.ctx.createGain();
    g.gain.value = depth;
    o.connect(g);
    g.connect(target);
    o.start();
    k.add(o);
}
function tone(k, to, o) {
    const t = k.ctx.currentTime + (o.at ?? 0);
    const osc = k.ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.f, t);
    if (o.endF)
        osc.frequency.exponentialRampToValueAtTime(o.endF, t + o.dur);
    const g = k.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.peak, t + o.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.attack + o.dur);
    osc.connect(g);
    if (o.pan !== undefined) {
        const p = k.ctx.createStereoPanner();
        p.pan.value = o.pan;
        g.connect(p);
        p.connect(to);
    }
    else
        g.connect(to);
    if (o.vib) {
        const v = k.ctx.createOscillator();
        v.frequency.value = 5;
        const vg = k.ctx.createGain();
        vg.gain.value = o.vib;
        v.connect(vg);
        vg.connect(osc.frequency);
        v.start(t);
        v.stop(t + o.attack + o.dur + 0.1);
    }
    osc.start(t);
    osc.stop(t + o.attack + o.dur + 0.1);
}
function burst(k, to, kind, dur, peak, attack) {
    const t = k.ctx.currentTime;
    const s = k.ctx.createBufferSource();
    s.buffer = k.buf(kind);
    const g = k.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
    s.connect(g);
    g.connect(to);
    s.start(t, Math.random() * 2);
    s.stop(t + attack + dur + 0.1);
}
function rainBed(k, level) {
    const g = gainNode(k.ctx, level, k.out);
    const lp = filt(k.ctx, "lowpass", 6000, 0.5, g);
    const hp = filt(k.ctx, "highpass", 500, 0.5, lp);
    k.noise("pink").connect(hp);
    lfo(k, 0.15, 900, lp.frequency);
}
const BUILD = {
    rain: (k) => rainBed(k, 0.7),
    thunder: (k) => {
        rainBed(k, 0.55);
        const lp = filt(k.ctx, "lowpass", 140, 0.7, k.out);
        k.every(() => {
            burst(k, lp, "brown", rnd(3, 6), rnd(1.2, 2.4), rnd(0.2, 0.9));
            return rnd(7000, 16000);
        });
    },
    waves: (k) => {
        const g = gainNode(k.ctx, 0.35, k.out);
        const lp = filt(k.ctx, "lowpass", 700, 0.6, g);
        k.noise("pink").connect(lp);
        lfo(k, 0.09, 0.3, g.gain);
        lfo(k, 0.09, 350, lp.frequency);
    },
    stream: (k) => {
        const g1 = gainNode(k.ctx, 0.3, k.out);
        k.noise("white").connect(filt(k.ctx, "bandpass", 1200, 0.8, g1));
        const g2 = gainNode(k.ctx, 0.18, k.out);
        const bp = filt(k.ctx, "bandpass", 2800, 2, g2);
        k.noise("white").connect(bp);
        lfo(k, 3.3, 700, bp.frequency);
        lfo(k, 0.7, 400, bp.frequency);
    },
    wind: (k) => {
        const g = gainNode(k.ctx, 0.45, k.out);
        const bp = filt(k.ctx, "bandpass", 450, 1.4, g);
        k.noise("pink").connect(bp);
        lfo(k, 0.06, 280, bp.frequency);
        lfo(k, 0.13, 0.25, g.gain);
    },
    brown: (k) => {
        const g = gainNode(k.ctx, 0.8, k.out);
        k.noise("brown").connect(filt(k.ctx, "lowpass", 900, 0.5, g));
    },
    birds: (k) => {
        const sp = k.space(0.22, 0.25);
        k.every(() => {
            const n = Math.floor(rnd(2, 6));
            const f = rnd(2300, 4600);
            const pan = rnd(-0.8, 0.8);
            for (let i = 0; i < n; i++)
                tone(k, sp, { f: f * rnd(0.9, 1.1), endF: f * rnd(0.65, 1.45), at: i * rnd(0.1, 0.16), attack: 0.015, dur: rnd(0.05, 0.1), peak: 0.07, pan });
            return rnd(900, 4200);
        });
    },
    crickets: (k) => {
        const sp = k.space(0.18, 0.2);
        const one = (f, pan, gap) => {
            k.every(() => {
                for (let i = 0; i < 4; i++)
                    tone(k, sp, { f, at: i * 0.055, attack: 0.008, dur: 0.03, peak: 0.035, pan });
                return gap + rnd(-80, 120);
            });
        };
        one(4400, -0.5, 820);
        one(4700, 0.5, 1050);
    },
    campfire: (k) => {
        const g = gainNode(k.ctx, 0.35, k.out);
        k.noise("brown").connect(filt(k.ctx, "lowpass", 380, 0.7, g));
        lfo(k, 0.3, 0.12, g.gain);
        k.every(() => {
            const hp = filt(k.ctx, "highpass", rnd(900, 4200), 0.8, k.out);
            burst(k, hp, "white", rnd(0.015, 0.06), rnd(0.08, 0.5) * (Math.random() < 0.15 ? 2 : 1), 0.003);
            window.setTimeout(() => hp.disconnect(), 400);
            return 25 + Math.random() * Math.random() * 450;
        });
    },
    flute: (k) => {
        const sp = k.space(0.38, 0.45);
        const scale = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99];
        let idx = 3;
        k.every(() => {
            idx = Math.max(0, Math.min(scale.length - 1, idx + Math.floor(rnd(-2, 3))));
            const f = scale[idx];
            const dur = rnd(0.5, 1.5);
            tone(k, sp, { f, attack: 0.14, dur, peak: 0.13, vib: f * 0.007 });
            tone(k, sp, { f: f * 2, attack: 0.18, dur: dur * 0.8, peak: 0.015, type: "triangle" });
            return (dur + 0.25) * 1000 + (Math.random() < 0.2 ? 1400 : 0);
        });
    },
    harp: (k) => {
        const sp = k.space(0.3, 0.4);
        const chords = [[261.63, 329.63, 392, 523.25, 659.25], [220, 261.63, 329.63, 440, 523.25], [174.61, 220, 261.63, 349.23, 440], [196, 246.94, 293.66, 392, 493.88]];
        let ci = 0;
        k.every(() => {
            const ch = chords[ci % chords.length];
            ci++;
            const up = Math.random() < 0.7;
            ch.forEach((f, i) => {
                const at = (up ? i : ch.length - 1 - i) * 0.2;
                tone(k, sp, { f, at, attack: 0.008, dur: 2.6, peak: 0.09, type: "triangle" });
                tone(k, sp, { f: f * 2, at, attack: 0.006, dur: 1.2, peak: 0.02 });
            });
            return 2600;
        });
    },
    bowl: (k) => {
        const sp = k.space(0.45, 0.5);
        k.every(() => {
            const f = [196, 220, 261.63, 293.66][Math.floor(rnd(0, 4))];
            const parts = [[1, 0.16], [2.71, 0.06], [5.15, 0.025]];
            parts.forEach((p, i) => {
                tone(k, sp, { f: f * p[0], attack: 0.02, dur: 9 / (i + 1), peak: p[1] });
                tone(k, sp, { f: f * p[0] + 0.9, attack: 0.02, dur: 9 / (i + 1), peak: p[1] * 0.7 });
            });
            if (Math.random() < 0.5) {
                for (let i = 0; i < 3; i++)
                    tone(k, sp, { f: rnd(1300, 2600), at: 1.5 + i * rnd(0.25, 0.6), attack: 0.005, dur: 2.5, peak: 0.025, pan: rnd(-0.7, 0.7) });
            }
            return rnd(6500, 10000);
        });
    },
    whale: (k) => {
        const g = gainNode(k.ctx, 0.4, k.out);
        k.noise("brown").connect(filt(k.ctx, "lowpass", 260, 0.6, g));
        lfo(k, 0.07, 0.15, g.gain);
        const sp = k.space(0.6, 0.55);
        k.every(() => {
            const f = rnd(140, 320);
            tone(k, sp, { f, endF: f * rnd(1.5, 2.4), attack: 1.2, dur: rnd(2, 3.5), peak: 0.12, vib: 3 });
            return rnd(5000, 10000);
        });
    },
};
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.bufs = {};
        this.active = new Map();
        this.volume = 0.6;
    }
    ensure() {
        if (!this.ctx) {
            const w = window;
            const Ctor = w.AudioContext ?? w.webkitAudioContext;
            if (!Ctor)
                throw new Error("no audio");
            this.ctx = new Ctor();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.volume;
            this.master.connect(this.ctx.destination);
        }
        if (this.ctx.state === "suspended")
            void this.ctx.resume();
        return this.ctx;
    }
    buf(kind) {
        const ctx = this.ensure();
        const have = this.bufs[kind];
        if (have)
            return have;
        const len = ctx.sampleRate * 4;
        const b = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = b.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, last = 0;
        for (let i = 0; i < len; i++) {
            const w = Math.random() * 2 - 1;
            if (kind === "white")
                d[i] = w * 0.5;
            else if (kind === "pink") {
                b0 = 0.99765 * b0 + w * 0.099046;
                b1 = 0.963 * b1 + w * 0.2965164;
                b2 = 0.57 * b2 + w * 1.0526913;
                d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
            }
            else {
                last = (last + 0.02 * w) / 1.02;
                d[i] = last * 3.5;
            }
        }
        this.bufs[kind] = b;
        return b;
    }
    setVolume(v) {
        this.volume = v;
        if (this.master && this.ctx)
            this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    }
    start(id) {
        if (this.active.has(id))
            return;
        const ctx = this.ensure();
        const master = this.master;
        if (!master)
            return;
        const out = ctx.createGain();
        out.gain.setValueAtTime(0.0001, ctx.currentTime);
        out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.2);
        out.connect(master);
        const sources = [];
        const timers = [];
        let alive = true;
        const kit = {
            ctx,
            out,
            add: (s) => { sources.push(s); },
            every: (fn) => {
                const slot = timers.length;
                timers.push(0);
                const tick = () => {
                    if (!alive)
                        return;
                    const next = fn();
                    timers[slot] = window.setTimeout(tick, next);
                };
                timers[slot] = window.setTimeout(tick, rnd(100, 900));
            },
            noise: (kind) => {
                const s = ctx.createBufferSource();
                s.buffer = this.buf(kind);
                s.loop = true;
                s.start(0, Math.random() * 3);
                sources.push(s);
                return s;
            },
            buf: (kind) => this.buf(kind),
            space: (time, fb) => {
                const input = ctx.createGain();
                input.connect(out);
                const delay = ctx.createDelay(2);
                delay.delayTime.value = time;
                const fbg = ctx.createGain();
                fbg.gain.value = fb;
                const lp = filt(ctx, "lowpass", 2400, 0.5, fbg);
                input.connect(delay);
                delay.connect(lp);
                fbg.connect(delay);
                const wet = gainNode(ctx, 0.6, out);
                delay.connect(wet);
                return input;
            },
        };
        BUILD[id](kit);
        this.active.set(id, () => {
            alive = false;
            timers.forEach((t) => window.clearTimeout(t));
            out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
            window.setTimeout(() => {
                sources.forEach((s) => { try {
                    s.stop();
                }
                catch { /* already stopped */ } });
                out.disconnect();
            }, 900);
        });
    }
    stop(id) {
        const s = this.active.get(id);
        if (s) {
            s();
            this.active.delete(id);
        }
    }
    stopAll() {
        Array.from(this.active.keys()).forEach((id) => this.stop(id));
    }
    close() {
        this.stopAll();
        const c = this.ctx;
        if (c)
            window.setTimeout(() => { void c.close(); }, 1000);
        this.ctx = null;
    }
}

window.CB_SOUNDS = SOUNDS;
window.CBSound = SoundEngine;
})();
