/* Coloring Book desk: cover, gallery, paper page, crayon tin, sounds, backup. */
(function () {
  'use strict';
  const PAGES = window.CB_PAGES;
  const DRAW = window.CB_DRAW;
  const COL = window.CB_COLOR;
  const KEY = 'coloring-book-v1';
  const BACKUP_APP = 'coloring-book-backup';

  const $ = (s) => document.querySelector(s);
  const sheet = $('#sheet');
  const canvas = $('#pageCanvas');
  const facing = $('#facing');
  const facingCanvas = $('#facingCanvas');
  const contentsPage = $('#contentsPage');
  const backPage = $('#backPage');
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = load() || {
    v: 1,
    pageId: PAGES[0].id,
    filter: 'all',
    fills: {},
    recent: [],
    theme: 'pastel',
    customBg: null,
    volume: 0.6,
    layer: true,
    sfx: false,
    sfxVolume: 0.35,
    tuning: '432',
    tool: 'fill',
    hsl: [200, 80, 55],
    minted: {},
    leaf: 0,
  };
  const hist = {};
  let engine = null;
  const playing = new Set();
  let toastTimer = 0;

  function clampVol(n, fallback) {
    return typeof n === 'number' && n >= 0 && n <= 1 ? n : fallback;
  }
  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (!v || v.v !== 1) return null;
      v.sfx = v.sfx === true;
      v.sfxVolume = clampVol(v.sfxVolume, 0.35);
      v.tuning = v.tuning === '528' ? '528' : '432';
      if (v.filter !== 'all' && v.filter !== 'mandala' && v.filter !== 'animal' && v.filter !== 'new') v.filter = 'all';
      if (typeof v.leaf !== 'number' || v.leaf < 0 || v.leaf > PAGES.length + 1) v.leaf = 0;
      if (Array.isArray(v.sounds) && window.CB_migrateSoundId) {
        v.sounds = v.sounds.map((id) => window.CB_migrateSoundId(id)).filter(Boolean);
      }
      return v;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('This browser could not save the page.'); }
  }
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
  }
  function pageById(id) { return PAGES.find((p) => p.id === id) || PAGES[0]; }
  function emptyFills(page) { return page.regions.map(() => null); }
  function fillsOf(page) {
    const saved = state.fills[page.id];
    const base = emptyFills(page);
    if (!saved) return base;
    for (let i = 0; i < base.length; i++) base[i] = saved[i] || null;
    return base;
  }
  function colorHex() { return COL.hslToHex(state.hsl[0], state.hsl[1], state.hsl[2]); }
  function shownPages() {
    if (state.filter === 'new') return PAGES.filter((p) => p.fresh);
    return PAGES.filter((p) => state.filter === 'all' || p.kind === state.filter);
  }
  /* The book order never follows the contents filter. Page n is PAGES[n - 1]. */
  function folioAt(index) {
    if (index <= 0) return { type: 'contents' };
    if (index > PAGES.length) return { type: 'back' };
    const drawing = PAGES[index - 1];
    return { type: 'drawing', drawing: drawing, id: drawing.id, number: drawing.number, name: drawing.name, kind: drawing.kind };
  }
  function drawingNow() {
    const folio = folioAt(state.leaf || 0);
    return folio.type === 'drawing' ? folio.drawing : null;
  }

  function applyTheme() {
    const skin = window.CB_SKINS.find((s) => s.id === state.theme) || window.CB_SKINS[0];
    let bg = skin.bg.slice();
    let panel = skin.panel.slice();
    const accent = skin.accent.slice();
    if (state.customBg) {
      bg = COL.hexToHsl(state.customBg);
      panel = [bg[0], bg[1], bg[2] < 50 ? Math.min(100, bg[2] + 10) : Math.max(0, bg[2] - 8)];
    }
    const look = COL.lookFromHsl(bg, panel, accent);
    const dark = bg[2] < 50;
    const root = document.documentElement;
    root.style.setProperty('--desk', look.bg);
    root.style.setProperty('--desk-2', look.panel);
    root.style.setProperty('--ink', look.text);
    root.style.setProperty('--muted', look.sub);
    root.style.setProperty('--accent', look.accent);
    root.style.setProperty('--on-accent', look.onAccent);
    root.style.setProperty('--line', look.border);
    root.style.setProperty('--card', dark ? look.panel : 'rgba(255,252,248,.84)');
    document.body.dataset.theme = state.customBg ? 'custom' : skin.id;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.customBg || COL.hx(skin.bg));
    document.querySelectorAll('#themes button').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.theme === state.theme && !state.customBg ? 'true' : 'false');
    });
    document.querySelectorAll('#bgdots .dot').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.bg === state.customBg ? 'true' : 'false');
    });
  }

  function setScreen(name) {
    document.body.dataset.screen = name;
    $('#screen-cover').classList.toggle('hidden', name !== 'cover');
    $('#screen-book').classList.toggle('hidden', name !== 'book');
    if (name === 'book') renderBook();
  }

  function renderThumbs() {
    const box = $('#thumbs');
    box.innerHTML = '';
    shownPages().forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb';
      btn.dataset.page = p.id;
      btn.dataset.kind = p.kind;
      btn.dataset.number = String(p.number);
      btn.setAttribute('aria-label', 'Page ' + p.number + ', ' + p.name);
      if (p.id === state.pageId) btn.setAttribute('aria-current', 'true');
      const hole = document.createElement('span');
      hole.className = 'hole';
      hole.setAttribute('aria-hidden', 'true');
      const tab = document.createElement('span');
      tab.className = 'tab';
      tab.setAttribute('aria-hidden', 'true');
      const c = document.createElement('canvas');
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(p.number);
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = p.name;
      btn.append(hole, tab, c, num, label);
      if (p.fresh) {
        btn.dataset.fresh = '1';
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'New';
        btn.append(badge);
      }
      const fills = fillsOf(p);
      if (fills.some(Boolean)) {
        const star = document.createElement('span');
        star.className = 'star';
        star.textContent = '✦';
        btn.append(star);
      }
      btn.onclick = () => openDrawing(p.id);
      box.append(btn);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const px = Math.round(120 * dpr);
      c.width = px;
      c.height = px;
      const ctx = c.getContext('2d');
      if (ctx) DRAW.drawPage(ctx, p, fills, px, 4);
    });
    document.querySelectorAll('[data-filter]').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.filter === state.filter ? 'true' : 'false');
    });
  }

  function draw() {
    const page = drawingNow();
    if (!page) return;
    const fills = fillsOf(page);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const css = Math.max(240, Math.floor(canvas.clientWidth || sheet.clientWidth || 360));
    const px = Math.round(css * dpr);
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
    const ctx = canvas.getContext('2d');
    if (ctx) DRAW.drawPage(ctx, page, fills, px, 3);
    $('#pageName').textContent = page.name;
    const shapes = page.regions.filter((r) => !r.line).length;
    const done = page.regions.filter((r, i) => !r.line && fills[i]).length;
    const kind = page.kind === 'mandala' ? 'Mandala' : 'Animal';
    $('#pageMeta').textContent = 'Page ' + page.number + ' · ' + kind + ' · ' + done + ' of ' + shapes + ' shapes colored';
    sheet.classList.toggle('erase', state.tool === 'erase');
    paintCrayon();
  }

  function paintCover() {
    const c = $('#coverArt');
    const page = PAGES[0];
    const palette = window.CB_SWATCHES;
    const fills = page.regions.map((r, i) => {
      if (r.line || r.base) return null;
      if (r.g === 'bg') return '#fff4fb';
      return palette[i % palette.length];
    });
    const ctx = c.getContext('2d');
    if (ctx) DRAW.drawPage(ctx, page, fills, c.width, 3);
  }

  function filledCount(page, fills) {
    let n = 0;
    for (let i = 0; i < page.regions.length; i++) {
      if (!page.regions[i].line && fills[i]) n++;
    }
    return n;
  }
  function celebrate() {
    if (reduceMotion) return;
    sheet.classList.remove('done');
    void sheet.offsetWidth;
    sheet.classList.add('done');
    clearTimeout(celebrate.t);
    celebrate.t = setTimeout(() => sheet.classList.remove('done'), 1400);
  }
  function commit(next) {
    const page = drawingNow();
    if (!page) return;
    const cur = fillsOf(page);
    const before = filledCount(page, cur);
    hist[page.id] = (hist[page.id] || []).concat([cur]).slice(-80);
    state.fills[page.id] = next;
    const shapes = page.regions.filter((r) => !r.line).length;
    const after = filledCount(page, next);
    save();
    draw();
    if (after === shapes && before < shapes) celebrate();
  }
  function pushRecent(c) {
    state.recent = [c, ...state.recent.filter((x) => x !== c)].slice(0, 12);
    save();
    renderRecent();
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    const pageHit = drawingNow();
    if (!pageHit) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 400;
    const y = ((e.clientY - rect.top) / rect.height) * 400;
    const page = pageHit;
    const idx = DRAW.hitTest(page, x, y);
    if (idx < 0) return;
    const cur = fillsOf(page);
    const val = state.tool === 'erase' ? null : colorHex();
    if ((cur[idx] || null) === val) return;
    const next = cur.slice();
    next[idx] = val;
    commit(next);
    if (val) { pushRecent(val); tap('pop'); }
  }

  function undo() {
    const page = drawingNow();
    if (!page) return;
    const id = page.id;
    const h = hist[id] || [];
    if (!h.length) return;
    state.fills[id] = h.pop();
    save();
    draw();
  }
  function clearPage() {
    const page = drawingNow();
    if (!page) return;
    const cur = fillsOf(page);
    if (cur.every((v) => !v)) return;
    commit(emptyFills(page));
  }
  function surprise() {
    const page = drawingNow();
    if (!page) return;
    const base = Math.random() * 360;
    const scheme = [0, 30, 150, 180, 210, 300][Math.floor(Math.random() * 6)];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const palette = [];
    for (let i = 0; i < 7; i++) {
      const h = (base + (i % 2 ? scheme : 0) + rnd(-25, 25) + 360) % 360;
      palette.push(COL.hslToHex(h, rnd(45, 90), rnd(45, 85)));
    }
    const byGroup = new Map();
    let k = Math.floor(Math.random() * palette.length);
    const next = page.regions.map((r, i) => {
      if (r.line || r.base) return null;
      const key = r.g || ('i' + i);
      let c = byGroup.get(key);
      if (!c) {
        c = key === 'bg' ? COL.hslToHex(base, rnd(30, 60), rnd(88, 95)) : palette[k++ % palette.length];
        byGroup.set(key, c);
      }
      return c;
    });
    commit(next);
    tap('sparkle');
    toast('A fresh palette ✦');
  }

  function setTool(tool) {
    state.tool = tool;
    save();
    $('#tool-fill').setAttribute('aria-pressed', tool === 'fill' ? 'true' : 'false');
    $('#tool-erase').setAttribute('aria-pressed', tool === 'erase' ? 'true' : 'false');
    sheet.classList.toggle('erase', tool === 'erase');
    paintCrayon();
  }
  function pickHex(hex) {
    state.hsl = COL.hexToHsl(hex);
    state.tool = 'fill';
    save();
    setTool('fill');
    paintCrayon();
  }
  function paintCrayon() {
    const hex = colorHex();
    $('#currentSwatch').style.background = hex;
    $('#hexLabel').textContent = hex.toUpperCase();
    $('#magicPicker').value = hex;
    $('#hue').value = state.hsl[0];
    $('#sat').value = state.hsl[1];
    $('#lit').value = state.hsl[2];
    $('#hueVal').textContent = state.hsl[0] + '°';
    $('#satVal').textContent = state.hsl[1] + '%';
    $('#litVal').textContent = state.hsl[2] + '%';
    const hueStops = [0, 60, 120, 180, 240, 300, 360].map((h) => COL.hs([h, state.hsl[1], state.hsl[2]])).join(', ');
    $('#hue').style.setProperty('--track', 'linear-gradient(to right,' + hueStops + ')');
    $('#sat').style.setProperty('--track', 'linear-gradient(to right,' + COL.hs([state.hsl[0], 0, state.hsl[2]]) + ',' + COL.hs([state.hsl[0], 100, state.hsl[2]]) + ')');
    $('#lit').style.setProperty('--track', 'linear-gradient(to right,' + COL.hs([state.hsl[0], state.hsl[1], 8]) + ',' + COL.hs([state.hsl[0], state.hsl[1], 50]) + ',' + COL.hs([state.hsl[0], state.hsl[1], 96]) + ')');
    document.querySelectorAll('#crayons .crayon').forEach((b) => {
      b.setAttribute('aria-pressed', state.tool === 'fill' && b.dataset.color === hex ? 'true' : 'false');
    });
    document.querySelectorAll('#recent .dot').forEach((b) => {
      b.setAttribute('aria-pressed', state.tool === 'fill' && b.dataset.color === hex ? 'true' : 'false');
    });
    const mint = $('#btn-mint');
    const ready = window.CB_STARKNET && CB_STARKNET.configured;
    mint.textContent = ready ? 'Mint as NFT' : 'Coming soon';
  }
  function renderRecent() {
    const box = $('#recent');
    box.innerHTML = '';
    state.recent.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dot';
      b.style.background = c;
      b.dataset.color = c;
      b.setAttribute('aria-label', c);
      b.onclick = () => pickHex(c);
      box.append(b);
    });
  }
  function buildCrayons() {
    const box = $('#crayons');
    window.CB_SWATCHES.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'crayon';
      b.dataset.color = c;
      b.style.setProperty('--c', c);
      b.setAttribute('aria-label', 'Crayon ' + c);
      b.innerHTML = '<span class="tip"></span><span class="barrel"></span><span class="wrap"></span>';
      b.onclick = () => pickHex(c);
      box.append(b);
    });
    const magic = document.createElement('button');
    magic.type = 'button';
    magic.className = 'crayon magic';
    magic.setAttribute('aria-label', 'Magic crayon');
    magic.innerHTML = '<span class="tip"></span><span class="barrel"></span><span class="wrap"></span>';
    magic.onclick = () => $('#magicPicker').click();
    box.append(magic);
  }
  function audio() {
    if (!engine) engine = new window.CBSound();
    engine.setVolume(state.volume);
    engine.setSfx(!!state.sfx, state.sfxVolume);
    engine.setTuning(state.tuning === '528' ? '528' : '432');
    return engine;
  }
  function tap(kind) {
    if (!state.sfx) return;
    try { audio().ui(kind); }
    catch (e) { /* coloring still works if this window has no audio */ }
  }
  function syncSfx() {
    const b = $('#sfxToggle');
    if (!b) return;
    b.setAttribute('aria-pressed', state.sfx ? 'true' : 'false');
    b.textContent = state.sfx ? 'Crayon taps on' : 'Crayon taps off';
    const sl = $('#sfxVolume');
    if (sl) sl.value = Math.round((state.sfxVolume == null ? 0.35 : state.sfxVolume) * 100);
    if (engine) engine.setSfx(!!state.sfx, state.sfxVolume);
  }
  function syncTuning() {
    const mode = state.tuning === '528' ? '528' : '432';
    state.tuning = mode;
    document.querySelectorAll('[data-tuning]').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.tuning === mode ? 'true' : 'false');
    });
    const note = $('#tuningNote');
    if (note) {
      note.textContent = mode === '528'
        ? 'Tuned to 528 Hz. The key note is 528.'
        : 'Tuned to 432 Hz. A is 432.';
    }
    if (engine) engine.setTuning(mode);
  }
  function buildSounds() {
    const box = $('#sounds');
    let row = null;
    let last = '';
    window.CB_SOUNDS.forEach((s) => {
      if (s.group !== last) {
        const group = document.createElement('div');
        group.className = 'snd-group';
        const kicker = document.createElement('div');
        kicker.className = 'kicker';
        kicker.textContent = (window.CB_SOUND_GROUPS && window.CB_SOUND_GROUPS[s.group]) || '';
        row = document.createElement('div');
        row.className = 'sounds';
        group.append(kicker, row);
        box.append(group);
        last = s.group;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'snd';
      b.dataset.sound = s.id;
      b.innerHTML = '<span class="snd-ico" aria-hidden="true">' + s.emoji + '</span><span class="snd-name">' + s.label + '</span>';
      b.setAttribute('aria-label', s.label);
      b.setAttribute('aria-pressed', 'false');
      b.onclick = () => toggleSound(s.id);
      row.append(b);
    });
  }
  function toggleSound(id) {
    try {
      const eng = audio();
      const canon = (window.CB_migrateSoundId && window.CB_migrateSoundId(id)) || id;
      const btn = document.querySelector('[data-sound="' + canon + '"]');
      if (playing.has(canon)) {
        eng.stop(canon);
        playing.delete(canon);
        if (btn) btn.setAttribute('aria-pressed', 'false');
      } else {
        if (!state.layer) {
          playing.forEach((x) => { eng.stop(x); const o = document.querySelector('[data-sound="' + x + '"]'); if (o) o.setAttribute('aria-pressed', 'false'); });
          playing.clear();
        }
        eng.start(canon);
        playing.add(canon);
        if (btn) btn.setAttribute('aria-pressed', 'true');
      }
      $('#audioErr').classList.add('hidden');
      $('#soundQuick').setAttribute('aria-pressed', playing.size ? 'true' : 'false');
    } catch (e) {
      $('#audioErr').classList.remove('hidden');
    }
  }
  function stopAllSounds() {
    if (engine) engine.stopAll();
    playing.clear();
    document.querySelectorAll('[data-sound]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    $('#soundQuick').setAttribute('aria-pressed', 'false');
  }
  function buildThemes() {
    const box = $('#themes');
    window.CB_SKINS.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.theme = s.id;
      b.textContent = s.label;
      b.onclick = () => { state.theme = s.id; state.customBg = null; save(); applyTheme(); };
      box.append(b);
    });
    const dots = $('#bgdots');
    window.CB_BG_PRESETS.forEach((h) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dot';
      b.style.background = h;
      b.dataset.bg = h;
      b.setAttribute('aria-label', 'Desk ' + h);
      b.onclick = () => { state.customBg = h; save(); applyTheme(); };
      dots.append(b);
    });
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'tool';
    reset.textContent = 'Theme default';
    reset.onclick = () => { state.customBg = null; save(); applyTheme(); };
    dots.append(reset);
  }

  let turnToken = 0;
  function openDrawing(id) {
    const dest = pageById(id).number;
    const cur = state.leaf || 0;
    const delta = dest - cur;
    goTo(dest, Math.abs(delta) === 1 ? (delta > 0 ? 1 : -1) : 0);
  }
  function goTo(leaf, dir) {
    const max = PAGES.length + 1;
    const next = Math.max(0, Math.min(max, leaf));
    const prev = state.leaf || 0;
    const apply = () => {
      state.leaf = next;
      const folio = folioAt(next);
      if (folio.type === 'drawing') state.pageId = folio.id;
      save();
      renderBook();
    };
    if (document.body.dataset.screen !== 'book' || !dir || reduceMotion || next === prev) {
      apply();
      return;
    }
    tap('rustle');
    const node = dir < 0 ? $('#leafLeft') : $('#leafRight');
    node.classList.remove('turn-next', 'turn-prev');
    void node.offsetWidth;
    node.classList.add(dir < 0 ? 'turn-prev' : 'turn-next');
    const token = ++turnToken;
    setTimeout(() => {
      node.classList.remove('turn-next', 'turn-prev');
      if (token === turnToken) apply();
    }, 280);
  }
  function step(dir) {
    const cur = state.leaf || 0;
    const n = cur + dir;
    if (n < 0) { setScreen('cover'); return; }
    if (n > PAGES.length + 1) return;
    goTo(n, dir);
  }
  function paintLeaf(el, index, active) {
    const folio = folioAt(index);
    el.classList.toggle('active', index === active);
    el.dataset.folio = folio.type;
    el.onclick = (e) => {
      if (index === (state.leaf || 0)) return;
      if (e.target.closest('button, a, input, label, .seg')) return;
      const delta = index - (state.leaf || 0);
      goTo(index, Math.abs(delta) === 1 ? (delta > 0 ? 1 : -1) : 0);
    };
    const foot = document.createElement('div');
    foot.className = 'folio-foot';
    if (folio.type === 'drawing') {
      foot.textContent = String(folio.number);
      const title = document.createElement('div');
      title.className = 'folio-title';
      title.textContent = folio.name;
      el.replaceChildren(title, index === active ? sheet : facing, foot);
    } else if (folio.type === 'contents') {
      foot.textContent = 'Contents';
      el.replaceChildren(contentsPage, foot);
    } else {
      foot.textContent = 'End';
      el.replaceChildren(backPage, foot);
    }
  }
  function paintFacing() {
    const active = state.leaf || 0;
    const left = active % 2 === 0 ? active : active - 1;
    const other = left === active ? left + 1 : left;
    const folio = folioAt(other);
    const c = facingCanvas;
    if (!c || folio.type !== 'drawing') return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const css = Math.max(200, Math.floor(c.clientWidth || 240));
    const px = Math.round(css * dpr);
    if (c.width !== px) { c.width = px; c.height = px; }
    const ctx = c.getContext('2d');
    if (ctx) DRAW.drawPage(ctx, folio.drawing, fillsOf(folio.drawing), px, 3);
  }
  function renderBook() {
    const active = state.leaf || 0;
    const left = active % 2 === 0 ? active : active - 1;
    paintLeaf($('#leafLeft'), left, active);
    paintLeaf($('#leafRight'), left + 1, active);
    const folio = folioAt(active);
    $('.stage').classList.toggle('quiet', folio.type !== 'drawing');
    if (folio.type === 'drawing') {
      $('#pageName').textContent = folio.name;
      draw();
    } else if (folio.type === 'contents') {
      $('#pageName').textContent = 'Contents';
      $('#pageMeta').textContent = PAGES.length + ' pictures, one on each page';
      renderThumbs();
    } else {
      $('#pageName').textContent = 'The end';
      $('#pageMeta').textContent = 'Back cover';
    }
    $('#pageNext').disabled = active >= PAGES.length + 1;
    requestAnimationFrame(() => {
      if (document.body.dataset.screen !== 'book') return;
      if (drawingNow()) draw();
      paintFacing();
    });
  }

  async function downloadPNG() {
    const page = drawingNow();
    if (!page) return;
    const fills = fillsOf(page);
    const c = document.createElement('canvas');
    c.width = c.height = 1200;
    const ctx = c.getContext('2d');
    ctx.fillStyle = window.CB_PAPER;
    ctx.fillRect(0, 0, 1200, 1200);
    DRAW.drawPage(ctx, page, fills, 1200, 3);
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    if (!blob) { toast('This browser could not make a PNG.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = page.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('PNG saved');
  }

  function pixelColors(page, fills) {
    const N = 8;
    const S = 48;
    const c = document.createElement('canvas');
    c.width = c.height = N * S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = window.CB_PAPER;
    ctx.fillRect(0, 0, c.width, c.height);
    DRAW.drawPage(ctx, page, fills, c.width, 1.1);
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    const colors = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = y * S; yy < (y + 1) * S; yy += 4) {
          for (let xx = x * S; xx < (x + 1) * S; xx += 4) {
            const i = (yy * c.width + xx) * 4;
            r += img[i]; g += img[i + 1]; b += img[i + 2]; n++;
          }
        }
        const R = Math.round(r / n), G = Math.round(g / n), B = Math.round(b / n);
        colors.push('0x' + [R, G, B].map((v) => v.toString(16).padStart(2, '0')).join(''));
      }
    }
    return colors;
  }
  function artKey(page, fills) {
    return page.id + ':' + fills.map((c) => c || '').join(',');
  }
  async function fingerprint(page, fills) {
    const canon = JSON.stringify({ page: page.id, fills: fills.map((c) => c || null) });
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canon));
      return '0x' + [...new Uint8Array(buf)].slice(0, 31).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      let h = 2166136261;
      for (let i = 0; i < canon.length; i++) h = Math.imul(h ^ canon.charCodeAt(i), 16777619);
      return '0x' + (h >>> 0).toString(16).padStart(8, '0');
    }
  }

  function closeModal() { $('#modalRoot').innerHTML = ''; }
  function modal(html) {
    $('#modalRoot').innerHTML = '<div class="modal"><div class="sheet-modal">' + html + '</div></div>';
    const root = $('#modalRoot').firstChild;
    root.addEventListener('click', (e) => { if (e.target === root || e.target.closest('.close')) closeModal(); });
  }

  function backupData() {
    return {
      app: BACKUP_APP,
      v: 1,
      saved: new Date().toISOString(),
      state: {
        fills: state.fills,
        recent: state.recent,
        theme: state.theme,
        customBg: state.customBg,
        volume: state.volume,
        layer: state.layer,
        sfx: !!state.sfx,
        sfxVolume: state.sfxVolume,
        tuning: state.tuning === '528' ? '528' : '432',
        minted: state.minted,
        pageId: state.pageId,
        hsl: state.hsl,
        tool: state.tool,
        filter: state.filter,
      },
    };
  }
  function summarize(st) {
    const pages = Object.keys(st.fills || {}).length;
    const minted = Object.keys(st.minted || {}).length;
    return pages + ' colored page' + (pages === 1 ? '' : 's') + (minted ? ' · ' + minted + ' minted' : '');
  }
  function downloadBackup() {
    save();
    const blob = new Blob([JSON.stringify(backupData())], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    a.href = URL.createObjectURL(blob);
    a.download = 'coloring-book-backup-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '.json';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Backup saved');
  }
  function parseBackup(text) {
    try {
      const b = JSON.parse(text);
      if (!b || b.app !== BACKUP_APP || !b.state || typeof b.state !== 'object') return null;
      return b;
    } catch (e) { return null; }
  }
  function restoreBackup(b) {
    const s = b.state;
    state.fills = s.fills || {};
    state.recent = s.recent || [];
    state.theme = s.theme || 'pastel';
    state.customBg = s.customBg || null;
    state.volume = typeof s.volume === 'number' ? s.volume : 0.6;
    state.layer = s.layer !== false;
    state.sfx = s.sfx === true;
    state.sfxVolume = clampVol(s.sfxVolume, 0.35);
    state.tuning = s.tuning === '528' ? '528' : '432';
    if (Array.isArray(s.sounds) && window.CB_migrateSoundId) {
      state.sounds = s.sounds.map((id) => window.CB_migrateSoundId(id)).filter(Boolean);
    }
    state.minted = s.minted || {};
    state.pageId = s.pageId || PAGES[0].id;
    state.hsl = s.hsl || [200, 80, 55];
    state.tool = s.tool || 'fill';
    state.filter = s.filter || 'all';
    $('#volume').value = Math.round(state.volume * 100);
    syncSfx();
    syncTuning();
    $('#mixToggle').setAttribute('aria-pressed', state.layer ? 'true' : 'false');
    $('#mixToggle').textContent = state.layer ? 'Mixing on' : 'One at a time';
    if (engine) engine.setVolume(state.volume);
    save();
    applyTheme();
    renderRecent();
    setTool(state.tool);
    if (s.pageId) {
      const restored = pageById(s.pageId);
      if (restored && restored.id === s.pageId) state.leaf = restored.number;
    }
    setScreen(document.body.dataset.screen === 'cover' ? 'book' : document.body.dataset.screen);
    closeModal();
    toast('Backup restored');
  }
  function backupModal() {
    modal(
      '<button class="iconbtn close" type="button" aria-label="Close">✕</button>' +
      '<h2>Backup &amp; restore</h2>' +
      '<p class="small">Your coloring lives in this browser. A backup file keeps it if you clear the browser, and lets you carry on somewhere else. The file stays on your device.</p>' +
      '<p class="small"><b>Right now:</b> ' + summarize(state) + '</p>' +
      '<p><button class="btn primary" id="bkSave" type="button">Download backup</button></p>' +
      '<p class="small">Pick a Coloring Book backup. You will see what is inside before anything changes.</p>' +
      '<label class="btn filebtn">Choose backup file…<input id="bkFile" type="file" accept=".json,application/json" aria-label="Choose a Coloring Book backup file"></label>' +
      '<div id="bkOut"></div>'
    );
    $('#bkSave').onclick = downloadBackup;
    $('#bkFile').onchange = () => {
      const f = $('#bkFile').files && $('#bkFile').files[0];
      const out = $('#bkOut');
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const b = parseBackup(String(reader.result || ''));
        if (!b) { out.innerHTML = '<p class="small" style="color:#9c2348">That file is not a Coloring Book backup, so nothing changed.</p>'; return; }
        out.innerHTML = '<p class="small"><b>' + (f.name) + '</b><br>' + summarize(b.state) + '</p>' +
          '<p class="small">Restoring replaces the coloring in this browser.</p>' +
          '<button class="btn primary" id="bkRestore" type="button">Replace with this backup</button>';
        $('#bkRestore').onclick = () => restoreBackup(b);
      };
      reader.readAsText(f);
    };
  }

  function mintModal() {
    const page = drawingNow();
    if (!page) return;
    const fills = fillsOf(page);
    const colored = page.regions.some((r, i) => !r.line && !r.base && fills[i]);
    const chain = window.CB_STARKNET;
    const ready = !!(chain && chain.configured);
    modal(
      '<button class="iconbtn close" type="button" aria-label="Close">✕</button>' +
      '<h2>Mint as NFT</h2>' +
      '<div class="preview-row"><canvas id="mintPreview" width="280" height="280"></canvas>' +
      '<div><div class="name">' + page.name + '</div>' +
      '<p class="small">Sepolia testnet only. No real funds. The on-chain picture is an 8×8 crayon-pixel copy of this page, drawn as SVG by the contract.</p></div></div>' +
      (ready ? '<div id="snConnect"></div><p><button class="btn gold" id="mintGo" type="button"' + (colored ? '' : ' disabled') + '>Mint this page</button></p>' : '<div class="chain-note"><b>Coming soon.</b> The Sepolia contract address is not set yet, so minting stays off and nothing is sent. When it is deployed, paste the address into <code>js/starknet-config.js</code>.</div>') +
      '<p class="mint-status" id="mintStatus" role="status"></p>' +
      '<p><button class="btn" id="agentCopy" type="button">Copy agent call</button></p>'
    );
    const prev = $('#mintPreview');
    const ctx = prev.getContext('2d');
    if (ctx) DRAW.drawPage(ctx, page, fills, 280, 2);
    if (ready && chain.mountConnect) chain.mountConnect($('#snConnect'));
    const go = $('#mintGo');
    if (go) go.onclick = () => chain.mint(page.id);
    $('#agentCopy').onclick = async () => {
      if (!chain) { toast('Starknet layer is not loaded'); return; }
      const payload = await chain.agentPayload(page.id);
      const txt = JSON.stringify(payload, null, 2);
      try { await navigator.clipboard.writeText(txt); toast('Agent call copied'); }
      catch (e) { toast('Could not copy. The call is in the panel.'); }
      const pre = document.createElement('pre');
      pre.className = 'small';
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.wordBreak = 'break-all';
      pre.textContent = txt;
      $('#mintStatus').after(pre);
    };
    if (!colored && ready) $('#mintStatus').textContent = 'Color a shape first.';
  }

  function bind() {
    $('#homeBtn').onclick = () => setScreen('cover');
    $('#openBook').onclick = () => { state.leaf = 0; setScreen('book'); };
    $('#galleryBtn').onclick = () => { state.leaf = 0; setScreen('book'); };
    $('#closeBook').onclick = () => setScreen('cover');
    $('#backupBtn').onclick = backupModal;
    $('#soundQuick').onclick = () => {
      if (playing.size) stopAllSounds();
      else toggleSound('rain');
    };
    document.querySelectorAll('[data-filter]').forEach((b) => {
      b.onclick = () => { state.filter = b.dataset.filter; save(); renderThumbs(); };
    });
    let swipe = null;
    $('#spread').addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest('button, a, input, label, .seg')) return;
      swipe = { x: e.clientX, y: e.clientY, t: e.target };
    });
    $('#spread').addEventListener('pointerup', (e) => {
      if (!swipe) return;
      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      const started = swipe.t;
      swipe = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
        step(dx < 0 ? 1 : -1);
        return;
      }
      if (started && started.id === 'pageCanvas' && Math.hypot(dx, dy) < 14) onPointerDown(e);
    });
    $('#spread').addEventListener('pointercancel', () => { swipe = null; });
    $('#tool-fill').onclick = () => setTool('fill');
    $('#tool-erase').onclick = () => setTool('erase');
    $('#tool-undo').onclick = undo;
    $('#tool-clear').onclick = clearPage;
    $('#tool-surprise').onclick = surprise;
    $('#btn-png').onclick = () => { downloadPNG(); };
    $('#btn-mint').onclick = mintModal;
    $('#pagePrev').onclick = () => step(-1);
    $('#pageNext').onclick = () => step(1);
    $('#magicPicker').addEventListener('input', (e) => pickHex(e.target.value));
    ['hue', 'sat', 'lit'].forEach((id, idx) => {
      $('#' + id).addEventListener('input', (e) => {
        state.hsl[idx] = Number(e.target.value);
        state.tool = 'fill';
        save();
        setTool('fill');
      });
    });
    $('#mixToggle').onclick = () => {
      state.layer = !state.layer;
      save();
      $('#mixToggle').setAttribute('aria-pressed', state.layer ? 'true' : 'false');
      $('#mixToggle').textContent = state.layer ? 'Mixing on' : 'One at a time';
    };
    $('#stopSounds').onclick = stopAllSounds;
    $('#volume').addEventListener('input', (e) => {
      state.volume = Number(e.target.value) / 100;
      save();
      if (engine) engine.setVolume(state.volume);
    });
    $('#sfxToggle').onclick = () => {
      state.sfx = !state.sfx;
      save();
      syncSfx();
      if (state.sfx) tap('pop');
    };
    $('#sfxVolume').addEventListener('input', (e) => {
      state.sfxVolume = Number(e.target.value) / 100;
      save();
      if (engine) engine.setSfx(!!state.sfx, state.sfxVolume);
    });
    document.querySelectorAll('[data-tuning]').forEach((b) => {
      b.onclick = () => {
        state.tuning = b.dataset.tuning === '528' ? '528' : '432';
        save();
        syncTuning();
      };
    });
    const bgPick = document.createElement('input');
    bgPick.type = 'color';
    bgPick.id = 'bgCustom';
    bgPick.setAttribute('aria-label', 'Custom desk color');
    bgPick.value = state.customBg || '#f6e7f4';
    bgPick.addEventListener('input', (e) => { state.customBg = e.target.value; save(); applyTheme(); });
    $('#bgdots').append(bgPick);
    window.addEventListener('keydown', (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const inBook = document.body.dataset.screen === 'book';
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && inBook) {
        e.preventDefault();
        undo();
      }
      if (!inBook) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
    });
    window.addEventListener('resize', () => {
      if (document.body.dataset.screen !== 'book') return;
      if (drawingNow()) draw();
      paintFacing();
    });
  }

  buildCrayons();
  buildSounds();
  buildThemes();
  bind();
  $('#volume').value = Math.round(state.volume * 100);
  syncSfx();
  syncTuning();
  applyTheme();
  renderRecent();
  setTool(state.tool === 'erase' ? 'erase' : 'fill');
  paintCover();
  setScreen('cover');

  window.CB_GAME = {
    toast,
    state,
    pages: PAGES,
    save,
    draw,
    setScreen,
    refresh() { applyTheme(); paintCrayon(); if (document.body.dataset.screen === 'book') renderBook(); },
    async job(pageId) {
      const page = pageById(pageId || state.pageId);
      const fills = fillsOf(page);
      return {
        page,
        fills,
        key: artKey(page, fills),
        hash: await fingerprint(page, fills),
        colors: pixelColors(page, fills),
        colored: page.regions.some((r, i) => !r.line && !r.base && fills[i]),
      };
    },
    markMinted(key, info) {
      state.minted[key] = info;
      save();
      toast('Minted on Starknet');
    },
    setMintStatus(html, kind) {
      const el = $('#mintStatus');
      if (!el) return;
      el.className = 'mint-status' + (kind ? ' ' + kind : '');
      el.innerHTML = html;
    },
  };

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
