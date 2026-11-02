'use strict';
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
  }
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
    id: 2, name: 'Изумрудный лес', minXP: 50000, icon: '🌲', scene: 'forest',
    desc: 'Древняя чаща со светлячками и мшистыми плитами',
    twist: 'Порывы ветра сносят в сторону. Летучие мыши летают волнами, грибы-споровики.',
    bgTop: '#dcedc8', bgBottom: '#a5d6a7', gridColor: 'rgba(56,142,60,0.16)',
    marginColor: 'rgba(104,159,56,0.45)', margin: false,
    platNormal: '#2e7d32', platMoving: '#00acc1', platBreak: '#6d4c41', platVanish: '#e0f2f1', platBorder: '#1b3b1e', glow: false,
    ambient: { type: 'fireflies', color: '#f4ff81' }, monsters: ['bat', 'shroom'], monsterRate: 1.15, diff: 0.75, platSpeed: 1.8, wind: 0.9, slip: 0, hazard: null
  },
  {
    id: 3, name: 'Ледяной пик', minXP: 150000, icon: '❄️', scene: 'ice',
    desc: 'Заснеженная вершина с северным сиянием',
    twist: 'Скользкий лёд: герой скользит по инерции. Ледяные големы (2 попадания) и снежные духи.',
    bgTop: '#e1f5fe', bgBottom: '#b3e5fc', gridColor: 'rgba(2,136,209,0.18)',
    marginColor: 'rgba(3,169,244,0.4)', margin: false,
    platNormal: '#29b6f6', platMoving: '#5c6bc0', platBreak: '#78909c', platVanish: '#ffffff', platBorder: '#0d47a1', glow: false,
    ambient: { type: 'snow', color: '#ffffff' }, monsters: ['icegolem', 'snowspirit'], monsterRate: 1.2, diff: 0.85, platSpeed: 1.9, wind: 0.5, slip: 0.085, hazard: null
  },
  {
    id: 4, name: 'Пещера кристаллов', minXP: 300000, icon: '💎', scene: 'crystal',
    desc: 'Подземный грот с неоновыми самоцветами',
    twist: 'С потолка падают кристаллы: следи за красными метками. Кристальные жуки и пещерные летучки.',
    bgTop: '#1a1026', bgBottom: '#2d1946', gridColor: 'rgba(186,104,200,0.16)',
    marginColor: 'rgba(0,229,255,0.35)', margin: false,
    platNormal: '#ab47bc', platMoving: '#00e5ff', platBreak: '#8d6e63', platVanish: '#f3e5f5', platBorder: '#00e5ff', glow: true,
    ambient: { type: 'dust', color: '#e040fb' }, monsters: ['crystalbug', 'cavebat'], monsterRate: 1.2, diff: 0.95, platSpeed: 2.0, wind: 0, slip: 0, hazard: 'faller'
  },
  {
    id: 5, name: 'Цитадель Дайр', minXP: 500000, icon: '🌋', scene: 'volcano',
    desc: 'Вулканическая крепость Тьмы с пеплом и лавой',
    twist: 'Огненные бесы стреляют шарами вниз, горящие черепа. Платформы быстрее.',
    bgTop: '#2a0e0e', bgBottom: '#5a1a12', gridColor: 'rgba(255,87,34,0.16)',
    marginColor: 'rgba(255,61,0,0.45)', margin: false,
    platNormal: '#d84315', platMoving: '#ffb300', platBreak: '#4e342e', platVanish: '#ffccbc', platBorder: '#ff9100', glow: true,
    ambient: { type: 'embers', color: '#ff7a2a' }, monsters: ['imp', 'skull'], monsterRate: 1.25, diff: 1.05, platSpeed: 2.3, wind: 0, slip: 0, hazard: null
  },
  {
    id: 6, name: 'Неоновый Киберполис', minXP: 800000, icon: '🌆', scene: 'city',
    desc: 'Ночной мегаполис будущего с синтвейв-сеткой',
    twist: 'Дроны-стрелки сканируют экран и бьют лазером вниз. Платформы-глитчи едут очень быстро.',
    bgTop: '#090a1a', bgBottom: '#1c1136', gridColor: 'rgba(0,229,255,0.2)',
    marginColor: 'rgba(255,0,127,0.55)', margin: false,
    platNormal: '#00e676', platMoving: '#00e5ff', platBreak: '#ff1744', platVanish: '#ffffff', platBorder: '#ff007f', glow: true,
    ambient: { type: 'rain', color: '#7df9ff' }, monsters: ['drone', 'bot'], monsterRate: 1.3, diff: 1.15, platSpeed: 2.8, wind: 0, slip: 0, hazard: null
  },
  {
    id: 7, name: 'Божественный Олимп', minXP: 1200000, icon: '👑', scene: 'olympus',
    desc: 'Золотая арена среди звёзд и мраморных облаков',
    twist: 'Молнии Зевса бьют по золотым меткам, сильный ветер, гарпии и мраморные стражи.',
    bgTop: '#1c1635', bgBottom: '#3a2b63', gridColor: 'rgba(255,213,79,0.22)',
    marginColor: 'rgba(255,215,0,0.6)', margin: false,
    platNormal: '#ffd54f', platMoving: '#4dd0e1', platBreak: '#a1887f', platVanish: '#fff8e1', platBorder: '#ffffff', glow: true,
    ambient: { type: 'motes', color: '#ffe082' }, monsters: ['harpy', 'wraith'], monsterRate: 1.35, diff: 1.25, platSpeed: 2.4, wind: 1.1, slip: 0, hazard: 'lightning'
  },
  {
    id: 8, name: 'Подводное царство', minXP: 1800000, icon: '🌊', scene: 'ocean',
    desc: 'Коралловый риф с лучами света и пузырьками',
    twist: 'Течение сносит в стороны, всё немного скользит. Медузы, пираньи.',
    bgTop: '#b3ecff', bgBottom: '#0a5a8c', gridColor: 'rgba(255,255,255,0.14)',
    marginColor: 'rgba(255,255,255,0.3)', margin: false,
    platNormal: '#ff8a65', platMoving: '#26c6da', platBreak: '#8d6e63', platVanish: '#e1f5fe', platBorder: '#01405f', glow: false,
    ambient: { type: 'dust', color: '#e1f8ff' }, monsters: ['jelly', 'piranha'], monsterRate: 1.25, diff: 1.1, platSpeed: 2.1, wind: 0.7, slip: 0.05, hazard: null
  },
  {
    id: 9, name: 'Космическая станция', minXP: 2500000, icon: '🪐', scene: 'space',
    desc: 'Орбита далёкой планеты, кольца и туманности',
    twist: 'Слабая гравитация: скольжение как в невесомости. Метеориты падают по меткам, НЛО стреляют вниз.',
    bgTop: '#05040f', bgBottom: '#1a1245', gridColor: 'rgba(140,120,255,0.15)',
    marginColor: 'rgba(0,229,255,0.4)', margin: false,
    platNormal: '#7c4dff', platMoving: '#00e5ff', platBreak: '#90a4ae', platVanish: '#ffffff', platBorder: '#e0e0ff', glow: true,
    ambient: { type: 'motes', color: '#ffffff' }, monsters: ['ufo', 'meteor'], monsterRate: 1.35, diff: 1.3, platSpeed: 2.6, wind: 0, slip: 0.06, hazard: 'faller'
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
  meteor:     { w: 44, h: 44, hp: 2, move: 'patrol', speed: 1.0, range: 30 }
};

