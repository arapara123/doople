'use strict';
// ==========================================================
// РЕЖИМ «ЛИГА» (рейтинг): отдельно от арен, прокачки, бонусов, XP и монет.
// Подключается после script.js и использует его глобальные функции.
// Одна общая «Королевская арена» для всех лиг, значки лиг нарисованы в коде.
// ==========================================================
(function () {
  const LEAGUES = [
    { name: 'Деревянный меч', thr: 0, bar: 2500 },
    { name: 'Стальные мечи', thr: 300, bar: 6500 },
    { name: 'Золотые мечи', thr: 700, bar: 12000 },
    { name: 'Мишень', thr: 1200, bar: 20000 },
    { name: 'Молот', thr: 1800, bar: 32000 },
    { name: 'Зелье', thr: 2500, bar: 50000 },
    { name: 'Синяя корона', thr: 3300, bar: 70000 },
    { name: 'Красная корона', thr: 4200, bar: 100000 },
    { name: 'Фиолетовый кристалл', thr: 5200, bar: 140000 }
  ];
  const MAX_CUPS = 7000, K = 25;
  // Калибровка: 5 матчей без кубков, потом звание по среднему результату
  const CALIB_N = 5;               // сколько матчей калибровки
  const RESET_V = 1; // увеличь число, чтобы снова сбросить звания у всех
  const CALIB_MAX = LEAGUES.length - 1; // калибровка может выдать любое звание, включая высшее
  const CALIB_DIFF = 2;            // жёсткость арены в калибровке (как в «Золотых мечах»)
  const CAL_BAR = ['#78828c', '#b8c0c8'];
  // Чем выше лига: тем МЕНЬШЕ кубков за победу и тем БОЛЬШЕ за поражение
  const WIN_CAPS = [40, 35, 31, 27, 23, 19, 16, 13, 10];
  const LOSS_CAPS = [8, 11, 14, 17, 21, 25, 30, 35, 40];
  const LEAGUE_REWARD = [null,
    [150, 'common'], [300, 'common'], [500, 'rare'], [800, 'rare'], [1200, 'epic'], [1800, 'epic'], [2500, 'epic'], [4000, 'epic']];

  const $ = (id) => document.getElementById(id);
  const wrapEl = document.querySelector('.game-wrapper');
  const fmt = (n) => formatNum(n);

  // ---------- состояние ----------
  function R() {
    let r = saveData.ranked;
    if (!r || typeof r !== 'object') r = saveData.ranked = {};
    const num = (v, d, a, b) => { v = Number(v); return Number.isFinite(v) ? Math.min(b, Math.max(a, Math.floor(v))) : d; };
    r.cups = num(r.cups, 0, 0, MAX_CUPS);
    r.promo = !!r.promo; r.lock = !!r.lock;
    r.fails = num(r.fails, 0, 0, 5); r.protect = num(r.protect, 0, 0, 5); r.streak = num(r.streak, 0, 0, 50);
    r.matches = num(r.matches, 0, 0, 1e9); r.wins = num(r.wins, 0, 0, 1e9);
    r.best = num(r.best, 0, 0, 1e9); r.bestCups = num(r.bestCups, 0, 0, MAX_CUPS);
    r.maxL = num(r.maxL, 0, 0, LEAGUES.length - 1);
    r.unsent = num(r.unsent, 0, 0, 1e6); r.unsentSecs = num(r.unsentSecs, 0, 0, 1e9);
    r.sentCups = typeof r.sentCups === 'number' ? r.sentCups : -1;
    r.season = typeof r.season === 'string' ? r.season : '';
    r.mode = r.mode === 'league' ? 'league' : 'arena';
    if (!Array.isArray(r.claimed)) r.claimed = [0];
    r.sMatches = num(r.sMatches, 0, 0, 1e9);
    r.trophies = Array.isArray(r.trophies) ? r.trophies.map((x) => ({ s: Math.floor(Number(x && x.s)), l: Math.floor(Number(x && x.l)) })).filter((x) => Number.isFinite(x.s) && x.l >= 0 && x.l < LEAGUES.length).slice(-120) : [];
    // одноразовый сброс званий у всех (RESET_V): кубки обнуляются, нужно заново пройти калибровку; трофеи и рекорды сохраняются
    if (num(r.resetV, 0, 0, 1e6) < RESET_V) {
      r.resetV = RESET_V;
      r.cups = 0; r.promo = false; r.lock = false; r.fails = 0; r.protect = 0; r.streak = 0;
      r.maxL = 0; r.sMatches = 0; r.unsent = 0; r.unsentSecs = 0; r.sentCups = -1;
      r.cal = { on: true, scores: [], n: 0 };
    }
    // калибровка: у новых игроков включена, у тех, кто уже играл в лиге, выключена (звание сохраняется)
    let c = r.cal;
    if (!c || typeof c !== 'object') c = r.cal = { on: r.matches === 0, scores: [] };
    c.on = !!c.on;
    c.scores = Array.isArray(c.scores) ? c.scores.map(Number).filter((v) => Number.isFinite(v) && v >= 0).slice(0, CALIB_N - 1) : [];
    if (!c.on) c.scores = [];
    c.n = c.scores.length;
    return r;
  }
  function mode() { return R().mode; }
  function calibOn() { return R().cal.on; }
  // к какой лиге относится счёт (по планкам лиг)
  function calibTier(sc) { let t = 0; for (let k = 0; k < LEAGUES.length; k++) if (sc >= LEAGUES[k].bar) t = k; return t; }
  function tintCal(el) { el.style.setProperty('--b1', CAL_BAR[0]); el.style.setProperty('--b2', CAL_BAR[1]); }
  function leagueOf(cups) { let i = 0; for (let k = 0; k < LEAGUES.length; k++) if (cups >= LEAGUES[k].thr) i = k; return i; }
  const LEAGUE_BAR = [['#b97844', '#f0b46a'], ['#7f9c9a', '#cfe3e1'], ['#c99a3c', '#ffe082'], ['#8ea6c8', '#e6dcc0'], ['#6b58b0', '#a99be0'], ['#3f8fcf', '#8fd0ff'], ['#1f63d0', '#5aa2ff'], ['#c4163c', '#ff6b8e'], ['#7c2fd0', '#c58bff']];
  function tintBar(el, li) {
    const c = LEAGUE_BAR[Math.max(0, Math.min(LEAGUE_BAR.length - 1, li))];
    el.style.setProperty('--b1', c[0]); el.style.setProperty('--b2', c[1]);
  }
  function frac(cups, li) {
    const L = LEAGUES[li], N = LEAGUES[li + 1];
    if (!N) return 1;
    if (R().promo && cups >= N.thr - 1) return 1;
    return Math.max(0, Math.min(1, (cups - L.thr) / (N.thr - L.thr)));
  }

  // ==========================================================
  // ЗНАЧКИ ЛИГ (как на картинке): щит с рамкой + эмблема
  // ==========================================================
  function lg(c, x0, y0, x1, y1, st) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    for (let i = 0; i < st.length; i++) g.addColorStop(st[i][0], st[i][1]);
    return g;
  }
  // многоугольник со скруглёнными углами
  function rpoly(c, pts, r) {
    const n = pts.length;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      const m0 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], m1 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      if (i === 0) c.moveTo(m0[0], m0[1]);
      c.arcTo(p1[0], p1[1], m1[0], m1[1], r);
    }
    c.closePath();
  }
  function scl(pts, k, cx, cy) { return pts.map((p) => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]); }
  function poly(c, pts, fill, stroke) {
    c.beginPath();
    pts.forEach((p, i) => { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke !== false) c.stroke();
  }

  const P5 = [[12, 8], [88, 8], [88, 60], [50, 94], [12, 60]];
  const PH = [[16, 6], [84, 6], [92, 15], [92, 58], [50, 97], [8, 58], [8, 15]];
  const PG = [[14, 6], [86, 6], [93, 16], [93, 56], [50, 96], [7, 56], [7, 16]];
  const PX = [[12, 10], [88, 10], [90, 56], [50, 92], [10, 56]];

  function shield(c, pts, rad, frameStops, innerStops, o) {
    o = o || {};
    const cx = 50, cy = 52;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 6; c.shadowOffsetY = 3;
    rpoly(c, pts, rad); c.fillStyle = lg(c, 0, 0, 0, 100, frameStops); c.fill();
    c.restore();
    c.save();
    c.strokeStyle = o.line || '#1a1a1a'; c.lineWidth = 3; rpoly(c, pts, rad); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 1.6; rpoly(c, scl(pts, 0.95, cx, cy), rad * 0.9); c.stroke();
    const ip = scl(pts, o.k || 0.8, cx, cy), ir = rad * 0.8;
    rpoly(c, ip, ir); c.fillStyle = lg(c, 0, 10, 0, 92, innerStops); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 2; c.stroke();
    c.save(); rpoly(c, ip, ir); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, 0, 100, 34);
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, 76, 100, 30);
    c.restore();
    c.restore();
  }
  function clipShield(c, pts, rad) { rpoly(c, scl(pts, 0.93, 50, 52), rad); c.clip(); }

  function swordS(c, x, y, rot, k, o) {
    const len = o.len || 40, w = o.w || 6, line = o.line || '#1a1a1a';
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(k, k);
    c.lineWidth = 2.2 / k; c.strokeStyle = line;
    c.beginPath(); c.moveTo(0, -len - 8); c.lineTo(w, -len); c.lineTo(w, 0); c.lineTo(-w, 0); c.lineTo(-w, -len); c.closePath();
    c.fillStyle = lg(c, -w, 0, w, 0, [[0, o.b1], [0.5, o.b2], [1, o.b3]]); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-w * 0.35, -len + 2); c.lineTo(-w * 0.35, -3);
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.6 / k; c.stroke();
    c.strokeStyle = line; c.lineWidth = 2.2 / k;
    c.beginPath(); c.roundRect(-w - 6, 0, (w + 6) * 2, 6, 2.5); c.fillStyle = o.guard; c.fill(); c.stroke();
    c.beginPath(); c.roundRect(-3, 6, 6, 10, 2); c.fillStyle = o.grip; c.fill(); c.stroke();
    c.beginPath(); c.arc(0, 18, 3.6, 0, 6.283); c.fillStyle = o.guard; c.fill(); c.stroke();
    c.restore();
  }
  const STEEL = { len: 34, w: 5.5, b1: '#f4f7f9', b2: '#c3ccd3', b3: '#7d8a94', guard: '#9aa6af', grip: '#5b6770', line: '#1f262b' };
  const GOLDSW = { len: 32, w: 5.5, b1: '#fff2a8', b2: '#f5bf33', b3: '#b97a0c', guard: '#ffd54f', grip: '#8a5a14', line: '#4a2f00' };

  function arrow(c, x0, y0, x1, y1) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    c.save(); c.lineCap = 'round';
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 4.2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = '#ffc83d'; c.lineWidth = 2.2; c.stroke();
    c.translate(x0, y0); c.rotate(a);
    c.lineWidth = 1.4; c.strokeStyle = '#1a1a1a';
    for (const o of [0, 5]) {
      c.beginPath(); c.moveTo(o, 0); c.lineTo(o + 7, -7.5); c.lineTo(o + 10, -7.5); c.lineTo(o + 4, 0); c.lineTo(o + 10, 7.5); c.lineTo(o + 7, 7.5); c.closePath();
      c.fillStyle = '#ff3d9a'; c.fill(); c.stroke();
    }
    c.restore();
  }

  function crownS(c, band, gem) {
    c.save(); c.translate(50, 52); c.lineWidth = 2.4; c.strokeStyle = '#5a3300';
    c.beginPath(); c.moveTo(-28, 16); c.lineTo(-33, -20); c.lineTo(-16, -5); c.lineTo(0, -30); c.lineTo(16, -5); c.lineTo(33, -20); c.lineTo(28, 16); c.closePath();
    c.fillStyle = lg(c, 0, -30, 0, 18, [[0, '#ffe27a'], [1, '#e08a14']]); c.fill(); c.stroke();
    poly(c, [[0, -30], [16, -5], [0, 8], [-16, -5]], 'rgba(255,255,255,0.32)', false);
    poly(c, [[33, -20], [28, 16], [16, 2], [16, -5]], 'rgba(140,60,0,0.25)', false);
    poly(c, [[-33, -20], [-28, 16], [-16, 2], [-16, -5]], 'rgba(255,255,255,0.18)', false);
    c.beginPath(); c.roundRect(-30, 8, 60, 14, 3); c.fillStyle = band; c.fill(); c.stroke();
    poly(c, [[0, 9.5], [7, 15], [0, 20.5], [-7, 15]], gem);
    for (const p of [[-33, -22], [0, -32], [33, -22]]) ci(c, p[0], p[1], 3.2, '#fff0a0');
    c.restore();
  }

  const BADGES = [
    // 0 — деревянный меч
    (c) => {
      shield(c, P5, 5, [[0, '#6f4a32'], [1, '#26140a']], [[0, '#b97844'], [1, '#7a4423']], { line: '#1a0d06' });
      swordS(c, 50, 62, 0, 1, { len: 38, w: 8, b1: '#fbc07a', b2: '#e9913f', b3: '#b9631e', guard: '#c8742c', grip: '#8a4a1c', line: '#4a2410' });
    },
    // 1 — два стальных меча
    (c) => {
      shield(c, P5, 5, [[0, '#56626a'], [1, '#1a2125']], [[0, '#7f9c9a'], [1, '#44605f']], { line: '#10161a' });
      c.save(); clipShield(c, P5, 5);
      swordS(c, 38, 54, 0.62, 1, STEEL); swordS(c, 62, 54, -0.62, 1, STEEL);
      c.restore();
    },
    // 2 — золотые мечи (три)
    (c) => {
      shield(c, P5, 5, [[0, '#5a4128'], [1, '#1b0f07']], [[0, '#8a6a40'], [1, '#3f2b15']], { line: '#120a04' });
      c.save(); clipShield(c, P5, 5);
      swordS(c, 50, 62, 0, 1, Object.assign({}, GOLDSW, { len: 40 }));
      swordS(c, 38, 54, 0.62, 1, GOLDSW); swordS(c, 62, 54, -0.62, 1, GOLDSW);
      c.restore();
    },
    // 3 — мишень со стрелами
    (c) => {
      shield(c, PH, 7, [[0, '#bccbe2'], [1, '#52698d']], [[0, '#f6f0e3'], [1, '#d8ceb6']], { line: '#1b2433' });
      c.save(); rpoly(c, scl(PH, 0.8, 50, 52), 5.6); c.clip();
      c.fillStyle = '#d8352c'; c.fillRect(10, 0, 22, 100); c.fillRect(68, 0, 22, 100);
      c.strokeStyle = 'rgba(90,70,40,0.35)'; c.lineWidth = 1; c.beginPath();
      for (const x of [32, 41, 50, 59, 68]) { c.moveTo(x, 0); c.lineTo(x, 100); }
      c.stroke();
      c.restore();
      c.lineWidth = 1.6; c.strokeStyle = 'rgba(60,20,10,0.85)';
      for (const q of [[20, '#d8352c'], [15, '#f6f0e3'], [10, '#d8352c'], [5.5, '#f6f0e3']]) ci(c, 50, 54, q[0], q[1]);
      ci(c, 50, 54, 2.2, '#d8352c', false);
      arrow(c, 17, 15, 45, 47); arrow(c, 12, 31, 42, 53);
    },
    // 4 — молот
    (c) => {
      shield(c, PH, 7, [[0, '#aaa2cf'], [1, '#3c3468']], [[0, '#6b58b0'], [1, '#2b2260']], { line: '#17112e' });
      c.save(); c.translate(56, 46); c.rotate(0.62); c.scale(0.88, 0.88);
      c.lineWidth = 2; c.strokeStyle = '#2a1608';
      c.beginPath(); c.roundRect(-4.5, -4, 9, 38, 3); c.fillStyle = lg(c, -4.5, 0, 4.5, 0, [[0, '#d68a3c'], [1, '#8a4a1c']]); c.fill(); c.stroke();
      c.fillStyle = '#f0a24a';
      for (let i = 0; i < 3; i++) c.fillRect(-4.5, 14 + i * 5.5, 9, 2.6);
      c.beginPath(); c.arc(0, 35, 3.6, 0, 6.283); c.fillStyle = '#8a4a1c'; c.fill(); c.stroke();
      c.strokeStyle = '#1d2228';
      c.beginPath(); c.roundRect(-27, -30, 54, 28, 4); c.fillStyle = lg(c, 0, -30, 0, -2, [[0, '#eef1f4'], [0.5, '#b6bec7'], [1, '#7e8993']]); c.fill(); c.stroke();
      c.beginPath(); c.roundRect(-27, -30, 9, 28, [4, 0, 0, 4]); c.fillStyle = '#8a95a0'; c.fill(); c.stroke();
      c.beginPath(); c.roundRect(18, -30, 9, 28, [0, 4, 4, 0]); c.fillStyle = '#8a95a0'; c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(-13, -27, 26, 3);
      c.restore();
    },
    // 5 — зелье
    (c) => {
      shield(c, PH, 7, [[0, '#a9c3e4'], [1, '#35567f']], [[0, '#3f8fcf'], [1, '#134a7c']], { line: '#0e1d33' });
      c.save(); c.translate(52, 57); c.rotate(-0.38); c.scale(0.95, 0.95);
      const body = () => {
        c.beginPath(); c.moveTo(-7, -24); c.lineTo(7, -24); c.lineTo(7, -14);
        c.bezierCurveTo(26, -8, 28, 14, 20, 24); c.quadraticCurveTo(0, 32, -20, 24); c.bezierCurveTo(-28, 14, -26, -8, -7, -14); c.closePath();
      };
      c.lineWidth = 2; c.strokeStyle = '#14283d';
      body(); c.fillStyle = 'rgba(220,238,255,0.92)'; c.fill();
      c.save(); body(); c.clip();
      c.fillStyle = lg(c, 0, -4, 0, 30, [[0, '#62c4ff'], [1, '#1a64d8']]); c.fillRect(-30, -4, 60, 40);
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(7, -10, 8, 44);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-14, 4, 3, 9, 0.2, 0, 6.283); c.fill();
      c.restore();
      body(); c.stroke();
      c.beginPath(); c.roundRect(-9, -27, 18, 5, 2); c.fillStyle = '#d8ecff'; c.fill(); c.stroke();
      c.beginPath(); c.roundRect(-6.5, -37, 13, 11, 2); c.fillStyle = '#c58b4e'; c.fill(); c.stroke();
      c.restore();
    },
    // 8 — синяя корона
    (c) => {
      shield(c, PG, 12, [[0, '#fff0a0'], [0.45, '#f0b72a'], [1, '#a86c08']], [[0, '#3d8bff'], [1, '#0d3f9e']], { line: '#5a3500' });
      crownS(c, '#3da0ff', '#ff9a2a');
    },
    // 7 — красная корона
    (c) => {
      shield(c, PG, 12, [[0, '#fff0a0'], [0.45, '#f0b72a'], [1, '#a86c08']], [[0, '#ef4469'], [1, '#8e0f2e']], { line: '#5a3500' });
      crownS(c, '#f0b030', '#e53935');
    },
    // 6 — фиолетовый кристалл в шипастой рамке
    (c) => {
      const sp = [[[10, 18], [9, 1], [26, 12]], [[90, 18], [91, 1], [74, 12]], [[9, 50], [0, 66], [17, 62]], [[91, 50], [100, 66], [83, 62]], [[41, 89], [50, 100], [59, 89]]];
      c.lineWidth = 2.4; c.strokeStyle = '#1c2430';
      for (const s of sp) poly(c, s, lg(c, 0, 0, 0, 100, [[0, '#e8f1f8'], [1, '#7896ad']]));
      shield(c, PX, 8, [[0, '#dfebf4'], [1, '#6c8aa3']], [[0, '#b86cff'], [1, '#5a1fa8']], { line: '#1c2430' });
      const H = [[50, 18], [76, 32], [74, 66], [50, 80], [26, 66], [24, 32]];
      const cols = ['#d9a8ff', '#9a4de6', '#7b2fd0', '#5c1fb0', '#8a3fe0', '#b774ff'];
      c.lineWidth = 1; c.strokeStyle = 'rgba(50,10,100,0.55)';
      for (let i = 0; i < 6; i++) poly(c, [[50, 50], H[i], H[(i + 1) % 6]], cols[i]);
      poly(c, [[50, 18], [62, 25], [50, 50], [38, 25]], 'rgba(255,255,255,0.25)', false);
      c.lineWidth = 2; c.strokeStyle = '#2a0a55'; poly(c, H, null);
    }
  ];
  // значок калибровки: серый щит с вопросительным знаком
  function calibBadge(c) {
    shield(c, P5, 5, [[0, '#9aa3ad'], [1, '#3d444c']], [[0, '#b9c1c9'], [1, '#6f7a85']], { line: '#161a1e' });
    c.save();
    c.font = '900 52px system-ui, -apple-system, Arial, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 5; c.strokeStyle = '#1a1f24'; c.strokeText('?', 50, 48);
    c.fillStyle = '#ffffff'; c.fillText('?', 50, 48);
    c.restore();
  }
  // значок звания друга рядом с ником (по числу кубков)
  window.rankedPaintBadges = function (root) {
    root.querySelectorAll('canvas.fr-badge[data-cups]').forEach((cv) => {
      const n = Number(cv.dataset.cups);
      if (!isFinite(n)) return;
      const li = leagueOf(n);
      cv.title = LEAGUES[li].name;
      drawBadge(cv, li);
    });
  };
  window.rankedLeagueName = function (cups) { return LEAGUES[leagueOf(Number(cups) || 0)].name; };
  // данные лиги для окна профиля игрока
  window.rankedInfo = function () {
    const r = R(), cal = r.cal.on, li = leagueOf(r.cups), L = LEAGUES[li], N = LEAGUES[li + 1];
    const c = cal ? CAL_BAR : LEAGUE_BAR[li];
    return {
      cal, calN: r.cal.n, calMax: CALIB_N, li, name: cal ? 'Калибровка' : L.name, cups: r.cups,
      next: N ? { name: N.name, thr: N.thr } : null, frac: cal ? r.cal.n / CALIB_N : frac(r.cups, li),
      promo: !!(r.promo && !r.lock && N), matches: r.matches, wins: r.wins, best: r.best, bestCups: r.bestCups,
      maxName: LEAGUES[r.maxL].name, trophies: r.trophies.length, streak: r.streak, c1: c[0], c2: c[1], total: LEAGUES.length
    };
  };
  window.rankedDrawBadge = function (cv, li) { drawBadge(cv, li); };
  function drawBadge(cv, idx) {
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    c.scale(cv.width / 100, cv.height / 100);
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = '#1a1a1a'; c.lineWidth = 2;
    if (idx < 0) calibBadge(c); else BADGES[idx](c);
  }

  // ==========================================================
  // КОРОЛЕВСКАЯ АРЕНА: одна для всех лиг, золото, пурпур и багрянец
  // ==========================================================
  function drawRoyalDeco(c, w, h, scroll, t) {
    const sink = Math.min(scroll * 0.12, h * 0.5), base = h + sink;
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';

    // золотые лучи сверху
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.17 + Math.sin(t * 0.0004 + i) * 0.02, L = h * 1.5;
      poly(c, [[w / 2, -20], [w / 2 + Math.cos(a - 0.045) * L, -20 - Math.sin(a - 0.045) * L], [w / 2 + Math.cos(a + 0.045) * L, -20 - Math.sin(a + 0.045) * L]], 'rgba(255,222,120,0.07)', false);
    }

    // герб с короной
    const ex = w / 2, ey = 118 + sink * 0.3;
    const hg = c.createRadialGradient(ex, ey, 6, ex, ey, 90);
    hg.addColorStop(0, 'rgba(255,230,150,0.55)'); hg.addColorStop(1, 'rgba(255,200,60,0)');
    c.fillStyle = hg; c.fillRect(ex - 95, ey - 95, 190, 190);
    c.strokeStyle = 'rgba(255,215,90,0.6)'; c.lineWidth = 3; c.beginPath(); c.arc(ex, ey, 50, 0, 6.283); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.arc(ex, ey, 58, 0, 6.283); c.stroke();
    for (let i = 0; i < 12; i++) {
      const an = i * Math.PI / 6 + t * 0.0003;
      c.fillStyle = 'rgba(255,224,130,0.85)';
      c.beginPath(); c.arc(ex + Math.cos(an) * 54, ey + Math.sin(an) * 54, 2.2, 0, 6.283); c.fill();
    }
    c.save(); c.translate(ex, ey + 4);
    c.beginPath(); c.moveTo(-30, 22); c.lineTo(-35, -14); c.lineTo(-17, 2); c.lineTo(0, -29); c.lineTo(17, 2); c.lineTo(35, -14); c.lineTo(30, 22); c.closePath();
    c.fillStyle = lg(c, 0, -29, 0, 22, [[0, '#fff0a0'], [0.5, '#ffc93a'], [1, '#c8860a']]); c.fill();
    c.lineWidth = 2.4; c.strokeStyle = '#7a4e00'; c.stroke();
    c.beginPath(); c.roundRect(-31, 12, 62, 12, 3); c.fillStyle = '#d32f4a'; c.fill(); c.stroke();
    for (const p of [[-35, -16], [0, -31], [35, -16]]) { c.beginPath(); c.arc(p[0], p[1], 3.4, 0, 6.283); c.fillStyle = '#fff6c0'; c.fill(); c.stroke(); }
    for (const x of [-18, 0, 18]) { c.beginPath(); c.arc(x, 18, 2.6, 0, 6.283); c.fillStyle = x ? '#4fc3f7' : '#fff176'; c.fill(); }
    c.restore();

    // колонны
    const colW = 30;
    for (const cx of [0, w - colW]) {
      c.fillStyle = lg(c, cx, 0, cx + colW, 0, [[0, '#bfae86'], [0.35, '#f7ecc9'], [0.7, '#e6d7a8'], [1, '#a8946a']]);
      c.fillRect(cx, -10, colW, h + 40);
      c.strokeStyle = 'rgba(120,90,30,0.35)'; c.lineWidth = 1.2; c.beginPath();
      for (let k = 1; k < 5; k++) { c.moveTo(cx + k * 6, -10); c.lineTo(cx + k * 6, h + 30); }
      c.stroke();
      for (let k = 0; k < 6; k++) {
        const ry = ((k * 130 + scroll * 0.2) % (h + 130)) - 20;
        c.fillStyle = lg(c, 0, ry, 0, ry + 7, [[0, '#ffe27a'], [1, '#b87a0a']]); c.fillRect(cx - 2, ry, colW + 4, 7);
      }
      const cy = 14 + sink * 0.3;
      c.fillStyle = lg(c, 0, cy, 0, cy + 14, [[0, '#ffe27a'], [1, '#b87a0a']]);
      c.fillRect(cx - 5, cy, colW + 10, 9); c.fillRect(cx - 2, cy + 9, colW + 4, 6);
      c.strokeStyle = '#7a4e00'; c.lineWidth = 1.4; c.strokeRect(cx - 5, cy, colW + 10, 9);
    }

    // шторы по бокам
    const drape = (x0, dir) => {
      const len = 150 + sink * 0.3;
      c.beginPath(); c.moveTo(x0, -4); c.lineTo(x0 + dir * 84, -4);
      c.quadraticCurveTo(x0 + dir * 70, len * 0.55, x0 + dir * 22, len); c.lineTo(x0, len + 12); c.closePath();
      c.fillStyle = lg(c, x0, 0, x0 + dir * 84, 0, [[0, '#7d0f2c'], [0.5, '#c2284a'], [1, '#7d0f2c']]); c.fill();
      c.strokeStyle = 'rgba(40,0,10,0.35)'; c.lineWidth = 1.5; c.beginPath();
      for (let k = 1; k < 4; k++) { c.moveTo(x0 + dir * k * 18, 0); c.quadraticCurveTo(x0 + dir * (k * 18 + 6), len * 0.5, x0 + dir * k * 8, len * 0.9); }
      c.stroke();
      c.strokeStyle = '#ffd54f'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x0 + dir * 84, -4); c.quadraticCurveTo(x0 + dir * 70, len * 0.55, x0 + dir * 22, len); c.stroke();
      c.beginPath(); c.arc(x0 + dir * 34, len * 0.52, 4, 0, 6.283); c.fillStyle = '#ffd54f'; c.fill(); c.strokeStyle = '#7a4e00'; c.lineWidth = 1.2; c.stroke();
    };
    drape(colW, 1); drape(w - colW, -1);

    // шторка-ламбрекен сверху
    const n = Math.max(2, Math.round(w / 60)), sw = w / n;
    c.beginPath(); c.moveTo(0, -4); c.lineTo(w, -4); c.lineTo(w, 16);
    for (let i = n; i > 0; i--) { const x = i * sw; c.quadraticCurveTo(x - sw / 2, 46, x - sw, 16); }
    c.closePath();
    c.fillStyle = lg(c, 0, 0, 0, 44, [[0, '#8c1233'], [1, '#c2284a']]); c.fill();
    c.strokeStyle = '#ffd54f'; c.lineWidth = 2.2; c.stroke();

    // знамёна
    for (const bx of [w * 0.2, w * 0.8]) {
      const sg = Math.sin(t * 0.002 + bx) * 3;
      poly(c, [[bx - 14, 24], [bx + 14, 24], [bx + 14, 84 + sg], [bx, 100 + sg], [bx - 14, 84 + sg]], lg(c, 0, 24, 0, 100, [[0, '#2347b8'], [1, '#13276e']]), true);
      c.strokeStyle = '#ffd54f'; c.lineWidth = 1.8; poly(c, [[bx - 14, 24], [bx + 14, 24], [bx + 14, 84 + sg], [bx, 100 + sg], [bx - 14, 84 + sg]], null);
      c.fillStyle = '#ffd54f'; poly(c, [[bx - 8, 62 + sg], [bx - 9, 46 + sg], [bx - 3, 54 + sg], [bx, 42 + sg], [bx + 3, 54 + sg], [bx + 9, 46 + sg], [bx + 8, 62 + sg]], '#ffd54f', false);
    }

    // люстры
    const chand = (cx, cy) => {
      c.strokeStyle = 'rgba(255,215,90,0.75)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, -10); c.lineTo(cx, cy - 8); c.stroke();
      c.beginPath(); c.ellipse(cx, cy, 26, 7, 0, 0, 6.283); c.fillStyle = lg(c, 0, cy - 7, 0, cy + 7, [[0, '#ffe27a'], [1, '#b87a0a']]); c.fill();
      c.strokeStyle = '#7a4e00'; c.lineWidth = 1.6; c.stroke();
      for (let i = -2; i <= 2; i++) {
        const x = cx + i * 10, fl = Math.sin(t * 0.01 + i * 1.7 + cx) * 1.2;
        c.fillStyle = '#fff8e1'; c.fillRect(x - 2, cy - 15, 4, 11);
        c.fillStyle = 'rgba(255,214,90,0.25)'; c.beginPath(); c.arc(x, cy - 19, 9, 0, 6.283); c.fill();
        c.fillStyle = '#ffd54f'; c.beginPath(); c.ellipse(x, cy - 19 + fl * 0.4, 2.2, 3.8 + fl, 0, 0, 6.283); c.fill();
      }
      poly(c, [[cx, cy + 22], [cx + 5, cy + 14], [cx, cy + 8], [cx - 5, cy + 14]], '#4fc3f7', true);
    };
    chand(w * 0.3, 270 + sink * 0.35);
    chand(w * 0.72, 430 + sink * 0.35);

    // пол: золотой шахматный + красная ковровая дорожка
    const fy = base - 46, sq = 23;
    for (let row = 0; row < 2; row++) for (let x = -sq; x < w + sq; x += sq) {
      c.fillStyle = (Math.round(x / sq) + row) % 2 ? '#f3e3b0' : '#c8962a';
      c.fillRect(x, fy + row * sq, sq, sq);
    }
    c.fillStyle = '#ffcf4a'; c.fillRect(0, fy - 4, w, 5);
    c.fillStyle = 'rgba(80,40,0,0.5)'; c.fillRect(0, fy + 1, w, 2);
    poly(c, [[w / 2 - 48, fy], [w / 2 + 48, fy], [w / 2 + 72, base + 8], [w / 2 - 72, base + 8]], lg(c, 0, fy, 0, base, [[0, '#c2284a'], [1, '#7d0f2c']]), false);
    c.strokeStyle = '#ffd54f'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(w / 2 - 48, fy); c.lineTo(w / 2 - 72, base + 8); c.moveTo(w / 2 + 48, fy); c.lineTo(w / 2 + 72, base + 8); c.stroke();

    c.restore();
  }
  const origDeco = drawArenaDeco;
  window.drawArenaDeco = function (c, a, w, h, scroll, t) {
    if (a && a.scene === 'royal') { drawRoyalDeco(c, w, h, scroll, t); return; }
    return origDeco.apply(this, arguments);
  };
  // золотые украшения на платформах королевской арены
  const origPlat = drawPlatformShape;
  window.drawPlatformShape = function (c, a, p, t) {
    origPlat(c, a, p, t);
    if (a && a.scene === 'royal' && !p.broken && (p.type === 'normal' || p.type === 'moving')) {
      c.save();
      const cy = p.y + p.h / 2 + 0.5;
      ci(c, p.x + p.w / 2, cy, 2.6, '#e53935', false);
      ci(c, p.x + p.w / 2 - 0.8, cy - 0.8, 0.9, '#ffffff', false);
      c.fillStyle = 'rgba(255,248,200,0.85)';
      for (const dx of [-17, 17]) { c.beginPath(); c.arc(p.x + p.w / 2 + dx, cy, 1.5, 0, 6.283); c.fill(); }
      c.restore();
    }
  };

  const RANKED_ARENA = {
    id: 100, name: 'Королевская арена', minXP: 0, icon: '👑', scene: 'royal',
    desc: 'Золотой тронный зал для лучших прыгунов', twist: 'Одна арена для всех лиг.',
    bgTop: '#1d1040', bgBottom: '#5c0f2e', gridColor: 'rgba(255,213,79,0.13)', marginColor: 'rgba(255,215,0,0.5)', margin: false,
    platNormal: '#ffcf4a', platMoving: '#4dd0e1', platBreak: '#a1623a', platVanish: '#fff3c4', platBorder: '#5a3a00', glow: true,
    ambient: { type: 'motes', color: '#ffe082' }, monsters: ['blot', 'eraser', 'bat'], monsterRate: 1, diff: 0.6, platSpeed: 1.6, wind: 0, slip: 0, hazard: null, hazardLook: 'shard'
  };
  // геймплей одинаковый во всех лигах; сложность растёт только с высотой (как в основной игре)
  function configArena() {
    const A = RANKED_ARENA;
    A.diff = 0.6; A.monsterRate = 1; A.platSpeed = 1.6; A.wind = 0; A.noWind = true; A.slip = 0; A.hazard = null;
    A.monsters = ['blot', 'eraser', 'bat'];
  }

  // ---------- сезон лиги: отдельный от сезона пропуска, длится 2 недели ----------
  const SEASON_DAYS = 14;
  const SEASON_EPOCH = new Date(2026, 10, 2); // понедельник: начало первого сезона лиги
  const TROPHY_NAME = ['Деревянный жетон', 'Стальной клинок', 'Золотой клинок', 'Меткий наконечник', 'Молот чемпиона', 'Эликсир славы', 'Синий венец', 'Алый венец', 'Фиолетовая реликвия'];
  const TROPHY_ICO = ['🪵', '🗡', '⚔️', '🎯', '🔨', '🧪', '💙', '❤️', '💎'];
  function lgSeasonIdx() {
    const d = new Date();
    return Math.floor(Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - SEASON_EPOCH) / 86400000) / SEASON_DAYS);
  }
  function lgSeasonKey() { return 'L' + lgSeasonIdx(); }
  function lgMsLeft() { return new Date(2026, 10, 2 + (lgSeasonIdx() + 1) * SEASON_DAYS) - new Date(); }

  function ensureSeason(noLoot) {
    const r = R(), key = lgSeasonKey();
    if (!r.season) { r.season = key; return; }
    if (r.season === key) return;
    if (r.season.charAt(0) !== 'L') { r.season = key; r.sMatches = 0; writeSaveData(); return; } // переход со старых месячных сезонов
    const old = Number(r.season.slice(1)) || 0, views = [], mx = r.maxL;
    if (!r.cal.on && r.sMatches > 0) {
      r.trophies.push({ s: old, l: mx });
      views.push({ ico: TROPHY_ICO[mx], text: 'Трофей сезона ' + (old + 1) + ': «' + TROPHY_NAME[mx] + '»' });
      views.push(grantReward({ t: 'coins', n: 200 * (mx + 1) }));
      if (mx >= 3) views.push(grantReward({ t: 'chest', k: mx >= 6 ? 'epic' : 'rare' }));
      if (mx >= 8) { const s = randomSkin(['mythic', 'arcana', 'epic']); if (s) views.push(grantReward({ t: 'skin', id: s.id })); }
    }
    if (r.cups > 1500) r.cups = Math.floor(1500 + (r.cups - 1500) * 0.6);
    r.promo = false; r.lock = false; r.fails = 0; r.protect = 0; r.streak = 0; r.sMatches = 0;
    r.maxL = leagueOf(r.cups); r.season = key;
    writeSaveData();
    if (!views.length) return;
    if (noLoot) metaToast('🏆', 'Сезон лиги закончился', 'Награда и трофей добавлены в коллекцию');
    else setTimeout(() => showLoot('🏆', 'Сезон лиги ' + (old + 1) + ' завершён', views), 350);
  }

  // ---------- подсчёт матча ----------
  function settleCalib(r, sc) {
    const res = { score: sc, before: { cups: 0, li: 0 }, delta: 0, type: 'calib', bar: 0, notes: [], rewards: [], tier: calibTier(sc) };
    r.cal.scores.push(sc); r.cal.n = r.cal.scores.length;
    res.calibN = r.cal.n;
    res.notes.push('Результат уровня «' + LEAGUES[res.tier].name + '»');
    if (r.cal.n >= CALIB_N) {
      const avg = r.cal.scores.map(calibTier).reduce((a, b) => a + b, 0) / r.cal.n;
      const a = Math.min(CALIB_MAX, avg), li = Math.floor(a), N = LEAGUES[li + 1];
      let cups = LEAGUES[li].thr;
      if (N) cups = Math.min(N.thr - 2, cups + Math.floor((a - li) * (N.thr - LEAGUES[li].thr)));
      r.cups = cups; r.promo = false; r.lock = false; r.fails = 0; r.protect = 0; r.streak = 0;
      r.maxL = li; if (cups > r.bestCups) r.bestCups = cups;
      for (let i = 0; i <= li; i++) if (!r.claimed.includes(i)) r.claimed.push(i); // награды за лиги ниже стартовой не выдаём
      r.cal.on = false; r.cal.scores = []; r.cal.n = 0;
      res.placed = true; res.afterCups = cups; res.afterLi = li;
      res.notes.unshift('Среднее по ' + CALIB_N + ' матчам: «' + LEAGUES[li].name + '»');
    }
    return res;
  }

  function settle(sc, secs) {
    const r = R(); ensureSeason(true);
    if (r.cal.on) {
      r.matches++; if (sc > r.best) r.best = sc;
      r.sMatches++; const cres = settleCalib(r, sc);
      r.unsent++; r.unsentSecs += Math.max(1, Math.floor(secs || 1));
      writeSaveData(); flushCloud();
      return cres;
    }
    r.sMatches++;
    const bc = r.cups, li = leagueOf(bc), L = LEAGUES[li], N = LEAGUES[li + 1];
    const res = { score: sc, before: { cups: bc, li }, delta: 0, type: 'normal', bar: L.bar, notes: [], rewards: [] };
    r.matches++; if (sc > r.best) r.best = sc;
    if (r.promo && !r.lock && N) {
      res.type = 'promo'; res.bar = N.bar;
      if (sc >= N.bar) {
        r.cups = N.thr; r.promo = false; r.fails = 0; r.protect = 2; r.wins++; res.promoOk = true;
        res.notes.push('🛡 Защита от вылета на 2 матча');
      } else {
        r.fails++; res.promoOk = false; r.streak = 0;
        if (r.fails >= 2) { r.lock = true; r.fails = 0; res.notes.push('Нужен один обычный матч перед новой попыткой'); }
        else res.notes.push('Ещё одна попытка доступна сразу');
      }
    } else {
      let raw = sc <= 0 ? -15 : K * Math.log2(sc / L.bar);
      raw = Math.max(-15, Math.min(35, raw));
      let d = 0;
      if (raw > 0.0001) d = Math.max(1, Math.round(raw * WIN_CAPS[li] / 35));
      else if (raw < -0.0001) d = -Math.max(1, Math.round(-raw * LOSS_CAPS[li] / 15));
      if (d > 0) {
        r.wins++; r.streak++;
        // стрик: с 3-й победы подряд бонус за КАЖДУЮ следующую победу и он растёт (до ×5), серия не сбрасывается
        if (r.streak >= 3) { const bn = Math.max(2, Math.round(WIN_CAPS[li] / 7)) * Math.min(5, r.streak - 2); d += bn; res.bonus = bn; res.notes.push('🔥 Серия побед ×' + r.streak + ': +' + bn + ' кубков'); }
      } else if (d < 0) r.streak = 0;
      let c = r.cups + d;
      if (r.protect > 0) { if (c < L.thr) res.notes.push('🛡 Защита спасла от вылета'); c = Math.max(c, L.thr); r.protect--; }
      c = Math.max(0, Math.min(MAX_CUPS, c));
      if (N && c >= N.thr) { c = N.thr - 1; r.promo = true; r.fails = 0; res.promoReady = true; res.notes.push('🔥 Открыт матч повышения!'); }
      else if (N && c < N.thr - 1) { r.promo = false; r.lock = false; }
      if (r.lock && r.promo) { r.lock = false; }
      r.cups = c;
    }
    res.afterCups = r.cups; res.delta = r.cups - bc; res.afterLi = leagueOf(r.cups);
    if (res.afterLi > li) {
      for (let i = li + 1; i <= res.afterLi; i++) {
        if (r.claimed.includes(i) || !LEAGUE_REWARD[i]) continue;
        r.claimed.push(i);
        res.rewards.push(grantReward({ t: 'coins', n: LEAGUE_REWARD[i][0] }));
        res.rewards.push(grantReward({ t: 'chest', k: LEAGUE_REWARD[i][1] }));
        if (i === 8) { const s = randomSkin(['mythic', 'arcana']); if (s) res.rewards.push(grantReward({ t: 'skin', id: s.id })); }
      }
    }
    if (res.afterLi < li) res.notes.push('Ты опустился в лигу «' + LEAGUES[res.afterLi].name + '»');
    if (res.afterLi > r.maxL) r.maxL = res.afterLi;
    if (r.cups > r.bestCups) r.bestCups = r.cups;
    r.unsent++; r.unsentSecs += Math.max(1, Math.floor(secs || 1));
    writeSaveData(); flushCloud();
    return res;
  }

  // ---------- серверная часть (по возможности) ----------
  async function report() {
    const r = R(), N = saveData.net;
    if (!N || !N.id || !N.secret || (!r.unsent && r.sentCups === r.cups)) return;
    try {
      await rpc('dj_ranked_report', { p_id: N.id, p_secret: N.secret, p_cups: r.cups, p_best: r.best, p_secs: Math.floor(r.unsentSecs), p_matches: r.unsent });
      r.unsent = 0; r.unsentSecs = 0; r.sentCups = r.cups; writeSaveData();
    } catch (e) {}
  }
  function pushToServer() { netSync(false).then(report).catch(() => {}); }
  window.addEventListener('online', () => setTimeout(report, 800));

  // ---------- режим матча ----------
  let rankedActive = false, rankedLive = false, pendingRanked = false, rankedPromo = false, curToken = 0;
  const NO = {};
  const origArena = getCurrentArena, origPerk = getPerk, origUpg = upgLevel, origBoosts = applyStartBoosts;
  const origCoins = gainCoins, origXP = addXP, origTGO = triggerGameOver, origStart = startGame, origMenu = showMainMenu, origUAU = updateAllUI;
  const origDMP = drawMenuPreview, origStep = stepPreview;

  window.getCurrentArena = function () { return rankedActive ? RANKED_ARENA : origArena(); };
  window.getPerk = function () { return rankedActive ? NO : origPerk(); };
  window.upgLevel = function (id) { return rankedActive ? 0 : origUpg(id); };
  window.applyStartBoosts = function () { if (!rankedActive) origBoosts(); };
  window.gainCoins = function (n) { return rankedActive ? 0 : origCoins(n); };
  window.addXP = function (n) { if (!rankedActive) origXP(n); };

  function setPauseUI(on) {
    const b = $('pauseRestartBtn'); if (b) b.style.display = on ? 'none' : '';
    const m = $('pauseMenuBtn'); if (m) m.textContent = on ? '🏳 Сдаться и выйти' : '🏠 В главное меню';
  }
  function leaveRanked() {
    rankedActive = false; rankedLive = false; pendingRanked = false;
    hudLast.arena = -1; setPauseUI(false); refreshEvent();
  }
  function rankedStart() {
    if (mode() !== 'league') return;
    const r = R(); ensureSeason(true);
    const li = leagueOf(r.cups), cal = r.cal.on;
    rankedPromo = !cal && !!(r.promo && !r.lock && LEAGUES[li + 1]);
    configArena(cal ? CALIB_DIFF : rankedPromo ? li + 1 : li);
    challenge = null;
    rankedActive = true; rankedLive = true; pendingRanked = true;
    startGame();
    setPauseUI(true);
    EV_KEY = ''; coins.forEach((c) => { c.ev = false; });
    hudRefs.arena.textContent = cal ? 'Калибровка ' + (r.cal.n + 1) + '/' + CALIB_N : rankedPromo ? 'Повышение' : 'Лига: ' + LEAGUES[li].name;
    hudLast.arena = saveData.selectedArena;
    showToastText(cal ? '❓ Калибровка: матч ' + (r.cal.n + 1) + ' из ' + CALIB_N + '. Набери как можно больше!' : rankedPromo ? '🔥 Матч повышения: набери ' + fmt(LEAGUES[li + 1].bar) : '🏆 Планка лиги: ' + fmt(LEAGUES[li].bar));
  }
  window.startGame = function () {
    if (!pendingRanked) { leaveRanked(); }
    pendingRanked = false;
    return origStart.apply(this, arguments);
  };
  window.triggerGameOver = function () {
    if (!rankedActive) return origTGO.apply(this, arguments);
    if (gameState !== 'PLAYING') return;
    gameState = 'GAMEOVER'; stopAllLoops(); playSound('gameover');
    hudEl.classList.add('hidden');
    finishRanked(false);
  };
  window.showMainMenu = function () {
    if (rankedActive && rankedLive) {
      const res = settle(Math.floor(score), frameCount / 60);
      rankedLive = false;
      if (res.type === 'calib') metaToast('❓', 'Матч прерван', res.placed ? 'Калибровка завершена: «' + LEAGUES[res.afterLi].name + '»' : 'Засчитан в калибровку: ' + res.calibN + ' из ' + CALIB_N);
      else metaToast('🏆', 'Матч прерван', (res.delta > 0 ? '+' : '') + res.delta + ' кубков');
      if (res.rewards.length) setTimeout(() => showLoot('🏆', 'Награда лиги', res.rewards), 500);
      pushToServer();
    }
    leaveRanked();
    return origMenu.apply(this, arguments);
  };
  // «Играть»: в режиме лиги запускаем матч лиги, в режиме арен — обычный матч
  $('startBtn').addEventListener('click', (e) => {
    if (mode() === 'league') { e.stopImmediatePropagation(); playSound('click'); rankedStart(); }
    else leaveRanked();
  }, true);

  // ---------- переключатель «Арены / Лига» и витрина лиги ----------
  const css = document.createElement('style');
  css.textContent = `
  .fr-nm{display:flex;align-items:center;gap:6px;min-width:0}.fr-nm b{min-width:0}.fr-badge{width:24px;height:24px;flex:none}.fp-head .fr-badge{width:26px;height:26px}
  .main-menu:not(.league-mode) #openRankBtn{display:none!important}
  .mm-mode{display:flex;gap:4px;padding:4px;border-radius:16px;background:var(--mm-card);box-shadow:inset 0 0 0 1px var(--mm-line)}
  .mm-mode button{flex:1;height:34px;border:0;border-radius:12px;font-weight:900;font-size:13px;color:var(--mm-dim);background:transparent;cursor:pointer;transition:background .15s,color .15s}
  .mm-mode button.on{color:#14172a;background:var(--ac)}
  .mm-mode button.on[data-m=league]{background:linear-gradient(180deg,#ffe27a,#e8a020);color:#2a1a00;box-shadow:0 4px 14px rgba(255,190,40,.45)}
  .main-menu.league-mode .mm-arrow,.main-menu.league-mode .mm-strip,.main-menu.league-mode .mm-strip-hint,.main-menu.league-mode #arenaSelectBtn,.main-menu.league-mode .mm-boosts,.main-menu.league-mode #menuArenaLock{display:none!important}
  .main-menu.league-mode .mm-hero{box-shadow:0 0 0 1.5px rgba(255,207,74,.7),0 14px 34px rgba(0,0,0,.45),0 0 44px rgba(255,190,40,.25)}
  .mm-rank{display:flex;align-items:center;gap:10px;width:100%;padding:7px 12px 7px 8px;border:0;border-radius:18px;cursor:pointer;color:var(--mm-text);text-align:left;background:linear-gradient(120deg,rgba(255,193,7,.22),rgba(124,77,255,.18)),var(--mm-card);box-shadow:inset 0 0 0 1.5px rgba(255,213,79,.55);transition:transform .12s}
  .mm-rank:active{transform:scale(.98)}
  .mm-rank-badge{width:44px;height:44px;flex-shrink:0}
  .mm-rank-txt{flex:1;min-width:0;display:flex;flex-direction:column}
  .mm-rank-txt b{font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mm-rank-txt small{font-size:10.5px;color:var(--mm-dim);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mm-rank-cups{font-size:15px;font-weight:900;color:#ffe08a;white-space:nowrap}
  .mm-rank.hot{box-shadow:inset 0 0 0 2px #ff7043,0 0 16px rgba(255,112,67,.35)}
  .rk-big{display:block;width:150px;height:150px;margin:0 auto}
  .rk-name{font-size:19px;font-weight:900;color:#fff;text-align:center;margin-top:4px}
  .rk-bar{height:12px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin:9px 0 5px}
  .rk-bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,var(--b1,#ffd54f),var(--b2,#ff9800));box-shadow:0 0 10px color-mix(in srgb,var(--b2,#ff9800) 60%,transparent);transition:width .8s cubic-bezier(.2,.8,.2,1)}
  .rk-sub{font-size:12.5px;color:#d2d8f2;text-align:center;font-weight:700;line-height:1.4}
  .rk-box{padding:9px 11px;border-radius:14px;background:#1b2139;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);font-size:12px;line-height:1.45;color:#b6bfe3;text-align:left;flex-shrink:0}
  .rk-box b{color:#fff}
  .rk-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;flex-shrink:0}
  .rk-row{display:flex;align-items:center;gap:10px;padding:6px 10px 6px 6px;border-radius:14px;background:#1b2139;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);text-align:left;flex-shrink:0}
  .rk-row canvas{width:42px;height:42px;flex-shrink:0}
  .rk-row .t{flex:1;min-width:0}.rk-row .t b{display:block;font-size:13px;color:#fff}.rk-row .t small{font-size:11px;color:#9aa3c7;font-weight:700}
  .rk-row .cp{font-size:11px;font-weight:900;color:#ffe08a;white-space:nowrap;text-align:right;line-height:1.3}
  .rk-row.cur{box-shadow:inset 0 0 0 2px #ffd54f;background:linear-gradient(120deg,rgba(255,193,7,.2),#1b2139)}
  .rk-row.far{opacity:.55}
  .rk-top{display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:12px;background:#1b2139;font-size:13px;color:#eef1ff;font-weight:800;flex-shrink:0}
  .rk-top span:first-child{width:22px;color:#8a93b8}.rk-top span:nth-child(2){flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rk-scorebox{padding:9px 12px;border-radius:14px;background:#1b2139;text-align:center;font-size:13px;color:#9aa3c7;font-weight:700;flex-shrink:0}
  .rk-scorebox b{font-size:22px;color:#fff;display:block;font-variant-numeric:tabular-nums}
  .rk-badgewrap{position:relative;display:flex;justify-content:center;margin:10px 0 0;flex-shrink:0}
  .rk-burst{position:absolute;left:50%;top:50%;width:260px;height:260px;margin:-130px 0 0 -130px;border-radius:50%;pointer-events:none;opacity:0;background:repeating-conic-gradient(from 0deg,rgba(255,213,79,.28) 0 12deg,transparent 12deg 30deg);mask-image:radial-gradient(circle,#000 20%,transparent 68%);-webkit-mask-image:radial-gradient(circle,#000 20%,transparent 68%)}
  .rk-burst.on{opacity:1;animation:burstSpin 6s linear infinite}
  .rk-badgewrap canvas{position:relative}
  .rk-up{animation:rkUp .7s cubic-bezier(.2,1.6,.4,1)}
  .rk-crack{animation:rkShake .55s}
  .rk-pulse{animation:rkPulse .25s}
  @keyframes rkUp{0%{transform:scale(.3) rotate(-15deg)}60%{transform:scale(1.25)}100%{transform:none}}
  @keyframes rkShake{20%{transform:translateX(-9px) rotate(-5deg)}40%{transform:translateX(9px) rotate(5deg)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
  @keyframes rkPulse{50%{transform:scale(1.28)}}
  .rk-cup{position:absolute;left:0;top:0;z-index:90;font-size:22px;line-height:22px;width:22px;height:22px;pointer-events:none;will-change:transform,opacity;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}
  .rk-notes{font-size:12px;font-weight:800;color:#9ff0a6;text-align:center;line-height:1.4;min-height:16px}
  .rk-trgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;flex-shrink:0}.rk-tr{display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 3px;border-radius:14px;background:#1b2139;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);text-align:center}.rk-tr canvas{width:50px;height:50px}.rk-tr b{font-size:10.5px;color:#c4cbe8;line-height:1.15}.rk-tr small{font-size:10px;color:#8a93b8;font-weight:800}.rk-tr:not(.on) canvas{filter:grayscale(1);opacity:.3}.rk-tr.on{box-shadow:inset 0 0 0 1.5px rgba(255,213,79,.55)}.rk-tr.on b{color:#fff}.rk-tr.on small{color:#ffe08a}
  `;
  document.head.appendChild(css);

  const modeEl = document.createElement('div');
  modeEl.className = 'mm-mode';
  modeEl.innerHTML = '<button data-m="arena">🏟 Арены</button><button data-m="league">🏆 Лига</button>';
  const mmTop = document.querySelector('#mainMenu .mm-top');
  mmTop.parentNode.insertBefore(modeEl, mmTop.nextSibling);
  modeEl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const r = R();
    if (r.mode === b.dataset.m) return;
    r.mode = b.dataset.m;
    writeSaveData(); playSound('click');
    updateAllUI();
  });

  // значок лиги поверх витрины: заранее нарисованный спрайт с сиянием
  const badgeTmp = document.createElement('canvas'); badgeTmp.width = badgeTmp.height = 180;
  const badgeGlow = document.createElement('canvas'); badgeGlow.width = badgeGlow.height = 260;
  let badgeKey = -1;
  function prepBadge(li) {
    drawBadge(badgeTmp, li);
    const g = badgeGlow.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 260, 260);
    const rg = g.createRadialGradient(130, 130, 10, 130, 130, 128);
    rg.addColorStop(0, 'rgba(255,224,130,0.6)'); rg.addColorStop(1, 'rgba(255,224,130,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 260, 260);
    g.drawImage(badgeTmp, 40, 40);
    badgeKey = li;
  }
  window.drawMenuPreview = function (t) {
    if (mode() !== 'league') return origDMP(t);
    const cal = calibOn(), li = cal ? CALIB_DIFF : leagueOf(R().cups), bi = cal ? -1 : li;
    configArena(li);
    const i = previewIdx - 1, keep = ARENAS[i];
    ARENAS[i] = RANKED_ARENA;
    try { origDMP(t); } finally { ARENAS[i] = keep; }
    if (badgeKey !== bi) prepBadge(bi);
    const cw = menuCanvas.width, sx = cw / 362, sz = 104 * sx;
    const y = (-8 + Math.sin(t * 0.002) * 2.5) * sx;
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.drawImage(badgeGlow, cw / 2 - sz / 2, y, sz, sz);
  };
  window.stepPreview = function (dir) { if (mode() === 'league') return; return origStep(dir); };

  function applyModeUI() {
    const lgm = mode() === 'league';
    mainMenuEl.classList.toggle('league-mode', lgm);
    modeEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.m === (lgm ? 'league' : 'arena')));
    const lab = $('menuBestScore').nextElementSibling;
    if (!lgm) { if (lab) lab.textContent = 'Рекорд арены'; return; }
    const r = R(), li = leagueOf(r.cups), L = LEAGUES[li], N = LEAGUES[li + 1], hot = r.promo && !r.lock && N;
    const gold = [['--ac', '#ffcf4a'], ['--ac-rgb', '255,207,74'], ['--ac-ink', '#2a1a00'], ['--play', '#ffcf4a'], ['--play-rgb', '255,207,74'], ['--play-ink', '#2a1a00']];
    gold.forEach((p) => mainMenuEl.style.setProperty(p[0], p[1]));
    if (r.cal.on) {
      $('menuArenaNum').textContent = 'КАЛИБРОВКА ' + r.cal.n + ' / ' + CALIB_N;
      $('menuArenaMult').textContent = '🏆 ?';
      $('menuArenaTitle').textContent = '👑 Калибровка';
      $('menuArenaDesc').textContent = 'Сыграй ' + CALIB_N + ' матчей — получишь звание';
      $('menuArenaTwist').textContent = 'Звание выдаётся по среднему результату ' + CALIB_N + ' матчей. Кубки пока не меняются. Королевская арена, без прокачки, бонусов и монет.';
      $('menuBestScore').textContent = fmt(r.best);
      if (lab) lab.textContent = 'Лучший счёт лиги';
      $('menuPlayArena').textContent = '❓ Калибровка: матч ' + (r.cal.n + 1) + ' из ' + CALIB_N;
      $('menuArenaLock').classList.add('hidden');
      $('menuXpLabel').textContent = 'Калибровка';
      $('menuXpText').textContent = r.cal.n + ' / ' + CALIB_N;
      tintCal($('menuXpFill'));
      $('menuXpFill').style.width = (r.cal.n / CALIB_N * 100) + '%';
      return;
    }
    $('menuArenaNum').textContent = 'ЛИГА ' + (li + 1) + ' / ' + LEAGUES.length;
    $('menuArenaMult').textContent = '🏆 ' + fmt(r.cups);
    $('menuArenaTitle').textContent = '👑 ' + L.name;
    $('menuArenaDesc').textContent = hot ? 'Матч повышения: набери ' + fmt(N.bar) : 'Планка лиги: ' + fmt(L.bar) + ' очков';
    $('menuArenaTwist').textContent = 'Королевская арена одна для всех лиг. Победа: до +' + WIN_CAPS[li] + ' 🏆, поражение: до −' + LOSS_CAPS[li] + ' 🏆. Без прокачки, бонусов и монет.';
    $('menuBestScore').textContent = fmt(r.best);
    if (lab) lab.textContent = 'Лучший счёт лиги';
    $('menuPlayArena').textContent = '👑 Королевская арена';
    $('menuArenaLock').classList.add('hidden');
    $('menuXpLabel').textContent = N ? (hot ? 'Матч повышения готов' : 'До «' + N.name + '»') : 'Высшая лига!';
    $('menuXpText').textContent = N ? fmt(r.cups) + ' / ' + fmt(N.thr) + ' 🏆' : fmt(r.cups) + ' 🏆';
    tintBar($('menuXpFill'), li);
    $('menuXpFill').style.width = (frac(r.cups, li) * 100) + '%';
  }
  window.updateAllUI = function () { origUAU(); try { updateMenuBtn(); applyModeUI(); } catch (e) {} };

  // ---------- экран результата ----------
  const resEl = document.createElement('div');
  resEl.id = 'rkResult'; resEl.className = 'overlay hidden';
  resEl.innerHTML = `<div class="notebook-card modal-card">
    <div class="modal-header"><h2 id="rkResTitle">Матч лиги</h2><div class="stat-pill" id="rkResPill">🏆 <span id="rkResCups">0</span></div></div>
    <div class="scroll-list">
      <div class="rk-scorebox" id="rkResScore"></div>
      <div class="rk-badgewrap"><div class="rk-burst" id="rkResBurst"></div><canvas id="rkResBadge" class="rk-big" width="300" height="300"></canvas></div>
      <div class="rk-name" id="rkResName"></div>
      <div class="rk-bar"><i id="rkResFill"></i></div>
      <div class="rk-sub" id="rkResSub"></div>
      <div class="rk-notes" id="rkResNotes"></div>
    </div>
    <div class="modal-footer">
      <button id="rkResAgain" class="btn btn-primary" disabled>▶ Ещё матч</button>
      <div class="menu-grid-2"><button id="rkResLeague" class="btn btn-purple" disabled>🏆 К лиге</button><button id="rkResMenu" class="btn btn-outline" disabled>🏠 В меню</button></div>
    </div></div>`;
  wrapEl.appendChild(resEl);

  function center(el) {
    const wr = wrapEl.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2 };
  }
  function flyOne(p0, p1, delay, dur, down, token, onLand) {
    const el = document.createElement('div');
    el.className = 'rk-cup'; el.textContent = '🏆'; el.style.opacity = '0';
    wrapEl.appendChild(el);
    const cx = (p0.x + p1.x) / 2 + (Math.random() - 0.5) * 140;
    const cy = down ? p0.y - 40 : Math.min(p0.y, p1.y) - 50 - Math.random() * 70;
    const t0 = performance.now() + delay;
    (function step(now) {
      if (token !== curToken) { el.remove(); return; }
      const k = (now - t0) / dur;
      if (k < 0) { requestAnimationFrame(step); return; }
      const u = Math.min(1, k), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, v = 1 - e;
      const x = v * v * p0.x + 2 * v * e * cx + e * e * p1.x, y = v * v * p0.y + 2 * v * e * cy + e * e * p1.y;
      el.style.opacity = down && u > 0.55 ? String(1 - (u - 0.55) / 0.45) : '1';
      el.style.transform = 'translate3d(' + (x - 11) + 'px,' + (y - 11) + 'px,0) scale(' + (1 + 0.4 * Math.sin(Math.PI * u)) + ')';
      if (u >= 1) { el.remove(); onLand(); } else requestAnimationFrame(step);
    })(performance.now());
  }
  function tick(i, up) {
    if (typeof soundEnabled !== 'undefined' && soundEnabled) tone({ type: 'sine', f0: up ? 700 * Math.pow(1.07, i) : 420 * Math.pow(0.94, i), dur: 0.16, vol: 0.12 });
  }
  function pulse(el) { el.classList.remove('rk-pulse'); void el.offsetWidth; el.classList.add('rk-pulse'); }

  function finishRanked(forfeit) {
    const res = settle(Math.floor(score), frameCount / 60);
    rankedLive = false;
    showResult(res);
    pushToServer();
  }

  function showCalibResult(res) {
    const token = ++curToken, r = R();
    const cv = $('rkResBadge'), fill = $('rkResFill'), counter = $('rkResCups'), burst = $('rkResBurst');
    const btns = ['rkResAgain', 'rkResLeague', 'rkResMenu'].map($);
    btns.forEach((x) => { x.disabled = true; });
    const done = !!res.placed, n = res.calibN;
    $('rkResTitle').textContent = done ? '✅ Калибровка завершена!' : 'Калибровка: матч ' + n + ' из ' + CALIB_N;
    $('rkResScore').innerHTML = 'Счёт за матч<b>' + fmt(res.score) + '</b>матч калибровки ' + n + ' из ' + CALIB_N;
    drawBadge(cv, -1); burst.classList.remove('on'); cv.className = 'rk-big';
    $('rkResName').textContent = 'Калибровка';
    tintCal(fill);
    fill.style.transition = 'none'; fill.style.width = ((n - 1) / CALIB_N * 100) + '%'; void fill.offsetWidth; fill.style.transition = '';
    counter.textContent = '?';
    $('rkResNotes').textContent = res.notes.join(' · ');
    $('rkResSub').textContent = '';
    $('rkResAgain').textContent = r.cal.on ? '▶ Матч калибровки (' + (r.cal.n + 1) + '/' + CALIB_N + ')' : r.promo && !r.lock ? '🔥 Матч повышения' : '▶ Ещё матч';
    openModal(resEl, () => {});
    setTimeout(() => {
      if (token !== curToken) return;
      fill.style.width = (n / CALIB_N * 100) + '%';
      if (!done) {
        $('rkResSub').textContent = 'Осталось матчей: ' + (CALIB_N - n) + '. Звание — по среднему результату.';
        setTimeout(() => { if (token === curToken) btns.forEach((x) => { x.disabled = false; }); }, 400);
        return;
      }
      setTimeout(() => {
        if (token !== curToken) return;
        const li = res.afterLi;
        tintBar(fill, li); drawBadge(cv, li); $('rkResName').textContent = LEAGUES[li].name;
        cv.className = 'rk-big'; void cv.offsetWidth; cv.classList.add('rk-up');
        burst.classList.add('on'); playSound('arena_up');
        counter.textContent = fmt(res.afterCups);
        fill.style.transition = 'none'; fill.style.width = '0%'; void fill.offsetWidth; fill.style.transition = '';
        fill.style.width = (frac(res.afterCups, li) * 100) + '%';
        const N = LEAGUES[li + 1];
        $('rkResSub').textContent = 'Твоё звание: «' + LEAGUES[li].name + '»' + (N ? ' · до «' + N.name + '»: ещё ' + fmt(Math.max(0, N.thr - res.afterCups)) + ' 🏆' : '');
        setTimeout(() => { if (token === curToken) btns.forEach((x) => { x.disabled = false; }); }, 800);
      }, 700);
    }, 500);
  }

  function showResult(res) {
    if (res.type === 'calib') { showCalibResult(res); return; }
    const token = ++curToken, r = R();
    const b = res.before, li0 = b.li, li1 = res.afterLi;
    const cv = $('rkResBadge'), fill = $('rkResFill'), counter = $('rkResCups'), pill = $('rkResPill'), burst = $('rkResBurst');
    const btns = ['rkResAgain', 'rkResLeague', 'rkResMenu'].map($);
    btns.forEach((x) => { x.disabled = true; });
    let title;
    if (res.type === 'promo') title = res.promoOk ? '⬆ Повышение!' : 'Повышение не удалось';
    else title = res.delta > 0 ? 'Победа!' : res.delta < 0 ? 'Поражение' : 'Без изменений';
    $('rkResTitle').textContent = title;
    $('rkResScore').innerHTML = 'Счёт за матч<b>' + fmt(res.score) + '</b>' + (res.type === 'promo' ? 'планка повышения: ' : 'планка лиги: ') + fmt(res.bar) + ' · ' + (res.delta > 0 ? '+' : '') + res.delta + ' 🏆';
    tintBar(fill, li0); drawBadge(cv, li0); burst.classList.remove('on'); cv.className = 'rk-big';
    $('rkResName').textContent = LEAGUES[li0].name;
    fill.style.transition = 'none'; fill.style.width = (frac(b.cups, li0) * 100) + '%'; void fill.offsetWidth; fill.style.transition = '';
    counter.textContent = fmt(b.cups);
    $('rkResNotes').textContent = res.notes.join(' · ');
    $('rkResSub').textContent = '';
    const again = $('rkResAgain');
    again.textContent = r.promo && !r.lock ? '🔥 Матч повышения' : '▶ Ещё матч';
    openModal(resEl, () => {});

    const subFor = (li, cups) => {
      const N = LEAGUES[li + 1];
      if (!N) return 'Высшая лига!';
      if (r.promo && !r.lock) return 'Матч повышения готов: набери ' + fmt(N.bar) + ' очков';
      return 'До «' + N.name + '»: ещё ' + fmt(Math.max(0, N.thr - cups)) + ' 🏆';
    };
    const finish = () => {
      if (token !== curToken) return;
      counter.textContent = fmt(res.afterCups);
      const swap = (cls) => {
        tintBar(fill, li1); drawBadge(cv, li1); $('rkResName').textContent = LEAGUES[li1].name;
        cv.className = 'rk-big'; void cv.offsetWidth; cv.classList.add(cls);
        if (cls === 'rk-up') { burst.classList.add('on'); playSound('arena_up'); } else playSound('gameover');
        fill.style.transition = 'none'; fill.style.width = (li1 > li0 ? 0 : frac(res.afterCups, li1) * 100) + '%'; void fill.offsetWidth; fill.style.transition = '';
        fill.style.width = (frac(res.afterCups, li1) * 100) + '%';
      };
      if (li1 > li0) { fill.style.width = '100%'; setTimeout(() => { if (token === curToken) swap('rk-up'); }, 800); }
      else if (li1 < li0) { fill.style.width = '0%'; setTimeout(() => { if (token === curToken) swap('rk-crack'); }, 800); }
      else fill.style.width = (frac(res.afterCups, li1) * 100) + '%';
      $('rkResSub').textContent = subFor(li1, res.afterCups);
      setTimeout(() => {
        if (token !== curToken) return;
        btns.forEach((x) => { x.disabled = false; });
        if (res.rewards.length) showLoot('🏆', 'Новая лига: ' + LEAGUES[li1].name, res.rewards);
      }, (li1 !== li0 ? 1500 : 700));
    };
    setTimeout(() => {
      if (token !== curToken) return;
      let landed = 0;
      if (res.delta > 0) {
        const n = Math.min(12, Math.max(3, Math.ceil(res.delta / 3))), from = center($('rkResScore')), to = center(pill);
        for (let i = 0; i < n; i++) flyOne(from, to, i * 55, 650 + Math.random() * 150, false, token, () => {
          landed++; counter.textContent = fmt(b.cups + Math.round(res.delta * landed / n)); pulse(pill); tick(landed, true);
          if (landed === n) finish();
        });
      } else if (res.delta < 0) {
        const n = Math.min(8, Math.max(2, Math.ceil(-res.delta / 2))), from = center(pill);
        for (let i = 0; i < n; i++) flyOne(from, { x: from.x + (Math.random() - 0.5) * 90, y: from.y + 130 + Math.random() * 40 }, i * 60, 700, true, token, () => {
          landed++; counter.textContent = fmt(b.cups + Math.round(res.delta * landed / n)); pulse(pill); tick(landed, false);
          if (landed === n) finish();
        });
      } else finish();
    }, 500);
  }
  $('rkResAgain').addEventListener('click', () => { curToken++; playSound('click'); rankedStart(); });
  $('rkResLeague').addEventListener('click', () => { curToken++; leaveRanked(); openRankMenu(); });
  $('rkResMenu').addEventListener('click', () => { curToken++; leaveRanked(); origMenu(); });

  // ---------- окно лиги (правила, все лиги, топ игроков) ----------
  const menuEl = document.createElement('div');
  menuEl.id = 'rkMenu'; menuEl.className = 'overlay hidden';
  menuEl.innerHTML = `<div class="notebook-card modal-card">
    <div class="modal-header"><h2>🏆 Лига</h2><div class="stat-pill">🏆 <span id="rkMenuCupsPill">0</span></div></div>
    <div class="scroll-list" id="rkMenuBody"></div>
    <div class="modal-footer"><button id="rkPlay" class="btn btn-primary btn-large">▶ Играть в лиге</button><button id="rkBack" class="btn btn-secondary">⬅ Назад в меню</button></div>
  </div>`;
  wrapEl.appendChild(menuEl);

  function renderMenu() {
    const r = R(), li = leagueOf(r.cups), L = LEAGUES[li], N = LEAGUES[li + 1];
    const hot = r.promo && !r.lock && N;
    $('rkMenuCupsPill').textContent = fmt(r.cups);
    const cal = r.cal.on;
    $('rkMenuCupsPill').textContent = cal ? '?' : fmt(r.cups);
    $('rkPlay').textContent = cal ? '▶ Матч калибровки ' + (r.cal.n + 1) + ' / ' + CALIB_N : hot ? '🔥 Матч повышения' : '▶ Играть в лиге';
    let status;
    if (cal) status = '❓ <b>Калибровка:</b> сыграно <b>' + r.cal.n + ' из ' + CALIB_N + '</b>. После последнего матча игра выдаст звание по среднему результату (возможно любое звание, даже высшее). Кубки пока не меняются.';
    else if (hot) status = '🔥 <b>Матч повышения!</b> Набери не меньше <b>' + fmt(N.bar) + '</b> очков, чтобы войти в «' + N.name + '».' + (r.fails ? ' Неудачных попыток: ' + r.fails + ' из 2.' : '');
    else if (r.promo && r.lock) status = 'Нужен один обычный матч, и можно снова пробовать повышение.';
    else status = 'Планка лиги: <b>' + fmt(L.bar) + '</b>. Больше — кубки растут (до +' + WIN_CAPS[li] + '), меньше — падают (до −' + LOSS_CAPS[li] + ').';
    const protect = r.protect ? '<br>🛡 Защита от вылета: ещё ' + r.protect + ' матч.' : '';
    const bar = Math.round(frac(r.cups, li) * 100);
    const mxl = r.maxL;
    const seasonBox = '<div class="rk-box"><b>Сезон ' + (lgSeasonIdx() + 1) + '</b> · до конца ' + fmtLeft(lgMsLeft()) + '<br>'
      + (cal ? 'Награда сезона откроется после калибровки.' : r.sMatches ? 'Награда сейчас: ' + TROPHY_ICO[mxl] + ' <b>' + TROPHY_NAME[mxl] + '</b>, ' + fmt(200 * (mxl + 1)) + ' 🪙' + (mxl >= 3 ? ' и сундук' : '') + (mxl >= 8 ? ' и скин' : '') : 'Сыграй хотя бы один матч, чтобы получить награду сезона.') + '</div>';
    const cnt = LEAGUES.map(() => 0); r.trophies.forEach((t) => { cnt[t.l]++; });
    const trophyHtml = '<div class="sec-title">Коллекция трофеев</div><div class="rk-trgrid">' + LEAGUES.map((x, i) => '<div class="rk-tr ' + (cnt[i] ? 'on' : '') + '"><canvas data-i="' + i + '" width="84" height="84"></canvas><b>' + TROPHY_NAME[i] + '</b><small>' + (cnt[i] ? '×' + cnt[i] : 'не получен') + '</small></div>').join('') + '</div>';
    const bw = cal ? r.cal.n / CALIB_N * 100 : bar, bc = cal ? CAL_BAR : LEAGUE_BAR[li];
    let html = `<div class="rk-box" style="text-align:center"><canvas class="rk-big" data-i="${cal ? -1 : li}" width="300" height="300"></canvas>
      <div class="rk-name">${cal ? 'Калибровка' : L.name}</div><div class="rk-bar"><i style="width:${bw}%;--b1:${bc[0]};--b2:${bc[1]}"></i></div>
      <div class="rk-sub">${cal ? 'Сыграно ' + r.cal.n + ' из ' + CALIB_N : N ? (hot ? 'Матч повышения готов' : 'До «' + N.name + '»: ещё ' + fmt(Math.max(0, N.thr - r.cups)) + ' 🏆') : 'Высшая лига!'}</div></div>
      <div class="rk-box">${status}${protect}</div>
      ${seasonBox}
      <div class="rk-grid">
        <div class="rk-box"><small>🏆 Кубков</small><br><b>${cal ? '?' : fmt(r.cups)}</b></div><div class="rk-box"><small>🏅 Рекорд кубков</small><br><b>${fmt(r.bestCups)}</b></div>
        <div class="rk-box"><small>🎮 Матчей / побед</small><br><b>${fmt(r.matches)} / ${fmt(r.wins)}</b></div><div class="rk-box"><small>⭐ Лучший счёт</small><br><b>${fmt(r.best)}</b></div>
      </div>
      <div class="rk-box"><b>Правила.</b> Сначала калибровка: ${CALIB_N} матчей без изменения кубков, по среднему результату игра выдаёт стартовое звание — любое, даже высшее. Лига идёт на одной общей Королевской арене, отдельно от обычных арен: без прокачки, бонусов, перков героя, XP и монет. Счёт сравнивается с планкой лиги. <b>Чем выше лига, тем меньше кубков за победу и тем больше теряешь за поражение</b>: в первой лиге до +${WIN_CAPS[0]} / −${LOSS_CAPS[0]}, в высшей до +${WIN_CAPS[8]} / −${LOSS_CAPS[8]}. Три победы подряд дают бонус. Набрав кубки на следующую лигу, сыграй матч повышения: нужна планка следующей лиги. После повышения 2 матча защиты от вылета. Сезон лиги длится 2 недели. В его конце кубки выше 1 500 частично сгорают, а за максимальное звание сезона ты получаешь эксклюзивный трофей (у каждого звания свой), монеты и сундуки. Трофеи копятся в коллекции.</div>
      ${trophyHtml}<div class="sec-title">Все лиги</div>`;
    LEAGUES.forEach((x, i) => {
      html += `<div class="rk-row ${cal ? '' : i === li ? 'cur' : i > li ? 'far' : ''}"><canvas data-i="${i}" width="84" height="84"></canvas><div class="t"><b>${x.name}</b><small>от ${fmt(x.thr)} 🏆 · планка ${fmt(x.bar)}</small></div><div class="cp">+${WIN_CAPS[i]}<br>−${LOSS_CAPS[i]}</div>${!cal && i < li ? '<span>✓</span>' : ''}</div>`;
    });
    html += '<div class="sec-title">Лучшие игроки</div><div id="rkTop" class="rk-sub">Загружаем…</div>';
    const body = $('rkMenuBody');
    body.innerHTML = html;
    body.querySelectorAll('canvas[data-i]').forEach((cv) => drawBadge(cv, Number(cv.dataset.i)));
  }
  async function loadTop() {
    const el = $('rkTop'); if (!el) return;
    try {
      const list = await rpc('dj_ranked_top', { p_limit: 20 });
      const box = $('rkTop'); if (!box) return;
      if (!list || !list.length) { box.textContent = 'Пока пусто — стань первым.'; return; }
      box.className = ''; box.style.cssText = 'display:flex;flex-direction:column;gap:5px';
      box.innerHTML = list.map((p, i) => `<div class="rk-top"><span>${i + 1}</span><span>${escHTML(p.name)}</span><span style="flex:none;width:auto;color:#ffe08a">${fmt(p.cups)} 🏆</span></div>`).join('');
    } catch (e) { const box = $('rkTop'); if (box) box.textContent = 'Нет сети — рейтинг игроков загрузится позже.'; }
  }
  function openRankMenu() {
    if (mode() !== 'league') return;
    playSound('click');
    ensureSeason(false);
    openModal(menuEl, renderMenu);
    loadTop();
    pushToServer();
  }
  $('rkPlay').addEventListener('click', () => { playSound('click'); rankedStart(); });
  $('rkBack').addEventListener('click', () => { playSound('click'); origMenu(); });

  // ---------- кнопка «Правила и топ» в главном меню ----------
  const btn = document.createElement('button');
  btn.id = 'openRankBtn'; btn.className = 'mm-rank';
  btn.innerHTML = '<canvas class="mm-rank-badge" width="88" height="88"></canvas><span class="mm-rank-txt"><b id="rkMenuName"></b><small id="rkMenuSub"></small></span><span class="mm-rank-cups">🏆 <b id="rkMenuCups">0</b></span>';
  window.musicArenaHook = () => (rankedActive || (R().mode === 'league' && gameState === 'MENU')) ? 100 : 0;
  const playBtn = $('startBtn');
  playBtn.parentNode.insertBefore(btn, playBtn.nextSibling);
  btn.addEventListener('click', openRankMenu);
  let menuKey = '';
  function updateMenuBtn() {
    const r = R(), li = leagueOf(r.cups), N = LEAGUES[li + 1], hot = r.promo && !r.lock && N;
    const cal = r.cal.on;
    $('rkMenuName').textContent = cal ? 'Лига: калибровка' : 'Лига: ' + LEAGUES[li].name;
    $('rkMenuSub').textContent = cal ? 'сыграно ' + r.cal.n + ' из ' + CALIB_N + ' · определим звание' : hot ? '🔥 Матч повышения готов!' : N ? 'до «' + N.name + '»: ' + fmt(Math.max(0, N.thr - r.cups)) : 'Высшая лига';
    $('rkMenuCups').textContent = cal ? '?' : fmt(r.cups);
    btn.classList.toggle('hot', !!hot);
    const mk = cal ? 'c' : String(li);
    if (menuKey !== mk) { menuKey = mk; drawBadge(btn.querySelector('canvas'), cal ? -1 : li); }
  }

  R(); ensureSeason(true); configArena(leagueOf(R().cups)); updateMenuBtn(); applyModeUI();
})();
