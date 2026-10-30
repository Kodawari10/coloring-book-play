/* Coloring Book drawings: mandalas and kawaii animals.
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
function deco(list) {
    return list.map((v) => {
        const [k, x, y, s] = v;
        return R(k === "h" ? heart(x, y, s) : k === "s" ? spark(x, y, s) : starAt(x, y, 5, s, s * 0.5), { g: k === "h" ? "heart" : k === "s" ? "spark" : "star" });
    });
}
function omegaMouth(cx, cy, w) {
    return `M${cx - w} ${cy}C${cx - w * 0.55} ${cy + w * 0.9} ${cx - w * 0.2} ${cy + w * 0.9} ${cx} ${cy + w * 0.2}C${cx + w * 0.2} ${cy + w * 0.9} ${cx + w * 0.55} ${cy + w * 0.9} ${cx + w} ${cy}C${cx + w * 0.45} ${cy + w * 0.42} ${cx + w * 0.16} ${cy + w * 0.48} ${cx} ${cy + w * 0.32}C${cx - w * 0.16} ${cy + w * 0.48} ${cx - w * 0.45} ${cy + w * 0.42} ${cx - w} ${cy}Z`;
}
function face(y, dx, er, opt) {
    const cx = opt?.cx ?? 200;
    const o = [];
    for (const s of [-1, 1]) {
        const ex = cx + s * dx;
        o.push(R(E(ex + s * er * 0.95, y + er * 1.2, Math.max(16, er * 0.74), Math.max(12, er * 0.46)), { g: "blush" }));
        o.push(R(E(ex, y, er * 0.92, er), { base: "ink", g: "eye" }));
        o.push(R(Cc(ex + er * 0.28, y - er * 0.34, Math.max(9, er * 0.36)), { base: "white", g: "hl" }));
        o.push(R(Cc(ex - er * 0.22, y + er * 0.3, Math.max(7, er * 0.24)), { base: "white", g: "hl2" }));
    }
    const my = y + er * 1.7;
    if ((opt?.mouth ?? "w") !== "none")
        o.push(R(omegaMouth(cx, my, opt?.mouth === "smile" ? 20 : 17), { g: "mouth" }));
    o.push(L(`M${cx - 20} ${my + 16}q10 7 20 0q10 7 20 0`));
    return o;
}
function pointyEars() {
    return [
        ...pair("M124 146C102 64 128 36 152 44C174 52 180 108 172 146Z", { g: "ear" }),
        ...pair("M134 136C120 78 136 58 150 62C164 66 168 104 162 130Z", { g: "inEar" }),
    ];
}
function roundEars(x, y, r) {
    return [
        ...pair(Cc(x, y, r), { g: "ear" }),
        ...pair(Cc(x - 4, y - 6, Math.max(12, r * 0.46)), { g: "inEar" }),
    ];
}
function longEars() {
    return [
        ...pair(E(148, 78, 22, 62), { g: "ear" }),
        ...pair(E(148, 84, 11, 44), { g: "inEar" }),
    ];
}
function floppyEars() {
    return [
        ...pair("M156 150C108 162 72 214 102 246C138 272 176 214 166 152Z", { g: "ear" }),
        ...pair("M150 158C118 170 96 210 118 230C140 246 164 204 158 160Z", { g: "inEar" }),
    ];
}
/* Head is about three fifths of the little figure. Body, paws, and props stay chubby and closed. */
function chibi(p) {
    const o = [B(), R(p.ground || "M0 358Q200 338 400 358V400H0Z", { g: p.gg || "ground" })];
    o.push(...deco(p.deco || [["h", 46, 42, 13], ["s", 354, 48, 12], ["t", 32, 236, 11]]));
    if (p.back) o.push(...p.back);
    o.push(R(E(200, p.by || 308, p.brx || 56, p.bry || 40), { g: "body" }));
    o.push(R(E(200, (p.by || 308) + 8, (p.brx || 56) * 0.55, (p.bry || 40) * 0.62), { g: "belly" }));
    o.push(...pair(E(166, p.py || 350, 22, 13), { g: "paw" }));
    if (p.mid) o.push(...p.mid);
    o.push(R(E(200, 172, p.hrx || 108, p.hry || 80), { g: "head" }));
    if (p.front) o.push(...p.front);
    o.push(...face(p.fy || 156, p.dx || 40, p.er || 26, { mouth: p.mouth || "w" }));
    if (p.top) o.push(...p.top);
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
    return chibi({
        deco: [["h", 44, 40, 13], ["s", 356, 46, 12], ["t", 30, 230, 11], ["h", 364, 200, 10]],
        back: [R("M292 292C338 250 370 274 350 314C332 346 300 328 292 292Z", { g: "tail" })],
        front: [...pointyEars(), R(E(200, 186, 10, 7), { g: "nose" })],
        top: [...bow(268, 98), R(heart(78, 168, 10), { g: "heart" })],
    });
}
function fish() {
    const body = E(210, 196, 118, 96);
    return [
        B(), R("M0 352Q200 332 400 352V400H0Z", { g: "sand" }),
        ...deco([["h", 42, 44, 12], ["s", 356, 50, 12], ["t", 36, 300, 10]]),
        R(Cc(46, 110, 9), { g: "bub" }), R(Cc(338, 96, 8), { g: "bub" }), R(Cc(70, 64, 7), { g: "bub" }),
        R("M100 196C52 140 24 160 34 198C24 236 54 252 100 196Z", { g: "tail" }),
        R("M168 112C188 62 246 62 268 114Z", { g: "fin" }),
        R(body, { g: "body" }),
        R(E(214, 214, 62, 42), { g: "belly" }),
        R(heart(300, 168, 11), { g: "heart" }),
        ...face(176, 38, 26, { cx: 214, mouth: "smile" }),
    ];
}
function owl() {
    return chibi({
        deco: [["t", 48, 40, 12], ["s", 352, 44, 11], ["h", 36, 210, 10]],
        back: [
            R(Cc(336, 58, 26), { g: "moon" }),
            R("M40 70H360V98H40Z", { g: "branch" }),
            R(Cc(70, 78, 14), { g: "leaf" }),
        ],
        brx: 64, bry: 46,
        front: [
            ...pair("M132 120C112 52 136 28 154 36C172 44 176 96 168 124Z", { g: "tuft" }),
            R("M176 196Q200 226 224 196Q200 188 176 196Z", { g: "beak" }),
        ],
        mouth: "none",
        top: [R(heart(300, 150, 10), { g: "heart" })],
    });
}
function butterfly() {
    const up = "M196 168C150 48 36 52 52 140C64 196 140 188 196 180Z";
    const low = "M196 188C130 196 70 236 96 286C124 328 180 270 196 210Z";
    return [
        B(), R(Cc(348, 48, 20), { g: "sun" }), R("M0 360Q200 338 400 360V400H0Z", { g: "grass" }),
        ...flowerAt(48, 330, 11, true), ...deco([["s", 36, 48, 12], ["h", 360, 120, 11], ["t", 40, 200, 10]]),
        ...pair(up, { g: "up" }), ...pair(low, { g: "low" }),
        ...pair(heart(118, 118, 16), { clip: up, g: "spotA" }),
        ...pair(Cc(86, 108, 12), { clip: up, g: "spotB" }),
        ...pair(heart(130, 240, 14), { clip: low, g: "spotC" }),
        R(E(200, 248, 22, 46), { g: "body" }),
        R(E(200, 150, 78, 64), { g: "head" }),
        ...face(142, 28, 20, { mouth: "smile" }),
        ...bow(246, 96),
    ];
}
function turtle() {
    const shell = E(200, 312, 78, 48);
    return chibi({
        gg: "sand",
        deco: [["h", 46, 42, 12], ["s", 352, 48, 11], ["t", 34, 200, 10]],
        back: [R(Cc(58, 58, 22), { g: "sun" }), R(shell, { g: "shell" })],
        brx: 70, bry: 36, by: 318,
        front: [
            R(hex(168, 300, 16), { clip: shell, g: "plate" }),
            R(hex(232, 300, 16), { clip: shell, g: "plate" }),
            R(hex(200, 328, 16), { clip: shell, g: "plate" }),
            R("M200 118C206 86 236 78 248 90C228 112 210 120 200 118Z", { g: "leaf" }),
        ],
        mouth: "smile",
        top: [R(heart(78, 150, 10), { g: "heart" })],
    });
}
function elephant() {
    const hat = "M200 46C188 78 168 108 156 128Q200 142 244 128C232 108 212 78 200 46Z";
    return chibi({
        deco: [["h", 42, 40, 12], ["t", 356, 46, 12], ["s", 32, 220, 10]],
        front: [
            ...pair(E(92, 164, 46, 40), { g: "ear" }),
            ...pair(E(86, 162, 26, 22), { g: "inEar" }),
            R("M190 198C186 236 178 262 168 270C160 278 174 280 184 266C192 240 196 220 200 202C204 220 208 240 216 266C226 280 240 278 232 270C222 262 214 236 210 198Z", { g: "trunk" }),
        ],
        mouth: "smile",
        top: [R(hat, { g: "hat" }), R(Cc(200, 46, 12), { g: "pom" }), R(heart(300, 150, 10), { g: "heart" })],
    });
}
function bunny() {
    return chibi({
        deco: [["h", 42, 40, 13], ["s", 356, 50, 12], ["t", 30, 220, 10]],
        back: [R(Cc(292, 300, 16), { g: "tail" }), R("M332 340L348 292C352 282 368 286 364 298L348 346Z", { g: "carrot" })],
        front: [...longEars(), R(E(200, 188, 8, 6), { g: "nose" })],
        top: [...flowerAt(286, 70, 10, false), ...bow(250, 118)],
    });
}
function panda() {
    return chibi({
        deco: [["h", 42, 40, 12], ["s", 356, 48, 12], ["t", 32, 220, 10]],
        back: [
            R("M332 390V250C332 240 350 240 350 250V390Z", { g: "bamboo" }),
            R("M350 262C366 242 388 246 392 256C378 274 358 274 350 262Z", { g: "bleaf" }),
        ],
        front: [
            ...roundEars(102, 108, 30),
            ...pair(E(158, 158, 36, 32), { g: "patch" }),
            R(E(200, 190, 12, 8), { g: "nose" }),
        ],
    });
}
function fox() {
    return chibi({
        deco: [["h", 42, 40, 12], ["s", 356, 46, 12], ["t", 30, 214, 10]],
        back: [R("M286 300C340 292 368 236 338 214C314 198 286 230 300 258C312 282 300 300 286 300Z", { g: "tail" }), R(E(338, 214, 18, 14), { g: "tailTip" })],
        front: [
            ...pointyEars(),
            R("M118 186C140 228 170 224 200 214C230 224 260 228 282 186C272 236 240 246 200 244C160 246 128 236 118 186Z", { g: "mask" }),
            R(E(200, 196, 10, 7), { g: "nose" }),
        ],
        mouth: "none",
    });
}
function penguin() {
    return chibi({
        gg: "ice",
        deco: [["s", 42, 40, 13], ["s", 356, 52, 12], ["h", 36, 200, 10]],
        brx: 62, bry: 46,
        front: [
            ...pair(E(124, 300, 18, 28), { g: "wing" }),
            R(E(200, 198, 18, 12), { g: "beak" }),
        ],
        mouth: "none",
        top: [
            R("M150 120C158 68 242 68 250 120Q200 106 150 120Z", { g: "hat" }),
            R(Cc(200, 66, 13), { g: "pom" }),
            R(heart(300, 150, 10), { g: "heart" }),
        ],
    });
}
function unicorn() {
    const horn = "M200 18C194 48 184 86 178 112Q200 122 222 112C216 86 206 48 200 18Z";
    return chibi({
        deco: [["t", 42, 40, 12], ["h", 356, 44, 12], ["s", 32, 220, 10], ["h", 364, 190, 10]],
        back: [...pair(Cc(108, 200, 20), { g: "maneA" }), ...pair(Cc(116, 240, 16), { g: "maneB" })],
        front: [...pointyEars(), R(horn, { g: "horn" })],
        top: [R(Cc(168, 108, 16), { g: "maneA" }), R(Cc(232, 108, 16), { g: "maneB" }), R(heart(300, 150, 10), { g: "heart" }), ...bow(268, 130)],
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
function hamster() {
    return chibi({
        deco: [["h", 42, 40, 12], ["s", 356, 48, 12], ["t", 32, 220, 10]],
        back: [R(E(300, 250, 16, 11), { g: "seed" })],
        brx: 64, bry: 44,
        front: [...roundEars(104, 112, 28), ...pair(E(142, 196, 20, 14), { g: "cheek" }), R(E(200, 190, 12, 8), { g: "nose" })],
        top: [R(heart(300, 140, 10), { g: "heart" })],
    });
}
function redpanda() {
    const tail = "M284 306C340 300 372 240 340 214C314 196 284 230 302 260C316 286 302 308 284 306Z";
    return chibi({
        deco: [["h", 42, 40, 12], ["s", 356, 48, 11], ["t", 30, 214, 10]],
        back: [R(tail, { g: "tail" }), R(E(330, 246, 18, 12), { clip: tail, g: "ring" }), R(E(318, 286, 16, 11), { clip: tail, g: "ring" })],
        front: [
            ...pointyEars(),
            R("M120 188C142 230 170 222 200 212C230 222 258 230 280 188C270 236 238 246 200 244C162 246 130 236 120 188Z", { g: "mask" }),
            R(E(200, 196, 10, 7), { g: "nose" }),
        ],
        mouth: "smile",
    });
}
function axolotl() {
    return chibi({
        gg: "water",
        ground: "M0 348Q200 328 400 348V400H0Z",
        deco: [["s", 44, 42, 12], ["h", 354, 50, 11], ["t", 34, 250, 10]],
        back: [R(Cc(52, 90, 8), { g: "bub" }), R(Cc(344, 86, 7), { g: "bub" })],
        front: [
            ...pair(E(70, 130, 16, 22), { g: "gill" }),
            ...pair(E(60, 166, 18, 18), { g: "gill" }),
            ...pair(E(72, 202, 16, 16), { g: "gill" }),
        ],
        mouth: "smile",
        top: [R(heart(300, 120, 10), { g: "heart" })],
    });
}
function otter() {
    return chibi({
        gg: "water",
        ground: "M0 352Q200 332 400 352V400H0Z",
        deco: [["h", 42, 40, 12], ["s", 354, 48, 12], ["t", 32, 210, 10]],
        back: [R("M286 300C330 280 362 310 344 336C322 356 292 332 286 304Z", { g: "tail" })],
        front: [...roundEars(100, 112, 24), R(E(200, 190, 11, 8), { g: "nose" })],
        top: [R(Cc(318, 150, 18), { g: "shell" }), R(heart(318, 148, 8), { g: "heart" })],
    });
}
function koala() {
    return chibi({
        deco: [["h", 42, 40, 12], ["s", 300, 46, 11], ["t", 32, 220, 10]],
        back: [R("M318 360C310 292 330 240 342 238C356 236 362 274 352 324C366 286 378 278 382 300C386 338 360 370 318 360Z", { g: "branch" })],
        front: [...roundEars(96, 108, 36), R(E(200, 196, 22, 16), { g: "nose" })],
        mouth: "smile",
    });
}
function sloth() {
    return chibi({
        deco: [["h", 44, 150, 11], ["s", 354, 150, 11], ["t", 40, 250, 10]],
        back: [R("M36 62H364V94H36Z", { g: "branch" }), R(Cc(64, 74, 14), { g: "leaf" }), R(Cc(336, 70, 12), { g: "leaf" })],
        mid: [R(E(78, 150, 16, 40), { g: "arm" }), R(E(322, 150, 16, 40), { g: "arm" })],
        front: [...pair(E(150, 164, 30, 22), { g: "mask" })],
        mouth: "smile",
    });
}
function frog() {
    return chibi({
        gg: "pond",
        ground: "M0 348Q200 328 400 348V400H0Z",
        deco: [["h", 42, 42, 11], ["s", 356, 46, 12], ["t", 32, 230, 10]],
        back: [R(E(200, 330, 120, 28), { g: "pad" })],
        fy: 132, dx: 46, er: 24,
        mouth: "smile",
        top: [R(heart(78, 140, 10), { g: "heart" })],
    });
}
function duck() {
    return chibi({
        deco: [["h", 42, 40, 12], ["s", 356, 48, 11], ["t", 30, 210, 10]],
        front: [R(E(292, 292, 22, 28), { g: "wing" }), R(E(200, 206, 28, 14), { g: "bill" })],
        mouth: "none",
        top: [...bow(250, 108)],
    });
}
function puppy() {
    return chibi({
        deco: [["h", 42, 40, 13], ["s", 356, 48, 12], ["t", 30, 214, 10]],
        back: [R(Cc(300, 286, 16), { g: "tail" })],
        front: [...floppyEars(), R("M156 128H244V148H156Z", { g: "collar" }), R(Cc(236, 122, 9), { g: "tag" }), R(E(200, 190, 12, 8), { g: "nose" })],
    });
}
function bear() {
    return chibi({
        deco: [["h", 42, 40, 12], ["s", 356, 48, 12], ["t", 30, 220, 10]],
        mid: [R(E(112, 300, 22, 26), { g: "arm" }), R(E(288, 300, 22, 26), { g: "arm" })],
        front: [...roundEars(100, 108, 32), R(E(200, 198, 26, 16), { g: "snout" }), R(E(200, 194, 10, 7), { g: "nose" })],
        mouth: "smile",
        top: [...bow(262, 100)],
    });
}
function hedgehog() {
    const spikes = [];
    for (let i = 0; i < 9; i++) {
        const a = Math.PI * 1.12 + (i * Math.PI * 0.76) / 8;
        const x1 = 200 + Math.cos(a) * 78;
        const y1 = 168 + Math.sin(a) * 58;
        const x2 = 200 + Math.cos(a - 0.14) * 138;
        const y2 = 168 + Math.sin(a - 0.14) * 112;
        const x3 = 200 + Math.cos(a + 0.14) * 138;
        const y3 = 168 + Math.sin(a + 0.14) * 112;
        spikes.push(R(`M${fx(x1)} ${fx(y1)}L${fx(x2)} ${fx(y2)}L${fx(x3)} ${fx(y3)}Z`, { g: "spike" }));
    }
    return chibi({
        deco: [["h", 40, 40, 11], ["s", 358, 46, 11]],
        back: spikes,
        hrx: 96, hry: 72,
        front: [...roundEars(118, 118, 16), R(E(200, 188, 10, 7), { g: "nose" })],
        mouth: "smile",
    });
}
function seal() {
    return chibi({
        gg: "water",
        ground: "M0 346Q200 326 400 346V400H0Z",
        deco: [["s", 42, 42, 12], ["h", 354, 48, 11], ["t", 32, 220, 10]],
        back: [R(E(78, 330, 36, 14), { g: "flipper" }), R(E(322, 330, 36, 14), { g: "flipper" })],
        brx: 70, bry: 40,
        front: [R(E(200, 192, 12, 8), { g: "nose" })],
        mouth: "smile",
        top: [R(Cc(318, 130, 22), { g: "ball" }), R(starAt(318, 130, 5, 12, 5), { g: "star" })],
    });
}
function chick() {
    return chibi({
        deco: [["s", 42, 42, 12], ["h", 356, 48, 11], ["t", 32, 210, 10]],
        back: [R("M150 372C150 318 250 318 250 372Z", { g: "shell" })],
        mid: [R(E(128, 300, 20, 14), { g: "wing" }), R(E(272, 300, 20, 14), { g: "wing" })],
        front: [R(E(200, 204, 20, 12), { g: "beak" })],
        mouth: "none",
        top: [R(heart(78, 140, 10), { g: "heart" })],
    });
}
function piglet() {
    return chibi({
        deco: [["h", 42, 40, 12], ["s", 356, 48, 12], ["t", 30, 214, 10]],
        back: [R("M286 286C318 266 348 288 336 312C358 304 360 336 332 342C304 350 284 316 286 286Z", { g: "tail" })],
        front: [
            ...pair("M138 130C122 86 138 64 154 72C168 80 172 112 164 132Z", { g: "ear" }),
            R(E(200, 200, 24, 16), { g: "snout" }),
            ...pair(E(192, 200, 6, 7), { g: "nostril" }),
        ],
        mouth: "smile",
    });
}
function deer() {
    return chibi({
        deco: [["h", 44, 150, 11], ["s", 354, 140, 11], ["t", 32, 230, 10]],
        front: [
            ...pair("M146 118C116 62 132 30 150 38C166 46 172 80 164 116Z", { g: "antler" }),
            ...pair(Cc(128, 52, 10), { g: "tine" }),
            ...pair(E(150, 120, 16, 28), { g: "ear" }),
            R(E(200, 192, 10, 7), { g: "nose" }),
        ],
        top: [...pair(Cc(176, 300, 10), { g: "spot" }), R(heart(78, 168, 9), { g: "heart" })],
        mouth: "smile",
    });
}
function mouse() {
    return chibi({
        deco: [["h", 42, 42, 11], ["t", 32, 210, 10]],
        back: [
            R("M268 292C304 274 336 220 314 190C292 210 278 256 262 286Z", { g: "tail" }),
            R(Cc(332, 168, 28), { g: "cheese" }),
        ],
        front: [...roundEars(108, 118, 40), R(E(200, 190, 10, 7), { g: "nose" })],
        top: [R(Cc(322, 158, 9), { g: "hole" }), R(Cc(344, 176, 8), { g: "hole" })],
        mouth: "smile",
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