// ==========================================================
// 3. ГРАФИЧЕСКИЕ ПОМОЩНИКИ
// ==========================================================
const OUT = '#1a1a1a';

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
  } else if (st === 'bolt') {
    pg(c, [[3, -13], [-5, 1], [0, 1], [-3, 13], [6, -2], [1, -2]], col);
  } else {
    const g = c.createRadialGradient(0, 0, 1, 0, 0, 12);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, col); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 12, 0, 6.283); c.fill();
    ci(c, 0, 0, 6, col);
    ci(c, -2, -2, 1.8, 'rgba(255,255,255,0.85)', false);
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
  if (m.charge > 0) { c.shadowColor = m.fire || '#ff6a00'; c.shadowBlur = 8 + m.charge * 18; }
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

function drawArenaScene(c, a, w, h, scroll, t) {
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
      const sy = h * 0.42 + sink * 0.3;
      const sgr = c.createLinearGradient(0, sy - 60, 0, sy + 60);
      sgr.addColorStop(0, '#ffea00'); sgr.addColorStop(1, '#ff007f');
      c.fillStyle = sgr; c.beginPath(); c.arc(w / 2, sy, 58, 0, 6.283); c.fill();
      c.fillStyle = a.bgTop;
      for (let k = 0; k < 6; k++) c.fillRect(w / 2 - 60, sy + 8 + k * 9, 120, 2 + k * 0.9);
      layerBuildings(c, w, base - 6, 70, 110, '#191346', 7, true, t);
      layerBuildings(c, w, base + 14, 60, 120, '#0e0a26', 19, true, t);
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
  }
  c.restore();

  if (a.margin) {
    c.strokeStyle = a.marginColor; c.lineWidth = 2;
    c.beginPath(); c.moveTo(36, 0); c.lineTo(36, h); c.stroke();
  }
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
  if (a.glow) { c.shadowColor = a.platBorder; c.shadowBlur = 9; }
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
  c.restore();
}

