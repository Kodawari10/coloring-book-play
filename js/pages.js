/* Coloring Book drawings: ten mandalas and eleven kawaii animals.
   Each region is a fillable path in a 400 by 400 picture. A region with `m`
   is the same shape mirrored across the middle. `line` is a stroke (whiskers,
   a smile). `base` keeps eyes ink-dark and sparkles white until you color them. */
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
    ringSegs(o, 20, 40, 8, 0, "r4a", "r4b");
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
    const o = [{ d: BG, g: "bg" }, ring(190, "a")];
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
function deco(list) {
    return list.map((v) => {
        const [k, x, y, s] = v;
        return R(k === "h" ? heart(x, y, s) : k === "s" ? spark(x, y, s) : starAt(x, y, 5, s, s * 0.5), { g: k === "h" ? "heart" : k === "s" ? "spark" : "star" });
    });
}
function face(y, dx, er, opt) {
    const cx = opt?.cx ?? 200;
    const o = [];
    for (const s of [-1, 1]) {
        const ex = cx + s * dx;
        o.push(R(E(ex + s * er * 0.55, y + er * 1.55, er * 0.85, er * 0.5), { g: "blush" }));
        o.push(R(E(ex, y, er * 0.86, er), { base: "ink", g: "eye" }));
        o.push(R(Cc(ex + er * 0.3, y - er * 0.38, er * 0.36), { base: "white", g: "hl" }));
        o.push(R(Cc(ex - er * 0.32, y + er * 0.4, er * 0.16), { base: "white", g: "hl2" }));
    }
    const my = y + er * 1.25;
    const m = opt?.mouth ?? "w";
    if (m === "w")
        o.push(L(`M${cx - 11} ${my}q5.5 7 11 0q5.5 7 11 0`));
    else if (m === "smile")
        o.push(L(`M${cx - 12} ${my}q12 12 24 0`));
    return o;
}
function flowerAt(cx, cy, pr, stem) {
    const r = stem ? [L(`M${cx} ${cy + pr}V385`)] : [];
    for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 5;
        r.push(R(Cc(cx + pr * 1.2 * Math.cos(a), cy + pr * 1.2 * Math.sin(a), pr), { g: "fpetal" }));
    }
    r.push(R(Cc(cx, cy, pr * 0.8), { g: "fcore" }));
    return r;
}
function bow(x, y) {
    return [
        R(`M${x} ${y}C${x - 14} ${y - 26} ${x - 36} ${y - 16} ${x - 30} ${y}C${x - 36} ${y + 16} ${x - 14} ${y + 26} ${x} ${y}Z`, { g: "bow" }),
        R(`M${x} ${y}C${x + 14} ${y - 26} ${x + 36} ${y - 16} ${x + 30} ${y}C${x + 36} ${y + 16} ${x + 14} ${y + 26} ${x} ${y}Z`, { g: "bow" }),
        R(Cc(x, y, 8), { g: "knot" }),
    ];
}
const B = () => R(BG, { g: "bg" });
function cat() {
    return [
        B(), R("M0 345Q200 325 400 345V400H0Z", { g: "ground" }),
        ...deco([["h", 55, 60, 14], ["s", 345, 55, 14], ["t", 40, 230, 11], ["h", 362, 222, 10], ["s", 70, 300, 9]]),
        R("M262 322C335 324 352 262 330 236C320 224 302 232 308 248C318 276 302 300 262 300Z", { g: "tail" }),
        R(E(200, 318, 72, 52), { g: "body" }), R(E(200, 328, 40, 30), { g: "belly" }),
        ...pair(E(170, 362, 21, 13), { g: "paw" }),
        ...pair("M112 140C104 92 112 62 130 62C146 62 166 86 180 108Z", { g: "ear" }),
        ...pair("M126 122C122 96 126 80 134 80C142 80 152 94 160 106Z", { g: "inEar" }),
        R(E(200, 178, 108, 88), { g: "head" }),
        R("M184 90Q200 124 216 90Z", { clip: E(200, 178, 108, 88), g: "stripe" }),
        R(E(200, 201, 6, 4.5), { g: "nose" }),
        L("M100 198L68 190M100 210L70 218M300 198L332 190M300 210L330 218"),
        ...face(182, 46, 21),
        ...bow(262, 104),
    ];
}
function fish() {
    const body = E(205, 200, 120, 100);
    return [
        B(), R("M0 352Q100 334 200 352T400 348V400H0Z", { g: "sand" }),
        ...pair("M56 354C40 310 70 290 58 250C50 220 70 200 80 215C90 240 72 270 86 300C96 324 84 340 80 354Z", { g: "weed" }),
        ...deco([["h", 330, 64, 12], ["h", 356, 36, 8], ["s", 60, 64, 12], ["t", 250, 376, 14], ["s", 150, 372, 8]]),
        R(Cc(362, 110, 8), { g: "bub" }), R(Cc(40, 130, 7), { g: "bub" }), R(Cc(110, 30, 6), { g: "bub" }),
        R("M98 200C50 130 18 150 32 200C18 250 50 270 98 200Z", { g: "tail" }),
        R("M150 112C170 52 240 52 262 110Z", { g: "fin" }),
        R("M180 294C186 336 226 336 236 292Z", { g: "fin" }),
        R(body, { g: "body" }),
        R("M268 96Q290 200 268 304L300 304Q322 200 300 96Z", { clip: body, g: "stripe" }),
        R("M108 96Q128 200 108 304L134 304Q154 200 134 96Z", { clip: body, g: "stripe" }),
        R("M150 252C126 262 126 290 150 292C168 292 172 270 162 254Z", { g: "sfin" }),
        ...face(192, 42, 22, { cx: 205 }),
    ];
}
function owl() {
    const belly = E(200, 278, 62, 58);
    const o = [
        B(), R(Cc(340, 62, 32), { g: "moon" }),
        ...deco([["t", 58, 58, 13], ["s", 120, 36, 9], ["t", 370, 160, 10], ["s", 36, 180, 10], ["h", 362, 252, 10]]),
        ...pair("M118 130C100 90 108 62 124 66C140 70 156 92 168 108Z", { g: "tuft" }),
        R(E(200, 222, 105, 122), { g: "body" }),
        ...pair(E(102, 238, 26, 52), { g: "wing" }),
        R(belly, { g: "belly" }),
    ];
    [248, 270, 292, 314].forEach((y, row) => {
        for (let x = 146 + (row % 2) * 12; x < 250; x += 24)
            o.push(R(`M${x} ${y}q12 16 24 0q-12 6 -24 0Z`, { clip: belly, g: "feather" }));
    });
    o.push(R("M0 340Q200 318 400 346L400 366Q200 340 0 360Z", { g: "branch" }), R("M56 342C66 312 96 310 104 320C94 344 70 348 56 342Z", { g: "leaf" }), R("M330 356C340 326 370 324 378 334C368 358 344 362 330 356Z", { g: "leaf" }), ...pair(E(176, 340, 17, 9), { g: "foot" }), ...pair(Cc(158, 172, 44), { g: "disc" }), R("M188 206Q200 228 212 206Q200 198 188 206Z", { g: "beak" }), ...face(172, 42, 24, { mouth: "none" }));
    return o;
}
function butterfly() {
    const up = "M196 200C150 70 40 66 56 150C66 204 140 214 196 212Z";
    const low = "M196 222C132 222 72 262 98 308C124 346 184 308 196 244Z";
    return [
        B(), R(Cc(352, 46, 22), { g: "sun" }), R("M0 362Q200 336 400 362V400H0Z", { g: "grass" }),
        ...flowerAt(46, 332, 9, true), ...flowerAt(354, 326, 9, true),
        ...deco([["s", 40, 56, 12], ["h", 200, 378, 10], ["t", 376, 130, 9], ["s", 24, 230, 8]]),
        ...pair(up, { g: "up" }), ...pair(low, { g: "low" }),
        ...pair(heart(120, 142, 24), { clip: up, g: "spotA" }),
        ...pair(Cc(82, 122, 10), { clip: up, g: "spotB" }), ...pair(Cc(152, 188, 9), { clip: up, g: "spotB" }),
        ...pair(heart(138, 272, 18), { clip: low, g: "spotC" }), ...pair(Cc(108, 302, 8), { clip: low, g: "spotB" }),
        R(E(200, 262, 17, 58), { g: "body" }),
        L("M186 240Q200 246 214 240M186 265Q200 271 214 265M188 290Q200 296 212 290"),
        L("M186 130Q176 92 160 80M214 130Q224 92 240 80"),
        ...pair(heart(160, 76, 9), { g: "tip" }),
        R(Cc(200, 168, 44), { g: "head" }),
        ...face(166, 18, 11),
    ];
}
function turtle() {
    const shell = E(200, 285, 122, 82);
    const plates = [[118, 275, 26], [282, 275, 26], [150, 232, 24], [250, 232, 24], [140, 324, 22], [260, 324, 22]];
    return [
        B(), R(Cc(64, 64, 28), { g: "sun" }),
        R("M262 72C258 54 280 46 292 56C300 40 326 44 328 62C344 62 348 82 334 86H268C254 86 252 74 262 72Z", { g: "cloud" }),
        R("M0 330Q200 314 400 330V400H0Z", { g: "sand" }),
        ...deco([["t", 48, 362, 18], ["h", 356, 366, 12], ["s", 348, 140, 12], ["s", 48, 150, 9], ["h", 120, 110, 8]]),
        ...pair(E(112, 352, 26, 17), { g: "leg" }),
        R(shell, { g: "shell" }),
        ...plates.map((p) => R(hex(p[0], p[1], p[2]), { clip: shell, g: "plate" })),
        R(E(200, 302, 62, 48), { g: "tummy" }),
        ...pair(E(84, 262, 22, 15), { g: "arm" }),
        R(E(200, 160, 86, 74), { g: "head" }),
        L("M200 90Q192 76 194 66"),
        R("M200 90C204 62 230 54 248 62C236 86 214 94 200 90Z", { g: "leaf" }),
        ...face(165, 40, 19, { mouth: "smile" }),
    ];
}
function elephant() {
    const hat = "M200 36C190 60 178 86 170 102Q200 114 230 102C222 86 210 60 200 36Z";
    return [
        B(), ...deco([["h", 50, 60, 13], ["t", 350, 64, 12], ["s", 340, 150, 9], ["s", 60, 150, 9], ["h", 362, 300, 10], ["t", 40, 300, 9]]),
        R("M0 348H400V400H0Z", { g: "ground" }),
        R(E(200, 312, 74, 54), { g: "body" }),
        ...pair(E(166, 356, 22, 14), { g: "foot" }),
        ...pair(E(158, 362, 5, 3.5), { g: "nail" }), ...pair(E(174, 362, 5, 3.5), { g: "nail" }),
        ...pair(E(98, 172, 62, 70), { g: "ear" }), ...pair(E(102, 175, 40, 48), { g: "inEar" }),
        R(E(200, 175, 96, 86), { g: "head" }),
        R("M212 205C214 246 208 270 184 272C168 273 166 254 180 253C192 252 190 236 188 205Z", { g: "trunk" }),
        R(hat, { g: "hat" }), R("M176 80H224V92H176Z", { clip: hat, g: "hatBand" }), R(Cc(200, 36, 10), { g: "pom" }),
        ...face(165, 46, 18, { mouth: "none" }),
    ];
}
function bunny() {
    return [
        B(), R("M0 348Q200 328 400 348V400H0Z", { g: "ground" }),
        ...deco([["h", 54, 64, 13], ["s", 352, 150, 12], ["t", 40, 222, 10], ["h", 362, 222, 10]]),
        R("M320 374L340 314C344 302 362 306 360 318L340 378Z", { g: "carrot" }), R("M350 308C346 292 352 284 360 288C366 294 362 304 354 310Z", { g: "leaves" }),
        R(Cc(270, 322, 17), { g: "tail" }),
        R(E(200, 318, 70, 52), { g: "body" }), R(E(200, 328, 38, 30), { g: "belly" }),
        ...pair(E(168, 362, 24, 13), { g: "foot" }),
        ...pair(E(158, 84, 24, 64), { g: "ear" }), ...pair(E(158, 90, 12, 46), { g: "inEar" }),
        R(E(200, 182, 98, 84), { g: "head" }),
        R(heart(200, 203, 6), { g: "nose" }),
        ...face(186, 44, 20),
        ...flowerAt(256, 52, 7, false),
    ];
}
function panda() {
    return [
        B(), R("M0 350H400V400H0Z", { g: "ground" }),
        ...deco([["h", 50, 60, 12], ["s", 360, 60, 12], ["t", 44, 210, 10], ["s", 60, 300, 8]]),
        R("M326 400V250C326 242 342 242 342 250V400Z", { g: "bamboo" }), L("M326 300H342M326 350H342"),
        R("M342 262C356 244 376 246 384 252C372 268 354 270 342 262Z", { g: "bleaf" }),
        R(E(200, 318, 74, 54), { g: "body" }), R(E(200, 330, 40, 30), { g: "belly" }),
        ...pair(E(138, 306, 22, 32), { g: "arm" }), ...pair(E(166, 362, 24, 14), { g: "foot" }),
        ...pair(Cc(122, 104, 30), { g: "ear" }),
        R(E(200, 178, 104, 86), { g: "head" }),
        ...pair(E(156, 182, 30, 36), { g: "patch" }),
        R(E(200, 199, 9, 6), { g: "nose" }),
        ...face(182, 44, 20),
    ];
}
function fox() {
    const head = E(200, 182, 104, 82);
    const tail = "M260 336C344 338 366 258 326 222C306 206 284 230 300 256C314 282 300 306 260 310Z";
    const cap = "M36 354C36 318 96 318 96 354Z";
    return [
        B(), R("M0 350Q200 330 400 350V400H0Z", { g: "ground" }),
        ...deco([["h", 56, 62, 13], ["s", 350, 60, 12], ["t", 44, 230, 10], ["s", 362, 180, 9]]),
        R("M58 352H74V376C74 382 58 382 58 376Z", { g: "stem" }), R(cap, { g: "cap" }),
        R(Cc(54, 340, 6), { clip: cap, g: "capDot" }), R(Cc(76, 332, 6), { clip: cap, g: "capDot" }),
        R(tail, { g: "tail" }), R(E(330, 226, 26, 20), { clip: tail, g: "tailTip" }),
        R(E(200, 320, 68, 52), { g: "body" }), R(E(200, 322, 36, 34), { g: "bib" }),
        ...pair(E(170, 362, 20, 13), { g: "paw" }),
        ...pair("M114 150C100 104 106 66 124 62C144 58 166 92 178 116Z", { g: "ear" }),
        ...pair("M126 132C118 104 122 82 130 80C140 78 152 98 160 114Z", { g: "inEar" }),
        R(head, { g: "head" }),
        R("M100 190C130 232 170 222 200 214C230 222 270 232 300 190C290 252 250 266 200 266C150 266 110 252 100 190Z", { clip: head, g: "mask" }),
        R(E(200, 214, 9, 6), { base: "ink", g: "nose" }),
        ...face(178, 44, 20, { mouth: "none" }),
        L("M200 220V227M188 228q6 6 12 0q6 6 12 0"),
    ];
}
function penguin() {
    const body = E(200, 215, 110, 132);
    return [
        B(), R("M0 345Q200 330 400 345V400H0Z", { g: "ice" }),
        ...deco([["s", 50, 60, 14], ["s", 350, 70, 12], ["s", 40, 200, 9], ["s", 365, 210, 10], ["h", 340, 140, 9], ["t", 60, 300, 9]]),
        ...pair(E(166, 348, 28, 12), { g: "foot" }),
        R(body, { g: "body" }),
        R("M200 120C146 120 124 162 136 204C118 254 140 326 200 334C260 326 282 254 264 204C276 162 254 120 200 120Z", { clip: body, g: "tummy" }),
        ...pair(E(98, 236, 20, 50), { g: "wing" }),
        R("M110 130C120 62 280 62 290 130Q200 108 110 130Z", { clip: body, g: "hat" }),
        R(Cc(200, 84, 14), { g: "pom" }),
        R("M118 250Q200 284 282 250L284 268Q200 302 116 268Z", { clip: body, g: "scarf" }),
        R("M236 274C244 296 252 312 256 322C246 330 236 330 226 324C226 306 224 290 222 278Z", { g: "scarf" }),
        R(E(200, 206, 15, 9), { g: "beak" }),
        ...face(180, 40, 17, { mouth: "none" }),
    ];
}
function unicorn() {
    const horn = "M200 28C194 50 184 80 180 104Q200 112 220 104C216 80 206 50 200 28Z";
    return [
        B(), R("M0 350Q200 330 400 350V400H0Z", { g: "ground" }),
        ...deco([["t", 50, 56, 13], ["h", 350, 56, 13], ["s", 34, 300, 11], ["s", 366, 300, 11], ["t", 340, 130, 8], ["h", 60, 130, 8]]),
        R(E(200, 318, 70, 52), { g: "body" }),
        ...pair(E(168, 360, 18, 13), { g: "hoof" }),
        ...pair(Cc(110, 160, 26), { g: "maneA" }), ...pair(Cc(104, 204, 24), { g: "maneB" }), ...pair(Cc(116, 244, 20), { g: "maneC" }),
        ...pair("M126 132C116 98 124 74 138 74C150 74 160 96 168 112Z", { g: "ear" }),
        R(E(200, 184, 96, 82), { g: "head" }),
        R(Cc(176, 108, 18), { g: "maneA" }), R(Cc(224, 108, 18), { g: "maneB" }),
        R(horn, { g: "horn" }),
        R("M192 64L210 56L212 62L194 70Z", { clip: horn, g: "hornStripe" }),
        R("M186 82L214 72L216 80L188 90Z", { clip: horn, g: "hornStripe" }),
        R("M182 98L218 86L220 96L184 108Z", { clip: horn, g: "hornStripe" }),
        ...face(190, 42, 20),
    ];
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
];
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
    page.regions.forEach((r, i) => {
        const path = getPath(r.d, !!r.m);
        ctx.lineWidth = lw;
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
window.CB_DRAW = { drawPage: drawPage, hitTest: hitTest, regionColor: regionColor };
})();
