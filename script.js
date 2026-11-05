'use strict';
// Подстраховка для старых iOS/Safari, где нет ctx.roundRect
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const R = Array.isArray(r) ? r.slice() : [r || 0];
    let tl, tr, br, bl;
    if (R.length === 1) { tl = tr = br = bl = R[0]; }
    else if (R.length === 2) { tl = br = R[0]; tr = bl = R[1]; }
    else if (R.length === 3) { tl = R[0]; tr = bl = R[1]; br = R[2]; }
    else { tl = R[0]; tr = R[1]; br = R[2]; bl = R[3]; }
    const m = Math.min(Math.abs(w), Math.abs(h)) / 2;
    tl = Math.min(tl, m); tr = Math.min(tr, m); br = Math.min(br, m); bl = Math.min(bl, m);
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y); this.arcTo(x + w, y, x + w, y + tr, tr);
    this.lineTo(x + w, y + h - br); this.arcTo(x + w, y + h, x + w - br, y + h, br);
    this.lineTo(x + bl, y + h); this.arcTo(x, y + h, x, y + h - bl, bl);
    this.lineTo(x, y + tl); this.arcTo(x, y, x + tl, y, tl);
    this.closePath();
  };
}
// ==========================================================
// 0. ИКОНКИ: свой набор линейных иконок вместо эмодзи (в стиле «ручка по тетради»)
// Любой эмодзи, попавший в интерфейс, автоматически заменяется на иконку из набора (или убирается).
// ==========================================================
const ICON_PATHS = {
  coin: 'M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16zM12 8.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7z',
  star: 'M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  cross: 'M6 6l12 12M18 6L6 18',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 14.5v2',
  medal: 'M8 3l2.5 6M16 3l-2.5 6M12 9a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11zM12 12.5v4',
  gem: 'M7 4h10l4 5-9 11L3 9zM3 9h18M10 4l-1.5 5L12 20l3.5-11L14 4',
  fire: 'M12 21c-4 0-7-2.8-7-6.5 0-3 2-5 3.5-6.5.3 2 1.3 3 2.3 3.3C10.5 8 12 5 14 3c.5 3 5 5.5 5 11 0 4-3 7-7 7z',
  rocket: 'M12 3c3 2 4.5 5.5 4.5 9.5L14 16h-4l-2.5-3.5C7.5 8.5 9 5 12 3zM12 8.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3zM7.5 12.5L5 15l1 3 3-1.5M16.5 12.5L19 15l-1 3-3-1.5M10.5 19l1.5 2 1.5-2',
  crown: 'M4 18h16M4 18L3 7l5 4 4-6 4 6 5-4-1 11',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5c0 3 1 4.5 3 5M16 6h3c0 3-1 4.5-3 5M12 13v4M8.5 20h7M10 17h4',
  snow: 'M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M10 4.5l2 1.5 2-1.5M10 19.5l2-1.5 2 1.5',
  magnet: 'M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4zM6 8h4M14 8h4',
  spring: 'M5 4h14M5 20h14M8 17l8-2.5-8-2.5 8-2.5-8-2.5',
  shirt: 'M8 4L3 7l2 4 2-1v10h10V10l2 1 2-4-5-3c0 1.7-1.8 3-4 3S8 5.7 8 4z',
  candy: 'M9 9a4.2 4.2 0 1 1 6 6a4.2 4.2 0 1 1-6-6zM9 9L4 7.5 5 4 7.5 5zM15 15l5 1.5-1 3.5-2.5-1z',
  chest: 'M3 10h18v9H3zM3 10V8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2M10 10v3h4v-3',
  gift: 'M4 9h16v4H4zM5.5 13h13v7h-13zM12 9v11M12 9c-2-4-6-4-6-1.5S9 9 12 9zM12 9c2-4 6-4 6-1.5S15 9 12 9z',
  jump: 'M12 18V5M6.5 10.5L12 5l5.5 5.5M7 21h10',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  gamepad: 'M7 8h10a4 4 0 0 1 4 4v1.5a3 3 0 0 1-5.4 1.8L14.5 14h-5l-1.1 1.3A3 3 0 0 1 3 13.5V12a4 4 0 0 1 4-4zM7.5 10.5v3M6 12h3M15.5 11h.01M17.5 13h.01',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  warn: 'M12 4l9.5 16h-19zM12 10v4.5M12 17.5h.01',
  shield: 'M12 3l8 3v6c0 4.5-3.4 7.7-8 9-4.6-1.3-8-4.5-8-9V6z',
  target: 'M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16zM12 9a3 3 0 1 1 0 6a3 3 0 1 1 0-6zM12 1.5V6M12 18v4.5M1.5 12H6M18 12h4.5',
  brick: 'M3 6h18v12H3zM3 12h18M9 6v6M15 12v6',
  clock: 'M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM12 7.5V12l3 2',
  wheel: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4',
  wrench: 'M14.5 4.5a4.5 4.5 0 0 0-4.3 5.9L4 16.6 7.4 20l6.2-6.2a4.5 4.5 0 0 0 5.9-4.3l-2.7 2.7-2.9-.6-.6-2.9z',
  chart: 'M4 20h16M7 17v-4M12 17V7M17 17v-7',
  flag: 'M5 21V4M5 4h12l-2.5 4L17 12H5',
  sound: 'M4 9.5h4L13 5v14l-5-4.5H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11',
  mute: 'M4 9.5h4L13 5v14l-5-4.5H4zM16.5 9.5l5 5M21.5 9.5l-5 5',
  pumpkin: 'M12 7c-5 0-8 2.8-8 6.5S7 20 12 20s8-2.8 8-6.5S17 7 12 7zM12 7c-2 0-3 3-3 6.5S10 20 12 20M12 7c2 0 3 3 3 6.5S14 20 12 20M12 7c0-2 1-3.5 3-4',
  tree: 'M12 3l5 6h-3l4.5 6h-13L10 9H7zM12 15v5',
  propeller: 'M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M3 9c3-2 6-2 7.5 3M21 9c-3-2-6-2-7.5 3M12 13.5V20M8 20h8',
  pause: 'M8.5 5v14M15.5 5v14',
  play: 'M7 4.5v15l12.5-7.5z',
  gear: 'M12 5.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13zM12 9.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  ticket: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM14.5 7v2M14.5 11v2M14.5 15v2',
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  refresh: 'M19.5 8A8 8 0 1 0 20 13M19.5 3.5V8H15',
  back: 'M15 5l-7 7 7 7',
  copy: 'M8 8h11v12H8zM5 16H4V4h11v1',
  download: 'M12 4v11M7 10.5l5 5 5-5M5 20h14',
  upload: 'M12 15V4M7 8.5l5-5 5 5M5 20h14',
  folder: 'M3 6h6l2 2h10v11H3z',
  music: 'M9 18V5l11-2v13M9 18a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0zM20 16a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 8.5h.01',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  egg: 'M12 3c3.5 0 6.5 5.5 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.5 8.5 3 12 3zM5.8 12.5l2 1.3 2.1-1.3 2.1 1.3 2.1-1.3 2.1 1.3 2-1.3',
  friends: 'M9 4.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M15.5 4.8a3.3 3.3 0 0 1 0 6.4M18 14.6c2.1.8 3.5 2.7 3.5 5.4',
  pen: 'M4 20l1-4.5L15.5 5l3.5 3.5L8.5 19zM13.5 7l3.5 3.5M4 20h5',
  bunny: 'M9.5 10C8 6 8 3 9.5 3s2 3 1.5 7M14.5 10c1.5-4 1.5-7 0-7s-2 3-1.5 7M12 9.5a6 5.5 0 1 1 0 11a6 5.5 0 1 1 0-11zM10 14h.01M14 14h.01M11 17h2'
};
const EMOJI_ICON = {};
[
  ['coin', '🪙💰🐷🍀'], ['star', '⭐🌠'], ['check', '✓✅✔'], ['cross', '❌'], ['lock', '🔒'],
  ['medal', '🎖🏅🥉🥈🥇'], ['gem', '💎'], ['fire', '🔥☄'], ['rocket', '🚀'], ['crown', '👑'], ['trophy', '🏆'],
  ['snow', '❄⛄'], ['magnet', '🧲'], ['spring', '🌀'], ['shirt', '👕🎭'], ['candy', '🍬'], ['gift', '🎁'],
  ['chest', '📦🗝🎰'], ['jump', '🦘🦿'], ['calendar', '📅📆'], ['gamepad', '🎮🕹'], ['list', '📋'], ['warn', '⚠'],
  ['shield', '🛡😇'], ['target', '👾⚔🏹🎯🔫'], ['brick', '🧱'], ['clock', '⏱⌛🕐'], ['wheel', '🎡'], ['wrench', '🛠'],
  ['chart', '📈📊'], ['flag', '🏟🧭🗺🏔🌌'], ['sound', '🔊'], ['mute', '🔇'], ['pumpkin', '🎃'], ['tree', '🎄'],
  ['propeller', '🧢'], ['pause', '⏸'], ['gear', '⚙'], ['ticket', '🎟'], ['home', '🏠'], ['refresh', '🔄'],
  ['music', '🎵'], ['image', '🎨'], ['save', '💾'], ['copy', '📤'], ['download', '⬇'], ['upload', '📥'], ['folder', '📂'], ['egg', '🥚🐣'], ['friends', '👥'], ['pen', '✏'], ['bunny', '🐰🐇']
].forEach(([name, list]) => { for (const ch of Array.from(list)) EMOJI_ICON[ch] = name; });

// эмодзи (в т. ч. составные через ZWJ) + пробел после него
const EMOJI_RE = /(?:[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}]️?(?:‍[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]️?)*)( ?)/gu;
const SVGNS = 'http://www.w3.org/2000/svg';
function iconEl(name) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'ic ic-' + name);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(SVGNS, 'use');
  u.setAttribute('href', '#i-' + name);
  u.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#i-' + name);
  svg.appendChild(u);
  return svg;
}
function iconHTML(name) { return `<svg class="ic ic-${name}" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${name}"></use></svg>`; }
(function buildSprite() {
  let html = '<svg id="iconSprite" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">';
  for (const k in ICON_PATHS) html += `<symbol id="i-${k}" viewBox="0 0 24 24"><path d="${ICON_PATHS[k]}"/></symbol>`;
  document.body.insertAdjacentHTML('afterbegin', html + '</svg>');
})();
function iconizeText(node) {
  const txt = node.nodeValue;
  EMOJI_RE.lastIndex = 0;
  if (!txt || !EMOJI_RE.test(txt)) return;
  EMOJI_RE.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let last = 0, m;
  while ((m = EMOJI_RE.exec(txt))) {
    if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
    const base = Array.from(m[0])[0];
    const name = EMOJI_ICON[base];
    if (name) { frag.appendChild(iconEl(name)); if (m[1]) frag.appendChild(document.createTextNode(' ')); }
    last = m.index + m[0].length;
  }
  if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
  if (node.parentNode) node.parentNode.replaceChild(frag, node);
}
const ICON_SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, svg: 1, CANVAS: 1 };
function iconize(root) {
  if (!root) return;
  if (root.nodeType === 3) { iconizeText(root); return; }
  if (root.nodeType !== 1 || ICON_SKIP[root.nodeName]) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) { const p = n.parentNode; return p && (ICON_SKIP[p.nodeName] || (p.closest && p.closest('svg'))) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
  });
  const list = [];
  while (walker.nextNode()) list.push(walker.currentNode);
  list.forEach(iconizeText);
}
// (замена эмодзи на иконки отключена: интерфейс снова с эмодзи)
// Те же иконки для холста (колесо фортуны, замки на миниатюрах)
const iconPathCache = {};
function drawIcon(c, name, x, y, size, color, fill, lw) {
  const d = ICON_PATHS[name];
  if (!d || typeof Path2D === 'undefined') return;
  const p = iconPathCache[name] || (iconPathCache[name] = new Path2D(d));
  c.save();
  c.translate(x - size / 2, y - size / 2);
  c.scale(size / 24, size / 24);
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (fill) { c.fillStyle = fill; c.fill(p); }
  c.strokeStyle = color || '#26231f'; c.lineWidth = lw || 2;
  c.stroke(p);
  c.restore();
}

// ==========================================================
// 1. ЗВУКОВОЙ ДВИЖОК (Web Audio API: слои, шум, фильтры, огибающие)
// ==========================================================
const AudioCtor = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtor();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.85;
const masterComp = audioCtx.createDynamicsCompressor();
masterGain.connect(masterComp);
masterComp.connect(audioCtx.destination);
let soundEnabled = true;

const noiseBuf = (function () {
  const len = audioCtx.sampleRate;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
})();

function ensureAudio() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function tone(o) {
  const now = audioCtx.currentTime + (o.t0 || 0);
  const dur = o.dur || 0.2;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f0, now);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(o.vol || 0.15, now + (o.attack || 0.006));
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  if (o.vib) {
    const lfo = audioCtx.createOscillator();
    const lg = audioCtx.createGain();
    lfo.frequency.value = o.vibRate || 20;
    lg.gain.value = o.vib;
    lfo.connect(lg);
    lg.connect(osc.frequency);
    lfo.start(now);
    lfo.stop(now + dur + 0.05);
  }
  if (o.filter) {
    const fl = audioCtx.createBiquadFilter();
    fl.type = o.filter.type;
    fl.frequency.value = o.filter.f;
    fl.Q.value = o.filter.q || 1;
    osc.connect(fl);
    fl.connect(g);
  } else {
    osc.connect(g);
  }
  g.connect(masterGain);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

function noise(o) {
  const now = audioCtx.currentTime + (o.t0 || 0);
  const dur = o.dur || 0.1;
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuf;
  const fl = audioCtx.createBiquadFilter();
  fl.type = o.type || 'bandpass';
  fl.frequency.setValueAtTime(o.f || 1000, now);
  if (o.f1) fl.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), now + dur);
  fl.Q.value = o.q || 1;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(o.vol || 0.15, now + (o.attack || 0.003));
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(fl);
  fl.connect(g);
  g.connect(masterGain);
  src.start(now, Math.random() * 0.4);
  src.stop(now + dur + 0.05);
}

const loops = {};
function startLoop(name) {
  if (!soundEnabled || loops[name]) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(name === 'jetpack' ? 0.15 : 0.07, now + 0.15);
  g.connect(masterGain);
  const srcs = [];
  if (name === 'jetpack') {
    const s = audioCtx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;
    s.connect(lp);
    lp.connect(g);
    s.start();
    srcs.push(s);
    const o = audioCtx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 58;
    const og = audioCtx.createGain();
    og.gain.value = 0.22;
    o.connect(og);
    og.connect(g);
    o.start();
    srcs.push(o);
  } else {
    const o = audioCtx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 96;
    const trem = audioCtx.createGain();
    trem.gain.value = 0.5;
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 26;
    const lg = audioCtx.createGain();
    lg.gain.value = 0.5;
    lfo.connect(lg);
    lg.connect(trem.gain);
    o.connect(trem);
    trem.connect(g);
    o.start();
    lfo.start();
    srcs.push(o, lfo);
    const s = audioCtx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400;
    const ng = audioCtx.createGain();
    ng.gain.value = 0.12;
    s.connect(hp);
    hp.connect(ng);
    ng.connect(g);
    s.start();
    srcs.push(s);
  }
  loops[name] = {
    stop() {
      const n = audioCtx.currentTime;
      g.gain.cancelScheduledValues(n);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), n);
      g.gain.exponentialRampToValueAtTime(0.0001, n + 0.12);
      srcs.forEach((s) => {
        try { s.stop(n + 0.15); } catch (e) {}
      });
    }
  };
}
function stopLoop(name) {
  if (loops[name]) {
    loops[name].stop();
    delete loops[name];
  }
}
function stopAllLoops() {
  Object.keys(loops).forEach(stopLoop);
}

function playSound(type) {
  if (!soundEnabled) return;
  ensureAudio();
  switch (type) {
    case 'jump': // мягкий «бойнг»
      tone({ type: 'sine', f0: 250, f1: 560, dur: 0.17, vol: 0.2 });
      tone({ type: 'triangle', f0: 125, f1: 280, dur: 0.17, vol: 0.08 });
      noise({ type: 'lowpass', f: 900, dur: 0.03, vol: 0.05 });
      break;
    case 'spring': // пружина: гулкий дрожащий бойнг
      tone({ type: 'sine', f0: 320, f1: 980, dur: 0.42, vol: 0.22, vib: 26, vibRate: 30 });
      tone({ type: 'triangle', f0: 160, f1: 480, dur: 0.42, vol: 0.09, vib: 12, vibRate: 30 });
      noise({ type: 'highpass', f: 3000, dur: 0.04, vol: 0.06 });
      break;
    case 'shoot': // хлопок выстрела
      noise({ type: 'bandpass', f: 2400, f1: 500, q: 2, dur: 0.1, vol: 0.2 });
      tone({ type: 'sine', f0: 1100, f1: 170, dur: 0.1, vol: 0.14 });
      break;
    case 'break': // треск ломающейся платформы
      noise({ type: 'bandpass', f: 1900, f1: 420, q: 1.5, dur: 0.13, vol: 0.3 });
      noise({ type: 'bandpass', f: 1300, f1: 300, q: 1.5, dur: 0.1, vol: 0.22, t0: 0.05 });
      tone({ type: 'square', f0: 120, f1: 50, dur: 0.12, vol: 0.08, filter: { type: 'lowpass', f: 400 } });
      break;
    case 'coin': // звонкая монета
      tone({ type: 'sine', f0: 1568, dur: 0.28, vol: 0.17 });
      tone({ type: 'sine', f0: 2093, dur: 0.38, vol: 0.15, t0: 0.07 });
      tone({ type: 'triangle', f0: 3136, dur: 0.22, vol: 0.04, t0: 0.07 });
      break;
    case 'powerup':
      [392, 494, 587, 784].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.2, vol: 0.13, t0: i * 0.06 }));
      break;
    case 'kill': // «шлёп» убитого монстра
      noise({ type: 'lowpass', f: 1100, f1: 180, dur: 0.16, vol: 0.28 });
      tone({ type: 'sine', f0: 420, f1: 80, dur: 0.16, vol: 0.18 });
      break;
    case 'arena_up':
      [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.55, vol: 0.14, t0: i * 0.1 }));
      tone({ type: 'sine', f0: 262, dur: 0.9, vol: 0.12 });
      break;
    case 'gameover':
      tone({ type: 'sawtooth', f0: 520, f1: 80, dur: 0.75, vol: 0.16, vib: 18, vibRate: 9, filter: { type: 'lowpass', f: 1400 } });
      noise({ type: 'lowpass', f: 260, f1: 60, dur: 0.25, vol: 0.3, t0: 0.6 });
      break;
    case 'thunder':
      noise({ type: 'lowpass', f: 1500, f1: 70, dur: 0.95, vol: 0.5, attack: 0.01 });
      tone({ type: 'sine', f0: 70, f1: 30, dur: 0.85, vol: 0.3 });
      break;
    case 'fireball':
      noise({ type: 'bandpass', f: 400, f1: 1500, q: 1, dur: 0.35, vol: 0.12 });
      break;
    case 'warn':
      tone({ type: 'sine', f0: 660, dur: 0.1, vol: 0.07 });
      tone({ type: 'sine', f0: 660, dur: 0.1, vol: 0.07, t0: 0.16 });
      break;
    case 'click':
      tone({ type: 'square', f0: 880, f1: 600, dur: 0.04, vol: 0.05 });
      break;
    case 'combo':
      tone({ type: 'triangle', f0: 660, f1: 1320, dur: 0.18, vol: 0.12 });
      tone({ type: 'sine', f0: 990, f1: 1980, dur: 0.22, vol: 0.08, t0: 0.06 });
      break;
  }
}


// ==========================================================
// 1.5. МУЗЫКА: генерируется прямо в коде (Web Audio), у каждой арены своя тема. Работает офлайн.
// Ноты планируются заранее раз в ~90 мс, поэтому на плавность игры музыка не влияет.
// ==========================================================
const musicGain = audioCtx.createGain();
musicGain.gain.value = 0.0001;
musicGain.connect(masterComp);
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11],
  penta: [0, 2, 4, 7, 9], minpenta: [0, 3, 5, 7, 10], hira: [0, 2, 3, 7, 8], hijaz: [0, 1, 4, 5, 7, 8, 10]
};
// bpm, тональность (MIDI), лад, гармония (ступени), тембры, энергия (бас/ударные)
const MUSIC_THEMES = [
  { bpm: 112, root: 60, scale: 'major', prog: [0, 3, 4, 3], lead: 'triangle', bass: 'triangle', pad: 'sine', energy: 1, hat: true },
  { bpm: 96, root: 62, scale: 'penta', prog: [0, 3, 1, 2], lead: 'sine', bass: 'triangle', pad: 'sine', energy: 0, hat: false },
  { bpm: 86, root: 64, scale: 'lydian', prog: [0, 1, 4, 3], lead: 'sine', bass: 'sine', pad: 'triangle', energy: 0, hat: false, arpOct: 1 },
  { bpm: 100, root: 57, scale: 'minor', prog: [0, 5, 3, 4], lead: 'triangle', bass: 'sine', pad: 'sine', energy: 1, hat: true, arpOct: 1 },
  { bpm: 128, root: 52, scale: 'phrygian', prog: [0, 1, 0, 6], lead: 'sawtooth', bass: 'sawtooth', pad: 'triangle', energy: 2, hat: true, cut: 1400, kick: true },
  { bpm: 118, root: 57, scale: 'minor', prog: [0, 5, 2, 6], lead: 'sawtooth', bass: 'square', pad: 'sawtooth', energy: 2, hat: true, cut: 1800, kick: true },
  { bpm: 92, root: 60, scale: 'major', prog: [0, 4, 5, 3], lead: 'triangle', bass: 'triangle', pad: 'sine', energy: 1, hat: false },
  { bpm: 84, root: 62, scale: 'penta', prog: [0, 2, 3, 1], lead: 'sine', bass: 'sine', pad: 'sine', energy: 0, hat: false, arpOct: 1 },
  { bpm: 76, root: 55, scale: 'lydian', prog: [0, 1, 0, 4], lead: 'sine', bass: 'sine', pad: 'triangle', energy: 0, hat: false, arpOct: 1 },
  { bpm: 104, root: 57, scale: 'hijaz', prog: [0, 1, 0, 3], lead: 'triangle', bass: 'triangle', pad: 'sine', energy: 1, hat: true },
  { bpm: 126, root: 65, scale: 'major', prog: [0, 3, 4, 0], lead: 'square', bass: 'triangle', pad: 'sine', energy: 2, hat: true, cut: 2200 },
  { bpm: 90, root: 57, scale: 'harm', prog: [0, 3, 4, 0], lead: 'triangle', bass: 'sine', pad: 'triangle', energy: 0, hat: false },
  { bpm: 116, root: 55, scale: 'minor', prog: [0, 3, 6, 4], lead: 'square', bass: 'square', pad: 'triangle', energy: 2, hat: true, cut: 1600, kick: true },
  { bpm: 80, root: 62, scale: 'hira', prog: [0, 3, 1, 2], lead: 'sine', bass: 'sine', pad: 'triangle', energy: 0, hat: false, arpOct: 1 },
  { bpm: 72, root: 50, scale: 'minor', prog: [0, 5, 6, 4], lead: 'triangle', bass: 'sawtooth', pad: 'sawtooth', energy: 1, hat: true, cut: 1100, arpOct: 1 },
  // 16: Королевская арена (лига)
  { bpm: 138, root: 52, scale: 'minor', prog: [0, 6, 3, 4], lead: 'sawtooth', bass: 'square', pad: 'sawtooth', energy: 2, hat: true, cut: 2200, kick: true, arpOct: 1 }
];
const BASS_PATS = [[0, 8], [0, 6, 8, 14], [0, 3, 6, 8, 11, 14]];
MUSIC_THEMES.forEach((th, i) => {
  th.id = i + 1;
  const r = seededRandLite('arena-music-' + (i + 1));
  const n = SCALES[th.scale].length;
  const pool = [0, 2, 4, n, 2, 4, -1];
  th.arp = [];
  for (let k = 0; k < 8; k++) th.arp.push(k === 0 ? 0 : pool[Math.floor(r() * pool.length)]);
  th.arp2 = th.arp.map((v, k) => (k % 2 && r() < 0.5 ? (v === -1 ? 2 : v + 1) : v));
  th.bassPat = new Set(BASS_PATS[th.energy]);
});
function seededRandLite(seed) {
  let s = 2166136261;
  for (let i = 0; i < seed.length; i++) { s ^= seed.charCodeAt(i); s = Math.imul(s, 16777619) >>> 0; }
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function scaleMidi(th, deg, oct) {
  const sc = SCALES[th.scale], n = sc.length;
  const o = Math.floor(deg / n), i = ((deg % n) + n) % n;
  return th.root + sc[i] + 12 * (o + oct);
}
function mnote(freq, t, dur, type, vol, cut, attack) {
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.012));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (cut) {
    const f = audioCtx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = cut;
    o.connect(f); f.connect(g);
  } else o.connect(g);
  g.connect(musicGain);
  o.start(t); o.stop(t + dur + 0.05);
}
function mhat(t, vol) {
  const s = audioCtx.createBufferSource();
  s.buffer = noiseBuf;
  const f = audioCtx.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = 7000;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  s.connect(f); f.connect(g); g.connect(musicGain);
  s.start(t, Math.random() * 0.5); s.stop(t + 0.06);
}
function mkick(t) {
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + 0.2);
}
function musicStep(th, s, t) {
  const spb = 60 / th.bpm / 4;
  const bar = Math.floor(s / 16), pos = s % 16;
  const deg = th.prog[bar % th.prog.length];
  if (pos === 0) for (const k of [0, 2, 4]) mnote(midiHz(scaleMidi(th, deg + k, -1)), t, spb * 15.5, th.pad, 0.016, 900, 0.35);
  if (th.bassPat.has(pos)) mnote(midiHz(scaleMidi(th, deg, -2)), t, spb * 3, th.bass, 0.075, 420);
  if (pos % 2 === 0) {
    const a = (bar % 4 === 3 ? th.arp2 : th.arp)[pos / 2];
    if (a >= 0) mnote(midiHz(scaleMidi(th, deg + a, th.arpOct || 0)), t, spb * 1.9, th.lead, 0.034, th.cut || 0);
  }
  if (th.hat && pos % 4 === 2) mhat(t, 0.022);
  if (th.kick && pos % 8 === 0) mkick(t);
}
const music = { theme: null, pending: null, next: 0, step: 0, vol: 0, timer: null };
function musicTick() {
  if (!music.theme || music.vol <= 0.001 || audioCtx.state !== 'running' || document.hidden) { music.next = 0; return; }
  const now = audioCtx.currentTime;
  if (music.next < now) { music.next = now + 0.08; music.step = 0; if (music.pending) { music.theme = music.pending; music.pending = null; } }
  let guard = 0;
  while (music.next < now + 0.3 && guard++ < 16) {
    musicStep(music.theme, music.step, music.next);
    music.next += 60 / music.theme.bpm / 4;
    music.step++;
    if (music.pending && music.step % 16 === 0) { music.theme = music.pending; music.pending = null; music.step = 0; }
  }
}
// Выбор темы и громкости (вызывается при смене экрана/арены/настроек)
function musicSet(arenaId, level) {
  const th = arenaId === 100 ? MUSIC_THEMES[MUSIC_THEMES.length - 1] : MUSIC_THEMES[(arenaId - 1) % MUSIC_THEMES.length];
  if (!music.theme) music.theme = th;
  else if (music.theme !== th) music.pending = th;
  else music.pending = null;
  music.vol = level;
  const now = audioCtx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setTargetAtTime(Math.max(0.0001, level), now, 0.25);
  if (!music.timer) music.timer = setInterval(musicTick, 90);
}

// ==========================================================
// 2. АРЕНЫ: у каждой свои монстры и свои усложнения
// ==========================================================
const ARENAS = [
  {
    id: 1, name: 'Тетрадный полигон', minXP: 0, icon: '📓', scene: 'notebook',
    desc: 'Классический тетрадный лист в клетку',
    twist: 'Чернильные кляксы и ластики-охотники. Спокойный старт.',
    bgTop: '#fdfaf2', bgBottom: '#f1e8d2', gridColor: 'rgba(120,165,190,0.26)',
    marginColor: 'rgba(229,115,115,0.5)', margin: true,
    platNormal: '#68c151', platMoving: '#4da3ff', platBreak: '#a66c38', platVanish: '#ffffff', platBorder: '#262626', glow: false,
    ambient: null, monsters: ['blot', 'eraser'], monsterRate: 1, diff: 0.6, platSpeed: 1.6, wind: 0, slip: 0, hazard: null
  },
  {
    id: 2, name: 'Изумрудный лес', minXP: 120000, icon: '🌲', scene: 'forest',
    desc: 'Древняя чаща со светлячками и мшистыми плитами',
    twist: 'Порывы ветра сносят в сторону. Летучие мыши летают волнами, грибы-споровики.',
    bgTop: '#dcedc8', bgBottom: '#a5d6a7', gridColor: 'rgba(56,142,60,0.16)',
    marginColor: 'rgba(104,159,56,0.45)', margin: false,
    platNormal: '#2e7d32', platMoving: '#00acc1', platBreak: '#6d4c41', platVanish: '#e0f2f1', platBorder: '#1b3b1e', glow: false,
    ambient: { type: 'fireflies', color: '#f4ff81' }, monsters: ['bat', 'shroom'], monsterRate: 1.15, diff: 0.75, platSpeed: 1.8, wind: 0.9, slip: 0, hazard: null
  },
  {
    id: 3, name: 'Ледяной пик', minXP: 350000, icon: '❄️', scene: 'ice',
    desc: 'Заснеженная вершина с северным сиянием',
    twist: 'Скользкий лёд: герой скользит по инерции. Ледяные големы (2 попадания) и снежные духи.',
    bgTop: '#e1f5fe', bgBottom: '#b3e5fc', gridColor: 'rgba(2,136,209,0.18)',
    marginColor: 'rgba(3,169,244,0.4)', margin: false,
    platNormal: '#29b6f6', platMoving: '#5c6bc0', platBreak: '#78909c', platVanish: '#ffffff', platBorder: '#0d47a1', glow: false,
    ambient: { type: 'snow', color: '#ffffff' }, monsters: ['icegolem', 'snowspirit'], monsterRate: 1.2, diff: 0.85, platSpeed: 1.9, wind: 0.5, slip: 0.085, hazard: null
  },
  {
    id: 4, name: 'Пещера кристаллов', minXP: 800000, icon: '💎', scene: 'crystal',
    desc: 'Подземный грот с неоновыми самоцветами',
    twist: 'С потолка падают кристаллы: следи за красными метками. Кристальные жуки и пещерные летучки.',
    bgTop: '#1a1026', bgBottom: '#2d1946', gridColor: 'rgba(186,104,200,0.16)',
    marginColor: 'rgba(0,229,255,0.35)', margin: false,
    platNormal: '#ab47bc', platMoving: '#00e5ff', platBreak: '#8d6e63', platVanish: '#f3e5f5', platBorder: '#00e5ff', glow: true,
    ambient: { type: 'dust', color: '#e040fb' }, monsters: ['crystalbug', 'cavebat'], monsterRate: 1.2, diff: 0.95, platSpeed: 2.0, wind: 0, slip: 0, hazard: 'faller'
  },
  {
    id: 5, name: 'Цитадель Дайр', minXP: 1500000, icon: '🌋', scene: 'volcano',
    desc: 'Вулканическая крепость Тьмы с пеплом и лавой',
    twist: 'Огненные бесы стреляют шарами вниз, горящие черепа. Платформы быстрее.',
    bgTop: '#2a0e0e', bgBottom: '#5a1a12', gridColor: 'rgba(255,87,34,0.16)',
    marginColor: 'rgba(255,61,0,0.45)', margin: false,
    platNormal: '#d84315', platMoving: '#ffb300', platBreak: '#4e342e', platVanish: '#ffccbc', platBorder: '#ff9100', glow: true,
    ambient: { type: 'embers', color: '#ff7a2a' }, monsters: ['imp', 'skull'], monsterRate: 1.25, diff: 1.05, platSpeed: 2.3, wind: 0, slip: 0, hazard: null
  },
  {
    id: 6, name: 'Неоновый Киберполис', minXP: 2800000, icon: '🌆', scene: 'city',
    desc: 'Ночной мегаполис будущего с синтвейв-сеткой',
    twist: 'Дроны-стрелки сканируют экран и бьют лазером вниз. Платформы-глитчи едут очень быстро.',
    bgTop: '#090a1a', bgBottom: '#1c1136', gridColor: 'rgba(0,229,255,0.2)',
    marginColor: 'rgba(255,0,127,0.55)', margin: false,
    platNormal: '#00e676', platMoving: '#00e5ff', platBreak: '#ff1744', platVanish: '#ffffff', platBorder: '#ff007f', glow: true,
    ambient: { type: 'rain', color: '#7df9ff' }, monsters: ['drone', 'bot'], monsterRate: 1.3, diff: 1.15, platSpeed: 2.8, wind: 0, slip: 0, hazard: null
  },
  {
    id: 7, name: 'Божественный Олимп', minXP: 4800000, icon: '👑', scene: 'olympus',
    desc: 'Золотая арена среди звёзд и мраморных облаков',
    twist: 'Молнии Зевса бьют по золотым меткам, сильный ветер, гарпии и мраморные стражи.',
    bgTop: '#1c1635', bgBottom: '#3a2b63', gridColor: 'rgba(255,213,79,0.22)',
    marginColor: 'rgba(255,215,0,0.6)', margin: false,
    platNormal: '#ffd54f', platMoving: '#4dd0e1', platBreak: '#a1887f', platVanish: '#fff8e1', platBorder: '#ffffff', glow: true,
    ambient: { type: 'motes', color: '#ffe082' }, monsters: ['harpy', 'wraith'], monsterRate: 1.35, diff: 1.25, platSpeed: 2.4, wind: 1.1, slip: 0, hazard: 'lightning'
  },
  {
    id: 8, name: 'Подводное царство', minXP: 7500000, icon: '🌊', scene: 'ocean',
    desc: 'Коралловый риф с лучами света и пузырьками',
    twist: 'Течение сносит в стороны, всё немного скользит. Медузы, пираньи.',
    bgTop: '#b3ecff', bgBottom: '#0a5a8c', gridColor: 'rgba(255,255,255,0.14)',
    marginColor: 'rgba(255,255,255,0.3)', margin: false,
    platNormal: '#ff8a65', platMoving: '#26c6da', platBreak: '#8d6e63', platVanish: '#e1f5fe', platBorder: '#01405f', glow: false,
    ambient: { type: 'dust', color: '#e1f8ff' }, monsters: ['jelly', 'piranha'], monsterRate: 1.25, diff: 1.1, platSpeed: 2.1, wind: 0.7, slip: 0.05, hazard: null
  },
  {
    id: 9, name: 'Космическая станция', minXP: 11000000, icon: '🪐', scene: 'space',
    desc: 'Орбита далёкой планеты, кольца и туманности',
    twist: 'Слабая гравитация: скольжение как в невесомости. Метеориты падают по меткам, НЛО стреляют вниз.',
    bgTop: '#05040f', bgBottom: '#1a1245', gridColor: 'rgba(140,120,255,0.15)',
    marginColor: 'rgba(0,229,255,0.4)', margin: false,
    platNormal: '#7c4dff', platMoving: '#00e5ff', platBreak: '#90a4ae', platVanish: '#ffffff', platBorder: '#e0e0ff', glow: true,
    ambient: { type: 'motes', color: '#ffffff' }, monsters: ['ufo', 'meteor'], monsterRate: 1.35, diff: 1.3, platSpeed: 2.6, wind: 0, slip: 0.06, hazard: 'faller', hazardLook: 'rock'
  },
  {
    id: 10, name: 'Пустыня Миражей', minXP: 15500000, icon: '🏜️', scene: 'desert',
    desc: 'Раскалённые дюны, пирамиды и марево',
    twist: 'Песчаные бури сильно сносят в стороны. Скорпионы и стервятники, а с неба падают валуны по меткам.',
    bgTop: '#ffe6b0', bgBottom: '#f6b866', gridColor: 'rgba(160,100,40,0.17)',
    marginColor: 'rgba(160,100,40,0.4)', margin: false,
    platNormal: '#c98b4b', platMoving: '#26a69a', platBreak: '#8d6e63', platVanish: '#fff3e0', platBorder: '#5d3a12', glow: false,
    ambient: { type: 'dust', color: '#fff1c1' }, monsters: ['scorpion', 'vulture'], monsterRate: 1.35, diff: 1.3, platSpeed: 2.4, wind: 1.25, slip: 0, hazard: 'faller', hazardLook: 'rock'
  },
  {
    id: 11, name: 'Конфетное королевство', minXP: 21000000, icon: '🍭', scene: 'candy',
    desc: 'Сладкие холмы, леденцы и карамельные трости',
    twist: 'Глазурь скользкая, как лёд, а платформы быстрые. Мармеладки и летающие леденцы.',
    bgTop: '#ffeaf5', bgBottom: '#ffc1e0', gridColor: 'rgba(255,105,180,0.2)',
    marginColor: 'rgba(255,105,180,0.4)', margin: false,
    platNormal: '#ff7eb6', platMoving: '#6fd8ff', platBreak: '#c39a6b', platVanish: '#ffffff', platBorder: '#8e2a62', glow: false,
    ambient: { type: 'snow', color: '#ffffff' }, monsters: ['gumdrop', 'lolli'], monsterRate: 1.4, diff: 1.35, platSpeed: 2.7, wind: 0.3, slip: 0.075, hazard: null
  },
  {
    id: 12, name: 'Проклятое кладбище', minXP: 29000000, icon: '🪦', scene: 'graveyard',
    desc: 'Лунная ночь, туман и покосившиеся надгробия',
    twist: 'Молнии бьют по меткам, призраки парят волнами, зомби-шатуны выдерживают 2 попадания.',
    bgTop: '#171b2c', bgBottom: '#3a3f5e', gridColor: 'rgba(150,170,220,0.13)',
    marginColor: 'rgba(150,170,220,0.3)', margin: false,
    platNormal: '#6d7a8c', platMoving: '#9575cd', platBreak: '#5d4037', platVanish: '#cfd8dc', platBorder: '#c5cae9', glow: true,
    ambient: { type: 'fireflies', color: '#b9f6ca' }, monsters: ['ghost', 'zombie'], monsterRate: 1.45, diff: 1.45, platSpeed: 2.7, wind: 0.6, slip: 0, hazard: 'lightning'
  },
  {
    id: 13, name: 'Часовая цитадель', minXP: 40000000, icon: '⚙️', scene: 'clockwork',
    desc: 'Паровой механизм из шестерён, труб и огромных часов',
    twist: 'Самые быстрые платформы. Шестерёнки падают по меткам, паровые дроны стреляют, шестерни-стражи выдерживают 2 удара.',
    bgTop: '#4a3320', bgBottom: '#7a5230', gridColor: 'rgba(255,193,7,0.15)',
    marginColor: 'rgba(255,193,7,0.4)', margin: false,
    platNormal: '#b8860b', platMoving: '#26c6da', platBreak: '#5d4037', platVanish: '#ffe082', platBorder: '#2e1b0a', glow: false,
    ambient: { type: 'dust', color: '#ffcc80' }, monsters: ['gear', 'steambot'], monsterRate: 1.5, diff: 1.55, platSpeed: 3.1, wind: 0, slip: 0, hazard: 'faller', hazardLook: 'gear'
  },
  {
    id: 14, name: 'Небесный сад Сакуры', minXP: 54000000, icon: '🌸', scene: 'sakura',
    desc: 'Парящие острова, розовая луна и вечный лепесткопад',
    twist: 'Ветер лепестков сильно сносит и чуть скользит. Лисы-кицунэ летают петлями, они-стражи выдерживают 2 удара, а каменные фонари падают по красным меткам.',
    bgTop: '#ffe3f1', bgBottom: '#d9a7e8', gridColor: 'rgba(200,90,160,0.16)',
    marginColor: 'rgba(233,30,99,0.35)', margin: false,
    platNormal: '#f06292', platMoving: '#7e57c2', platBreak: '#a1887f', platVanish: '#fff0f6', platBorder: '#6a1b4d', glow: false,
    ambient: { type: 'snow', color: '#ffc1e3' }, monsters: ['kitsune', 'oni'], monsterRate: 1.55, diff: 1.7, platSpeed: 3.3, wind: 1.0, slip: 0.04, hazard: 'faller', hazardLook: 'lantern'
  },
  {
    id: 15, name: 'Врата Бесконечности', minXP: 72000000, icon: '🌌', scene: 'void',
    desc: 'Чёрная дыра, разломы реальности и радужное сияние края вселенной',
    twist: 'ФИНАЛ. Молнии и осколки пустоты падают по меткам вперемешку, ветер дёргает героя. Глаза Бездны стреляют, разломы носятся зигзагами. Платформы быстрее всех!',
    bgTop: '#02010a', bgBottom: '#240a45', gridColor: 'rgba(179,136,255,0.16)',
    marginColor: 'rgba(255,64,129,0.5)', margin: false,
    platNormal: '#b388ff', platMoving: '#18ffff', platBreak: '#ff4081', platVanish: '#ffffff', platBorder: '#ffffff', glow: true,
    ambient: { type: 'motes', color: '#e1bee7' }, monsters: ['voideye', 'riftling'], monsterRate: 1.65, diff: 1.85, platSpeed: 3.5, wind: 0.8, slip: 0.03, hazard: 'both', hazardLook: 'shard'
  }
];

// Типы монстров
const MONSTER_TYPES = {
  blot:       { w: 48, h: 36, hp: 1, move: 'patrol', speed: 1.1, range: 28 },
  eraser:     { w: 46, h: 34, hp: 1, move: 'patrol', speed: 1.7, range: 40 },
  bat:        { w: 46, h: 30, hp: 1, move: 'sine', speed: 1.2, amp: 34 },
  shroom:     { w: 40, h: 38, hp: 1, move: 'static' },
  icegolem:   { w: 50, h: 46, hp: 2, move: 'patrol', speed: 0.7, range: 24 },
  snowspirit: { w: 40, h: 40, hp: 1, move: 'sine', speed: 1.7, amp: 46 },
  crystalbug: { w: 42, h: 38, hp: 1, move: 'hover', speed: 0.9, range: 34 },
  cavebat:    { w: 46, h: 30, hp: 1, move: 'sine', speed: 1.7, amp: 30 },
  imp:        { w: 42, h: 42, hp: 1, move: 'hover', speed: 0.8, range: 30, shoots: true, cd: 170, fire: '#ff6a00' },
  skull:      { w: 40, h: 40, hp: 1, move: 'patrol', speed: 1.6, range: 44 },
  drone:      { w: 48, h: 30, hp: 1, move: 'sweep', speed: 2.4, shoots: true, cd: 210, fire: '#00e5ff' },
  bot:        { w: 42, h: 40, hp: 1, move: 'sine', speed: 1.4, amp: 40 },
  harpy:      { w: 50, h: 40, hp: 1, move: 'sine', speed: 2.1, amp: 52 },
  wraith:     { w: 50, h: 48, hp: 2, move: 'patrol', speed: 1.0, range: 30 },
  jelly:      { w: 44, h: 44, hp: 1, move: 'sine', speed: 1.1, amp: 38 },
  piranha:    { w: 46, h: 32, hp: 1, move: 'patrol', speed: 2.0, range: 50 },
  ufo:        { w: 52, h: 30, hp: 1, move: 'sweep', speed: 2.2, shoots: true, cd: 200, fire: '#76ff03' },
  meteor:     { w: 44, h: 44, hp: 2, move: 'patrol', speed: 1.0, range: 30 },
  scorpion:   { w: 48, h: 34, hp: 1, move: 'patrol', speed: 1.5, range: 46 },
  vulture:    { w: 52, h: 38, hp: 1, move: 'sine', speed: 1.6, amp: 50 },
  gumdrop:    { w: 42, h: 40, hp: 1, move: 'patrol', speed: 1.2, range: 34 },
  lolli:      { w: 40, h: 46, hp: 1, move: 'sine', speed: 1.9, amp: 40 },
  ghost:      { w: 42, h: 46, hp: 1, move: 'sine', speed: 1.4, amp: 46 },
  zombie:     { w: 44, h: 50, hp: 2, move: 'patrol', speed: 0.9, range: 28 },
  gear:       { w: 46, h: 46, hp: 2, move: 'patrol', speed: 1.4, range: 36 },
  steambot:   { w: 46, h: 40, hp: 1, move: 'sweep', speed: 2.0, shoots: true, cd: 190, fire: '#ffcc80' },
  kitsune:    { w: 44, h: 42, hp: 1, move: 'sine', speed: 1.9, amp: 46 },
  oni:        { w: 50, h: 52, hp: 2, move: 'patrol', speed: 1.3, range: 34 },
  voideye:    { w: 50, h: 46, hp: 2, move: 'hover', speed: 0.9, range: 38, shoots: true, cd: 150, fire: '#e040fb' },
  riftling:   { w: 46, h: 42, hp: 1, move: 'sine', speed: 2.4, amp: 58 },
  // монстры сезонных событий
  jackghost:  { w: 44, h: 46, hp: 1, move: 'sine', speed: 1.5, amp: 44 },
  snowgremlin:{ w: 44, h: 42, hp: 2, move: 'patrol', speed: 1.3, range: 36 },
  evilbunny:  { w: 44, h: 48, hp: 1, move: 'patrol', speed: 1.7, range: 46 }
};

// ==========================================================
// 3. ГРАФИЧЕСКИЕ ПОМОЩНИКИ
// ==========================================================
const OUT = '#1a1a1a';
// На телефонах размытые тени (shadowBlur) на канвасе — главный источник лагов, отключаем
const COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
let LOW_FX = COARSE;   // экономный режим (см. настройки «Графика»)
let autoLow = false;   // включается сам, если игра тормозит
let idleDirty = true;   // нужно ли перерисовать игровое поле под меню/паузой

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

function rr(c, x, y, w, h, r, fill, stroke) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke !== false) c.stroke();
}
function ci(c, x, y, r, fill, stroke) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke !== false) c.stroke();
}
function ell(c, x, y, rx, ry, fill, stroke, rot) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke !== false) c.stroke();
}
function pg(c, pts, fill, stroke) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke !== false) c.stroke();
}
function drawHeart(c, x, y, k, fill) {
  c.beginPath();
  c.moveTo(x, y + k * 0.9);
  c.bezierCurveTo(x - k * 1.7, y - k * 0.2, x - k * 0.9, y - k * 1.5, x, y - k * 0.5);
  c.bezierCurveTo(x + k * 0.9, y - k * 1.5, x + k * 1.7, y - k * 0.2, x, y + k * 0.9);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  c.stroke();
}
function starPoly(c, r1, r2, n) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (i * Math.PI) / n - Math.PI / 2;
    if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
}
// Помощники для сезонных скинов (необычные силуэты: у каждого свой образ, не «человечек» из магазина)
function sGlow(c, x, y, r, rgba) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba); g.addColorStop(1, rgba.replace(/[\d.]+\)$/, '0)'));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}
function sSpark(c, x, y, r, col) { c.save(); c.translate(x, y); starPoly(c, r, r * 0.35, 4); c.fillStyle = col; c.fill(); c.restore(); }
function sHand(c, shoot, col) { if (shoot) { rr(c, -2.5, -33, 5, 8, 2, col); ci(c, 0, -35, 4.5, col); } }
function sFace(c, x, y, big) {
  ci(c, x, y, big, '#fff'); ci(c, x + 0.9, y + 0.3, big * 0.5, '#111', false);
  ci(c, x + 7.5, y, big, '#fff'); ci(c, x + 8.4, y + 0.3, big * 0.5, '#111', false);
}

function defaultEyes(c) {
  ci(c, 2, -8, 2.8, '#111', false);
  ci(c, 9.5, -8, 2.8, '#111', false);
  ci(c, 3, -9.2, 1, '#fff', false);
  ci(c, 10.5, -9.2, 1, '#fff', false);
}

// ==========================================================
// 4. СКИНЫ: узнаваемые персонажи (рисуются в векторе, лицом вправо)
// ==========================================================
const SKINS = [
  {
    id: 'classic', name: 'Классический Дудлер', rarity: 'common', rarityName: 'Обычный',
    desc: 'Тот самый зелёный прыгун из оригинала', price: 0, icon: '🟢', skin: '#7ed957', bulletColor: '#d9534f',
    full(c, t, shoot) {
      c.strokeStyle = '#242424'; c.lineWidth = 3;
      for (const ox of [-11, -3, 5, 12]) { c.beginPath(); c.moveTo(ox, 14); c.lineTo(ox, 22); c.stroke(); }
      c.lineWidth = 2.2;
      rr(c, -18, -18, 36, 34, [18, 18, 8, 8], '#7ed957');
      c.fillStyle = '#3b8c2a'; c.fillRect(-16, 2, 32, 5); c.fillRect(-16, 9, 32, 4);
      c.lineWidth = 2;
      if (shoot) rr(c, -5, -32, 10, 15, 4, '#7ed957'); else rr(c, 10, -10, 15, 9, 4, '#7ed957');
      ci(c, 1, -8, 2.7, '#1b1b1b', false); ci(c, 9, -8, 2.7, '#1b1b1b', false);
    }
  },
  {
    id: 'amongus', name: 'Импостер (Among Us)', rarity: 'common', rarityName: 'Обычный',
    desc: 'Красный скафандр с голубым визором и рюкзаком', price: 45, icon: '📮', skin: '#e53935', bulletColor: '#ff1744',
    full(c, t, shoot) {
      rr(c, -21, -5, 9, 19, 3, '#b71c1c');
      rr(c, -11, 14, 9, 9, 3, '#e53935'); rr(c, 3, 14, 9, 9, 3, '#e53935');
      rr(c, -15, -21, 30, 38, [15, 15, 6, 6], '#e53935');
      c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(-13, 9, 26, 6);
      rr(c, 1, -15, 17, 12, 6, '#a9e4ff');
      rr(c, 5, -13, 9, 3, 1.5, 'rgba(255,255,255,0.85)', false);
      if (shoot) rr(c, -4, -29, 8, 9, 3, '#e53935');
    }
  },
  {
    id: 'mario', name: 'Усатый Водопроводчик', rarity: 'common', rarityName: 'Обычный',
    desc: 'Красная кепка с буквой M, усы и синий комбинезон', price: 50, icon: '🍄',
    skin: '#f6c58e', torso: '#d92b1f', legs: '#2759c9', shoe: '#6b3b1a', arm: '#d92b1f', hand: '#ffffff', bulletColor: '#ff7a18',
    look(c, t, f) {
      rr(c, -8, 10, 16, 8, 2, '#2759c9');
      rr(c, -8, 5, 4, 7, 1, '#2759c9'); rr(c, 4, 5, 4, 7, 1, '#2759c9');
      ci(c, -6, 10, 1.3, '#ffd400', false); ci(c, 6, 10, 1.3, '#ffd400', false);
      rr(c, -15, -9, 5, 9, 2, '#4a2b14');
      ci(c, 14, -4, 3.6, '#f0a77a');
      ell(c, 10, 1, 6.5, 2.8, '#3b2312');
      c.beginPath(); c.arc(0, -8, 15.6, Math.PI * 1.04, Math.PI * 1.96); c.closePath();
      c.fillStyle = '#d92b1f'; c.fill(); c.stroke();
      rr(c, 3, -15, 17, 5, 2, '#d92b1f');
      ci(c, 2, -17, 5, '#fff');
      c.save(); c.translate(2, -17); c.scale(f, 1);
      c.fillStyle = '#d92b1f'; c.font = 'bold 8px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('M', 0, 0.5); c.restore();
    }
  },
  {
    id: 'creeper', name: 'Крипер (Minecraft)', rarity: 'rare', rarityName: 'Редкий',
    desc: 'Пиксельный подрывник, стреляющий блоками', price: 60, icon: '🧨',
    skin: '#5fae4f', torso: '#3f8a3a', legs: '#2f6b2e', headShape: 'square', noEyes: true, bullet: 'pixel', bulletColor: '#f44336',
    look(c) {
      c.fillStyle = 'rgba(20,80,20,0.35)';
      for (const p of [[-12, -18], [6, -19], [-8, -3], [9, 1], [-2, -20], [11, -10]]) c.fillRect(p[0], p[1], 4, 4);
      c.fillStyle = '#0d2b0d';
      c.fillRect(-10, -16, 7, 7); c.fillRect(3, -16, 7, 7);
      c.fillRect(-3, -9, 6, 5); c.fillRect(-6, -5, 4, 7); c.fillRect(2, -5, 4, 7);
    }
  },
  {
    id: 'steve', name: 'Стив (Minecraft)', rarity: 'common', rarityName: 'Обычный',
    desc: 'Кубический шахтёр с бирюзовой футболкой', price: 70, icon: '⛏️',
    skin: '#c68a5b', torso: '#2eb6c4', legs: '#3b3fa8', shoe: '#777777', arm: '#c68a5b', headShape: 'square', noEyes: true, bullet: 'pixel', bulletColor: '#9e9e9e',
    look(c) {
      c.fillStyle = '#4a2d18';
      c.fillRect(-14, -21, 28, 7); c.fillRect(-14, -14, 5, 7); c.fillRect(9, -14, 5, 3);
      c.fillStyle = '#fff'; c.fillRect(-9, -9, 7, 4); c.fillRect(3, -9, 7, 4);
      c.fillStyle = '#3a3d8f'; c.fillRect(-5, -9, 3, 4); c.fillRect(7, -9, 3, 4);
      c.fillStyle = '#a66a42'; c.fillRect(-2, -4, 5, 3);
      c.fillStyle = '#6e3f24'; c.fillRect(-5, 0, 11, 3);
    }
  },
  {
    id: 'pikachu', name: 'Электрическая Мышь', rarity: 'rare', rarityName: 'Редкий',
    desc: 'Жёлтый зверёк с красными щёчками и молнией-хвостом', price: 75, icon: '⚡',
    skin: '#ffd93b', torso: '#ffd93b', legs: '#f1c40f', arm: '#ffd93b', noEyes: true, bullet: 'bolt', bulletColor: '#ffeb3b',
    back(c) {
      pg(c, [[-10, 14], [-22, 13], [-17, 6], [-30, 4], [-22, -9], [-36, -22], [-33, -4], [-41, -1], [-25, 6], [-30, 17]], '#ffd93b');
      pg(c, [[-10, 14], [-22, 13], [-20, 17], [-10, 18]], '#a8691f');
      pg(c, [[-10, -17], [-19, -38], [-3, -21]], '#ffd93b');
      pg(c, [[-17, -33], [-19, -38], [-13, -31]], '#222');
      pg(c, [[2, -21], [10, -40], [14, -17]], '#ffd93b');
      pg(c, [[8, -34], [10, -40], [12, -32]], '#222');
    },
    look(c) {
      ci(c, 3, -8, 3.4, '#111', false); ci(c, 12, -8, 3.4, '#111', false);
      ci(c, 4, -9.5, 1.2, '#fff', false); ci(c, 13, -9.5, 1.2, '#fff', false);
      ci(c, 0, -1, 3.8, '#e53935'); ci(c, 13.5, -1, 3.2, '#e53935');
      ci(c, 15, -5, 1, '#111', false);
      c.beginPath(); c.arc(8, -2, 3, 0.2, Math.PI - 0.2); c.stroke();
      c.fillStyle = '#a8691f'; c.fillRect(-11, 8, 5, 2); c.fillRect(-11, 12, 5, 2);
    }
  },
  {
    id: 'link', name: 'Герой в Зелёном (Zelda)', rarity: 'rare', rarityName: 'Редкий',
    desc: 'Зелёный колпак, остроухий рыцарь Хайрула', price: 80, icon: '🗡️',
    skin: '#f6c58e', torso: '#3f9a34', legs: '#efe3b5', shoe: '#6a4325', arm: '#3f9a34', hand: '#f6c58e', bullet: 'arrow', bulletColor: '#8bc34a',
    look(c) {
      pg(c, [[-14, -6], [-24, -9], [-14, -1]], '#f6c58e');
      rr(c, -11, 12, 22, 3, 1, '#6a4325'); rr(c, -2, 11.5, 5, 4, 1, '#ffd400');
      rr(c, -15, -8, 5, 10, 2, '#f2cf62');
      c.beginPath(); c.arc(0, -8, 15.6, Math.PI * 1.04, Math.PI * 1.96); c.closePath();
      c.fillStyle = '#3f9a34'; c.fill(); c.stroke();
      pg(c, [[-13, -14], [-22, -13], [-34, 0], [-18, -4]], '#3f9a34');
      rr(c, 6, -15, 10, 4, 2, '#f2cf62');
    }
  },
  {
    id: 'pudge', name: 'Pudge (Dota 2)', rarity: 'mythic', rarityName: 'Мифический',
    desc: 'Fresh Meat! Фартук мясника, шрамы и кровавые хуки', price: 85, icon: '🪝',
    skin: '#a9b896', torso: '#ddd6c4', legs: '#5a4630', torsoW: 28, arm: '#a9b896', bullet: 'hook', bulletColor: '#b0b0b0',
    look(c) {
      pg(c, [[-6, -21], [-3, -28], [0, -21], [3, -27], [6, -21]], '#2e5a2a');
      c.strokeStyle = '#5b3a1e'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-9, -17); c.lineTo(-2, -11); c.moveTo(-8, -12); c.lineTo(-4, -16); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      c.beginPath(); c.arc(5, -1, 6.5, 0.1 * Math.PI, 0.9 * Math.PI); c.fillStyle = '#3b0d0d'; c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.fillRect(1, 2, 3, 2.5); c.fillRect(6, 2, 3, 2.5);
      ci(c, -6, 12, 2.6, '#9b1c1c', false); ci(c, 5, 9, 2, '#9b1c1c', false); ci(c, 9, 14, 2.4, '#9b1c1c', false);
      c.strokeStyle = '#8d7b5b'; c.beginPath(); c.moveTo(-14, 6); c.lineTo(14, 6); c.stroke(); c.strokeStyle = OUT;
      c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, -12); c.lineTo(6, -10.5); c.moveTo(8, -10.5); c.lineTo(14, -13); c.stroke(); c.lineWidth = 2;
    }
  },
  {
    id: 'spider', name: 'Паук-Герой', rarity: 'epic', rarityName: 'Эпический',
    desc: 'Красно-синий костюм и паутина из рук', price: 90, icon: '🕷️',
    skin: '#d11f2c', torso: '#d11f2c', legs: '#1e48a8', shoe: '#d11f2c', arm: '#1e48a8', hand: '#d11f2c', noEyes: true, bullet: 'web', bulletColor: '#f5f5f5',
    look(c) {
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.beginPath(); c.moveTo(6, -7); c.lineTo(6 + Math.cos(a) * 16, -7 + Math.sin(a) * 16); c.stroke();
      }
      c.beginPath(); c.arc(6, -7, 6, 0, 6.283); c.stroke();
      c.beginPath(); c.arc(6, -7, 11, 0, 6.283); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 1.8;
      ell(c, 2, -8, 3.8, 5.6, '#fff', true, 0.5);
      ell(c, 11, -8, 3.8, 5.6, '#fff', true, -0.5);
      c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, 6); c.lineTo(0, 18); c.moveTo(-8, 9); c.lineTo(8, 9); c.moveTo(-8, 14); c.lineTo(8, 14); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      pg(c, [[-1, 9], [1, 9], [1, 13], [-1, 13]], '#111', false);
    }
  },
  {
    id: 'vaultboy', name: 'Житель Убежища (Fallout)', rarity: 'rare', rarityName: 'Редкий',
    desc: 'Улыбчивый парень в комбинезоне Vault-Tec', price: 95, icon: '☢️',
    skin: '#ffe2bd', torso: '#2c6fe0', legs: '#2c6fe0', shoe: '#8a5a2b', arm: '#2c6fe0', hand: '#ffffff', bulletColor: '#76ff03',
    look(c) {
      pg(c, [[-6, 5], [0, 12], [6, 5]], '#ffd400');
      ell(c, 2, -21, 13, 6, '#f4d03f'); ell(c, -8, -15, 7, 7, '#f4d03f');
      c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, -12); c.lineTo(5, -12.5); c.moveTo(8, -12.5); c.lineTo(13, -11.5); c.stroke(); c.lineWidth = 2;
      c.lineWidth = 1.9; c.beginPath(); c.arc(6, -3, 6.5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); c.lineWidth = 2;
    }
  },
  {
    id: 'hollow', name: 'Рыцарь (Hollow Knight)', rarity: 'epic', rarityName: 'Эпический',
    desc: 'Белая рогатая маска Халлоунеста и чёрный плащ', price: 100, icon: '🗡️',
    skin: '#f2f2ec', torso: '#1b2130', legs: '#1b2130', arm: '#1b2130', hand: '#1b2130', noEyes: true, bulletColor: '#e0f7fa',
    back(c) {
      pg(c, [[-8, 4], [-21, 23], [9, 23], [11, 4]], '#10131c');
      pg(c, [[-11, -17], [-15, -34], [-4, -20]], '#f2f2ec');
      pg(c, [[5, -21], [11, -36], [13, -17]], '#f2f2ec');
    },
    look(c) {
      ell(c, 3, -6, 3.3, 5.8, '#0a0a10', false); ell(c, 11, -6, 3.3, 5.8, '#0a0a10', false);
      c.beginPath(); c.moveTo(5, 3); c.lineTo(10, 3); c.stroke();
    }
  },
  {
    id: 'sonic', name: 'Сверхзвуковой Ёж', rarity: 'rare', rarityName: 'Редкий',
    desc: 'Синие иголки, красные кроссовки и золотые кольца', price: 105, icon: '💨',
    skin: '#1f64e8', torso: '#1f64e8', legs: '#1f64e8', shoe: '#e53935', arm: '#1f64e8', hand: '#ffffff', noEyes: true, bulletColor: '#ffd54f',
    back(c) {
      pg(c, [[-10, -20], [-31, -24], [-14, -10]], '#1f64e8');
      pg(c, [[-13, -8], [-34, -6], [-12, 3]], '#1f64e8');
      pg(c, [[-8, -26], [-25, -35], [-4, -17]], '#1f64e8');
    },
    look(c) {
      pg(c, [[-3, -21], [2, -31], [9, -21]], '#1f64e8');
      ell(c, 6, 12, 6, 5, '#f6cfa0', false);
      ell(c, 9, -2, 8, 6.5, '#f6cfa0');
      ell(c, 3, -10, 4.4, 6.2, '#fff'); ell(c, 11.5, -10, 4.4, 6.2, '#fff');
      ci(c, 5, -9, 2.9, '#2e9a3a', false); ci(c, 13.3, -9, 2.9, '#2e9a3a', false);
      ci(c, 5.4, -9, 1.7, '#111', false); ci(c, 13.6, -9, 1.7, '#111', false);
      ci(c, 16, -3, 2, '#111', false);
    }
  },
  {
    id: 'naruto', name: 'Ниндзя в Оранжевом', rarity: 'epic', rarityName: 'Эпический',
    desc: 'Светлые колючие волосы, повязка и усики-полоски', price: 110, icon: '🍥',
    skin: '#f6c58f', torso: '#ff7a18', legs: '#ff7a18', shoe: '#1c3f94', arm: '#ff7a18', hand: '#f6c58f', bullet: 'shuriken', bulletColor: '#b0bec5',
    look(c) {
      pg(c, [[-14, -12], [-19, -24], [-9, -19], [-9, -32], [-3, -22], [2, -34], [5, -22], [12, -31], [12, -18], [19, -22], [15, -10]], '#ffc81f');
      rr(c, -15, -16, 30, 5, 1, '#1c3f94');
      rr(c, -4, -16, 11, 5, 1, '#c5ccd6');
      c.strokeStyle = '#7a4a22'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(8, -3); c.lineTo(14, -4); c.moveTo(8, -1); c.lineTo(14, -1); c.moveTo(8, 1); c.lineTo(14, 2); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      c.beginPath(); c.arc(4, -2, 5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      rr(c, -11, 5, 6, 8, 1, '#1a1a1a');
    }
  },
  {
    id: 'juggernaut', name: 'Juggernaut (Dota 2)', rarity: 'mythic', rarityName: 'Мифический',
    desc: 'Маска острова Масок и вихрь клинков Blade Fury', price: 120, icon: '👹',
    skin: '#c63d28', torso: '#d9a066', legs: '#7a1d10', shoe: '#3a2418', arm: '#d9a066', hand: '#d9a066', noEyes: true, bullet: 'shuriken', bulletColor: '#ff9800',
    look(c) {
      c.strokeStyle = '#e6b422'; c.lineWidth = 2; c.beginPath(); c.arc(0, -7, 11.5, 0, 6.283); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      ell(c, 4, -9, 3.8, 1.7, '#111', false, 0.35); ell(c, 11.5, -9, 3.8, 1.7, '#111', false, -0.35);
      c.beginPath(); c.moveTo(8, -6); c.lineTo(8, 1); c.stroke();
      ci(c, -5, -25, 5.5, '#151515'); rr(c, -7, -22, 5, 4, 1, '#151515');
      pg(c, [[-11, 5], [-4, 5], [11, 17], [4, 17]], '#b02a17');
    }
  },
  {
    id: 'batman', name: 'Тёмный Рыцарь', rarity: 'epic', rarityName: 'Эпический',
    desc: 'Чёрный плащ, остроухий капюшон и бэтаранги', price: 125, icon: '🦇',
    skin: '#2a2a30', torso: '#59606b', legs: '#2a2a30', shoe: '#17171b', arm: '#2a2a30', hand: '#17171b', noEyes: true, bullet: 'bat', bulletColor: '#22252b',
    back(c) { pg(c, [[-10, 4], [-25, 25], [-12, 22], [-2, 26], [10, 23], [11, 4]], '#15151a'); },
    look(c) {
      pg(c, [[-11, -17], [-9, -32], [-3, -20]], '#2a2a30');
      pg(c, [[3, -20], [9, -32], [12, -16]], '#2a2a30');
      pg(c, [[-13, -1], [13, -1], [5, 7], [-5, 7]], '#e6b996');
      c.beginPath(); c.moveTo(3, 3); c.lineTo(10, 3); c.stroke();
      ell(c, 4, -8, 3.8, 1.8, '#fff', true, -0.2); ell(c, 12, -8, 3.2, 1.8, '#fff', true, 0.2);
      ell(c, 0, 11, 6.5, 3.8, '#f6d32d'); pg(c, [[-4, 11], [0, 9], [4, 11], [0, 13]], '#111', false);
      rr(c, -11, 15, 22, 3, 1, '#f6d32d');
    }
  },
  {
    id: 'subzero', name: 'Sub-Zero (Mortal Kombat)', rarity: 'epic', rarityName: 'Эпический',
    desc: 'Грандмастер Лин Куэй с ледяными шарами', price: 130, icon: '🧊',
    skin: '#2f63c2', torso: '#2f63c2', legs: '#1d3f85', shoe: '#102a5c', arm: '#2f63c2', hand: '#102a5c', noEyes: true, bulletColor: '#00e5ff',
    look(c) {
      pg(c, [[-13, -2], [14, -2], [11, 6], [-11, 6]], '#16203a');
      ell(c, 4, -9, 3.6, 2.1, '#d7f7ff', false); ell(c, 11.5, -9, 3.2, 2.1, '#d7f7ff', false);
      rr(c, -11, 12, 22, 3, 1, '#cfd8dc');
      pg(c, [[-12, 5], [-5, 5], [-8, 11]], '#cfd8dc', false);
    }
  },
  {
    id: 'scorpion', name: 'Scorpion (Mortal Kombat)', rarity: 'epic', rarityName: 'Эпический',
    desc: 'Get over here! Адский огонь и копьё на цепи', price: 130, icon: '🦂',
    skin: '#e8b920', torso: '#e8b920', legs: '#1e1e1e', shoe: '#1e1e1e', arm: '#e8b920', hand: '#1e1e1e', noEyes: true, bullet: 'hook', bulletColor: '#ff7043',
    look(c) {
      pg(c, [[-13, -2], [14, -2], [11, 6], [-11, 6]], '#1e1e1e');
      ell(c, 4, -9, 3.6, 2.4, '#fff', false); ell(c, 11.5, -9, 3.2, 2.4, '#fff', false);
      rr(c, -11, 13, 22, 3, 1, '#1e1e1e');
      pg(c, [[-11, 5], [-5, 5], [11, 17], [5, 17]], '#1e1e1e', false);
    }
  },
  {
    id: 'cyber', name: 'Киберпанк Ви (2077)', rarity: 'epic', rarityName: 'Эпический',
    desc: 'Неоновый имплант Найт-Сити и лазерные импульсы', price: 145, icon: '🤖',
    skin: '#e9bf9a', torso: '#5b1a8f', legs: '#1d1d2b', shoe: '#00e5ff', arm: '#5b1a8f', hand: '#e9bf9a', bulletColor: '#00e5ff',
    look(c) {
      pg(c, [[-15, -12], [-13, -26], [-6, -20], [-3, -30], [2, -21], [8, -29], [10, -19], [16, -23], [15, -10]], '#15151c');
      ci(c, -3, -28, 1.6, '#ff2d95', false); ci(c, 8, -28.5, 1.6, '#ff2d95', false);
      ci(c, 9.5, -8, 4.2, '#00e5ff'); ci(c, 9.5, -8, 1.6, '#fff', false);
      c.fillStyle = '#00e5ff'; c.fillRect(-11, 9, 22, 2);
      pg(c, [[-8, 5], [0, 12], [8, 5]], '#ffd400');
    }
  },
  {
    id: 'vader', name: 'Тёмный Лорд', rarity: 'mythic', rarityName: 'Мифический',
    desc: 'Чёрный шлем, дыхание и красный меч', price: 150, icon: '🪐',
    skin: '#171717', torso: '#1a1a1a', legs: '#111111', shoe: '#0c0c0c', arm: '#1a1a1a', hand: '#0c0c0c', torsoW: 24, noEyes: true, bullet: 'saber', bulletColor: '#ff1744',
    back(c) { pg(c, [[-11, 4], [-26, 25], [11, 25], [12, 4]], '#0d0d0d'); },
    look(c) {
      pg(c, [[-16, -3], [16, -3], [18, 3], [-18, 3]], '#222');
      ell(c, 7, -3, 8, 9.5, '#2b2b2e');
      ell(c, 4, -9, 3.1, 2.4, '#7a0f0f', false); ell(c, 11, -9, 3.1, 2.4, '#7a0f0f', false);
      pg(c, [[8, -6], [11, -2], [6, -2]], '#444', false);
      c.strokeStyle = '#999'; c.lineWidth = 1;
      c.beginPath(); for (let x = 3; x <= 11; x += 2) { c.moveTo(x, 0); c.lineTo(x, 4); } c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      rr(c, -6, 8, 12, 7, 1, '#2a2a2d');
      ci(c, -3, 11.5, 1.1, '#e53935', false); ci(c, 0, 11.5, 1.1, '#42a5f5', false); ci(c, 3, 11.5, 1.1, '#66bb6a', false);
    }
  },
  {
    id: 'doom', name: 'Палач Рока (DOOM)', rarity: 'mythic', rarityName: 'Мифический',
    desc: 'Зелёная броня и сверхмощные заряды BFG-9000', price: 165, icon: '🪖',
    skin: '#547f3d', torso: '#4a7536', legs: '#34502a', shoe: '#252c20', arm: '#4a7536', hand: '#2c3a26', torsoW: 24, noEyes: true, bulletColor: '#76ff03',
    look(c) {
      rr(c, 0, -14, 16, 8, 3, '#10150f');
      c.fillStyle = '#ffd23f'; c.fillRect(3, -11, 11, 2.4);
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-8, -20); c.lineTo(-8, 2); c.stroke(); c.strokeStyle = OUT; c.lineWidth = 2;
      ci(c, -12, 8, 4.5, '#8b9a82');
      rr(c, -5, 9, 10, 5, 1, '#2c3a26');
    }
  },
  {
    id: 'kratos', name: 'Кратос (God of War)', rarity: 'mythic', rarityName: 'Мифический',
    desc: 'Призрак Спарты с красной татуировкой и пламенем Хаоса', price: 180, icon: '🪓',
    skin: '#e8d9c8', torso: '#e8d9c8', legs: '#5b4331', shoe: '#3a2a1d', arm: '#e8d9c8', hand: '#e8d9c8', bulletColor: '#ff5a00',
    look(c) {
      pg(c, [[-2, -21], [3, -21], [6, -6], [3, 3], [1, -6]], '#c0282d');
      pg(c, [[-10, 0], [14, 0], [11, 10], [0, 12], [-9, 8]], '#dedede');
      c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, -12); c.lineTo(6, -10); c.moveTo(8, -10); c.lineTo(14, -13); c.stroke(); c.lineWidth = 2;
      pg(c, [[-11, 5], [-4, 5], [11, 17], [4, 17]], '#8b1a1a');
      rr(c, -11, 14, 22, 3, 1, '#5b4331');
    }
  },
  {
    id: 'invoker', name: 'Invoker (Dota 2)', rarity: 'arcana', rarityName: 'Аркана',
    desc: 'Три вращающиеся сферы Quas, Wex, Exort и Sunstrike!', price: 220, icon: '🔮',
    skin: '#caa27b', torso: '#f3ead0', legs: '#6b2e8e', shoe: '#d4a82a', arm: '#f3ead0', hand: '#caa27b', torsoW: 24, bulletColor: '#ff6f00',
    back(c) { pg(c, [[-10, 4], [-19, 24], [8, 24], [11, 4]], '#e9dcb0'); },
    look(c, t) {
      c.beginPath(); c.arc(0, -9, 16.4, Math.PI, Math.PI * 2); c.closePath();
      c.fillStyle = '#f3ead0'; c.fill(); c.stroke();
      c.strokeStyle = '#d4a82a'; c.lineWidth = 2; c.beginPath(); c.arc(0, -9, 12.5, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      ci(c, 0, -19, 2.4, '#8e24aa');
      const cols = ['#29b6f6', '#ab47bc', '#ff9800'];
      for (let i = 0; i < 3; i++) {
        const a = t * 0.004 + (i * Math.PI * 2) / 3;
        const ox = Math.cos(a) * 25, oy = -12 + Math.sin(a) * 9;
        ci(c, ox, oy, 5.2, cols[i]);
        ci(c, ox - 1.5, oy - 1.5, 1.4, '#fff', false);
      }
    }
  },
  {
    id: 'sf', name: 'Shadow Fiend (Dota 2)', rarity: 'arcana', rarityName: 'Аркана',
    desc: 'Демон тьмы Невермор с пылающей аурой душ', price: 250, icon: '🔥',
    skin: '#26191c', torso: '#2a1b1f', legs: '#1a1214', shoe: '#8e0e1c', arm: '#2a1b1f', hand: '#8e0e1c', noEyes: true, bulletColor: '#ff1744',
    back(c, t) {
      const fl = Math.sin(t * 0.02) * 2.5;
      pg(c, [[-10, -17], [-15, -34 + fl], [-6, -25], [-3, -39 - fl], [2, -26], [7, -37 + fl], [9, -25], [15, -33 - fl], [12, -17]], '#ff5a1f');
      pg(c, [[-5, -20], [-2, -30 - fl], [2, -22], [5, -29 + fl], [7, -20]], '#ffd23f', false);
    },
    look(c) {
      ell(c, 4, -8, 3.6, 2.2, '#ffe14d', false); ell(c, 11.5, -8, 3.2, 2.2, '#ffe14d', false);
      ci(c, -4, 11, 3, '#ff1744', false); ci(c, 4, 12, 2.2, '#ff5252', false);
      c.beginPath(); c.moveTo(3, -1); c.lineTo(6, 1); c.lineTo(9, -1); c.lineTo(12, 1); c.stroke();
    }
  },
  {
    id: 'gold', name: 'Золотой Король', rarity: 'arcana', rarityName: 'Аркана',
    desc: 'Чистое сияющее золото, корона и звёздный шлейф', price: 320, icon: '👑',
    skin: '#ffd54f', torso: '#f9b72a', legs: '#e29a12', shoe: '#a86a00', arm: '#ffd54f', hand: '#ffd54f', bullet: 'star', bulletColor: '#ffd740',
    back(c) { pg(c, [[-10, 4], [-22, 25], [9, 25], [11, 4]], '#c62828'); c.fillStyle = '#fff'; c.fillRect(-21, 23, 30, 2); },
    look(c, t) {
      pg(c, [[-10, -19], [-10, -31], [-4, -24], [0, -33], [4, -24], [10, -31], [10, -19]], '#ffe066');
      ci(c, 0, -22, 1.8, '#e53935', false); ci(c, -6, -22, 1.4, '#29b6f6', false); ci(c, 6, -22, 1.4, '#66bb6a', false);
      const s = 1.5 + Math.sin(t * 0.008) * 1.2;
      c.save(); c.translate(14, -22); starPoly(c, s * 2.4, s * 0.7, 4); c.fillStyle = '#fff'; c.fill(); c.restore();
    }
  },

  // ======================= НОВЫЕ СКИНЫ (оригинальные персонажи) =======================
  {
    id: 'robot', name: 'Робот Болтик', rarity: 'common', rarityName: 'Обычный',
    desc: 'Добрый жестяной робот с антенной и экраном-лицом', price: 40, icon: '🤖',
    skin: '#b0bec5', torso: '#78909c', legs: '#546e7a', shoe: '#37474f', arm: '#90a4ae', headShape: 'square', noEyes: true, bulletColor: '#00e5ff',
    look(c, t) {
      c.strokeStyle = '#90a4ae'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -21); c.lineTo(0, -28); c.stroke();
      ci(c, 0, -30, 3, Math.sin(t * 0.01) > 0 ? '#ff1744' : '#ffeb3b');
      c.strokeStyle = OUT; c.lineWidth = 2;
      rr(c, -10, -16, 24, 16, 5, '#102027');
      ci(c, 0, -8, 2.8, '#00e5ff', false); ci(c, 9, -8, 2.8, '#00e5ff', false);
      c.fillStyle = '#00e5ff'; c.fillRect(1, -3, 9, 1.6);
      ci(c, -11, -12, 1.4, '#546e7a', false); ci(c, 11, 3, 1.4, '#546e7a', false);
    }
  },
  {
    id: 'ghost', name: 'Добрый Призрак', rarity: 'common', rarityName: 'Обычный',
    desc: 'Белая простыня, румяные щёчки и парящий хвостик', price: 55, icon: '👻',
    skin: '#f7f7ff', torso: '#f7f7ff', legs: '#e8e8f5', arm: '#f7f7ff', noEyes: true, bulletColor: '#b39ddb',
    look(c, t) {
      const w = Math.sin(t * 0.008) * 2;
      pg(c, [[-12, 12], [-9, 20 + w], [-4, 15], [0, 21 - w], [5, 15], [9, 20 + w], [12, 12]], '#f7f7ff');
      ell(c, 3.5, -8, 3, 4.4, '#1a1a2e', false); ell(c, 11, -8, 3, 4.4, '#1a1a2e', false);
      ci(c, 4.5, -10, 1, '#fff', false); ci(c, 12, -10, 1, '#fff', false);
      ell(c, 1, -1, 3, 1.8, 'rgba(255,120,150,0.55)', false); ell(c, 14, -1, 2.6, 1.8, 'rgba(255,120,150,0.55)', false);
      ell(c, 8, 0, 2.2, 2.8, '#1a1a2e', false);
    }
  },
  {
    id: 'alien', name: 'Зелёный Гость', rarity: 'common', rarityName: 'Обычный',
    desc: 'Любопытный пришелец с огромными глазами и антенками', price: 65, icon: '👽',
    skin: '#8bd45a', torso: '#6fb43f', legs: '#5b9a33', arm: '#8bd45a', noEyes: true, bulletColor: '#69f0ae',
    look(c, t) {
      c.strokeStyle = '#5b9a33'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-4, -21); c.quadraticCurveTo(-9, -29, -5, -33); c.moveTo(6, -21); c.quadraticCurveTo(11, -29, 7, -33); c.stroke();
      c.strokeStyle = OUT;
      ci(c, -5, -34, 2.4, '#e040fb'); ci(c, 7, -34, 2.4, '#e040fb');
      ell(c, 3, -8, 4.6, 6.4, '#0d1b12', false, 0.3); ell(c, 12, -8, 4.2, 6, '#0d1b12', false, -0.3);
      ci(c, 4.4, -10, 1.3, '#fff', false); ci(c, 13, -10, 1.2, '#fff', false);
      c.beginPath(); c.moveTo(5, 2); c.lineTo(10, 2); c.stroke();
    }
  },
  {
    id: 'snowman', name: 'Снеговичок', rarity: 'common', rarityName: 'Обычный',
    desc: 'Морковный нос, шарф и ведёрко на голове', price: 60, icon: '⛄',
    skin: '#ffffff', torso: '#f1f8ff', legs: '#e3f2fd', arm: '#6d4c41', noEyes: true, bulletColor: '#81d4fa',
    look(c) {
      rr(c, -11, -26, 22, 9, 2, '#455a64'); rr(c, -14, -19, 28, 4, 2, '#37474f');
      ci(c, 3, -7, 1.8, '#111', false); ci(c, 10, -7, 1.8, '#111', false);
      pg(c, [[9, -4], [21, -2], [9, 0]], '#ff7a18');
      ci(c, 2, 2, 0.9, '#111', false); ci(c, 5, 3.4, 0.9, '#111', false);
      rr(c, -11, 4, 22, 5, 2, '#e53935'); rr(c, -11, 8, 5, 10, 2, '#e53935');
      ci(c, 0, 12, 1.4, '#111', false); ci(c, 0, 16, 1.4, '#111', false);
    }
  },
  {
    id: 'cowboy', name: 'Шериф Пыльной Долины', rarity: 'common', rarityName: 'Обычный',
    desc: 'Широкополая шляпа, платок и звезда на груди', price: 75, icon: '🤠',
    skin: '#f0c196', torso: '#a1673a', legs: '#3b5ba5', shoe: '#4e342e', arm: '#a1673a', hand: '#f0c196', bulletColor: '#ffb300',
    look(c) {
      ell(c, 0, -14, 22, 4.5, '#8d5a2b');
      c.beginPath(); c.moveTo(-11, -15); c.quadraticCurveTo(-10, -30, 0, -29); c.quadraticCurveTo(10, -30, 11, -15); c.closePath();
      c.fillStyle = '#8d5a2b'; c.fill(); c.stroke();
      rr(c, -11, -19, 22, 3.4, 1, '#3e2723');
      pg(c, [[-8, 4], [8, 4], [0, 13]], '#e53935');
      c.save(); c.translate(-2, 12); starPoly(c, 3.6, 1.6, 5); c.fillStyle = '#ffd54f'; c.fill(); c.stroke(); c.restore();
    }
  },
  {
    id: 'pumpkin', name: 'Тыква-Фонарь', rarity: 'rare', rarityName: 'Редкий',
    desc: 'Светящаяся ухмылка и зелёный хвостик. Бу!', price: 90, icon: '🎃',
    skin: '#ff8f1f', torso: '#e65100', legs: '#bf360c', shoe: '#33691e', arm: '#ff8f1f', noEyes: true, bulletColor: '#ffab40',
    look(c, t) {
      c.strokeStyle = 'rgba(150,60,0,0.6)'; c.lineWidth = 1.6;
      c.beginPath(); c.arc(0, -7, 8, Math.PI * 1.3, Math.PI * 0.7); c.moveTo(0, -21); c.lineTo(0, 7); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      rr(c, -2.5, -27, 5, 8, 2, '#558b2f');
      const g = 0.7 + Math.sin(t * 0.01) * 0.3;
      c.fillStyle = 'rgba(255,235,59,' + g + ')';
      pg(c, [[0, -12], [5, -4], [-3, -4]], c.fillStyle, false); pg(c, [[7, -12], [12, -4], [5, -4]], c.fillStyle, false);
      c.beginPath(); c.moveTo(-1, 1); c.lineTo(2, 4); c.lineTo(5, 1); c.lineTo(8, 4); c.lineTo(11, 1); c.lineTo(13, 3); c.lineTo(10, 6); c.lineTo(2, 6); c.closePath(); c.fill();
    }
  },
  {
    id: 'pirate', name: 'Капитан Попугай', rarity: 'rare', rarityName: 'Редкий',
    desc: 'Красная бандана, повязка на глазу и золотая серьга', price: 85, icon: '🏴‍☠️',
    skin: '#e8b88a', torso: '#37474f', legs: '#5d4037', shoe: '#212121', arm: '#c62828', hand: '#e8b88a', bulletColor: '#ffd54f', bullet: 'star',
    look(c) {
      c.beginPath(); c.arc(0, -8, 15.6, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fillStyle = '#d32f2f'; c.fill(); c.stroke();
      pg(c, [[-12, -16], [-22, -12], [-16, -6], [-11, -10]], '#d32f2f');
      c.fillStyle = '#fff'; for (const p of [[-3, -19], [4, -21], [9, -17]]) c.fillRect(p[0], p[1], 2, 2);
      c.strokeStyle = '#111'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-3, -12); c.lineTo(15, -5); c.stroke(); c.strokeStyle = OUT;
      ell(c, 3.5, -8, 4.4, 4, '#111');
      ci(c, -14, -2, 2.4, '#ffd54f');
      c.beginPath(); c.moveTo(4, 1); c.quadraticCurveTo(8, 4, 12, 1); c.stroke();
      rr(c, -11, 12, 22, 3, 1, '#8d6e63'); rr(c, -2, 11.5, 5, 4, 1, '#ffd54f');
    }
  },
  {
    id: 'viking', name: 'Северный Воин', rarity: 'rare', rarityName: 'Редкий',
    desc: 'Рогатый шлем и густая рыжая борода', price: 95, icon: '🪓',
    skin: '#f0c196', torso: '#7b4a2a', legs: '#455a64', shoe: '#3e2723', arm: '#7b4a2a', hand: '#f0c196', torsoW: 24, bulletColor: '#cfd8dc',
    back(c) { pg(c, [[-8, 4], [-19, 20], [5, 22], [10, 4]], '#5d4037'); },
    look(c) {
      pg(c, [[-12, -14], [-20, -30], [-8, -21]], '#f5f0e0'); pg(c, [[12, -14], [20, -30], [8, -21]], '#f5f0e0');
      c.beginPath(); c.arc(0, -8, 15.8, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fillStyle = '#90a4ae'; c.fill(); c.stroke();
      rr(c, -1.6, -23, 3.2, 8, 1, '#78909c');
      pg(c, [[-12, -2], [14, -2], [11, 12], [0, 17], [-9, 11]], '#d9772b');
      c.beginPath(); c.moveTo(4, 2); c.lineTo(10, 2); c.stroke();
      pg(c, [[0, -9], [-1, -2]], '#d9772b', false);
    }
  },
  {
    id: 'knight', name: 'Серебряный Страж', rarity: 'rare', rarityName: 'Редкий',
    desc: 'Блестящие доспехи, забрало и синий плюмаж', price: 100, icon: '🛡️',
    skin: '#cfd8dc', torso: '#b0bec5', legs: '#90a4ae', shoe: '#607d8b', arm: '#cfd8dc', hand: '#78909c', torsoW: 24, noEyes: true, bulletColor: '#e3f2fd', bullet: 'arrow',
    look(c, t) {
      pg(c, [[-4, -22], [-16, -34], [-8, -36], [2, -30], [4, -22]], '#1e88e5');
      rr(c, -2, -24, 4, 6, 1, '#78909c');
      rr(c, -1, -14, 17, 9, 3, '#263238');
      c.fillStyle = '#ffe082'; c.fillRect(3, -11, 10, 2);
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-9, -17); c.lineTo(-9, -3); c.stroke(); c.strokeStyle = OUT; c.lineWidth = 2;
      pg(c, [[-5, 6], [5, 6], [5, 12], [0, 17], [-5, 12]], '#1e88e5');
    }
  },
  {
    id: 'astro', name: 'Космический Странник', rarity: 'rare', rarityName: 'Редкий',
    desc: 'Белый скафандр, стеклянный шлем и ранец жизни', price: 95, icon: '🚀',
    skin: '#eceff1', torso: '#f5f5f5', legs: '#cfd8dc', shoe: '#ff7043', arm: '#f5f5f5', hand: '#ff7043', noEyes: true, bulletColor: '#80d8ff',
    back(c) { rr(c, -20, -2, 9, 18, 3, '#b0bec5'); },
    look(c, t) {
      ell(c, 7, -8, 11, 10, 'rgba(100,181,246,0.88)');
      ell(c, 4, -12, 4, 2.2, 'rgba(255,255,255,0.7)', false, -0.4);
      ci(c, 6, -7, 1.8, '#0d47a1', false); ci(c, 12, -7, 1.8, '#0d47a1', false);
      rr(c, -8, 7, 16, 8, 2, '#cfd8dc');
      ci(c, -4, 11, 1.6, '#ef5350', false); ci(c, 0, 11, 1.6, '#66bb6a', false); ci(c, 4, 11, 1.6, '#ffee58', false);
    }
  },
  {
    id: 'ninjacat', name: 'Кот-Ниндзя', rarity: 'epic', rarityName: 'Эпический',
    desc: 'Ловкий чёрный кот с повязкой и острыми звёздами', price: 110, icon: '🐱',
    skin: '#2b2b33', torso: '#3a3a48', legs: '#2b2b33', shoe: '#e53935', arm: '#2b2b33', hand: '#2b2b33', noEyes: true, bullet: 'shuriken', bulletColor: '#cfd8dc',
    back(c, t) { const w = Math.sin(t * 0.012) * 4; c.lineWidth = 5; c.strokeStyle = OUT; c.beginPath(); c.moveTo(-10, 12); c.quadraticCurveTo(-26, 8 + w, -22, -6); c.stroke(); c.strokeStyle = '#2b2b33'; c.lineWidth = 3; c.beginPath(); c.moveTo(-10, 12); c.quadraticCurveTo(-26, 8 + w, -22, -6); c.stroke(); c.strokeStyle = OUT; c.lineWidth = 2; },
    look(c) {
      pg(c, [[-13, -12], [-12, -28], [-2, -19]], '#2b2b33'); pg(c, [[2, -20], [12, -28], [14, -11]], '#2b2b33');
      pg(c, [[-11, -15], [-11, -23], [-6, -18]], '#f48fb1', false); pg(c, [[5, -19], [11, -23], [11, -14]], '#f48fb1', false);
      rr(c, -15, -13, 30, 5, 1, '#e53935');
      ell(c, 4, -3, 4, 2.4, '#ffee58', false); ell(c, 11.5, -3, 3.4, 2.4, '#ffee58', false);
      ell(c, 4, -3, 1, 2.2, '#111', false); ell(c, 11.5, -3, 1, 2.2, '#111', false);
      pg(c, [[7, 2], [10, 2], [8.5, 4]], '#f48fb1', false);
      c.strokeStyle = '#ddd'; c.lineWidth = 1; c.beginPath(); c.moveTo(12, 3); c.lineTo(20, 1); c.moveTo(12, 5); c.lineTo(20, 6); c.stroke();
    }
  },
  {
    id: 'wizard', name: 'Звёздный Чародей', rarity: 'epic', rarityName: 'Эпический',
    desc: 'Высокий колпак со звёздами и длинная седая борода', price: 115, icon: '🧙',
    skin: '#f0c196', torso: '#4527a0', legs: '#311b92', shoe: '#ffd54f', arm: '#4527a0', hand: '#f0c196', bulletColor: '#ce93d8', bullet: 'star',
    back(c) { pg(c, [[-9, 4], [-20, 23], [9, 24], [11, 4]], '#311b92'); },
    look(c, t) {
      ell(c, 0, -15, 20, 4, '#4527a0');
      pg(c, [[-12, -16], [-3, -40], [4, -34], [12, -16]], '#5e35b1');
      c.save(); c.translate(-2, -26); starPoly(c, 3.6, 1.6, 5); c.fillStyle = '#ffd54f'; c.fill(); c.restore();
      ci(c, 6, -21, 1.3, '#ffd54f', false);
      pg(c, [[-8, -2], [13, -2], [9, 20], [0, 24], [-7, 14]], '#eceff1');
      c.beginPath(); c.moveTo(3, 2); c.lineTo(9, 2); c.stroke();
      const s = 1.4 + Math.sin(t * 0.01);
      c.save(); c.translate(-2, -26 - 8); c.globalAlpha = 0.6; starPoly(c, s * 2, s * 0.6, 4); c.fillStyle = '#fff'; c.fill(); c.restore();
    }
  },
  {
    id: 'dragon', name: 'Дракончик Искра', rarity: 'epic', rarityName: 'Эпический',
    desc: 'Зелёные чешуйки, рожки и крылышки. Дышит огнём!', price: 125, icon: '🐲',
    skin: '#66bb6a', torso: '#43a047', legs: '#2e7d32', shoe: '#ff8f00', arm: '#66bb6a', hand: '#66bb6a', noEyes: true, bulletColor: '#ff6d00',
    back(c, t) {
      const f = Math.sin(t * 0.012) * 5;
      pg(c, [[-8, 0], [-26, -14 - f], [-22, 2], [-14, -2 + f * 0.3], [-10, 12]], '#ffb74d');
      pg(c, [[-10, 12], [-26, 16], [-30, 12], [-20, 8]], '#43a047');
    },
    look(c) {
      pg(c, [[-8, -20], [-12, -31], [-3, -22]], '#ffe0b2'); pg(c, [[3, -22], [8, -32], [11, -20]], '#ffe0b2');
      for (let i = 0; i < 4; i++) pg(c, [[-14 + i * 4, -13 + i * 1.5], [-12 + i * 4, -18 + i * 1.5], [-10 + i * 4, -13 + i * 1.5]], '#2e7d32', false);
      ell(c, 4, -9, 3.4, 3.8, '#ffee58', false); ell(c, 11.5, -9, 3, 3.6, '#ffee58', false);
      ell(c, 4.6, -9, 1, 3.4, '#111', false); ell(c, 12, -9, 1, 3.2, '#111', false);
      ell(c, 11, -1, 5.5, 4, '#a5d6a7'); ci(c, 10, -2, 0.8, '#1b5e20', false); ci(c, 13, -2, 0.8, '#1b5e20', false);
      ell(c, 0, 11, 7, 5, '#c5e1a5');
    }
  },
  {
    id: 'unicorn', name: 'Радужный Единорог', rarity: 'epic', rarityName: 'Эпический',
    desc: 'Сияющий рог, разноцветная грива и звёздные искры', price: 135, icon: '🦄',
    skin: '#fff3fa', torso: '#fce4ec', legs: '#f8bbd0', shoe: '#ce93d8', arm: '#fff3fa', hand: '#fff3fa', noEyes: true, bullet: 'star', bulletColor: '#f48fb1',
    back(c, t) {
      const cols = ['#ef5350', '#ffa726', '#ffee58', '#66bb6a', '#42a5f5', '#ab47bc'];
      for (let i = 0; i < 6; i++) { const y = -18 + i * 5 + Math.sin(t * 0.008 + i) * 1.5; ell(c, -16 - i * 0.8, y, 7, 3.2, cols[i]); }
    },
    look(c, t) {
      pg(c, [[3, -21], [8, -37], [11, -20]], '#ffe082');
      c.strokeStyle = 'rgba(180,120,0,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(4.4, -26); c.lineTo(9, -26); c.moveTo(5.4, -31); c.lineTo(8.4, -31); c.stroke(); c.strokeStyle = OUT; c.lineWidth = 2;
      pg(c, [[-8, -19], [-6, -28], [0, -21]], '#fff3fa');
      ell(c, 3.5, -8, 3.2, 4.4, '#7b1fa2', false); ell(c, 11, -8, 2.8, 4.2, '#7b1fa2', false);
      ci(c, 4.4, -10, 1.2, '#fff', false); ci(c, 11.8, -10, 1.1, '#fff', false);
      ell(c, 1, -1, 3, 1.8, 'rgba(255,100,150,0.5)', false);
      const s = 1.2 + Math.sin(t * 0.01) * 0.8;
      c.save(); c.translate(14, -26); starPoly(c, s * 2.2, s * 0.7, 4); c.fillStyle = '#fff'; c.fill(); c.restore();
    }
  },
  {
    id: 'phoenix', name: 'Огненный Феникс', rarity: 'arcana', rarityName: 'Аркана',
    desc: 'Перья из живого пламени и вечно горящий хохолок', price: 280, icon: '🔥',
    skin: '#ff7043', torso: '#e64a19', legs: '#bf360c', shoe: '#ffca28', arm: '#ff7043', hand: '#ffca28', noEyes: true, bullet: 'orb', bulletColor: '#ff9100',
    back(c, t) {
      const f = Math.sin(t * 0.014) * 5;
      pg(c, [[-8, -2], [-30, -24 - f], [-24, -4], [-34, 2 + f], [-20, 8], [-28, 20], [-10, 14]], '#ff5722');
      pg(c, [[-9, 1], [-24, -14 - f], [-19, -1], [-26, 5 + f], [-14, 9]], '#ffb300', false);
      pg(c, [[-11, 6], [-18, 2], [-13, 10]], '#fff59d', false);
    },
    look(c, t) {
      const f = Math.sin(t * 0.02) * 2.5;
      pg(c, [[-8, -20], [-9, -32 + f], [-3, -25], [0, -37 - f], [4, -25], [9, -34 + f], [10, -20]], '#ff5722');
      pg(c, [[-3, -21], [0, -31 - f], [4, -21]], '#ffee58', false);
      ell(c, 4, -8, 3.4, 3.4, '#fff59d', false); ell(c, 11.5, -8, 3, 3.2, '#fff59d', false);
      ci(c, 4.8, -8, 1.3, '#b71c1c', false); ci(c, 12, -8, 1.2, '#b71c1c', false);
      pg(c, [[9, -3], [20, 1], [9, 4]], '#ffca28');
    }
  },
  {
    id: 'galaxy', name: 'Дух Галактики', rarity: 'arcana', rarityName: 'Аркана',
    desc: 'Тело из ночного неба: звёзды, туманности и орбиты', price: 300, icon: '🌌',
    skin: '#1a1446', torso: '#2a1f6b', legs: '#120d34', shoe: '#7c4dff', arm: '#2a1f6b', hand: '#b388ff', noEyes: true, bullet: 'star', bulletColor: '#b388ff',
    back(c, t) {
      c.save(); c.globalAlpha = 0.55;
      for (let i = 0; i < 3; i++) { const a = t * 0.003 + i * 2.1; ci(c, Math.cos(a) * 24, -6 + Math.sin(a) * 12, 3, ['#7c4dff', '#40c4ff', '#ff4081'][i], false); }
      c.restore();
    },
    look(c, t) {
      c.save(); c.beginPath(); c.arc(0, -7, 14, 0, 6.283); c.clip();
      const g = c.createRadialGradient(6, -10, 1, 0, -7, 16);
      g.addColorStop(0, 'rgba(255,64,129,0.6)'); g.addColorStop(0.6, 'rgba(64,196,255,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(-16, -24, 32, 32);
      c.fillStyle = '#fff';
      for (let i = 0; i < 9; i++) { const sx = -12 + hash(i + 3) * 24, sy = -20 + hash(i + 9) * 26; c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.004 + i)); c.fillRect(sx, sy, 1.6, 1.6); }
      c.restore(); c.globalAlpha = 1;
      c.strokeStyle = OUT; c.lineWidth = 2;
      ell(c, 4, -8, 3.6, 2.2, '#e1bee7', false); ell(c, 11.5, -8, 3.2, 2.2, '#e1bee7', false);
      c.save(); c.translate(0, -24); c.rotate(t * 0.002); starPoly(c, 5, 2, 4); c.fillStyle = '#ffeb3b'; c.fill(); c.stroke(); c.restore();
    }
  },

  // ======================= ЛЕГЕНДЫ: герои с игровыми бонусами =======================
  // perk: coin — множитель монет, xp — множитель опыта, magnet — радиус магнита для монет, revive — число воскрешений за матч
  {
    id: 'pharaoh', name: 'Фараон Мидас', rarity: 'legend', rarityName: 'Легенда',
    desc: 'Всё, к чему он прикасается, превращается в золото.',
    price: 1000, icon: '🏺',
    skin: '#d9a066', torso: '#ffd54f', legs: '#f9a825', shoe: '#6d4c41', arm: '#ffd54f', hand: '#d9a066', noEyes: true, bullet: 'orb', bulletColor: '#ffd740',
    back(c) { pg(c, [[-10, 4], [-22, 25], [9, 25], [11, 4]], '#1565c0'); },
    look(c, t) {
      pg(c, [[-17, 8], [-18, -12], [-9, -24], [9, -24], [17, -12], [11, -10], [-6, -10], [-6, 8]], '#ffd54f');
      c.strokeStyle = '#1565c0'; c.lineWidth = 2;
      c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(-16, -12 + i * 5); c.lineTo(-7, -12 + i * 5); } c.moveTo(-8, -22); c.lineTo(8, -22); c.moveTo(-3, -17); c.lineTo(12, -17); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      pg(c, [[-1, -24], [2, -34], [5, -24]], '#43a047');
      ci(c, 2, -30, 1.1, '#e53935', false);
      ell(c, 4, -7, 3.8, 2.8, '#fff', false); ell(c, 11.5, -7, 3.2, 2.8, '#fff', false);
      ci(c, 5, -7, 1.6, '#111', false); ci(c, 12, -7, 1.4, '#111', false);
      c.fillStyle = '#111'; c.fillRect(0, -8.6, 16, 1.4);
      rr(c, -11, 5, 22, 5, 2, '#29b6f6');
      for (let i = 0; i < 3; i++) {
        const a = t * 0.005 + i * 2.094;
        c.save(); c.translate(Math.cos(a) * 27, -8 + Math.sin(a) * 9); c.scale(Math.max(0.3, Math.abs(Math.cos(t * 0.01 + i))), 1);
        ci(c, 0, 0, 4.2, '#ffca28'); c.restore();
      }
    }
  },
  {
    id: 'professor', name: 'Профессор Сова', rarity: 'legend', rarityName: 'Легенда',
    desc: 'Мудрая сова в академической шапочке.',
    price: 2500, icon: '🦉',
    skin: '#a1887f', torso: '#5d4037', legs: '#4e342e', shoe: '#ffb300', arm: '#8d6e63', hand: '#a1887f', noEyes: true, bullet: 'star', bulletColor: '#80d8ff',
    look(c, t) {
      pg(c, [[-11, -17], [-15, -31], [-4, -20]], '#8d6e63'); pg(c, [[4, -20], [13, -31], [14, -15]], '#8d6e63');
      ell(c, 7, -7, 10, 9, '#efe0c8', false);
      ci(c, 2.5, -8, 5.2, '#fff'); ci(c, 12.5, -8, 5.2, '#fff');
      ci(c, 3.5, -8, 2.2, '#111', false); ci(c, 13.5, -8, 2.2, '#111', false);
      pg(c, [[8, -4], [17, -1], [8, 3]], '#ffb300');
      pg(c, [[-18, -25], [0, -32], [18, -25], [0, -20]], '#212121');
      rr(c, -9, -22, 18, 4, 1, '#212121');
      c.strokeStyle = '#ffd54f'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(16, -26); c.lineTo(19, -14); c.stroke(); c.strokeStyle = OUT; c.lineWidth = 2;
      ci(c, 19, -12, 2, '#ffd54f');
      pg(c, [[-6, 5], [6, 5], [0, 14]], '#fff8e1');
      c.save(); c.translate(-22, -26 + Math.sin(t * 0.005) * 3); c.rotate(t * 0.002); starPoly(c, 5, 2, 5); c.fillStyle = '#ba68c8'; c.fill(); c.stroke(); c.restore();
    }
  },
  {
    id: 'goblin', name: 'Гоблин-Кладоискатель', rarity: 'legend', rarityName: 'Легенда',
    desc: 'Каска с фонарём, мешок сокровищ и магнитный нюх на монеты.', perkText: '🧲 Магнит монет', perk: {magnet: 100},
    price: 4000, icon: '💰',
    skin: '#7cb342', torso: '#6d4c41', legs: '#4e342e', shoe: '#3e2723', arm: '#7cb342', hand: '#7cb342', noEyes: true, bullet: 'orb', bulletColor: '#ffeb3b',
    back(c) {
      ell(c, -19, 6, 10, 12, '#a1887f'); rr(c, -23, -7, 8, 4, 1.5, '#795548');
      ci(c, -19, 7, 4.2, '#ffd54f');
    },
    look(c, t) {
      pg(c, [[-13, -10], [-28, -18], [-13, -1]], '#7cb342'); pg(c, [[13, -12], [24, -21], [14, -3]], '#7cb342');
      c.beginPath(); c.arc(0, -8, 15.8, Math.PI * 1.04, Math.PI * 1.96); c.closePath(); c.fillStyle = '#fbc02d'; c.fill(); c.stroke();
      ci(c, 9, -18, 3.6, '#fffde7');
      ell(c, 4, -7, 3.6, 3.6, '#ffeb3b', false); ell(c, 12, -7, 3, 3.4, '#ffeb3b', false);
      ci(c, 5, -7, 1.3, '#111', false); ci(c, 12.6, -7, 1.2, '#111', false);
      pg(c, [[9, -4], [18, -1], [9, 1]], '#689f38');
      c.beginPath(); c.moveTo(1, 4); c.lineTo(12, 4); c.stroke();
      pg(c, [[4, 4], [6, 8], [8, 4]], '#fff', false);
      const g = 0.5 + Math.sin(t * 0.01) * 0.5;
      c.fillStyle = 'rgba(255,235,59,' + (0.4 + g * 0.5) + ')'; c.fillRect(-26 + g * 3, 2, 2, 2); c.fillRect(-12, 16 - g * 3, 2, 2);
    }
  },
  {
    id: 'angel', name: 'Ангел-Хранитель', rarity: 'legend', rarityName: 'Легенда',
    desc: 'Белые крылья и сияющий нимб.',
    price: 6500, icon: '😇',
    skin: '#ffe0c2', torso: '#ffffff', legs: '#fff8e1', shoe: '#ffd54f', arm: '#ffffff', hand: '#ffe0c2', bullet: 'star', bulletColor: '#fff59d',
    back(c, t) {
      const f = Math.sin(t * 0.008) * 4;
      pg(c, [[-8, 0], [-30, -18 - f], [-35, -4 - f * 0.5], [-26, 6], [-31, 14], [-10, 10]], '#ffffff');
      pg(c, [[-9, 2], [-22, -9 - f], [-21, 3], [-12, 8]], '#e3f2fd', false);
    },
    look(c, t) {
      c.beginPath(); c.arc(0, -8, 15.6, Math.PI * 1.04, Math.PI * 1.96); c.closePath(); c.fillStyle = '#ffe082'; c.fill(); c.stroke();
      c.strokeStyle = '#ffd54f'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, -28 + Math.sin(t * 0.005) * 1.5, 11, 3.5, 0, 0, 6.283); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      ell(c, 1, -1, 3, 1.8, 'rgba(255,120,150,0.5)', false);
      c.beginPath(); c.arc(8, -2, 3, 0.2, Math.PI - 0.2); c.stroke();
      rr(c, -11, 12, 22, 3, 1, '#ffd54f');
    }
  },
  {
    id: 'cosmoking', name: 'Властелин Вселенной', rarity: 'legend', rarityName: 'Легенда',
    desc: 'Повелитель галактик со свитой планет.', perkText: '🧲 Магнит монет', perk: {magnet: 80},
    price: 10000, icon: '🌠',
    skin: '#5e35b1', torso: '#311b92', legs: '#1a1446', shoe: '#ffd740', arm: '#5e35b1', hand: '#ffd740', torsoW: 24, noEyes: true, bullet: 'orb', bulletColor: '#e040fb',
    back(c, t) {
      pg(c, [[-11, 4], [-29, 26], [12, 26], [12, 4]], '#1a1446');
      c.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) { c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.004 + i)); c.fillRect(-26 + hash(i + 2) * 30, 8 + hash(i + 7) * 16, 2, 2); }
      c.globalAlpha = 1;
    },
    look(c, t) {
      pg(c, [[-11, -19], [-13, -33], [-6, -25], [0, -37], [6, -25], [13, -33], [11, -19]], '#ffd740');
      ci(c, 0, -25, 2, '#e040fb', false); ci(c, -7, -23, 1.5, '#00e5ff', false); ci(c, 7, -23, 1.5, '#69f0ae', false);
      ell(c, 4, -8, 3.6, 2.2, '#e040fb', false); ell(c, 11.5, -8, 3.2, 2.2, '#e040fb', false);
      ci(c, 0, 11, 3.4, '#00e5ff'); ci(c, -0.8, 10, 1, '#fff', false);
      const cols = ['#ff7043', '#29b6f6', '#ffee58'];
      for (let i = 0; i < 3; i++) {
        const a = t * 0.004 + i * 2.094;
        ci(c, Math.cos(a) * 29, -8 + Math.sin(a) * 11, 4.2, cols[i]);
      }
    }
  },

  {
    id: 'clover', name: 'Король Клевера', rarity: 'legend', rarityName: 'Легенда',
    desc: 'Счастливчик в цилиндре: удача сама летит в карман.',
    price: 450, icon: '🍀',
    skin: '#ffe0c2', torso: '#2e7d32', legs: '#1b5e20', shoe: '#ffd54f', arm: '#2e7d32', hand: '#ffffff', bullet: 'star', bulletColor: '#69f0ae',
    back(c, t) {
      pg(c, [[-9, 4], [-21, 22], [-4, 20]], '#1b5e20');
    },
    look(c, t) {
      rr(c, -14, -21, 28, 4, 2, '#1b5e20');
      rr(c, -9, -36, 18, 16, 2, '#2e7d32');
      rr(c, -9, -25, 18, 3.5, 0, '#ffd54f', false);
      ci(c, 0, 11, 3, '#69f0ae'); ci(c, -3, 11, 3, '#69f0ae'); ci(c, 0, 8, 3, '#69f0ae'); ci(c, 3, 11, 3, '#69f0ae');
      for (let i = 0; i < 2; i++) {
        const a = t * 0.005 + i * 3.14159;
        ci(c, Math.cos(a) * 26, -8 + Math.sin(a) * 9, 3.6, '#ffd740');
      }
    }
  },
  {
    id: 'moonfox', name: 'Лунный Лис', rarity: 'legend', rarityName: 'Легенда',
    desc: 'Хитрый лис с лунным знаком. Притягивает монеты.', perkText: '🧲 Магнит монет', perk: {magnet: 50},
    price: 1600, icon: '🦊',
    skin: '#ff9800', torso: '#ef6c00', legs: '#e65100', shoe: '#fff3e0', arm: '#ff9800', hand: '#fff3e0', bullet: 'orb', bulletColor: '#fff59d',
    back(c, t) {
      const f = Math.sin(t * 0.006) * 4;
      pg(c, [[-9, 6], [-24, 2 - f], [-34, 12 - f], [-28, 24], [-12, 20]], '#ff9800');
      pg(c, [[-30, 14 - f], [-34, 12 - f], [-28, 24], [-25, 20]], '#fff3e0', false);
    },
    look(c, t) {
      pg(c, [[-13, -17], [-12, -33], [-3, -21]], '#ff9800');
      pg(c, [[13, -17], [12, -33], [3, -21]], '#ff9800');
      pg(c, [[-11, -20], [-11, -28], [-6, -22]], '#fff3e0', false);
      pg(c, [[11, -20], [11, -28], [6, -22]], '#fff3e0', false);
      c.beginPath(); c.arc(0, -15, 5, Math.PI * 0.15, Math.PI * 1.1); c.strokeStyle = '#fff59d'; c.lineWidth = 2.4; c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      ci(c, 0, 11, 3, '#fff59d');
    }
  },
  {
    id: 'thunder', name: 'Громовержец', rarity: 'legend', rarityName: 'Легенда',
    desc: 'Живая молния. Бьёт точно в цель.',
    price: 3200, icon: '⚡',
    skin: '#ffe0c2', torso: '#283593', legs: '#1a237e', shoe: '#ffeb3b', arm: '#283593', hand: '#ffeb3b', bullet: 'star', bulletColor: '#ffeb3b',
    back(c, t) {
      c.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.01));
      pg(c, [[-10, 2], [-22, -4], [-17, 4], [-30, 10], [-16, 12], [-22, 22], [-8, 12]], '#ffeb3b', false);
      c.globalAlpha = 1;
    },
    look(c, t) {
      pg(c, [[-12, -18], [-10, -32], [-4, -24], [0, -37], [5, -25], [12, -31], [12, -18]], '#ffeb3b');
      pg(c, [[2, 3], [-5, 11], [0, 11], [-3, 19], [6, 9], [1, 9]], '#ffeb3b');
    }
  },
  {
    id: 'alchemist', name: 'Алхимик Золота', rarity: 'legend', rarityName: 'Легенда',
    desc: 'Превращает всё в золото. Очки, колба и пузырьки удачи.', perkText: '🧲 Магнит монет', perk: {magnet: 80},
    price: 7500, icon: '⚗️',
    skin: '#ffe0c2', torso: '#6a1b9a', legs: '#4a148c', shoe: '#ffd54f', arm: '#6a1b9a', hand: '#ffe0c2', bullet: 'orb', bulletColor: '#76ff03',
    back(c, t) {
      pg(c, [[-10, 3], [-24, 24], [8, 24], [10, 3]], '#4a148c');
    },
    look(c, t) {
      rr(c, -13, -14, 26, 4, 2, '#ffd54f');
      ci(c, 5, -12, 4.6, '#b2ebf2'); ci(c, 12, -12, 4.6, '#b2ebf2');
      ci(c, 5, -12, 1.6, '#222', false); ci(c, 12, -12, 1.6, '#222', false);
      pg(c, [[-3, 4], [-3, 10], [-8, 18], [8, 18], [3, 10], [3, 4]], '#e0f7fa');
      pg(c, [[-6, 14], [6, 14], [8, 18], [-8, 18]], '#76ff03', false);
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.003 + i / 3) % 1;
        ci(c, -4 + i * 4 + Math.sin(t * 0.01 + i) * 2, 4 - k * 14, 1.6, '#b9f6ca', false);
      }
    }
  },
  {
    id: 'eternal', name: 'Вечный Дракон', rarity: 'legend', rarityName: 'Легенда',
    desc: 'Древний золотой дракон. Самый величественный герой магазина.', perkText: '🧲 Магнит монет', perk: {magnet: 90},
    price: 15000, icon: '🐉',
    skin: '#ffb300', torso: '#c62828', legs: '#8e0000', shoe: '#ffd740', arm: '#ffb300', hand: '#ffd740', torsoW: 24, bullet: 'orb', bulletColor: '#ff6d00',
    back(c, t) {
      const f = Math.sin(t * 0.007) * 6;
      pg(c, [[-8, 0], [-34, -22 - f], [-42, -2 - f * 0.5], [-33, 6], [-38, 18], [-10, 12]], '#c62828');
      pg(c, [[-9, 2], [-28, -12 - f], [-27, 2], [-12, 8]], '#ffb300', false);
      pg(c, [[-9, 8], [-22, 20], [-30, 30], [-8, 18]], '#ffb300');
    },
    look(c, t) {
      pg(c, [[-8, -19], [-12, -35], [-3, -22]], '#fff3e0');
      pg(c, [[8, -19], [12, -35], [3, -22]], '#fff3e0');
      pg(c, [[-5, -22], [0, -30], [5, -22]], '#ffd740', false);
      ci(c, 0, 11, 4, '#ffd740'); ci(c, 0, 11, 1.8, '#ff6d00', false);
      for (let i = 0; i < 3; i++) {
        const a = t * 0.005 + i * 2.094;
        ci(c, Math.cos(a) * 30, -8 + Math.sin(a) * 12, 3.8, '#ff6d00');
      }
    }
  },
  {
    id: 'timekeeper', name: 'Повелитель Эпох', rarity: 'legend', rarityName: 'Легенда', pass: true,
    desc: 'Эксклюзив пропуска: награда 50-го уровня премиум-линии. Время подчиняется ему.', perkText: '🧲 Магнит монет', perk: {magnet: 80},
    price: 0, icon: '⏳',
    skin: '#d7ccc8', torso: '#00695c', legs: '#004d40', shoe: '#ffd740', arm: '#00695c', hand: '#ffd740', torsoW: 24, noEyes: true, bullet: 'orb', bulletColor: '#18ffff',
    back(c, t) {
      c.save(); c.translate(-2, -4);
      c.strokeStyle = '#18ffff'; c.lineWidth = 2.4; c.globalAlpha = 0.8;
      c.beginPath(); c.arc(0, 0, 30, 0, 6.283); c.stroke();
      c.lineWidth = 1.6;
      for (let i = 0; i < 12; i++) { const a = i * 0.5236; c.beginPath(); c.moveTo(Math.cos(a) * 27, Math.sin(a) * 27); c.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); c.stroke(); }
      const a1 = t * 0.004, a2 = t * 0.0005;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a1) * 24, Math.sin(a1) * 24); c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a2) * 16, Math.sin(a2) * 16); c.stroke();
      c.restore();
    },
    look(c, t) {
      c.save(); c.translate(0, -28);
      gearPath(c, 5, 8, 8, t * 0.003); c.fillStyle = '#ffd740'; c.fill(); c.stroke();
      c.restore();
      c.strokeStyle = '#18ffff'; c.lineWidth = 2.4;
      c.beginPath(); c.arc(5, -4, 2.4, 0, 6.283); c.stroke(); c.beginPath(); c.arc(11.5, -4, 2.4, 0, 6.283); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      pg(c, [[-5, 3], [5, 3], [1, 11], [5, 19], [-5, 19], [-1, 11]], '#b2ebf2');
      pg(c, [[-3, 16], [3, 16], [4, 19], [-4, 19]], '#ffd740', false);
    }
  },

  // ======================= СОБЫТИЯ И СЕЗОН (временные скины) =======================
  {
    id: 'witch', name: 'Ведьмочка Тыквина', rarity: 'event', rarityName: 'Событие', event: 'halloween', priceCur: 120,
    desc: 'Остроконечная шляпа и тыквенная брошь. Только на Хэллоуин!', perkText: '🍬 Конфеты ×2', perk: { cur: 2 },
    price: 0, icon: '🧙‍♀️',
    skin: '#ffe0c2', torso: '#6a1b9a', legs: '#212121', shoe: '#ff8f1f', arm: '#6a1b9a', hand: '#ffe0c2', bullet: 'star', bulletColor: '#ff9100',
    back(c) { pg(c, [[-9, 4], [-20, 23], [9, 24], [11, 4]], '#4a148c'); },
    look(c, t) {
      pg(c, [[-15, -12], [-19, 4], [-13, 0], [-15, 11], [-8, -1]], '#ff7a18');
      ell(c, 0, -17, 21, 4.5, '#1b1b24');
      pg(c, [[-12, -18], [-3, -42 + Math.sin(t * 0.004) * 1.5], [7, -35], [12, -18]], '#2a2433');
      rr(c, -12, -23, 24, 4, 1, '#ff8f1f');
      ci(c, -3, -41 + Math.sin(t * 0.004) * 1.5, 2.2, '#ffd54f');
      ell(c, 1, -1, 3, 1.8, 'rgba(255,120,150,0.5)', false);
      c.beginPath(); c.arc(8, -2, 3, 0.2, Math.PI - 0.2); c.stroke();
      ci(c, 0, 10, 3.4, '#ff8f1f');
      c.fillStyle = '#558b2f'; c.fillRect(-0.8, 5.6, 1.6, 2.4);
    }
  },
  {
    id: 'santa', name: 'Дедушка Мороз', rarity: 'event', rarityName: 'Событие', event: 'newyear', priceCur: 120,
    desc: 'Красная шуба, белая борода и колпак с помпоном. Только на Новый год!', perkText: '❄️ Снежинки ×2', perk: { cur: 2 },
    price: 0, icon: '🎅',
    skin: '#ffd9b8', torso: '#d32f2f', legs: '#d32f2f', shoe: '#212121', arm: '#d32f2f', hand: '#ffffff', bullet: 'star', bulletColor: '#e1f5fe',
    look(c) {
      pg(c, [[-11, -2], [14, -2], [12, 10], [2, 17], [-8, 10]], '#ffffff');
      ell(c, 8, -2, 5.5, 2.4, '#ffffff');
      ci(c, 10, -5, 2.6, '#ff8a80');
      c.beginPath(); c.arc(0, -8, 15.6, Math.PI * 1.04, Math.PI * 1.96); c.closePath();
      c.fillStyle = '#d32f2f'; c.fill(); c.stroke();
      pg(c, [[-12, -15], [-22, -30], [-27, -18], [-6, -21]], '#d32f2f');
      ci(c, -26, -18, 4, '#fff');
      rr(c, -16, -17, 32, 6, 3, '#fff');
      rr(c, -11, 13, 22, 3, 1, '#212121'); rr(c, -2, 12.5, 5, 4, 1, '#ffd54f');
    }
  },
  {
    id: 'bunny', name: 'Пасхальный Кролик', rarity: 'event', rarityName: 'Событие', event: 'easter', priceCur: 120,
    desc: 'Длинные уши, корзинка и расписные яйца вместо снарядов. Только на Пасху!', perkText: '🥚 Яйца ×2', perk: { cur: 2 },
    price: 0, icon: '🐰',
    skin: '#f6f2ee', torso: '#b39ddb', legs: '#9575cd', shoe: '#ffffff', arm: '#f6f2ee', hand: '#f6f2ee', noEyes: true, bullet: 'orb', bulletColor: '#f48fb1',
    back(c, t) {
      const w = Math.sin(t * 0.006) * 0.08;
      for (const [x, r] of [[-6, -0.2], [5, 0.15]]) {
        c.save(); c.translate(x, -18); c.rotate(r + w);
        ell(c, 0, -12, 5.5, 13, '#f6f2ee'); ell(c, 0, -11, 2.4, 9, '#f8bbd0', false);
        c.restore();
      }
      ci(c, -13, 14, 5, '#ffffff');
    },
    look(c) {
      ell(c, 3.5, -8, 2.8, 3.6, '#3e2723', false); ell(c, 11, -8, 2.5, 3.4, '#3e2723', false);
      ci(c, 4.4, -9.4, 1, '#fff', false); ci(c, 11.8, -9.4, 0.9, '#fff', false);
      ell(c, 1, -1, 3, 1.8, 'rgba(244,143,177,0.6)', false); ell(c, 14, -1, 2.6, 1.8, 'rgba(244,143,177,0.6)', false);
      pg(c, [[6.5, -3], [9.5, -3], [8, -1]], '#f06292');
      rr(c, 6.3, 0, 3.4, 3.4, 0.8, '#fff');
      c.strokeStyle = '#bdbdbd'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(11, -1); c.lineTo(18, -3); c.moveTo(11, 0.5); c.lineTo(18, 1); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      pg(c, [[-8, 5], [0, 10], [8, 5]], '#81c784');
    }
  },
  {
    id: 'ranger', name: 'Ёжик-Листопад', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Осенний ёжик, у которого вместо иголок кленовые листья. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '🦔',
    skin: '#8d6e63', torso: '#8d6e63', legs: '#5d4037', shoe: '#3e2723', arm: '#ffe0b2', hand: '#ffe0b2', bullet: 'star', bulletColor: '#ff9800',
    full(c, t, shoot) {
      const cols = ['#bf360c', '#e65100', '#f9a825', '#8d3a14', '#ef6c00'];
      const sw = Math.sin(t * 0.004);
      rr(c, -9, 14, 7, 8, 3, '#5d4037'); rr(c, 3, 14, 7, 8, 3, '#5d4037');
      for (let i = 0; i < 10; i++) {
        const a = -1.45 - i * 0.43, bx = -2 + Math.cos(a) * 13, by = 4 + Math.sin(a) * 12, tx = -Math.sin(a), ty = Math.cos(a);
        const k = 1 + Math.sin(t * 0.005 + i) * 0.06, ex = -2 + Math.cos(a) * 24 * k, ey = 4 + Math.sin(a) * 22 * k;
        pg(c, [[bx + tx * 4.5, by + ty * 4.5], [ex, ey], [bx - tx * 4.5, by - ty * 4.5]], cols[i % 5]);
        if (i % 2 === 0) ell(c, ex, ey, 3.2, 1.9, cols[(i + 2) % 5], true, a);
      }
      ell(c, -2, 5, 15, 13.5, '#8d6e63');
      ell(c, 10, 8, 9.5, 8, '#ffe0b2');
      ci(c, 18.5, 6.5, 2.4, '#212121');
      ci(c, 9, 1, 3, '#fff'); ci(c, 9.8, 1.2, 1.5, '#111', false);
      ell(c, 3, 8, 2.4, 1.5, 'rgba(255,100,100,0.4)', false);
      c.beginPath(); c.arc(13, 11, 2.6, 0.2, Math.PI - 0.2); c.stroke();
      ell(c, -14, 18 + sw * 2, 3.2, 1.8, '#e65100', true, 0.6 + sw * 0.3);
      sHand(c, shoot, '#ffe0b2');
    }
  },

  {
    id: 'santa', name: 'Малыш Дед Мороз', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Новогодний герой с белой бородой и мешком подарков. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '🎅',
    skin: '#ffccbc', torso: '#e53935', legs: '#c62828', shoe: '#4e342e', arm: '#e53935', hand: '#ffffff', bullet: 'star', bulletColor: '#fff59d',
    full(c, t, shoot) {
      const b = Math.sin(t * 0.005) * 1.5;
      ell(c, -16, 8, 8, 9, '#8d6e63');
      rr(c, -9, 15, 7, 8, 3, '#4e342e'); rr(c, 3, 15, 7, 8, 3, '#4e342e');
      c.save(); c.translate(0, b);
      ell(c, 0, 4, 14, 14, '#e53935');
      rr(c, -14, 8, 28, 3.5, 1, '#212121'); rr(c, -2, 7.5, 5, 4.5, 1, '#ffd54f');
      ell(c, 3, -4, 10.5, 9, '#ffccbc');
      ell(c, 2, 3, 11, 8, '#ffffff');
      ci(c, 5, -5, 2.2, '#fff'); ci(c, 5.7, -5, 1.2, '#111', false); ci(c, 11, -5, 2.2, '#fff'); ci(c, 11.7, -5, 1.2, '#111', false);
      ci(c, 8.5, -1, 2, '#ef9a9a', false);
      pg(c, [[-9, -9], [0, -27 - Math.sin(t * 0.006) * 1.5], [13, -9]], '#e53935');
      rr(c, -10, -12, 24, 5, 2.5, '#ffffff');
      ci(c, 0, -28 - Math.sin(t * 0.006) * 1.5, 3.4, '#ffffff');
      c.restore();
      for (let i = 0; i < 3; i++) { const a = t * 0.003 + i * 2.1; sSpark(c, Math.cos(a) * 25, Math.sin(a) * 22, 2.4, '#fff'); }
      sHand(c, shoot, '#ffffff');
    }
  },
  {
    id: 'tulip', name: 'Фея Тюльпана', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Весенняя фея в бутоне тюльпана с листьями-крылышками. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '🌷',
    skin: '#ffccbc', torso: '#f06292', legs: '#66bb6a', shoe: '#43a047', arm: '#ffccbc', hand: '#ffccbc', bullet: 'heart', bulletColor: '#f48fb1',
    full(c, t, shoot) {
      const f = Math.sin(t * 0.012) * 5, b = Math.sin(t * 0.004) * 1.5;
      sGlow(c, 0, 0, 30, 'rgba(244,143,177,0.35)');
      ell(c, -18, 0 - f * 0.3, 5, 11, '#81c784', true, -0.7 - f * 0.03); ell(c, 18, 0 - f * 0.3, 5, 11, '#81c784', true, 0.7 + f * 0.03);
      rr(c, -6, 12, 4.5, 10, 2, '#66bb6a'); rr(c, 3, 12, 4.5, 10, 2, '#66bb6a');
      c.save(); c.translate(0, b);
      ell(c, 0, -2, 11, 14, '#f8bbd0');
      pg(c, [[-12, -8], [-9, -22], [-3, -13], [0, -24], [3, -13], [9, -22], [12, -8], [0, 4]], '#f06292');
      ell(c, 0, -5, 7.5, 7, '#ffccbc');
      sFace(c, -5, -6, 2.6);
      c.beginPath(); c.arc(1, -1, 2.4, 0.2, Math.PI - 0.2); c.stroke();
      ell(c, -6, -2, 2, 1.3, 'rgba(255,100,130,0.45)', false);
      c.restore();
      for (let i = 0; i < 3; i++) { const a = t * 0.0025 + i * 2.1; sSpark(c, Math.cos(a) * 25, Math.sin(a) * 21, 2.4, '#fff59d'); }
      sHand(c, shoot, '#ffccbc');
    }
  },
  {
    id: 'bunny', name: 'Пасхальный Кролик', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Кролик-яйцо с расписным узором и длинными ушами. Награда 30-го уровня премиум-пропуска.', perkText: '🧲 Магнит монет', perk: { magnet: 70 },
    price: 0, icon: '🐰',
    skin: '#fff8e1', torso: '#ce93d8', legs: '#ba68c8', shoe: '#fff8e1', arm: '#fff8e1', hand: '#fff8e1', bullet: 'orb', bulletColor: '#f8bbd0',
    full(c, t, shoot) {
      const w = Math.sin(t * 0.007) * 3, b = Math.sin(t * 0.004) * 1.5;
      rr(c, -8, 15, 7, 8, 3, '#fff8e1'); rr(c, 3, 15, 7, 8, 3, '#fff8e1');
      c.save(); c.translate(0, b);
      ell(c, -7, -23, 4, 11, '#fff8e1', true, -0.15 - w * 0.02); ell(c, 8, -23, 4, 11, '#fff8e1', true, 0.15 + w * 0.02);
      ell(c, -7, -23, 1.8, 7, '#f8bbd0', false, -0.15 - w * 0.02); ell(c, 8, -23, 1.8, 7, '#f8bbd0', false, 0.15 + w * 0.02);
      ell(c, 0, 0, 14, 17, '#ce93d8');
      c.save(); c.beginPath(); c.ellipse(0, 0, 14, 17, 0, 0, 6.283); c.clip();
      rr(c, -16, 4, 32, 4, 0, '#ffd54f', false); rr(c, -16, 10, 32, 3, 0, '#81d4fa', false);
      for (let i = 0; i < 4; i++) ci(c, -10 + i * 7, 6, 1.4, '#fff', false);
      c.restore();
      ell(c, 0, 0, 14, 17, null);
      sFace(c, -4, -7, 3);
      ci(c, 3, -2, 1.6, '#f06292', false);
      c.beginPath(); c.arc(3, -1, 2.6, 0.2, Math.PI - 0.2); c.stroke();
      c.restore(); sHand(c, shoot, '#fff8e1');
    }
  },
  {
    id: 'firecracker', name: 'Новогодняя Хлопушка', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Живая хлопушка, из которой сыплются конфетти и искры. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '🎉',
    skin: '#ffd54f', torso: '#7e57c2', legs: '#5e35b1', shoe: '#ffd54f', arm: '#ffd54f', hand: '#ffd54f', bullet: 'star', bulletColor: '#ff80ab',
    full(c, t, shoot) {
      const b = Math.sin(t * 0.005) * 1.5;
      const cols = ['#ff5252', '#40c4ff', '#ffd740', '#69f0ae', '#e040fb'];
      rr(c, -8, 15, 7, 8, 3, '#5e35b1'); rr(c, 3, 15, 7, 8, 3, '#5e35b1');
      c.save(); c.translate(0, b);
      pg(c, [[-14, 18], [14, 18], [8, -10], [-8, -10]], '#7e57c2');
      pg(c, [[-9, -4], [9, -4], [8, -10], [-8, -10]], '#ffd54f', false);
      pg(c, [[-12, 10], [12, 10], [13, 14], [-13, 14]], '#ffd54f', false);
      pg(c, [[-14, 18], [14, 18], [8, -10], [-8, -10]], null);
      sFace(c, -4, 3, 3);
      c.beginPath(); c.arc(3, 8, 2.6, 0.2, Math.PI - 0.2); c.stroke();
      for (let i = 0; i < 9; i++) {
        const k = (t * 0.0016 + i / 9) % 1, a = -1.57 + (hash(i + 3) - 0.5) * 1.8;
        const x = Math.cos(a) * (6 + k * 26), y = -12 + Math.sin(a) * (6 + k * 26) + k * k * 14;
        c.globalAlpha = 1 - k * 0.7; rr(c, x - 2, y - 1.2, 4, 2.4, 1, cols[i % 5], false);
      }
      c.globalAlpha = 1;
      c.restore(); sHand(c, shoot, '#ffd54f');
    }
  },
  {
    id: 'owl', name: 'Сова-Сказочница', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Мудрая сова с большими глазами и осенним пером. Награда 30-го уровня премиум-пропуска.', perkText: '🧲 Магнит монет', perk: { magnet: 70 },
    price: 0, icon: '🦉',
    skin: '#8d6e63', torso: '#6d4c41', legs: '#ffb300', shoe: '#ffb300', arm: '#8d6e63', hand: '#8d6e63', bullet: 'orb', bulletColor: '#ffcc80',
    full(c, t, shoot) {
      const f = Math.sin(t * 0.007) * 3, b = Math.sin(t * 0.004) * 1.5;
      rr(c, -7, 15, 5, 8, 2, '#ffb300'); rr(c, 3, 15, 5, 8, 2, '#ffb300');
      c.save(); c.translate(0, b);
      pg(c, [[-12, -8], [-14, -22], [-4, -15]], '#6d4c41'); pg(c, [[12, -8], [14, -22], [4, -15]], '#6d4c41');
      ell(c, 0, 1, 15, 17, '#8d6e63');
      ell(c, 0, 8, 9, 9, '#d7ccc8');
      for (let i = 0; i < 3; i++) c.fillRect(-4 + i * 4, 5 + i % 2 * 4, 2, 2);
      ell(c, -15, 3 - f * 0.3, 5, 11, '#6d4c41', true, 0.3); ell(c, 15, 3 - f * 0.3, 5, 11, '#6d4c41', true, -0.3);
      ci(c, -5, -5, 6, '#fff3e0'); ci(c, 6, -5, 6, '#fff3e0');
      ci(c, -4, -5, 2.6, '#111', false); ci(c, 7, -5, 2.6, '#111', false);
      pg(c, [[0, -2], [-2.5, 2], [2.5, 2]], '#ffb300');
      c.restore(); sHand(c, shoot, '#8d6e63');
    }
  },
  {
    id: 'pumpkin', name: 'Тыквоголовый', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Добрая светящаяся тыква с зелёным хвостиком. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '🎃',
    skin: '#ff9800', torso: '#37474f', legs: '#263238', shoe: '#212121', arm: '#37474f', hand: '#ff9800', bullet: 'orb', bulletColor: '#ffab00',
    full(c, t, shoot) {
      const b = Math.sin(t * 0.005) * 1.5, g = 0.75 + 0.25 * Math.sin(t * 0.01);
      rr(c, -8, 15, 7, 8, 3, '#263238'); rr(c, 3, 15, 7, 8, 3, '#263238');
      c.save(); c.translate(0, b);
      rr(c, -11, 6, 22, 12, 4, '#37474f');
      sGlow(c, 0, -6, 28, 'rgba(255,171,0,' + (0.3 * g) + ')');
      ell(c, -8, -6, 9, 13, '#fb8c00'); ell(c, 8, -6, 9, 13, '#fb8c00'); ell(c, 0, -6, 8, 14, '#ff9800');
      rr(c, -2, -24, 4, 7, 1.5, '#558b2f');
      pg(c, [[-7, -9], [-3, -9], [-5, -13]], '#ffeb3b'); pg(c, [[3, -9], [7, -9], [5, -13]], '#ffeb3b');
      c.beginPath(); c.moveTo(-8, 0); c.lineTo(-4, 4); c.lineTo(0, 0); c.lineTo(4, 4); c.lineTo(8, 0); c.fillStyle = '#ffeb3b'; c.fill(); c.stroke();
      c.restore(); sHand(c, shoot, '#ff9800');
    }
  },

  // ======================= СЕЗОННЫЕ СКИНЫ: по одному на каждый месяц, идут по кругу (см. SEASON_SKINS) =======================
  {
    id: 'icequeen', name: 'Ледяной Кристалл', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Живой кристалл льда с парящей короной. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '❄️',
    skin: '#b3e5fc', torso: '#81d4fa', legs: '#4fc3f7', shoe: '#e1f5fe', arm: '#e3f2fd', hand: '#e3f2fd', bullet: 'star', bulletColor: '#b3e5fc',
    full(c, t, shoot) {
      const b = Math.sin(t * 0.004) * 2;
      sGlow(c, 0, 0, 32, 'rgba(179,229,252,0.5)');
      c.save(); c.translate(0, b);
      pg(c, [[0, -24], [15, -8], [11, 14], [0, 22], [-11, 14], [-15, -8]], '#b3e5fc');
      pg(c, [[0, -24], [15, -8], [0, -2]], '#e1f5fe', false);
      pg(c, [[0, -2], [-15, -8], [-11, 14]], '#81d4fa', false);
      pg(c, [[0, -2], [15, -8], [11, 14], [0, 22]], '#4fc3f7', false);
      pg(c, [[0, -24], [15, -8], [11, 14], [0, 22], [-11, 14], [-15, -8]], null);
      c.beginPath(); c.moveTo(0, -24); c.lineTo(0, 22); c.moveTo(-15, -8); c.lineTo(0, -2); c.lineTo(15, -8); c.globalAlpha = 0.4; c.stroke(); c.globalAlpha = 1;
      sFace(c, 2, -6, 3);
      c.beginPath(); c.arc(7, 1, 3, 0.2, Math.PI - 0.2); c.stroke();
      ell(c, 1, -1, 3, 1.8, 'rgba(255,120,150,0.4)', false);
      pg(c, [[-17, 2], [-24, 8], [-17, 10]], '#81d4fa'); pg(c, [[17, 2], [24, 8], [17, 10]], '#81d4fa');
      for (let i = 0; i < 3; i++) { const h = 6 + i % 2 * 4; const x = -8 + i * 8, y = -28 - Math.sin(t * 0.006 + i) * 1.5; pg(c, [[x - 3, y], [x, y - h], [x + 3, y]], '#e1f5fe'); }
      c.restore();
      for (let i = 0; i < 3; i++) { const a = t * 0.002 + i * 2.1; sSpark(c, Math.cos(a) * 24, Math.sin(a) * 22, 2.6, '#fff'); }
      sHand(c, shoot, '#b3e5fc');
    }
  },
  {
    id: 'samurai', name: 'Снеговик', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Добродушный снеговик в цилиндре, с морковкой и тёплым шарфом. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '⛄',
    skin: '#ffffff', torso: '#ffffff', legs: '#e3f2fd', shoe: '#e3f2fd', arm: '#6d4c41', hand: '#6d4c41', bullet: 'orb', bulletColor: '#e1f5fe',
    full(c, t, shoot) {
      const sw = Math.sin(t * 0.005) * 2, b = Math.sin(t * 0.004);
      c.strokeStyle = '#6d4c41'; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(-10, 6); c.lineTo(-24, -2 + sw); c.moveTo(-19, 1 + sw * 0.7); c.lineTo(-23, 6 + sw); c.moveTo(10, 6); c.lineTo(24, -4 - sw); c.moveTo(19, -1 - sw * 0.7); c.lineTo(23, -7 - sw); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      ci(c, 0, 10, 12.5, '#fff'); ell(c, -3, 16, 8, 3, 'rgba(144,202,249,0.35)', false);
      ci(c, 0, 8, 1.8, '#212121', false); ci(c, 0, 14, 1.8, '#212121', false);
      c.save(); c.translate(0, b);
      ci(c, 1, -10, 10.5, '#fff'); ell(c, -4, -5, 5, 3, 'rgba(144,202,249,0.3)', false);
      ci(c, 3, -14, 1.8, '#212121', false); ci(c, 10, -14, 1.8, '#212121', false);
      pg(c, [[9, -10], [23, -8], [9, -7]], '#ff7043');
      for (let i = 0; i < 5; i++) ci(c, 2 + i * 2.2, -4.5 + Math.abs(i - 2) * 0.7, 0.9, '#212121', false);
      ell(c, -3, -9, 2.4, 1.5, 'rgba(255,100,120,0.45)', false);
      ell(c, 1, -19, 12, 2.6, '#212121'); rr(c, -5, -32, 13, 14, 2, '#212121'); rr(c, -5, -24, 13, 3.4, 0, '#e53935');
      rr(c, -10, -3, 22, 6, 3, '#e53935');
      c.fillStyle = '#fff'; c.fillRect(-6, -2.4, 3, 4.8); c.fillRect(2, -2.4, 3, 4.8);
      rr(c, 6, 2, 5, 11, 2, '#e53935'); c.fillStyle = '#fff'; c.fillRect(6.4, 6, 4.2, 2.4);
      c.restore();
      for (let i = 0; i < 3; i++) { const a = t * 0.0016 + i * 2.1; sSpark(c, Math.cos(a) * 25, Math.sin(a) * 21, 2.4, '#fff'); }
      sHand(c, shoot, '#6d4c41');
    }
  },
  {
    id: 'cupid', name: 'Сердечко-Купидон', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Милое живое сердечко с крылышками и нимбом. Награда 30-го уровня премиум-пропуска.', perkText: '🧲 Магнит монет', perk: { magnet: 70 },
    price: 0, icon: '💘',
    skin: '#f48fb1', torso: '#f8bbd0', legs: '#f48fb1', shoe: '#ffffff', arm: '#ffe0c2', hand: '#ffe0c2', bullet: 'heart', bulletColor: '#ff4081',
    full(c, t, shoot) {
      const f = Math.sin(t * 0.014) * 6, b = Math.sin(t * 0.004) * 1.5, k = 1 + Math.sin(t * 0.01) * 0.04;
      sGlow(c, 0, 0, 30, 'rgba(255,128,171,0.35)');
      c.save(); c.translate(0, b);
      ell(c, -17, -6 - f * 0.3, 5, 10, '#fff', true, -0.6 - f * 0.03); ell(c, 17, -6 - f * 0.3, 5, 10, '#fff', true, 0.6 + f * 0.03);
      rr(c, -7, 12, 5, 8, 2, '#f48fb1'); rr(c, 3, 12, 5, 8, 2, '#f48fb1');
      c.save(); c.scale(k, k); drawHeart(c, 0, 3, 11.5, '#f06292'); c.restore();
      ell(c, -7, -6, 3, 1.8, 'rgba(255,255,255,0.55)', false, -0.6);
      sFace(c, 1, -2, 3);
      c.beginPath(); c.arc(6, 5, 3, 0.2, Math.PI - 0.2); c.stroke();
      ell(c, -1, 3, 2.6, 1.6, 'rgba(255,255,255,0.35)', false);
      c.strokeStyle = '#ffd54f'; c.lineWidth = 2.6; ell(c, 0, -24 + Math.sin(t * 0.006), 8, 2.4, null); c.strokeStyle = OUT; c.lineWidth = 2;
      c.restore(); sHand(c, shoot, '#ffe0c2');
    }
  },
  {
    id: 'sprout', name: 'Подсолнух в Горшке', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Весёлый подсолнух, который вырос в горшке и пошёл гулять. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '🌻',
    skin: '#ffeb3b', torso: '#7cb342', legs: '#bf6b3a', shoe: '#d98550', arm: '#66bb6a', hand: '#66bb6a', bullet: 'orb', bulletColor: '#f9a825',
    full(c, t, shoot) {
      const sw = Math.sin(t * 0.005) * 2;
      pg(c, [[-11, 3], [11, 3], [8, 21], [-8, 21]], '#bf6b3a');
      rr(c, -13, 0, 26, 5, 2, '#d98550');
      ci(c, -3, 13, 1.4, '#8d4a24', false); ci(c, 3, 14, 1.4, '#8d4a24', false);
      rr(c, -2, -8, 4, 9, 1, '#558b2f');
      ell(c, -14, 5 + sw * 0.5, 7, 3, '#66bb6a', true, -0.5 + sw * 0.05); ell(c, 14, 5 - sw * 0.5, 7, 3, '#66bb6a', true, 0.5 - sw * 0.05);
      c.save(); c.translate(0, -16); c.rotate(sw * 0.02);
      for (let i = 0; i < 10; i++) { const a = i * 0.6283 + t * 0.0006; ell(c, Math.cos(a) * 10, Math.sin(a) * 10, 5.2, 2.6, '#ffd600', true, a); }
      ci(c, 0, 0, 8.4, '#8d5a2b');
      c.restore();
      sFace(c, -2, -17, 2.8);
      c.beginPath(); c.arc(3, -12, 2.8, 0.2, Math.PI - 0.2); c.stroke();
      sHand(c, shoot, '#66bb6a');
    }
  },
  {
    id: 'umbrella', name: 'Тучка-Дождик', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Пушистая тучка с зонтиком и своим дождиком. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '☁️',
    skin: '#eceff1', torso: '#cfd8dc', legs: '#90a4ae', shoe: '#4fc3f7', arm: '#eceff1', hand: '#eceff1', bullet: 'orb', bulletColor: '#4fc3f7',
    full(c, t, shoot) {
      const b = Math.sin(t * 0.004) * 1.5;
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.002 + i * 0.25) % 1, x = -10 + i * 7 + (i % 2) * 2, y = 14 + ph * 10;
        c.globalAlpha = 1 - ph * 0.6; pg(c, [[x, y - 3], [x + 2, y + 1], [x, y + 3], [x - 2, y + 1]], '#4fc3f7', false); c.globalAlpha = 1;
      }
      c.save(); c.translate(0, b);
      const cl = [[-10, 3, 9], [0, -5, 11], [11, 2, 9], [0, 7, 10]];
      c.lineWidth = 4.5; for (const q of cl) { c.beginPath(); c.arc(q[0], q[1], q[2], 0, 6.283); c.stroke(); }
      for (const q of cl) { c.beginPath(); c.arc(q[0], q[1], q[2], 0, 6.283); c.fillStyle = '#eceff1'; c.fill(); }
      c.lineWidth = 2; ell(c, 0, 14, 12, 3.5, 'rgba(120,144,156,0.25)', false);
      sFace(c, -1, -2, 3);
      c.beginPath(); c.arc(5, 4, 3, 0.2, Math.PI - 0.2); c.stroke();
      ell(c, -3, 4, 2.4, 1.5, 'rgba(255,120,150,0.45)', false);
      c.beginPath(); c.moveTo(0, -14); c.lineTo(0, -24); c.stroke();
      c.beginPath(); c.moveTo(-14, -22); c.arc(0, -22, 14, Math.PI, 0); c.quadraticCurveTo(7, -18, 7, -22); c.quadraticCurveTo(0, -18, 0, -22); c.quadraticCurveTo(-7, -18, -7, -22); c.quadraticCurveTo(-14, -18, -14, -22);
      c.closePath(); c.fillStyle = '#e53935'; c.fill(); c.stroke();
      pg(c, [[-3, -35], [0, -22], [3, -35]], '#ffd54f', false);
      c.restore(); sHand(c, shoot, '#eceff1');
    }
  },
  {
    id: 'bee', name: 'Сотовый Шмель', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Шестигранный улей-шмель с крылышками и жалом. Награда 30-го уровня премиум-пропуска.', perkText: '🧲 Магнит монет', perk: { magnet: 70 },
    price: 0, icon: '🐝',
    skin: '#ffca28', torso: '#ffca28', legs: '#212121', shoe: '#212121', arm: '#ffe082', hand: '#212121', bullet: 'orb', bulletColor: '#ffb300',
    full(c, t, shoot) {
      const w = Math.sin(t * 0.06) * 3, b = Math.sin(t * 0.005) * 2;
      c.save(); c.translate(0, b);
      ell(c, -7, -19, 5, 10 + w, 'rgba(225,245,254,0.85)', true, -0.5); ell(c, 5, -20, 4.5, 9 - w, 'rgba(225,245,254,0.75)', true, 0.4);
      c.beginPath(); c.moveTo(2, -16); c.quadraticCurveTo(0, -24, -4, -27); c.moveTo(8, -16); c.quadraticCurveTo(10, -24, 15, -26); c.stroke();
      ci(c, -4, -27, 2, '#212121'); ci(c, 15, -26, 2, '#212121');
      pg(c, [[-15, 5], [-23, 8], [-15, 11]], '#212121');
      const hx = [[0, -17], [15, -8], [15, 10], [0, 19], [-15, 10], [-15, -8]];
      pg(c, hx, '#ffca28', false);
      c.save(); c.beginPath(); c.moveTo(hx[0][0], hx[0][1]); for (let i = 1; i < 6; i++) c.lineTo(hx[i][0], hx[i][1]); c.closePath(); c.clip();
      c.fillStyle = '#3e2723'; c.fillRect(-16, 4, 32, 4.5); c.fillRect(-16, 12, 32, 4.5); c.restore();
      pg(c, hx, null);
      sFace(c, 1, -5, 3);
      c.beginPath(); c.arc(6, 0, 2.6, 0.2, Math.PI - 0.2); c.stroke();
      c.beginPath(); c.moveTo(-6, 18); c.lineTo(-7, 23); c.moveTo(6, 18); c.lineTo(7, 23); c.stroke();
      c.restore(); sHand(c, shoot, '#ffe082');
    }
  },
  {
    id: 'surfer', name: 'Капля-Серфер', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Капелька океана на доске для сёрфинга. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '🏄',
    skin: '#29b6f6', torso: '#29b6f6', legs: '#0288d1', shoe: '#ff7043', arm: '#4fc3f7', hand: '#4fc3f7', bullet: 'orb', bulletColor: '#ffee58',
    full(c, t, shoot) {
      const sw = Math.sin(t * 0.005);
      c.save(); c.translate(0, 21); c.rotate(sw * 0.08);
      ell(c, 0, 0, 23, 3.8, '#ff7043'); c.fillStyle = '#fff'; c.fillRect(-14, -1, 28, 1.8); c.restore();
      c.save(); c.translate(0, sw * 1.5); c.rotate(sw * 0.04);
      c.beginPath(); c.moveTo(0, -27); c.bezierCurveTo(6, -14, 16, -8, 16, 3); c.bezierCurveTo(16, 13, 9, 18, 0, 18); c.bezierCurveTo(-9, 18, -16, 13, -16, 3); c.bezierCurveTo(-16, -8, -6, -14, 0, -27);
      c.fillStyle = '#29b6f6'; c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2.4; c.beginPath(); c.arc(0, 3, 11, Math.PI * 1.05, Math.PI * 1.35); c.stroke(); c.strokeStyle = OUT; c.lineWidth = 2;
      rr(c, -6, -5, 21, 7, 3, '#212121'); c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-3, -4, 5, 1.6); c.fillRect(7, -4, 5, 1.6);
      c.beginPath(); c.arc(6, 8, 3.2, 0.2, Math.PI - 0.2); c.stroke();
      ci(c, -18, 6, 3.5, '#4fc3f7'); ci(c, 18, 6, 3.5, '#4fc3f7');
      c.restore();
      ci(c, -18, 18, 2, '#fff', false); ci(c, 17, 16, 1.6, '#fff', false);
      sHand(c, shoot, '#4fc3f7');
    }
  },
  {
    id: 'parrot', name: 'Попугай Ара', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Настоящая яркая птица с длинным хвостом и огромным клювом. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '🦜',
    skin: '#e53935', torso: '#e53935', legs: '#fdd835', shoe: '#fdd835', arm: '#1e88e5', hand: '#fdd835', bullet: 'star', bulletColor: '#69f0ae',
    full(c, t, shoot) {
      const sw = Math.sin(t * 0.007) * 2, f = Math.sin(t * 0.012) * 3;
      pg(c, [[-5, 10], [-18 - sw, 28], [-11, 29], [-4, 17]], '#1e88e5');
      pg(c, [[-3, 12], [-9 - sw, 30], [-3, 30], [1, 17]], '#fdd835');
      pg(c, [[-1, 12], [2 + sw, 29], [7, 28], [5, 14]], '#43a047');
      c.beginPath(); c.moveTo(-4, 18); c.lineTo(-4, 24); c.moveTo(4, 18); c.lineTo(4, 24); c.strokeStyle = '#ffb300'; c.lineWidth = 2.6; c.stroke(); c.strokeStyle = OUT; c.lineWidth = 2;
      ell(c, 0, 5, 12, 15, '#e53935');
      ell(c, -6, 6, 6.5, 11, '#1e88e5', true, 0.2 + f * 0.04); pg(c, [[-10, 14], [-5, 18], [-1, 14]], '#fdd835', false);
      pg(c, [[-1, -17], [-8, -28 - f * 0.4], [-3, -19], [0, -30 - f * 0.4], [3, -19], [8, -27], [5, -16]], '#fdd835');
      pg(c, [[-1, -17], [-4, -24], [0, -18]], '#43a047', false);
      ci(c, 4, -9, 10, '#e53935');
      ell(c, 6, -9, 5.4, 6, '#fff'); ci(c, 7.2, -9, 2.4, '#111', false);
      pg(c, [[11, -16], [24, -9], [20, 0], [12, -3]], '#ffb300');
      pg(c, [[12, -3], [20, 0], [14, 3], [10, -1]], '#6d4c41');
      sHand(c, shoot, '#e53935');
    }
  },
  {
    id: 'comet', name: 'Арбузик', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Сочный арбузный ломтик в очках, настоящий символ лета. Награда 30-го уровня премиум-пропуска.', perkText: '🧲 Магнит монет', perk: { magnet: 70 },
    price: 0, icon: '🍉',
    skin: '#ef5350', torso: '#ef5350', legs: '#43a047', shoe: '#2e7d32', arm: '#43a047', hand: '#43a047', bullet: 'orb', bulletColor: '#ef5350',
    full(c, t, shoot) {
      const sw = Math.sin(t * 0.005), b = Math.sin(t * 0.004) * 1.5;
      c.save(); c.translate(0, b);
      rr(c, -9, 10, 6, 11, 3, '#2e7d32'); rr(c, 4, 10, 6, 11, 3, '#2e7d32');
      c.beginPath(); c.moveTo(-18, -7); c.arc(0, -7, 18, Math.PI, 0, true); c.closePath(); c.fillStyle = '#43a047'; c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-15.5, -7); c.arc(0, -7, 15.5, Math.PI, 0, true); c.closePath(); c.fillStyle = '#e8f5e9'; c.fill();
      c.beginPath(); c.moveTo(-14, -7); c.arc(0, -7, 14, Math.PI, 0, true); c.closePath(); c.fillStyle = '#ef5350'; c.fill();
      c.beginPath(); c.moveTo(-18, -7); c.lineTo(18, -7); c.stroke();
      for (const q of [[-8, 4], [8, 4], [0, 9], [-11, -1], [12, -1]]) ell(c, q[0], q[1], 1.3, 2.2, '#212121', false, 0.3);
      rr(c, -8, -6, 21, 7, 3, '#212121'); c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-5, -5, 5, 1.6); c.fillRect(6, -5, 5, 1.6);
      c.beginPath(); c.arc(3, 5, 3.2, 0.2, Math.PI - 0.2); c.stroke();
      ci(c, -20, -3 + sw * 2, 3.5, '#43a047'); ci(c, 20, -3 - sw * 2, 3.5, '#43a047');
      rr(c, -1.5, -13, 3, 6, 1, '#2e7d32');
      ell(c, 4, -12, 5, 2.4, '#66bb6a', true, -0.4);
      c.restore();
      const g = (t * 0.0012) % 1; ci(c, 17, 4 + g * 14, 1.8 * (1 - g) + 0.5, 'rgba(239,83,80,0.85)', false);
      for (let i = 0; i < 2; i++) { const a = 0.5 + Math.sin(t * 0.006 + i * 2) * 0.5; sSpark(c, i ? -22 : 23, i ? -22 : -14, 2 + a * 2.4, '#fff176'); }
      sHand(c, shoot, '#43a047');
    }
  },
  {
    id: 'scholar', name: 'Живая Книга', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Умная книга в очках со взмахивающими страницами. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '📖',
    skin: '#3949ab', torso: '#3949ab', legs: '#283593', shoe: '#ffd54f', arm: '#3949ab', hand: '#fff', bullet: 'arrow', bulletColor: '#ffb300',
    full(c, t, shoot) {
      const f = Math.sin(t * 0.012) * 4, b = Math.sin(t * 0.004) * 1.5;
      c.save(); c.translate(0, b);
      pg(c, [[-14, -10], [-27, -16 - f], [-26, 6], [-14, 8]], '#fff'); pg(c, [[14, -10], [27, -16 - f], [26, 6], [14, 8]], '#fff');
      c.globalAlpha = 0.4; c.beginPath(); c.moveTo(-18, -8 - f * 0.4); c.lineTo(-22, 0); c.moveTo(18, -8 - f * 0.4); c.lineTo(22, 0); c.stroke(); c.globalAlpha = 1;
      rr(c, -8, 16, 6, 7, 2, '#ffd54f'); rr(c, 3, 16, 6, 7, 2, '#ffd54f');
      rr(c, -14, -18, 28, 35, 3, '#3949ab');
      rr(c, -14, -18, 6, 35, [3, 0, 0, 3], '#283593');
      rr(c, 12, -16, 4, 31, 1, '#fff');
      c.globalAlpha = 0.5; c.beginPath(); c.moveTo(12, -10); c.lineTo(16, -10); c.moveTo(12, -4); c.lineTo(16, -4); c.moveTo(12, 2); c.lineTo(16, 2); c.stroke(); c.globalAlpha = 1;
      rr(c, -5, -14, 17, 5, 2, '#ffd54f');
      c.lineWidth = 1.8; ci(c, -1, -2, 5, 'rgba(255,255,255,0.4)'); ci(c, 8, -2, 5, 'rgba(255,255,255,0.4)');
      c.beginPath(); c.moveTo(4, -2); c.lineTo(3, -2); c.stroke(); c.lineWidth = 2;
      ci(c, 0, -2, 1.6, '#111', false); ci(c, 9, -2, 1.6, '#111', false);
      c.beginPath(); c.arc(4.5, 6, 3, 0.2, Math.PI - 0.2); c.stroke();
      pg(c, [[-1, 17], [5, 17], [5, 26], [2, 23], [-1, 26]], '#e53935');
      c.save(); c.translate(-12, -20); c.rotate(-0.5); rr(c, -1.8, -9, 3.6, 12, 1, '#ffb300'); pg(c, [[-1.8, 3], [1.8, 3], [0, 7]], '#ffe0b2'); c.restore();
      c.restore(); sHand(c, shoot, '#3949ab');
    }
  },
  {
    id: 'vampire', name: 'Тень Графа', rarity: 'season', rarityName: 'Сезон', season: true,
    desc: 'Парящий плащ с красными глазами и клыками. Награда 30-го уровня премиум-пропуска.',
    price: 0, icon: '🧛',
    skin: '#212121', torso: '#212121', legs: '#212121', shoe: '#000000', arm: '#212121', hand: '#eceff1', bullet: 'bat', bulletColor: '#4a148c',
    full(c, t, shoot) {
      const w = Math.sin(t * 0.008) * 2.5, b = Math.sin(t * 0.004) * 2;
      sGlow(c, -6, -8, 28, 'rgba(255,245,157,0.35)');
      c.save(); c.translate(0, b);
      pg(c, [[-11, -10], [11, -10], [20 + w, 18], [11, 14], [4, 22 - w], [-4, 15], [-11, 22 + w], [-20, 16]], '#212121');
      pg(c, [[-5, -6], [5, -6], [11, 14], [4, 19 - w], [-4, 13], [-9, 17 + w]], '#b71c1c', false);
      pg(c, [[-12, -9], [-9, -22], [-3, -10]], '#212121'); pg(c, [[12, -9], [9, -22], [3, -10]], '#212121');
      pg(c, [[-9, -12], [-8, -19], [-4, -12]], '#b71c1c', false); pg(c, [[9, -12], [8, -19], [4, -12]], '#b71c1c', false);
      ci(c, 1, -14, 9.5, '#eceff1');
      c.beginPath(); c.arc(1, -16, 9.8, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fillStyle = '#212121'; c.fill(); c.stroke();
      pg(c, [[4, -17], [8, -13], [9, -18]], '#212121', false);
      pg(c, [[2, -14], [7, -14], [4.5, -11]], '#ff1744', false); pg(c, [[7, -14], [12, -14], [9.5, -11]], '#ff1744', false);
      c.beginPath(); c.moveTo(3, -7); c.lineTo(11, -7); c.stroke();
      pg(c, [[4, -7], [5.5, -3.5], [7, -7]], '#fff', false); pg(c, [[8, -7], [9.5, -3.5], [11, -7]], '#fff', false);
      c.restore(); sHand(c, shoot, '#eceff1');
    }
  }
];

// ==========================================================
// 5. ПОВОРОТНЫЕ ДЕТАЛИ: ранец, кепка с пропеллером, пружина
// ==========================================================
function drawSpringShape(c, cx, baseY, ext) {
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = OUT; c.lineWidth = 1.8;
  rr(c, cx - 11, baseY - 3.5, 22, 4, 1.8, '#455a64');
  const n = 5;
  const pts = [];
  for (let i = 0; i <= n * 2; i++) {
    pts.push([cx + (i % 2 === 0 ? -7 : 7), baseY - 3.5 - ext * (i / (n * 2))]);
  }
  const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); };
  c.strokeStyle = OUT; c.lineWidth = 6.6; path();
  c.strokeStyle = '#90a4ae'; c.lineWidth = 4.4; path();
  c.strokeStyle = '#eceff1'; c.lineWidth = 1.4; path();
  c.lineWidth = 1.8; c.strokeStyle = OUT;
  rr(c, cx - 12, baseY - 3.5 - ext - 4.5, 24, 5, 2.2, '#e53935');
  c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(cx - 9, baseY - 3.5 - ext - 3.6, 12, 1.4);
  c.restore();
}

function drawPropCap(c, cx, cy, spin) {
  c.save();
  c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = 1.8;
  c.beginPath(); c.moveTo(cx - 12, cy); c.arc(cx, cy, 12, Math.PI, 0); c.closePath();
  c.fillStyle = '#ffca28'; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, 12, Math.PI * 1.5, 0); c.closePath();
  c.fillStyle = '#e53935'; c.fill(); c.stroke();
  rr(c, cx - 13.5, cy - 1.5, 27, 4.6, 2.2, '#8d6e63');
  rr(c, cx - 1.6, cy - 17.5, 3.2, 6.5, 1, '#546e7a');
  const k1 = Math.max(3, 20 * Math.abs(Math.cos(spin)));
  const k2 = Math.max(3, 20 * Math.abs(Math.sin(spin)));
  ell(c, cx, cy - 19, k1, 2.7, '#ef5350');
  ell(c, cx, cy - 19, k2, 2, 'rgba(255,255,255,0.5)', false);
  ci(c, cx, cy - 19, 2.2, '#37474f');
  c.restore();
}

function drawJetpackShape(c, cx, cy, flame) {
  c.save();
  c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = 1.8;
  rr(c, cx - 11, cy - 12, 10.5, 23, 5, '#cfd8dc');
  rr(c, cx + 0.5, cy - 12, 10.5, 23, 5, '#b0bec5');
  c.fillStyle = '#e53935'; c.fillRect(cx - 10.5, cy - 4, 9.5, 3.2); c.fillRect(cx + 1, cy - 4, 9.5, 3.2);
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(cx - 8, cy - 9, 2, 12); c.fillRect(cx + 3.5, cy - 9, 2, 12);
  rr(c, cx - 10, cy - 15.5, 8.5, 4.5, 2, '#546e7a'); rr(c, cx + 1.5, cy - 15.5, 8.5, 4.5, 2, '#546e7a');
  rr(c, cx - 9, cy + 10, 7, 4.5, 1.5, '#37474f'); rr(c, cx + 2, cy + 10, 7, 4.5, 1.5, '#37474f');
  if (flame) {
    const fl = 9 + Math.random() * 8;
    for (const x0 of [cx - 5.5, cx + 5.5]) {
      pg(c, [[x0 - 4, cy + 14.5], [x0 + 4, cy + 14.5], [x0, cy + 14.5 + fl]], '#ff7a18', false);
      pg(c, [[x0 - 2.2, cy + 14.5], [x0 + 2.2, cy + 14.5], [x0, cy + 14.5 + fl * 0.6]], '#ffe066', false);
    }
  }
  c.restore();
}

// ==========================================================
// 6. ПЕРСОНАЖ: общий рендер (в игре, меню, магазине)
// ==========================================================
function drawBase(c, s, shoot) {
  c.strokeStyle = OUT; c.lineWidth = 2;
  const legC = s.legs || s.torso;
  rr(c, -9, 15, 8, 7, 3, legC);
  rr(c, 2, 15, 8, 7, 3, legC);
  if (s.shoe) { rr(c, -10, 18, 10, 5, 2, s.shoe); rr(c, 1, 18, 11, 5, 2, s.shoe); }
  const tw = s.torsoW || 22;
  rr(c, -tw / 2, 5, tw, 13, 5, s.torso);
  ci(c, -tw / 2 - 1, 12, 3.7, s.arm || s.skin);
  ci(c, tw / 2 + 1, 12, 3.7, s.arm || s.skin);
  if (s.headShape === 'square') rr(c, -14, -21, 28, 28, 3, s.skin);
  else ci(c, 0, -7, 15, s.skin);
}

// ----- Времена года: у каждого персонажа свои сезонные аксессуары (меняются сами по дате) -----
// Зима (дек–фев): шарф, снежок на голове, снежинки. Весна (мар–май): цветок и бабочка.
// Лето (июн–авг): гавайская гирлянда, очки, солнечные блики. Осень (сен–ноя): листик и падающая листва.
// Для проверки можно открыть игру с ?season=winter|spring|summer|autumn. У персонажа можно отключить: noSeasonGear: true.
function currentSeasonOfYear() {
  try {
    const q = new URLSearchParams(location.search).get('season');
    if (q === 'winter' || q === 'spring' || q === 'summer' || q === 'autumn') return q;
  } catch (e) {}
  const m = new Date().getMonth();
  return (m === 11 || m <= 1) ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
}
function drawSeasonGear(c, s, t) {
  if (s.event || s.season || s.noSeasonGear) return;
  const se = currentSeasonOfYear(), tw = s.torsoW || 22;
  c.save();
  c.lineWidth = 1.6; c.strokeStyle = OUT;
  if (se === 'winter') {
    rr(c, -tw / 2 - 1, 4, tw + 2, 6, 3, '#e53935');
    c.fillStyle = '#fff'; c.fillRect(-tw / 2 + 3, 4.8, 2.6, 4.6); c.fillRect(tw / 2 - 6, 4.8, 2.6, 4.6);
    rr(c, tw / 2 - 6, 8, 5, 10, 2, '#e53935');
    c.fillStyle = '#fff'; c.fillRect(tw / 2 - 5.6, 12.5, 4.2, 2.4);
    ell(c, -5, -21.5, 6, 2.6, '#fff', false); ci(c, 3, -22, 2.4, '#fff', false); ci(c, -11, -18, 1.8, '#fff', false);
    c.strokeStyle = '#4fc3f7'; c.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const a = t * 0.0014 + i * 2.1, x = Math.cos(a) * 23, y = -6 + Math.sin(a * 1.3 + i) * 22;
      c.beginPath();
      for (let k = 0; k < 3; k++) { const r = k * 1.0472; c.moveTo(x + Math.cos(r) * 2.8, y + Math.sin(r) * 2.8); c.lineTo(x - Math.cos(r) * 2.8, y - Math.sin(r) * 2.8); }
      c.stroke();
    }
  } else if (se === 'spring') {
    const fx = -11, fy = -17;
    ell(c, fx - 3, fy + 3, 4, 1.8, '#66bb6a', true, 0.6);
    for (let i = 0; i < 5; i++) { const a = i * 1.2566; ell(c, fx + Math.cos(a) * 2.8, fy + Math.sin(a) * 2.8, 2.5, 1.9, '#f48fb1', true, a); }
    ci(c, fx, fy, 2, '#ffeb3b', true);
    const a = t * 0.002, bx = 19 + Math.cos(a) * 4, by = -18 + Math.sin(a * 1.7) * 5, fl = 0.6 + Math.abs(Math.sin(t * 0.02)) * 0.4;
    ell(c, bx - 2, by, 2.6 * fl, 3.4, '#ba68c8', true, -0.4); ell(c, bx + 2, by, 2.6 * fl, 3.4, '#ce93d8', true, 0.4);
  } else if (se === 'summer') {
    for (let i = 0; i < 7; i++) {
      const x = -9 + i * 3, y = 6.5 + (1 - Math.pow((x) / 10, 2)) * 3;
      ci(c, x, y, 2.1, ['#ff7043', '#ffeb3b', '#ec407a'][i % 3], true);
    }
    if (!s.noEyes) {
      rr(c, -9, -12, 8.5, 5.5, 2, '#212121'); rr(c, 1.5, -12, 8.5, 5.5, 2, '#212121');
      c.beginPath(); c.moveTo(-0.5, -10); c.lineTo(1.5, -10); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(-7, -11, 3, 1.4); c.fillRect(3.5, -11, 3, 1.4);
    }
    for (let i = 0; i < 2; i++) {
      const g = 0.5 + Math.sin(t * 0.006 + i * 2) * 0.5;
      c.save(); c.translate(i ? -20 : 21, i ? -24 : -4); c.rotate(t * 0.001); starPoly(c, 2 + g * 2.6, 0.9, 4); c.fillStyle = '#fff176'; c.fill(); c.lineWidth = 1; c.stroke(); c.restore();
    }
  } else {
    const lx = 9, ly = -20;
    c.save(); c.translate(lx, ly); c.rotate(0.5);
    ell(c, 0, 0, 5, 3, '#e65100', true); ell(c, -3, -2, 2.4, 1.6, '#ff8f00', false, 0.4);
    c.strokeStyle = '#6d4c41'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-4, 0); c.lineTo(5, 0); c.moveTo(-1, 0); c.lineTo(1, -2.5); c.stroke();
    c.restore();
    const cols = ['#ff8f00', '#bf360c', '#fbc02d'];
    for (let i = 0; i < 3; i++) {
      const ph = ((t * 0.0006 + i * 0.37) % 1), x = -22 + i * 22 + Math.sin(ph * 9 + i) * 4, y = -26 + ph * 52;
      c.save(); c.translate(x, y); c.rotate(ph * 8 + i); ell(c, 0, 0, 3.2, 1.9, cols[i], true); c.restore();
    }
  }
  c.restore();
}

function drawCharacter(c, skin, cx, cy, facing, o) {
  o = o || {};
  const t = o.t !== undefined ? o.t : performance.now();
  const sc = o.scale || 1;
  c.save();
  c.translate(cx, cy);
  c.scale(sc * facing, sc);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = OUT; c.lineWidth = 2;
  if (o.powerup === 'jetpack') drawJetpackShape(c, -17, 4, true);
  if (skin.back) { c.save(); skin.back(c, t); c.restore(); c.strokeStyle = OUT; c.lineWidth = 2; }
  if (skin.full) {
    skin.full(c, t, !!o.shoot);
  } else {
    drawBase(c, skin, !!o.shoot);
    if (!skin.noEyes) defaultEyes(c);
    if (skin.look) { c.save(); skin.look(c, t, facing); c.restore(); c.strokeStyle = OUT; c.lineWidth = 2; }
    if (o.shoot) {
      rr(c, -2.5, -26, 5, 7, 2, skin.arm || skin.skin);
      ci(c, 0, -29, 5, skin.hand || skin.skin);
    }
  }
  drawSeasonGear(c, skin, t);
  if (o.powerup === 'propeller') drawPropCap(c, 1, -17, t * 0.05);
  c.restore();
}

function drawBullet(c, b, skin, t) {
  const st = skin.bullet || 'orb';
  const col = skin.bulletColor;
  c.save();
  c.translate(b.x, b.y);
  c.strokeStyle = OUT; c.lineWidth = 1.8; c.fillStyle = col; c.lineJoin = 'round';
  if (st === 'shuriken') {
    c.rotate(t * 0.03); starPoly(c, 8.5, 3, 4); c.fill(); c.stroke(); ci(c, 0, 0, 1.6, '#222', false);
  } else if (st === 'star') {
    c.rotate(t * 0.015); starPoly(c, 9.5, 4.2, 5); c.fill(); c.stroke();
  } else if (st === 'pixel') {
    c.rotate(t * 0.01); c.fillRect(-5, -5, 10, 10); c.strokeRect(-5, -5, 10, 10);
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(-4, -4, 4, 4);
  } else if (st === 'hook') {
    c.strokeStyle = '#8d8d8d'; c.lineWidth = 2; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(0, 4); c.lineTo(0, 34); c.stroke(); c.setLineDash([]);
    c.strokeStyle = OUT; c.lineWidth = 1.8;
    pg(c, [[0, -13], [6, 2], [1, 0], [0, 5], [-1, 0], [-6, 2]], col);
  } else if (st === 'arrow') {
    c.strokeStyle = '#8d6e63'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, -8); c.lineTo(0, 12); c.stroke();
    c.strokeStyle = OUT; c.lineWidth = 1.6;
    pg(c, [[0, -15], [4, -6], [-4, -6]], '#cfd8dc');
    pg(c, [[0, 12], [4, 17], [0, 14.5], [-4, 17]], col);
  } else if (st === 'saber') {
    rr(c, -3.2, -16, 6.4, 30, 3.2, col);
    c.fillStyle = '#fff'; c.fillRect(-1, -14, 2, 26);
    rr(c, -3, 14, 6, 6, 1, '#777');
  } else if (st === 'bat') {
    pg(c, [[0, -5], [4, -9], [11, -4], [8, 0], [12, 6], [4, 3], [0, 8], [-4, 3], [-12, 6], [-8, 0], [-11, -4], [-4, -9]], col);
  } else if (st === 'web') {
    ci(c, 0, 0, 7.5, '#f5f5f5');
    c.strokeStyle = '#888'; c.lineWidth = 1;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 7.5, Math.sin(a) * 7.5); c.stroke(); }
    c.beginPath(); c.arc(0, 0, 4, 0, 6.283); c.stroke();
  } else if (st === 'heart') {
    c.rotate(Math.sin(t * 0.01) * 0.2); drawHeart(c, 0, 0, 7, col);
    ci(c, -3, -3, 1.4, 'rgba(255,255,255,0.8)', false);
  } else if (st === 'bolt') {
    pg(c, [[3, -13], [-5, 1], [0, 1], [-3, 13], [6, -2], [1, -2]], col);
  } else {
    // светящийся шар — готовый спрайт (градиент не создаётся заново каждый кадр)
    c.drawImage(getOrbSprite(col), -15, -15);
  }
  c.restore();
}

// ==========================================================
// 7. МОНСТРЫ (рисунки)
// ==========================================================
function drawBatShape(c, m, pal) {
  const flap = Math.sin((m.phase || 0) * 5);
  const wy = flap * 9;
  c.fillStyle = pal.wing;
  pg(c, [[-6, -2], [-24, -10 - wy], [-20, 0], [-14, -2 + wy * 0.3], [-10, 6]], pal.wing);
  pg(c, [[6, -2], [24, -10 - wy], [20, 0], [14, -2 + wy * 0.3], [10, 6]], pal.wing);
  ell(c, 0, 1, 11, 10, pal.body);
  pg(c, [[-8, -7], [-6, -15], [-2, -8]], pal.body);
  pg(c, [[8, -7], [6, -15], [2, -8]], pal.body);
  ci(c, -4, -1, 2.6, pal.eye, false); ci(c, 4, -1, 2.6, pal.eye, false);
  pg(c, [[-3, 5], [-1, 8], [0, 5]], '#fff', false); pg(c, [[1, 5], [3, 8], [4, 5]], '#fff', false);
}

function drawGolemShape(c, m, pal) {
  const wob = Math.sin(m.phase || 0) * 1.2;
  rr(c, -17, 6, 12, 14, 4, pal.dark); rr(c, 5, 6, 12, 14, 4, pal.dark);
  rr(c, -22 + wob, -6, 44, 22, 6, pal.body);
  rr(c, -25, -4 + wob, 9, 18, 4, pal.dark); rr(c, 16, -4 - wob, 9, 18, 4, pal.dark);
  rr(c, -14, -22, 28, 20, 6, pal.body);
  pg(c, [[-14, -14], [-6, -22], [-2, -14]], pal.light, false);
  pg(c, [[2, -22], [12, -20], [8, -12]], pal.light, false);
  ell(c, -6, -12, 3.4, 3, pal.eye, false); ell(c, 6, -12, 3.4, 3, pal.eye, false);
  c.beginPath(); c.moveTo(-6, -5); c.lineTo(6, -5); c.stroke();
  if (m.hp < m.maxHp) { c.beginPath(); c.moveTo(-3, -22); c.lineTo(0, -15); c.lineTo(-4, -10); c.stroke(); }
}

function drawMonster(c, m, t) {
  c.save();
  c.translate(m.x + m.w / 2, m.y + m.h / 2);
  c.lineWidth = 2; c.strokeStyle = OUT; c.lineJoin = 'round';
  const ph = m.phase || 0;
  if (m.charge > 0 && !LOW_FX) { c.shadowColor = m.fire || '#ff6a00'; c.shadowBlur = 8 + m.charge * 18; }
  const lk = Math.sin(ph) * 1.6;
  switch (m.kind) {
    case 'blot': {
      c.fillStyle = '#4527a0';
      c.beginPath(); c.moveTo(-24, 12);
      c.bezierCurveTo(-30, -8, -14, -22, 0, -18); c.bezierCurveTo(16, -22, 30, -8, 24, 12);
      c.quadraticCurveTo(14, 20, 6, 12); c.quadraticCurveTo(0, 22, -6, 12); c.quadraticCurveTo(-14, 20, -24, 12);
      c.closePath(); c.fill(); c.stroke();
      ci(c, -9, -4, 6, '#fff'); ci(c, 9, -4, 6, '#fff');
      ci(c, -9 + lk, -3, 2.8, '#c62828', false); ci(c, 9 + lk, -3, 2.8, '#c62828', false);
      c.lineWidth = 2.4; c.beginPath(); c.moveTo(-15, -11); c.lineTo(-5, -8); c.moveTo(15, -11); c.lineTo(5, -8); c.stroke();
      break;
    }
    case 'eraser': {
      rr(c, -22, -15, 44, 30, 7, '#f48fb1');
      rr(c, -22, 2, 44, 13, [0, 0, 7, 7], '#42a5f5');
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(-18, -12, 22, 3);
      ci(c, -8, -4, 4.4, '#fff'); ci(c, 8, -4, 4.4, '#fff');
      ci(c, -8 + lk * 0.6, -4, 1.9, '#111', false); ci(c, 8 + lk * 0.6, -4, 1.9, '#111', false);
      c.beginPath(); c.moveTo(-6, 5); c.lineTo(-2, 8); c.lineTo(2, 5); c.lineTo(6, 8); c.stroke();
      break;
    }
    case 'bat': drawBatShape(c, m, { wing: '#5d4037', body: '#3e2723', eye: '#ffeb3b' }); break;
    case 'cavebat': drawBatShape(c, m, { wing: '#6a1b9a', body: '#311b92', eye: '#00e5ff' }); break;
    case 'shroom': {
      const sq = Math.sin(ph) * 1.5;
      rr(c, -9, -2, 18, 20, 6, '#f5e6c8');
      c.beginPath(); c.moveTo(-22, 2 + sq); c.bezierCurveTo(-24, -22, 24, -22, 22, 2 + sq); c.closePath();
      c.fillStyle = '#c62828'; c.fill(); c.stroke();
      ci(c, -10, -9, 3.6, '#fff', false); ci(c, 8, -12, 3, '#fff', false); ci(c, 0, -5, 2.4, '#fff', false);
      ci(c, -4, 8, 2, '#111', false); ci(c, 4, 8, 2, '#111', false);
      ci(c, 14 + Math.sin(ph * 3) * 4, -20 - (ph * 3 % 3) * 2, 1.6, 'rgba(170,255,120,0.8)', false);
      break;
    }
    case 'icegolem': drawGolemShape(c, m, { body: '#81d4fa', dark: '#4fc3f7', light: '#e1f5fe', eye: '#01579b' }); break;
    case 'wraith': drawGolemShape(c, m, { body: '#efe7d6', dark: '#d4c8a8', light: '#fff', eye: '#d4a82a' }); break;
    case 'snowspirit': {
      c.fillStyle = 'rgba(240,250,255,0.95)';
      c.beginPath(); c.moveTo(-17, 14); c.bezierCurveTo(-22, -22, 22, -22, 17, 14);
      c.quadraticCurveTo(10, 8, 6, 17); c.quadraticCurveTo(0, 8, -6, 17); c.quadraticCurveTo(-10, 8, -17, 14);
      c.closePath(); c.fill(); c.stroke();
      ci(c, -6, -4, 3.4, '#1565c0', false); ci(c, 6, -4, 3.4, '#1565c0', false);
      ell(c, 0, 5, 3.2, 2.4, '#1565c0', false);
      for (let i = 0; i < 3; i++) { const a = ph * 2 + i * 2.1; ci(c, Math.cos(a) * 24, Math.sin(a) * 14, 2, '#bbdefb', false); }
      break;
    }
    case 'crystalbug': {
      const bob = Math.sin(ph * 1.5) * 2;
      c.strokeStyle = OUT; c.lineWidth = 2;
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(s * 10, 4 + i * 5 + bob); c.lineTo(s * 24, 8 + i * 6 + bob); c.stroke(); }
      pg(c, [[0, -19 + bob], [17, -2 + bob], [10, 16 + bob], [-10, 16 + bob], [-17, -2 + bob]], '#26c6da');
      pg(c, [[0, -19 + bob], [17, -2 + bob], [0, 4 + bob]], '#b2ebf2', false);
      pg(c, [[-17, -2 + bob], [0, 4 + bob], [-10, 16 + bob]], '#ab47bc', false);
      ci(c, -5, -1 + bob, 2.6, '#fff', false); ci(c, 5, -1 + bob, 2.6, '#fff', false);
      ci(c, -5, -1 + bob, 1.2, '#d500f9', false); ci(c, 5, -1 + bob, 1.2, '#d500f9', false);
      break;
    }
    case 'imp': {
      const fl = Math.sin(ph * 4) * 3;
      pg(c, [[-8, -2], [-26, -12 + fl], [-18, 4]], '#7a1a1a'); pg(c, [[8, -2], [26, -12 + fl], [18, 4]], '#7a1a1a');
      ell(c, 0, 4, 13, 14, '#e53935');
      pg(c, [[-11, -9], [-14, -21], [-5, -12]], '#4a0d0d'); pg(c, [[11, -9], [14, -21], [5, -12]], '#4a0d0d');
      ell(c, -5, 0, 3.6, 3, '#ffeb3b', false); ell(c, 5, 0, 3.6, 3, '#ffeb3b', false);
      ci(c, -5, 0, 1.2, '#111', false); ci(c, 5, 0, 1.2, '#111', false);
      c.beginPath(); c.moveTo(-6, 9); c.lineTo(-2, 11); c.lineTo(2, 9); c.lineTo(6, 11); c.stroke();
      if (m.charge > 0) ci(c, 0, 21, 3 + m.charge * 6, '#ff9100', false);
      break;
    }
    case 'skull': {
      const fl = Math.sin(ph * 5) * 3;
      pg(c, [[-12, -12], [-10, -26 + fl], [-4, -16], [0, -30 - fl], [5, -16], [10, -26 + fl], [12, -12]], '#ff6d00');
      pg(c, [[-5, -13], [0, -23 - fl], [5, -13]], '#ffd54f', false);
      ell(c, 0, -2, 15, 14, '#efe8dc');
      rr(c, -8, 8, 16, 9, 3, '#efe8dc');
      ell(c, -6, -2, 4, 4.6, '#222', false); ell(c, 6, -2, 4, 4.6, '#222', false);
      ci(c, -6, -2, 1.5, '#ff5252', false); ci(c, 6, -2, 1.5, '#ff5252', false);
      c.beginPath(); c.moveTo(-4, 12); c.lineTo(-4, 16); c.moveTo(0, 12); c.lineTo(0, 16); c.moveTo(4, 12); c.lineTo(4, 16); c.stroke();
      break;
    }
    case 'drone': {
      const spin = ph * 10;
      c.strokeStyle = '#90a4ae'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-8, -9); c.lineTo(-8, -13); c.moveTo(8, -9); c.lineTo(8, -13); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      ell(c, -8, -14, Math.max(3, 14 * Math.abs(Math.cos(spin))), 2, 'rgba(176,190,197,0.85)');
      ell(c, 8, -14, Math.max(3, 14 * Math.abs(Math.sin(spin))), 2, 'rgba(176,190,197,0.85)');
      rr(c, -21, -9, 42, 20, 9, '#455a64');
      rr(c, -15, 11, 30, 4, 2, '#263238');
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-16, -6, 22, 3);
      ci(c, 0, 1, 6, '#102027');
      ci(c, 0, 1, 3 + m.charge * 2, m.charge > 0 ? '#00e5ff' : '#ff1744', false);
      break;
    }
    case 'bot': {
      c.strokeStyle = '#90a4ae'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, -17); c.lineTo(0, -24); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      ci(c, 0, -26, 3.2, Math.sin(ph * 6) > 0 ? '#ff1744' : '#ffeb3b');
      rr(c, -17, -17, 34, 26, 8, '#546e7a');
      rr(c, -12, -11, 24, 13, 5, '#102027');
      ci(c, -5, -4, 3, '#00e5ff', false); ci(c, 5, -4, 3, '#00e5ff', false);
      rr(c, -13, 9, 26, 9, 3, '#37474f');
      rr(c, -23, -3, 7, 12, 3, '#78909c'); rr(c, 16, -3, 7, 12, 3, '#78909c');
      break;
    }
    case 'jelly': {
      const pl = Math.sin(ph * 3) * 2;
      c.strokeStyle = '#ce93d8'; c.lineWidth = 2.4;
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 7, 4); c.quadraticCurveTo(i * 7 + Math.sin(ph * 3 + i) * 5, 14, i * 7 - Math.sin(ph * 3 + i) * 4, 22); c.stroke(); }
      c.strokeStyle = OUT; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-20, 6); c.bezierCurveTo(-24, -26 + pl, 24, -26 + pl, 20, 6); c.quadraticCurveTo(0, 12, -20, 6); c.closePath();
      c.fillStyle = 'rgba(244,143,177,0.92)'; c.fill(); c.stroke();
      ell(c, -7, -10, 5, 3, 'rgba(255,255,255,0.5)', false, -0.4);
      ci(c, -6, -2, 2.6, '#fff', false); ci(c, 6, -2, 2.6, '#fff', false);
      ci(c, -6, -2, 1.2, '#311b92', false); ci(c, 6, -2, 1.2, '#311b92', false);
      break;
    }
    case 'piranha': {
      const tw = Math.sin(ph * 6) * 4;
      pg(c, [[-14, 0], [-26, -9 + tw], [-26, 9 - tw]], '#e53935');
      ell(c, 0, 0, 18, 12, '#546e7a');
      pg(c, [[-4, -11], [4, -17], [8, -10]], '#e53935');
      ell(c, 2, 4, 14, 6, '#cfd8dc', false);
      ci(c, 8, -3, 3.8, '#fff'); ci(c, 9, -3, 1.6, '#111', false);
      c.beginPath(); c.moveTo(12, 4); c.lineTo(18, 3); c.stroke();
      pg(c, [[12, 4], [14, 8], [16, 4]], '#fff', false); pg(c, [[16, 4], [18, 8], [20, 3]], '#fff', false);
      break;
    }
    case 'ufo': {
      c.beginPath(); c.moveTo(-11, -4); c.bezierCurveTo(-11, -20, 11, -20, 11, -4); c.closePath();
      c.fillStyle = 'rgba(129,212,250,0.9)'; c.fill(); c.stroke();
      ci(c, 0, -9, 3, '#8bd45a'); ci(c, 0, -9, 1, '#111', false);
      ell(c, 0, 2, 25, 9, '#78909c');
      for (let i = -2; i <= 2; i++) ci(c, i * 9, 3, 2.2, ((Math.floor(ph * 3) + i) % 2 === 0) ? '#ffeb3b' : '#76ff03', false);
      if (m.charge > 0) ci(c, 0, 14, 3 + m.charge * 5, '#76ff03', false);
      break;
    }
    case 'meteor': {
      const fl = Math.sin(ph * 6) * 3;
      pg(c, [[-8, -16], [-6, -30 + fl], [0, -20], [6, -32 - fl], [9, -16]], '#ff7043');
      pg(c, [[-3, -17], [0, -26 + fl], [4, -17]], '#ffee58', false);
      c.beginPath(); c.moveTo(-18, 4); c.lineTo(-12, -12); c.lineTo(2, -17); c.lineTo(16, -9); c.lineTo(20, 6); c.lineTo(10, 18); c.lineTo(-8, 17); c.closePath();
      c.fillStyle = '#6d5d6e'; c.fill(); c.stroke();
      ci(c, -8, 2, 3.6, '#54475a'); ci(c, 9, 8, 2.6, '#54475a'); ci(c, 8, -6, 2.2, '#54475a');
      ci(c, -4, -4, 2.6, '#fff', false); ci(c, 5, -4, 2.6, '#fff', false);
      ci(c, -4, -4, 1.1, '#111', false); ci(c, 5, -4, 1.1, '#111', false);
      c.beginPath(); c.moveTo(-5, 6); c.lineTo(6, 6); c.stroke();
      break;
    }
    case 'scorpion': {
      const tw = Math.sin(ph * 4) * 3;
      c.lineWidth = 7; c.strokeStyle = OUT;
      c.beginPath(); c.moveTo(-8, 2); c.quadraticCurveTo(-27, 0, -22, -15 + tw); c.quadraticCurveTo(-19, -22, -10, -19 + tw); c.stroke();
      c.lineWidth = 4; c.strokeStyle = '#ef6c00';
      c.beginPath(); c.moveTo(-8, 2); c.quadraticCurveTo(-27, 0, -22, -15 + tw); c.quadraticCurveTo(-19, -22, -10, -19 + tw); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      pg(c, [[-10, -22 + tw], [-5, -17 + tw], [-12, -15 + tw]], '#ffd54f');
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-4 + i * 7, 9); c.lineTo(-7 + i * 7 + Math.sin(ph * 6 + i) * 2, 16); c.stroke(); }
      ell(c, 0, 3, 17, 10, '#e65100');
      ell(c, 3, 0, 9, 4, 'rgba(255,255,255,0.25)', false);
      ell(c, 19, -4, 6, 4, '#bf360c'); ell(c, 19, 9, 6, 4, '#bf360c');
      ci(c, 10, -1, 2.6, '#fff', false); ci(c, 14, 3, 2.2, '#fff', false);
      ci(c, 10.6, -1, 1.1, '#111', false); ci(c, 14.4, 3, 1, '#111', false);
      break;
    }
    case 'vulture': {
      const fl = Math.sin(ph * 4) * 9;
      pg(c, [[-7, 0], [-27, -12 - fl], [-24, 5], [-15, 2 + fl * 0.4], [-10, 10]], '#4e342e');
      pg(c, [[7, 0], [27, -12 - fl], [24, 5], [15, 2 + fl * 0.4], [10, 10]], '#4e342e');
      ell(c, 0, 6, 10, 12, '#6d4c41');
      pg(c, [[-8, -4], [0, 3], [8, -4], [4, -9], [-4, -9]], '#efe3d0');
      ci(c, 0, -13, 7, '#e8a58a');
      pg(c, [[3, -14], [13, -10], [4, -7]], '#ffb300');
      ci(c, -1, -15, 2, '#fff', false); ci(c, -1, -15, 0.9, '#111', false);
      c.beginPath(); c.moveTo(-6, -19); c.lineTo(-2, -17); c.stroke();
      pg(c, [[-5, 16], [-9, 21], [-1, 18]], '#ffb300'); pg(c, [[5, 16], [9, 21], [1, 18]], '#ffb300');
      break;
    }
    case 'gumdrop': {
      const sq = Math.sin(ph * 3) * 1.5;
      c.beginPath(); c.moveTo(-20, 15); c.bezierCurveTo(-24, -22 + sq, 24, -22 + sq, 20, 15); c.quadraticCurveTo(0, 20, -20, 15); c.closePath();
      c.fillStyle = '#ff5252'; c.fill(); c.stroke();
      for (const p of [[-9, -10], [6, -12], [12, -3], [-14, 0], [0, -4]]) ci(c, p[0], p[1], 1.6, '#fff', false);
      ell(c, -8, -12, 5, 3, 'rgba(255,255,255,0.4)', false, -0.5);
      ci(c, -6, 2, 4, '#fff'); ci(c, 7, 2, 4, '#fff');
      ci(c, -6 + lk * 0.5, 2.4, 1.8, '#111', false); ci(c, 7 + lk * 0.5, 2.4, 1.8, '#111', false);
      c.beginPath(); c.arc(0, 8, 4, 0.2, Math.PI - 0.2); c.stroke();
      break;
    }
    case 'lolli': {
      const fl = Math.sin(ph * 6) * 4;
      pg(c, [[-10, -6], [-24, -14 - fl], [-18, 0]], 'rgba(255,255,255,0.85)');
      pg(c, [[10, -6], [24, -14 - fl], [18, 0]], 'rgba(255,255,255,0.85)');
      rr(c, -2.5, 8, 5, 16, 2, '#fff');
      ci(c, 0, -6, 15, '#ff80ab');
      c.save(); c.beginPath(); c.arc(0, -6, 14, 0, 6.283); c.clip();
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 3;
      c.beginPath(); for (let a2 = 0; a2 < 12; a2 += 0.25) { const r = a2 * 1.2; c.lineTo(Math.cos(a2 + ph * 2) * r, -6 + Math.sin(a2 + ph * 2) * r); } c.stroke();
      c.restore();
      c.strokeStyle = OUT; c.lineWidth = 2;
      ci(c, -5, -6, 3, '#fff'); ci(c, 5, -6, 3, '#fff'); ci(c, -5, -5.5, 1.3, '#111', false); ci(c, 5, -5.5, 1.3, '#111', false);
      break;
    }
    case 'ghost': {
      const w2 = Math.sin(ph * 3) * 2;
      c.beginPath(); c.moveTo(-17, 20); c.bezierCurveTo(-22, -26, 22, -26, 17, 20);
      c.quadraticCurveTo(11, 14 + w2, 6, 22); c.quadraticCurveTo(0, 14 - w2, -6, 22); c.quadraticCurveTo(-11, 14 + w2, -17, 20);
      c.closePath(); c.fillStyle = 'rgba(232,238,255,0.93)'; c.fill(); c.stroke();
      pg(c, [[-17, 6], [-27, 12 + w2], [-15, 12]], 'rgba(232,238,255,0.93)');
      pg(c, [[17, 6], [27, 12 - w2], [15, 12]], 'rgba(232,238,255,0.93)');
      ell(c, -6, -5, 3.4, 5, '#1b1b2e', false); ell(c, 6, -5, 3.4, 5, '#1b1b2e', false);
      ci(c, -6, -4, 1.3, '#69f0ae', false); ci(c, 6, -4, 1.3, '#69f0ae', false);
      ell(c, 0, 7, 3.4, 4.4 + Math.sin(ph * 3), '#1b1b2e', false);
      break;
    }
    case 'zombie': {
      const st = Math.sin(ph * 3) * 2;
      rr(c, -10, 14, 8, 11, 3, '#455a64'); rr(c, 2, 14, 8, 11, 3, '#455a64');
      rr(c, -13, -4, 26, 20, 5, '#6d4c41');
      rr(c, 11, -3 + st, 17, 7, 3, '#8bc34a'); rr(c, 11, 7 - st, 17, 7, 3, '#8bc34a');
      ci(c, 0, -14, 11, '#8bc34a');
      pg(c, [[-8, -24], [-3, -29], [0, -24], [4, -28], [8, -23]], '#33691e', false);
      ci(c, -4, -15, 3.4, '#fff'); ci(c, 5, -14, 2.4, '#fff');
      ci(c, -3.4, -15, 1.4, '#b71c1c', false); ci(c, 5.4, -14, 1.1, '#111', false);
      c.beginPath(); c.moveTo(-5, -8); c.lineTo(6, -8); c.moveTo(-3, -10); c.lineTo(-3, -6); c.moveTo(1, -10); c.lineTo(1, -6); c.moveTo(5, -10); c.lineTo(5, -6); c.stroke();
      if (m.hp < m.maxHp) { c.beginPath(); c.moveTo(-6, -24); c.lineTo(-2, -18); c.lineTo(-7, -13); c.stroke(); }
      break;
    }
    case 'gear': {
      c.save(); c.rotate(ph * 0.6);
      gearPath(c, 22, 17, 10, 0); c.fillStyle = '#b8860b'; c.fill(); c.stroke();
      c.restore();
      ci(c, 0, 0, 13, '#d7a53a');
      ci(c, -5, -2, 3.8, '#fff'); ci(c, 5, -2, 3.8, '#fff');
      ci(c, -5 + lk * 0.5, -1.6, 1.7, '#111', false); ci(c, 5 + lk * 0.5, -1.6, 1.7, '#111', false);
      c.beginPath(); c.moveTo(-4, 6); c.lineTo(4, 6); c.stroke();
      if (m.hp < m.maxHp) { c.beginPath(); c.moveTo(-14, -14); c.lineTo(-6, -4); c.lineTo(-10, 6); c.stroke(); }
      break;
    }
    case 'steambot': {
      const spin = ph * 10;
      c.strokeStyle = '#8d6e63'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -12); c.lineTo(0, -17); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      ell(c, 0, -18, Math.max(4, 15 * Math.abs(Math.cos(spin))), 2, 'rgba(215,170,110,0.9)');
      rr(c, -19, -12, 38, 26, 10, '#a1662f');
      rr(c, -19, 4, 38, 10, [0, 0, 10, 10], '#7b4a1e');
      for (const rx of [-12, 0, 12]) ci(c, rx, 9, 1.5, '#ffd180', false);
      ci(c, 5, -2, 7, '#fff8e1'); ci(c, 5, -2, 3.2, m.charge > 0 ? '#ffca28' : '#d84315', false);
      rr(c, -15, -8, 8, 5, 2, '#5d4037');
      for (let i = 0; i < 2; i++) { const pp = (ph * 2 + i * 0.5) % 1; ci(c, -11 + pp * 4, -22 - pp * 12, 2 + pp * 3, 'rgba(255,255,255,' + (0.7 - pp * 0.7) + ')', false); }
      if (m.charge > 0) ci(c, 0, 20, 3 + m.charge * 5, '#ffcc80', false);
      break;
    }
    case 'kitsune': {
      const tl = Math.sin(ph * 3) * 4;
      pg(c, [[-8, 6], [-26, -1 + tl], [-31, -15 + tl], [-19, -8], [-10, -2]], '#fff3e0');
      pg(c, [[-31, -15 + tl], [-34, -22 + tl], [-26, -15 + tl]], '#7e57c2', false);
      ell(c, 0, 8, 12, 12, '#ff9800');
      ell(c, 0, 12, 6, 7, '#fff3e0', false);
      pg(c, [[-11, -12], [-9, -27], [-2, -17]], '#ff9800');
      pg(c, [[11, -12], [9, -27], [2, -17]], '#ff9800');
      pg(c, [[-9, -16], [-8, -23], [-4, -17]], '#3e2723', false);
      pg(c, [[9, -16], [8, -23], [4, -17]], '#3e2723', false);
      ci(c, 0, -7, 12, '#ff9800');
      ell(c, 0, -2, 8, 5.5, '#fff3e0', false);
      c.strokeStyle = '#e53935'; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(-10, -9); c.lineTo(-6, -7); c.moveTo(10, -9); c.lineTo(6, -7); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      ell(c, -5, -9, 3, 2, '#ffeb3b', false, 0.3); ell(c, 5, -9, 3, 2, '#ffeb3b', false, -0.3);
      ci(c, -5 + lk * 0.4, -9, 1, '#111', false); ci(c, 5 + lk * 0.4, -9, 1, '#111', false);
      ci(c, 0, -3, 1.5, '#111', false);
      ci(c, 17, -19 + Math.sin(ph * 4) * 3, 3.4, '#80deea', false);
      ci(c, 17, -19 + Math.sin(ph * 4) * 3, 1.4, '#fff', false);
      break;
    }
    case 'oni': {
      const wob = Math.sin(ph * 2) * 2;
      rr(c, -14, 15, 10, 12, 3, '#7f1d1d'); rr(c, 4, 15, 10, 12, 3, '#7f1d1d');
      rr(c, 19, -24 + wob, 9, 38, 3, '#6d4c41');
      ci(c, 23.5, -18 + wob, 1.8, '#cfd8dc', false); ci(c, 23.5, -10 + wob, 1.8, '#cfd8dc', false); ci(c, 23.5, -2 + wob, 1.8, '#cfd8dc', false);
      rr(c, -17, -6, 34, 24, 7, '#d32f2f');
      pg(c, [[-17, 10], [17, 10], [14, 19], [-14, 19]], '#ffca28');
      c.strokeStyle = '#212121'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-9, 10); c.lineTo(-7, 18); c.moveTo(0, 10); c.lineTo(0, 19); c.moveTo(9, 10); c.lineTo(7, 18); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      ci(c, 19, 2, 6, '#d32f2f');
      ci(c, 0, -16, 13, '#e53935');
      pg(c, [[-9, -26], [-7, -38], [-2, -27]], '#fff3c4');
      pg(c, [[9, -26], [7, -38], [2, -27]], '#fff3c4');
      pg(c, [[-5, -29], [-3, -34], [0, -29]], '#212121', false);
      c.lineWidth = 2.6; c.beginPath(); c.moveTo(-10, -22); c.lineTo(-3, -18); c.moveTo(10, -22); c.lineTo(3, -18); c.stroke(); c.lineWidth = 2;
      ci(c, -5, -16, 2.8, '#ffeb3b', false); ci(c, 5, -16, 2.8, '#ffeb3b', false);
      ci(c, -5, -16, 1.1, '#111', false); ci(c, 5, -16, 1.1, '#111', false);
      c.beginPath(); c.moveTo(-6, -8); c.lineTo(6, -8); c.stroke();
      pg(c, [[-5, -8], [-3, -3], [-1, -8]], '#fff', false); pg(c, [[1, -8], [3, -3], [5, -8]], '#fff', false);
      if (m.hp < m.maxHp) { c.beginPath(); c.moveTo(-12, -4); c.lineTo(-5, 4); c.lineTo(-9, 12); c.stroke(); }
      break;
    }
    case 'voideye': {
      const pl = Math.sin(ph * 2) * 2;
      ci(c, 0, 0, 24 + pl, 'rgba(224,64,251,0.22)', false);
      c.strokeStyle = '#4a148c'; c.lineWidth = 3;
      for (let i = -3; i <= 3; i++) {
        c.beginPath(); c.moveTo(i * 5, 10);
        c.quadraticCurveTo(i * 6 + Math.sin(ph * 3 + i) * 6, 20, i * 7 - Math.sin(ph * 3 + i) * 5, 28); c.stroke();
      }
      c.strokeStyle = OUT; c.lineWidth = 2;
      pg(c, [[-12, -14], [-8, -26], [-3, -17], [0, -29], [3, -17], [8, -26], [12, -14]], '#311b92');
      ci(c, 0, 0, 18, '#1a0b2e');
      ell(c, 0, 0, 13, 10, '#f3e5f5');
      ci(c, lk * 1.5, 0, 6.5, '#d500f9', false);
      ci(c, lk * 1.5, 0, 3, '#000', false);
      ci(c, lk * 1.5 - 2, -2.5, 1.3, '#fff', false);
      if (m.charge > 0) ci(c, 0, 21, 3 + m.charge * 6, '#e040fb', false);
      break;
    }
    case 'riftling': {
      c.save(); c.rotate(Math.sin(ph * 2) * 0.25);
      pg(c, [[-7, -14], [0, -36], [7, -14]], 'rgba(255,64,129,0.6)', false);
      c.save(); c.rotate(ph * 2); starPoly(c, 22, 10, 6); c.fillStyle = '#7c4dff'; c.fill(); c.stroke(); c.restore();
      ci(c, 0, 0, 11, '#ff4081');
      ci(c, -4, -1, 2.6, '#fff', false); ci(c, 4, -1, 2.6, '#fff', false);
      ci(c, -4 + lk * 0.4, -1, 1.1, '#111', false); ci(c, 4 + lk * 0.4, -1, 1.1, '#111', false);
      c.beginPath(); c.moveTo(-3, 5); c.lineTo(0, 7); c.lineTo(3, 5); c.stroke();
      c.restore();
      break;
    }
    case 'jackghost': {
      const w2 = Math.sin(ph * 3) * 2;
      c.beginPath(); c.moveTo(-15, 20); c.bezierCurveTo(-19, -6, 19, -6, 15, 20);
      c.quadraticCurveTo(9, 14 + w2, 5, 22); c.quadraticCurveTo(0, 14 - w2, -5, 22); c.quadraticCurveTo(-9, 14 + w2, -15, 20);
      c.closePath(); c.fillStyle = 'rgba(235,240,255,0.93)'; c.fill(); c.stroke();
      pg(c, [[-15, 8], [-25, 13 + w2], [-14, 14]], 'rgba(235,240,255,0.93)');
      pg(c, [[15, 8], [25, 13 - w2], [14, 14]], 'rgba(235,240,255,0.93)');
      ell(c, 0, -9, 15, 12, '#ff8f1f');
      c.strokeStyle = 'rgba(150,60,0,0.6)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(0, -21); c.lineTo(0, 3); c.moveTo(-7, -20); c.quadraticCurveTo(-11, -9, -7, 2); c.moveTo(7, -20); c.quadraticCurveTo(11, -9, 7, 2); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2;
      rr(c, -2, -27, 4, 6, 1.5, '#558b2f');
      const gl = 0.7 + Math.sin(ph * 4) * 0.3;
      const fc = 'rgba(255,235,59,' + gl.toFixed(2) + ')';
      pg(c, [[-9, -13], [-3, -13], [-6, -8]], fc, false); pg(c, [[3, -13], [9, -13], [6, -8]], fc, false);
      pg(c, [[-8, -4], [-4, -1], [0, -4], [4, -1], [8, -4], [6, 0], [-6, 0]], fc, false);
      break;
    }
    case 'evilbunny': {
      const hop = Math.abs(Math.sin(ph * 4)) * -4;
      c.translate(0, hop);
      const ew = Math.sin(ph * 3) * 0.12;
      for (const sx of [-1, 1]) {
        c.save(); c.translate(sx * 6, -12); c.rotate(sx * 0.18 + ew * sx);
        ell(c, 0, -11, 4.6, 11, '#ece6f2'); ell(c, 0, -10, 2, 7.5, '#f48fb1', false);
        c.restore();
      }
      ell(c, 0, 11, 14, 12, '#ece6f2');
      ell(c, 0, 14, 7, 7, '#ffffff', false);
      ci(c, 0, -4, 12, '#ece6f2');
      c.lineWidth = 2.4; c.beginPath(); c.moveTo(-9, -10); c.lineTo(-3, -7); c.moveTo(9, -10); c.lineTo(3, -7); c.stroke(); c.lineWidth = 2;
      ci(c, -5, -4, 2.6, '#d32f2f', false); ci(c, 5, -4, 2.6, '#d32f2f', false);
      ci(c, -5, -4, 1, '#111', false); ci(c, 5, -4, 1, '#111', false);
      pg(c, [[-2, 1], [2, 1], [0, 3]], '#f06292', false);
      rr(c, -3, 4, 6, 5, 1, '#fff');
      c.beginPath(); c.moveTo(0, 4); c.lineTo(0, 9); c.stroke();
      c.save(); c.translate(15, 9); c.rotate(0.3 + Math.sin(ph * 2) * 0.1);
      ell(c, 0, 0, 6, 8, '#81d4fa');
      c.strokeStyle = '#f06292'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-5.5, -1); c.lineTo(-2, 1.5); c.lineTo(1.5, -1); c.lineTo(5.5, 1.5); c.stroke();
      c.restore();
      c.strokeStyle = OUT; c.lineWidth = 2;
      break;
    }
    case 'snowgremlin': {
      const b = Math.sin(ph * 2) * 1.5;
      pg(c, [[-11, -11 + b], [-17, -24 + b], [-5, -15 + b]], '#b3e5fc');
      pg(c, [[11, -11 + b], [17, -24 + b], [5, -15 + b]], '#b3e5fc');
      c.beginPath();
      for (let i = 0; i <= 18; i++) {
        const an = (i / 18) * Math.PI * 2, rr2 = (i % 2 ? 16 : 20);
        const px = Math.cos(an) * rr2, py = Math.sin(an) * rr2 * 0.92 + b;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath(); c.fillStyle = '#f2f9ff'; c.fill(); c.stroke();
      ci(c, -6, -3 + b, 4.6, '#fff'); ci(c, 6, -3 + b, 4.6, '#fff');
      ci(c, -6 + lk * 0.5, -3 + b, 2.1, '#0277bd', false); ci(c, 6 + lk * 0.5, -3 + b, 2.1, '#0277bd', false);
      c.beginPath(); c.moveTo(-6, 6 + b); c.quadraticCurveTo(0, 10 + b, 6, 6 + b); c.stroke();
      pg(c, [[-4, 6.5 + b], [-2.5, 10 + b], [-1, 7.4 + b]], '#fff', false); pg(c, [[1, 7.4 + b], [2.5, 10 + b], [4, 6.5 + b]], '#fff', false);
      rr(c, -14, 12 + b, 28, 5, 2, '#e53935');
      rr(c, 6, 12 + b, 5, 10, 2, '#e53935');
      if (m.hp < m.maxHp) { c.beginPath(); c.moveTo(-12, -10); c.lineTo(-6, -2); c.lineTo(-10, 6); c.stroke(); }
      break;
    }
    case 'harpy': {
      const fl = Math.sin(ph * 5) * 8;
      pg(c, [[-8, 0], [-27, -12 - fl], [-23, 4], [-15, 2 + fl * 0.4], [-11, 10]], '#d4a82a');
      pg(c, [[8, 0], [27, -12 - fl], [23, 4], [15, 2 + fl * 0.4], [11, 10]], '#d4a82a');
      ell(c, 0, 6, 10, 12, '#8d6e63');
      ci(c, 0, -8, 11, '#f0c9a0');
      pg(c, [[-11, -10], [-17, -3], [-9, -4]], '#8d3b1a'); pg(c, [[11, -10], [17, -3], [9, -4]], '#8d3b1a');
      pg(c, [[-5, -3], [0, 6], [5, -3]], '#ffb300', false);
      ci(c, -4, -10, 2.4, '#111', false); ci(c, 4, -10, 2.4, '#111', false);
      pg(c, [[-5, 15], [-9, 21], [-1, 18]], '#ffb300'); pg(c, [[5, 15], [9, 21], [1, 18]], '#ffb300');
      break;
    }
  }
  c.restore();
}

// ==========================================================
// 8. ФОНЫ АРЕН (параллакс-декорации) И ЧАСТИЦЫ АТМОСФЕРЫ
// ==========================================================
function layerPines(c, w, base, step, minH, rngH, color, seed, off) {
  c.fillStyle = color;
  for (let x = -step + (off || 0); x < w + step; x += step) {
    const i = Math.round(x / step);
    const hh = minH + hash(seed + i) * rngH;
    for (let k = 0; k < 3; k++) {
      const yy = base - k * hh * 0.28;
      const ww = step * (0.95 - k * 0.2);
      pg(c, [[x - ww / 2, yy], [x, yy - hh * 0.5], [x + ww / 2, yy]], color, false);
    }
    c.fillRect(x - 3, base - 2, 6, 6);
  }
}
function layerPeaks(c, w, base, step, minH, rngH, color, cap, seed) {
  for (let x = -step; x < w + step; x += step) {
    const i = Math.round(x / step);
    const hh = minH + hash(seed + i) * rngH;
    pg(c, [[x - step * 0.8, base], [x, base - hh], [x + step * 0.8, base]], color, false);
    if (cap) pg(c, [[x - step * 0.22, base - hh * 0.72], [x, base - hh], [x + step * 0.22, base - hh * 0.72], [x + step * 0.05, base - hh * 0.62], [x - step * 0.08, base - hh * 0.7]], cap, false);
  }
}
function layerBuildings(c, w, base, minH, rngH, color, seed, windows, t) {
  let x = -10, i = 0;
  while (x < w + 20) {
    const bw = 26 + hash(seed + i) * 34;
    const bh = minH + hash(seed + i + 50) * rngH;
    c.fillStyle = color;
    c.fillRect(x, base - bh, bw, bh + 4);
    if (windows) {
      for (let wy = base - bh + 8; wy < base - 6; wy += 11) {
        for (let wx = x + 5; wx < x + bw - 6; wx += 9) {
          const hs = hash(seed + wx * 0.37 + wy * 0.11);
          if (hs > 0.55) {
            c.fillStyle = hs > 0.85 ? '#ff2d95' : hs > 0.7 ? '#ffd400' : '#00e5ff';
            c.globalAlpha = 0.55 + 0.35 * Math.sin(t * 0.002 + wx);
            c.fillRect(wx, wy, 4, 5);
            c.globalAlpha = 1;
          }
        }
      }
    }
    x += bw + 2 + hash(seed + i + 90) * 4;
    i++;
  }
}

function gearPath(c, r1, r2, n, rot) {
  c.beginPath();
  const step = Math.PI * 2 / n;
  for (let i = 0; i < n; i++) {
    const a0 = rot + i * step;
    const pts = [[a0, r2], [a0 + step * 0.18, r1], [a0 + step * 0.32, r1], [a0 + step * 0.5, r2]];
    for (let k = 0; k < 4; k++) {
      const x = Math.cos(pts[k][0]) * pts[k][1], y = Math.sin(pts[k][0]) * pts[k][1];
      if (i === 0 && k === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
  }
  c.closePath();
}
function layerDunes(c, w, base, amp, len, color, ph) {
  c.beginPath(); c.moveTo(0, base + 260);
  for (let x = 0; x <= w; x += 14) c.lineTo(x, base - amp * Math.sin(x / len + ph) - amp * 0.5 * Math.sin(x / (len * 0.47) + ph * 1.7));
  c.lineTo(w, base + 260); c.closePath();
  c.fillStyle = color; c.fill();
}

// Фон арены разделён: основа (градиент + клетка) рисуется каждый кадр, декорации кэшируются в отдельный слой
function drawArenaBase(c, a, w, h, scroll) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, a.bgTop); g.addColorStop(1, a.bgBottom);
  c.fillStyle = g; c.fillRect(0, 0, w, h);

  // клетка тетради
  const gs = 24, offY = scroll % gs;
  c.strokeStyle = a.gridColor; c.lineWidth = 1;
  c.beginPath();
  for (let x = 0; x < w; x += gs) { c.moveTo(x, 0); c.lineTo(x, h); }
  for (let y = offY; y < h; y += gs) { c.moveTo(0, y); c.lineTo(w, y); }
  c.stroke();
}

// Быстрая версия основы фона для игры: градиент и клетка заранее нарисованы в отдельных холстах,
// каждый кадр их просто копируем (два drawImage вместо градиента и ~60 линий).
const baseCache = { key: '', grad: null, grid: null };
function drawArenaBaseCached(c, a, w, h, scroll) {
  const gs = 24;
  const key = a.id + ':' + w + 'x' + h;
  if (baseCache.key !== key) {
    baseCache.key = key;
    const g1 = document.createElement('canvas');
    g1.width = w; g1.height = h;
    const gc = g1.getContext('2d', { alpha: false });
    const g = gc.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, a.bgTop); g.addColorStop(1, a.bgBottom);
    gc.fillStyle = g; gc.fillRect(0, 0, w, h);
    const g2 = document.createElement('canvas');
    g2.width = w; g2.height = h + gs;
    const lc = g2.getContext('2d');
    lc.strokeStyle = a.gridColor; lc.lineWidth = 1;
    lc.beginPath();
    for (let x = 0; x < w; x += gs) { lc.moveTo(x, 0); lc.lineTo(x, h + gs); }
    for (let y = 0; y < h + gs; y += gs) { lc.moveTo(0, y); lc.lineTo(w, y); }
    lc.stroke();
    baseCache.grad = g1; baseCache.grid = g2;
  }
  c.drawImage(baseCache.grad, 0, 0);
  const offY = ((scroll % gs) + gs) % gs;
  c.drawImage(baseCache.grid, 0, offY - gs);
}

function drawArenaDeco(c, a, w, h, scroll, t) {
  const sink = Math.min(scroll * 0.12, h * 0.5);
  const base = h + sink;
  const fl = scroll * 0.25 + t * 0.012;
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round';

  switch (a.scene) {
    case 'notebook': {
      c.strokeStyle = 'rgba(70,90,120,0.35)'; c.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        const cx = hash(i + 1) * w, s = 0.7 + hash(i + 5) * 0.6;
        const cy = ((hash(i + 9) * h + fl * (0.6 + i * 0.12)) % (h + 80)) - 40;
        c.beginPath(); c.arc(cx, cy, 11 * s, Math.PI, 0); c.arc(cx + 15 * s, cy - 2 * s, 9 * s, Math.PI, 0);
        c.arc(cx + 28 * s, cy, 8 * s, Math.PI * 1.1, Math.PI * 0.1, false); c.lineTo(cx - 11 * s, cy); c.stroke();
      }
      c.strokeStyle = 'rgba(240,170,40,0.7)'; c.lineWidth = 2;
      const sx = w - 60, sy = 55 + sink * 0.5;
      c.beginPath(); c.arc(sx, sy, 15, 0, 6.283); c.stroke();
      for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + t * 0.0005; c.beginPath(); c.moveTo(sx + Math.cos(an) * 21, sy + Math.sin(an) * 21); c.lineTo(sx + Math.cos(an) * 28, sy + Math.sin(an) * 28); c.stroke(); }
      c.strokeStyle = 'rgba(90,110,140,0.3)'; c.lineWidth = 1.4;
      for (let i = 0; i < 6; i++) {
        const sx2 = hash(i + 30) * w, sy2 = ((hash(i + 40) * h + fl * 0.5) % (h + 30)) - 15;
        c.beginPath(); c.moveTo(sx2 - 5, sy2); c.lineTo(sx2 + 5, sy2); c.moveTo(sx2, sy2 - 5); c.lineTo(sx2, sy2 + 5); c.stroke();
      }
      break;
    }
    case 'forest': {
      c.fillStyle = 'rgba(255,255,220,0.2)';
      for (let i = 0; i < 3; i++) pg(c, [[w * 0.2 * i + 30, 0], [w * 0.2 * i + 85, 0], [w * 0.2 * i + 160, h], [w * 0.2 * i + 60, h]], 'rgba(255,255,220,0.16)', false);
      layerPines(c, w, base - 20, 46, 110, 60, '#a5d6a7', 3, 0);
      layerPines(c, w, base + 8, 56, 100, 70, '#66bb6a', 11, 20);
      layerPines(c, w, base + 30, 70, 110, 80, '#388e3c', 23, 8);
      break;
    }
    case 'ice': {
      for (let k = 0; k < 3; k++) {
        c.beginPath(); c.moveTo(0, 40 + k * 18);
        for (let x = 0; x <= w; x += 12) c.lineTo(x, 40 + k * 18 + Math.sin(x * 0.02 + t * 0.0008 + k) * 14);
        c.lineTo(w, 120 + k * 18); c.lineTo(0, 120 + k * 18); c.closePath();
        c.fillStyle = ['rgba(120,255,190,0.16)', 'rgba(150,170,255,0.14)', 'rgba(255,150,230,0.1)'][k]; c.fill();
      }
      layerPeaks(c, w, base - 10, 92, 150, 90, '#b3e5fc', '#ffffff', 5);
      layerPeaks(c, w, base + 20, 70, 110, 70, '#81d4fa', '#ffffff', 17);
      layerPeaks(c, w, base + 44, 60, 80, 50, '#4fc3f7', null, 31);
      break;
    }
    case 'crystal': {
      const rg = c.createRadialGradient(w / 2, base, 10, w / 2, base, h * 0.8);
      rg.addColorStop(0, 'rgba(224,64,251,0.32)'); rg.addColorStop(1, 'rgba(224,64,251,0)');
      c.fillStyle = rg; c.fillRect(0, 0, w, h);
      for (let x = -10; x < w + 20; x += 38) {
        const i = Math.round(x / 38);
        pg(c, [[x - 20, 0], [x + 20, 0], [x + hash(i + 3) * 6 - 3, 26 + hash(i) * 46]], '#241338', false);
      }
      for (let x = -20; x < w + 30; x += 52) {
        const i = Math.round(x / 52);
        const hh = 70 + hash(i + 8) * 70;
        const col = i % 2 === 0 ? 'rgba(38,198,218,0.7)' : 'rgba(171,71,188,0.75)';
        pg(c, [[x - 17, base], [x - 7, base - hh], [x + 7, base - hh * 0.9], [x + 19, base]], col, false);
        pg(c, [[x, base], [x + 7, base - hh * 0.9], [x + 19, base]], 'rgba(255,255,255,0.18)', false);
        pg(c, [[x + 14, base], [x + 22, base - hh * 0.55], [x + 32, base]], col, false);
      }
      break;
    }
    case 'volcano': {
      const sg = c.createRadialGradient(w / 2, base - 150, 10, w / 2, base - 150, h * 0.7);
      sg.addColorStop(0, 'rgba(255,120,30,0.5)'); sg.addColorStop(1, 'rgba(255,120,30,0)');
      c.fillStyle = sg; c.fillRect(0, 0, w, h);
      layerPeaks(c, w, base, 80, 70, 50, '#3b1410', null, 41);
      pg(c, [[w * 0.12, base + 4], [w * 0.42, base - 150], [w * 0.58, base - 150], [w * 0.88, base + 4]], '#2b0f0f', false);
      ell(c, w * 0.5, base - 150, w * 0.085, 7, '#ff7a1a', false);
      c.strokeStyle = '#ff5a1f'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(w * 0.47, base - 148); c.lineTo(w * 0.42, base - 90); c.lineTo(w * 0.38, base - 40);
      c.moveTo(w * 0.53, base - 148); c.lineTo(w * 0.57, base - 100); c.lineTo(w * 0.6, base - 50); c.stroke();
      for (let i = 0; i < 4; i++) {
        const ph = ((t * 0.02 + i * 40) % 160);
        c.fillStyle = 'rgba(70,50,50,' + (0.5 - ph / 400) + ')';
        c.beginPath(); c.arc(w * 0.5 + Math.sin(i * 2 + ph * 0.05) * 18, base - 155 - ph, 12 + ph * 0.12, 0, 6.283); c.fill();
      }
      break;
    }
    case 'city': {
      // Спокойный фон: без солнца по центру. Лёгкое тёмное свечение у горизонта + маленькая тусклая луна сбоку.
      const hy = base - 6;
      c.fillStyle = 'rgba(255,0,127,0.07)';
      c.fillRect(0, hy - 90, w, 90);
      c.fillStyle = 'rgba(0,229,255,0.05)';
      c.fillRect(0, hy - 40, w, 40);
      const mx = w * 0.84, my = h * 0.16 + sink * 0.15;
      c.fillStyle = 'rgba(180,170,255,0.16)';
      c.beginPath(); c.arc(mx, my, 16, 0, 6.283); c.fill();
      c.fillStyle = a.bgTop;
      c.beginPath(); c.arc(mx + 6, my - 3, 14, 0, 6.283); c.fill();
      layerBuildings(c, w, base - 6, 70, 110, '#15103a', 7, true, t);
      layerBuildings(c, w, base + 14, 60, 120, '#0b0820', 19, true, t);
      break;
    }
    case 'ocean': {
      for (let i = 0; i < 5; i++) {
        const x0 = i * w * 0.22 + Math.sin(t * 0.0004 + i) * 14;
        pg(c, [[x0, 0], [x0 + 34, 0], [x0 + 110, h], [x0 + 20, h]], 'rgba(255,255,255,0.09)', false);
      }
      for (let i = 0; i < 4; i++) {
        const fx = ((t * 0.02 * (0.6 + i * 0.25) + i * 170) % (w + 120)) - 60, fy = 90 + i * 150 + Math.sin(t * 0.002 + i) * 10 + sink * 0.3;
        c.fillStyle = 'rgba(0,70,110,0.3)';
        ell(c, fx, fy, 14, 7, 'rgba(0,70,110,0.3)', false); pg(c, [[fx - 12, fy], [fx - 22, fy - 7], [fx - 22, fy + 7]], 'rgba(0,70,110,0.3)', false);
      }
      for (let x = -10; x < w + 20; x += 46) {
        const i = Math.round(x / 46), hh = 50 + hash(i + 2) * 60;
        c.strokeStyle = i % 2 ? '#1b9a6a' : '#12805a'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(x, base);
        for (let k = 1; k <= 5; k++) c.lineTo(x + Math.sin(t * 0.002 + i + k) * 7, base - (hh / 5) * k);
        c.stroke();
      }
      for (let x = 10; x < w; x += 78) {
        const i = Math.round(x / 78);
        pg(c, [[x - 16, base], [x - 10, base - 34 - hash(i) * 24], [x - 3, base - 18], [x + 4, base - 44 - hash(i + 3) * 20], [x + 11, base - 20], [x + 17, base]], i % 2 ? '#ff7a7a' : '#ff4f9a', false);
      }
      break;
    }
    case 'space': {
      for (let i = 0; i < 40; i++) {
        const sx = hash(i + 80) * w, sy = (hash(i + 120) * h + fl * (0.2 + hash(i) * 0.3)) % h;
        c.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.6 * Math.abs(Math.sin(t * 0.002 + i))) + ')';
        c.fillRect(sx, sy, 1.6 + hash(i + 7) * 1.4, 1.6 + hash(i + 7) * 1.4);
      }
      const ng = c.createRadialGradient(w * 0.25, h * 0.3, 10, w * 0.25, h * 0.3, 180);
      ng.addColorStop(0, 'rgba(180,60,255,0.28)'); ng.addColorStop(1, 'rgba(180,60,255,0)');
      c.fillStyle = ng; c.fillRect(0, 0, w, h);
      const px = w * 0.72, py = h * 0.3 + sink * 0.25;
      const pgr = c.createRadialGradient(px - 14, py - 14, 4, px, py, 52);
      pgr.addColorStop(0, '#ffcc80'); pgr.addColorStop(1, '#e64a19');
      c.save(); c.translate(px, py); c.rotate(-0.35);
      c.strokeStyle = 'rgba(255,224,178,0.6)'; c.lineWidth = 7; c.beginPath(); c.ellipse(0, 0, 82, 17, 0, Math.PI, 2 * Math.PI); c.stroke();
      c.fillStyle = pgr; c.beginPath(); c.arc(0, 0, 44, 0, 6.283); c.fill();
      c.beginPath(); c.ellipse(0, 0, 82, 17, 0, 0, Math.PI); c.stroke();
      c.restore();
      const mx = w * 0.14, my = h * 0.62 + sink * 0.2;
      c.fillStyle = '#90a4ae'; c.beginPath(); c.arc(mx, my, 20, 0, 6.283); c.fill();
      c.fillStyle = '#78909c'; c.beginPath(); c.arc(mx - 6, my - 4, 5, 0, 6.283); c.arc(mx + 7, my + 6, 3.5, 0, 6.283); c.fill();
      break;
    }
    case 'olympus': {
      for (let i = 0; i < 7; i++) {
        const ang = -Math.PI / 2 + (i - 3) * 0.2 + Math.sin(t * 0.0004 + i) * 0.03;
        pg(c, [[w / 2, -10], [w / 2 + Math.cos(ang - 0.05) * h * 1.4, -10 - Math.sin(ang - 0.05) * h * 1.4], [w / 2 + Math.cos(ang + 0.05) * h * 1.4, -10 - Math.sin(ang + 0.05) * h * 1.4]], 'rgba(255,224,130,0.07)', false);
      }
      for (let i = 0; i < 16; i++) {
        const x = hash(i + 60) * w, y = (hash(i + 70) * h + fl * 0.3) % h;
        c.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.5 * Math.sin(t * 0.003 + i)) + ')';
        c.fillRect(x, y, 2, 2);
      }
      for (const px of [10, w - 40]) {
        c.fillStyle = '#efe7d6'; c.fillRect(px, base - 190, 30, 190);
        c.strokeStyle = 'rgba(150,130,90,0.5)'; c.lineWidth = 1.2;
        c.beginPath(); for (let k = 1; k < 4; k++) { c.moveTo(px + k * 7.5, base - 186); c.lineTo(px + k * 7.5, base); } c.stroke();
        c.fillStyle = '#e6b422'; c.fillRect(px - 4, base - 198, 38, 9); c.fillRect(px - 4, base - 8, 38, 8);
      }
      for (let x = -30; x < w + 40; x += 64) {
        const i = Math.round(x / 64);
        ell(c, x + Math.sin(t * 0.0005 + i) * 8, base - 18 + hash(i) * 30, 62, 24, 'rgba(255,255,255,0.38)', false);
      }
      break;
    }
    case 'desert': {
      const sx = w * 0.74, sy = 74 + sink * 0.3;
      const sg = c.createRadialGradient(sx, sy, 8, sx, sy, 80);
      sg.addColorStop(0, 'rgba(255,250,200,0.95)'); sg.addColorStop(1, 'rgba(255,214,120,0)');
      c.fillStyle = sg; c.fillRect(sx - 90, sy - 90, 180, 180);
      ci(c, sx, sy, 26, '#fff6c2', false);
      for (const px of [w * 0.18, w * 0.36]) {
        const pyh = 58 + (px % 3) * 10;
        pg(c, [[px - pyh, base - 70], [px, base - 70 - pyh], [px + pyh, base - 70]], '#e3a35a', false);
        pg(c, [[px, base - 70 - pyh], [px + pyh, base - 70], [px + 8, base - 70]], '#c98a43', false);
      }
      layerDunes(c, w, base - 52, 16, 52, '#f3c27a', 0.6);
      for (let i = 0; i < 5; i++) {
        const x = 30 + i * 85 + hash(i + 2) * 30, y = base - 42 - hash(i + 9) * 8;
        rr(c, x - 4, y - 34, 8, 36, 4, '#5f8f3e', false);
        rr(c, x - 14, y - 24, 6, 14, 3, '#5f8f3e', false); rr(c, x - 14, y - 12, 14, 5, 2, '#5f8f3e', false);
        rr(c, x + 8, y - 28, 6, 12, 3, '#5f8f3e', false); rr(c, x, y - 18, 14, 5, 2, '#5f8f3e', false);
      }
      layerDunes(c, w, base - 26, 20, 44, '#e7a653', 2.1);
      layerDunes(c, w, base, 24, 38, '#d68a3c', 4.0);
      c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        for (let x = 0; x <= w; x += 16) c.lineTo(x, base - 118 - k * 22 + Math.sin(x * 0.05 + t * 0.003 + k) * 3);
        c.stroke();
      }
      break;
    }
    case 'candy': {
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 140 + t * 0.008 * (1 + i * 0.3)) % (w + 160)) - 80, cy = 60 + i * 55 + sink * 0.2;
        const cc = i % 2 ? 'rgba(173,216,255,0.5)' : 'rgba(255,255,255,0.55)';
        ell(c, cx, cy, 44, 15, cc, false); ell(c, cx + 20, cy - 10, 26, 12, cc, false);
      }
      layerDunes(c, w, base - 50, 14, 70, '#ffc4e1', 0.3);
      const cols = ['#ff5c8a', '#4fc3f7', '#ffd54f', '#b388ff', '#69f0ae'];
      for (let i = 0; i < 5; i++) {
        const x = 40 + i * 80 + hash(i) * 20, hh = 80 + hash(i + 4) * 60, y = base - 30 - hh;
        c.fillStyle = '#fff'; c.fillRect(x - 3, y, 6, hh);
        ci(c, x, y, 17, cols[i], false);
        c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3;
        c.beginPath(); c.arc(x, y, 10, 0, 4.4); c.stroke();
        c.beginPath(); c.arc(x, y, 4, 0, 4.4); c.stroke();
      }
      for (let i = 0; i < 3; i++) {
        const x = 70 + i * 140 + hash(i + 11) * 20, y = base - 30;
        c.lineWidth = 9; c.strokeStyle = '#fff';
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 60); c.arc(x + 10, y - 60, 10, Math.PI, 0); c.stroke();
        c.strokeStyle = '#ff5252'; c.setLineDash([7, 9]);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 60); c.arc(x + 10, y - 60, 10, Math.PI, 0); c.stroke();
        c.setLineDash([]);
      }
      layerDunes(c, w, base - 8, 16, 52, '#ff9ccc', 2.2);
      break;
    }
    case 'graveyard': {
      const mx = w * 0.72, my = 78 + sink * 0.3;
      const mg = c.createRadialGradient(mx, my, 10, mx, my, 90);
      mg.addColorStop(0, 'rgba(255,248,210,0.4)'); mg.addColorStop(1, 'rgba(255,248,210,0)');
      c.fillStyle = mg; c.fillRect(mx - 100, my - 100, 200, 200);
      ci(c, mx, my, 28, '#fff3c4', false); ci(c, mx - 8, my - 6, 5, '#e6d79c', false); ci(c, mx + 9, my + 8, 3.5, '#e6d79c', false);
      for (let i = 0; i < 3; i++) {
        const bx = ((t * 0.03 * (1 + i * 0.4) + i * 150) % (w + 80)) - 40;
        const by = 120 + i * 70 + Math.sin(t * 0.004 + i) * 14 + sink * 0.2;
        const f = Math.sin(t * 0.02 + i) * 5;
        pg(c, [[bx, by], [bx - 12, by - 6 - f], [bx - 6, by + 2], [bx, by + 1], [bx + 6, by + 2], [bx + 12, by - 6 - f]], 'rgba(10,10,20,0.7)', false);
      }
      c.strokeStyle = '#141826';
      for (const tr of [[40, 130], [w - 50, 150], [w * 0.5, 100]]) {
        const tx = tr[0], th = tr[1];
        c.lineWidth = 7; c.beginPath(); c.moveTo(tx, base); c.lineTo(tx, base - th); c.stroke();
        c.lineWidth = 4;
        for (let k = 0; k < 3; k++) {
          c.beginPath(); c.moveTo(tx, base - th * (0.4 + k * 0.2));
          c.lineTo(tx + (k % 2 ? 1 : -1) * (26 - k * 4), base - th * (0.55 + k * 0.2)); c.stroke();
        }
      }
      for (let x = 20; x < w; x += 58) {
        const i = Math.round(x / 58), hh = 30 + hash(i + 2) * 18;
        rr(c, x, base - hh - 22, 26, hh + 22, [13, 13, 0, 0], '#2b3148', false);
        c.fillStyle = '#4a5275'; c.fillRect(x + 11, base - hh - 12, 4, 14); c.fillRect(x + 7, base - hh - 8, 12, 4);
      }
      for (let i = 0; i < 3; i++) {
        const fx = ((t * 0.012 * (i + 1) + i * 150) % (w + 260)) - 130;
        ell(c, fx, base - 50 - i * 40, 140, 24, 'rgba(190,200,235,0.1)', false);
      }
      break;
    }
    case 'sakura': {
      const mx = w * 0.28, my = 96 + sink * 0.3;
      const mg = c.createRadialGradient(mx, my, 10, mx, my, 110);
      mg.addColorStop(0, 'rgba(255,255,255,0.75)'); mg.addColorStop(1, 'rgba(255,200,230,0)');
      c.fillStyle = mg; c.fillRect(mx - 120, my - 120, 240, 240);
      ci(c, mx, my, 34, '#fff7fb', false);
      ci(c, mx - 10, my - 8, 6, '#f3d3e6', false); ci(c, mx + 11, my + 9, 4, '#f3d3e6', false);
      layerPeaks(c, w, base - 10, 110, 150, 70, '#e1a6d0', '#ffffff', 61);
      layerPeaks(c, w, base + 20, 84, 100, 60, '#c97fb8', null, 71);
      for (let i = 0; i < 3; i++) {
        const ix = w * (0.2 + i * 0.32) + Math.sin(t * 0.0006 + i * 2) * 8;
        const iy = h * (0.28 + i * 0.22) + Math.cos(t * 0.0008 + i) * 6 + sink * 0.3;
        pg(c, [[ix - 44, iy], [ix + 44, iy], [ix + 22, iy + 30], [ix + 6, iy + 50], [ix - 10, iy + 34], [ix - 30, iy + 18]], '#7b5e6e', false);
        ell(c, ix, iy, 46, 9, '#a5d6a7', false);
        c.strokeStyle = '#5d4037'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(ix - 8, iy - 2); c.quadraticCurveTo(ix - 12, iy - 22, ix - 4, iy - 34); c.stroke();
        ci(c, ix - 6, iy - 40, 15, '#f8bbd9', false); ci(c, ix - 18, iy - 32, 10, '#f48fb1', false); ci(c, ix + 7, iy - 34, 11, '#f8bbd9', false);
        if (i === 1) {
          c.fillStyle = '#e53935';
          c.fillRect(ix + 14, iy - 30, 4, 30); c.fillRect(ix + 32, iy - 30, 4, 30);
          c.fillRect(ix + 8, iy - 34, 32, 5); c.fillRect(ix + 12, iy - 26, 24, 3);
        }
      }
      for (let i = 0; i < 2; i++) {
        const fx = ((t * 0.01 * (i + 1) + i * 200) % (w + 300)) - 150;
        ell(c, fx, base - 40 - i * 60, 150, 22, 'rgba(255,255,255,0.2)', false);
      }
      break;
    }
    case 'void': {
      for (let i = 0; i < 46; i++) {
        const sx = hash(i + 200) * w, sy = (hash(i + 240) * h + fl * (0.15 + hash(i) * 0.3)) % h;
        c.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.7 * Math.abs(Math.sin(t * 0.002 + i))) + ')';
        c.fillRect(sx, sy, 1.5 + hash(i + 7) * 1.5, 1.5 + hash(i + 7) * 1.5);
      }
      const bx = w * 0.5, by = h * 0.34 + sink * 0.25, kk = h < 400 ? 0.55 : 1;
      const og = c.createRadialGradient(bx, by, 20 * kk, bx, by, 160 * kk);
      og.addColorStop(0, 'rgba(124,77,255,0.45)'); og.addColorStop(0.5, 'rgba(224,64,251,0.18)'); og.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = og; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 3; k++) {
        c.beginPath(); c.moveTo(0, h * (0.62 + k * 0.1));
        for (let x = 0; x <= w; x += 14) c.lineTo(x, h * (0.62 + k * 0.1) + Math.sin(x * 0.02 + t * 0.001 + k * 2) * 12 * kk);
        c.lineTo(w, h); c.lineTo(0, h); c.closePath();
        c.fillStyle = ['rgba(0,229,255,0.1)', 'rgba(224,64,251,0.1)', 'rgba(105,240,174,0.08)'][k]; c.fill();
      }
      c.save(); c.translate(bx, by); c.scale(kk, kk); c.rotate(-0.25);
      const dcols = ['rgba(255,64,129,0.6)', 'rgba(255,171,64,0.65)', 'rgba(255,241,118,0.75)'];
      for (let k = 0; k < 3; k++) {
        c.strokeStyle = dcols[k]; c.lineWidth = 9 - k * 2.5;
        c.beginPath(); c.ellipse(0, 0, 96 - k * 14, 22 - k * 3.5, 0, Math.PI, 2 * Math.PI); c.stroke();
      }
      c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, 40, 0, 6.283); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 41, 0, 6.283); c.stroke();
      c.setLineDash([30, 18]); c.lineDashOffset = -t * 0.05;
      for (let k = 0; k < 3; k++) {
        c.strokeStyle = dcols[k]; c.lineWidth = 9 - k * 2.5;
        c.beginPath(); c.ellipse(0, 0, 96 - k * 14, 22 - k * 3.5, 0, 0, Math.PI); c.stroke();
      }
      c.setLineDash([]); c.lineDashOffset = 0;
      c.restore();
      for (let i = 0; i < 4; i++) {
        const sx2 = w * (0.12 + i * 0.26), sy2 = h * (0.55 + (i % 2) * 0.2) + Math.sin(t * 0.0012 + i * 2) * 8 + sink * 0.3;
        c.save(); c.translate(sx2, sy2); c.rotate(t * 0.0004 * (i % 2 ? 1 : -1) + i);
        pg(c, [[-10, -4], [-3, -12], [9, -7], [11, 5], [0, 11], [-9, 7]], 'rgba(60,35,110,0.75)', false);
        pg(c, [[-3, -12], [9, -7], [0, 0]], 'rgba(179,136,255,0.4)', false);
        c.restore();
      }
      c.strokeStyle = 'rgba(255,64,129,0.35)'; c.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) {
        const rx = w * (0.18 + i * 0.6), ry = h * 0.2 + i * h * 0.3 + sink * 0.3;
        c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx + 12, ry + 30); c.lineTo(rx - 6, ry + 58); c.lineTo(rx + 8, ry + 92); c.stroke();
      }
      break;
    }
    case 'clockwork': {
      const gears =[[w * 0.18, 110, 62, 0.00028], [w * 0.84, 250, 78, -0.00022], [w * 0.4, 420, 54, 0.00034], [w * 0.9, 560, 46, -0.0004]];
      for (const gr of gears) {
        c.save(); c.translate(gr[0], gr[1] + sink * 0.4); c.rotate(t * gr[3]);
        gearPath(c, gr[2], gr[2] - 10, 12, 0); c.fillStyle = 'rgba(40,22,8,0.28)'; c.fill();
        ci(c, 0, 0, gr[2] * 0.3, 'rgba(0,0,0,0.18)', false);
        c.restore();
      }
      const fx = w * 0.55, fy = 150 + sink * 0.3;
      c.fillStyle = 'rgba(255,236,179,0.35)'; c.beginPath(); c.arc(fx, fy, 44, 0, 6.283); c.fill();
      c.strokeStyle = 'rgba(60,36,12,0.6)'; c.lineWidth = 3; c.stroke();
      for (let i = 0; i < 12; i++) {
        const an = i * Math.PI / 6;
        c.beginPath(); c.moveTo(fx + Math.cos(an) * 36, fy + Math.sin(an) * 36); c.lineTo(fx + Math.cos(an) * 41, fy + Math.sin(an) * 41); c.stroke();
      }
      const ma = t * 0.0006 - Math.PI / 2, ha = t * 0.00005 - Math.PI / 2;
      c.lineWidth = 3; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + Math.cos(ma) * 34, fy + Math.sin(ma) * 34); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + Math.cos(ha) * 22, fy + Math.sin(ha) * 22); c.stroke();
      c.fillStyle = 'rgba(60,35,15,0.5)';
      for (let i = 0; i < 3; i++) {
        const px = 20 + i * 150, pH = 90 + hash(i + 5) * 60;
        c.fillStyle = 'rgba(60,35,15,0.5)'; c.fillRect(px, base - pH, 22, pH); c.fillRect(px - 4, base - pH - 6, 30, 8);
        const sp = (t * 0.03 + i * 40) % 90;
        ci(c, px + 11 + Math.sin(sp * 0.1) * 6, base - pH - 12 - sp, 7 + sp * 0.1, 'rgba(255,255,255,' + (0.35 - sp / 300) + ')', false);
      }
      break;
    }
  }
  c.restore();

  if (a.margin) {
    c.strokeStyle = a.marginColor; c.lineWidth = 2;
    c.beginPath(); c.moveTo(36, 0); c.lineTo(36, h); c.stroke();
  }
}

function drawArenaScene(c, a, w, h, scroll, t) {
  drawArenaBase(c, a, w, h, scroll);
  drawArenaDeco(c, a, w, h, scroll, t);
}

function makeAmbient(w, h, n) {
  const list = [];
  for (let i = 0; i < n; i++) list.push({ x: Math.random() * w, y: Math.random() * h, r: 1.2 + Math.random() * 2.4, s: 0.4 + Math.random() * 0.9, a: Math.random() * 6.28 });
  return list;
}

function stepAmbient(c, a, list, w, h, dt, wind) {
  if (!a.ambient) return;
  const type = a.ambient.type;
  c.save();
  c.fillStyle = a.ambient.color;
  c.strokeStyle = a.ambient.color;
  const now = performance.now();
  for (const p of list) {
    switch (type) {
      case 'snow':
        p.y += p.s * 0.9 * dt; p.x += (Math.sin(p.y * 0.03 + p.a) * 0.4 + wind * 0.8) * dt;
        c.globalAlpha = 0.85; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill(); break;
      case 'embers':
        p.y -= p.s * 0.9 * dt; p.x += Math.sin(p.y * 0.05 + p.a) * 0.5 * dt;
        c.globalAlpha = 0.5 + 0.4 * Math.sin(now * 0.005 + p.a); c.beginPath(); c.arc(p.x, p.y, p.r * 0.8, 0, 6.283); c.fill(); break;
      case 'rain':
        p.y += p.s * 8 * dt; p.x -= 1.6 * dt;
        c.globalAlpha = 0.5; c.lineWidth = 1.2; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + 2.5, p.y - 11); c.stroke(); break;
      case 'fireflies':
        p.a += (Math.random() - 0.5) * 0.15 * dt; p.x += (Math.cos(p.a) * 0.5 + wind * 0.6) * dt; p.y += Math.sin(p.a) * 0.4 * dt;
        c.globalAlpha = 0.15 + 0.1 * Math.sin(now * 0.004 + p.s * 7); c.beginPath(); c.arc(p.x, p.y, p.r * 3.4, 0, 6.283); c.fill();
        c.globalAlpha = 0.7 + 0.3 * Math.sin(now * 0.004 + p.s * 7); c.beginPath(); c.arc(p.x, p.y, p.r * 0.9, 0, 6.283); c.fill(); break;
      default: // dust / motes
        p.y -= p.s * 0.3 * dt; p.x += Math.sin(p.y * 0.04 + p.a) * 0.3 * dt + wind * 0.5 * dt;
        c.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(now * 0.002 + p.a)); c.beginPath(); c.arc(p.x, p.y, p.r * 0.9, 0, 6.283); c.fill();
    }
    if (p.y > h + 12) { p.y = -8; p.x = Math.random() * w; }
    if (p.y < -12) { p.y = h + 8; p.x = Math.random() * w; }
    if (p.x > w + 10) p.x = -6;
    if (p.x < -10) p.x = w + 6;
  }
  c.restore();
}

// Платформа (общая отрисовка для игры и превью)
function drawPlatformShape(c, a, p, t) {
  c.save();
  c.lineWidth = 2; c.strokeStyle = a.platBorder; c.lineJoin = 'round';
  const col = { normal: a.platNormal, moving: a.platMoving, break: a.platBreak, vanish: a.platVanish }[p.type] || a.platNormal;
  c.fillStyle = col;
  if (a.glow && !LOW_FX) { c.shadowColor = a.platBorder; c.shadowBlur = 9; }
  if (p.broken) {
    c.fillRect(p.x - 4, p.y, p.w / 2 - 3, p.h); c.strokeRect(p.x - 4, p.y, p.w / 2 - 3, p.h);
    c.fillRect(p.x + p.w / 2 + 4, p.y + 3, p.w / 2 - 3, p.h); c.strokeRect(p.x + p.w / 2 + 4, p.y + 3, p.w / 2 - 3, p.h);
    c.restore();
    return;
  }
  c.beginPath(); c.roundRect(p.x, p.y, p.w, p.h, 7); c.fill(); c.stroke();
  c.shadowBlur = 0;
  c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(p.x + 6, p.y + 2.5, p.w - 12, 3);
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(p.x + 5, p.y + p.h - 4.5, p.w - 10, 2.5);
  if (p.type === 'normal') {
    if (a.scene === 'forest') {
      c.strokeStyle = '#66bb6a'; c.lineWidth = 2;
      c.beginPath(); for (let k = 0; k < 5; k++) { const gx = p.x + 8 + k * 13; c.moveTo(gx, p.y + 1); c.lineTo(gx - 2, p.y - 5); c.moveTo(gx, p.y + 1); c.lineTo(gx + 3, p.y - 4); } c.stroke();
    } else if (a.scene === 'ice') {
      c.fillStyle = '#e1f5fe'; for (let k = 0; k < 4; k++) pg(c, [[p.x + 10 + k * 14, p.y + p.h], [p.x + 15 + k * 14, p.y + p.h], [p.x + 12.5 + k * 14, p.y + p.h + 6 + (k % 2) * 3]], '#e1f5fe');
    } else if (a.scene === 'olympus') {
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(p.x + 10, p.y + 7, p.w - 20, 2);
    } else if (a.scene === 'desert') {
      c.fillStyle = 'rgba(255,230,170,0.55)'; for (let k = 0; k < 5; k++) c.fillRect(p.x + 8 + k * 11, p.y + 8, 6, 2);
    } else if (a.scene === 'candy') {
      const sc = ['#ffffff', '#ffeb3b', '#4fc3f7'];
      for (let k = 0; k < 6; k++) { c.fillStyle = sc[k % 3]; c.fillRect(p.x + 8 + k * 9, p.y + 6 + (k % 2) * 3, 4, 2); }
    } else if (a.scene === 'graveyard') {
      c.fillStyle = '#7cb342'; for (let k = 0; k < 4; k++) c.fillRect(p.x + 6 + k * 15, p.y - 1, 8, 3);
    } else if (a.scene === 'sakura') {
      for (let k = 0; k < 5; k++) ci(c, p.x + 10 + k * 12, p.y + 3 + (k % 2) * 8, 1.8, '#fff0f6', false);
    } else if (a.scene === 'void') {
      c.fillStyle = 'rgba(255,255,255,0.75)';
      for (let k = 0; k < 3; k++) c.fillRect(p.x + 10 + k * (p.w - 24) / 2, p.y + 7, 3, 2);
      c.fillStyle = 'rgba(255,64,129,0.8)'; c.fillRect(p.x + p.w / 2 - 1, p.y + 2, 2, 2);
    } else if (a.scene === 'clockwork') {
      for (let k = 0; k < 4; k++) ci(c, p.x + 10 + k * (p.w - 20) / 3, p.y + p.h / 2 + 1, 1.5, '#ffe082', false);
    }
  } else if (p.type === 'moving') {
    c.fillStyle = 'rgba(0,0,0,0.38)';
    pg(c, [[p.x + 11, p.y + 7.5], [p.x + 17, p.y + 4], [p.x + 17, p.y + 11]], 'rgba(0,0,0,0.38)', false);
    pg(c, [[p.x + p.w - 11, p.y + 7.5], [p.x + p.w - 17, p.y + 4], [p.x + p.w - 17, p.y + 11]], 'rgba(0,0,0,0.38)', false);
  } else if (p.type === 'break') {
    c.strokeStyle = a.platBorder; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(p.x + p.w / 2, p.y); c.lineTo(p.x + p.w / 2 - 4, p.y + p.h / 2); c.lineTo(p.x + p.w / 2 + 3, p.y + p.h);
    c.moveTo(p.x + p.w / 2 - 4, p.y + p.h / 2); c.lineTo(p.x + p.w / 2 - 14, p.y + p.h / 2 + 3); c.stroke();
  } else if (p.type === 'vanish') {
    c.setLineDash([4, 3]); c.strokeStyle = a.platBorder; c.lineWidth = 1.4;
    c.beginPath(); c.roundRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6, 4); c.stroke(); c.setLineDash([]);
  }
  if (EV_KEY) drawEventDecor(c, p);
  c.restore();
}

// ==========================================================
// 8.5. КЭШ СПРАЙТОВ: платформы, снаряды и огненные шары рисуются один раз и потом просто копируются.
// Это убирает тысячи операций рисования (и создание градиентов/теней) в каждом кадре.
// ==========================================================
const orbSprites = new Map();
function getOrbSprite(col) {
  let s = orbSprites.get(col);
  if (s) return s;
  s = document.createElement('canvas');
  s.width = 30; s.height = 30;
  const c = s.getContext('2d');
  c.translate(15, 15);
  const g = c.createRadialGradient(0, 0, 1, 0, 0, 12);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, col); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 12, 0, 6.283); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 1.8;
  ci(c, 0, 0, 6, col);
  ci(c, -2, -2, 1.8, 'rgba(255,255,255,0.85)', false);
  orbSprites.set(col, s);
  return s;
}

const fireSprites = new Map();
function getFireballSprite(col, r) {
  const key = col + ':' + r;
  let s = fireSprites.get(key);
  if (s) return s;
  s = document.createElement('canvas');
  s.width = 32; s.height = 48;
  const c = s.getContext('2d');
  c.translate(16, 30);
  const g = c.createRadialGradient(0, 0, 1, 0, 0, r + 6);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, col); g.addColorStop(1, 'rgba(255,120,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r + 6, 0, 6.283); c.fill();
  pg(c, [[-4, -4], [4, -4], [0, -22]], col, false);
  fireSprites.set(key, s);
  return s;
}

const PLAT_PAD = 14;
const platSprites = new Map();
let platSpritesArena = -1;
function getPlatSprite(a, type, w, h) {
  if (platSpritesArena !== a.id) { platSprites.clear(); platSpritesArena = a.id; }
  const key = type + ':' + w + ':' + h + ':' + (LOW_FX ? 1 : 0) + ':' + EV_KEY;
  let s = platSprites.get(key);
  if (s) return s;
  s = document.createElement('canvas');
  s.width = w + PLAT_PAD * 2; s.height = h + PLAT_PAD * 2;
  const c = s.getContext('2d');
  c.translate(PLAT_PAD, PLAT_PAD);
  drawPlatformShape(c, a, { x: 0, y: 0, w, h, type, broken: false }, 0);
  platSprites.set(key, s);
  return s;
}
function drawPlatformFast(c, a, p) {
  if (p.broken) { drawPlatformShape(c, a, p, 0); return; }
  c.drawImage(getPlatSprite(a, p.type, p.w, p.h), p.x - PLAT_PAD, p.y - PLAT_PAD);
}

// Удаление элементов из массива «на месте», без создания нового массива каждый кадр (меньше работы сборщику мусора)
function compactInPlace(arr, keep) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) { const v = arr[i]; if (keep(v)) arr[j++] = v; }
  arr.length = j;
}

// ==========================================================
// 8.9. МЕТА-ИГРА: данные (награда дня, задания, достижения, сундуки, колесо, прокачка, пропуск, события)
// ==========================================================
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function dayKeyOf(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function todayKey() { return dayKeyOf(new Date()); }
function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); return dayKeyOf(d); }
function weekKeyNow() { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKeyOf(d); }
function seasonKeyNow() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }
function msToNextDay() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) - d; }
function msToNextWeek() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 - ((d.getDay() + 6) % 7)) - d; }
function msToSeasonEnd() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1) - d; }
function fmtLeft(ms) {
  const h = Math.floor(ms / 3600000);
  if (h >= 48) return Math.floor(h / 24) + ' дн';
  if (h >= 1) return h + ' ч ' + Math.floor((ms % 3600000) / 60000) + ' мин';
  return Math.max(1, Math.ceil(ms / 60000)) + ' мин';
}
function seededRand(seed) {
  let s = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) s = (Math.imul(s, 31) + str.charCodeAt(i)) >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Сезонные события ----------
// Проверить событие в любой день: открой игру с ?event=halloween, ?event=newyear или ?event=easter
// Пасха каждый год в разные даты: событие идёт от недели до католической Пасхи до недели после православной.
function easterWestern(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mo - 1, da);
}
function easterOrthodox(y) {
  const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const mo = Math.floor((d + e + 114) / 31), da = ((d + e + 114) % 31) + 1;
  return new Date(y, mo - 1, da + 13); // юлианская дата → григорианская (1900–2099)
}
function easterRange(y) {
  const w = easterWestern(y), o = easterOrthodox(y);
  const a = new Date(Math.min(w, o)); a.setDate(a.getDate() - 7);
  const b = new Date(Math.max(w, o)); b.setDate(b.getDate() + 7);
  return [a, b];
}
const EVENTS = {
  halloween: {
    id: 'halloween', name: 'Хэллоуин', icon: '🎃', cur: '🍬', curName: 'конфет', color: '#ff8f1f',
    monster: 'jackghost', skin: 'witch', from: [10, 15], to: [11, 10],
    desc: 'Платформы в паутине и тыквах, по всем аренам летают тыквенные призраки. Собирай конфеты 🍬 (иногда вместо монет) и обменяй их на временный скин.'
  },
  newyear: {
    id: 'newyear', name: 'Новый год', icon: '🎄', cur: '❄️', curName: 'снежинок', color: '#4fc3f7',
    monster: 'snowgremlin', skin: 'santa', from: [12, 15], to: [1, 14],
    desc: 'Платформы в снегу и гирляндах, на аренах хулиганят снежные гремлины. Собирай снежинки ❄️ и забери праздничный скин, пока идёт событие.'
  },
  easter: {
    id: 'easter', name: 'Пасха', icon: '🐰', cur: '🥚', curName: 'яиц', color: '#9ccc65',
    monster: 'evilbunny', skin: 'bunny', range: easterRange,
    desc: 'Платформы в весенней траве и расписных яйцах, а по аренам скачут злые кролики. Собирай яйца 🥚 и обменяй их на скин Пасхального Кролика.'
  }
};
var EV_KEY = '';           // id текущего события ('' — нет события); используется в кэше спрайтов платформ
var eventCache = null, eventCacheDay = '';
function getEvent() {
  const dk = todayKey();
  if (eventCacheDay === dk) return eventCache;
  eventCacheDay = dk;
  eventCache = null;
  let forced = null;
  try { const m = /[?&]event=(\w+)/.exec(location.search); if (m) forced = m[1]; } catch (e) {}
  if (forced) {
    eventCache = EVENTS[forced] || null;
  } else {
    const d = new Date();
    const md = (d.getMonth() + 1) * 100 + d.getDate();
    for (const k in EVENTS) {
      const ev = EVENTS[k];
      if (ev.range) {
        const r = ev.range(d.getFullYear()), end = new Date(r[1]); end.setDate(end.getDate() + 1);
        if (d >= r[0] && d < end) eventCache = ev;
        continue;
      }
      const a = ev.from[0] * 100 + ev.from[1], b = ev.to[0] * 100 + ev.to[1];
      if (a <= b ? (md >= a && md <= b) : (md >= a || md <= b)) eventCache = ev;
    }
  }
  return eventCache;
}
function refreshEvent() {
  const ev = getEvent();
  const k = ev ? ev.id : '';
  if (k !== EV_KEY) { EV_KEY = k; if (typeof platSprites !== 'undefined') platSprites.clear(); }
  return ev;
}
function eventEndsMs(ev) {
  if (!ev) return 0;
  const d = new Date();
  let y = d.getFullYear();
  if (ev.range) {
    let r = ev.range(y), end = new Date(r[1]); end.setDate(end.getDate() + 1);
    if (end - d < 0) { r = ev.range(y + 1); end = new Date(r[1]); end.setDate(end.getDate() + 1); }
    return end - d;
  }
  if (ev.to[0] < ev.from[0] && d.getMonth() + 1 >= ev.from[0]) y += 1;
  let ms = new Date(y, ev.to[0] - 1, ev.to[1] + 1) - d;
  if (ms < 0) ms = new Date(y + 1, ev.to[0] - 1, ev.to[1] + 1) - d;
  return ms;
}
// Украшение платформ на время события (рисуется один раз в спрайт)
function drawEventDecor(c, p) {
  if (!EV_KEY || p.broken) return;
  c.save();
  if (EV_KEY === 'halloween') {
    const x = p.x + p.w - 2, y = p.y + 1;
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, y); c.lineTo(x - 13, y); c.moveTo(x, y); c.lineTo(x - 10, y + 9); c.moveTo(x, y); c.lineTo(x - 3, y + 12);
    c.moveTo(x - 6, y); c.quadraticCurveTo(x - 6, y + 4, x - 5, y + 5.5); c.quadraticCurveTo(x - 3, y + 6, x - 1.5, y + 6);
    c.moveTo(x - 10, y); c.quadraticCurveTo(x - 9, y + 7, x - 8, y + 7); c.quadraticCurveTo(x - 4, y + 9.5, x - 2.4, y + 9.5);
    c.stroke();
    if (p.type === 'normal' || p.type === 'moving') {
      c.strokeStyle = OUT; c.lineWidth = 1.4;
      ell(c, p.x + 11, p.y - 4, 6, 5, '#ff8f1f');
      c.fillStyle = '#558b2f'; c.fillRect(p.x + 10, p.y - 11, 2.4, 3.5);
      c.fillStyle = '#3e2723'; c.fillRect(p.x + 8, p.y - 6, 1.8, 1.8); c.fillRect(p.x + 12.4, p.y - 6, 1.8, 1.8);
    }
  } else if (EV_KEY === 'easter') {
    c.strokeStyle = '#7cb342'; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath();
    for (let x = p.x + 6; x < p.x + p.w - 4; x += 6) { const hh = 3 + ((x * 13) % 4); c.moveTo(x, p.y + 1); c.lineTo(x - 1.5, p.y - hh); }
    c.stroke();
    if (p.type === 'normal' || p.type === 'moving') {
      const cols = ['#81d4fa', '#f48fb1', '#fff176', '#ce93d8'];
      const col = cols[Math.floor(p.w + (p.type === 'moving' ? 1 : 0)) % 4];
      c.strokeStyle = OUT; c.lineWidth = 1.4;
      ell(c, p.x + p.w - 12, p.y - 5, 4.6, 6, col);
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(p.x + p.w - 16, p.y - 5); c.lineTo(p.x + p.w - 14, p.y - 3.5); c.lineTo(p.x + p.w - 12, p.y - 5); c.lineTo(p.x + p.w - 10, p.y - 3.5); c.lineTo(p.x + p.w - 8, p.y - 5); c.stroke();
      ci(c, p.x + 9, p.y - 1.5, 2.2, '#fff59d', false); ci(c, p.x + 9, p.y - 1.5, 0.9, '#ff8f00', false);
    }
  } else if (EV_KEY === 'newyear') {
    c.fillStyle = '#ffffff'; c.strokeStyle = 'rgba(120,160,200,0.8)'; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(p.x + 3, p.y + 3);
    for (let x = p.x + 3; x <= p.x + p.w - 3; x += 7) c.quadraticCurveTo(x + 3.5, p.y - 5 - ((x * 7) % 3), x + 7, p.y + 2);
    c.lineTo(p.x + p.w - 3, p.y + 5); c.lineTo(p.x + 3, p.y + 5); c.closePath();
    c.fill(); c.stroke();
    const cols = ['#ff5252', '#ffeb3b', '#69f0ae', '#40c4ff'];
    for (let i = 0; i < 5; i++) ci(c, p.x + 9 + i * ((p.w - 18) / 4), p.y + p.h + 1.5, 2, cols[i % 4], false);
  }
  c.restore();
}

// ---------- Награда дня ----------
const DAILY = [
  { t: 'coins', n: 60 }, { t: 'coins', n: 90 }, { t: 'coins', n: 130 }, { t: 'coins', n: 180 },
  { t: 'coins', n: 240 }, { t: 'coins', n: 320 }, { t: 'day7' }
];

// ---------- Бонусы на старт ----------
const BOOSTS = {
  jet: { name: 'Джет-старт', icon: '🚀', desc: 'Матч начинается с долгого полёта на джетпаке' },
  shield: { name: 'Щит', icon: '🛡', desc: 'Один раз спасает от смерти в матче' },
  coin2: { name: 'Монеты ×2', icon: '💰', desc: 'Все монеты за матч удваиваются' },
  magnet: { name: 'Магнит', icon: '🧲', desc: 'Монеты весь матч летят к герою' },
  xp2: { name: 'Опыт ×2', icon: '⭐', desc: 'Весь опыт за матч удваивается' }
};
const BOOST_KEYS = Object.keys(BOOSTS);

// ---------- Сундуки ----------
const CHESTS = {
  common: { name: 'Деревянный сундук', short: 'Деревянный', icon: '📦', price: 250, coins: [80, 220], boosts: [0, 1], skinChance: 0.05, skinR: ['common'] },
  rare: { name: 'Серебряный сундук', short: 'Серебряный', icon: '🎁', price: 800, coins: [250, 650], boosts: [1, 2], skinChance: 0.18, skinR: ['common', 'rare'] },
  epic: { name: 'Золотой сундук', short: 'Золотой', icon: '👑', price: 2200, coins: [700, 1600], boosts: [2, 3], skinChance: 0.4, skinR: ['rare', 'epic', 'mythic'] }
};
const CHEST_KEYS = Object.keys(CHESTS);

// ---------- Колесо фортуны (раз в день бесплатно) ----------
const WHEEL_COST = 120;
const WHEEL = [
  { r: { t: 'coins', n: 50 }, w: 22, label: '50', icon: '🪙', col: '#5b9bff' },
  { r: { t: 'boost', k: 'magnet', n: 1 }, w: 12, label: 'Магнит', icon: '🧲', col: '#c06bf0' },
  { r: { t: 'coins', n: 120 }, w: 18, label: '120', icon: '🪙', col: '#2ed3b7' },
  { r: { t: 'boost', k: 'shield', n: 1 }, w: 10, label: 'Щит', icon: '🛡', col: '#ff7043' },
  { r: { t: 'coins', n: 250 }, w: 12, label: '250', icon: '🪙', col: '#26a69a' },
  { r: { t: 'boost', k: 'jet', n: 1 }, w: 10, label: 'Джет', icon: '🚀', col: '#ff5c8a' },
  { r: { t: 'chest', k: 'common' }, w: 12, label: 'Сундук', icon: '📦', col: '#8bc34a' },
  { r: { t: 'coins', n: 1000 }, w: 4, label: '1000', icon: '💎', col: '#ffb300' }
];

// ---------- Прокачка бонусов ----------
const UPGRADES = [
  { id: 'jetpack', icon: '🚀', name: 'Джетпак', desc: (l) => `Летит дольше: +${l * 15}%` },
  { id: 'propeller', icon: '🧢', name: 'Пропеллер', desc: (l) => `Летит дольше: +${l * 15}%` },
  { id: 'spring', icon: '🌀', name: 'Пружина', desc: (l) => `Подбрасывает выше: +${l * 4}%` },
  { id: 'magnet', icon: '🧲', name: 'Магнит', desc: (l) => (l ? `Притягивает монеты в радиусе ${upgMagnetR(l)}` : 'Монеты сами летят к герою') },
  { id: 'luck', icon: '🍀', name: 'Удача', desc: (l) => `Монеты встречаются чаще: +${l * 15}%` }
];
const UPG_MAX = 5;
const UPG_COST = [300, 700, 1500, 3000, 6000];
function upgMagnetR(l) { return l ? 40 + l * 15 : 0; }

// ---------- Задания дня и недели ----------
const QUEST_TYPES = {
  kill: { stat: 'monstersKilled', d: [12, 20], w: [100, 160], step: 1, icon: '👾', text: (n) => `Убей ${n} монстров` },
  spring: { stat: 'springJumps', d: [8, 14], w: [50, 80], step: 1, icon: '🌀', text: (n) => `Прыгни ${n} раз на пружине` },
  jumps: { stat: 'totalJumps', d: [150, 250], w: [1200, 1800], step: 50, icon: '🦘', text: (n) => `Сделай ${n} прыжков` },
  coins: { stat: 'totalCoinsCollected', d: [30, 50], w: [250, 400], step: 5, icon: '🪙', text: (n) => `Собери ${n} монет` },
  power: { stat: 'powerupsUsed', d: [3, 5], w: [20, 30], step: 1, icon: '🚀', text: (n) => `Подбери ${n} бонусов (пропеллер или джетпак)` },
  brk: { stat: 'brokenPlatforms', d: [8, 14], w: [60, 90], step: 1, icon: '🧱', text: (n) => `Сломай ${n} платформ` },
  games: { stat: 'gamesPlayed', d: [4, 6], w: [25, 35], step: 1, icon: '🎮', text: (n) => `Сыграй ${n} матчей` },
  shots: { stat: 'shotsFired', d: [60, 100], w: [500, 800], step: 10, icon: '🔫', text: (n) => `Сделай ${n} выстрелов` },
  score: { best: true, d: [3000, 6000], w: [10000, 15000], step: 500, icon: '🏆', text: (n, q) => `Набери ${formatNum(n)} за матч на арене «${(ARENAS[(q.arena || 1) - 1] || ARENAS[0]).name}»` },
  combo: { best: true, d: [12, 20], w: [35, 50], step: 1, icon: '🔥', text: (n) => `Достигни комбо ${n} за один матч` }
};
const QUEST_REWARD = { d: { coins: 120, xp: 4000, sp: 50 }, w: { coins: 600, xp: 25000, sp: 200 } };

// ---------- Боевой пропуск (сезон = календарный месяц) ----------
const PASS_LEVELS = 50, PASS_SP = 100, PASS_PREMIUM_PRICE = 4500;
const PASS_SKIN_ID = 'timekeeper'; // эксклюзивная легенда за 50 уровень премиум-линии
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
function passFree(l) {
  if (l === 30 || l === 50) return { t: 'chest', k: 'epic' };
  if (l % 10 === 0) return { t: 'chest', k: 'rare' };
  if (l % 5 === 0) return { t: 'chest', k: 'common' };
  if (l > 30 && l % 4 === 0) return { t: 'xp', n: 15000 + (l - 30) * 2000 };
  if (l % 3 === 0) return { t: 'boost', k: BOOST_KEYS[l % BOOST_KEYS.length], n: 1 };
  return { t: 'coins', n: 60 + l * 10 };
}
// Сезонные скины идут по кругу: каждый месяц — новый скин. Ноябрь 2026 — первый, дальше всё включается само.
// Чтобы добавить новый скин в цикл, создай его в SKINS (season: true) и вставь id в этот список.
// Порядок = месяцы подряд, каждый скин подходит под свою пору года (id у некоторых старые, внешний вид новый):
// ноя — осень (ёжик), дек — зима (кристалл), янв — зима (снеговик), фев — любовь (сердце), мар–май — весна,
// июн–авг — лето (серфер, попугай, арбуз), сен–окт — осень (книга, граф).
// Цикл на 24 месяца (2 года), потом всё повторяется. Первый год: ноя ёжик, дек — Дед Мороз, янв — снеговик, фев — купидон, мар — тюльпан…
const SEASON_SKINS = [
  'ranger', 'santa', 'samurai', 'cupid', 'tulip', 'umbrella', 'bee', 'surfer', 'parrot', 'comet', 'scholar', 'vampire',
  'owl', 'icequeen', 'firecracker', 'cupid', 'sprout', 'bunny', 'bee', 'surfer', 'parrot', 'comet', 'scholar', 'pumpkin'
];
const SEASON_ORIGIN = [2026, 11];
function seasonSkinId(key) {
  const p = String(key || seasonKeyNow()).split('-');
  const n = (Number(p[0]) - SEASON_ORIGIN[0]) * 12 + (Number(p[1]) - SEASON_ORIGIN[1]);
  return SEASON_SKINS[((n % SEASON_SKINS.length) + SEASON_SKINS.length) % SEASON_SKINS.length];
}
function seasonKeyAt(offset) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }
function seasonLabel(key) { const p = key.split('-'); return (MONTHS_RU[Number(p[1]) - 1] || '') + ' ' + p[0]; }
function nextSeasonWith(id) { for (let i = 0; i < 24; i++) { const k = seasonKeyAt(i); if (seasonSkinId(k) === id) return k; } return null; }
function passPrem(l, season) {
  if (l === 50) return { t: 'skin', id: PASS_SKIN_ID };
  if (l === 30) return { t: 'skin', id: seasonSkinId(season) };
  if (l === 15 || l === 25 || l === 35 || l === 45) return { t: 'chest', k: 'epic' };
  if (l % 5 === 0) return { t: 'chest', k: 'rare' };
  if (l % 2 === 0) return { t: 'boost', k: BOOST_KEYS[(l / 2) % BOOST_KEYS.length], n: 2 };
  return { t: 'coins', n: 150 + l * 20 };
}

// ---------- Достижения ----------
function regularSkins() { return SKINS.filter((s) => !s.event && !s.season && !s.pass); }
const ACHIEVEMENTS = [
  { id: 's1k', icon: '🥉', name: 'Первая 1000', desc: 'Набери 1 000 очков за матч', goal: 1000, coins: 100, v: () => saveData.bestScore },
  { id: 's5k', icon: '🥈', name: 'Высотник', desc: 'Набери 5 000 очков за матч', goal: 5000, coins: 200, v: () => saveData.bestScore },
  { id: 's10k', icon: '🥇', name: 'Покоритель высот', desc: 'Набери 10 000 очков за матч', goal: 10000, coins: 400, v: () => saveData.bestScore },
  { id: 's25k', icon: '🏔', name: 'Выше облаков', desc: 'Набери 25 000 очков за матч', goal: 25000, coins: 800, v: () => saveData.bestScore },
  { id: 's50k', icon: '🌠', name: 'К звёздам', desc: 'Набери 50 000 очков за матч', goal: 50000, coins: 1500, v: () => saveData.bestScore },
  { id: 'k100', icon: '🎯', name: 'Охотник', desc: 'Убей 100 монстров', goal: 100, coins: 150, v: () => saveData.stats.monstersKilled },
  { id: 'k500', icon: '🏹', name: 'Охотник: 500 монстров', desc: 'Убей 500 монстров', goal: 500, coins: 400, v: () => saveData.stats.monstersKilled },
  { id: 'k2000', icon: '⚔️', name: 'Истребитель', desc: 'Убей 2 000 монстров', goal: 2000, coins: 1200, v: () => saveData.stats.monstersKilled },
  { id: 'sp100', icon: '🌀', name: 'Попрыгунчик', desc: '100 прыжков на пружине', goal: 100, coins: 150, v: () => saveData.stats.springJumps },
  { id: 'j5k', icon: '🦘', name: 'Неутомимый', desc: 'Сделай 5 000 прыжков', goal: 5000, coins: 250, v: () => saveData.stats.totalJumps },
  { id: 'j25k', icon: '🦿', name: 'Железные ноги', desc: 'Сделай 25 000 прыжков', goal: 25000, coins: 800, v: () => saveData.stats.totalJumps },
  { id: 'c500', icon: '🐷', name: 'Копилка', desc: 'Собери 500 монет', goal: 500, coins: 150, v: () => saveData.stats.totalCoinsCollected },
  { id: 'c5k', icon: '💰', name: 'Богач', desc: 'Собери 5 000 монет', goal: 5000, coins: 700, v: () => saveData.stats.totalCoinsCollected },
  { id: 'a3', icon: '🧭', name: 'Путешественник', desc: 'Открой 3 арены', goal: 3, coins: 300, v: () => saveData.highestUnlockedArena },
  { id: 'a8', icon: '🗺', name: 'Исследователь', desc: 'Открой 8 арен', goal: 8, coins: 1000, v: () => saveData.highestUnlockedArena },
  { id: 'a15', icon: '🌌', name: 'Открыл все арены', desc: 'Дойди до Врат Бесконечности', goal: 15, coins: 5000, v: () => saveData.highestUnlockedArena },
  { id: 'sk5', icon: '👕', name: 'Модник', desc: 'Собери 5 скинов', goal: 5, coins: 150, v: () => saveData.ownedSkins.length },
  { id: 'sk15', icon: '🎭', name: 'Коллекционер', desc: 'Собери 15 скинов', goal: 15, coins: 500, v: () => saveData.ownedSkins.length },
  { id: 'skall', icon: '👑', name: 'Гардероб мечты', desc: 'Собери все обычные скины', goal: 1, coins: 3000, v: () => (regularSkins().every((s) => saveData.ownedSkins.includes(s.id)) ? 1 : 0), prog: () => [regularSkins().filter((s) => saveData.ownedSkins.includes(s.id)).length, regularSkins().length] },
  { id: 'g10', icon: '🎮', name: 'Новичок', desc: 'Сыграй 10 матчей', goal: 10, coins: 80, v: () => saveData.stats.gamesPlayed },
  { id: 'g100', icon: '🕹', name: 'Завсегдатай', desc: 'Сыграй 100 матчей', goal: 100, coins: 400, v: () => saveData.stats.gamesPlayed },
  { id: 'g500', icon: '🏆', name: 'Легенда прыжков', desc: 'Сыграй 500 матчей', goal: 500, coins: 1500, v: () => saveData.stats.gamesPlayed },
  { id: 't1h', icon: '⏱', name: 'Час в небе', desc: 'Проведи в игре 1 час', goal: 3600, coins: 300, v: () => saveData.stats.timePlayedSec },
  { id: 't10h', icon: '⌛', name: 'Десять часов полёта', desc: 'Проведи в игре 10 часов', goal: 36000, coins: 2000, v: () => saveData.stats.timePlayedSec },
  { id: 'cb25', icon: '🔥', name: 'Комбо-мастер', desc: 'Комбо 25 за матч', goal: 25, coins: 300, v: () => saveData.stats.maxCombo },
  { id: 'cb60', icon: '☄️', name: 'Неудержимый', desc: 'Комбо 60 за матч', goal: 60, coins: 1000, v: () => saveData.stats.maxCombo },
  { id: 'ch10', icon: '🗝', name: 'Кладоискатель', desc: 'Открой 10 сундуков', goal: 10, coins: 400, v: () => saveData.stats.chestsOpened },
  { id: 'wh10', icon: '🎡', name: 'Крутим барабан', desc: 'Крутни колесо 10 раз', goal: 10, coins: 200, v: () => saveData.stats.wheelSpins },
  { id: 'st7', icon: '📅', name: 'Неделя подряд', desc: 'Забирай награду 7 дней подряд', goal: 7, coins: 500, v: () => saveData.stats.maxStreak },
  { id: 'q50', icon: '📋', name: 'Исполнительный', desc: 'Выполни 50 заданий', goal: 50, coins: 800, v: () => saveData.stats.questsDone },
  { id: 'up5', icon: '🛠', name: 'Инженер', desc: 'Прокачай любой бонус до максимума', goal: UPG_MAX, coins: 600, v: () => Math.max(0, ...UPGRADES.map((u) => (saveData.upg && saveData.upg[u.id]) || 0)) },
  { id: 'bp30', icon: '🎖', name: 'Сезонный чемпион', desc: 'Дойди до 30 уровня пропуска', goal: 30, coins: 1000, v: () => (saveData.pass ? Math.min(PASS_LEVELS, Math.floor(saveData.pass.sp / PASS_SP)) : 0) },
  { id: 'bp50', icon: '⏳', name: 'Мастер сезона', desc: 'Дойди до 50 уровня пропуска', goal: 50, coins: 2500, v: () => (saveData.pass ? Math.min(PASS_LEVELS, Math.floor(saveData.pass.sp / PASS_SP)) : 0) }
];

// Приводит данные мета-игры к безопасному виду (вызывается из normalizeSave)
function normalizeMeta(out, parsed) {
  const p = parsed || {};
  const num = (v, d) => { v = Number(v); return Number.isFinite(v) && v >= 0 ? Math.floor(v) : d; };
  const str = (v) => (typeof v === 'string' ? v : '');
  const dl = p.daily || {};
  out.daily = { last: str(dl.last), day: clamp(num(dl.day, 0), 0, 6), streak: num(dl.streak, 0) };
  const q = p.quests && typeof p.quests === 'object' ? p.quests : {};
  const okQ = (x) => x && typeof x === 'object' && QUEST_TYPES[x.type] && Number.isFinite(Number(x.target));
  const fixQ = (x, scope) => ({ type: x.type, scope, target: num(x.target, 1) || 1, base: num(x.base, 0), best: num(x.best, 0), claimed: !!x.claimed, arena: clamp(num(x.arena, 1), 1, ARENAS.length) });
  const qd = Array.isArray(q.daily) ? q.daily.filter(okQ).map((x) => fixQ(x, 'd')) : [];
  const qw = Array.isArray(q.weekly) ? q.weekly.filter(okQ).map((x) => fixQ(x, 'w')) : [];
  out.quests = { dayKey: qd.length === 3 ? str(q.dayKey) : '', weekKey: qw.length === 3 ? str(q.weekKey) : '', daily: qd, weekly: qw };
  const ach = {};
  const srcA = p.ach && typeof p.ach === 'object' ? p.ach : {};
  for (const a of ACHIEVEMENTS) if (srcA[a.id]) ach[a.id] = num(srcA[a.id], 1) || 1;
  out.ach = ach;
  const ch = p.chests || {};
  out.chests = {};
  for (const k of CHEST_KEYS) out.chests[k] = num(ch[k], 0);
  const bs = p.boosts || {};
  out.boosts = {};
  for (const k of BOOST_KEYS) out.boosts[k] = num(bs[k], 0);
  out.boostSel = Array.isArray(p.boostSel) ? p.boostSel.filter((k, i, arr) => BOOSTS[k] && arr.indexOf(k) === i) : [];
  const up = p.upg || {};
  out.upg = {};
  for (const u of UPGRADES) out.upg[u.id] = clamp(num(up[u.id], 0), 0, UPG_MAX);
  const ps = p.pass || {};
  const ints = (a) => (Array.isArray(a) ? a.map(Number).filter((n, i, arr) => Number.isInteger(n) && n >= 1 && n <= PASS_LEVELS && arr.indexOf(n) === i) : []);
  out.pass = { season: str(ps.season), sp: num(ps.sp, 0), premium: !!ps.premium, cf: ints(ps.cf), cp: ints(ps.cp) };
  const ec = p.eventCur || {};
  out.eventCur = {};
  for (const k in EVENTS) out.eventCur[k] = num(ec[k], 0);
  out.wheelDay = str(p.wheelDay);
  out.metaSeen = !!p.metaSeen;
  const nt = p.net && typeof p.net === 'object' ? p.net : {};
  const okId = typeof nt.id === 'string' && /^[0-9a-f-]{36}$/i.test(nt.id);
  out.net = {
    id: okId ? nt.id : '', secret: typeof nt.secret === 'string' && nt.secret.length >= 16 ? nt.secret : '',
    code: okId && typeof nt.code === 'string' ? nt.code.slice(0, 8) : '', name: typeof nt.name === 'string' ? nt.name.slice(0, 16) : '',
    week: str(nt.week), weekBest: num(nt.weekBest, 0),
    outbox: Array.isArray(nt.outbox) ? nt.outbox.filter((x) => x && (x.t === 'add' && typeof x.code === 'string' || x.t === 'gift' && typeof x.to === 'string')).slice(0, 50) : []
  };
  if (!out.net.secret) out.net.id = '';
  return out;
}

// ==========================================================
// 9. СОХРАНЕНИЯ
// ==========================================================
const defaultSave = {
  bestScore: 0, coins: 300, totalXP: 0, selectedArena: 1, highestUnlockedArena: 1,
  ownedSkins: ['classic'], selectedSkin: 'classic', savedAt: 0, promos: [], arenaBest: {},
  settings: { shootSize: 64, shootX: 0.84, shootY: 0.9, shootOpacity: 90, quality: 'auto', fpsCap: 0, music: true, musicVol: 60 },
  stats: { gamesPlayed: 0, totalScore: 0, totalJumps: 0, springJumps: 0, brokenPlatforms: 0, monstersKilled: 0, shotsFired: 0, totalCoinsCollected: 0, powerupsUsed: 0, timePlayedSec: 0,
    maxCombo: 0, chestsOpened: 0, questsDone: 0, wheelSpins: 0, dailyClaims: 0, maxStreak: 0 }
};
let saveData = JSON.parse(JSON.stringify(defaultSave));

const SAVE_KEY = 'doodle_jump_ultimate_save_v3';   // ключ localStorage
const CLOUD_KEY = 'save_v3';                         // ключ Telegram CloudStorage
const tgRaw = window.Telegram && window.Telegram.WebApp;
const tgApp = tgRaw && (tgRaw.initData || (tgRaw.platform && tgRaw.platform !== 'unknown')) ? tgRaw : null;
const cloud = tgApp && tgApp.CloudStorage && typeof tgApp.CloudStorage.getItem === 'function' ? tgApp.CloudStorage : null;

// Приводит любые данные сохранения к безопасному виду
function normalizeSave(parsed) {
  const out = { ...defaultSave, ...(parsed || {}), stats: { ...defaultSave.stats, ...((parsed && parsed.stats) || {}) } };
  out.ownedSkins = Array.isArray(out.ownedSkins) ? out.ownedSkins.filter((id) => SKINS.some((s) => s.id === id)) : ['classic'];
  if (!out.ownedSkins.includes('classic')) out.ownedSkins.unshift('classic');
  const ab = {};
  const srcAb = parsed && parsed.arenaBest && typeof parsed.arenaBest === 'object' ? parsed.arenaBest : {};
  for (const a of ARENAS) { const v = Number(srcAb[a.id]); if (Number.isFinite(v) && v > 0) ab[a.id] = Math.floor(v); }
  out.arenaBest = ab;
  const st = { ...defaultSave.settings, ...((parsed && parsed.settings) || {}) };
  st.shootSize = clamp(Number(st.shootSize) || 64, 44, 110);
  st.shootX = clamp(Number.isFinite(Number(st.shootX)) ? Number(st.shootX) : 0.84, 0.05, 0.95);
  st.shootY = clamp(Number.isFinite(Number(st.shootY)) ? Number(st.shootY) : 0.9, 0.05, 0.95);
  st.shootOpacity = clamp(Number(st.shootOpacity) || 90, 30, 100);
  if (!['auto', 'low', 'high'].includes(st.quality)) st.quality = 'auto';
  if (![0, 30, 60, 120].includes(Number(st.fpsCap))) st.fpsCap = 0;
  st.fpsCap = Number(st.fpsCap);
  st.music = st.music !== false;
  st.musicVol = clamp(Number.isFinite(Number(st.musicVol)) ? Number(st.musicVol) : 60, 0, 100);
  out.settings = st;
  for (const k in defaultSave.stats) { const v = Number(out.stats[k]); out.stats[k] = Number.isFinite(v) && v >= 0 ? v : 0; }
  out.promos = Array.isArray(out.promos) ? out.promos.filter((x) => typeof x === 'string') : [];
  if (!out.ownedSkins.includes(out.selectedSkin)) out.selectedSkin = 'classic';
  for (const k of ['bestScore', 'coins', 'totalXP', 'savedAt']) if (!Number.isFinite(out[k]) || out[k] < 0) out[k] = defaultSave[k];
  if (!ARENAS.some((a) => a.id === out.selectedArena)) out.selectedArena = 1;
  if (Object.keys(out.arenaBest).length === 0 && out.bestScore > 0) out.arenaBest[ARENAS.some((a) => a.id === out.selectedArena) ? out.selectedArena : 1] = Math.floor(out.bestScore);
  if (!Number.isFinite(out.highestUnlockedArena) || out.highestUnlockedArena < 1) out.highestUnlockedArena = 1;
  normalizeMeta(out, parsed);
  return out;
}

const SAVE_KEY_BAK = SAVE_KEY + '_bak';              // страховочная копия (на случай повреждения основной)
function loadSaveData() {
  let loaded = false;
  for (const key of [SAVE_KEY, SAVE_KEY_BAK]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) { saveData = normalizeSave(JSON.parse(raw)); loaded = true; break; }
    } catch (e) { console.warn('Ошибка чтения сохранения (' + key + '):', e); }
  }
  saveData = normalizeSave(saveData);
  return loaded;
}

// Запись: сразу в localStorage, в облако Telegram — не чаще раза в 2 сек (и принудительно при паузе/конце матча)
let cloudTimer = null;
let cloudDirty = false;
function flushCloud() {
  flushLocal();
  clearTimeout(cloudTimer); cloudTimer = null;
  if (!cloud || !cloudDirty) return;
  cloudDirty = false;
  try { cloud.setItem(CLOUD_KEY, JSON.stringify(saveData), () => {}); } catch (e) { console.warn('CloudStorage:', e); }
}
let localTimer = null;
let localDirty = false;
function flushLocal() {
  clearTimeout(localTimer); localTimer = null;
  if (!localDirty) return;
  localDirty = false;
  try {
    const json = JSON.stringify(saveData);
    localStorage.setItem(SAVE_KEY, json);
    localStorage.setItem(SAVE_KEY_BAK, json);
  } catch (e) {}
}
// Запись на диск выполняем в «свободное» время браузера, чтобы не ловить фриз посреди прыжка
function whenIdle(fn) {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 1500 });
  else fn();
}
function writeSaveData() {
  saveData.savedAt = Date.now();
  localDirty = true;
  // Во время матча пишем редко (раз в 5 сек / в облако раз в 30 сек). При паузе, конце матча и сворачивании — сразу.
  let playing = false;
  try { playing = gameState === 'PLAYING'; } catch (e) {}
  if (!localTimer) localTimer = setTimeout(() => whenIdle(flushLocal), playing ? 5000 : 700);
  if (cloud) {
    cloudDirty = true;
    if (!cloudTimer) cloudTimer = setTimeout(() => whenIdle(flushCloud), playing ? 30000 : 2000);
  }
}
loadSaveData();

// При запуске в Telegram берём более свежее сохранение из облака (работает между устройствами)
function loadFromCloud() {
  if (!cloud) return;
  try {
    cloud.getItem(CLOUD_KEY, (err, value) => {
      if (err || !value) { cloudDirty = true; flushCloud(); return; } // в облаке пусто — выгружаем локальное
      try {
        const remote = normalizeSave(JSON.parse(value));
        if (remote.savedAt > saveData.savedAt && gameState !== 'PLAYING') {
          saveData = remote;
          applySettings();
          try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); } catch (e) {}
          syncUnlockedArenas(false);
          previewIdx = saveData.selectedArena;
          updateAllUI();
        } else if (remote.savedAt < saveData.savedAt) {
          cloudDirty = true; flushCloud();
        }
      } catch (e) { console.warn('Облачное сохранение повреждено:', e); }
    });
  } catch (e) { console.warn('CloudStorage:', e); }
}

let previewIdx = saveData.selectedArena || 1;
let menuAmbient = [];

function syncUnlockedArenas(showNotification) {
  let maxId = 1;
  for (const a of ARENAS) if (saveData.totalXP >= a.minXP) maxId = a.id;
  const selA = ARENAS[saveData.selectedArena - 1];
  if (!selA || saveData.totalXP < selA.minXP) { saveData.selectedArena = maxId; previewIdx = maxId; }
  if (maxId !== saveData.highestUnlockedArena) {
    const up = maxId > saveData.highestUnlockedArena;
    saveData.highestUnlockedArena = maxId;
    writeSaveData();
    if (up && showNotification) {
      showArenaToast(ARENAS[maxId - 1].name);
      playSound('arena_up');
    }
  }
}
function getCurrentArena() { return ARENAS[saveData.selectedArena - 1] || ARENAS[0]; }
const SKIN_MAP = {};
SKINS.forEach((sk) => { SKIN_MAP[sk.id] = sk; });
function getSkin() { return SKIN_MAP[saveData.selectedSkin] || SKINS[0]; }
// Бонусы героя (perk): coin — множитель монет, xp — множитель опыта, magnet — радиус притяжения монет, revive — воскрешений за матч
const NO_PERK = {};
function getPerk() { return getSkin().perk || NO_PERK; }
function gainCoins(n) {
  const m = (getPerk().coin || 1) * matchCoinMult;
  let g = Math.floor(n * m);
  if (Math.random() < n * m - g) g += 1;
  saveData.coins += g;
  saveData.stats.totalCoinsCollected += g;
  return g;
}

let toastTimer = null;
function showArenaToast(title) { showToastText(`🏆 НОВАЯ АРЕНА ОТКРЫТА: ${title}!`); }
function showToastText(text) {
  const toast = document.getElementById('arenaToast');
  toast.textContent = text;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ==========================================================
// 10. МИР, ФИЗИКА (1.0x)
// ==========================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const W = 420;
let H = 680; // высота подстраивается под экран (см. fitCanvas)

const GRAVITY = 0.22;
const JUMP_FORCE = -9.2;
const SPRING_FORCE = -14.8;
const PROPELLER_SPEED = -9.5;
const JETPACK_SPEED = -13.5;
const MOVE_SPEED = 5.2;

let gameState = 'MENU';
let score = 0;
let matchBonusXP = 0;
let cameraY = 0;
let matchTimeAccumulator = 0;
let frameCount = 0;
let windPhase = 0;
let windNow = 0;
let hazardTimer = 200;
let genY = 0;
let lastCX = W / 2;
let prevCX = W / 2;
let lastVanish = false;
let monsterCooldown = 0;
// Комбо и прочее состояние матча
let climb = 0;               // «чистая» высота (без множителя комбо): по ней растёт сложность
let combo = 0, comboTimer = 0, comboPulse = 0, matchMaxCombo = 0, lastLandH = -1e9, comboY = 70;
let matchKills = 0, matchCoinMult = 1, matchMagnet = 0, matchCur = 0, matchXpMult = 1;
const matchMods = { spring: 1, prop: 1, jet: 1, magnet: 0, luck: 0 };
const COMBO_TIME = 210;      // ~3.5 сек на следующее действие
function comboMult() { return 1 + Math.min(4, Math.floor(combo / 10)); }
function comboAdd(n) {
  const before = comboMult();
  combo += n;
  comboTimer = COMBO_TIME;
  comboPulse = 10;
  if (combo > matchMaxCombo) matchMaxCombo = combo;
  if (comboMult() > before) playSound('combo');
}
function comboBreak() { combo = 0; comboTimer = 0; }

const keys = { left: false, right: false };
const player = { x: W / 2 - 22, y: H - 140, w: 44, h: 44, vx: 0, vy: 0, facing: 1, shootTimer: 0, powerup: null, powerupTimer: 0, invuln: 0, revivesLeft: 0 };

let platforms = [], bullets = [], monsters = [], coins = [], particles = [], hazards = [];
let gameAmbient = makeAmbient(W, H, 30);

// Подгоняет высоту холста под реальную пропорцию экрана, чтобы снизу не было пустого места
function fitCanvas() {
  if (gameState === 'PLAYING' || gameState === 'PAUSED') return; // во время матча не трогаем
  const wrap = canvas.parentElement;
  const r = wrap.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const nh = clamp(Math.round(W * r.height / r.width), 560, 1000);
  if (nh === H && canvas.height === H && canvas.width === W) return;
  H = nh;
  canvas.width = W;
  canvas.height = H;
  gameAmbient = makeAmbient(W, H, 30);
  initGameWorld();
}
window.addEventListener('resize', fitCanvas);


// ----- сложность: плавный рост до 10 000, дальше усложнение с каждой тысячей -----
const HARD_START = 10000;
function hardLevel() { return Math.max(0, (climb - HARD_START) / 10000); } // 0 до 10к, 1 на 20к, 2 на 30к...
function getDifficulty(a) {
  const base = Math.min(climb / HARD_START, 1) * 0.5 * a.diff;
  return base + Math.min(hardLevel(), 3) * 0.55 * a.diff;
}

// ----- генерация: каждый ряд гарантированно проходим -----
function nextGap() {
  const a = getCurrentArena();
  const d = getDifficulty(a);
  return Math.min(62 + Math.random() * (26 + d * 16), 128); // максимум ~104 при прыжке ~192
}

function spawnRow(y, safe) {
  const a = getCurrentArena();
  const hl = Math.min(hardLevel(), 1.5);
  const pw = Math.round(68 - hl * 12), ph = 15;
  const d = getDifficulty(a);
  const cx = clamp(lastCX + (Math.random() * 2 - 1) * 150, 12 + pw / 2, W - 12 - pw / 2);

  // главная платформа: всегда ПРОЧНАЯ (не ломается)
  let type = 'normal';
  if (!safe) {
    const r = Math.random();
    const pm = 0.12 + d * 0.2;
    if (r < pm) type = 'moving';
    else if (r < pm + 0.08 + d * 0.06 && !lastVanish) type = 'vanish';
  }
  lastVanish = type === 'vanish';

  const plat = {
    x: cx - pw / 2, y, w: pw, h: ph, type,
    vx: type === 'moving' ? (Math.random() < 0.5 ? -1 : 1) * a.platSpeed * (1 + hardLevel() * 0.25) * (0.9 + Math.random() * 0.3) : 0,
    broken: false, breakVy: 0, item: null, springT: 0
  };
  if (!safe && (type === 'normal' || type === 'moving')) {
    const ir = Math.random();
    if (ir < 0.12) plat.item = 'spring';
    else if (ir < 0.145 && climb > 300) plat.item = 'propeller';
    else if (ir < 0.16 && climb > 700) plat.item = 'jetpack';
    else if (ir < 0.36 + matchMods.luck * 0.03) coins.push({ x: cx, y: y - 18, r: 10, collected: false, angle: Math.random() * 6.28, ev: !!EV_KEY && Math.random() < 0.22 });
  }
  platforms.push(plat);

  // побочная платформа (ловушка-обманка), строго в стороне от основной
  if (!safe && Math.random() < 0.28 + d * 0.2) {
    const ex = clamp(cx + (Math.random() < 0.5 ? -1 : 1) * (95 + Math.random() * 80), 12 + pw / 2, W - 12 - pw / 2);
    if (Math.abs(ex - cx) > 85) {
      platforms.push({
        x: ex - pw / 2, y: y - 18 + Math.random() * 30, w: pw, h: ph,
        type: Math.random() < 0.6 ? 'break' : 'normal', vx: 0, broken: false, breakVy: 0, item: null, springT: 0
      });
    }
  }

  // монстр: не на пути, не рядом подряд
  if (!safe && climb > 250) {
    if (monsterCooldown > 0) {
      monsterCooldown--;
    } else if (Math.random() < 0.1 * a.monsterRate * (0.7 + d * 0.6)) {
      let kind = a.monsters[Math.floor(Math.random() * a.monsters.length)];
      if (EV_KEY && Math.random() < 0.3) kind = EVENTS[EV_KEY].monster;
      const T = MONSTER_TYPES[kind];
      let mx = null;
      for (let k = 0; k < 6; k++) {
        const tx = 10 + Math.random() * (W - 20 - T.w);
        const mcx = tx + T.w / 2;
        if (Math.abs(mcx - cx) > 95 && Math.abs(mcx - prevCX) > 70) { mx = tx; break; }
      }
      if (mx !== null) {
        const my = y - 52 - Math.random() * 10;
        monsters.push({
          kind, x: mx, y: my, baseX: mx, baseY: my, w: T.w, h: T.h, hp: T.hp, maxHp: T.hp,
          vx: (Math.random() < 0.5 ? -1 : 1) * (T.speed || 0), phase: Math.random() * 6.28,
          cd: T.cd ? T.cd * (0.5 + Math.random()) : 0, charge: 0, fire: T.fire
        });
        monsterCooldown = 4;
      }
    }
  }
  prevCX = lastCX;
  lastCX = cx;
}

let hardWarned = false;
function initGameWorld() {
  idleDirty = true;
  hardWarned = false;
  touchPointers.clear(); keys.left = false; keys.right = false;
  hudLast.score = -1; hudLast.scoreT = 0;
  score = 0; matchBonusXP = 0; cameraY = 0; frameCount = 0;
  climb = 0; combo = 0; comboTimer = 0; comboPulse = 0; matchMaxCombo = 0; lastLandH = -1e9;
  matchKills = 0; matchCoinMult = 1; matchMagnet = 0; matchCur = 0; matchXpMult = 1;
  refreshEvent();
  matchMods.spring = 1 + 0.04 * upgLevel('spring');
  matchMods.prop = 1 + 0.15 * upgLevel('propeller');
  matchMods.jet = 1 + 0.15 * upgLevel('jetpack');
  matchMods.magnet = upgMagnetR(upgLevel('magnet'));
  matchMods.luck = upgLevel('luck');
  platforms = []; bullets = []; monsters = []; coins = []; particles = []; hazards = [];
  hazardTimer = 260; windPhase = Math.random() * 6; monsterCooldown = 0; lastVanish = false;
  stopAllLoops();

  player.x = W / 2 - player.w / 2; player.y = H - 120;
  player.vx = 0; player.vy = JUMP_FORCE; player.facing = 1;
  player.shootTimer = 0; player.powerup = null; player.powerupTimer = 0;
  player.invuln = 0; player.revivesLeft = getPerk().revive || 0;

  platforms.push({ x: W / 2 - 34, y: H - 65, w: 68, h: 15, type: 'normal', vx: 0, broken: false, breakVy: 0, item: null, springT: 0 });
  lastCX = W / 2; prevCX = W / 2;

  genY = H - 140;
  while (genY > -80) {
    spawnRow(genY, genY > H - 300);
    genY -= nextGap();
  }
  updateAllUI();
}

// ==========================================================
// 11. УПРАВЛЕНИЕ
// ==========================================================
function shootBullet() {
  if (gameState !== 'PLAYING' || player.powerup) return;
  player.shootTimer = 14;
  bullets.push({ x: player.x + player.w / 2, y: player.y + 4, vy: -13.5, r: 6.5 });
  saveData.stats.shotsFired += 1;
  playSound('shoot');
}

function pauseGame() {
  if (gameState !== 'PLAYING') return;
  gameState = 'PAUSED';
  stopAllLoops();
  keys.left = false; keys.right = false; touchPointers.clear();
  writeSaveData(); flushCloud();
  document.getElementById('pauseMenu').classList.remove('hidden');
}
function resumeGame() {
  if (gameState !== 'PAUSED') return;
  document.getElementById('pauseMenu').classList.add('hidden');
  gameState = 'PLAYING';
  if (player.powerup && soundEnabled) startLoop(player.powerup);
}

window.addEventListener('blur', pauseGame);
window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return; // печатаем в поле промокода
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (gameState === 'PLAYING') pauseGame(); else if (gameState === 'PAUSED') resumeGame();
    return;
  }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); shootBullet(); }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
});
// Телефон/планшет: левая половина экрана — лететь влево, правая — вправо (можно вести пальцем).
// Мышь (ПК): клик — выстрел, двигаемся клавишами.
const touchPointers = new Map();
function applyTouchDir() {
  let dir = 0;
  for (const d of touchPointers.values()) dir = d;
  keys.left = dir < 0;
  keys.right = dir > 0;
}
// Середину экрана запоминаем при касании: pointermove на 120 Гц приходит очень часто,
// а getBoundingClientRect в нём заставлял браузер пересчитывать вёрстку — отсюда подлагивания.
let touchMidX = 0;
function refreshTouchMid() {
  const rect = canvas.getBoundingClientRect();
  touchMidX = rect.left + rect.width / 2;
}
function touchDirFromEvent(e) {
  return e.clientX < touchMidX ? -1 : 1;
}
canvas.addEventListener('pointerdown', (e) => {
  if (gameState !== 'PLAYING') return;
  if (e.pointerType === 'mouse') { shootBullet(); return; }
  e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  if (touchPointers.size === 0) refreshTouchMid();
  touchPointers.set(e.pointerId, touchDirFromEvent(e));
  applyTouchDir();
});
canvas.addEventListener('pointermove', (e) => {
  const prev = touchPointers.get(e.pointerId);
  if (prev === undefined) return;
  const d = touchDirFromEvent(e);
  if (d === prev) return;
  touchPointers.set(e.pointerId, d);
  applyTouchDir();
});
function endTouch(e) {
  if (!touchPointers.delete(e.pointerId)) return;
  applyTouchDir();
}
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', endTouch);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Кнопка выстрела для сенсорных экранов
const shootBtnEl = document.getElementById('shootBtn');
shootBtnEl.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); shootBullet(); });
let shootShown = null;
function updateTouchUI() {
  const show = gameState === 'PLAYING';
  if (show === shootShown) return;
  shootShown = show;
  shootBtnEl.classList.toggle('hidden', !show);
}

// ==========================================================
// 12. ОБНОВЛЕНИЕ
// ==========================================================
// Чем выше арена, тем больше опыта за всё (×1.0, ×1.3, ×1.6 ...)
function xpMult(a) { return 1 + 0.3 * (a.id - 1); }
function fmtXP(n) { return n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.', ',') + ' млн' : formatNum(n); }
function addXP(n) {
  n *= xpMult(getCurrentArena()) * (getPerk().xp || 1) * matchXpMult;
  saveData.totalXP += n;
  matchBonusXP += n;
  syncUnlockedArenas(true);
}

function killMonster(i, reward) {
  const m = monsters[i];
  for (let k = 0; k < 8; k++) particles.push({ x: m.x + m.w / 2, y: m.y + m.h / 2, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 18, color: '#ffffff' });
  monsters.splice(i, 1);
  comboAdd(2);
  score += 100 * comboMult();
  matchKills += 1;
  saveData.stats.monstersKilled += 1;
  addXP(60);
  if (reward) gainCoins(2);
  writeSaveData();
  playSound('kill');
  updateHUD();
}

function updateHazards(dt, arena) {
  hazardTimer -= dt;
  const hk = hazardTimer <= 0 ? (arena.hazard === 'both' ? (Math.random() < 0.5 ? 'faller' : 'lightning') : arena.hazard) : null;
  if (hk === 'faller') {
    hazards.push({ kind: 'faller', look: arena.hazardLook || 'crystal', x: clamp(player.x + player.w / 2 + (Math.random() - 0.5) * 220, 24, W - 24), y: -40, warn: 70, falling: false });
    hazardTimer = (190 + Math.random() * 120) / (1 + hardLevel() * 0.6);
    playSound('warn');
  }
  if (hk === 'lightning') {
    hazards.push({ kind: 'bolt', x: clamp(player.x + player.w / 2 + (Math.random() - 0.5) * 150, 30, W - 30), warn: 62, strike: 0, seed: Math.random() * 100 });
    hazardTimer = (250 + Math.random() * 150) / (1 + hardLevel() * 0.6);
    playSound('warn');
  }
  const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  const vulnerable = !player.powerup && player.invuln <= 0;
  for (let i = hazards.length - 1; i >= 0; i--) {
    const hz = hazards[i];
    if (hz.kind === 'faller') {
      if (!hz.falling) {
        hz.warn -= dt;
        if (hz.warn <= 0) hz.falling = true;
      } else {
        hz.y += 9 * dt;
        if (hz.y > H + 40) { hazards.splice(i, 1); continue; }
        if (vulnerable && Math.abs(pcx - hz.x) < 17 && Math.abs(pcy - hz.y) < 28) { triggerGameOver(); return; }
      }
    } else if (hz.kind === 'bolt') {
      if (hz.warn > 0) {
        hz.warn -= dt;
        if (hz.warn <= 0) { hz.strike = 14; playSound('thunder'); }
      } else {
        hz.strike -= dt;
        if (vulnerable && Math.abs(pcx - hz.x) < 24) { triggerGameOver(); return; }
        if (hz.strike <= 0) { hazards.splice(i, 1); continue; }
      }
    } else if (hz.kind === 'fireball') {
      hz.y += hz.vy * dt;
      if (hz.y > H + 30) { hazards.splice(i, 1); continue; }
      if (vulnerable && Math.hypot(pcx - hz.x, pcy - hz.y) < hz.r + 15) { triggerGameOver(); return; }
    }
  }
}

function keepParticle(pt) { return pt.life > 0; }
function keepPlatform(p) { return p.y < H + 60; }
function keepMonster(m) { return m.baseY < H + 80; }
function keepCoin(c) { return !c.collected && c.y < H + 60; }

function update(dt) {
  const arena = getCurrentArena();
  frameCount += dt;

  matchTimeAccumulator += dt * (16.667 / 1000);
  if (matchTimeAccumulator >= 1) {
    const ws = Math.floor(matchTimeAccumulator);
    saveData.stats.timePlayedSec += ws;
    matchTimeAccumulator -= ws;
  }

  // движение
  const target = keys.left ? -MOVE_SPEED : keys.right ? MOVE_SPEED : 0;
  if (target !== 0) player.facing = target > 0 ? 1 : -1;
  if (arena.slip) {
    player.vx += (target - player.vx) * arena.slip * dt;
  } else if (target !== 0) {
    player.vx = target;
  } else {
    player.vx *= Math.pow(0.82, dt);
    if (Math.abs(player.vx) < 0.08) player.vx = 0;
  }
  windPhase += 0.012 * dt;
  windNow = (arena.wind + Math.min(hardLevel(), 2) * 0.5) * Math.sin(windPhase);
  player.x += (player.vx + windNow) * dt;
  if (player.x + player.w < 0) player.x = W;
  if (player.x > W) player.x = -player.w;

  if (player.shootTimer > 0) player.shootTimer = Math.max(0, player.shootTimer - dt);
  if (comboPulse > 0) comboPulse = Math.max(0, comboPulse - dt);
  if (combo > 0 && !player.powerup) { comboTimer -= dt; if (comboTimer <= 0) comboBreak(); }
  if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);

  if ((saveData.selectedSkin === 'sf' || saveData.selectedSkin === 'gold') && Math.random() < 0.35 * dt) {
    particles.push({ x: player.x + 8 + Math.random() * (player.w - 16), y: player.y + player.h - 6, vx: (Math.random() - 0.5) * 1.2, vy: -1 - Math.random() * 1.5, life: 16, color: saveData.selectedSkin === 'sf' ? '#ff1744' : '#ffd54f' });
  }

  const vyStart = player.vy;
  let moveVy = null;
  if (player.powerup) {
    player.powerupTimer -= dt;
    player.vy = player.powerup === 'jetpack' ? JETPACK_SPEED : PROPELLER_SPEED;
    if (player.powerup === 'jetpack' && Math.random() < 0.7 * dt) {
      particles.push({ x: player.x + (player.facing === 1 ? 6 : player.w - 6), y: player.y + player.h - 4, vx: (Math.random() - 0.5) * 2, vy: 3 + Math.random() * 3, life: 18, color: Math.random() < 0.5 ? '#ff5722' : '#ffca28' });
    }
    if (player.powerupTimer <= 0) {
      stopLoop(player.powerup);
      player.powerup = null;
    }
  } else {
    player.vy += GRAVITY * dt;
    moveVy = (vyStart + player.vy) / 2; // точная формула: высота прыжка не зависит от FPS
  }
  if (moveVy === null) moveVy = player.vy;

  const prevBottom = player.y + player.h;
  player.y += moveVy * dt;
  const currBottom = player.y + player.h;

  // отскоки
  if (player.vy > 0 && !player.powerup) {
    for (let i = platforms.length - 1; i >= 0; i--) {
      const p = platforms[i];
      if (p.broken) continue;
      const withinX = player.x + player.w - 8 > p.x && player.x + 8 < p.x + p.w;
      const crossedY = prevBottom <= p.y + 8 && currBottom >= p.y;
      if (withinX && crossedY) {
        if (p.type === 'break') {
          p.broken = true; p.breakVy = 2.5;
          saveData.stats.brokenPlatforms += 1;
          addXP(5);
          playSound('break');
          continue;
        }
        const landH = cameraY - p.y;
        if (landH > lastLandH + 4) comboAdd(1);
        else if (landH < lastLandH - 160) comboBreak();
        lastLandH = landH;
        if (p.item === 'spring') {
          player.vy = SPRING_FORCE * matchMods.spring; p.springT = 20;
          saveData.stats.springJumps += 1; saveData.stats.totalJumps += 1;
          playSound('spring');
        } else if (p.item === 'propeller') {
          player.powerup = 'propeller'; player.powerupTimer = 175 * matchMods.prop; p.item = null;
          saveData.stats.powerupsUsed += 1;
          playSound('powerup'); startLoop('propeller');
        } else if (p.item === 'jetpack') {
          player.powerup = 'jetpack'; player.powerupTimer = 240 * matchMods.jet; p.item = null;
          saveData.stats.powerupsUsed += 1;
          playSound('powerup'); startLoop('jetpack');
        } else {
          player.vy = JUMP_FORCE;
          saveData.stats.totalJumps += 1;
          playSound('jump');
        }
        if (p.type === 'vanish') platforms.splice(i, 1);
        break;
      }
    }
  }

  for (const p of platforms) {
    if (p.type === 'moving') {
      p.x += p.vx * dt;
      if (p.x < 10 || p.x + p.w > W - 10) p.vx *= -1;
    }
    if (p.springT > 0) p.springT = Math.max(0, p.springT - dt);
    if (p.broken) { p.breakVy += 0.35 * dt; p.y += p.breakVy * dt; }
  }

  // монеты
  const magnetR = Math.max(getPerk().magnet || 0, matchMagnet, matchMods.magnet);
  for (const c of coins) {
    if (c.collected) continue;
    c.angle += 0.08 * dt;
    const cdx = player.x + player.w / 2 - c.x, cdy = player.y + player.h / 2 - c.y;
    if (magnetR && Math.hypot(cdx, cdy) < magnetR) {
      const k = Math.min(1, 0.14 * dt);
      c.x += cdx * k; c.y += cdy * k;
    }
    if (Math.hypot(player.x + player.w / 2 - c.x, player.y + player.h / 2 - c.y) < c.r + 22) {
      c.collected = true;
      if (c.ev && EV_KEY) {
        const cn = getPerk().cur || 1;
        saveData.eventCur[EV_KEY] = (saveData.eventCur[EV_KEY] || 0) + cn;
        matchCur += cn;
      } else gainCoins(1);
      addXP(20);
      writeSaveData();
      playSound('coin');
      updateHUD();
    }
  }

  // пули
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y += b.vy * dt;
    if (b.y < -30) { bullets.splice(i, 1); continue; }
    for (let j = monsters.length - 1; j >= 0; j--) {
      const m = monsters[j];
      if (b.x > m.x - 3 && b.x < m.x + m.w + 3 && b.y > m.y - 3 && b.y < m.y + m.h + 3) {
        bullets.splice(i, 1);
        m.hp -= 1;
        if (m.hp <= 0) killMonster(j, true);
        else { playSound('break'); m.flash = 6; }
        break;
      }
    }
  }

  // монстры
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    const T = MONSTER_TYPES[m.kind];
    m.phase += 0.05 * dt;
    switch (T.move) {
      case 'patrol': m.x += m.vx * dt; if (Math.abs(m.x - m.baseX) > T.range) m.vx *= -1; break;
      case 'sine': m.x += m.vx * dt; if (m.x < 6 || m.x + m.w > W - 6) m.vx *= -1; m.y = m.baseY + Math.sin(m.phase) * T.amp; break;
      case 'hover': m.x = m.baseX + Math.sin(m.phase * 0.8) * T.range; m.y = m.baseY + Math.sin(m.phase * 1.3) * 7; break;
      case 'sweep': m.x += m.vx * dt; if (m.x < 4 || m.x + m.w > W - 4) m.vx *= -1; m.y = m.baseY + Math.sin(m.phase * 0.7) * 5; break;
    }
    if (T.shoots) {
      m.cd -= dt;
      m.charge = m.cd < 60 && m.cd > 0 ? 1 - m.cd / 60 : 0;
      if (m.cd <= 0) {
        m.cd = T.cd * (0.8 + Math.random() * 0.4);
        m.charge = 0;
        if (m.y > 10 && m.y < H - 160) {
          hazards.push({ kind: 'fireball', x: m.x + m.w / 2, y: m.y + m.h, vy: 4.4, r: 7, color: T.fire });
          playSound('fireball');
        }
      }
    }
    const overlapX = player.x + player.w - 6 > m.x && player.x + 6 < m.x + m.w;
    const overlapY = player.y + player.h > m.y && player.y < m.y + m.h;
    if (overlapX && overlapY) {
      if (player.vy > 0 && prevBottom <= m.y + 14) {
        player.vy = JUMP_FORCE;
        saveData.stats.totalJumps += 1;
        killMonster(i, false);
        playSound('jump');
      } else if (!player.powerup && player.invuln <= 0) {
        triggerGameOver();
        return;
      }
    }
  }

  updateHazards(dt, arena);
  if (gameState !== 'PLAYING') return;

  if (particles.length > 150) particles.splice(0, particles.length - 150);
  for (let i = 0; i < particles.length; i++) {
    const pt = particles[i];
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
  }
  compactInPlace(particles, keepParticle);

  // камера
  const threshold = H * 0.44;
  if (player.y < threshold) {
    const diff = threshold - player.y;
    player.y = threshold;
    cameraY += diff;
    const newHeightScore = Math.floor(cameraY * 0.45);
    if (newHeightScore > climb) {
      const delta = newHeightScore - climb;
      climb = newHeightScore;
      score += delta * comboMult();
      addXP(delta * 1.5);
      if (!hardWarned && climb >= HARD_START) { hardWarned = true; showToastText('⚠ ВЫШЕ 10 000: СЛОЖНОСТЬ РАСТЁТ!'); playSound('warn'); }
    }
    updateHUD();

    for (const p of platforms) p.y += diff;
    for (const m of monsters) { m.y += diff; m.baseY += diff; }
    for (const c of coins) c.y += diff;
    for (const b of bullets) b.y += diff;
    for (const pt of particles) pt.y += diff;
    for (const hz of hazards) if (hz.kind === 'fireball') hz.y += diff;
    genY += diff;

    compactInPlace(platforms, keepPlatform);
    compactInPlace(monsters, keepMonster);
    compactInPlace(coins, keepCoin);

    while (genY > -60) {
      genY -= nextGap();
      spawnRow(genY, false);
    }
  }

  if (player.y > H + 40) triggerGameOver();
}

// ==========================================================
// 13. ОТРИСОВКА ИГРЫ
// ==========================================================
function drawEntities(t) {
  const skin = getSkin();
  const arena = getCurrentArena();

  for (const p of platforms) {
    if (p.y < -40 || p.y > H + 30) continue;
    drawPlatformFast(ctx, arena, p);
    if (p.broken) continue;
    const cx = p.x + p.w / 2;
    if (p.item === 'spring') drawSpringShape(ctx, cx, p.y, 11 + 10 * (p.springT / 20));
    else if (p.item === 'propeller') drawPropCap(ctx, cx, p.y - 2, t * 0.012);
    else if (p.item === 'jetpack') drawJetpackShape(ctx, cx, p.y - 16, false);
  }

  for (const c of coins) {
    if (c.collected) continue;
    if (c.ev) { drawEventPickup(ctx, c); continue; }
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(Math.max(0.25, Math.abs(Math.cos(c.angle))), 1);
    ctx.fillStyle = '#ffca28'; ctx.strokeStyle = '#b28900'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-2, -6, 3, 8);
    ctx.restore();
  }

  for (const m of monsters) {
    if (m.y > H + 60 || m.y < -70) continue;
    if (m.flash > 0) { m.flash -= drawDt; ctx.globalAlpha = 0.55; }
    drawMonster(ctx, m, t);
    ctx.globalAlpha = 1;
  }
  for (const b of bullets) drawBullet(ctx, b, skin, t);

  for (const pt of particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, pt.life / 14));
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHazards(t) {
  for (const hz of hazards) {
    if (hz.kind === 'faller') {
      if (!hz.falling) {
        const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.5);
        ctx.fillStyle = 'rgba(255,60,60,' + (0.5 + pulse * 0.5) + ')';
        pg(ctx, [[hz.x - 10, 52], [hz.x + 10, 52], [hz.x, 72]], 'rgba(255,60,60,' + (0.5 + pulse * 0.5) + ')', false);
        ctx.strokeStyle = 'rgba(255,60,60,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 7]);
        ctx.beginPath(); ctx.moveTo(hz.x, 72); ctx.lineTo(hz.x, H); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.save(); ctx.translate(hz.x, hz.y);
        ctx.strokeStyle = '#4a148c'; ctx.lineWidth = 2;
        if (hz.look === 'rock') {
          ctx.strokeStyle = OUT; ctx.rotate(hz.y * 0.02);
          pg(ctx, [[-15, -6], [-8, -17], [6, -18], [16, -5], [12, 11], [-4, 15], [-14, 8]], '#8d6e63');
          pg(ctx, [[-8, -17], [6, -18], [2, -6], [-9, -4]], 'rgba(255,255,255,0.25)', false);
          ci(ctx, 5, 4, 3, '#6d4c41', false); ci(ctx, -6, 7, 2, '#6d4c41', false);
        } else if (hz.look === 'lantern') {
          ctx.strokeStyle = OUT; ctx.rotate(Math.sin(hz.y * 0.05) * 0.15);
          rr(ctx, -9, -22, 18, 6, 2, '#546e7a');
          rr(ctx, -12, -17, 24, 6, 2, '#78909c');
          rr(ctx, -9, -11, 18, 16, 2, '#cfd8dc');
          ctx.fillStyle = '#ffb74d'; ctx.fillRect(-4, -7, 8, 8); ctx.strokeRect(-4, -7, 8, 8);
          rr(ctx, -12, 5, 24, 6, 2, '#78909c');
          rr(ctx, -7, 11, 14, 8, 2, '#546e7a');
        } else if (hz.look === 'shard') {
          ctx.strokeStyle = OUT; ctx.rotate(Math.sin(hz.y * 0.04) * 0.25);
          pg(ctx, [[0, -26], [10, -8], [7, 16], [0, 28], [-8, 14], [-11, -6]], '#7c4dff');
          pg(ctx, [[0, -26], [10, -8], [0, 0]], 'rgba(255,255,255,0.35)', false);
          ci(ctx, 0, 2, 3.4, '#ff4081', false);
        } else if (hz.look === 'gear') {
          ctx.strokeStyle = OUT; ctx.rotate(hz.y * 0.05);
          gearPath(ctx, 21, 16, 9, 0); ctx.fillStyle = '#b8860b'; ctx.fill(); ctx.stroke();
          ci(ctx, 0, 0, 7, '#5d4037');
        } else {
          pg(ctx, [[0, 24], [-12, -10], [-5, -26], [5, -26], [12, -10]], '#26c6da');
          pg(ctx, [[0, 24], [12, -10], [5, -26], [0, -10]], 'rgba(255,255,255,0.35)', false);
        }
        ctx.restore();
      }
    } else if (hz.kind === 'bolt') {
      if (hz.warn > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.45);
        ctx.fillStyle = 'rgba(255,215,64,' + (0.1 + pulse * 0.15) + ')';
        ctx.fillRect(hz.x - 24, 0, 48, H);
        ctx.strokeStyle = 'rgba(255,215,64,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
        ctx.beginPath(); ctx.moveTo(hz.x - 24, 0); ctx.lineTo(hz.x - 24, H); ctx.moveTo(hz.x + 24, 0); ctx.lineTo(hz.x + 24, H); ctx.stroke(); ctx.setLineDash([]);
        pg(ctx, [[hz.x + 3, 50], [hz.x - 7, 68], [hz.x - 1, 68], [hz.x - 4, 84], [hz.x + 8, 62], [hz.x + 2, 62]], '#ffd740');
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(hz.x - 24, 0, 48, H);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.shadowColor = '#ffe082'; ctx.shadowBlur = LOW_FX ? 0 : 20;
        ctx.beginPath(); ctx.moveTo(hz.x, 0);
        let yy = 0, xx = hz.x;
        while (yy < H) { yy += 34; xx = hz.x + Math.sin(yy * 0.3 + hz.seed) * 14; ctx.lineTo(xx, yy); }
        ctx.stroke(); ctx.shadowBlur = 0;
      }
    } else if (hz.kind === 'fireball') {
      ctx.drawImage(getFireballSprite(hz.color, hz.r), hz.x - 16, hz.y - 30);
    }
  }
}

const decoCanvas = document.createElement('canvas');
const decoCtx = decoCanvas.getContext('2d');
let decoT = -1e9, decoKey = '';
function draw(t) {
  const arena = getCurrentArena();
  drawArenaBaseCached(ctx, arena, W, H, cameraY);
  // декорации фона (горы, здания, облака...) тяжёлые, а двигаются медленно — обновляем их реже и просто копируем слой.
  // Если устройство не справляется (autoLow), слой рисуется в половинном разрешении — в 4 раза меньше работы.
  const ds = autoLow ? 0.5 : 1;
  const dw = Math.round(W * ds), dh = Math.round(H * ds);
  const key = arena.id + ':' + W + 'x' + H + ':' + ds;
  const interval = autoLow ? 66 : (LOW_FX ? 45 : 33);
  if (decoKey !== key || t - decoT >= interval) {
    if (decoCanvas.width !== dw || decoCanvas.height !== dh) { decoCanvas.width = dw; decoCanvas.height = dh; }
    else { decoCtx.setTransform(1, 0, 0, 1, 0, 0); decoCtx.clearRect(0, 0, dw, dh); }
    decoCtx.setTransform(ds, 0, 0, ds, 0, 0);
    drawArenaDeco(decoCtx, arena, W, H, cameraY, t);
    decoKey = key; decoT = t;
  }
  ctx.drawImage(decoCanvas, 0, 0, W, H);
  stepAmbient(ctx, arena, gameAmbient, W, H, drawDt, windNow);
  drawEntities(t);
  drawHazards(t);
  if (player.invuln > 0 && Math.floor(player.invuln / 6) % 2 === 0) ctx.globalAlpha = 0.45;
  drawCharacter(ctx, getSkin(), player.x + player.w / 2, player.y + player.h / 2, player.facing, {
    shoot: player.shootTimer > 0, powerup: player.powerup, t
  });
  ctx.globalAlpha = 1;
  if (combo >= 2) drawComboBadge();
}

function drawEventPickup(c, coin) {
  c.save();
  c.translate(coin.x, coin.y);
  c.rotate(Math.sin(coin.angle) * 0.35);
  c.strokeStyle = OUT; c.lineWidth = 1.8; c.lineJoin = 'round';
  if (EV_KEY === 'newyear') {
    c.strokeStyle = '#e1f5fe'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.moveTo(Math.cos(a) * -11, Math.sin(a) * -11); c.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); }
    c.stroke();
    c.strokeStyle = '#4fc3f7'; c.lineWidth = 1.6; c.stroke();
    ci(c, 0, 0, 3, '#fff');
  } else if (EV_KEY === 'easter') {
    const cols = ['#81d4fa', '#f48fb1', '#fff176', '#ce93d8'];
    const col = cols[Math.floor(Math.abs(coin.x * 7 + coin.r)) % 4];
    c.beginPath(); c.moveTo(0, -12); c.bezierCurveTo(8, -12, 10, 2, 9, 5); c.bezierCurveTo(8, 11, -8, 11, -9, 5); c.bezierCurveTo(-10, 2, -8, -12, 0, -12); c.closePath();
    c.fillStyle = col; c.fill(); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-9, 0); c.lineTo(-5, 3); c.lineTo(-1, 0); c.lineTo(3, 3); c.lineTo(7, 0); c.lineTo(9, 1.5); c.stroke();
    ci(c, -3, -6, 1.6, '#ffffff', false); ci(c, 3, -5, 1.2, '#ffffff', false);
  } else {
    pg(c, [[-8, 0], [-16, -7], [-16, 7]], '#ffca28');
    pg(c, [[8, 0], [16, -7], [16, 7]], '#ffca28');
    ell(c, 0, 0, 10, 8, '#ff8f1f');
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(-5, -6); c.lineTo(-1, 6); c.moveTo(1, -7); c.lineTo(5, 5); c.stroke();
  }
  c.restore();
}

// Счётчик комбо: рисуется прямо на холсте (без перестройки страницы), только когда комбо идёт
function drawComboBadge() {
  const m = comboMult();
  const cols = ['#9aa3c7', '#4fc3f7', '#69f0ae', '#ffd54f', '#ff7043', '#ff4081'];
  const col = cols[Math.min(m, 5)];
  const k = 1 + (comboPulse / 10) * 0.12;
  const w = 128, h = 30, x = W / 2, y = comboY;
  ctx.save();
  ctx.translate(x, y + h / 2);
  ctx.scale(k, k);
  ctx.fillStyle = 'rgba(16,19,36,0.82)';
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 15); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col;
  ctx.fillRect(-w / 2 + 12, h / 2 - 6, (w - 24) * clamp(comboTimer / COMBO_TIME, 0, 1), 3);
  ctx.font = '900 14px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText('КОМБО ' + combo, -14, -2);
  ctx.fillStyle = col;
  ctx.fillText('×' + m, 40, -2);
  ctx.restore();
}

// ==========================================================
// 14. ИНТЕРФЕЙС
// ==========================================================
const hudEl = document.getElementById('hud');
const mainMenuEl = document.getElementById('mainMenu');
const shopMenuEl = document.getElementById('shopMenu');
const arenasMenuEl = document.getElementById('arenasMenu');
const statsMenuEl = document.getElementById('statsMenu');
const gameOverMenuEl = document.getElementById('gameOverMenu');
const promoMenuEl = document.getElementById('promoMenu');
const menuCanvas = document.getElementById('menuCanvas');
const mctx = menuCanvas.getContext('2d', { alpha: false });
const MW = 362, MH = 210;

const numFmt = new Intl.NumberFormat('ru-RU');
function formatNum(n) { return numFmt.format(Math.floor(n)); }
function formatTime(sec) { return `${Math.floor(sec / 60)} мин ${Math.floor(sec % 60)} сек`; }

const hudRefs = {
  score: document.getElementById('scoreDisplay'),
  coins: document.getElementById('hudCoins'),
  arena: document.getElementById('hudArenaName')
};
const hudLast = { score: -1, coins: -1, arena: -1, scoreT: 0 };
// Обновляем DOM только когда значение реально изменилось (иначе на каждом кадре идёт перерисовка интерфейса)
function updateHUD() {
  const sc = Math.floor(score);
  const now = performance.now();
  if (hudLast.score !== sc && (sc === 0 || now - hudLast.scoreT > 66)) {
    hudLast.score = sc; hudLast.scoreT = now;
    hudRefs.score.textContent = formatNum(sc);
  }
  if (hudLast.coins !== saveData.coins) {
    hudLast.coins = saveData.coins;
    hudRefs.coins.textContent = formatNum(saveData.coins);
  }
  const aid = saveData.selectedArena;
  if (hudLast.arena !== aid) {
    hudLast.arena = aid;
    hudRefs.arena.textContent = `Арена ${aid}`;
  }
}

function isArenaOpen(a) { return saveData.totalXP >= a.minXP; }

// Фирменный цвет каждой арены: им окрашивается всё главное меню
const ARENA_ACCENT = ['#6fd860', '#3ddc84', '#4fc3f7', '#d05ce3', '#ff6d3a', '#00e5ff', '#ffd54f', '#26c6da', '#9b7bff', '#ffb74d', '#ff7eb6', '#9fa8da', '#e0a43a', '#f06292', '#b388ff'];
function arenaAccent(a) { return ARENA_ACCENT[(a.id - 1) % ARENA_ACCENT.length]; }
function hexRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function inkFor(hex) {
  const [r, g, b] = hexRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#14172a' : '#ffffff';
}

// Листаем все арены (закрытые тоже можно посмотреть, но не выбрать)
let previewDir = 1;
function stepPreview(dir) {
  setPreview(previewIdx + dir, dir);
}
function setPreview(idx, dir) {
  const nIdx = ((idx - 1 + ARENAS.length) % ARENAS.length) + 1;
  if (nIdx !== previewIdx) startPreviewTransition(dir || (nIdx > previewIdx ? 1 : -1));
  previewIdx = nIdx;
  menuAmbient = makeAmbient(MW, MH, 22);
  updateAllUI();
}

// ---------- Лента арен под витриной (миниатюры рисуются один раз, лениво) ----------
const stripEl = document.getElementById('arenaStrip');
const stripCards = [];
const thumbCache = new Map();
function renderThumb(cv, a) {
  const cc = cv.getContext('2d');
  cc.setTransform(cv.width / 240, 0, 0, cv.height / 160, 0, 0);
  drawArenaScene(cc, a, 240, 160, 0, 0);
  const plat = { x: 86, y: 128, w: 68, h: 15, type: 'normal' };
  drawPlatformShape(cc, a, plat, 0);
  cc.setTransform(1, 0, 0, 1, 0, 0);
}
function buildArenaStrip() {
  if (stripCards.length) return;
  ARENAS.forEach((a) => {
    const b = document.createElement('button');
    b.className = 'mm-arena';
    b.style.setProperty('--c', arenaAccent(a));
    b.innerHTML = `<span class="mm-arena-img"><canvas width="168" height="112"></canvas><i class="mm-arena-lock">🔒</i><i class="mm-arena-on">✓</i></span><span class="mm-arena-name"><b>${a.id}</b> ${a.name}</span>`;
    b.addEventListener('click', () => { playSound('click'); setPreview(a.id); });
    stripEl.appendChild(b);
    stripCards.push({ el: b, cv: b.querySelector('canvas'), a, drawn: false });
  });
  // миниатюры дорисовываются по одной в свободное время, чтобы меню открывалось мгновенно
  let i = 0;
  const next = () => {
    if (i >= stripCards.length) return;
    const sc = stripCards[i++];
    if (!sc.drawn) { renderThumb(sc.cv, sc.a); sc.drawn = true; }
    whenIdle(next);
  };
  whenIdle(next);
}
let stripScrolledTo = -1;
function updateArenaStrip() {
  buildArenaStrip();
  for (const sc of stripCards) {
    const open = isArenaOpen(sc.a);
    sc.el.classList.toggle('locked', !open);
    sc.el.classList.toggle('active', sc.a.id === previewIdx);
    sc.el.classList.toggle('playing', sc.a.id === saveData.selectedArena);
  }
  const cur = stripCards[previewIdx - 1];
  if (cur && !cur.drawn) { renderThumb(cur.cv, cur.a); cur.drawn = true; }
  if (cur && stripScrolledTo !== previewIdx && !mainMenuEl.classList.contains('hidden')) {
    stripScrolledTo = previewIdx;
    const left = cur.el.offsetLeft - (stripEl.clientWidth - cur.el.offsetWidth) / 2;
    try { stripEl.scrollTo({ left, behavior: 'smooth' }); } catch (e) { stripEl.scrollLeft = left; }
  }
}

// ---------- Аватар героя в шапке ----------
const avatarCv = document.getElementById('mmAvatar');
let avatarSkin = '';
function updateAvatar() {
  const sk = getSkin();
  if (!avatarCv || avatarSkin === sk.id) return;
  avatarSkin = sk.id;
  const c = avatarCv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, avatarCv.width, avatarCv.height);
  const k = avatarCv.width / 44;
  c.scale(k, k);
  drawCharacter(c, sk, 22, 25, 1, { scale: 0.72, t: 0 });
  c.setTransform(1, 0, 0, 1, 0, 0);
}

function updateAllUI() {
  idleDirty = true;
  updateHUD();
  const sel = getCurrentArena();
  const pv = ARENAS[previewIdx - 1];
  const unlocked = saveData.totalXP >= pv.minXP;
  const next = ARENAS.find((a) => a.id === saveData.highestUnlockedArena + 1);
  const $ = (id) => document.getElementById(id);

  // цвет меню = цвет просматриваемой арены
  const ac = arenaAccent(pv);
  const [r, g, b] = hexRgb(ac);
  mainMenuEl.style.setProperty('--ac', ac);
  mainMenuEl.style.setProperty('--ac-rgb', `${r},${g},${b}`);
  mainMenuEl.style.setProperty('--ac-ink', inkFor(ac));
  const pa = arenaAccent(sel), [pr, pg2, pb] = hexRgb(pa);
  mainMenuEl.style.setProperty('--play', pa);
  mainMenuEl.style.setProperty('--play-rgb', `${pr},${pg2},${pb}`);
  mainMenuEl.style.setProperty('--play-ink', inkFor(pa));

  $('menuBestScore').textContent = unlocked ? formatNum(saveData.arenaBest[pv.id] || 0) : '—';
  $('menuCoins').textContent = formatNum(saveData.coins);
  $('shopCoins').textContent = formatNum(saveData.coins);
  $('promoCoins').textContent = formatNum(saveData.coins);
  $('arenasTotalXp').textContent = formatNum(saveData.totalXP);
  $('tileSkinsSub').textContent = `${saveData.ownedSkins.length} из ${SKINS.length}`;
  $('tileArenasSub').textContent = `${saveData.highestUnlockedArena} из ${ARENAS.length}`;
  $('tileStatsSub').textContent = `${formatNum(saveData.stats.gamesPlayed)} игр`;

  $('menuSkinName').textContent = getSkin().name;
  $('menuPlayArena').textContent = `${sel.icon} ${sel.name}`;
  $('menuArenaNum').textContent = `АРЕНА ${pv.id} / ${ARENAS.length}`;
  $('menuArenaMult').textContent = `⭐ ОПЫТ ×${xpMult(pv).toFixed(1)}`;
  $('menuArenaTitle').textContent = `${pv.icon} ${pv.name}`;
  $('menuArenaDesc').textContent = pv.desc;
  $('menuArenaTwist').textContent = pv.twist;
  updateAvatar();

  const lockEl = $('menuArenaLock');
  const selBtn = $('arenaSelectBtn');
  if (!unlocked) {
    const prev = ARENAS[pv.id - 2];
    const from = prev ? prev.minXP : 0;
    const pct = Math.max(0, Math.min(100, ((saveData.totalXP - from) / Math.max(1, pv.minXP - from)) * 100));
    lockEl.classList.remove('hidden');
    lockEl.innerHTML = `<div class="mm-lock-box"><div class="mm-lock-ico">🔒</div><div class="mm-lock-t">Откроется на ${fmtXP(pv.minXP)} XP</div><div class="mm-lock-bar"><i style="width:${pct.toFixed(1)}%"></i></div><div class="mm-lock-s">Осталось ${fmtXP(Math.max(0, Math.ceil(pv.minXP - saveData.totalXP)))} XP</div></div>`;
    selBtn.textContent = '🔒 Закрыта';
    selBtn.className = 'mm-select locked';
  } else if (sel.id === pv.id) {
    lockEl.classList.add('hidden');
    selBtn.textContent = '✓ Выбрана';
    selBtn.className = 'mm-select active';
  } else {
    lockEl.classList.add('hidden');
    selBtn.textContent = 'Выбрать';
    selBtn.className = 'mm-select';
  }

  updateArenaStrip();

  if (next) {
    const ha = ARENAS[saveData.highestUnlockedArena - 1];
    const span = next.minXP - ha.minXP;
    const pct = Math.min(100, (Math.max(0, saveData.totalXP - ha.minXP) / span) * 100);
    $('menuXpFill').style.setProperty('--b1', next.platNormal); $('menuXpFill').style.setProperty('--b2', next.platMoving);
    $('menuXpFill').style.width = `${pct}%`;
    $('menuXpLabel').textContent = `До арены ${next.id}: ${next.icon} ${next.name}`;
    $('menuXpText').textContent = `${fmtXP(Math.floor(saveData.totalXP))} / ${fmtXP(next.minXP)}`;
  } else {
    { const la = ARENAS[ARENAS.length - 1]; $('menuXpFill').style.setProperty('--b1', la.platNormal); $('menuXpFill').style.setProperty('--b2', la.platMoving); }
    $('menuXpFill').style.width = '100%';
    $('menuXpLabel').textContent = 'Все арены открыты!';
    $('menuXpText').textContent = `${fmtXP(Math.floor(saveData.totalXP))} XP`;
  }
  updateMetaUI();
}

// ---------- Свайп по витрине (телефон) ----------
(function () {
  const stage = document.getElementById('menuStage');
  if (!stage) return;
  let sx = null, sy = 0;
  stage.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; sx = e.clientX; sy = e.clientY; });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) { playSound('click'); stepPreview(dx < 0 ? 1 : -1); stage._swiped = true; }
    else if (Math.abs(dx) > 10 || Math.abs(dy) > 10) stage._swiped = true;
  });
  // Нажатие по витрине показывает / прячет ленту всех арен
  stage.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    if (stage._swiped) { stage._swiped = false; return; }
    playSound('click');
    const open = stripEl.classList.toggle('collapsed') === false;
    stage.classList.toggle('strip-open', open);
    if (open) { stripScrolledTo = -1; updateArenaStrip(); }
  });
  stage.addEventListener('pointercancel', () => { sx = null; });
})();

// Витрина арены: тяжёлые слои (фон, декорации, платформы) кэшируются в отдельные холсты,
// а каждый кадр рисуются только ambient-частицы, персонаж и монстры — поэтому прыжок идёт плавно.
function makeMenuLayer() {
  const cv = document.createElement('canvas');
  return { cv, cx: cv.getContext('2d') };
}
const menuLayers = { base: makeMenuLayer(), deco: makeMenuLayer(), plat: makeMenuLayer(), key: '', decoT: -1e9 };
// Плавный переход между аренами: старый кадр уезжает и тает, новый въезжает
const menuTrans = { cv: document.createElement('canvas'), t0: -1e9, dir: 1 };
const TRANS_MS = 340;
function startPreviewTransition(dir) {
  const T = menuTrans;
  if (T.cv.width !== menuCanvas.width || T.cv.height !== menuCanvas.height) { T.cv.width = menuCanvas.width; T.cv.height = menuCanvas.height; }
  const tc = T.cv.getContext('2d');
  tc.setTransform(1, 0, 0, 1, 0, 0);
  tc.drawImage(menuCanvas, 0, 0);
  T.t0 = performance.now();
  T.dir = dir;
}

const MENU_PLATS = [
  { x: 14, y: 182, w: 68, h: 15, type: 'normal' },
  { x: 147, y: 158, w: 68, h: 15, type: 'moving' },
  { x: 280, y: 182, w: 68, h: 15, type: 'normal' }
];

function drawMenuPreview(t) {
  const a = ARENAS[previewIdx - 1];
  const unlocked = saveData.totalXP >= a.minXP;
  const cw = menuCanvas.width, ch = menuCanvas.height;
  const sx = cw / MW, sy = ch / MH;
  const L = menuLayers;

  const key = a.id + ':' + (LOW_FX ? 1 : 0) + ':' + cw + 'x' + ch + ':' + EV_KEY;
  if (L.key !== key) {
    L.key = key;
    for (const l of [L.base, L.deco, L.plat]) { l.cv.width = cw; l.cv.height = ch; }
    L.base.cx.setTransform(sx, 0, 0, sy, 0, 0);
    drawArenaBase(L.base.cx, a, MW, MH, 0);
    const pc = L.plat.cx;
    pc.setTransform(sx, 0, 0, sy, 0, 0);
    for (const p of MENU_PLATS) drawPlatformShape(pc, a, p, t);
    drawSpringShape(pc, 48, 182, 13);
    // коин над средней платформой
    pc.save(); pc.translate(181, 128);
    pc.fillStyle = '#ffca28'; pc.strokeStyle = '#b28900'; pc.lineWidth = 2;
    pc.beginPath(); pc.arc(0, 0, 9, 0, 6.283); pc.fill(); pc.stroke();
    pc.fillStyle = 'rgba(255,255,255,0.55)'; pc.fillRect(-2, -5, 3, 7);
    pc.restore();
    L.decoT = -1e9;
  }
  if (t - L.decoT >= 66) {
    L.decoT = t;
    const dc = L.deco.cx;
    dc.setTransform(1, 0, 0, 1, 0, 0);
    dc.clearRect(0, 0, cw, ch);
    dc.setTransform(sx, 0, 0, sy, 0, 0);
    drawArenaDeco(dc, a, MW, MH, 0, t);
  }

  // фаза перехода: новая сцена въезжает с той стороны, куда листаем
  const T = menuTrans;
  const tp = Math.min(1, (t - T.t0) / TRANS_MS);
  const ease = 1 - Math.pow(1 - tp, 3);
  const shift = tp < 1 ? T.dir * (1 - ease) * cw * 0.18 : 0;

  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.drawImage(L.base.cv, 0, 0);
  mctx.drawImage(L.deco.cv, shift * 0.5, 0);
  mctx.drawImage(L.plat.cv, shift, 0);
  mctx.setTransform(sx, 0, 0, sy, shift, 0);
  stepAmbient(mctx, a, menuAmbient, MW, MH, loopDt, 0.3);

  // персонаж прыгает по платформам
  const hop = Math.sin(((t % 1200) / 1200) * Math.PI) * 64;
  const bx = 181 + Math.sin((t / 2400) * Math.PI * 2) * 133;
  const facing = Math.cos((t / 2400) * Math.PI * 2) > 0 ? 1 : -1;
  drawCharacter(mctx, getSkin(), bx, 148 - hop, facing, { t, scale: 0.95 });

  // монстры этой арены
  const kinds = a.monsters;
  for (let i = 0; i < kinds.length && i < 2; i++) {
    const mk = kinds[i];
    const MT = MONSTER_TYPES[mk];
    const cx = i === 0 ? 300 : 66;
    const cy = i === 0 ? 64 : 84;
    const dm = {
      kind: mk, x: cx - MT.w / 2 + Math.sin(t * 0.0013 + i * 2) * 10, y: cy - MT.h / 2 + Math.sin(t * 0.003 + i) * 6,
      w: MT.w, h: MT.h, hp: MT.hp, maxHp: MT.hp, phase: t * 0.003 + i, charge: 0
    };
    drawMonster(mctx, dm, t);
  }

  mctx.setTransform(1, 0, 0, 1, 0, 0);
  // мягкая виньетка для «киношности» (готовый спрайт)
  mctx.drawImage(getVignette(cw, ch), 0, 0);

  if (!unlocked) {
    mctx.fillStyle = 'rgba(8,10,22,0.42)';
    mctx.fillRect(0, 0, cw, ch);
  }

  if (tp < 1) {
    mctx.globalAlpha = 1 - ease;
    mctx.drawImage(T.cv, -T.dir * ease * cw * 0.25, 0);
    mctx.globalAlpha = 1;
  }
}

let vignetteCv = null;
function getVignette(w, h) {
  if (vignetteCv && vignetteCv.width === w && vignetteCv.height === h) return vignetteCv;
  vignetteCv = document.createElement('canvas');
  vignetteCv.width = w; vignetteCv.height = h;
  const c = vignetteCv.getContext('2d');
  const g = c.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(5,6,16,0.45)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const g2 = c.createLinearGradient(0, h * 0.72, 0, h);
  g2.addColorStop(0, 'rgba(5,6,16,0)');
  g2.addColorStop(1, 'rgba(5,6,16,0.35)');
  c.fillStyle = g2; c.fillRect(0, 0, w, h);
  return vignetteCv;
}

let skinFilter = 'all';
const RARITY_FILTERS = [
  ['all', 'Все'], ['owned', 'Купленные'], ['common', 'Обычные'], ['rare', 'Редкие'], ['epic', 'Эпические'], ['mythic', 'Мифические'], ['arcana', 'Аркана'], ['legend', 'Легенды'], ['event', 'Событие'], ['season', 'Сезон']
];

function renderShop() {
  updateAllUI();
  const filtersEl = document.getElementById('skinFilters');
  filtersEl.innerHTML = '';
  RARITY_FILTERS.forEach(([key, label]) => {
    const b = document.createElement('button');
    b.className = 'filter-chip' + (skinFilter === key ? ' active' : '');
    b.textContent = key === 'owned' ? `✓ Купленные (${saveData.ownedSkins.length})` : label;
    b.addEventListener('click', () => { skinFilter = key; playSound('click'); renderShop(); });
    filtersEl.appendChild(b);
  });
  const listEl = document.getElementById('skinsList');
  listEl.innerHTML = '';
  SKINS.filter((s) => skinFilter === 'all' || (skinFilter === 'owned' ? saveData.ownedSkins.includes(s.id) : s.rarity === skinFilter)).forEach((skin) => {
    const isOwned = saveData.ownedSkins.includes(skin.id);
    const isEquipped = saveData.selectedSkin === skin.id;
    const item = document.createElement('div');
    item.className = 'list-card skin-card' + (tryOnId === skin.id ? ' trying' : '');
    item.dataset.id = skin.id;
    const ev = getEvent();
    const evLive = skin.event && ev && ev.id === skin.event;
    let btnClass = 'buy', btnText = `${formatNum(skin.price)} 🪙`;
    if (isEquipped) { btnClass = 'equipped'; btnText = 'Выбран ✓'; }
    else if (isOwned) { btnClass = 'select'; btnText = 'Выбрать'; }
    else if (skin.event) { btnClass = evLive ? 'buy' : 'locked-btn'; btnText = evLive ? `${skin.priceCur} ${ev.cur}` : '🔒 Событие'; }
    else if (skin.pass) { btnClass = 'locked-btn'; btnText = '🎖 Пропуск 50'; }
    else if (skin.season) {
      btnClass = 'locked-btn';
      const nk = nextSeasonWith(skin.id);
      btnText = nk === seasonKeyNow() ? '🔒 Пропуск' : '⏳ ' + (nk ? (MONTHS_RU[Number(nk.split('-')[1]) - 1]) : 'Скоро');
    }
    item.innerHTML = `
      <div class="card-left">
        <canvas class="skin-thumb" width="104" height="104"></canvas>
        <div>
          <div class="card-title">${skin.name}<span class="rarity-tag rarity-${skin.rarity}">${skin.rarityName}</span></div>
          <div class="card-desc">${skin.desc}</div>
          ${skin.perkText ? `<div class="perk-line">${skin.perkText}</div>` : ''}
        </div>
      </div>
      <button class="action-btn ${btnClass}">${btnText}</button>`;
    const cv = item.querySelector('canvas');
    const cc = cv.getContext('2d');
    cc.scale(2, 2);
    const bg = cc.createLinearGradient(0, 0, 0, 52);
    bg.addColorStop(0, '#fffdf4'); bg.addColorStop(1, '#e6dfc9');
    cc.fillStyle = bg; cc.fillRect(0, 0, 52, 52);
    drawCharacter(cc, skin, 26, 28, 1, { scale: 0.7, t: 0 });
    item.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      playSound('click');
      setTryOn(skin.id);
    });
    item.querySelector('button').addEventListener('click', () => {
      setTryOn(skin.id);
      if (isEquipped) return;
      if (!isOwned && skin.event) { if (evLive) buyEventSkin(skin); else { playSound('break'); metaToast('🔒', 'Скин события', 'Появится в магазине во время события'); } return; }
      if (!isOwned && skin.pass) { playSound('break'); metaToast('🎖', 'Награда пропуска', '50 уровень премиум-линии'); return; }
      if (!isOwned && skin.season) {
        playSound('break');
        const nk = nextSeasonWith(skin.id);
        if (nk === seasonKeyNow()) metaToast('🎖', 'Награда пропуска', '30 уровень премиум-линии сезона');
        else metaToast('⏳', 'Сезонный скин', nk ? 'Вернётся в сезон «' + seasonLabel(nk) + '»' : 'Скоро появится');
        return;
      }
      if (isOwned) {
        saveData.selectedSkin = skin.id; writeSaveData(); playSound('jump'); renderShop();
      } else if (saveData.coins >= skin.price) {
        saveData.coins -= skin.price; saveData.ownedSkins.push(skin.id); saveData.selectedSkin = skin.id;
        writeSaveData(); playSound('coin'); renderShop();
      } else {
        playSound('break');
      }
    });
    listEl.appendChild(item);
  });
}

function renderArenas() {
  syncUnlockedArenas(false);
  updateAllUI();
  const listEl = document.getElementById('arenasList');
  listEl.innerHTML = '';
  ARENAS.forEach((arena) => {
    const unlocked = saveData.totalXP >= arena.minXP;
    const isSelected = saveData.selectedArena === arena.id;
    const card = document.createElement('div');
    card.className = `list-card ${unlocked ? '' : 'locked'}`;
    let btnClass = 'locked-btn', btnText = `🔒 ${fmtXP(arena.minXP)} XP`;
    if (isSelected) { btnClass = 'equipped'; btnText = 'Активна ✓'; }
    else if (unlocked) { btnClass = 'select'; btnText = 'Выбрать'; }
    card.innerHTML = `
      <div class="card-left">
        <canvas class="arena-thumb" width="128" height="96"></canvas>
        <div>
          <div class="card-title">Арена ${arena.id}: ${arena.name}</div>
          <div class="card-desc">${arena.twist}<br><strong>${fmtXP(arena.minXP)} XP</strong> • опыт ×${xpMult(arena).toFixed(1)}<br>🏆 Рекорд: <strong>${unlocked ? formatNum(saveData.arenaBest[arena.id] || 0) : '—'}</strong></div>
        </div>
      </div>
      <button class="action-btn ${btnClass}">${btnText}</button>`;
    const cc = card.querySelector('canvas').getContext('2d');
    cc.save();
    cc.scale(128 / 362, 96 / 272);
    drawArenaScene(cc, arena, 362, 272, 0, 0);
    cc.restore();
    if (!unlocked) { cc.fillStyle = 'rgba(8,10,20,0.6)'; cc.fillRect(0, 0, 128, 96); cc.font = '30px serif'; cc.textAlign = 'center'; cc.fillText('🔒', 64, 58); }
    card.querySelector('button').addEventListener('click', () => {
      if (!unlocked || isSelected) return;
      saveData.selectedArena = arena.id; previewIdx = arena.id;
      writeSaveData(); playSound('jump'); renderArenas();
    });
    listEl.appendChild(card);
  });
}

function renderStats() {
  updateAllUI();
  const s = saveData.stats;
  const items = [
    { label: '🎮 Сыграно матчей', val: formatNum(s.gamesPlayed) },
    { label: '🏆 Лучший счёт (все арены)', val: formatNum(saveData.bestScore) },
    ...ARENAS.map((a) => ({ label: `${a.icon} Рекорд: ${a.name}`, val: saveData.arenaBest[a.id] ? formatNum(saveData.arenaBest[a.id]) : '—' })),
    { label: '📈 Суммарный счёт', val: formatNum(s.totalScore) },
    { label: '⭐ Нафармлено опыта', val: `${formatNum(saveData.totalXP)} XP` },
    { label: '🏟 Открыто арен', val: `${saveData.highestUnlockedArena} из ${ARENAS.length}` },
    { label: '👕 Куплено скинов', val: `${saveData.ownedSkins.length} из ${SKINS.length}` },
    { label: '🦘 Всего прыжков', val: formatNum(s.totalJumps) },
    { label: '🌀 Прыжков на пружине', val: formatNum(s.springJumps) },
    { label: '🧱 Сломано платформ', val: formatNum(s.brokenPlatforms) },
    { label: '👾 Убито монстров', val: formatNum(s.monstersKilled) },
    { label: '🔫 Сделано выстрелов', val: formatNum(s.shotsFired) },
    { label: '🪙 Собрано монет за всё время', val: formatNum(s.totalCoinsCollected) },
    { label: '🚀 Бонусов подобрано', val: formatNum(s.powerupsUsed) },
    { label: '🔥 Лучшее комбо', val: formatNum(s.maxCombo || 0) },
    { label: '🏅 Достижений', val: `${ACHIEVEMENTS.filter((a) => saveData.ach[a.id]).length} из ${ACHIEVEMENTS.length}` },
    { label: '📋 Выполнено заданий', val: formatNum(s.questsDone || 0) },
    { label: '🗝 Открыто сундуков', val: formatNum(s.chestsOpened || 0) },
    { label: '📅 Лучшая серия входов', val: `${formatNum(s.maxStreak || 0)} дн.` },
    { label: '🎖 Уровень пропуска', val: `${passLevel()} из ${PASS_LEVELS}` },
    { label: '⏱ Время в игре', val: formatTime(s.timePlayedSec) }
  ];
  document.getElementById('statsGrid').innerHTML = items
    .map((it) => `<div class="stat-box"><div class="stat-box-label">${it.label}</div><div class="stat-box-value">${it.val}</div></div>`)
    .join('');
}

function hideAllModals() {
  document.querySelectorAll('.overlay').forEach((el) => el.classList.add('hidden'));
  const lb = document.getElementById('lootBox');
  if (lb) lb.classList.add('hidden');
}

function showMainMenu() {
  hideAllModals();
  challenge = null;
  previewIdx = saveData.selectedArena;
  menuAmbient = makeAmbient(MW, MH, 22);
  mainMenuEl.classList.remove('hidden');
  stripScrolledTo = -1;
  updateAllUI();
}

function startGame() {
  saveData.stats.gamesPlayed += 1;
  writeSaveData();
  if (gameState !== 'PLAYING' && gameState !== 'PAUSED') fitCanvas();
  else { gameState = 'MENU'; fitCanvas(); }
  initGameWorld();
  gameState = 'PLAYING';
  hideAllModals();
  hudEl.classList.remove('hidden');
  applyStartBoosts();
  try {
    const hr = hudEl.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    const y = (hr.bottom - cr.top) * (H / cr.height) + 8;
    comboY = Number.isFinite(y) && y > 20 && y < H * 0.4 ? y : 70;
  } catch (e) { comboY = 70; }
  playSound('jump');
}

function triggerGameOver() {
  if (gameState === 'GAMEOVER') return;
  // Бонус героя «воскрешение»: спасает от смерти (падение, монстр, молния), затем короткая неуязвимость
  if (gameState === 'PLAYING' && player.revivesLeft > 0) {
    player.revivesLeft -= 1;
    player.invuln = 150;
    player.y = Math.min(player.y, H * 0.5);
    if (player.y > H * 0.5 || player.y < H * 0.2) player.y = H * 0.44;
    player.vy = SPRING_FORCE;
    hazards = hazards.filter((hz) => hz.kind === 'fireball' ? false : hz.kind === 'faller' ? !hz.falling : false);
    playSound('powerup');
    showToastText('😇 ВОСКРЕШЕНИЕ! Герой спасён');
    return;
  }
  gameState = 'GAMEOVER';
  stopAllLoops();
  playSound('gameover');
  saveData.stats.totalScore += score;
  const arenaId = saveData.selectedArena;
  const isRecord = score > (saveData.arenaBest[arenaId] || 0) && score > 0;
  document.getElementById('newRecordBadge').classList.toggle('hidden', !isRecord);
  if (isRecord) saveData.arenaBest[arenaId] = score;
  if (score > saveData.bestScore) saveData.bestScore = score;
  syncUnlockedArenas(true);
  writeSaveData();
  document.getElementById('finalScore').textContent = formatNum(score);
  document.getElementById('finalBest').textContent = formatNum(saveData.bestScore);
  document.getElementById('finalArenaBest').textContent = formatNum(saveData.arenaBest[arenaId] || 0);
  document.getElementById('finalArenaName').textContent = ARENAS[arenaId - 1].name;
  document.getElementById('finalXpEarned').textContent = `+${formatNum(matchBonusXP)} XP`;
  document.getElementById('finalCoins').textContent = formatNum(saveData.coins);
  const meta = metaOnGameOver();
  writeSaveData();
  document.getElementById('finalCombo').textContent = formatNum(matchMaxCombo);
  document.getElementById('finalSP').textContent = '+' + meta.sp;
  const extra = [];
  if (matchCur && EV_KEY) extra.push(`${EVENTS[EV_KEY].cur} +${matchCur} ${EVENTS[EV_KEY].curName}`);
  if (meta.ready) extra.push(`✅ Заданий готово: ${meta.ready} — забери награду`);
  if (meta.ach.length) extra.push(`🏅 Новых достижений: ${meta.ach.length}`);
  const chTxt = challengeResultText(score);
  if (chTxt) extra.unshift(chTxt);
  netOnGameOver(score);
  const fx = document.getElementById('finalExtra');
  fx.textContent = extra.join(' • ');
  fx.classList.toggle('hidden', !extra.length);
  hudEl.classList.add('hidden');
  gameOverMenuEl.classList.remove('hidden');
  updateAllUI();
  flushCloud();
}

function openModal(el, render) {
  hideAllModals();
  el.classList.remove('hidden');
  render();
}


// ==========================================================
// ПРОМОКОДЫ (добавляй новые строки сюда: 'код': { coins: сколько })
// ==========================================================
const PROMOS = {
  jump500: { coins: 500 },
  jump1000: { coins: 1000 },
  jump10000: { coins: 10000 },
  jump20000: { coins: 20000 },
  jump30000: { coins: 30000 },
  jump40000: { coins: 40000 },
  jump50000: { coins: 50000 },
  passbonus: { pass: true } // открывает премиум боевого пропуска текущего сезона
};

function showPromoMsg(text, ok) {
  const el = document.getElementById('promoMsg');
  el.textContent = text;
  el.className = 'promo-msg ' + (ok ? 'ok' : 'err');
}

function redeemPromo() {
  const input = document.getElementById('promoInput');
  const code = input.value.trim().toLowerCase();
  if (!code) { showPromoMsg('Введи промокод.', false); playSound('break'); return; }
  const promo = Object.prototype.hasOwnProperty.call(PROMOS, code) ? PROMOS[code] : null;
  if (!promo) { showPromoMsg('❌ Такого промокода нет.', false); playSound('break'); return; }
  if (saveData.promos.includes(code)) { showPromoMsg('⚠ Этот промокод уже активирован.', false); playSound('break'); return; }
  if (promo.pass) {
    ensureSeason();
    if (saveData.pass.premium) { showPromoMsg('⚠ Премиум-пропуск уже активен в этом сезоне.', false); playSound('break'); return; }
    saveData.promos.push(code);
    saveData.pass.premium = true;
    writeSaveData(); flushCloud();
    input.value = '';
    playSound('arena_up');
    updateAllUI();
    showPromoMsg('✅ Премиум-пропуск активирован! 💎', true);
    return;
  }
  saveData.promos.push(code);
  saveData.coins += promo.coins;
  writeSaveData(); flushCloud();
  input.value = '';
  playSound('coin');
  updateAllUI();
  showPromoMsg(`✅ Промокод активирован! +${formatNum(promo.coins)} 🪙`, true);
}

function openPromo() {
  openModal(promoMenuEl, () => {
    document.getElementById('promoInput').value = '';
    document.getElementById('promoMsg').className = 'promo-msg';
    document.getElementById('promoMsg').textContent = '';
    updateAllUI();
  });
}

// ==========================================================
// НАСТРОЙКИ: кнопка выстрела, графика, FPS
// ==========================================================
const settingsMenuEl = document.getElementById('settingsMenu');
const sbPrev = document.getElementById('sbPreview');
const sbBtn = document.getElementById('sbPreviewBtn');

function applySettings() {
  idleDirty = true;
  const st = saveData.settings;
  shootBtnEl.style.setProperty('--sb-x', st.shootX.toFixed(4));
  shootBtnEl.style.setProperty('--sb-y', st.shootY.toFixed(4));
  shootBtnEl.style.setProperty('--sb-size', st.shootSize + 'px');
  shootBtnEl.style.setProperty('--sb-op', (st.shootOpacity / 100).toFixed(2));
  if (st.quality !== 'auto') autoLow = false;
  LOW_FX = st.quality === 'low' || (st.quality === 'auto' && (COARSE || autoLow));
}

function clampShootPos() {
  const st = saveData.settings;
  const wrapW = canvas.clientWidth || 390, wrapH = canvas.clientHeight || 844;
  const hx = (st.shootSize / 2) / wrapW, hy = (st.shootSize / 2) / wrapH;
  st.shootX = clamp(st.shootX, hx, 1 - hx);
  st.shootY = clamp(st.shootY, hy, 1 - hy);
}

function renderSettings() {
  const st = saveData.settings;
  sbPrev.style.aspectRatio = W + ' / ' + H;
  const wrapW = canvas.clientWidth || 390;
  const k = (sbPrev.clientWidth || 150) / wrapW;
  const px = Math.max(20, st.shootSize * k);
  sbBtn.style.width = px + 'px'; sbBtn.style.height = px + 'px';
  sbBtn.style.fontSize = (px * 0.45) + 'px';
  sbBtn.style.left = (st.shootX * 100) + '%';
  sbBtn.style.top = (st.shootY * 100) + '%';
  sbBtn.style.opacity = st.shootOpacity / 100;
  document.getElementById('sbSize').value = st.shootSize;
  document.getElementById('sbSizeVal').textContent = st.shootSize;
  document.getElementById('sbOpacity').value = st.shootOpacity;
  document.getElementById('sbOpacityVal').textContent = st.shootOpacity + '%';
  document.querySelectorAll('#qualitySeg .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.v === st.quality));
  document.querySelectorAll('#fpsSeg .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.v === String(st.fpsCap)));
  document.querySelectorAll('#musicSeg .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.v === (st.music ? '1' : '0')));
  document.getElementById('musicVol').value = st.musicVol;
  document.getElementById('musicVolVal').textContent = st.musicVol + '%';
  updateFpsInfo();
}

// Подсказка в настройках: какая частота у экрана и что сейчас делает игра
function updateFpsInfo() {
  const el = document.getElementById('fpsInfo');
  if (!el) return;
  const st = saveData.settings;
  const hz = typeof displayHz === 'number' ? displayHz : 60;
  const cap = effectiveCap();
  const now = cap ? cap : hz;
  let txt = `📺 Экран: ${hz} Гц • игра: до ${now} к/с`;
  if (st.fpsCap === 0 && autoCap60) txt += ' (авто снизило до 60 — так плавнее на этом устройстве)';
  if (st.fpsCap === 120 && hz < 100) txt += '. Браузер даёт только ' + hz + ' Гц: на iPhone Safari и Telegram часто ограничивают страницы 60 Гц, на Android включи 120 Гц в настройках экрана.';
  el.textContent = txt;
}

let sbDragging = false;
function sbMove(e) {
  const st = saveData.settings;
  const r = sbPrev.getBoundingClientRect();
  st.shootX = (e.clientX - r.left) / r.width;
  st.shootY = (e.clientY - r.top) / r.height;
  clampShootPos();
  applySettings(); renderSettings();
}
sbPrev.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  sbDragging = true;
  try { sbPrev.setPointerCapture(e.pointerId); } catch (err) {}
  sbMove(e);
});
sbPrev.addEventListener('pointermove', (e) => { if (sbDragging) sbMove(e); });
function sbEnd() { if (sbDragging) { sbDragging = false; writeSaveData(); } }
sbPrev.addEventListener('pointerup', sbEnd);
sbPrev.addEventListener('pointercancel', sbEnd);

document.getElementById('sbSize').addEventListener('input', (e) => {
  saveData.settings.shootSize = Number(e.target.value);
  clampShootPos(); applySettings(); renderSettings();
});
document.getElementById('sbOpacity').addEventListener('input', (e) => {
  saveData.settings.shootOpacity = Number(e.target.value);
  applySettings(); renderSettings();
});
['sbSize', 'sbOpacity'].forEach((id) => document.getElementById(id).addEventListener('change', () => writeSaveData()));
document.getElementById('sbResetBtn').addEventListener('click', () => {
  Object.assign(saveData.settings, { shootSize: 64, shootX: 0.84, shootY: 0.9, shootOpacity: 90 });
  clampShootPos(); applySettings(); renderSettings(); writeSaveData(); playSound('click');
});
document.getElementById('qualitySeg').addEventListener('click', (e) => {
  const b = e.target.closest('.seg-btn'); if (!b) return;
  saveData.settings.quality = b.dataset.v; autoLow = false;
  applySettings(); renderSettings(); writeSaveData(); playSound('click');
});
document.getElementById('fpsSeg').addEventListener('click', (e) => {
  const b = e.target.closest('.seg-btn'); if (!b) return;
  saveData.settings.fpsCap = Number(b.dataset.v);
  autoCap60 = false; nextFrameAt = 0; // выбор игрока важнее авто-снижения
  renderSettings(); writeSaveData(); playSound('click');
});
document.getElementById('musicSeg').addEventListener('click', (e) => {
  const b = e.target.closest('.seg-btn'); if (!b) return;
  saveData.settings.music = b.dataset.v === '1';
  ensureAudio();
  renderSettings(); writeSaveData(); playSound('click');
});
document.getElementById('musicVol').addEventListener('input', (e) => {
  saveData.settings.musicVol = Number(e.target.value);
  ensureAudio();
  renderSettings();
});
document.getElementById('musicVol').addEventListener('change', () => writeSaveData());
function openSettings() {
  playSound('click');
  openModal(settingsMenuEl, () => { renderSettings(); saveMsgEl.className = 'promo-msg'; saveMsgEl.textContent = ''; refreshPersistInfo(); });
  requestPersist();
}
document.getElementById('openSettingsBtn').addEventListener('click', openSettings);
document.getElementById('pauseSettingsBtn').addEventListener('click', openSettings);
document.getElementById('closeSettingsBtn').addEventListener('click', () => {
  if (gameState === 'PAUSED') { hideAllModals(); document.getElementById('pauseMenu').classList.remove('hidden'); }
  else showMainMenu();
});

// ==========================================================
// СОХРАНЕНИЕ ПРОГРЕССА: защита хранилища, экспорт и импорт
// ==========================================================
const SAVE_PREFIX = 'DJU1:';
const saveCodeEl = document.getElementById('saveCode');
const saveMsgEl = document.getElementById('saveMsg');
const saveFileInput = document.getElementById('saveFileInput');

// Просим браузер не удалять данные игры автоматически (особенно важно на iPhone и при нехватке места)
async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist && navigator.storage.persisted) {
      if (!(await navigator.storage.persisted())) await navigator.storage.persist();
    }
  } catch (e) {}
}
async function refreshPersistInfo() {
  const el = document.getElementById('persistInfo');
  if (!el) return;
  let txt = 'Сделай копию кода сохранения — это самая надёжная защита прогресса.';
  try {
    if (navigator.storage && navigator.storage.persisted) {
      txt = (await navigator.storage.persisted())
        ? '🔒 Хранилище защищено: браузер не удалит прогресс сам. Копия кода всё равно не помешает.'
        : '⚠ Браузер может удалить данные сайта при нехватке места или долгом простое. Сделай копию кода.';
    }
  } catch (e) {}
  el.textContent = txt;
}

function showSaveMsg(text, ok) { saveMsgEl.textContent = text; saveMsgEl.className = 'promo-msg ' + (ok ? 'ok' : 'err'); }

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // Base64URL без "+", "/" и "=" — не обрывается при выделении на телефонах
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64decode(b64) {
  let clean = String(b64 || '')
    .replace(/[\s\u200B-\u200D\uFEFF"'`<>]/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/[^A-Za-z0-9+/=]/g, '')
    .replace(/=+$/, '');
  const rem = clean.length % 4;
  if (rem === 1) clean = clean.slice(0, -1);
  else if (rem === 2) clean += '==';
  else if (rem === 3) clean += '=';
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}
function makeSaveCode() {
  flushLocal();
  return SAVE_PREFIX + b64encode(JSON.stringify(saveData));
}
function tryRecoverJson(raw) {
  const s = String(raw || '').trim();
  if (!s.startsWith('{')) return null;
  try { return JSON.parse(s); } catch (e) {}
  const suffixes = ['', '}', '"}', ']}', '"]}', '}}', '"} }', '0}', '0}}', 'false}', 'null}'];
  for (let i = s.length; i > 2; i--) {
    let sub = s.slice(0, i).trim().replace(/[,:]+$/, '');
    for (const suf of suffixes) {
      try {
        const obj = JSON.parse(sub + suf);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
      } catch (e) {}
    }
  }
  return null;
}
function parseSaveCode(text) {
  let s = String(text || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!s) throw new Error('empty');
  let json = '';
  if (s.startsWith('{')) {
    json = s;
  } else {
    const match = s.match(/dju\d*\s*[:_-]?\s*([A-Za-z0-9+/=_-]{8,})/i);
    if (match) {
      json = b64decode(match[1]);
    } else {
      const compact = s.replace(/\s+/g, '');
      const b64Match = compact.match(/(eyJ[A-Za-z0-9+/=_-]{8,})/);
      if (b64Match) {
        json = b64decode(b64Match[1]);
      } else if (/^[A-Za-z0-9+/=_-]{12,}$/.test(compact)) {
        json = b64decode(compact);
      } else {
        const fb = s.indexOf('{'), lb = s.lastIndexOf('}');
        if (fb !== -1 && lb > fb) json = s.slice(fb, lb + 1);
        else throw new Error('bad');
      }
    }
  }
  const obj = tryRecoverJson(json);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('bad');
  const knownKeys = ['totalXP', 'coins', 'ownedSkins', 'bestScore', 'selectedArena', 'highestUnlockedArena', 'selectedSkin', 'arenaBest', 'stats', 'settings'];
  if (!knownKeys.some((k) => k in obj)) throw new Error('bad');
  return obj;
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) {}
  try {
    saveCodeEl.focus(); saveCodeEl.select(); saveCodeEl.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch (e) { return false; }
}

async function exportSaveCode() {
  const code = makeSaveCode();
  saveCodeEl.value = code;
  const copied = await copyText(code);
  playSound('click');
  showSaveMsg(copied
    ? '✅ Код скопирован. Вставь его в заметки или отправь себе в мессенджер.'
    : '✅ Код готов в поле выше: выдели его и скопируй вручную.', true);
}

function downloadSaveFile() {
  const code = makeSaveCode();
  saveCodeEl.value = code;
  try {
    const blob = new Blob([code], { type: 'text/plain' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = 'doodle-jump-save-' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    playSound('click');
    showSaveMsg('✅ Файл сохранения скачан. Если загрузка не началась, скопируй код из поля выше.', true);
  } catch (e) {
    showSaveMsg('Не удалось скачать файл — скопируй код из поля выше.', false);
  }
}

function applyImportedSave(text) {
  if (gameState === 'PLAYING') { showSaveMsg('Загрузка прогресса доступна только в меню или на паузе.', false); playSound('break'); return; }
  let obj;
  try {
    obj = parseSaveCode(text);
  } catch (e) {
    if (e && e.message === 'empty') {
      showSaveMsg('📋 Поле пустое. Вставь сюда код сохранения и нажми «Загрузить из кода».', false);
    } else {
      showSaveMsg('❌ Код не распознан. Проверь, что он скопирован целиком.', false);
    }
    playSound('break');
    return;
  }
  // на всякий случай запоминаем текущий прогресс — вдруг загрузили не тот код
  try { localStorage.setItem(SAVE_KEY + '_before_import', JSON.stringify(saveData)); } catch (e) {}
  saveData = normalizeSave(obj);
  syncUnlockedArenas(false);
  previewIdx = saveData.selectedArena;
  applySettings();
  writeSaveData();   // обновляет savedAt, чтобы загруженный прогресс победил облачный в Telegram
  flushCloud();
  updateAllUI();
  renderSettings();
  playSound('powerup');
  showSaveMsg('✅ Прогресс загружен: ' + formatNum(saveData.coins) + ' 🪙, ' + formatNum(saveData.totalXP) + ' XP, скинов: ' + saveData.ownedSkins.length + '.', true);
}

document.getElementById('saveExportBtn').addEventListener('click', exportSaveCode);
document.getElementById('saveFileBtn').addEventListener('click', downloadSaveFile);
document.getElementById('saveImportBtn').addEventListener('click', () => applyImportedSave(saveCodeEl.value));
document.getElementById('saveLoadFileBtn').addEventListener('click', () => { playSound('click'); saveFileInput.click(); });
saveFileInput.addEventListener('change', () => {
  const f = saveFileInput.files && saveFileInput.files[0];
  if (!f) return;
  if (f.size > 2000000) { showSaveMsg('❌ Файл слишком большой для сохранения.', false); saveFileInput.value = ''; return; }
  const rd = new FileReader();
  rd.onload = () => { saveCodeEl.value = String(rd.result || ''); applyImportedSave(saveCodeEl.value); saveFileInput.value = ''; };
  rd.onerror = () => { showSaveMsg('❌ Не удалось прочитать файл.', false); saveFileInput.value = ''; };
  rd.readAsText(f);
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('openPromoBtn').addEventListener('click', () => { playSound('click'); openPromo(); });
document.getElementById('closePromoBtn').addEventListener('click', showMainMenu);
document.getElementById('promoApplyBtn').addEventListener('click', redeemPromo);
document.getElementById('promoInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') redeemPromo(); });
document.getElementById('restartBtn').addEventListener('click', startGame);
function openShop() { setTryOn(saveData.selectedSkin); openModal(shopMenuEl, renderShop); }
document.getElementById('openShopBtn').addEventListener('click', () => { playSound('click'); openShop(); });
document.getElementById('gameOverShopBtn').addEventListener('click', openShop);
document.getElementById('closeShopBtn').addEventListener('click', showMainMenu);
document.getElementById('openArenasBtn').addEventListener('click', () => { playSound('click'); openModal(arenasMenuEl, renderArenas); });
document.getElementById('gameOverArenasBtn').addEventListener('click', () => openModal(arenasMenuEl, renderArenas));
document.getElementById('closeArenasBtn').addEventListener('click', showMainMenu);
document.getElementById('openStatsBtn').addEventListener('click', () => { playSound('click'); openModal(statsMenuEl, renderStats); });
document.getElementById('closeStatsBtn').addEventListener('click', showMainMenu);
document.getElementById('toMenuBtn').addEventListener('click', showMainMenu);
document.getElementById('pauseBtn').addEventListener('click', pauseGame);
document.getElementById('resumeBtn').addEventListener('click', resumeGame);
document.getElementById('pauseRestartBtn').addEventListener('click', startGame);
document.getElementById('pauseMenuBtn').addEventListener('click', () => { gameState = 'MENU'; hudEl.classList.add('hidden'); showMainMenu(); });

document.getElementById('arenaPrevBtn').addEventListener('click', () => { playSound('click'); stepPreview(-1); });
document.getElementById('arenaNextBtn').addEventListener('click', () => { playSound('click'); stepPreview(1); });
document.getElementById('arenaSelectBtn').addEventListener('click', () => {
  const pv = ARENAS[previewIdx - 1];
  if (saveData.totalXP < pv.minXP || saveData.selectedArena === pv.id) return;
  saveData.selectedArena = pv.id;
  writeSaveData();
  playSound('powerup');
  updateAllUI();
});

document.getElementById('soundToggleBtn').addEventListener('click', (e) => {
  soundEnabled = !soundEnabled;
  if (!soundEnabled) stopAllLoops();
  else if (player.powerup) startLoop(player.powerup);
  e.currentTarget.textContent = soundEnabled ? '🔊' : '🔇';
});


// ==========================================================
// 14.5. МЕТА-ИГРА: логика и окна (награда дня, задания, достижения, сундуки, колесо, прокачка, пропуск, событие, примерка)
// Всё это работает только в меню: во время матча ничего из этого не считается и не рисуется.
// ==========================================================
const $id = (id) => document.getElementById(id);
const metaEls = {
  daily: $id('dailyMenu'), quests: $id('questsMenu'), ach: $id('achMenu'), chest: $id('chestMenu'),
  upg: $id('upgMenu'), pass: $id('passMenu'), event: $id('eventMenu')
};
function metaSave() { writeSaveData(); flushCloud(); }
function giveXP(n) { saveData.totalXP += n; syncUnlockedArenas(true); }
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function upgLevel(id) { return (saveData.upg && saveData.upg[id]) || 0; }

// ---------- Всплывающие уведомления (поверх меню) ----------
const toastsEl = $id('metaToasts');
function metaToast(icon, title, sub) {
  const d = document.createElement('div');
  d.className = 'meta-toast';
  d.innerHTML = `<span class="mt-ico">${icon}</span><span class="mt-txt"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>`;
  toastsEl.appendChild(d);
  while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, 3200);
}

// ---------- Награды ----------
function randomSkin(rarities) {
  const pool = SKINS.filter((s) => !s.event && !s.season && !s.pass && rarities.includes(s.rarity) && !saveData.ownedSkins.includes(s.id));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
function rewardView(r) {
  switch (r.t) {
    case 'coins': return { ico: '🪙', text: `+${formatNum(r.n)} монет`, short: formatNum(r.n) };
    case 'xp': return { ico: '⭐', text: `+${fmtXP(r.n)} XP`, short: fmtXP(r.n) };
    case 'chest': return { ico: CHESTS[r.k].icon, text: CHESTS[r.k].name, short: CHESTS[r.k].short };
    case 'boost': return { ico: BOOSTS[r.k].icon, text: `${BOOSTS[r.k].name}${r.n > 1 ? ' ×' + r.n : ''}`, short: '×' + r.n };
    case 'skin': { const s = SKIN_MAP[r.id]; return { ico: '🎭', text: `Скин «${s ? s.name : '?'}»`, short: 'Скин', skin: r.id }; }
    case 'day7': return { ico: '🎭', text: 'Редкий скин или сундук', short: 'Скин' };
    case 'cur': return { ico: EVENTS[r.k].cur, text: `+${r.n} ${EVENTS[r.k].curName}`, short: '' + r.n };
  }
  return { ico: '❔', text: '', short: '' };
}
function grantReward(r) {
  switch (r.t) {
    case 'coins': saveData.coins += r.n; break;
    case 'xp': giveXP(r.n); break;
    case 'chest': saveData.chests[r.k] = (saveData.chests[r.k] || 0) + 1; break;
    case 'boost': saveData.boosts[r.k] = (saveData.boosts[r.k] || 0) + (r.n || 1); break;
    case 'cur': saveData.eventCur[r.k] = (saveData.eventCur[r.k] || 0) + r.n; break;
    case 'skin':
      if (saveData.ownedSkins.includes(r.id)) {
        const n = 500;
        saveData.coins += n;
        return { ico: '🪙', text: `Скин уже есть → +${n} монет`, short: '' + n };
      }
      saveData.ownedSkins.push(r.id);
      break;
    case 'day7': {
      const s = randomSkin(['rare', 'epic']);
      return grantReward(s ? { t: 'skin', id: s.id } : { t: 'chest', k: 'epic' });
    }
  }
  return rewardView(r);
}

// ---------- Окно с добычей (сундуки, награда дня, пропуск) ----------
const lootEl = $id('lootBox');
function showLoot(icon, title, views) {
  $id('lootIco').textContent = icon;
  $id('lootTitle').textContent = title;
  const list = $id('lootList');
  list.innerHTML = '';
  views.forEach((v, i) => {
    const row = document.createElement('div');
    row.className = 'loot-row';
    row.style.animationDelay = (0.25 + i * 0.12) + 's';
    if (v.skin && SKIN_MAP[v.skin]) {
      const cv = document.createElement('canvas');
      cv.width = 80; cv.height = 80; cv.className = 'loot-skin';
      const cc = cv.getContext('2d');
      cc.scale(80 / 44, 80 / 44);
      drawCharacter(cc, SKIN_MAP[v.skin], 22, 25, 1, { scale: 0.72, t: 0 });
      row.appendChild(cv);
    } else {
      const ic = document.createElement('span');
      ic.className = 'loot-ico-s'; ic.textContent = v.ico;
      row.appendChild(ic);
    }
    const tx = document.createElement('span');
    tx.textContent = v.text;
    row.appendChild(tx);
    list.appendChild(row);
  });
  lootEl.classList.remove('hidden');
  lootEl.classList.remove('pop'); void lootEl.offsetWidth; lootEl.classList.add('pop');
  playSound('powerup');
}
$id('lootOk').addEventListener('click', () => { lootEl.classList.add('hidden'); playSound('click'); refreshOpenMeta(); });

// ---------- Награда дня ----------
function dailyState() {
  const d = saveData.daily, tk = todayKey();
  const claimedToday = d.last === tk;
  const continues = d.last === yesterdayKey();
  const idx = claimedToday ? d.day : (continues ? d.day : 0);
  return { claimedToday, idx, lost: !claimedToday && !!d.last && !continues && (d.day > 0 || d.streak > 0) };
}
function dailyClaimable() { return !dailyState().claimedToday; }
function claimDaily() {
  const st = dailyState();
  if (st.claimedToday) return;
  const d = saveData.daily;
  const view = grantReward(DAILY[st.idx]);
  d.streak = d.last === yesterdayKey() ? d.streak + 1 : 1;
  d.day = (st.idx + 1) % 7;
  d.last = todayKey();
  saveData.stats.dailyClaims += 1;
  saveData.stats.maxStreak = Math.max(saveData.stats.maxStreak, d.streak);
  metaSave();
  showLoot('📅', `День ${st.idx + 1}: награда получена!`, [view]);
  checkAchievements(true);
  renderDaily();
}
function renderDaily() {
  const st = dailyState();
  const d = saveData.daily;
  const claimedCount = st.claimedToday ? (d.day === 0 ? 7 : d.day) : st.idx;
  const grid = $id('dailyGrid');
  grid.innerHTML = DAILY.map((r, i) => {
    const v = rewardView(r);
    const cls = i < claimedCount ? 'got' : (!st.claimedToday && i === st.idx ? 'today' : '');
    return `<div class="day-cell ${cls} ${i === 6 ? 'big' : ''}"><small>День ${i + 1}</small><span class="day-ico">${v.ico}</span><b>${i === 6 ? 'Скин / сундук' : v.short}</b>${i < claimedCount ? '<i class="day-ok">✓</i>' : ''}</div>`;
  }).join('');
  let sub = `Заходи каждый день: награды растут, а на 7-й день — редкий скин (или золотой сундук, если все редкие уже есть). Пропустишь день — серия начнётся заново.`;
  if (st.lost) sub = '😢 Серия прервалась — начинаем с первого дня. ' + sub;
  $id('dailySub').textContent = sub;
  const btn = $id('dailyClaimBtn');
  btn.disabled = st.claimedToday;
  btn.textContent = st.claimedToday ? `✓ Получено. Следующая через ${fmtLeft(msToNextDay())}` : `🎁 Забрать награду дня ${st.idx + 1}`;
  btn.classList.toggle('btn-done', st.claimedToday);
  $id('dailyStreak').textContent = `🔥 Серия: ${d.last === todayKey() || d.last === yesterdayKey() ? d.streak : 0} дн.`;
}
$id('dailyClaimBtn').addEventListener('click', claimDaily);

// ---------- Задания ----------
function makeQuest(type, scope, rng) {
  const Q = QUEST_TYPES[type];
  const rg = Q[scope];
  let target = rg[0] + Math.floor(rng() * (rg[1] - rg[0] + 1));
  target = Math.max(Q.step, Math.round(target / Q.step) * Q.step);
  const q = { type, scope, target, base: 0, best: 0, claimed: false, arena: 1 };
  if (Q.stat) q.base = saveData.stats[Q.stat] || 0;
  if (type === 'score') {
    const open = ARENAS.filter((a) => isArenaOpen(a));
    q.arena = open[Math.floor(rng() * open.length)].id;
  }
  return q;
}
function genQuests(scope, key) {
  const rng = seededRand(scope + ':' + key);
  const types = Object.keys(QUEST_TYPES);
  const out = [];
  while (out.length < 3) {
    const t = types[Math.floor(rng() * types.length)];
    if (!out.some((q) => q.type === t)) out.push(makeQuest(t, scope, rng));
  }
  return out;
}
function ensureQuests() {
  const Q = saveData.quests;
  const dk = todayKey(), wk = weekKeyNow();
  let changed = false;
  if (Q.dayKey !== dk || Q.daily.length !== 3) { Q.dayKey = dk; Q.daily = genQuests('d', dk); changed = true; }
  if (Q.weekKey !== wk || Q.weekly.length !== 3) { Q.weekKey = wk; Q.weekly = genQuests('w', wk); changed = true; }
  if (changed) writeSaveData();
}
function questProg(q) {
  const Q = QUEST_TYPES[q.type];
  const v = Q.stat ? (saveData.stats[Q.stat] || 0) - q.base : q.best;
  return clamp(v, 0, q.target);
}
function questDone(q) { return questProg(q) >= q.target; }
function questsReady() {
  let n = 0;
  for (const q of saveData.quests.daily.concat(saveData.quests.weekly)) if (!q.claimed && questDone(q)) n++;
  return n;
}
function claimQuest(q) {
  if (q.claimed || !questDone(q)) return;
  const R = QUEST_REWARD[q.scope];
  q.claimed = true;
  saveData.coins += R.coins;
  giveXP(R.xp);
  addSP(R.sp);
  saveData.stats.questsDone += 1;
  metaSave();
  playSound('coin');
  metaToast('✅', 'Задание выполнено!', `+${R.coins} 🪙 • +${fmtXP(R.xp)} XP • +${R.sp} 🎖`);
  checkAchievements(true);
  renderQuests();
  updateAllUI();
}
function questCard(q) {
  const Q = QUEST_TYPES[q.type];
  const R = QUEST_REWARD[q.scope];
  const p = questProg(q), done = p >= q.target;
  const pct = (p / q.target) * 100;
  const btn = q.claimed ? '<button class="action-btn equipped" disabled>✓</button>'
    : done ? '<button class="action-btn select js-claim">Забрать</button>'
      : `<span class="q-val">${formatNum(p)}/${formatNum(q.target)}</span>`;
  return `<div class="list-card quest ${q.claimed ? 'claimed' : done ? 'ready' : ''}">
    <div class="q-ico">${Q.icon}</div>
    <div class="q-body"><div class="card-title">${Q.text(q.target, q)}</div>
      <div class="q-bar"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="card-desc">🪙 ${R.coins} • ⭐ ${fmtXP(R.xp)} XP • 🎖 ${R.sp} очков сезона</div></div>
    ${btn}</div>`;
}
function renderQuests() {
  ensureQuests();
  const el = $id('questsList');
  const Q = saveData.quests;
  el.innerHTML = `<div class="sec-title">☀️ Задания дня <small>обновятся через ${fmtLeft(msToNextDay())}</small></div>`
    + Q.daily.map(questCard).join('')
    + `<div class="sec-title">📆 Задания недели <small>обновятся через ${fmtLeft(msToNextWeek())}</small></div>`
    + Q.weekly.map(questCard).join('');
  const all = Q.daily.concat(Q.weekly);
  el.querySelectorAll('.list-card.quest').forEach((card, i) => {
    const b = card.querySelector('.js-claim');
    if (b) b.addEventListener('click', () => claimQuest(all[i]));
  });
}

// ---------- Достижения ----------
function checkAchievements(notify) {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (saveData.ach[a.id]) continue;
    let v = 0;
    try { v = a.v(); } catch (e) {}
    if (v >= a.goal) {
      saveData.ach[a.id] = Date.now();
      saveData.coins += a.coins;
      got.push(a);
    }
  }
  if (got.length) {
    writeSaveData();
    if (notify) {
      if (got.length <= 2) got.forEach((a) => metaToast(a.icon, 'Достижение: ' + a.name, `+${formatNum(a.coins)} 🪙`));
      else metaToast('🏅', `Новых достижений: ${got.length}`, `+${formatNum(got.reduce((s, a) => s + a.coins, 0))} 🪙 — загляни в «Достижения»`);
    }
  }
  return got;
}
function renderAch() {
  const n = ACHIEVEMENTS.filter((a) => saveData.ach[a.id]).length;
  $id('achCount').textContent = `${n} / ${ACHIEVEMENTS.length}`;
  $id('achList').innerHTML = ACHIEVEMENTS.map((a) => {
    const on = !!saveData.ach[a.id];
    let cur = 0, goal = a.goal;
    try { if (a.prog) { const pr = a.prog(); cur = pr[0]; goal = pr[1]; } else cur = a.v(); } catch (e) {}
    cur = Math.min(cur, goal);
    const pct = on ? 100 : (cur / goal) * 100;
    return `<div class="ach ${on ? 'on' : ''}"><div class="ach-badge">${a.icon}</div>
      <b>${a.name}</b><small>${a.desc}</small>
      ${on ? `<span class="ach-done">✓ +${formatNum(a.coins)} 🪙</span>` : `<div class="q-bar"><i style="width:${pct.toFixed(1)}%"></i></div><span class="ach-val">${formatNum(cur)} / ${formatNum(goal)}</span>`}</div>`;
  }).join('');
}

// ---------- Сундуки ----------
function openChest(k) {
  const C = CHESTS[k];
  const views = [];
  views.push(grantReward({ t: 'coins', n: randInt(C.coins[0], C.coins[1]) }));
  const nb = randInt(C.boosts[0], C.boosts[1]);
  for (let i = 0; i < nb; i++) views.push(grantReward({ t: 'boost', k: BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)], n: 1 }));
  if (Math.random() < C.skinChance) {
    const s = randomSkin(C.skinR);
    if (s) views.push(grantReward({ t: 'skin', id: s.id }));
    else views.push(grantReward({ t: 'coins', n: Math.round(C.price * 0.4) }));
  }
  const ev = getEvent();
  if (ev) views.push(grantReward({ t: 'cur', k: ev.id, n: randInt(3, 8) * (k === 'epic' ? 3 : k === 'rare' ? 2 : 1) }));
  saveData.stats.chestsOpened += 1;
  metaSave();
  showLoot(C.icon, C.name, views);
  checkAchievements(true);
  updateAllUI();
}
function chestAction(k) {
  if ((saveData.chests[k] || 0) > 0) { saveData.chests[k] -= 1; openChest(k); return; }
  const C = CHESTS[k];
  if (saveData.coins < C.price) { playSound('break'); metaToast('🪙', 'Не хватает монет', `Нужно ${formatNum(C.price)} 🪙`); return; }
  saveData.coins -= C.price;
  openChest(k);
}
function renderChests() {
  $id('chestList').innerHTML = CHEST_KEYS.map((k) => {
    const C = CHESTS[k], n = saveData.chests[k] || 0;
    const btn = n > 0 ? `<button class="action-btn select" data-k="${k}">Открыть (${n})</button>`
      : `<button class="action-btn buy" data-k="${k}">${formatNum(C.price)} 🪙</button>`;
    return `<div class="list-card chest-card c-${k}"><div class="card-left"><div class="chest-ico">${C.icon}</div><div>
      <div class="card-title">${C.name}</div>
      <div class="card-desc">🪙 ${C.coins[0]}–${C.coins[1]} • бонусы: ${C.boosts[0]}–${C.boosts[1]} • шанс скина ${Math.round(C.skinChance * 100)}%</div></div></div>${btn}</div>`;
  }).join('');
  $id('chestList').querySelectorAll('button[data-k]').forEach((b) => b.addEventListener('click', () => { playSound('click'); chestAction(b.dataset.k); }));
  $id('boostInv').innerHTML = BOOST_KEYS.map((k) => {
    const B = BOOSTS[k], n = saveData.boosts[k] || 0;
    return `<div class="boost-inv ${n ? '' : 'none'}"><span>${B.icon}</span><b>×${n}</b><small>${B.name}</small></div>`;
  }).join('');
}

// ---------- Колесо фортуны ----------
const wheelCv = $id('wheelCanvas');
const wctx = wheelCv.getContext('2d');
const wheel = { angle: 0, spin: null, dirty: true, face: null };
function buildWheelFace() {
  const S = wheelCv.width, R = S / 2 - 8;
  const f = document.createElement('canvas');
  f.width = S; f.height = S;
  const c = f.getContext('2d');
  c.translate(S / 2, S / 2);
  const n = WHEEL.length, seg = (Math.PI * 2) / n;
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * seg;
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, a0, a0 + seg); c.closePath();
    c.fillStyle = WHEEL[i].col; c.fill();
    c.fillStyle = 'rgba(255,255,255,' + (i % 2 ? 0.08 : 0.16) + ')'; c.fill();
    c.strokeStyle = 'rgba(10,12,30,0.55)'; c.lineWidth = 3; c.stroke();
    c.save();
    c.rotate(a0 + seg / 2);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${Math.round(S * 0.075)}px system-ui, sans-serif`;
    c.fillText(WHEEL[i].icon, R * 0.7, 0);
    c.font = `900 ${Math.round(S * 0.045)}px system-ui, sans-serif`;
    c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 4;
    c.strokeText(WHEEL[i].label, R * 0.44, 0); c.fillText(WHEEL[i].label, R * 0.44, 0);
    c.restore();
  }
  c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.lineWidth = 10; c.strokeStyle = '#14172a'; c.stroke();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    ci(c, Math.cos(a) * R, Math.sin(a) * R, 4.5, i % 2 ? '#ffe082' : '#fff8e1', false);
  }
  wheel.face = f;
}
function drawWheel(t) {
  if (wheel.spin) {
    const s = wheel.spin;
    const p = Math.min(1, (t - s.t0) / s.dur);
    const e = 1 - Math.pow(1 - p, 4);
    wheel.angle = s.from + (s.to - s.from) * e;
    const tick = Math.floor((wheel.angle / ((Math.PI * 2) / WHEEL.length)));
    if (tick !== s.lastTick) { s.lastTick = tick; if (p < 0.97) playSound('click'); }
    if (p >= 1) { wheel.spin = null; finishSpin(s.idx); }
    wheel.dirty = true;
  }
  if (!wheel.dirty) return;
  wheel.dirty = false;
  if (!wheel.face) buildWheelFace();
  const S = wheelCv.width;
  wctx.setTransform(1, 0, 0, 1, 0, 0);
  wctx.clearRect(0, 0, S, S);
  wctx.translate(S / 2, S / 2);
  wctx.rotate(wheel.angle);
  wctx.drawImage(wheel.face, -S / 2, -S / 2);
  wctx.setTransform(1, 0, 0, 1, 0, 0);
  wctx.strokeStyle = '#14172a'; wctx.lineWidth = 4; wctx.lineJoin = 'round';
  ci(wctx, S / 2, S / 2, S * 0.09, '#fffdf6');
  wctx.font = `${Math.round(S * 0.07)}px system-ui`; wctx.textAlign = 'center'; wctx.textBaseline = 'middle';
  wctx.fillText('🎰', S / 2, S / 2 + 2);
  pg(wctx, [[S / 2 - 16, 2], [S / 2 + 16, 2], [S / 2, 40]], '#ff3d57');
}
function wheelFree() { return saveData.wheelDay !== todayKey(); }
function spinWheel() {
  if (wheel.spin) return;
  const free = wheelFree();
  if (!free) {
    if (saveData.coins < WHEEL_COST) { playSound('break'); metaToast('🪙', 'Не хватает монет', `Вращение стоит ${WHEEL_COST} 🪙`); return; }
    saveData.coins -= WHEEL_COST;
  } else saveData.wheelDay = todayKey();
  const total = WHEEL.reduce((s, w) => s + w.w, 0);
  let r = Math.random() * total, idx = 0;
  for (; idx < WHEEL.length - 1; idx++) { r -= WHEEL[idx].w; if (r < 0) break; }
  const seg = (Math.PI * 2) / WHEEL.length;
  const target = -(idx + 0.5) * seg + (Math.random() - 0.5) * seg * 0.6;
  const from = wheel.angle;
  const d = (((target - from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  wheel.spin = { t0: performance.now(), dur: 4200, from, to: from + Math.PI * 2 * 5 + d, idx, lastTick: 0 };
  saveData.stats.wheelSpins += 1;
  metaSave();
  renderWheelBtn();
  updateAllUI();
}
function finishSpin(idx) {
  const view = grantReward(WHEEL[idx].r);
  metaSave();
  showLoot('🎰', 'Колесо фортуны', [view]);
  checkAchievements(true);
  renderChests(); renderWheelBtn(); updateAllUI();
}
function renderWheelBtn() {
  const b = $id('wheelBtn');
  b.disabled = !!wheel.spin;
  b.textContent = wheel.spin ? 'Крутится…' : wheelFree() ? '🎁 Бесплатно' : `🎰 За ${WHEEL_COST} 🪙`;
  $id('wheelSub').textContent = wheelFree() ? 'Бесплатное вращение доступно!' : `Бесплатное вращение через ${fmtLeft(msToNextDay())}`;
}
$id('wheelBtn').addEventListener('click', spinWheel);

// ---------- Бонусы на старт (выбор в главном меню) ----------
function applyStartBoosts() {
  const used = [];
  for (const k of saveData.boostSel) {
    if ((saveData.boosts[k] || 0) > 0) { saveData.boosts[k] -= 1; used.push(k); }
  }
  saveData.boostSel = saveData.boostSel.filter((k) => (saveData.boosts[k] || 0) > 0);
  for (const k of used) {
    if (k === 'jet') { player.powerup = 'jetpack'; player.powerupTimer = 330; player.vy = JETPACK_SPEED; if (soundEnabled) startLoop('jetpack'); }
    else if (k === 'shield') player.revivesLeft += 1;
    else if (k === 'coin2') matchCoinMult = 2;
    else if (k === 'magnet') matchMagnet = 140;
    else if (k === 'xp2') matchXpMult = 2;
  }
  if (used.length) {
    showToastText('Бонусы: ' + used.map((k) => BOOSTS[k].icon + ' ' + BOOSTS[k].name).join(', '));
    writeSaveData();
  }
}
const boostRowEl = $id('boostRow');
let boostRowKey = '';
function renderBoostRow() {
  const owned = BOOST_KEYS.filter((k) => (saveData.boosts[k] || 0) > 0);
  const key = owned.map((k) => k + saveData.boosts[k] + (saveData.boostSel.includes(k) ? 1 : 0)).join('|');
  if (key === boostRowKey) return;
  boostRowKey = key;
  boostRowEl.classList.toggle('hidden', !owned.length);
  boostRowEl.innerHTML = '<span class="mm-boosts-t">На старт:</span>' + owned.map((k) =>
    `<button class="mm-boost ${saveData.boostSel.includes(k) ? 'on' : ''}" data-k="${k}" title="${BOOSTS[k].desc}">${BOOSTS[k].icon}<b>${saveData.boosts[k]}</b></button>`).join('');
}
boostRowEl.addEventListener('click', (e) => {
  const b = e.target.closest('.mm-boost');
  if (!b) return;
  const k = b.dataset.k;
  const i = saveData.boostSel.indexOf(k);
  if (i >= 0) saveData.boostSel.splice(i, 1); else saveData.boostSel.push(k);
  playSound('click');
  if (i < 0) metaToast(BOOSTS[k].icon, BOOSTS[k].name + ' — в следующий матч', BOOSTS[k].desc);
  writeSaveData();
  renderBoostRow();
});

// ---------- Прокачка ----------
function renderUpg() {
  $id('upgList').innerHTML = UPGRADES.map((u) => {
    const l = upgLevel(u.id);
    const max = l >= UPG_MAX;
    const cost = max ? 0 : UPG_COST[l];
    const pips = Array.from({ length: UPG_MAX }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('');
    const btn = max ? '<button class="action-btn equipped" disabled>МАКС</button>'
      : `<button class="action-btn ${saveData.coins >= cost ? 'buy' : 'locked-btn'}" data-u="${u.id}">${formatNum(cost)} 🪙</button>`;
    return `<div class="list-card upg"><div class="card-left"><div class="chest-ico">${u.icon}</div><div>
      <div class="card-title">${u.name} <span class="upg-lv">ур. ${l}/${UPG_MAX}</span></div>
      <div class="card-desc">${u.desc(l)}${max ? '' : ` → <b>${u.desc(l + 1)}</b>`}</div>
      <div class="pips">${pips}</div></div></div>${btn}</div>`;
  }).join('');
  $id('upgList').querySelectorAll('button[data-u]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.u, l = upgLevel(id);
    if (l >= UPG_MAX) return;
    if (saveData.coins < UPG_COST[l]) { playSound('break'); return; }
    saveData.coins -= UPG_COST[l];
    saveData.upg[id] = l + 1;
    metaSave();
    playSound('powerup');
    checkAchievements(true);
    renderUpg();
    updateAllUI();
  }));
}

// ---------- Боевой пропуск ----------
// Новый сезон начинается сам: когда месяц сменился, всё, что игрок заработал, но не успел забрать, выдаётся автоматически
function settleSeason(P) {
  const L = Math.min(PASS_LEVELS, Math.floor((P.sp || 0) / PASS_SP));
  let n = 0, skin = '';
  for (let l = 1; l <= L; l++) {
    if (!P.cf.includes(l)) { grantReward(passFree(l)); n++; }
    if (P.premium && !P.cp.includes(l)) { const r = passPrem(l, P.season); grantReward(r); n++; if (r.t === 'skin') skin = r.id; }
  }
  return { n, skin };
}
function ensureSeason() {
  const sk = seasonKeyNow();
  const P = saveData.pass;
  if (P.season === sk) return;
  let res = null;
  if (P.season) { try { res = settleSeason(P); } catch (e) {} }
  saveData.pass = { season: sk, sp: 0, premium: false, cf: [], cp: [] };
  writeSaveData();
  setTimeout(() => {
    if (res && res.n) metaToast('🎖', 'Сезон закончился: награды выданы', res.n + ' непринятых наград добавлено в инвентарь');
    metaToast('🆕', 'Начался новый сезон «' + seasonLabel(sk) + '»', 'Скин сезона: ' + ((SKIN_MAP[seasonSkinId(sk)] || {}).name || ''));
  }, 800);
}
function passLevel() { return Math.min(PASS_LEVELS, Math.floor(saveData.pass.sp / PASS_SP)); }
function addSP(n) {
  ensureSeason();
  const before = passLevel();
  saveData.pass.sp += Math.max(0, Math.floor(n));
  const after = passLevel();
  if (after > before) metaToast('🎖', `Уровень пропуска ${after}!`, 'Забери награды в «Пропуске»');
}
function passClaimable() {
  ensureSeason();
  const L = passLevel();
  let n = 0;
  for (let l = 1; l <= L; l++) {
    if (!saveData.pass.cf.includes(l)) n++;
    if (saveData.pass.premium && !saveData.pass.cp.includes(l)) n++;
  }
  return n;
}
function claimPass(l, prem, quiet) {
  const P = saveData.pass;
  if (l > passLevel()) return null;
  if (prem ? (!P.premium || P.cp.includes(l)) : P.cf.includes(l)) return null;
  (prem ? P.cp : P.cf).push(l);
  return grantReward(prem ? passPrem(l, P.season) : passFree(l));
}
function seasonName() { const [y, m] = saveData.pass.season.split('-'); return `${MONTHS_RU[Number(m) - 1] || ''} ${y}`; }
function passLabel(r) {
  switch (r.t) {
    case 'coins': return '+' + formatNum(r.n);
    case 'xp': return '+' + formatNum(r.n) + ' XP';
    case 'boost': return BOOSTS[r.k].name + (r.n > 1 ? ' · ' + r.n + ' шт.' : '');
    case 'chest': return CHESTS[r.k].short + ' сундук';
    case 'skin': return SKIN_MAP[r.id] ? SKIN_MAP[r.id].name : 'Скин';
  }
  return rewardView(r).short;
}
function drawPassSkin(cv, id) {
  const sk = SKIN_MAP[id];
  if (!sk || !cv) return;
  const c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cv.width, cv.height);
  c.scale(cv.width / 44, cv.height / 44);
  drawCharacter(c, sk, 22, 25, 1, { scale: 0.72, t: 0 });
}
function renderPass() {
  ensureSeason();
  const P = saveData.pass, L = passLevel();
  const into = P.sp - L * PASS_SP;
  const pct = L >= PASS_LEVELS ? 100 : (into / PASS_SP) * 100;
  const sId = seasonSkinId(P.season), sSkin = SKIN_MAP[sId];
  const owned = saveData.ownedSkins.includes(sId);
  const nextKey = seasonKeyAt(1), nextSkin = SKIN_MAP[seasonSkinId(nextKey)];
  $id('passHead').innerHTML = `
    <div class="ps-top">
      <div class="ps-lvl"><small>уровень</small><b>${L}</b><small>из ${PASS_LEVELS}</small></div>
      <div class="ps-info">
        <div class="ps-season">Сезон «${seasonName()}»</div>
        <div class="ps-left">🕐 закончится через ${fmtLeft(msToSeasonEnd())}</div>
        <div class="ps-bar"><i style="width:${pct.toFixed(1)}%"></i></div>
        <div class="ps-bar-t">${L >= PASS_LEVELS ? 'Сезон пройден полностью!' : `<b>${into}</b> / ${PASS_SP} очков до ${L + 1} уровня`}</div>
      </div>
    </div>
    <div class="ps-prem ${P.premium ? 'on' : ''}">
      <canvas class="ps-prem-skin" width="132" height="132"></canvas>
      <div class="ps-prem-txt">
        <b>${P.premium ? 'Премиум активен' : 'Премиум-пропуск'}</b>
        <small>${P.premium ? 'Забирай награды обеих линий.' : 'Вторая линия наград: больше монет, золотые сундуки и'} скин «${sSkin ? sSkin.name : ''}» на 30 уровне и легенду «Повелитель Эпох» на 50-м${owned ? ' (сезонный скин уже твой)' : ''}.</small>
        ${P.premium ? '' : `<button id="passBuyBtn" class="btn btn-gold btn-sm">Открыть за ${formatNum(PASS_PREMIUM_PRICE)} 🪙</button>`}
      </div>
    </div>
    <div class="ps-how">Очки сезона дают матчи (высота и монстры) и задания. Сезон длится месяц и сменяется сам. Дальше: «${seasonLabel(nextKey)}» — скин «${nextSkin ? nextSkin.name : ''}».</div>`;
  drawPassSkin($id('passHead').querySelector('.ps-prem-skin'), sId);
  const bb = $id('passBuyBtn');
  if (bb) bb.addEventListener('click', () => {
    if (saveData.coins < PASS_PREMIUM_PRICE) { playSound('break'); metaToast('🪙', 'Не хватает монет', `Премиум стоит ${formatNum(PASS_PREMIUM_PRICE)} 🪙`); return; }
    saveData.coins -= PASS_PREMIUM_PRICE;
    P.premium = true;
    metaSave(); playSound('arena_up');
    metaToast('💎', 'Премиум открыт!', 'Забирай награды правой колонки');
    renderPass(); updateAllUI();
  });
  const cell = (l, prem) => {
    const r = prem ? passPrem(l, P.season) : passFree(l);
    const v = rewardView(r);
    const got = (prem ? P.cp : P.cf).includes(l);
    const locked = prem && !P.premium;
    const ready = !got && !locked && l <= L;
    const big = r.t === 'chest' || r.t === 'skin';
    const st = got ? 'got' : ready ? 'ready' : locked ? 'plock' : 'lock';
    const ico = r.t === 'skin' ? `<canvas class="ps-mini" data-skin="${r.id}" width="80" height="80"></canvas>` : `<span class="ps-ico">${v.ico}</span>`;
    const mark = got ? '<span class="ps-mark ok">✓</span>' : ready ? '<span class="ps-mark take">Забрать</span>' : locked ? '<span class="ps-mark">🔒</span>' : '';
    return `<button class="ps-cell ${prem ? 'prem' : 'free'} ${st} ${big ? 'big' : ''} ${r.t === 'chest' ? 'ch-' + r.k : ''}" data-l="${l}" data-p="${prem ? 1 : 0}" ${ready ? '' : 'disabled'}>
      ${ico}<span class="ps-t">${passLabel(r)}</span>${mark}</button>`;
  };
  let html = '<div class="ps-row ps-hdr"><span>Бесплатно</span><span></span><span>Премиум</span></div>';
  for (let l = 1; l <= PASS_LEVELS; l++) {
    const cls = (l <= L ? 'reached ' : '') + (l === L + 1 ? 'next ' : '') + (l % 5 === 0 ? 'mile' : '');
    html += `<div class="ps-row ${cls}" data-l="${l}">${cell(l, false)}<div class="ps-node"><span data-l="${l}">${l}</span></div>${cell(l, true)}</div>`;
  }
  const list = $id('passList');
  const keep = list.scrollTop;
  list.innerHTML = html;
  list.scrollTop = keep;
  list.querySelectorAll('canvas.ps-mini').forEach((cv) => drawPassSkin(cv, cv.dataset.skin));
  list.querySelectorAll('.ps-cell.ready').forEach((b) => b.addEventListener('click', () => {
    const v = claimPass(Number(b.dataset.l), b.dataset.p === '1');
    if (!v) return;
    metaSave();
    showLoot('🎖', `Пропуск: уровень ${b.dataset.l}`, [v]);
    checkAchievements(true);
    renderPass(); updateAllUI();
  }));
  const n = passClaimable();
  const ca = $id('passClaimAll');
  ca.disabled = n === 0;
  ca.textContent = n ? `Забрать всё доступное (${n})` : 'Пока нечего забирать';
}
function passScrollToCurrent() {
  const list = $id('passList');
  const row = list.querySelector('.ps-row.next') || list.querySelector('.ps-row.reached:last-of-type') || list.querySelector('.ps-row[data-l="' + PASS_LEVELS + '"]');
  const firstReady = list.querySelector('.ps-cell.ready');
  const target = firstReady ? firstReady.closest('.ps-row') : row;
  if (target) list.scrollTop = Math.max(0, target.offsetTop - list.offsetTop - list.clientHeight / 2 + target.offsetHeight / 2);
}
$id('passClaimAll').addEventListener('click', () => {
  const views = [];
  for (let l = 1; l <= passLevel(); l++) {
    const a = claimPass(l, false); if (a) views.push(a);
    const b = claimPass(l, true); if (b) views.push(b);
  }
  if (!views.length) return;
  metaSave();
  showLoot('🎖', 'Награды пропуска', views);
  checkAchievements(true);
  renderPass(); updateAllUI();
});

// ---------- Событие ----------
function renderEvent() {
  const ev = refreshEvent();
  const body = $id('eventBody');
  if (!ev) { body.innerHTML = `<p class="modal-sub">Сейчас событий нет. В году их три: Пасха (следующая — с ${(() => { const n = new Date(); let r = easterRange(n.getFullYear()); if (r[1] < n) r = easterRange(n.getFullYear() + 1); return r[0].getDate() + ' ' + ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня'][r[0].getMonth()]; })()}), Хэллоуин (с 15 октября) и Новый год (с 15 декабря).</p>`; return; }
  const sk = SKIN_MAP[ev.skin];
  const owned = saveData.ownedSkins.includes(sk.id);
  const have = saveData.eventCur[ev.id] || 0;
  $id('eventTitle').textContent = `${ev.icon} ${ev.name}`;
  body.innerHTML = `<div class="ev-hero" style="--evc:${ev.color}"><canvas id="evSkinCv" width="200" height="200"></canvas>
    <div><div class="ev-cur">${ev.cur} ${formatNum(have)}</div><small>до конца события: ${fmtLeft(eventEndsMs(ev))}</small></div></div>
    <p class="modal-sub">${ev.desc}</p>
    <div class="list-card"><div class="card-left"><div><div class="card-title">${sk.name}<span class="rarity-tag rarity-event">Событие</span></div>
      <div class="card-desc">${sk.desc}</div>${sk.perkText ? `<div class="perk-line">${sk.perkText}</div>` : ''}</div></div>
      ${owned ? '<button class="action-btn equipped" disabled>Есть ✓</button>' : `<button id="evBuyBtn" class="action-btn ${have >= sk.priceCur ? 'buy' : 'locked-btn'}">${sk.priceCur} ${ev.cur}</button>`}</div>
    <p class="modal-sub">Как получить ${ev.cur}: собирай их на аренах (появляются вместо части монет) и открывай сундуки — пока идёт событие, в каждом сундуке есть немного ${ev.curName}.</p>`;
  const c = $id('evSkinCv').getContext('2d');
  c.scale(200 / 44, 200 / 44);
  drawCharacter(c, sk, 22, 25, 1, { scale: 0.72, t: 0 });
  const b = $id('evBuyBtn');
  if (b) b.addEventListener('click', () => buyEventSkin(sk));
}
function buyEventSkin(sk) {
  const ev = getEvent();
  if (!ev || ev.id !== sk.event || saveData.ownedSkins.includes(sk.id)) return false;
  if ((saveData.eventCur[ev.id] || 0) < sk.priceCur) { playSound('break'); metaToast(ev.cur, `Не хватает ${ev.curName}`, `Нужно ${sk.priceCur} ${ev.cur}`); return false; }
  saveData.eventCur[ev.id] -= sk.priceCur;
  saveData.ownedSkins.push(sk.id);
  saveData.selectedSkin = sk.id;
  metaSave(); playSound('coin');
  showLoot(ev.icon, 'Праздничный скин твой!', [{ ico: '🎭', text: sk.name, skin: sk.id }]);
  refreshOpenMeta(); updateAllUI();
  return true;
}

// ---------- Примерка скина в магазине ----------
const tryCv = $id('tryCanvas');
const tctx = tryCv.getContext('2d', { alpha: false });
const tryBg = document.createElement('canvas');
let tryBgKey = '';
let tryOnId = null;
function setTryOn(id) {
  tryOnId = id;
  const sk = SKIN_MAP[id];
  if (!sk) return;
  $id('tryLabel').innerHTML = `<b>${sk.name}</b><span class="rarity-tag rarity-${sk.rarity}">${sk.rarityName}</span>${sk.perkText ? `<span class="try-perk">${sk.perkText}</span>` : ''}`;
  document.querySelectorAll('#skinsList .list-card').forEach((el) => el.classList.toggle('trying', el.dataset.id === id));
}
function drawTryOn(t) {
  const sk = SKIN_MAP[tryOnId] || getSkin();
  const a = getCurrentArena();
  const cw = tryCv.width, ch = tryCv.height, TW = 362, TH = 120, sx = cw / TW, sy = ch / TH;
  const key = a.id + ':' + cw + ':' + EV_KEY;
  if (tryBgKey !== key) {
    tryBg.width = cw; tryBg.height = ch;
    const bc = tryBg.getContext('2d');
    bc.setTransform(sx, 0, 0, sy, 0, 0);
    drawArenaScene(bc, a, TW, TH, 0, 0);
    drawPlatformShape(bc, a, { x: 147, y: 104, w: 68, h: 15, type: 'normal' }, 0);
    bc.setTransform(1, 0, 0, 1, 0, 0);
    bc.drawImage(getVignette(cw, ch), 0, 0);
    tryBgKey = key;
  }
  tctx.setTransform(1, 0, 0, 1, 0, 0);
  tctx.drawImage(tryBg, 0, 0);
  tctx.setTransform(sx, 0, 0, sy, 0, 0);
  const hop = Math.sin(((t % 900) / 900) * Math.PI) * 44;
  const cyc = (t % 3200) / 3200;
  const shooting = cyc > 0.5 && cyc < 0.62;
  if (cyc > 0.5 && cyc < 0.9) drawBullet(tctx, { x: 181, y: 70 - (cyc - 0.5) * 260 }, sk, t);
  const facing = Math.floor(t / 1800) % 2 ? -1 : 1;
  drawCharacter(tctx, sk, 181, 82 - hop, facing, { t, scale: 1, shoot: shooting });
  tctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ---------- Игровые хуки: начало и конец матча ----------
function metaOnGameOver() {
  ensureQuests();
  for (const q of saveData.quests.daily.concat(saveData.quests.weekly)) {
    if (q.claimed) continue;
    if (q.type === 'score' && q.arena === saveData.selectedArena) q.best = Math.max(q.best, score);
    if (q.type === 'combo') q.best = Math.max(q.best, matchMaxCombo);
  }
  saveData.stats.maxCombo = Math.max(saveData.stats.maxCombo || 0, matchMaxCombo);
  const sp = Math.min(90, Math.floor(climb / 150) + matchKills * 2);
  addSP(sp);
  const ach = checkAchievements(true);
  return { sp, ach, ready: questsReady() };
}

// ---------- Обновление меню: подписи плиток, точки-уведомления, баннеры ----------
const coinPills = document.querySelectorAll('.js-coins');
function setDot(id, on) { const el = $id(id); if (el) el.classList.toggle('hidden', !on); }
function updateMetaUI() {
  if (!metaUIReady) return;
  const ev = refreshEvent();
  ensureQuests(); ensureSeason();
  const coins = formatNum(saveData.coins);
  coinPills.forEach((el) => { el.textContent = coins; });
  const qr = questsReady();
  const qDone = saveData.quests.daily.concat(saveData.quests.weekly).filter((q) => q.claimed || questDone(q)).length;
  $id('tileQuestsSub').textContent = `${qDone} из 6`;
  setDot('dotQuests', qr > 0);
  const an = ACHIEVEMENTS.filter((a) => saveData.ach[a.id]).length;
  $id('tileAchSub').textContent = `${an} из ${ACHIEVEMENTS.length}`;
  const chestsN = CHEST_KEYS.reduce((s, k) => s + (saveData.chests[k] || 0), 0);
  $id('tileChestSub').textContent = wheelFree() ? 'колесо: бесплатно' : chestsN ? `${chestsN} сундук.` : 'колесо, сундуки';
  setDot('dotChest', wheelFree() || chestsN > 0);
  const upTotal = UPGRADES.reduce((s, u) => s + upgLevel(u.id), 0);
  $id('tileUpgSub').textContent = `${upTotal} из ${UPGRADES.length * UPG_MAX}`;
  $id('tilePassSub').textContent = `ур. ${passLevel()}${saveData.pass.premium ? ' 💎' : ''}`;
  setDot('dotPass', passClaimable() > 0);
  // награда дня
  const ds = dailyState();
  $id('dailyBannerT').textContent = ds.claimedToday ? 'Награда получена' : 'Награда дня!';
  $id('dailyBannerS').textContent = ds.claimedToday ? `новая через ${fmtLeft(msToNextDay())}` : `день ${ds.idx + 1} • ${ds.idx === 6 ? 'скин' : '+' + DAILY[ds.idx].n + ' 🪙'}`;
  $id('dailyBanner').classList.toggle('ready', !ds.claimedToday);
  // событие
  const eb = $id('eventBanner');
  eb.classList.toggle('hidden', !ev);
  if (ev) {
    eb.style.setProperty('--evc', ev.color);
    $id('eventBannerIco').textContent = ev.icon;
    $id('eventBannerT').textContent = ev.name;
    $id('eventBannerS').textContent = `${ev.cur} ${formatNum(saveData.eventCur[ev.id] || 0)} • ещё ${fmtLeft(eventEndsMs(ev))}`;
  }
  renderBoostRow();
  try { updateFriendsTile(); } catch (e) {}
}
// Перерисовать открытое окно мета-игры (после получения награды и т. п.)
function refreshOpenMeta() {
  if (!metaEls.daily.classList.contains('hidden')) renderDaily();
  if (!metaEls.quests.classList.contains('hidden')) renderQuests();
  if (!metaEls.ach.classList.contains('hidden')) renderAch();
  if (!metaEls.chest.classList.contains('hidden')) { renderChests(); renderWheelBtn(); }
  if (!metaEls.upg.classList.contains('hidden')) renderUpg();
  if (!metaEls.pass.classList.contains('hidden')) renderPass();
  if (!metaEls.event.classList.contains('hidden')) renderEvent();
  if (!shopMenuEl.classList.contains('hidden')) renderShop();
  updateAllUI();
}

// ---------- Кнопки ----------
function bindOpen(btnId, el, render) {
  $id(btnId).addEventListener('click', () => { playSound('click'); openModal(el, render); });
}
bindOpen('openQuestsBtn', metaEls.quests, renderQuests);
bindOpen('openAchBtn', metaEls.ach, renderAch);
bindOpen('openChestBtn', metaEls.chest, () => { renderChests(); renderWheelBtn(); wheel.dirty = true; });
bindOpen('openUpgBtn', metaEls.upg, renderUpg);
bindOpen('openPassBtn', metaEls.pass, () => { renderPass(); requestAnimationFrame(passScrollToCurrent); });
bindOpen('dailyBanner', metaEls.daily, renderDaily);
bindOpen('eventBanner', metaEls.event, renderEvent);
document.querySelectorAll('.js-back').forEach((b) => b.addEventListener('click', () => { playSound('click'); showMainMenu(); }));

// ---------- Кадр мета-игры: витрины, колесо, музыка (вызывается из главного цикла, не во время матча) ----------
let musicKey = '';
function metaFrame(t) {
  if (gameState !== 'PLAYING') {
    if (!shopMenuEl.classList.contains('hidden')) drawTryOn(t);
    if (!metaEls.chest.classList.contains('hidden') || wheel.spin) drawWheel(t);
  }
  const st = saveData.settings;
  const inMenu = gameState === 'MENU' || gameState === 'GAMEOVER';
  let arenaId = gameState === 'MENU' && !mainMenuEl.classList.contains('hidden') ? previewIdx : saveData.selectedArena;
  if (window.musicArenaHook) { const o = window.musicArenaHook(); if (o) arenaId = o; }
  const key = gameState + ':' + arenaId + ':' + soundEnabled + ':' + st.music + ':' + st.musicVol;
  if (key !== musicKey) {
    musicKey = key;
    const base = soundEnabled && st.music ? (st.musicVol / 100) * 0.9 : 0;
    musicSet(arenaId, base * (gameState === 'PAUSED' ? 0.35 : inMenu ? 0.75 : 1));
  }
}
refreshEvent();
var metaUIReady = true;

// ==========================================================
// 14.9. ДРУЗЬЯ И РЕЙТИНГ (Supabase). Сначала офлайн:
// всё хранится на устройстве, а когда есть интернет — отправляется на сервер и подтягивается обратно.
// Действия без сети (добавить друга, подарок) ждут в очереди и уходят при первом подключении.
// ==========================================================
const SUPA_URL = 'https://nezaxmenlsxataastfam.supabase.co';
const SUPA_KEY = 'sb_publishable_ckgMpzOONSgAI-eO9sAtpQ_AJTp7E_H';
const NET_CACHE_KEY = 'doodle_jump_net_cache_v1';
var net = { busy: null, online: navigator.onLine !== false, lastError: '', tab: 'friends', board: 'all', boardBusy: false, cache: { friends: [], boards: {}, gifts: 0, at: 0 } };
try { const c = JSON.parse(localStorage.getItem(NET_CACHE_KEY) || 'null'); if (c && typeof c === 'object') Object.assign(net.cache, c); } catch (e) {}
function saveNetCache() { try { localStorage.setItem(NET_CACHE_KEY, JSON.stringify(net.cache)); } catch (e) {} }

async function rpc(fn, args) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const tm = setTimeout(() => { if (ctrl) ctrl.abort(); }, 9000);
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined,
      headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {})
    });
    const txt = await r.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch (e) {}
    if (!r.ok) {
      const err = new Error((data && data.message) || ('HTTP ' + r.status));
      err.code = data && data.code; err.server = true;
      throw err;
    }
    net.online = true;
    return data;
  } catch (e) {
    if (!e.server) net.online = false;
    throw e;
  } finally { clearTimeout(tm); }
}
function newSecret() {
  const b = new Uint8Array(24);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  return Array.from(b, (x) => (x < 16 ? '0' : '') + x.toString(16)).join('');
}
function cleanName(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }
function agoText(ts) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (!Number.isFinite(m)) return '';
  if (m < 3) return 'только что';
  if (m < 60) return m + ' мин назад';
  if (m < 1440) return Math.floor(m / 60) + ' ч назад';
  return Math.floor(m / 1440) + ' дн назад';
}

async function ensureAccount() {
  const N = saveData.net;
  if (N.id && N.secret) return;
  if (!N.secret) N.secret = newSecret();
  const r = await rpc('dj_register', { p_secret: N.secret, p_name: N.name || null });
  N.id = r.id; N.code = r.code; N.name = r.name;
  writeSaveData();
}
async function flushOutbox() {
  const N = saveData.net;
  while (N.outbox.length) {
    const it = N.outbox[0];
    try {
      if (it.t === 'add') {
        const r = await rpc('dj_add_friend', { p_id: N.id, p_secret: N.secret, p_code: it.code });
        friendAddResult(r, it.code);
      } else if (it.t === 'gift') {
        await rpc('dj_send_gift', { p_id: N.id, p_secret: N.secret, p_to: it.to });
      }
    } catch (e) {
      if (!e.server) throw e; // нет сети — попробуем позже
    }
    N.outbox.shift();
    writeSaveData();
  }
}
// Главная синхронизация: регистрация, очередь, прогресс, список друзей
function netSync(withFriends) {
  if (net.busy) return net.busy;
  if (gameState === 'PLAYING') return Promise.resolve(false);
  net.busy = (async () => {
    const N = saveData.net;
    try {
      await ensureAccount();
      await flushOutbox();
      const wk = weekKeyNow();
      if (N.week !== wk) { N.week = wk; N.weekBest = 0; }
      let r;
      try {
        r = await rpc('dj_sync', {
          p_id: N.id, p_secret: N.secret, p_name: N.name || null, p_skin: saveData.selectedSkin,
          p_arena: saveData.highestUnlockedArena, p_xp: Math.floor(saveData.totalXP), p_scores: saveData.arenaBest,
          p_week: N.week, p_week_best: Math.floor(N.weekBest || 0)
        });
      } catch (e) {
        if (e.code === '28000') { N.id = ''; N.code = ''; await ensureAccount(); return netSync(withFriends); } // аккаунт пропал на сервере — заводим новый
        throw e;
      }
      if (r) { N.code = r.code || N.code; if (!N.name) N.name = r.name; net.cache.gifts = r.gifts || 0; }
      if (withFriends || (r && r.friends !== net.cache.friends.length)) {
        net.cache.friends = (await rpc('dj_friends', { p_id: N.id, p_secret: N.secret })) || [];
      }
      net.cache.at = Date.now();
      net.lastError = '';
      saveNetCache();
      writeSaveData();
      return true;
    } catch (e) {
      net.lastError = e.server ? (e.message || 'ошибка сервера') : 'offline';
      return false;
    } finally {
      net.busy = null;
      updateFriendsTile();
      if (!friendsMenuEl.classList.contains('hidden')) renderFriends();
    }
  })();
  return net.busy;
}
function netOnGameOver(sc) {
  const N = saveData.net, wk = weekKeyNow();
  if (N.week !== wk) { N.week = wk; N.weekBest = 0; }
  if (sc > N.weekBest) N.weekBest = Math.floor(sc);
  setTimeout(() => netSync(false), 400);
}

// ---------- Окно «Друзья» ----------
const friendsMenuEl = $id('friendsMenu');
let frRemoveArm = '';
function friendAddResult(r, code) {
  if (!r) return;
  if (r.ok) { playSound('coin'); metaToast('👥', 'Новый друг: ' + r.name, 'Теперь вы видите рекорды друг друга'); }
  else {
    const msg = { not_found: 'Код ' + code + ' не найден', self: 'Это твой собственный код', already: (r.name || 'Он') + ' уже в друзьях', limit: 'Максимум 100 друзей' }[r.error] || 'Не получилось';
    playSound('break'); metaToast('⚠', msg, '');
  }
}
async function addFriendByCode(raw) {
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) { playSound('break'); metaToast('⚠', 'Код друга — 6 символов', 'Например: K7F3QD'); return; }
  if (code === saveData.net.code) { playSound('break'); metaToast('⚠', 'Это твой собственный код', ''); return; }
  const N = saveData.net;
  if (!N.id || !navigator.onLine) {
    N.outbox.push({ t: 'add', code }); writeSaveData();
    metaToast('🕐', 'Добавим, когда появится интернет', 'Код ' + code + ' сохранён');
    netSync(true); renderFriends(); return;
  }
  try {
    const r = await rpc('dj_add_friend', { p_id: N.id, p_secret: N.secret, p_code: code });
    friendAddResult(r, code);
    if (r && r.ok) await netSync(true);
  } catch (e) {
    if (!e.server) { N.outbox.push({ t: 'add', code }); writeSaveData(); metaToast('🕐', 'Нет интернета', 'Добавим друга, когда сеть появится'); }
    else metaToast('⚠', 'Ошибка сервера', e.message);
  }
  renderFriends();
}
async function sendGift(f) {
  const N = saveData.net;
  f.gifted = true; saveNetCache(); renderFriends();
  playSound('coin');
  try {
    const r = await rpc('dj_send_gift', { p_id: N.id, p_secret: N.secret, p_to: f.id });
    metaToast('🎁', 'Подарок отправлен: ' + f.name, r && r.ok ? '+50 монет другу' : 'Сегодня ты уже дарил(а)');
  } catch (e) {
    if (!e.server) { N.outbox.push({ t: 'gift', to: f.id }); writeSaveData(); metaToast('🎁', 'Подарок в очереди', 'Отправим, когда появится интернет'); }
  }
}
async function claimFriendGifts() {
  const N = saveData.net;
  try {
    const r = await rpc('dj_claim_gifts', { p_id: N.id, p_secret: N.secret });
    net.cache.gifts = 0; saveNetCache();
    if (r && r.total > 0) {
      saveData.coins += r.total;
      metaSave();
      showLoot('🎁', 'Подарки от друзей', [{ ico: '🪙', text: `+${formatNum(r.total)} монет` }, { ico: '👥', text: 'От: ' + r.from.join(', ') }]);
    }
  } catch (e) { metaToast('⚠', 'Нет интернета', 'Заберёшь подарки, когда сеть появится'); }
  renderFriends(); updateFriendsTile(); updateAllUI();
}
// Вызов: сыграть на арене друга и побить его рекорд
var challenge = null;
function startChallenge(f) {
  const scores = f.scores || {};
  let arena = saveData.selectedArena;
  if (!scores[arena]) {
    const open = Object.keys(scores).map(Number).filter((id) => ARENAS[id - 1] && isArenaOpen(ARENAS[id - 1]));
    if (!open.length) { playSound('break'); metaToast('🔒', 'Нет общей арены', `${f.name} играет на аренах, которые у тебя ещё закрыты`); return; }
    arena = open.sort((a, b) => scores[b] - scores[a])[0];
  }
  saveData.selectedArena = arena;
  challenge = { name: f.name, target: scores[arena], arena };
  startGame();
  showToastText(`🎯 Вызов: набери больше ${formatNum(challenge.target)} — рекорд ${f.name}`);
}
function challengeResultText(sc) {
  if (!challenge || challenge.arena !== saveData.selectedArena) return '';
  if (sc > challenge.target) { const t = `🏆 Ты побил(а) рекорд ${challenge.name}!`; showToastText(t); playSound('arena_up'); return t; }
  return `🎯 До рекорда ${challenge.name}: ещё ${formatNum(challenge.target - sc + 1)}`;
}

function avatarCanvasHTML(skin, size) { return `<canvas class="fr-ava" data-skin="${skin || 'classic'}" width="${size * 2}" height="${size * 2}"></canvas>`; }
function paintAvatars(root) {
  root.querySelectorAll('canvas.fr-ava').forEach((cv) => {
    const sk = SKIN_MAP[cv.dataset.skin] || SKINS[0];
    const c = cv.getContext('2d');
    c.scale(cv.width / 44, cv.height / 44);
    drawCharacter(c, sk, 22, 25, 1, { scale: 0.72, t: 0 });
  });
}
function escHTML(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

function renderFriendsProfile() {
  const N = saveData.net;
  const st = net.busy ? 'обновляем…' : (net.lastError === 'offline' || !navigator.onLine)
    ? (net.cache.at ? 'нет интернета · данные от ' + agoText(net.cache.at) : 'нет интернета')
    : net.lastError ? 'сервер недоступен' : (net.cache.at ? 'онлайн · обновлено ' + agoText(net.cache.at) : 'онлайн');
  const dot = (net.lastError || !navigator.onLine) ? 'off' : 'on';
  $id('frProfile').innerHTML = `
    ${avatarCanvasHTML(saveData.selectedSkin, 52)}
    <div class="fr-me">
      <div class="fr-name-row"><b id="frName">${escHTML(N.name || 'Без имени')}</b><button id="frEditName" class="fr-mini" title="Изменить имя">✏</button></div>
      <div class="fr-code-row">${N.code ? `Твой код: <b class="fr-code">${N.code}</b> <button id="frCopyCode" class="fr-mini" title="Скопировать">📤</button>` : 'Код появится, когда игра подключится к интернету'}</div>
      <div class="fr-status ${dot}"><i></i>${st}</div>
    </div>`;
  paintAvatars($id('frProfile'));
  $id('frEditName').addEventListener('click', () => {
    const row = $id('frProfile').querySelector('.fr-name-row');
    row.innerHTML = `<input id="frNameInput" class="fr-input" maxlength="16" value="${escHTML(N.name || '')}" placeholder="Твоё имя"><button id="frNameOk" class="fr-mini ok">✓</button>`;
    const inp = $id('frNameInput');
    inp.focus(); inp.select();
    const done = () => {
      const v = cleanName(inp.value);
      if (v.length >= 2 && v !== N.name) { N.name = v; writeSaveData(); netSync(false); metaToast('✏', 'Имя сохранено', v); }
      renderFriends();
    };
    $id('frNameOk').addEventListener('click', done);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); if (e.key === 'Escape') renderFriends(); });
  });
  const cp = $id('frCopyCode');
  if (cp) cp.addEventListener('click', async () => {
    const text = `Добавь меня в друзья в Doodle Jump: мой код ${N.code}`;
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) {}
    if (!ok && navigator.share) { try { await navigator.share({ text }); ok = true; } catch (e) {} }
    playSound('click');
    metaToast('📤', ok ? 'Код скопирован' : 'Твой код: ' + N.code, ok ? 'Отправь его другу' : 'Перепиши и отправь другу');
  });
}

function renderFriendsList(body) {
  const N = saveData.net;
  const fr = net.cache.friends || [];
  let html = '';
  if (net.cache.gifts > 0) html += `<div class="fr-gifts"><span>🎁</span><div><b>Подарки от друзей: ${net.cache.gifts}</b><small>по 50 монет за каждый</small></div><button id="frClaim" class="action-btn select">Забрать</button></div>`;
  html += `<div class="fr-add"><input id="frAddInput" class="fr-input" maxlength="9" placeholder="Код друга, например K7F3QD" autocomplete="off" autocapitalize="characters" spellcheck="false"><button id="frAddBtn" class="action-btn buy">Добавить</button></div>`;
  const queued = N.outbox.filter((x) => x.t === 'add').map((x) => x.code);
  if (queued.length) html += `<div class="fr-note">🕐 Ждут интернета: ${queued.join(', ')}</div>`;
  if (!fr.length) {
    html += `<div class="fr-empty"><b>Пока никого</b><span>Отправь другу свой код, а его код введи выше. Друзья увидят рекорды друг друга и смогут дарить монеты.</span></div>`;
  } else {
    html += fr.map((f) => {
      const a = ARENAS[(f.arena || 1) - 1] || ARENAS[0];
      const rm = frRemoveArm === f.id;
      return `<div class="list-card fr-card" data-id="${f.id}">
        ${avatarCanvasHTML(f.skin, 44)}
        <div class="fr-info"><div class="fr-nm"><b>${escHTML(f.name)}</b>${typeof f.cups === 'number' ? `<canvas class="fr-badge" data-cups="${f.cups}" width="48" height="48"></canvas>` : ''}</div><small>рекорд ${formatNum(f.best || 0)} · арена ${a.id}</small><small>${f.last_seen ? 'был(а) ' + agoText(f.last_seen) : ''}</small></div>
        <div class="fr-acts">
          <button class="fr-act js-gift" ${f.gifted ? 'disabled' : ''} title="Подарить 50 монет">🎁</button>
          <button class="fr-act js-ch" title="Вызов: побить рекорд">🎯</button>
          <button class="fr-act js-rm ${rm ? 'arm' : ''}" title="Удалить из друзей">${rm ? 'Удалить?' : '❌'}</button>
        </div></div>`;
    }).join('');
  }
  body.innerHTML = html;
  paintAvatars(body);
  if (window.rankedPaintBadges) window.rankedPaintBadges(body);
  const cl = $id('frClaim'); if (cl) cl.addEventListener('click', claimFriendGifts);
  const inp = $id('frAddInput');
  $id('frAddBtn').addEventListener('click', () => addFriendByCode(inp.value));
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') addFriendByCode(inp.value); });
  body.querySelectorAll('.fr-card').forEach((card) => {
    const f = fr.find((x) => x.id === card.dataset.id);
    if (!f) return;
    card.addEventListener('click', (e) => { if (!e.target.closest('.fr-acts')) { playSound('click'); openFriendProfile(f); } });
    card.querySelector('.js-gift').addEventListener('click', () => sendGift(f));
    card.querySelector('.js-ch').addEventListener('click', () => { playSound('click'); startChallenge(f); });
    card.querySelector('.js-rm').addEventListener('click', async () => {
      if (frRemoveArm !== f.id) { frRemoveArm = f.id; renderFriends(); return; }
      frRemoveArm = '';
      try {
        await rpc('dj_remove_friend', { p_id: N.id, p_secret: N.secret, p_friend: f.id });
        net.cache.friends = net.cache.friends.filter((x) => x.id !== f.id); saveNetCache();
      } catch (e) { metaToast('⚠', 'Нет интернета', 'Удалить можно только онлайн'); }
      renderFriends(); updateFriendsTile();
    });
  });
}

const friendProfileEl = $id('friendProfileMenu');
function renderFriendProfile(f) {
  const body = $id('fpBody');
  const sc = f.scores || {};
  const a = ARENAS[(f.arena || 1) - 1] || ARENAS[0];
  const rows = Object.keys(sc).map(Number).filter((id) => ARENAS[id - 1] && sc[id] > 0).sort((x, y) => x - y);
  body.innerHTML = `
    <div class="fp-head">${avatarCanvasHTML(f.skin, 84)}<div><div class="fr-nm"><b>${escHTML(f.name)}</b>${typeof f.cups === 'number' ? `<canvas class="fr-badge" data-cups="${f.cups}" width="52" height="52"></canvas>` : ''}</div>
      <small>Код: ${escHTML(f.code || '—')}</small><small>${f.last_seen ? 'был(а) ' + agoText(f.last_seen) : ''}</small></div></div>
    <div class="fp-grid">
      <div class="fp-box"><small>🏆 Лучший рекорд</small><b>${formatNum(f.best || 0)}</b></div>
      <div class="fp-box"><small>🏟 Открыто арен</small><b>${a.id} из ${ARENAS.length}</b></div>
      <div class="fp-box"><small>⭐ Опыт</small><b>${fmtXP(Math.floor(f.xp || 0))} XP</b></div>
      <div class="fp-box"><small>🎭 Герой</small><b>${escHTML((SKIN_MAP[f.skin] || SKINS[0]).name)}</b></div>
    </div>
    <div class="sec-title">Рекорды по аренам</div>
    ${rows.length ? rows.map((id) => `<div class="list-card"><div class="card-title">${ARENAS[id - 1].icon} ${escHTML(ARENAS[id - 1].name)}</div><b>${formatNum(sc[id])}</b></div>`).join('') : '<div class="fr-empty"><span>Пока нет рекордов.</span></div>'}
    <div class="fp-acts">
      <button class="btn btn-gold btn-sm js-fp-gift" ${f.gifted ? 'disabled' : ''}>🎁 Подарить 50</button>
      <button class="btn btn-purple btn-sm js-fp-ch">🎯 Вызов</button>
    </div>`;
  paintAvatars(body);
  if (window.rankedPaintBadges) window.rankedPaintBadges(body);
  body.querySelector('.js-fp-gift').addEventListener('click', async () => { await sendGift(f); renderFriendProfile(f); });
  body.querySelector('.js-fp-ch').addEventListener('click', () => { playSound('click'); startChallenge(f); });
}
function openFriendProfile(f) {
  openModal(friendProfileEl, () => renderFriendProfile(f));
}
$id('fpBack').addEventListener('click', () => { playSound('click'); openModal(friendsMenuEl, renderFriends); });

function boardKey() { return net.board === 'arena' ? 'arena' + saveData.selectedArena : net.board === 'week' ? 'week' + weekKeyNow() : net.board; }
async function loadBoard() {
  if (net.board === 'friends' || net.boardBusy) return;
  net.boardBusy = true; renderFriends();
  const key = boardKey();
  try {
    const r = await rpc('dj_leaderboard', { p_kind: net.board, p_arena: saveData.selectedArena, p_week: weekKeyNow(), p_id: saveData.net.id || null });
    net.cache.boards[key] = Object.assign(r || {}, { at: Date.now() });
    saveNetCache();
  } catch (e) {}
  net.boardBusy = false;
  if (!friendsMenuEl.classList.contains('hidden')) renderFriends();
}
function renderBoard(body) {
  const tabs = [['all', 'Все'], ['week', 'Неделя'], ['arena', 'Арена ' + saveData.selectedArena], ['friends', 'Друзья']];
  let html = `<div class="seg fr-boards">${tabs.map(([k, t]) => `<button class="seg-btn ${net.board === k ? 'active' : ''}" data-b="${k}">${t}</button>`).join('')}</div>`;
  let rows = [], me = null, total = 0, at = 0;
  if (net.board === 'friends') {
    const list = (net.cache.friends || []).map((f) => ({ name: f.name, skin: f.skin, best: f.best || 0 }));
    list.push({ name: saveData.net.name || 'Ты', skin: saveData.selectedSkin, best: saveData.bestScore || 0, me: true });
    list.sort((a, b) => b.best - a.best);
    let rk = 0, prev = -1;
    list.forEach((x, i) => { if (x.best !== prev) { rk = i + 1; prev = x.best; } x.rank = rk; });
    rows = list; total = list.length;
  } else {
    const b = net.cache.boards[boardKey()];
    if (b) { rows = b.top || []; me = b.me; total = b.total || 0; at = b.at; }
  }
  if (net.board === 'week') html += `<div class="fr-note">Лучший результат за эту неделю. Новая неделя — с понедельника.</div>`;
  if (net.board === 'arena') html += `<div class="fr-note">Рекорды на арене «${escHTML(ARENAS[saveData.selectedArena - 1].name)}». Другую арену выбери в меню.</div>`;
  if (!rows.length) {
    html += `<div class="fr-empty"><b>${net.boardBusy ? 'Загружаем…' : (navigator.onLine ? 'Пока пусто' : 'Нет интернета')}</b><span>${net.boardBusy ? '' : navigator.onLine ? 'Сыграй матч — и твой результат появится здесь.' : 'Рейтинг загрузится, когда появится сеть.'}</span></div>`;
  } else {
    html += '<div class="lb">' + rows.map((r) => `<div class="lb-row ${r.me ? 'me' : ''} ${r.rank <= 3 ? 'top' + r.rank : ''}">
      <span class="lb-rank">${r.rank}</span>${avatarCanvasHTML(r.skin, 30)}<span class="lb-name">${escHTML(r.name)}${r.me ? ' <i>ты</i>' : ''}</span><b class="lb-score">${formatNum(r.best)}</b></div>`).join('') + '</div>';
    if (me && !rows.some((r) => r.me)) html += `<div class="lb-row me lb-mine"><span class="lb-rank">${me.rank}</span>${avatarCanvasHTML(saveData.selectedSkin, 30)}<span class="lb-name">${escHTML(saveData.net.name || 'Ты')} <i>ты</i></span><b class="lb-score">${formatNum(me.best)}</b></div>`;
    if (net.board !== 'friends') html += `<div class="fr-note">Всего игроков: ${formatNum(total)}${at ? ' · обновлено ' + agoText(at) : ''}${net.boardBusy ? ' · обновляем…' : ''}</div>`;
  }
  body.innerHTML = html;
  paintAvatars(body);
  body.querySelectorAll('.fr-boards .seg-btn').forEach((b) => b.addEventListener('click', () => {
    net.board = b.dataset.b; playSound('click'); renderFriends(); loadBoard();
  }));
}
function renderFriends() {
  renderFriendsProfile();
  document.querySelectorAll('#frTabs .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.t === net.tab));
  const body = $id('frBody');
  if (net.tab === 'top') renderBoard(body); else renderFriendsList(body);
}
$id('frTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.seg-btn'); if (!b) return;
  net.tab = b.dataset.t; playSound('click'); renderFriends();
  if (net.tab === 'top') loadBoard();
});
$id('openFriendsBtn').addEventListener('click', () => {
  playSound('click');
  frRemoveArm = '';
  openModal(friendsMenuEl, renderFriends);
  netSync(true).then(() => { if (net.tab === 'top') loadBoard(); });
});
function updateFriendsTile() {
  const sub = $id('tileFriendsSub');
  if (!sub) return;
  const n = (net.cache.friends || []).length;
  sub.textContent = n ? n + ' в списке' : 'и рейтинг';
  setDot('dotFriends', net.cache.gifts > 0);
}
window.addEventListener('online', () => netSync(false));
setTimeout(() => { updateFriendsTile(); netSync(false); }, 2500);


// ==========================================================
// 15. ГЛАВНЫЙ ЦИКЛ
// ==========================================================
syncUnlockedArenas(false);
previewIdx = saveData.selectedArena;
menuAmbient = makeAmbient(MW, MH, 22);
applySettings();
fitCanvas();
initGameWorld();
updateAllUI();
let lastTime = performance.now();
let lastMenuDraw = 0;
let loopDt = 1, drawDt = 1; // шаг времени в «кадрах по 60 Гц»: при 120 Гц ≈ 0.5

// ---------- Частота экрана (60 / 90 / 120 / 144 Гц) ----------
// Меряем реальный интервал между кадрами браузера. Берём медиану (устойчиво к случайным рывкам)
// и запоминаем самый короткий результат — если игра просела, это не «понижает» экран в наших глазах.
const COMMON_HZ = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240];
let refreshMs = 1000 / 60, displayHz = 60, hzMeasured = false;
let rafPrev = 0;
const rafSamples = [];
function trackRefresh(now) {
  if (rafPrev) {
    const d = now - rafPrev;
    if (d > 3 && d < 40) {
      rafSamples.push(d);
      if (rafSamples.length >= 48) {
        rafSamples.sort((a, b) => a - b);
        const med = rafSamples[24];
        rafSamples.length = 0;
        let hz = 1000 / med;
        let best = COMMON_HZ[0];
        for (const c of COMMON_HZ) if (Math.abs(c - hz) < Math.abs(best - hz)) best = c;
        // в меню нагрузка маленькая — замер честный; во время матча частоту только повышаем
        if (!hzMeasured || best > displayHz || gameState !== 'PLAYING') { displayHz = best; refreshMs = 1000 / best; }
        hzMeasured = true;
      }
    }
  }
  rafPrev = now;
}

// ---------- Ограничение FPS и авто-режим ----------
// fpsCap: 0 = «Авто» (частота экрана), 120, 60, 30.
// В «Авто» игра сама переходит на ровные 60, если устройство не тянет 120 — ровные 60 выглядят плавнее, чем «рваные» 80–120.
let autoCap60 = false;
function effectiveCap() {
  const user = saveData.settings.fpsCap;
  const cap = user || (autoCap60 ? 60 : 0);
  if (!cap || cap >= displayHz - 4) return 0; // экран и так не быстрее лимита — ничего не пропускаем
  return cap;
}
function targetFrameMs() {
  const cap = effectiveCap();
  if (!cap) return refreshMs;
  return refreshMs * Math.max(1, Math.round((1000 / cap) / refreshMs));
}
let nextFrameAt = 0;

// ---------- Слежение за производительностью ----------
let perfFrames = 0, perfLate = 0, perfWarmup = 60, prevLoopState = '';
function perfCheck(rawMs, target) {
  if (perfWarmup > 0) { perfWarmup--; return; }
  perfFrames++;
  if (rawMs > target * 1.6) perfLate++;
  if (perfFrames < 120) return;
  const ratio = perfLate / perfFrames;
  perfFrames = 0; perfLate = 0;
  if (ratio < 0.18) return;
  if (!autoLow && saveData.settings.quality === 'auto') {
    autoLow = true; LOW_FX = true; // шаг 1: упрощаем эффекты
    perfWarmup = 30;
  } else if (!autoCap60 && saveData.settings.fpsCap === 0 && displayHz > 75) {
    autoCap60 = true;               // шаг 2: ровные 60 вместо дёрганых 120
    nextFrameAt = 0;
    perfWarmup = 30;
  }
}

let settingsInfoT = 0;
function gameLoop(currentTime) {
  // Следующий кадр заказываем сразу: даже если в кадре случится ошибка, игра не «застынет» навсегда
  requestAnimationFrame(gameLoop);
  trackRefresh(currentTime);

  // ограничение FPS: пропускаем лишние кадры экрана, держа ровный ритм
  const cap = effectiveCap();
  if (cap) {
    const interval = 1000 / cap;
    const tol = Math.min(3, refreshMs * 0.4);
    if (currentTime < nextFrameAt - tol) return;
    nextFrameAt = (currentTime - nextFrameAt > interval) ? currentTime + interval : nextFrameAt + interval;
  }

  try {
    let rawMs = currentTime - lastTime;
    lastTime = currentTime;
    // Убираем «дрожание» таймера: если кадр пришёл почти вовремя, считаем его ровно одним кадром экрана.
    // Так движение на 120 Гц идёт идеально ровно, без микрорывков от неточных отметок времени.
    const target = targetFrameMs();
    let frameMs = Math.abs(rawMs - target) < target * 0.25 ? target : rawMs;
    const dt = Math.min(Math.max(frameMs / 16.667, 0.05), 3);
    loopDt = dt;

    if (gameState === 'PLAYING') {
      if (prevLoopState !== 'PLAYING') { perfWarmup = 60; perfFrames = 0; perfLate = 0; }
      perfCheck(rawMs, target);
      drawDt = dt;
      // Физика шагами не больше одного «кадра 60 Гц»: после рывка игра догоняет время, а не «проскакивает» платформы
      let rem = dt;
      while (rem > 1e-4 && gameState === 'PLAYING') {
        const step = Math.min(rem, 1);
        update(step);
        rem -= step;
      }
      draw(currentTime);
    } else if (idleDirty || prevLoopState !== gameState) {
      // В меню и на паузе поле под окном неподвижно — перерисовываем его только когда что-то поменялось
      idleDirty = false;
      drawDt = 0;
      draw(currentTime);
    }
    prevLoopState = gameState;
    updateTouchUI();
    // Витрина арены: тяжёлые слои закэшированы, поэтому рисуем на каждом кадре (плавный прыжок)
    if (!mainMenuEl.classList.contains('hidden')) {
      loopDt = Math.min(Math.max((currentTime - lastMenuDraw) / 16.667, 0.05), 3); // шаг времени для частиц витрины
      lastMenuDraw = currentTime;
      drawMenuPreview(currentTime);
    }
    metaFrame(currentTime);
    if (!settingsMenuEl.classList.contains('hidden') && currentTime - settingsInfoT > 1000) {
      settingsInfoT = currentTime;
      updateFpsInfo();
    }
  } catch (err) {
    console.error('Ошибка в кадре:', err);
  }
}
requestAnimationFrame(gameLoop);

// ==========================================================
// 16. TELEGRAM MINI APP + устойчивость
// ==========================================================
if (tgApp) {
  try {
    tgApp.ready();
    tgApp.expand();
    if (tgApp.disableVerticalSwipes) tgApp.disableVerticalSwipes();
    // Полный экран — только на телефонах (на ПК окно мини-аппа остаётся обычным). Нужен Bot API 8.0+
    if (tgApp.requestFullscreen && (tgApp.platform === 'android' || tgApp.platform === 'ios') &&
        (!tgApp.isVersionAtLeast || tgApp.isVersionAtLeast('8.0'))) {
      try { tgApp.requestFullscreen(); } catch (e) { console.warn('Fullscreen:', e); }
    }
    if (tgApp.setHeaderColor) tgApp.setHeaderColor('#12151c');
    if (tgApp.setBackgroundColor) tgApp.setBackgroundColor('#12151c');
  } catch (e) { console.warn('Telegram init:', e); }
  document.documentElement.classList.add('in-telegram');
  loadFromCloud();
}

// Автопауза и сохранение при сворачивании / закрытии
function saveNow() { writeSaveData(); flushCloud(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); saveNow(); } });
window.addEventListener('pagehide', saveNow);
if (tgApp && tgApp.onEvent) {
  tgApp.onEvent('deactivated', () => { pauseGame(); saveNow(); });
  for (const ev of ['viewportChanged', 'fullscreenChanged', 'safeAreaChanged', 'contentSafeAreaChanged']) {
    tgApp.onEvent(ev, () => setTimeout(fitCanvas, 60));
  }
}
setTimeout(fitCanvas, 300);
setTimeout(fitCanvas, 900);

// Разблокируем звук при первом касании (требование мобильных браузеров)
window.addEventListener('pointerdown', () => ensureAudio(), { once: true });
window.addEventListener('keydown', () => ensureAudio(), { once: true });

// При запуске: достижения, накопленные раньше, и окно награды дня
setTimeout(() => {
  checkAchievements(true);
  updateAllUI();
  if (gameState === 'MENU' && !mainMenuEl.classList.contains('hidden') && dailyClaimable()) openModal(metaEls.daily, renderDaily);
}, 700);

// Просим браузер хранить прогресс постоянно (при запуске и при первом касании — Safari/Firefox ждут действия игрока)
requestPersist();
window.addEventListener('pointerdown', () => requestPersist(), { once: true });