// ==========================================================
// 9. СОХРАНЕНИЯ
// ==========================================================
const defaultSave = {
  bestScore: 0, coins: 300, totalXP: 0, selectedArena: 1, highestUnlockedArena: 1,
  ownedSkins: ['classic'], selectedSkin: 'classic', savedAt: 0,
  stats: { gamesPlayed: 0, totalScore: 0, totalJumps: 0, springJumps: 0, brokenPlatforms: 0, monstersKilled: 0, shotsFired: 0, totalCoinsCollected: 0, powerupsUsed: 0, timePlayedSec: 0 }
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
  if (!out.ownedSkins.includes(out.selectedSkin)) out.selectedSkin = 'classic';
  for (const k of ['bestScore', 'coins', 'totalXP', 'savedAt']) if (!Number.isFinite(out[k]) || out[k] < 0) out[k] = defaultSave[k];
  if (!ARENAS.some((a) => a.id === out.selectedArena)) out.selectedArena = 1;
  if (!Number.isFinite(out.highestUnlockedArena) || out.highestUnlockedArena < 1) out.highestUnlockedArena = 1;
  return out;
}

function loadSaveData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) saveData = normalizeSave(JSON.parse(raw));
  } catch (e) { console.warn('Ошибка чтения сохранения:', e); }
  saveData = normalizeSave(saveData);
}

// Запись: сразу в localStorage, в облако Telegram — не чаще раза в 2 сек (и принудительно при паузе/конце матча)
let cloudTimer = null;
let cloudDirty = false;
function flushCloud() {
  clearTimeout(cloudTimer); cloudTimer = null;
  if (!cloud || !cloudDirty) return;
  cloudDirty = false;
  try { cloud.setItem(CLOUD_KEY, JSON.stringify(saveData), () => {}); } catch (e) { console.warn('CloudStorage:', e); }
}
function writeSaveData() {
  saveData.savedAt = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); } catch (e) {}
  if (cloud) {
    cloudDirty = true;
    if (!cloudTimer) cloudTimer = setTimeout(flushCloud, 2000);
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
  if (maxId > saveData.highestUnlockedArena) {
    saveData.highestUnlockedArena = maxId;
    writeSaveData();
    if (showNotification) {
      showArenaToast(ARENAS[maxId - 1].name);
      playSound('arena_up');
    }
  }
}
function getCurrentArena() { return ARENAS.find((a) => a.id === saveData.selectedArena) || ARENAS[0]; }
function getSkin() { return SKINS.find((s) => s.id === saveData.selectedSkin) || SKINS[0]; }

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
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

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

const keys = { left: false, right: false };
const player = { x: W / 2 - 22, y: H - 140, w: 44, h: 44, vx: 0, vy: 0, facing: 1, shootTimer: 0, powerup: null, powerupTimer: 0 };

let platforms = [], bullets = [], monsters = [], coins = [], particles = [], hazards = [];
const gameAmbient = makeAmbient(W, H, 30);

