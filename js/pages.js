/* Coloring Book drawings: mandalas and mochi animals.
   Each region is a fillable path in a 400 by 400 picture. A region with `m`
   is the same shape mirrored across the middle. `line` is a stroke (lashes,
   a sleepy lid). `base` keeps eyes ink-dark and sparkles white until you color them. */
(function () {
'use strict';
function hslToHex(h, s, l) {
    const ss = s / 100;
    const ll = l / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = ss * Math.min(ll, 1 - ll);
    const f = (n) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const to = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
    return "#" + to(f(0)) + to(f(8)) + to(f(4));
}
function hexToHsl(hex) {
    const m = hex.replace("#", "");
    const r = parseInt(m.slice(0, 2), 16) / 255;
    const g = parseInt(m.slice(2, 4), 16) / 255;
    const b = parseInt(m.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r)
            h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g)
            h = (b - r) / d + 2;
        else
            h = (r - g) / d + 4;
        h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
const hx = (c) => hslToHex(c[0], c[1], c[2]);
const hs = (c, a) => `hsl(${c[0]} ${c[1]}% ${c[2]}%${a === undefined ? "" : ` / ${a}`})`;
const PAPER = hx([45, 60, 98]);
const INK = hx([235, 18, 18]);
const WHITE = hx([0, 0, 100]);
const SWATCH_HSL = [
    [0, 80, 55], [15, 90, 60], [32, 95, 55], [45, 95, 58], [55, 90, 65], [80, 60, 50],
    [120, 45, 45], [150, 55, 55], [175, 60, 45], [195, 75, 55], [210, 80, 45], [230, 60, 60],
    [260, 55, 60], [280, 50, 50], [300, 50, 65], [330, 75, 65], [345, 80, 80], [20, 40, 35],
    [30, 45, 70], [40, 60, 88], [200, 50, 88], [0, 0, 100], [0, 0, 60], [0, 0, 15],
];
const SWATCHES = SWATCH_HSL.map(hx);
const TAU = Math.PI * 2;
const CX = 200;
const fx = (n) => n.toFixed(1);
const P = (r, a) => `${fx(CX + r * Math.cos(a))} ${fx(CX + r * Math.sin(a))}`;
const BG = "M0 0H400V400H0Z";
function E(cx, cy, rx, ry) {
    return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
}
const Cc = (cx, cy, r) => E(cx, cy, r, r);
function seg(r0, r1, a0, a1) {
    const lg = a1 - a0 > Math.PI ? 1 : 0;
    return `M${P(r0, a0)}L${P(r1, a0)}A${r1} ${r1} 0 ${lg} 1 ${P(r1, a1)}L${P(r0, a1)}A${r0} ${r0} 0 ${lg} 0 ${P(r0, a0)}Z`;
}
function petal(a, r0, r1, w) {
    const d = r1 - r0;
    return `M${P(r0, a)}C${P(r0 + d * 0.3, a - w)} ${P(r1 - d * 0.25, a - w * 0.7)} ${P(r1, a)}C${P(r1 - d * 0.25, a + w * 0.7)} ${P(r0 + d * 0.3, a + w)} ${P(r0, a)}Z`;
}
function starAt(cx, cy, n, ro, ri, off = 0) {
    let s = "";
    for (let i = 0; i < n * 2; i++) {
        const a = off - Math.PI / 2 + (i * Math.PI) / n;
        const r = i % 2 === 0 ? ro : ri;
        s += (i === 0 ? "M" : "L") + fx(cx + r * Math.cos(a)) + " " + fx(cy + r * Math.sin(a));
    }
    return s + "Z";
}
function hex(cx, cy, r) {
    let s = "";
    for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        s += (i === 0 ? "M" : "L") + fx(cx + r * Math.cos(a)) + " " + fx(cy + r * Math.sin(a));
    }
    return s + "Z";
}
function ringSegs(out, r0, r1, n, off, gA, gB) {
    for (let i = 0; i < n; i++) {
        const a0 = off - Math.PI / 2 + (i * TAU) / n;
        out.push({ d: seg(r0, r1, a0, a0 + TAU / n), g: i % 2 ? gB : gA });
    }
}
function petals(out, n, r0, r1, w, off, g) {
    for (let i = 0; i < n; i++)
        out.push({ d: petal(off - Math.PI / 2 + (i * TAU) / n, r0, r1, w), g });
}
function dots(out, n, r, size, off, g) {
    for (let i = 0; i < n; i++) {
        const a = off - Math.PI / 2 + (i * TAU) / n;
        out.push({ d: Cc(CX + r * Math.cos(a), CX + r * Math.sin(a), size), g });
    }
}
function triRays(out, n, r0, r1, w, off, g) {
    for (let i = 0; i < n; i++) {
        const a = off - Math.PI / 2 + (i * TAU) / n;
        out.push({ d: `M${P(r0, a - w)}L${P(r1, a)}L${P(r0, a + w)}Z`, g });
    }
}
const ring = (r, g) => ({ d: Cc(CX, CX, r), g });
function annulus(r0, r1) {
    return seg(r0, r1, 0, Math.PI) + seg(r0, r1, Math.PI, TAU);
}
function lotus() {
    const o = [{ d: BG, g: "bg" }, ring(192, "o0")];
    ringSegs(o, 162, 192, 24, 0, "o1", "o2");
    o.push(ring(162, "c1"));
    petals(o, 16, 42, 158, 0.2, 0, "p16");
    petals(o, 8, 42, 122, 0.34, TAU / 16, "p8");
    dots(o, 16, 146, 6, TAU / 32, "dots");
    o.push(ring(46, "c2"));
    petals(o, 8, 10, 45, 0.5, 0, "p8s");
    o.push(ring(12, "c3"));
    return o;
}
function compass() {
    const o = [{ d: BG, g: "bg" }, ring(192, "a")];
    ringSegs(o, 172, 192, 36, 0, "s1", "s2");
    o.push({ d: starAt(CX, CX, 12, 172, 122), g: "st1" });
    dots(o, 12, 150, 9, TAU / 24, "dots");
    o.push(ring(122, "b"));
    o.push({ d: starAt(CX, CX, 8, 120, 72, TAU / 16), g: "st2" });
    o.push(ring(72, "c"));
    triRays(o, 12, 36, 70, 0.22, 0, "rays");
    o.push({ d: starAt(CX, CX, 6, 40, 22), g: "st3" });
    o.push(ring(14, "d"));
    return o;
}
function sunWheel() {
    const o = [{ d: BG, g: "bg" }];
    triRays(o, 32, 184, 198, 0.08, 0, "teeth");
    ringSegs(o, 150, 185, 24, 0, "r1a", "r1b");
    ringSegs(o, 115, 150, 24, TAU / 48, "r2a", "r2b");
    ringSegs(o, 80, 115, 12, 0, "r3a", "r3b");
    o.push(ring(80, "c"));
    triRays(o, 16, 40, 79, 0.13, 0, "rays");
    o.push(ring(40, "core"));
    ringSegs(o, 20, 32, 8, 0, "r4a", "r4b");
    o.push(ring(20, "mid"));
    return o;
}
function garden() {
    const o = [{ d: BG, g: "bg" }];
    for (let i = 0; i < 20; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 20;
        o.push({ d: Cc(CX + 165 * Math.cos(a), CX + 165 * Math.sin(a), 29), g: i % 2 ? "bub1" : "bub2" });
    }
    o.push(ring(152, "ring"));
    petals(o, 10, 62, 150, 0.27, 0, "p10");
    petals(o, 10, 66, 122, 0.17, TAU / 20, "p10b");
    dots(o, 10, 140, 7, TAU / 20, "dots");
    o.push(ring(64, "inner"));
    o.push({ d: starAt(CX, CX, 5, 60, 26), g: "star" });
    o.push(ring(20, "core"));
    return o;
}
function snowflake() {
    const o = [{ d: BG, g: "bg" }, ring(190, "a")];
    petals(o, 6, 100, 188, 0.3, 0, "tipA");
    petals(o, 6, 110, 178, 0.25, TAU / 12, "tipB");
    ringSegs(o, 85, 110, 12, 0, "ra", "rb");
    o.push(ring(85, "b"));
    o.push({ d: starAt(CX, CX, 6, 84, 45), g: "st" });
    dots(o, 6, 62, 8, TAU / 12, "dots");
    o.push(ring(40, "c"));
    petals(o, 6, 6, 39, 0.5, 0, "core6");
    o.push(ring(9, "d"));
    return o;
}
const R = (d, extra) => ({ d, ...extra });
const L = (d) => ({ d, line: true });
/* ---- extra mandala shapes ---- */
function around(o, n, off, g, fn) {
    for (let i = 0; i < n; i++)
        o.push({ d: fn(off - Math.PI / 2 + (i * TAU) / n), g });
}
function heartP(a, r0, r1, w) {
    const d = r1 - r0;
    const m = r0 + d * 0.55;
    return `M${P(r0, a)}C${P(m, a - w * 1.5)} ${P(r1 + d * 0.15, a - w * 1.25)} ${P(r1 - d * 0.12, a)}C${P(r1 + d * 0.15, a + w * 1.25)} ${P(m, a + w * 1.5)} ${P(r0, a)}Z`;
}
function diamond(a, r0, r1, w) {
    const m = (r0 + r1) / 2;
    return `M${P(r0, a)}L${P(m, a - w)}L${P(r1, a)}L${P(m, a + w)}Z`;
}
function swirl(a, r0, r1, w, t) {
    const d = r1 - r0;
    return `M${P(r0, a)}C${P(r0 + d * 0.4, a - w)} ${P(r1 - d * 0.2, a + t - w * 0.5)} ${P(r1, a + t)}C${P(r1 - d * 0.35, a + t + w * 0.2)} ${P(r0 + d * 0.4, a + w * 0.6)} ${P(r0, a)}Z`;
}
function heartBloom() {
    const o = [{ d: BG, g: "bg" }, { d: annulus(190, 198), g: "a" }];
    ringSegs(o, 170, 190, 20, 0, "s1", "s2");
    o.push(ring(170, "b"));
    around(o, 12, TAU / 24, "d12", (a) => diamond(a, 118, 168, 0.08));
    around(o, 12, 0, "h12", (a) => heartP(a, 60, 158, 0.16));
    o.push(ring(62, "c"));
    around(o, 6, 0, "h6", (a) => heartP(a, 14, 58, 0.34));
    o.push(ring(14, "d"));
    return o;
}
function kaleido() {
    const o = [{ d: BG, g: "bg" }];
    ringSegs(o, 160, 190, 30, 0, "k1", "k2");
    ringSegs(o, 130, 160, 24, TAU / 48, "k3", "k4");
    ringSegs(o, 100, 130, 18, 0, "k5", "k6");
    ringSegs(o, 70, 100, 12, TAU / 24, "k7", "k8");
    ringSegs(o, 40, 70, 6, 0, "k9", "k10");
    o.push(ring(40, "c"));
    around(o, 6, 0, "dm", (a) => diamond(a, 4, 38, 0.4));
    return o;
}
function spiral() {
    const o = [{ d: BG, g: "bg" }, ring(190, "a")];
    around(o, 18, 0, "sw1", (a) => swirl(a, 110, 186, 0.18, 0.35));
    o.push(ring(112, "b"));
    around(o, 12, 0, "sw2", (a) => swirl(a, 50, 110, 0.25, 0.5));
    o.push(ring(52, "c"));
    around(o, 8, 0, "sw3", (a) => swirl(a, 12, 50, 0.4, 0.7));
    o.push(ring(13, "d"));
    return o;
}
function gearRose() {
    const o = [{ d: BG, g: "bg" }];
    dots(o, 24, 176, 18, 0, "scal");
    o.push(ring(166, "a"), { d: starAt(CX, CX, 24, 164, 138), g: "st" }, ring(138, "b"));
    petals(o, 12, 60, 136, 0.22, 0, "p");
    petals(o, 12, 70, 118, 0.12, TAU / 24, "p2");
    o.push(ring(62, "c"));
    dots(o, 8, 42, 12, 0, "d");
    o.push(ring(28, "e"), { d: starAt(CX, CX, 8, 26, 12), g: "st2" });
    return o;
}
function lattice() {
    const o = [{ d: BG, g: "bg" }, ring(192, "a")];
    around(o, 24, 0, "dA", (a) => diamond(a, 150, 190, 0.07));
    around(o, 24, TAU / 48, "dB", (a) => diamond(a, 132, 176, 0.05));
    o.push(ring(130, "b"));
    around(o, 16, 0, "dC", (a) => diamond(a, 70, 128, 0.12));
    around(o, 16, TAU / 32, "dD", (a) => diamond(a, 80, 118, 0.06));
    o.push(ring(72, "c"));
    around(o, 8, 0, "dE", (a) => diamond(a, 20, 70, 0.25));
    o.push(ring(20, "d"));
    return o;
}
/* ---- kawaii animal helpers ---- */
const pair = (d, x) => [R(d, x), R(d, { ...x, m: true })];
function heart(cx, cy, s) {
    return `M${cx} ${cy + s * 0.9}C${cx - s * 1.4} ${cy} ${cx - s * 0.9} ${cy - s * 1.1} ${cx} ${cy - s * 0.4}C${cx + s * 0.9} ${cy - s * 1.1} ${cx + s * 1.4} ${cy} ${cx} ${cy + s * 0.9}Z`;
}
function spark(cx, cy, s) {
    return `M${cx} ${cy - s}Q${cx} ${cy} ${cx + s} ${cy}Q${cx} ${cy} ${cx} ${cy + s}Q${cx} ${cy} ${cx - s} ${cy}Q${cx} ${cy} ${cx} ${cy - s}Z`;
}
function omegaMouth(cx, cy, w) {
    return `M${cx - w} ${cy}C${cx - w * 0.55} ${cy + w * 0.9} ${cx - w * 0.2} ${cy + w * 0.9} ${cx} ${cy + w * 0.2}C${cx + w * 0.2} ${cy + w * 0.9} ${cx + w * 0.55} ${cy + w * 0.9} ${cx + w} ${cy}C${cx + w * 0.45} ${cy + w * 0.42} ${cx + w * 0.16} ${cy + w * 0.48} ${cx} ${cy + w * 0.32}C${cx - w * 0.16} ${cy + w * 0.48} ${cx - w * 0.45} ${cy + w * 0.42} ${cx - w} ${cy}Z`;
}
function uMouth(cx, cy, w) {
    return `M${cx - w} ${cy}C${cx - w} ${cy + w * 1.35} ${cx + w} ${cy + w * 1.35} ${cx + w} ${cy}C${cx + w * 0.45} ${cy + w * 0.62} ${cx - w * 0.45} ${cy + w * 0.62} ${cx - w} ${cy}Z`;
}
function smileMouth(cx, cy, w) {
    return `M${cx - w} ${cy}Q${cx} ${cy + w * 1.2} ${cx + w} ${cy}Q${cx} ${cy + w * 0.42} ${cx - w} ${cy}Z`;
}
function lashLine(cx, y, dx, er, sleepy) {
    let d = "";
    for (const s of [-1, 1]) {
        const ex = cx + s * dx;
        d += `M${fx(ex - er * 0.72)} ${fx(y - er * 0.9)}Q${fx(ex - er * 0.15)} ${fx(y - er * 1.18)} ${fx(ex + er * 0.18)} ${fx(y - er * 0.86)}`;
        d += `M${fx(ex + er * 0.12)} ${fx(y - er)}Q${fx(ex + er * 0.42)} ${fx(y - er * 1.2)} ${fx(ex + er * 0.74)} ${fx(y - er * 0.88)}`;
        if (sleepy)
            d += `M${fx(ex - er * 0.75)} ${fx(y + er * 0.2)}Q${fx(ex)} ${fx(y + er * 0.58)} ${fx(ex + er * 0.75)} ${fx(y + er * 0.2)}`;
    }
    return d;
}
/* Low, wide eyes, cheek ovals, and a tiny mouth. One soft highlight, two on a few friends. */
function kawaiiFace(opt) {
    const y = opt.ey ?? 234;
    const dx = opt.dx ?? 56;
    const er = opt.er ?? 32;
    const cx = opt.cx ?? 200;
    const mouth = opt.mouth ?? "w";
    const o = [];
    for (const s of [-1, 1]) {
        const ex = cx + s * dx;
        o.push(R(E(ex + s * (er + 10), y + er * 0.7, 32, 18), { g: "blush" }));
        o.push(R(E(ex, y, er * 0.92, er), { base: "ink", g: "eye" }));
        if (opt.sleepy)
            o.push(R(E(ex, y - er * 0.2, er, er * 0.5), { g: "lid" }));
        const hy = opt.sleepy ? y + er * 0.42 : y - er * 0.3;
        o.push(R(Cc(ex + er * 0.22, hy, Math.max(13, er * 0.42)), { base: "white", g: "hl" }));
        if (opt.dots === 2 && !opt.sleepy)
            o.push(R(Cc(ex - er * 0.24, y + er * 0.28, 11), { base: "white", g: "hl2" }));
    }
    o.push(L(lashLine(cx, y, dx, er, !!opt.sleepy)));
    if (mouth !== "none") {
        const my = y + er * 1.32;
        const w = mouth === "smile" ? 24 : 20;
        const d = mouth === "u" ? uMouth(cx, my, 18) : mouth === "smile" ? smileMouth(cx, my, w) : omegaMouth(cx, my, w);
        o.push(R(d, { g: "mouth" }));
        if (opt.tongue)
            o.push(R(E(cx, my + w * 0.48, 16, 12), { g: "tongue" }));
    }
    return o;
}
function floats(list) {
    const spec = list || [["h", 46, 44, 18], ["s", 352, 52, 16]];
    return spec.map((v) => {
        const [k, x, y, s] = v;
        return R(k === "h" ? heart(x, y, s) : spark(x, y, s), { g: k === "h" ? "heart" : "spark" });
    });
}
function pointyEars() {
    return pair("M126 164C104 64 140 32 164 50C184 64 178 128 166 168Z", { g: "ear" });
}
function roundEars(x, y, r) {
    return pair(Cc(x, y, r), { g: "ear" });
}
function longEars() {
    return pair(E(154, 84, 26, 74), { g: "ear" });
}
function floppyEars() {
    return pair("M158 158C104 168 68 230 104 274C142 308 178 230 168 160Z", { g: "ear" });
}
function bow(x, y) {
    return [
        R(`M${x} ${y}C${x - 18} ${y - 34} ${x - 52} ${y - 20} ${x - 42} ${y}C${x - 52} ${y + 20} ${x - 18} ${y + 34} ${x} ${y}Z`, { g: "bow" }),
        R(`M${x} ${y}C${x + 18} ${y - 34} ${x + 52} ${y - 20} ${x + 42} ${y}C${x + 52} ${y + 20} ${x + 18} ${y + 34} ${x} ${y}Z`, { g: "bow" }),
        R(Cc(x, y, 12), { g: "knot" }),
    ];
}
function leafAt(cx, cy, s) {
    return R(`M${cx} ${cy - s}C${cx + s * 1.15} ${cy - s * 0.15} ${cx + s * 0.85} ${cy + s * 0.9} ${cx} ${cy + s * 0.35}C${cx - s * 0.85} ${cy + s * 0.9} ${cx - s * 1.15} ${cy - s * 0.15} ${cx} ${cy - s}Z`, { g: "leaf" });
}
function flowerCrown(cx, cy) {
    const o = [];
    for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 5;
        o.push(R(Cc(Math.round(cx + Math.cos(a) * 26), Math.round(cy + Math.sin(a) * 18), 16), { g: "petal" }));
    }
    o.push(R(Cc(cx, cy, 13), { g: "core" }));
    return o;
}
function softStar(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? r : r * 0.46;
        pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    let d = "";
    for (let i = 0; i < pts.length; i++) {
        const prev = pts[(i + pts.length - 1) % pts.length];
        const cur = pts[i];
        const next = pts[(i + 1) % pts.length];
        const start = [(prev[0] + cur[0]) / 2, (prev[1] + cur[1]) / 2];
        const end = [(cur[0] + next[0]) / 2, (cur[1] + next[1]) / 2];
        if (i === 0)
            d += `M${fx(start[0])} ${fx(start[1])}`;
        d += `Q${fx(cur[0])} ${fx(cur[1])} ${fx(end[0])} ${fx(end[1])}`;
    }
    return d + "Z";
}
function scarf() {
    return [
        R("M104 292C148 270 252 270 296 292C310 316 278 342 236 334C198 356 150 356 118 334C90 342 88 314 104 292Z", { g: "scarf" }),
        R("M250 328C282 346 278 390 248 394C222 398 208 360 230 342Z", { g: "scarf" }),
    ];
}
function strawberry(cx, cy) {
    return [
        R(`M${cx} ${cy - 42}C${cx - 32} ${cy - 8} ${cx - 30} ${cy + 36} ${cx} ${cy + 46}C${cx + 30} ${cy + 36} ${cx + 32} ${cy - 8} ${cx} ${cy - 42}Z`, { g: "berry" }),
        R(`M${cx - 26} ${cy - 30}C${cx - 10} ${cy - 54} ${cx + 10} ${cy - 54} ${cx + 26} ${cy - 30}C${cx + 8} ${cy - 16} ${cx - 8} ${cy - 16} ${cx - 26} ${cy - 30}Z`, { g: "calyx" }),
    ];
}
function hugHeart() {
    return [
        R(E(146, 300, 28, 22), { g: "paw" }),
        R(E(254, 300, 28, 22), { g: "paw" }),
        R(heart(200, 292, 36), { g: "heart" }),
    ];
}
function zzz(x, y) {
    const drop = 58;
    return [
        R(ellRot(x, y, 32, 12, 0), { g: "zzz" }),
        R(ellRot(x, y + drop / 2, 44, 12, Math.atan2(drop, -64)), { g: "zzz" }),
        R(ellRot(x, y + drop, 32, 12, 0), { g: "zzz" }),
    ];
}
/* One dumpling: head and body are the same blob. Ears, a prop, and the face sit on it. */
function mochi(p) {
    const o = [B(), R(p.ground || "M0 352Q200 332 400 352V400H0Z", { g: p.gg || "ground" })];
    o.push(...floats(p.floats));
    if (p.back)
        o.push(...p.back);
    o.push(R(p.blob || E(200, 208, 136, 116), { g: "blob" }));
    if (p.ears)
        o.push(...p.ears);
    if (p.front)
        o.push(...p.front);
    o.push(...kawaiiFace(p.face || {}));
    if (p.top)
        o.push(...p.top);
    return o;
}
const B = () => R(BG, { g: "bg" });
function cat() {
    return mochi({
        floats: [["h", 40, 40, 18], ["s", 356, 46, 16], ["h", 32, 286, 14]],
        ears: pointyEars(),
        front: [R(E(58, 176, 34, 28), { g: "paw" })],
        face: { mouth: "w", dots: 2 },
        top: [...bow(292, 118), R("M286 286C348 268 396 318 366 358C328 388 286 348 276 314Z", { g: "tail" })],
    });
}
function fish() {
    return mochi({
        gg: "sand",
        blob: E(214, 210, 150, 102),
        floats: [["h", 44, 42, 16], ["s", 348, 64, 15]],
        back: [
            R("M78 208C18 150 6 176 22 214C8 252 28 278 84 236Z", { g: "tail" }),
            R("M150 118C188 52 258 58 278 124Z", { g: "fin" }),
            R(Cc(52, 96, 14), { g: "bub" }),
            R(Cc(78, 64, 12), { g: "bub" }),
        ],
        face: { cx: 252, ey: 204, dx: 34, er: 26, mouth: "smile" },
    });
}
function owl() {
    return mochi({
        floats: [["h", 300, 48, 16], ["s", 340, 180, 15]],
        back: [
            R(Cc(58, 58, 32), { g: "moon" }),
            R("M16 292C16 268 384 268 384 292C384 316 16 316 16 292Z", { g: "branch" }),
        ],
        ears: pair("M142 150C122 86 154 64 170 82C184 98 176 148 160 156Z", { g: "tuft" }),
        front: [R(E(200, 286, 28, 16), { g: "beak" })],
        face: { mouth: "none", dots: 2 },
    });
}
function butterfly() {
    const up = "M200 188C168 36 36 48 50 156C62 214 150 206 200 196Z";
    const low = "M200 208C140 214 58 258 90 326C124 358 176 286 200 232Z";
    return mochi({
        gg: "grass",
        ground: "M0 360Q200 340 400 360V400H0Z",
        blob: E(200, 204, 74, 86),
        floats: [["s", 40, 42, 15], ["h", 356, 56, 16]],
        back: [...pair(up, { g: "wing" }), ...pair(low, { g: "wing" })],
        face: { ey: 196, dx: 30, er: 24, mouth: "w", dots: 2 },
        top: [
            ...pair(Cc(78, 124, 20), { g: "spot" }),
            ...pair(Cc(98, 286, 18), { g: "spot" }),
            ...bow(200, 104),
        ],
    });
}
function turtle() {
    return mochi({
        gg: "sand",
        blob: E(200, 196, 118, 104),
        floats: [["h", 44, 42, 16], ["s", 352, 50, 15]],
        back: [R(E(200, 248, 170, 136), { g: "shell" })],
        face: { mouth: "smile" },
        top: [leafAt(200, 78, 26)],
    });
}
function elephant() {
    return mochi({
        floats: [["h", 44, 40, 16], ["s", 354, 48, 15]],
        ears: pair(E(78, 214, 56, 48), { g: "ear" }),
        front: [
            R(E(200, 292, 24, 52), { g: "trunk" }),
            R(Cc(222, 336, 18), { g: "trunk" }),
        ],
        face: { mouth: "u", ey: 214, er: 30 },
        top: [R(Cc(200, 72, 36), { g: "hat" }), R(Cc(200, 40, 14), { g: "pom" })],
    });
}
function bunny() {
    return mochi({
        floats: [["h", 42, 40, 18], ["s", 354, 46, 16]],
        ears: longEars(),
        front: hugHeart(),
        face: { mouth: "w", dots: 2 },
        top: [...bow(268, 48), R(Cc(324, 236, 22), { g: "tail" })],
    });
}
function panda() {
    return mochi({
        floats: [["h", 44, 42, 16], ["s", 352, 50, 15]],
        ears: roundEars(108, 132, 40),
        front: pair(E(144, 236, 46, 38), { g: "patch" }),
        face: { mouth: "u", dots: 2 },
        top: [
            R(E(368, 248, 14, 72), { g: "bamboo" }),
            leafAt(332, 188, 20),
            leafAt(348, 236, 16),
        ],
    });
}
function fox() {
    return mochi({
        floats: [["h", 40, 150, 16], ["s", 356, 48, 15]],
        ears: pointyEars(),
        front: [
            R(E(326, 250, 48, 32), { g: "tail" }),
            R(Cc(362, 232, 18), { g: "tip" }),
        ],
        face: { mouth: "w" },
        top: flowerCrown(200, 56),
    });
}
function penguin() {
    return mochi({
        gg: "ice",
        floats: [["s", 44, 44, 16], ["h", 348, 56, 15]],
        ears: pair(E(72, 248, 32, 26), { g: "wing" }),
        front: scarf(),
        face: { mouth: "none", dots: 2 },
        top: [R(E(200, 274, 34, 16), { g: "beak" })],
    });
}
function unicorn() {
    return mochi({
        floats: [["h", 42, 42, 16], ["s", 354, 48, 15], ["h", 46, 220, 13]],
        ears: pointyEars(),
        front: [
            R(Cc(96, 188, 20), { g: "mane" }),
            R(Cc(304, 176, 18), { g: "mane" }),
            R(Cc(70, 230, 16), { g: "mane" }),
        ],
        face: { mouth: "smile", dots: 2 },
        top: [R(E(200, 58, 18, 50), { g: "horn" }), ...bow(286, 150)],
    });
}
function ellRot(cx, cy, rx, ry, rot) {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const x0 = cx - rx * c;
    const y0 = cy - rx * s;
    const x1 = cx + rx * c;
    const y1 = cy + rx * s;
    const deg = ((rot * 180) / Math.PI).toFixed(1);
    return `M${fx(x0)} ${fx(y0)}A${fx(rx)} ${fx(ry)} ${deg} 1 0 ${fx(x1)} ${fx(y1)}A${fx(rx)} ${fx(ry)} ${deg} 1 0 ${fx(x0)} ${fx(y0)}Z`;
}
function pawBits(cx, cy, s, ang) {
    const bits = [R(ellRot(cx - Math.cos(ang) * s * 0.35, cy - Math.sin(ang) * s * 0.35, s * 0.62, s * 0.48, ang), { g: "pad" })];
    for (let i = -1; i <= 1; i++) {
        const a = ang + i * 0.55;
        bits.push(R(ellRot(cx + Math.cos(a) * s * 0.78, cy + Math.sin(a) * s * 0.78, s * 0.26, s * 0.2, a), { g: "toe" }));
    }
    return bits;
}
function pawParade() {
    const o = [{ d: BG, g: "bg" }, ring(188, "rim")];
    ringSegs(o, 168, 188, 16, 0, "s1", "s2");
    o.push(ring(148, "inner"));
    for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 6;
        o.push(...pawBits(CX + 104 * Math.cos(a), CX + 104 * Math.sin(a), 26, a));
    }
    o.push(R(heart(CX, CX + 4, 26), { g: "heart" }));
    o.push(ring(16, "core"));
    return o;
}
function starHearts() {
    const o = [{ d: BG, g: "bg" }, ring(190, "a")];
    around(o, 8, 0, "star", (a) => starAt(CX + 158 * Math.cos(a), CX + 158 * Math.sin(a), 5, 20, 9));
    o.push(ring(138, "b"));
    around(o, 8, TAU / 16, "heart", (a) => heart(CX + 108 * Math.cos(a), CX + 108 * Math.sin(a), 16));
    o.push(ring(74, "c"));
    around(o, 6, 0, "spark", (a) => spark(CX + 54 * Math.cos(a), CX + 54 * Math.sin(a), 12));
    o.push({ d: starAt(CX, CX, 6, 28, 12), g: "core" });
    return o;
}
function sweetBloom() {
    const o = [{ d: BG, g: "bg" }, ring(192, "a")];
    petals(o, 12, 78, 186, 0.22, 0, "petal");
    dots(o, 12, 166, 8, TAU / 24, "dot");
    o.push(ring(76, "b"));
    around(o, 6, 0, "heart", (a) => heartP(a, 22, 72, 0.3));
    o.push(ring(20, "c"));
    o.push({ d: starAt(CX, CX, 5, 18, 8), g: "star" });
    return o;
}
const ground = () => R("M0 348Q200 328 400 348V400H0Z", { g: "ground" });
function bumps() {
    const o = [];
    for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i * Math.PI) / 6;
        o.push(R(Cc(Math.round(200 + Math.cos(a) * 118), Math.round(188 + Math.sin(a) * 96), 26), { g: "bump" }));
    }
    return o;
}
function hamster() {
    return mochi({
        floats: [["h", 42, 42, 16], ["s", 46, 200, 14]],
        ears: roundEars(118, 150, 34),
        face: { mouth: "u", sleepy: true, ey: 240 },
        top: [...zzz(346, 64), R(E(318, 312, 24, 16), { g: "seed" })],
    });
}
function redpanda() {
    return mochi({
        floats: [["h", 42, 42, 16], ["s", 354, 50, 15]],
        ears: pointyEars(),
        front: [
            R(E(324, 248, 50, 34), { g: "tail" }),
            R(E(338, 236, 24, 14), { g: "stripe" }),
            R(Cc(360, 262, 16), { g: "stripe" }),
        ],
        face: { mouth: "smile" },
        top: [leafAt(250, 86, 22)],
    });
}
function axolotl() {
    return mochi({
        gg: "water",
        floats: [["s", 44, 44, 15], ["h", 350, 52, 16]],
        back: [R(Cc(48, 78, 14), { g: "bub" }), R(Cc(344, 96, 12), { g: "bub" })],
        ears: [
            ...pair(E(76, 150, 32, 20), { g: "gill" }),
            ...pair(E(64, 196, 34, 22), { g: "gill" }),
            ...pair(E(78, 242, 30, 18), { g: "gill" }),
        ],
        face: { mouth: "smile", tongue: true },
    });
}
function otter() {
    return mochi({
        gg: "water",
        floats: [["h", 42, 42, 16], ["s", 352, 48, 15]],
        ears: roundEars(112, 146, 30),
        front: [R(E(328, 286, 48, 20), { g: "tail" })],
        face: { mouth: "u" },
        top: [R(Cc(312, 188, 32), { g: "shell" }), R(heart(312, 186, 14), { g: "heart" })],
    });
}
function koala() {
    return mochi({
        floats: [["h", 42, 44, 16], ["s", 352, 150, 15]],
        ears: roundEars(96, 156, 48),
        front: [R(E(200, 262, 36, 24), { g: "nose" })],
        face: { mouth: "smile", ey: 228 },
        top: [leafAt(200, 70, 28)],
    });
}
function sloth() {
    return mochi({
        floats: [["h", 358, 118, 16], ["s", 354, 250, 14]],
        back: [
            R("M12 72C12 52 388 52 388 72C388 92 12 92 12 72Z", { g: "branch" }),
            R(Cc(46, 64, 16), { g: "leaf" }),
            R(Cc(352, 60, 14), { g: "leaf" }),
        ],
        front: [R(E(118, 132, 22, 36), { g: "arm" }), R(E(282, 132, 22, 36), { g: "arm" })],
        face: { mouth: "u", sleepy: true, ey: 236 },
        top: zzz(52, 148),
    });
}
function frog() {
    return mochi({
        gg: "pond",
        blob: E(200, 248, 148, 96),
        floats: [["h", 42, 42, 16], ["s", 354, 48, 15]],
        back: [R(E(200, 328, 168, 40), { g: "pad" })],
        face: { ey: 168, dx: 78, er: 36, mouth: "smile", tongue: true },
    });
}
function duck() {
    return mochi({
        floats: [["h", 42, 42, 16], ["s", 354, 50, 15]],
        front: [R(E(300, 268, 36, 26), { g: "wing" }), R(E(236, 286, 40, 18), { g: "bill" })],
        face: { mouth: "none" },
        top: bow(250, 120),
    });
}
function puppy() {
    return mochi({
        floats: [["h", 42, 40, 18], ["s", 354, 48, 16]],
        back: [R(Cc(318, 276, 20), { g: "tail" })],
        ears: floppyEars(),
        front: [
            R("M132 252C148 232 252 232 268 252C252 272 148 272 132 252Z", { g: "collar" }),
            R(Cc(214, 262, 12), { g: "tag" }),
        ],
        face: { mouth: "smile", tongue: true, dots: 2 },
    });
}
function bear() {
    return mochi({
        floats: [["h", 42, 42, 16], ["s", 46, 200, 14]],
        ears: roundEars(108, 140, 38),
        front: [R(E(304, 328, 28, 22), { g: "paw" })],
        face: { mouth: "smile", dots: 2 },
        top: strawberry(346, 292),
    });
}
function hedgehog() {
    return mochi({
        floats: [["h", 42, 42, 16], ["s", 354, 48, 15]],
        front: bumps(),
        face: { mouth: "u", ey: 250, er: 28 },
    });
}
function seal() {
    return mochi({
        gg: "water",
        blob: E(200, 214, 150, 108),
        floats: [["s", 44, 44, 16], ["h", 352, 52, 15]],
        front: [R(E(70, 300, 40, 18), { g: "flipper" }), R(E(330, 300, 40, 18), { g: "flipper" })],
        face: { mouth: "smile" },
        top: [R(Cc(318, 140, 34), { g: "ball" }), R(softStar(318, 140, 18), { g: "star" })],
    });
}
function chick() {
    return mochi({
        blob: E(188, 214, 120, 108),
        floats: [["s", 42, 44, 15], ["h", 46, 200, 14]],
        back: [R("M118 300C118 372 292 372 292 300C260 322 148 322 118 300Z", { g: "shell" })],
        front: [R(E(200, 286, 26, 14), { g: "beak" })],
        face: { mouth: "none", dots: 2 },
        top: [R(softStar(318, 118, 28), { g: "star" }), R(ellRot(318, 168, 12, 46, 0.15), { g: "stick" })],
    });
}
function piglet() {
    return mochi({
        floats: [["h", 42, 42, 16], ["s", 354, 48, 15]],
        back: [R(Cc(324, 260, 22), { g: "tail" })],
        ears: pair("M148 156C128 104 158 82 176 100C190 114 180 158 164 164Z", { g: "ear" }),
        front: [
            R(E(200, 270, 36, 26), { g: "snout" }),
            R(E(186, 272, 10, 12), { g: "nostril" }),
            R(E(214, 272, 10, 12), { g: "nostril" }),
        ],
        face: { mouth: "smile" },
    });
}
function deer() {
    return mochi({
        floats: [["h", 44, 160, 15], ["s", 354, 48, 15]],
        ears: pair(E(150, 150, 18, 32), { g: "ear" }),
        front: [
            ...pair("M158 128C148 70 170 42 184 54C192 78 180 118 170 136Z", { g: "antler" }),
            ...pair(Cc(152, 62, 13), { g: "tine" }),
        ],
        face: { mouth: "u" },
        top: [R(Cc(164, 292, 16), { g: "spot" }), R(Cc(236, 276, 14), { g: "spot" }), leafAt(250, 90, 22)],
    });
}
function mouse() {
    return mochi({
        floats: [["h", 300, 46, 16], ["s", 354, 120, 14]],
        back: [R(ellRot(318, 268, 62, 16, -0.7), { g: "tail" })],
        ears: roundEars(96, 148, 52),
        face: { mouth: "w", dots: 2 },
        top: [
            R(Cc(62, 268, 38), { g: "cheese" }),
            R(Cc(52, 258, 12), { g: "hole" }),
            R(Cc(74, 280, 11), { g: "hole" }),
        ],
    });
}
const PAGES = [
    { id: "lotus", name: "Lotus Bloom", kind: "mandala", regions: lotus() },
    { id: "compass", name: "Star Compass", kind: "mandala", regions: compass() },
    { id: "sun", name: "Sun Wheel", kind: "mandala", regions: sunWheel() },
    { id: "garden", name: "Bubble Garden", kind: "mandala", regions: garden() },
    { id: "snow", name: "Snowflake", kind: "mandala", regions: snowflake() },
    { id: "hearts", name: "Heart Bloom", kind: "mandala", regions: heartBloom() },
    { id: "kaleido", name: "Kaleidoscope", kind: "mandala", regions: kaleido() },
    { id: "spiral", name: "Spiral Swirl", kind: "mandala", regions: spiral() },
    { id: "gear", name: "Gear Rose", kind: "mandala", regions: gearRose() },
    { id: "lattice", name: "Diamond Lattice", kind: "mandala", regions: lattice() },
    { id: "paw", name: "Paw Parade", kind: "mandala", fresh: true, regions: pawParade() },
    { id: "starheart", name: "Star Hearts", kind: "mandala", fresh: true, regions: starHearts() },
    { id: "bloom", name: "Sweet Bloom", kind: "mandala", fresh: true, regions: sweetBloom() },
    { id: "cat", name: "Kitty", kind: "animal", regions: cat() },
    { id: "fish", name: "Fishy", kind: "animal", regions: fish() },
    { id: "owl", name: "Owl", kind: "animal", regions: owl() },
    { id: "butterfly", name: "Butterfly", kind: "animal", regions: butterfly() },
    { id: "turtle", name: "Turtle", kind: "animal", regions: turtle() },
    { id: "elephant", name: "Elephant", kind: "animal", regions: elephant() },
    { id: "bunny", name: "Bunny", kind: "animal", regions: bunny() },
    { id: "panda", name: "Panda", kind: "animal", regions: panda() },
    { id: "fox", name: "Fox", kind: "animal", regions: fox() },
    { id: "penguin", name: "Penguin", kind: "animal", regions: penguin() },
    { id: "unicorn", name: "Unicorn", kind: "animal", regions: unicorn() },
    { id: "hamster", name: "Hamster", kind: "animal", fresh: true, regions: hamster() },
    { id: "redpanda", name: "Red Panda", kind: "animal", fresh: true, regions: redpanda() },
    { id: "axolotl", name: "Axolotl", kind: "animal", fresh: true, regions: axolotl() },
    { id: "otter", name: "Otter", kind: "animal", fresh: true, regions: otter() },
    { id: "koala", name: "Koala", kind: "animal", fresh: true, regions: koala() },
    { id: "sloth", name: "Sloth", kind: "animal", fresh: true, regions: sloth() },
    { id: "frog", name: "Frog", kind: "animal", fresh: true, regions: frog() },
    { id: "duck", name: "Duck", kind: "animal", fresh: true, regions: duck() },
    { id: "puppy", name: "Puppy", kind: "animal", fresh: true, regions: puppy() },
    { id: "bear", name: "Bear", kind: "animal", fresh: true, regions: bear() },
    { id: "hedgehog", name: "Hedgehog", kind: "animal", fresh: true, regions: hedgehog() },
    { id: "seal", name: "Seal", kind: "animal", fresh: true, regions: seal() },
    { id: "chick", name: "Chick", kind: "animal", fresh: true, regions: chick() },
    { id: "piglet", name: "Piglet", kind: "animal", fresh: true, regions: piglet() },
    { id: "deer", name: "Deer", kind: "animal", fresh: true, regions: deer() },
    { id: "mouse", name: "Mouse", kind: "animal", fresh: true, regions: mouse() },
];
/* A printed page number is fixed: page n is always this drawing, and no drawing is on two pages. */
PAGES.forEach(function (page, index) { page.number = index + 1; });
window.CB_BOOK = PAGES.map(function (page) {
    return { number: page.number, id: page.id, name: page.name, kind: page.kind };
});
/* ---------------- canvas drawing ---------------- */
const pathCache = new Map();
function getPath(d, mirror) {
    const key = (mirror ? "m" : "n") + d;
    let p = pathCache.get(key);
    if (!p) {
        const base = new Path2D(d);
        if (mirror) {
            p = new Path2D();
            p.addPath(base, new DOMMatrix([-1, 0, 0, 1, 400, 0]));
        }
        else
            p = base;
        pathCache.set(key, p);
    }
    return p;
}
function regionColor(r, f) {
    if (f)
        return f;
    if (r.base === "ink")
        return INK;
    return r.base === "white" ? WHITE : PAPER;
}
function drawPage(ctx, page, fills, px, lw) {
    const s = px / 400;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = INK;
    const stroke = page.kind === "animal" ? lw * 2.2 : lw;
    page.regions.forEach((r, i) => {
        const path = getPath(r.d, !!r.m);
        ctx.lineWidth = stroke;
        if (r.line) {
            ctx.stroke(path);
            return;
        }
        ctx.save();
        if (r.clip)
            ctx.clip(getPath(r.clip, !!r.m));
        ctx.fillStyle = regionColor(r, fills[i] ?? null);
        ctx.fill(path);
        ctx.stroke(path);
        ctx.restore();
    });
}
let hitCtx = null;
function hitTest(page, x, y) {
    if (!hitCtx)
        hitCtx = document.createElement("canvas").getContext("2d");
    const c = hitCtx;
    if (!c)
        return -1;
    for (let i = page.regions.length - 1; i >= 0; i--) {
        const r = page.regions[i];
        if (r.line)
            continue;
        if (!c.isPointInPath(getPath(r.d, !!r.m), x, y))
            continue;
        if (r.clip && !c.isPointInPath(getPath(r.clip, !!r.m), x, y))
            continue;
        return i;
    }
    return -1;
}
function onCurve(d) {
    const toks = d.match(/[MmLlHhVvCcQqAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
    const pts = [];
    let i = 0, x = 0, y = 0, sx = 0, sy = 0;
    const n = () => parseFloat(toks[i++]);
    while (i < toks.length) {
        const t = toks[i++];
        if (t === "M" || t === "L") { x = n(); y = n(); pts.push([x, y]); if (t === "M") { sx = x; sy = y; } }
        else if (t === "m" || t === "l") { x += n(); y += n(); pts.push([x, y]); if (t === "m") { sx = x; sy = y; } }
        else if (t === "H") { x = n(); pts.push([x, y]); }
        else if (t === "h") { x += n(); pts.push([x, y]); }
        else if (t === "V") { y = n(); pts.push([x, y]); }
        else if (t === "v") { y += n(); pts.push([x, y]); }
        else if (t === "Q") { n(); n(); x = n(); y = n(); pts.push([x, y]); }
        else if (t === "q") { n(); n(); x += n(); y += n(); pts.push([x, y]); }
        else if (t === "C") { n(); n(); n(); n(); x = n(); y = n(); pts.push([x, y]); }
        else if (t === "c") { n(); n(); n(); n(); x += n(); y += n(); pts.push([x, y]); }
        else if (t === "A" || t === "a") {
            n(); n(); n(); n(); n();
            const ax = n(), ay = n();
            if (t === "a") { x += ax; y += ay; } else { x = ax; y = ay; }
            pts.push([x, y]);
        }
        else if (t === "Z" || t === "z") { x = sx; y = sy; }
    }
    return pts;
}
function pointInRegion(c, r, x, y) {
    if (x < 0 || y < 0 || x > 400 || y > 400) return false;
    if (!c.isPointInPath(getPath(r.d, !!r.m), x, y)) return false;
    if (r.clip && !c.isPointInPath(getPath(r.clip, !!r.m), x, y)) return false;
    return true;
}
/* A region is fillable when some point of its closed shape is the one a tap would color. */
function auditFillable() {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const probe = canvas.getContext("2d");
    if (!probe) return ["no-canvas"];
    const misses = [];
    const offsets = [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4], [7, 5], [-7, 5], [5, -7], [-6, -6], [10, 0], [0, 10], [-10, 0], [0, -10]];
    for (const page of PAGES) {
        page.regions.forEach((r, i) => {
            if (r.line) return;
            const pts = onCurve(r.d).map((p) => (r.m ? [400 - p[0], p[1]] : p));
            const cands = pts.slice();
            for (let k = 0; k + 1 < pts.length; k++)
                cands.push([(pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2]);
            if (pts.length) {
                let sx = 0, sy = 0;
                pts.forEach((p) => { sx += p[0]; sy += p[1]; });
                cands.push([sx / pts.length, sy / pts.length]);
            }
            let found = false;
            for (let k = 0; k < cands.length && !found; k++) {
                for (let o = 0; o < offsets.length; o++) {
                    const x = cands[k][0] + offsets[o][0];
                    const y = cands[k][1] + offsets[o][1];
                    if (!pointInRegion(probe, r, x, y)) continue;
                    if (hitTest(page, x, y) === i) { found = true; break; }
                }
            }
            if (!found) {
                probe.setTransform(1, 0, 0, 1, 0, 0);
                probe.clearRect(0, 0, 400, 400);
                probe.save();
                if (r.clip) probe.clip(getPath(r.clip, !!r.m));
                probe.fillStyle = "#000";
                probe.fill(getPath(r.d, !!r.m));
                probe.restore();
                const data = probe.getImageData(0, 0, 400, 400).data;
                for (let y = 0; y < 400 && !found; y += 2) {
                    for (let x = 0; x < 400; x += 2) {
                        if (data[(y * 400 + x) * 4 + 3] < 40) continue;
                        if (hitTest(page, x + 0.5, y + 0.5) === i) { found = true; break; }
                    }
                }
            }
            if (!found) misses.push(page.id + "#" + i + (r.g ? ":" + r.g : ""));
        });
    }
    return misses;
}

const SKINS = [
    { id: "pastel", label: "Calm Pastel", bg: [275, 60, 95], panel: [200, 70, 92], accent: [330, 65, 68] },
    { id: "forest", label: "Forest", bg: [135, 28, 86], panel: [120, 24, 78], accent: [145, 45, 32] },
    { id: "ocean", label: "Ocean", bg: [200, 65, 88], panel: [195, 55, 80], accent: [208, 75, 40] },
    { id: "night", label: "Night", bg: [235, 35, 14], panel: [235, 30, 22], accent: [265, 70, 72] },
    { id: "sunset", label: "Sunset", bg: [28, 90, 88], panel: [12, 80, 83], accent: [345, 70, 50] },
];
const BG_PRESETS = [[45, 70, 94], [200, 70, 93], [140, 40, 90], [330, 70, 94], [260, 50, 92], [0, 0, 96], [220, 30, 20], [0, 0, 10]];
function lookFromHsl(bg, panel, accent) {
    const dark = bg[2] < 50;
    const ink = dark ? [0, 0, 96] : [230, 20, 16];
    return {
        bg: hs(bg), panel: hs(panel), accent: hs(accent),
        onAccent: accent[2] < 62 ? hs([0, 0, 100]) : hs([230, 25, 14]),
        text: hs(ink), sub: hs(ink, 0.68), border: hs(ink, 0.18), chip: hs(ink, 0.07),
    };
}

window.CB_PAGES = PAGES;
window.CB_SWATCHES = SWATCHES;
window.CB_PAPER = PAPER;
window.CB_INK = INK;
window.CB_WHITE = WHITE;
window.CB_SKINS = SKINS;
window.CB_BG_PRESETS = BG_PRESETS.map(function (c) { return hx(c); });
window.CB_COLOR = { hslToHex: hslToHex, hexToHsl: hexToHsl, hx: hx, hs: hs, lookFromHsl: lookFromHsl };
window.CB_DRAW = { drawPage: drawPage, hitTest: hitTest, regionColor: regionColor, auditFillable: auditFillable };
})();
