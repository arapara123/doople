'use strict';
// ==========================================================
// РЕЖИМ «ЛИГА» (рейтинг): отдельно от арен, прокачки, бонусов, XP и монет.
// Подключается после script.js и использует его глобальные функции.
// ==========================================================
(function () {
  const LEAGUES = [
    { name: 'Деревянный меч', thr: 0, bar: 2500, c1: '#c98b4e', c2: '#5a361c', bg: '#7b4a28' },
    { name: 'Стальные мечи', thr: 300, bar: 7000, c1: '#cfd8dc', c2: '#607d8b', bg: '#3f5059' },
    { name: 'Золотые мечи', thr: 700, bar: 13000, c1: '#ffe27a', c2: '#b8860b', bg: '#6a5216' },
    { name: 'Мишень', thr: 1200, bar: 22000, c1: '#d3deea', c2: '#6f86a3', bg: '#3d5a80' },
    { name: 'Молот', thr: 1800, bar: 37000, c1: '#c4b5ee', c2: '#5a4a98', bg: '#4a3b7a' },
    { name: 'Зелье', thr: 2500, bar: 60000, c1: '#b2d0f2', c2: '#4a6fa5', bg: '#1f5f8f' },
    { name: 'Фиолетовый кристалл', thr: 3300, bar: 95000, c1: '#c9dfeb', c2: '#6b8aa3', bg: '#6a2fb0' },
    { name: 'Красная корона', thr: 4200, bar: 150000, c1: '#ffe27a', c2: '#c8890b', bg: '#b3173f' },
    { name: 'Синяя корона', thr: 5200, bar: 230000, c1: '#ffe27a', c2: '#c8890b', bg: '#1f5fcf' }
  ];
  const MAX_CUPS = 7000, WIN_CAP = 35, LOSS_CAP = 15, K = 25;
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
    r.season = typeof r.season === 'string' ? r.season : '';
    if (!Array.isArray(r.claimed)) r.claimed = [0];
    return r;
  }
  function leagueOf(cups) { let i = 0; for (let k = 0; k < LEAGUES.length; k++) if (cups >= LEAGUES[k].thr) i = k; return i; }
  function frac(cups, li) {
    const L = LEAGUES[li], N = LEAGUES[li + 1];
    if (!N) return 1;
    if (R().promo && cups >= N.thr - 1) return 1;
    return Math.max(0, Math.min(1, (cups - L.thr) / (N.thr - L.thr)));
  }

  // ---------- значки лиг (рисуются в коде) ----------
  function sword(c, x, y, rot, k, blade, edge, metal) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(k, k); c.lineWidth = 2 / k;
    c.beginPath(); c.moveTo(0, -36); c.lineTo(5, -28); c.lineTo(5, 0); c.lineTo(-5, 0); c.lineTo(-5, -28); c.closePath();
    c.fillStyle = blade; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, -33); c.lineTo(5, -28); c.lineTo(5, 0); c.lineTo(0, 0); c.closePath(); c.fillStyle = edge; c.fill();
    c.beginPath(); c.roundRect(-11, 0, 22, 5, 2); c.fillStyle = metal; c.fill(); c.stroke();
    c.beginPath(); c.roundRect(-2.6, 5, 5.2, 11, 1.5); c.fillStyle = '#6d4c41'; c.fill(); c.stroke();
    c.beginPath(); c.arc(0, 18, 3.4, 0, 6.283); c.fillStyle = metal; c.fill(); c.stroke();
    c.restore();
  }
  function crown(c, fill, band, gem, tips) {
    c.beginPath(); c.moveTo(22, 70); c.lineTo(18, 32); c.lineTo(35, 50); c.lineTo(50, 24); c.lineTo(65, 50); c.lineTo(82, 32); c.lineTo(78, 70); c.closePath();
    c.fillStyle = fill; c.fill(); c.stroke();
    c.beginPath(); c.roundRect(22, 62, 56, 11, 3); c.fillStyle = band; c.fill(); c.stroke();
    c.beginPath(); c.arc(50, 67.5, 3.6, 0, 6.283); c.fillStyle = gem; c.fill(); c.stroke();
    if (tips) for (const p of [[18, 31], [50, 23], [82, 31]]) { c.beginPath(); c.arc(p[0], p[1], 3.6, 0, 6.283); c.fillStyle = gem; c.fill(); c.stroke(); }
  }
  const EMBLEM = [
    (c) => sword(c, 50, 58, 0, 1.3, '#e9a35c', '#f7cb92', '#8a5a2b'),
    (c) => { sword(c, 30, 78, 0.78, 1.05, '#cfd8dc', '#eceff1', '#78909c'); sword(c, 70, 78, -0.78, 1.05, '#cfd8dc', '#eceff1', '#78909c'); },
    (c) => { sword(c, 50, 74, 0, 1.2, '#ffd54f', '#fff0a8', '#c8890b'); sword(c, 30, 78, 0.78, 1.05, '#ffd54f', '#fff0a8', '#c8890b'); sword(c, 70, 78, -0.78, 1.05, '#ffd54f', '#fff0a8', '#c8890b'); },
    (c) => {
      for (const q of [[30, '#f3e9d8'], [23, '#d32f2f'], [15.5, '#f3e9d8'], [8, '#d32f2f']]) { c.beginPath(); c.arc(50, 54, q[0], 0, 6.283); c.fillStyle = q[1]; c.fill(); c.stroke(); }
      c.lineWidth = 3; c.strokeStyle = '#8d6e63'; c.beginPath(); c.moveTo(82, 22); c.lineTo(54, 52); c.stroke();
      c.strokeStyle = '#1a1a1a'; c.lineWidth = 1.8; c.fillStyle = '#ff4fa3';
      c.beginPath(); c.moveTo(82, 22); c.lineTo(90, 16); c.lineTo(88, 28); c.closePath(); c.fill(); c.stroke();
    },
    (c) => {
      c.save(); c.translate(50, 56); c.rotate(0.45); c.translate(-50, -56);
      c.beginPath(); c.roundRect(46, 46, 8, 38, 3); c.fillStyle = '#a0643a'; c.fill(); c.stroke();
      c.beginPath(); c.roundRect(24, 20, 52, 30, 5); c.fillStyle = '#b8c0c8'; c.fill(); c.stroke();
      c.fillStyle = '#8d98a3'; c.fillRect(30, 20, 5, 30); c.fillRect(65, 20, 5, 30);
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(38, 24, 24, 4);
      c.restore();
    },
    (c) => {
      c.beginPath(); c.roundRect(42, 24, 16, 18, 3); c.fillStyle = '#d8ecff'; c.fill(); c.stroke();
      c.beginPath(); c.arc(50, 64, 24, 0, 6.283); c.fillStyle = '#d8ecff'; c.fill(); c.stroke();
      c.save(); c.beginPath(); c.arc(50, 64, 22, 0, 6.283); c.clip(); c.fillStyle = '#2a7bff'; c.fillRect(20, 58, 60, 40); c.restore();
      c.beginPath(); c.roundRect(41, 14, 18, 11, 3); c.fillStyle = '#c58b4e'; c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(40, 58, 3.5, 8, 0.3, 0, 6.283); c.fill();
    },
    (c) => {
      const P = [[50, 14], [78, 36], [70, 76], [50, 90], [30, 76], [22, 36]];
      c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < 6; i++) c.lineTo(P[i][0], P[i][1]); c.closePath(); c.fillStyle = '#a45cf2'; c.fill(); c.stroke();
      const tri = (a, b, d, col) => { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fillStyle = col; c.fill(); };
      tri(P[0], P[1], [50, 52], '#d0a2ff'); tri(P[0], P[5], [50, 52], '#8a3fe0'); tri(P[1], P[2], [50, 52], '#7a2fd0'); tri(P[2], P[3], [50, 52], '#5e1fb0'); tri(P[3], P[4], [50, 52], '#8a3fe0'); tri(P[4], P[5], [50, 52], '#6a2fc0');
    },
    (c) => crown(c, '#ffcf4a', '#ffb300', '#e53935', false),
    (c) => crown(c, '#ffd966', '#ffc107', '#29b6f6', true)
  ];
  function drawBadge(cv, idx) {
    const c = cv.getContext('2d'), L = LEAGUES[idx];
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    c.scale(cv.width / 100, cv.height / 100);
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = '#1a1a1a'; c.lineWidth = 2;
    const shield = () => {
      c.beginPath(); c.moveTo(14, 6); c.lineTo(86, 6); c.quadraticCurveTo(94, 6, 94, 14); c.lineTo(94, 60);
      c.quadraticCurveTo(94, 76, 50, 97); c.quadraticCurveTo(6, 76, 6, 60); c.lineTo(6, 14); c.quadraticCurveTo(6, 6, 14, 6); c.closePath();
    };
    const g = c.createLinearGradient(0, 0, 0, 100); g.addColorStop(0, L.c1); g.addColorStop(1, L.c2);
    shield(); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.stroke(); c.lineWidth = 2;
    c.save(); c.translate(50, 50); c.scale(0.84, 0.84); c.translate(-50, -50);
    shield(); c.fillStyle = L.bg; c.fill(); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.13)'; c.fillRect(0, 0, 100, 38);
    c.restore();
    c.save(); c.translate(50, 50); c.scale(0.86, 0.86); c.translate(-50, -50);
    EMBLEM[idx](c);
    c.restore();
  }

  // ---------- сезон ----------
  function ensureSeason(noLoot) {
    const r = R(), key = seasonKeyNow();
    if (!r.season) { r.season = key; return; }
    if (r.season === key) return;
    const views = [], mx = r.maxL;
    views.push(grantReward({ t: 'coins', n: 200 * (mx + 1) }));
    if (mx >= 3) views.push(grantReward({ t: 'chest', k: mx >= 6 ? 'epic' : 'rare' }));
    if (mx >= 8) { const s = randomSkin(['mythic', 'arcana', 'epic']); if (s) views.push(grantReward({ t: 'skin', id: s.id })); }
    if (r.cups > 1500) r.cups = Math.floor(1500 + (r.cups - 1500) / 2);
    r.promo = false; r.lock = false; r.fails = 0; r.protect = 0; r.streak = 0;
    r.maxL = leagueOf(r.cups); r.season = key;
    writeSaveData();
    if (noLoot) metaToast('🏆', 'Сезон лиги закончился', 'Награда за максимальную лигу выдана');
    else setTimeout(() => showLoot('🏆', 'Сезон лиги завершён', views), 350);
  }

  // ---------- подсчёт матча ----------
  function settle(sc, secs) {
    const r = R(); ensureSeason(true);
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
      let d = sc <= 0 ? -LOSS_CAP : K * Math.log2(sc / L.bar);
      d = Math.round(Math.max(-LOSS_CAP, Math.min(WIN_CAP, d)));
      if (d > 0) { r.wins++; r.streak++; if (r.streak >= 3) { d += 5; r.streak = 0; res.bonus = 5; res.notes.push('🔥 Серия из 3 побед: +5 кубков'); } }
      else if (d < 0) r.streak = 0;
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
    if (!N || !N.id || !N.secret || !r.unsent) return;
    try {
      await rpc('dj_ranked_report', { p_id: N.id, p_secret: N.secret, p_cups: r.cups, p_best: r.best, p_secs: Math.floor(r.unsentSecs), p_matches: r.unsent });
      r.unsent = 0; r.unsentSecs = 0; writeSaveData();
    } catch (e) {}
  }
  function pushToServer() { netSync(false).then(report).catch(() => {}); }
  window.addEventListener('online', () => setTimeout(report, 800));

  // ---------- режим матча ----------
  let rankedActive = false, rankedLive = false, pendingRanked = false, rankedPromo = false, curToken = 0;
  const NO = {};
  const RANKED_ARENA = Object.assign({}, ARENAS[5], { id: 100, name: 'Арена лиги', icon: '🏆', ambient: ARENAS[5].ambient });
  const origArena = getCurrentArena, origPerk = getPerk, origUpg = upgLevel, origBoosts = applyStartBoosts;
  const origCoins = gainCoins, origXP = addXP, origTGO = triggerGameOver, origStart = startGame, origMenu = showMainMenu, origUAU = updateAllUI;

  function configArena(i) {
    const A = RANKED_ARENA;
    A.diff = 0.6 + i * 0.15; A.monsterRate = 1 + i * 0.08; A.platSpeed = 1.6 + i * 0.25;
    A.wind = i >= 2 ? 0.3 + (i - 2) * 0.12 : 0; A.slip = i >= 4 ? 0.03 : 0;
    A.hazard = i >= 7 ? 'both' : i >= 5 ? 'lightning' : i >= 3 ? 'faller' : null;
    A.hazardLook = 'crystal';
    A.monsters = i < 3 ? ['blot', 'eraser', 'bat'] : i < 6 ? ['drone', 'harpy', 'imp'] : ['voideye', 'riftling', 'oni'];
  }
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
    const r = R(); ensureSeason(true);
    const li = leagueOf(r.cups);
    rankedPromo = !!(r.promo && !r.lock && LEAGUES[li + 1]);
    configArena(rankedPromo ? li + 1 : li);
    challenge = null;
    rankedActive = true; rankedLive = true; pendingRanked = true;
    startGame();
    setPauseUI(true);
    EV_KEY = ''; coins.forEach((c) => { c.ev = false; });
    hudRefs.arena.textContent = rankedPromo ? 'Повышение' : 'Лига: ' + LEAGUES[li].name;
    hudLast.arena = saveData.selectedArena;
    showToastText(rankedPromo ? '🔥 Матч повышения: набери ' + fmt(LEAGUES[li + 1].bar) : '🏆 Планка лиги: ' + fmt(LEAGUES[li].bar));
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
      metaToast('🏆', 'Матч прерван', (res.delta > 0 ? '+' : '') + res.delta + ' кубков');
      if (res.rewards.length) setTimeout(() => showLoot('🏆', 'Награда лиги', res.rewards), 500);
      pushToServer();
    }
    leaveRanked();
    return origMenu.apply(this, arguments);
  };
  $('startBtn').addEventListener('click', () => { leaveRanked(); }, true);
  window.updateAllUI = function () { origUAU(); try { updateMenuBtn(); } catch (e) {} };

  // ---------- экран результата ----------
  const css = document.createElement('style');
  css.textContent = `
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
  .rk-bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#ffd54f,#ff9800);box-shadow:0 0 10px rgba(255,179,0,.6);transition:width .8s cubic-bezier(.2,.8,.2,1)}
  .rk-sub{font-size:12.5px;color:#d2d8f2;text-align:center;font-weight:700;line-height:1.4}
  .rk-box{padding:9px 11px;border-radius:14px;background:#1b2139;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);font-size:12px;line-height:1.45;color:#b6bfe3;text-align:left;flex-shrink:0}
  .rk-box b{color:#fff}
  .rk-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;flex-shrink:0}
  .rk-row{display:flex;align-items:center;gap:10px;padding:6px 10px 6px 6px;border-radius:14px;background:#1b2139;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);text-align:left;flex-shrink:0}
  .rk-row canvas{width:42px;height:42px;flex-shrink:0}
  .rk-row .t{flex:1;min-width:0}.rk-row .t b{display:block;font-size:13px;color:#fff}.rk-row .t small{font-size:11px;color:#9aa3c7;font-weight:700}
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
  `;
  document.head.appendChild(css);

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

  function showResult(res) {
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
    drawBadge(cv, li0); burst.classList.remove('on'); cv.className = 'rk-big';
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
        drawBadge(cv, li1); $('rkResName').textContent = LEAGUES[li1].name;
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

  // ---------- окно лиги ----------
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
    $('rkPlay').textContent = hot ? '🔥 Матч повышения' : '▶ Играть в лиге';
    let status;
    if (hot) status = '🔥 <b>Матч повышения!</b> Набери не меньше <b>' + fmt(N.bar) + '</b> очков, чтобы войти в «' + N.name + '».' + (r.fails ? ' Неудачных попыток: ' + r.fails + ' из 2.' : '');
    else if (r.promo && r.lock) status = 'Нужен один обычный матч, и можно снова пробовать повышение.';
    else status = 'Планка лиги: <b>' + fmt(L.bar) + '</b>. Больше — кубки растут, меньше — падают.';
    const protect = r.protect ? '<br>🛡 Защита от вылета: ещё ' + r.protect + ' матч.' : '';
    const bar = Math.round(frac(r.cups, li) * 100);
    let html = `<div class="rk-box" style="text-align:center"><canvas class="rk-big" data-i="${li}" width="300" height="300"></canvas>
      <div class="rk-name">${L.name}</div><div class="rk-bar"><i style="width:${bar}%"></i></div>
      <div class="rk-sub">${N ? (hot ? 'Матч повышения готов' : 'До «' + N.name + '»: ещё ' + fmt(Math.max(0, N.thr - r.cups)) + ' 🏆') : 'Высшая лига!'}</div></div>
      <div class="rk-box">${status}${protect}</div>
      <div class="rk-grid">
        <div class="rk-box"><small>🏆 Кубков</small><br><b>${fmt(r.cups)}</b></div><div class="rk-box"><small>🏅 Рекорд кубков</small><br><b>${fmt(r.bestCups)}</b></div>
        <div class="rk-box"><small>🎮 Матчей / побед</small><br><b>${fmt(r.matches)} / ${fmt(r.wins)}</b></div><div class="rk-box"><small>⭐ Лучший счёт</small><br><b>${fmt(r.best)}</b></div>
      </div>
      <div class="rk-box"><b>Правила.</b> Лига идёт отдельно от арен: без прокачки, бонусов, перков героя, XP и монет. Счёт сравнивается с планкой лиги: выше — до +${WIN_CAP} кубков, ниже — до −${LOSS_CAP}. Три победы подряд дают +5. Набрав кубки на следующую лигу, сыграй матч повышения: нужна планка следующей лиги. После повышения 2 матча защиты от вылета. Раз в месяц кубки выше 1 500 сжимаются вдвое, а за высшую лигу сезона дают награду.</div>
      <div class="sec-title">Все лиги</div>`;
    LEAGUES.forEach((x, i) => {
      html += `<div class="rk-row ${i === li ? 'cur' : i > li ? 'far' : ''}"><canvas data-i="${i}" width="84" height="84"></canvas><div class="t"><b>${x.name}</b><small>от ${fmt(x.thr)} 🏆 · планка ${fmt(x.bar)}</small></div>${i < li ? '<span>✓</span>' : ''}</div>`;
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
    playSound('click');
    ensureSeason(false);
    openModal(menuEl, renderMenu);
    loadTop();
    pushToServer();
  }
  $('rkPlay').addEventListener('click', () => { playSound('click'); rankedStart(); });
  $('rkBack').addEventListener('click', () => { playSound('click'); origMenu(); });

  // ---------- кнопка в главном меню ----------
  const btn = document.createElement('button');
  btn.id = 'openRankBtn'; btn.className = 'mm-rank';
  btn.innerHTML = '<canvas class="mm-rank-badge" width="88" height="88"></canvas><span class="mm-rank-txt"><b id="rkMenuName"></b><small id="rkMenuSub"></small></span><span class="mm-rank-cups">🏆 <b id="rkMenuCups">0</b></span>';
  const playBtn = $('startBtn');
  playBtn.parentNode.insertBefore(btn, playBtn.nextSibling);
  btn.addEventListener('click', openRankMenu);
  let menuKey = '';
  function updateMenuBtn() {
    const r = R(), li = leagueOf(r.cups), N = LEAGUES[li + 1], hot = r.promo && !r.lock && N;
    $('rkMenuName').textContent = 'Лига: ' + LEAGUES[li].name;
    $('rkMenuSub').textContent = hot ? '🔥 Матч повышения готов!' : N ? 'до «' + N.name + '»: ' + fmt(Math.max(0, N.thr - r.cups)) : 'Высшая лига';
    $('rkMenuCups').textContent = fmt(r.cups);
    btn.classList.toggle('hot', !!hot);
    if (menuKey !== String(li)) { menuKey = String(li); drawBadge(btn.querySelector('canvas'), li); }
  }
  R(); updateMenuBtn();
})();