// ----- сложность: плавный рост до 10 000, дальше усложнение с каждой тысячей -----
const HARD_START = 10000;
function hardLevel() { return Math.max(0, (score - HARD_START) / 10000); } // 0 до 10к, 1 на 20к, 2 на 30к...
function getDifficulty(a) {
  const base = Math.min(score / HARD_START, 1) * 0.5 * a.diff;
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
    else if (ir < 0.145 && score > 300) plat.item = 'propeller';
    else if (ir < 0.16 && score > 700) plat.item = 'jetpack';
    else if (ir < 0.36) coins.push({ x: cx, y: y - 18, r: 10, collected: false, angle: Math.random() * 6.28 });
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
  if (!safe && score > 250) {
    if (monsterCooldown > 0) {
      monsterCooldown--;
    } else if (Math.random() < 0.1 * a.monsterRate * (0.7 + d * 0.6)) {
      const kind = a.monsters[Math.floor(Math.random() * a.monsters.length)];
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
  hardWarned = false;
  touchPointers.clear(); keys.left = false; keys.right = false;
  score = 0; matchBonusXP = 0; cameraY = 0; frameCount = 0;
  platforms = []; bullets = []; monsters = []; coins = []; particles = []; hazards = [];
  hazardTimer = 260; windPhase = Math.random() * 6; monsterCooldown = 0; lastVanish = false;
  stopAllLoops();

  player.x = W / 2 - player.w / 2; player.y = H - 120;
  player.vx = 0; player.vy = JUMP_FORCE; player.facing = 1;
  player.shootTimer = 0; player.powerup = null; player.powerupTimer = 0;

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
function touchDirFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  return e.clientX - rect.left < rect.width / 2 ? -1 : 1;
}
canvas.addEventListener('pointerdown', (e) => {
  if (gameState !== 'PLAYING') return;
  if (e.pointerType === 'mouse') { shootBullet(); return; }
  e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  touchPointers.set(e.pointerId, touchDirFromEvent(e));
  applyTouchDir();
});
canvas.addEventListener('pointermove', (e) => {
  if (!touchPointers.has(e.pointerId)) return;
  touchPointers.set(e.pointerId, touchDirFromEvent(e));
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
function updateTouchUI() {
  shootBtnEl.classList.toggle('hidden', gameState !== 'PLAYING');
}

// ==========================================================
// 12. ОБНОВЛЕНИЕ
// ==========================================================
function addXP(n) {
  saveData.totalXP += n;
  matchBonusXP += n;
  syncUnlockedArenas(true);
}

function killMonster(i, reward) {
  const m = monsters[i];
  for (let k = 0; k < 8; k++) particles.push({ x: m.x + m.w / 2, y: m.y + m.h / 2, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 18, color: '#ffffff' });
  monsters.splice(i, 1);
  score += 100;
  saveData.stats.monstersKilled += 1;
  addXP(60);
  if (reward) { saveData.coins += 2; saveData.stats.totalCoinsCollected += 2; }
  writeSaveData();
  playSound('kill');
  updateHUD();
}

function updateHazards(dt, arena) {
  hazardTimer -= dt;
  if (arena.hazard === 'faller' && hazardTimer <= 0) {
    hazards.push({ kind: 'faller', x: clamp(player.x + player.w / 2 + (Math.random() - 0.5) * 220, 24, W - 24), y: -40, warn: 70, falling: false });
    hazardTimer = (190 + Math.random() * 120) / (1 + hardLevel() * 0.6);
    playSound('warn');
  }
  if (arena.hazard === 'lightning' && hazardTimer <= 0) {
    hazards.push({ kind: 'bolt', x: clamp(player.x + player.w / 2 + (Math.random() - 0.5) * 150, 30, W - 30), warn: 62, strike: 0, seed: Math.random() * 100 });
    hazardTimer = (250 + Math.random() * 150) / (1 + hardLevel() * 0.6);
    playSound('warn');
  }
  const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  const vulnerable = !player.powerup;
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

  if ((saveData.selectedSkin === 'sf' || saveData.selectedSkin === 'gold') && Math.random() < 0.35) {
    particles.push({ x: player.x + 8 + Math.random() * (player.w - 16), y: player.y + player.h - 6, vx: (Math.random() - 0.5) * 1.2, vy: -1 - Math.random() * 1.5, life: 16, color: saveData.selectedSkin === 'sf' ? '#ff1744' : '#ffd54f' });
  }

  if (player.powerup) {
    player.powerupTimer -= dt;
    player.vy = player.powerup === 'jetpack' ? JETPACK_SPEED : PROPELLER_SPEED;
    if (player.powerup === 'jetpack' && Math.random() < 0.7) {
      particles.push({ x: player.x + (player.facing === 1 ? 6 : player.w - 6), y: player.y + player.h - 4, vx: (Math.random() - 0.5) * 2, vy: 3 + Math.random() * 3, life: 18, color: Math.random() < 0.5 ? '#ff5722' : '#ffca28' });
    }
    if (player.powerupTimer <= 0) {
      stopLoop(player.powerup);
      player.powerup = null;
    }
  } else {
    player.vy += GRAVITY * dt;
  }

  const prevBottom = player.y + player.h;
  player.y += player.vy * dt;
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
        if (p.item === 'spring') {
          player.vy = SPRING_FORCE; p.springT = 20;
          saveData.stats.springJumps += 1; saveData.stats.totalJumps += 1;
          playSound('spring');
        } else if (p.item === 'propeller') {
          player.powerup = 'propeller'; player.powerupTimer = 175; p.item = null;
          saveData.stats.powerupsUsed += 1;
          playSound('powerup'); startLoop('propeller');
        } else if (p.item === 'jetpack') {
          player.powerup = 'jetpack'; player.powerupTimer = 240; p.item = null;
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
  for (const c of coins) {
    if (c.collected) continue;
    c.angle += 0.08 * dt;
    if (Math.hypot(player.x + player.w / 2 - c.x, player.y + player.h / 2 - c.y) < c.r + 22) {
      c.collected = true;
      saveData.coins += 1; saveData.stats.totalCoinsCollected += 1;
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
      } else if (!player.powerup) {
        triggerGameOver();
        return;
      }
    }
  }

  updateHazards(dt, arena);
  if (gameState !== 'PLAYING') return;

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
    if (pt.life <= 0) particles.splice(i, 1);
  }

  // камера
  const threshold = H * 0.44;
  if (player.y < threshold) {
    const diff = threshold - player.y;
    player.y = threshold;
    cameraY += diff;
    const newHeightScore = Math.floor(cameraY * 0.45);
    if (newHeightScore > score) {
      const delta = newHeightScore - score;
      score = newHeightScore;
      addXP(delta * 1.5);
      if (!hardWarned && score >= HARD_START) { hardWarned = true; showToastText('⚠ ВЫШЕ 10 000: СЛОЖНОСТЬ РАСТЁТ!'); playSound('warn'); }
    }
    updateHUD();

    for (const p of platforms) p.y += diff;
    for (const m of monsters) { m.y += diff; m.baseY += diff; }
    for (const c of coins) c.y += diff;
    for (const b of bullets) b.y += diff;
    for (const pt of particles) pt.y += diff;
    for (const hz of hazards) if (hz.kind === 'fireball') hz.y += diff;
    genY += diff;

    platforms = platforms.filter((p) => p.y < H + 60);
    monsters = monsters.filter((m) => m.baseY < H + 80);
    coins = coins.filter((c) => !c.collected && c.y < H + 60);

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
    drawPlatformShape(ctx, arena, p, t);
    if (p.broken) continue;
    const cx = p.x + p.w / 2;
    if (p.item === 'spring') drawSpringShape(ctx, cx, p.y, 11 + 10 * (p.springT / 20));
    else if (p.item === 'propeller') drawPropCap(ctx, cx, p.y - 2, t * 0.012);
    else if (p.item === 'jetpack') drawJetpackShape(ctx, cx, p.y - 16, false);
  }

  for (const c of coins) {
    if (c.collected) continue;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(Math.max(0.25, Math.abs(Math.cos(c.angle))), 1);
    ctx.fillStyle = '#ffca28'; ctx.strokeStyle = '#b28900'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-2, -6, 3, 8);
    ctx.restore();
  }

  for (const m of monsters) {
    if (m.flash > 0) { m.flash -= 1; ctx.globalAlpha = 0.55; }
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
        pg(ctx, [[0, 24], [-12, -10], [-5, -26], [5, -26], [12, -10]], '#26c6da');
        pg(ctx, [[0, 24], [12, -10], [5, -26], [0, -10]], 'rgba(255,255,255,0.35)', false);
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
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.shadowColor = '#ffe082'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(hz.x, 0);
        let yy = 0, xx = hz.x;
        while (yy < H) { yy += 34; xx = hz.x + Math.sin(yy * 0.3 + hz.seed) * 14; ctx.lineTo(xx, yy); }
        ctx.stroke(); ctx.shadowBlur = 0;
      }
    } else if (hz.kind === 'fireball') {
      ctx.save(); ctx.translate(hz.x, hz.y);
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, hz.r + 6);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, hz.color); g.addColorStop(1, 'rgba(255,120,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, hz.r + 6, 0, 6.283); ctx.fill();
      ctx.fillStyle = hz.color; pg(ctx, [[-4, -4], [4, -4], [0, -22]], hz.color, false);
      ctx.restore();
    }
  }
}

function draw(t) {
  const arena = getCurrentArena();
  drawArenaScene(ctx, arena, W, H, cameraY, t);
  stepAmbient(ctx, arena, gameAmbient, W, H, 1, windNow);
  drawEntities(t);
  drawHazards(t);
  drawCharacter(ctx, getSkin(), player.x + player.w / 2, player.y + player.h / 2, player.facing, {
    shoot: player.shootTimer > 0, powerup: player.powerup, t
  });
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
const menuCanvas = document.getElementById('menuCanvas');
const mctx = menuCanvas.getContext('2d');
const MW = 362, MH = 170;

function formatNum(n) { return Math.floor(n).toLocaleString('ru-RU'); }
function formatTime(sec) { return `${Math.floor(sec / 60)} мин ${Math.floor(sec % 60)} сек`; }

function updateHUD() {
  const arena = getCurrentArena();
  document.getElementById('scoreDisplay').textContent = formatNum(score);
  document.getElementById('hudCoins').textContent = formatNum(saveData.coins);
  document.getElementById('hudArenaName').textContent = `Арена ${arena.id}`;
}

function isArenaOpen(a) { return saveData.totalXP >= a.minXP; }
function stepPreview(dir) {
  const open = ARENAS.filter(isArenaOpen);
  if (open.length < 2) { playSound('break'); return; }
  let i = open.findIndex((a) => a.id === previewIdx);
  if (i < 0) i = 0;
  setPreview(open[(i + dir + open.length) % open.length].id);
}
function setPreview(idx) {
  previewIdx = ((idx - 1 + ARENAS.length) % ARENAS.length) + 1;
  menuAmbient = makeAmbient(MW, MH, 22);
  updateAllUI();
}

function updateAllUI() {
  updateHUD();
  const sel = getCurrentArena();
  const pv = ARENAS[previewIdx - 1];
  const unlocked = saveData.totalXP >= pv.minXP;
  const next = ARENAS.find((a) => a.id === saveData.highestUnlockedArena + 1);

  document.getElementById('menuBestScore').textContent = formatNum(saveData.bestScore);
  document.getElementById('menuCoins').textContent = formatNum(saveData.coins);
  document.getElementById('shopCoins').textContent = formatNum(saveData.coins);
  document.getElementById('arenasTotalXp').textContent = formatNum(saveData.totalXP);
  document.getElementById('openShopBtn').textContent = `👕 Скины (${SKINS.length})`;
  document.getElementById('openArenasBtn').textContent = `🏟 Арены (${ARENAS.length})`;

  document.getElementById('menuSkinName').textContent = getSkin().name;
  document.getElementById('menuPlayArena').textContent = `${sel.icon} ${sel.name}`;
  document.getElementById('menuArenaNum').textContent = `АРЕНА ${pv.id} ИЗ ${ARENAS.length}`;
  document.getElementById('menuArenaTitle').textContent = `${pv.icon} ${pv.name}`;
  document.getElementById('menuArenaTwist').textContent = pv.twist;

  const lockEl = document.getElementById('menuArenaLock');
  const selBtn = document.getElementById('arenaSelectBtn');
  if (!unlocked) {
    lockEl.classList.remove('hidden');
    lockEl.innerHTML = `🔒<br>Нужно ${formatNum(pv.minXP)} XP`;
    selBtn.textContent = '🔒 Закрыта';
    selBtn.className = 'btn btn-sm btn-locked';
  } else if (sel.id === pv.id) {
    lockEl.classList.add('hidden');
    selBtn.textContent = '✔ Активна';
    selBtn.className = 'btn btn-sm btn-active';
  } else {
    lockEl.classList.add('hidden');
    selBtn.textContent = 'Выбрать арену';
    selBtn.className = 'btn btn-sm btn-gold';
  }

  const dots = document.getElementById('arenaDots');
  dots.innerHTML = '';
  ARENAS.forEach((a) => {
    const d = document.createElement('span');
    d.className = 'dot' + (a.id === previewIdx ? ' active' : '') + (saveData.totalXP < a.minXP ? ' locked' : '');
    d.addEventListener('click', () => { playSound('click'); if (saveData.totalXP >= a.minXP) setPreview(a.id); else playSound('break'); });
    dots.appendChild(d);
  });

  if (next) {
    const ha = ARENAS[saveData.highestUnlockedArena - 1];
    const span = next.minXP - ha.minXP;
    const pct = Math.min(100, (Math.max(0, saveData.totalXP - ha.minXP) / span) * 100);
    document.getElementById('menuXpFill').style.width = `${pct}%`;
    document.getElementById('menuXpText').textContent = `${formatNum(saveData.totalXP)} / ${formatNum(next.minXP)} XP до Арены ${next.id}`;
  } else {
    document.getElementById('menuXpFill').style.width = '100%';
    document.getElementById('menuXpText').textContent = `${formatNum(saveData.totalXP)} XP • Все арены открыты!`;
  }
}

function drawMenuPreview(t) {
  const a = ARENAS[previewIdx - 1];
  const unlocked = saveData.totalXP >= a.minXP;
  mctx.setTransform(menuCanvas.width / MW, 0, 0, menuCanvas.height / MH, 0, 0);
  drawArenaScene(mctx, a, MW, MH, 0, t);
  stepAmbient(mctx, a, menuAmbient, MW, MH, 1, 0.3);

  const plats = [
    { x: 20, y: 140, w: 68, h: 15, type: 'normal' },
    { x: 148, y: 118, w: 68, h: 15, type: 'moving' },
    { x: 276, y: 140, w: 68, h: 15, type: 'normal' }
  ];
  for (const p of plats) drawPlatformShape(mctx, a, p, t);
  drawSpringShape(mctx, 54, 140, 13);

  // персонаж прыгает между платформами
  const hop = Math.sin(((t % 1200) / 1200) * Math.PI) * 52;
  const bx = 182 + Math.sin((t / 2400) * Math.PI * 2) * 110;
  const facing = Math.cos((t / 2400) * Math.PI * 2) > 0 ? 1 : -1;
  drawCharacter(mctx, getSkin(), bx, 110 - hop, facing, { t, scale: 0.9 });

  // демонстрационный монстр арены
  const mk = a.monsters[0];
  const T = MONSTER_TYPES[mk];
  const dm = { kind: mk, x: 290 - T.w / 2, y: 44 + Math.sin(t * 0.003) * 6, w: T.w, h: T.h, hp: T.hp, maxHp: T.hp, phase: t * 0.003, charge: 0 };
  drawMonster(mctx, dm, t);

  if (!unlocked) {
    mctx.fillStyle = 'rgba(8,10,20,0.62)';
    mctx.fillRect(0, 0, MW, MH);
  }
  mctx.setTransform(1, 0, 0, 1, 0, 0);
}

let skinFilter = 'all';
const RARITY_FILTERS = [
  ['all', 'Все'], ['common', 'Обычные'], ['rare', 'Редкие'], ['epic', 'Эпические'], ['mythic', 'Мифические'], ['arcana', 'Аркана']
];

function renderShop() {
  updateAllUI();
  const filtersEl = document.getElementById('skinFilters');
  filtersEl.innerHTML = '';
  RARITY_FILTERS.forEach(([key, label]) => {
    const b = document.createElement('button');
    b.className = 'filter-chip' + (skinFilter === key ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', () => { skinFilter = key; playSound('click'); renderShop(); });
    filtersEl.appendChild(b);
  });
  const listEl = document.getElementById('skinsList');
  listEl.innerHTML = '';
  SKINS.filter((s) => skinFilter === 'all' || s.rarity === skinFilter).forEach((skin) => {
    const isOwned = saveData.ownedSkins.includes(skin.id);
    const isEquipped = saveData.selectedSkin === skin.id;
    const item = document.createElement('div');
    item.className = 'list-card';
    let btnClass = 'buy', btnText = `${skin.price} 🪙`;
    if (isEquipped) { btnClass = 'equipped'; btnText = 'Выбран ✓'; }
    else if (isOwned) { btnClass = 'select'; btnText = 'Выбрать'; }
    item.innerHTML = `
      <div class="card-left">
        <canvas class="skin-thumb" width="104" height="104"></canvas>
        <div>
          <div class="card-title">${skin.name}<span class="rarity-tag rarity-${skin.rarity}">${skin.rarityName}</span></div>
          <div class="card-desc">${skin.desc}</div>
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
    item.querySelector('button').addEventListener('click', () => {
      if (isEquipped) return;
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
    let btnClass = 'locked-btn', btnText = `🔒 ${formatNum(arena.minXP)} XP`;
    if (isSelected) { btnClass = 'equipped'; btnText = 'Активна ✓'; }
    else if (unlocked) { btnClass = 'select'; btnText = 'Выбрать'; }
    card.innerHTML = `
      <div class="card-left">
        <canvas class="arena-thumb" width="128" height="96"></canvas>
        <div>
          <div class="card-title">Арена ${arena.id}: ${arena.name}</div>
          <div class="card-desc">${arena.twist}<br><strong>${formatNum(arena.minXP)} XP</strong></div>
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
    { label: '🏆 Лучший счёт', val: formatNum(saveData.bestScore) },
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
    { label: '⏱ Время в игре', val: formatTime(s.timePlayedSec) }
  ];
  document.getElementById('statsGrid').innerHTML = items
    .map((it) => `<div class="stat-box"><div class="stat-box-label">${it.label}</div><div class="stat-box-value">${it.val}</div></div>`)
    .join('');
}

function hideAllModals() {
  [mainMenuEl, shopMenuEl, arenasMenuEl, statsMenuEl, gameOverMenuEl, document.getElementById('pauseMenu')].forEach((el) => el.classList.add('hidden'));
}

function showMainMenu() {
  hideAllModals();
  previewIdx = saveData.selectedArena;
  menuAmbient = makeAmbient(MW, MH, 22);
  mainMenuEl.classList.remove('hidden');
  updateAllUI();
}

function startGame() {
  saveData.stats.gamesPlayed += 1;
  writeSaveData();
  initGameWorld();
  gameState = 'PLAYING';
  hideAllModals();
  hudEl.classList.remove('hidden');
  playSound('jump');
}

function triggerGameOver() {
  if (gameState === 'GAMEOVER') return;
  gameState = 'GAMEOVER';
  stopAllLoops();
  playSound('gameover');
  saveData.stats.totalScore += score;
  const isRecord = score > saveData.bestScore && score > 0;
  document.getElementById('newRecordBadge').classList.toggle('hidden', !isRecord);
  if (score > saveData.bestScore) saveData.bestScore = score;
  syncUnlockedArenas(true);
  writeSaveData();
  document.getElementById('finalScore').textContent = formatNum(score);
  document.getElementById('finalBest').textContent = formatNum(saveData.bestScore);
  document.getElementById('finalXpEarned').textContent = `+${formatNum(matchBonusXP)} XP`;
  document.getElementById('finalCoins').textContent = formatNum(saveData.coins);
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

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
document.getElementById('openShopBtn').addEventListener('click', () => { playSound('click'); openModal(shopMenuEl, renderShop); });
document.getElementById('gameOverShopBtn').addEventListener('click', () => openModal(shopMenuEl, renderShop));
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
// 15. ГЛАВНЫЙ ЦИКЛ
// ==========================================================
syncUnlockedArenas(false);
previewIdx = saveData.selectedArena;
menuAmbient = makeAmbient(MW, MH, 22);
initGameWorld();
updateAllUI();
let lastTime = performance.now();
let lastIdleDraw = 0;

function gameLoop(currentTime) {
  const rawDt = (currentTime - lastTime) / 16.667;
  lastTime = currentTime;
  const dt = Math.min(Math.max(rawDt, 0.1), 2.5);

  if (gameState === 'PLAYING') {
    update(dt);
    draw(currentTime);
  } else if (currentTime - lastIdleDraw > 90) { // на паузе/в меню рисуем реже — экономим батарею
    lastIdleDraw = currentTime;
    draw(currentTime);
  }
  updateTouchUI();
  if (!mainMenuEl.classList.contains('hidden')) drawMenuPreview(currentTime);

  requestAnimationFrame(gameLoop);
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
if (tgApp && tgApp.onEvent) tgApp.onEvent('deactivated', () => { pauseGame(); saveNow(); });

// Разблокируем звук при первом касании (требование мобильных браузеров)
window.addEventListener('pointerdown', () => ensureAudio(), { once: true });
