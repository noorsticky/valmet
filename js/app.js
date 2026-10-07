/* =====================================================================
   Motor: tidslinje, kamera, "hoppa in"-portal, scen-API, spola tillbaka.
   Innehållet ligger i story.js.
   ===================================================================== */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const val = (v, s) => (typeof v === 'function' ? v(s) : v);
  const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = (ms) => (REDUCED ? Math.round(ms * 0.35) : ms);

  const ROW = 290;        // lodrätt avstånd mellan punkterna (px i världen)
  // Smal skärm (mobil): alla plattformar till höger om linjen, större text, kameran följer i sidled
  const compact = () => innerWidth < 720;
  const platX = () => (compact() ? 210 : 270);   // plattformens mitt, avstånd från linjen
  const sideX = () => (compact() ? 380 : 600);   // sidospårets linje (till höger om huvudlinjen)
  const VIDEO_ENVS = { sovrum: 'assets/video/sovrum.mp4', kontor: 'assets/video/kontor.mp4', fika: 'assets/video/fika.mp4', lunch: 'assets/video/lunch.mp4', korridor: 'assets/video/korridor.mp4', larm: 'assets/video/larm.mp4', mote: 'assets/video/mote.mp4' };
  const POSTERS = { sovrum: 'assets/img/sovrum.jpg', kontor: 'assets/img/kontor.jpg', fika: 'assets/img/fika.jpg', lunch: 'assets/img/lunch.jpg', korridor: 'assets/img/korridor.jpg', larm: 'assets/img/larm.jpg', mote: 'assets/img/mote.jpg', spegel: 'assets/img/sovrum.jpg' };

  /* ------------------------------------------------------------ state */
  const freshState = () => ({
    choices: {}, snooze: 0, track: null, played: [], persona: null,
    rewound: false, firstA: null, triedA: [], accident: false, phase: 'normal',
  });
  let state = freshState();
  const nodes = STORY.nodes;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const isVisible = (n) => !n.track || state.track === n.track;
  const visibleNodes = () => nodes.filter(isVisible);
  const isPlayed = (n) => state.played.includes(n.id);
  const nextNode = () => visibleNodes().find((n) => !isPlayed(n));

  /* ------------------------------------------------------------ DOM */
  const el = {
    intro: $('#intro'), timeline: $('#timeline'), scene: $('#scene'),
    viewport: $('#tlViewport'), world: $('#tlWorld'), lines: $('#tlLines'), nodes: $('#tlNodes'), banner: $('#tlBanner'),
    sceneWorld: $('#sceneWorld'), stage: $('#stage'), env: $('#env'), hotspots: $('#hotspots'),
    hud: $('#hud'), hudClock: $('#hudClock'), hudProgress: $('#hudProgress'), hudName: $('#hudName'), hudRole: $('#hudRole'), hudAvatar: $('#hudAvatar'),
    titlecard: $('#titlecard'), tcTime: $('#tcTime'), tcPlace: $('#tcPlace'),
    captions: $('#captions'), memory: $('#memory'), choice: $('#choice'), panelHost: $('#panelHost'),
    fxTint: $('#fxTint'), eyelids: $('#eyelids'), skip: $('#skipBtn'), rewind: $('#rewind'), rewindClock: $('#rewindClock'),
  };

  /* ===================================================================
     MILJÖER (env) – samma byggare används för scen och för nodens portal
     =================================================================== */
  function person(x, y, s, cls = '') {
    return `<div class="person ${cls}" style="left:${x}%;top:${y}%;--s:${s}"><i class="person__head"></i><i class="person__body"></i></div>`;
  }

  const ENV_HTML = {
    bil: (v) => `
      <div class="bil ${v === 'dusk' ? 'bil--dusk' : ''}">
        <div class="bil__sky"></div><div class="bil__sun"></div>
        <div class="bil__hills"></div><div class="bil__trees"></div>
        <div class="bil__road"></div>
        <div class="bil__dashes"><i></i><i></i><i></i><i></i></div>
        <div class="bil__posts"><i></i><i></i><i></i></div>
        <div class="bil__cabin">
          <div class="bil__pillar bil__pillar--l"></div><div class="bil__pillar bil__pillar--r"></div>
          <div class="bil__roof"></div><div class="bil__mirror"></div>
          <div class="bil__dash"></div><div class="bil__wheel"></div><div class="bil__radio">P4 · 103.3</div>
        </div>
      </div>`,
    fabrik: (v) => `
      <div class="fab ${v === 'alarm' ? 'fab--alarm' : ''}">
        <div class="fab__bg"></div>
        <div class="fab__lamps"><i></i><i></i><i></i></div>
        <div class="fab__floor"></div>
        <div class="fab__machine">
          <div class="fab__body"></div>
          <div class="fab__roller"></div><div class="fab__roller fab__roller--2"></div>
          <div class="fab__hazard"></div>
          <div class="fab__guard"></div>
          <div class="fab__gap"></div>
          <div class="fab__panel"><i></i><i></i><i></i></div>
        </div>
        <div class="fab__steam"><i></i><i></i><i></i></div>
        ${person(20, 90, 1.7, 'p--worker')}${person(82, 94, 1.8, 'p--worker p--old')}
        <div class="fab__beacon"></div>
      </div>`,
    spegel: () => `
      <div class="spegel">
        <video class="env__video spegel__bg" src="${VIDEO_ENVS.sovrum}" muted playsinline loop autoplay preload="auto"></video>
        <div class="spegel__frame"><div class="spegel__glass"></div></div>
      </div>`,
    summary: () => `<div class="summ"><i></i><i></i><i></i></div>`,
  };

  function buildEnv(host, name, variant, { thumb = false, live = false } = {}) {
    host.innerHTML = '';
    if (host.dataset.base == null) host.dataset.base = host.className.split(' ').filter((c) => c && !c.startsWith('env')).join(' ');
    host.className = `${host.dataset.base} env env--${name} ${variant ? 'env--' + variant : ''}`;
    if (VIDEO_ENVS[name]) {
      if (thumb && !live) {
        host.appendChild(Object.assign(h('img', 'env__video'), { src: POSTERS[name], alt: '' }));
      } else {
        const v = h('video', 'env__video');
        Object.assign(v, { src: VIDEO_ENVS[name], muted: true, loop: true, autoplay: true, playsInline: true, preload: 'auto' });
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        if (POSTERS[name]) v.poster = POSTERS[name];
        host.appendChild(v);
        v.play().catch(() => {});
      }
      // ljussättning ovanpå filmen: dim (dovare), dark (kvällsmöte), warm (eftermiddagsljus)
      if (variant) host.appendChild(h('div', `env__tone env__tone--${variant}`));
    } else if (ENV_HTML[name]) {
      host.innerHTML = ENV_HTML[name](variant);
      if (thumb) $$('video', host).forEach((v) => v.remove());
      $$('video', host).forEach((v) => { v.muted = true; v.play().catch(() => {}); });
    }
  }

  /* ===================================================================
     TIDSLINJE
     =================================================================== */
  const cam = { x: 0, y: 0, s: 1 };
  let layout = {};

  function computeLayout() {
    layout = {};
    let m = 0;
    visibleNodes().forEach((n, i) => {
      const side = n.lane === 'side';
      const dir = side || compact() ? 1 : (m++ % 2 === 0 ? 1 : -1);   // huvudlinjen växlar höger/vänster
      const x = side ? sideX() : 0;
      const y = i * ROW;
      layout[n.id] = { x, y, dir, px: x + dir * platX(), py: y };
    });
  }
  const hasSide = () => visibleNodes().some((n) => n.lane === 'side');

  function renderTimeline() {
    computeLayout();
    const next = nextNode();
    const existing = Object.fromEntries($$('.node', el.nodes).map((e) => [e.dataset.id, e]));

    nodes.forEach((n) => {
      let e = existing[n.id];
      const visible = isVisible(n);
      if (!visible) { if (e && !e.classList.contains('is-dissolving')) e.remove(); return; }
      const pos = layout[n.id];
      const played = isPlayed(n);
      const isNext = next && next.id === n.id;
      const culprit = state.phase === 'rewind' && n.id === 'n0730';
      const known = played || isNext || culprit || n.lane === 'side';
      const badge = val(n.badge, state);
      const sig = [val(n.title, state), badge, val(n.prop, state), played, isNext, known, culprit, pos.dir].join('|');

      if (!e) {
        e = h('button', 'node is-new');
        e.dataset.id = n.id;
        e.type = 'button';
        e.addEventListener('click', () => onNodeClick(n));
        el.nodes.appendChild(e);
        requestAnimationFrame(() => requestAnimationFrame(() => e.classList.remove('is-new')));
      }
      e.style.left = pos.x + 'px';
      e.style.top = pos.y + 'px';
      if (e.dataset.sig !== sig) {
        e.dataset.sig = sig;
        e.className = `node node--${n.kind} ${pos.dir < 0 ? 'node--left' : 'node--right'} ${n.lane === 'side' ? 'node--side' : ''} ${e.classList.contains('is-new') ? 'is-new' : ''}`;
        e.classList.toggle('is-played', played);
        e.classList.toggle('is-next', !!isNext);
        e.classList.toggle('is-future', !known);
        e.classList.toggle('is-culprit', culprit);
        e.innerHTML = `
          <span class="node__arm"></span>
          <span class="node__dot"></span>
          <span class="node__label">
            <span class="node__pill">kl ${n.time.replace('Dagens slut', '17:00')}</span>
            <span class="node__title">${known ? val(n.title, state) : ''}</span>
            ${isNext || culprit ? `<span class="node__cta">${culprit ? 'Hoppa tillbaka' : 'Hoppa in'}</span>` : ''}
          </span>
          <span class="node__plat">
            <span class="node__disc"></span>
            <span class="node__prop">${PROPS.html(val(n.prop, state))}</span>
          </span>`;
        e.setAttribute('aria-label', `kl ${n.time} ${known ? val(n.title, state) : 'okänd händelse'}`);
        e.disabled = !(isNext || culprit);
      }
    });
    drawLines();
    renderProgress();
  }

  function drawLines() {
    const main = visibleNodes().filter((n) => n.lane === 'main');
    const first = layout[main[0].id], last = layout[main[main.length - 1].id];
    let segs = `<line class="track" x1="0" y1="${first.y - ROW * 0.8}" x2="0" y2="${last.y + ROW * 0.6}"/>`;
    // spelad del av linjen: från 06:00 fram till den senast spelade punkten
    const lastPlayed = [...main].reverse().find(isPlayed);
    if (lastPlayed) segs += `<line class="seg done" x1="0" y1="${first.y}" x2="0" y2="${layout[lastPlayed.id].y}"/>`;
    if (!el.lines.firstChild) el.lines.innerHTML = '<g id="segs"></g><g id="branch"></g>';
    $('#segs', el.lines).innerHTML = segs;

    const side = visibleNodes().filter((n) => n.lane === 'side');
    const g = $('#branch', el.lines);
    if (!side.length) { g.innerHTML = ''; return; }
    const s0 = layout.n0730, e0 = layout.n1614;
    const f = layout[side[0].id], l = layout[side[side.length - 1].id];
    const X = sideX();
    const d = `M 0 ${s0.y} C 0 ${s0.y + ROW * 0.7}, ${X} ${f.y - ROW * 1.1}, ${X} ${f.y - ROW * 0.35} L ${X} ${l.y + ROW * 0.35} C ${X} ${l.y + ROW * 1.1}, 0 ${e0.y - ROW * 0.7}, 0 ${e0.y}`;
    let bp = $('#branchPath', g);
    if (bp && bp.getAttribute('d') === d) return;
    g.innerHTML = `<path class="branch" id="branchPath" d="${d}"/>`;
    bp = $('#branchPath', g);
    const len = bp.getTotalLength();
    bp.style.strokeDasharray = `${len}`;
    if (!el.timeline.dataset.branchShown) {
      // sidospåret växer fram från 07:30
      bp.style.strokeDashoffset = len;
      el.timeline.dataset.branchShown = '1';
      setTimeout(() => { bp.style.transition = `stroke-dashoffset ${T(1800)}ms ease`; bp.style.strokeDashoffset = 0; }, T(900));
    }
  }

  function renderProgress() {
    el.hudProgress.innerHTML = visibleNodes().map((n) =>
      `<i class="pdot pdot--${n.kind} ${isPlayed(n) ? 'is-done' : ''} ${current && current.id === n.id ? 'is-now' : ''}" title="${n.time}"></i>`).join('');
  }

  /* ------------------------------------------------------------ kamera */
  function focusPoint() { return { cx: window.innerWidth / 2, cy: window.innerHeight * 0.5 }; }
  // grundskala så att hela bredden (linje + plattformar) får plats även på mobil
  function baseScale() {
    // mobil: etikett (≈170) + plattform (≈310) får plats; sidospåret nås genom att kameran följer med
    const need = compact() ? 530 : hasSide() ? (sideX() + platX() + 200) * 2 : (platX() + 200) * 2;
    return Math.max(0.36, Math.min(1.1, (innerWidth - 32) / need, innerHeight / 820));
  }

  function setCam(x, y, s, ms = 900, ease = 'cubic-bezier(.65,0,.25,1)') {
    Object.assign(cam, { x, y, s });
    const { cx, cy } = focusPoint();
    const k = s * baseScale();
    el.world.style.transition = ms ? `transform ${T(ms)}ms ${ease}` : 'none';
    el.world.style.transform = `translate(${cx - x * k}px, ${cy - y * k}px) scale(${k})`;
    if (!ms) void el.world.offsetWidth;
    return sleep(ms ? T(ms) : 0);
  }
  // vilken x-position kameran ska centrera på för en linje (huvudlinje eller sidospår)
  const centerX = (laneX = 0) => (compact() ? laneX + 70 : hasSide() ? sideX() * 0.5 : 0);
  // kameran: följ punkten lodrätt, håll linjen (och ev. sidospår) i bild
  const camTo = (id, s = 1, ms, ease) => {
    const p = layout[id];
    return setCam(centerX(p.x), p.y + 30, s, ms, ease);
  };
  // kameran centrerad på en plattform (används vid hopp in/ut)
  const camPlat = (id, s, ms, ease) => { const p = layout[id]; return setCam(p.px, p.py - 40, s, ms, ease); };

  // dra för att panorera
  (function enableDrag() {
    let drag = null;
    el.viewport.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.node')) return;
      drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
      el.viewport.setPointerCapture(e.pointerId);
    });
    el.viewport.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const k = cam.s * baseScale();
      const dx = (e.clientX - drag.x) / k, dy = (e.clientY - drag.y) / k;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      setCam(drag.cx - dx, drag.cy - dy, cam.s, 0);
    });
    el.viewport.addEventListener('pointerup', () => { drag = null; });
    el.viewport.addEventListener('wheel', (e) => {
      if (busy) return;
      e.preventDefault();
      const k = cam.s * baseScale();
      setCam(cam.x + e.deltaX / k, cam.y + e.deltaY / k, cam.s, 0);
    }, { passive: false });
  })();

  function banner(html, cls = '') {
    el.banner.className = `tl-banner ${cls}`;
    el.banner.innerHTML = html || '';
    el.banner.classList.toggle('is-on', !!html);
  }

  /* ===================================================================
     PORTAL – "hoppa in" i en punkt / "kliva ut" ur den
     =================================================================== */
  let busy = false;
  let current = null;

  function show(layer, on) { layer.classList.toggle('is-active', on); }

  async function enterNode(n, { rewind = false } = {}) {
    if (busy) return;
    busy = true;
    current = n;
    banner('');
    SFX.unlock();

    // 1. Kameran söker sig mot punkten
    await camPlat(n.id, 1.35, 700, 'cubic-bezier(.5,0,.3,1)');
    const disc = $(`.node[data-id="${n.id}"] .node__disc`);
    const r = disc.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, rx = r.width / 2, ry = r.height / 2;
    const R = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 20;
    const rad = rx;

    // 2. Bygg scenen bakom portalen
    prepareScene(n);
    show(el.scene, true);
    el.scene.style.clipPath = `ellipse(${rx}px ${ry}px at ${cx}px ${cy}px)`;
    $(`.node[data-id="${n.id}"]`).classList.add('is-diving');

    // 3. Fall in
    SFX.play('whooshIn');
    const ms = T(1150);
    const portal = $('#portal');
    portal.style.left = cx + 'px'; portal.style.top = cy + 'px'; portal.style.width = rx * 2 + 'px'; portal.style.height = ry * 2 + 'px';
    portal.classList.add('is-on');
    const scaleTo = (R / rad) * 1.02;
    const anims = [
      el.scene.animate([{ clipPath: `ellipse(${rx}px ${ry}px at ${cx}px ${cy}px)` }, { clipPath: `ellipse(${R}px ${R}px at ${cx}px ${cy}px)` }],
        { duration: ms, easing: 'cubic-bezier(.8,0,.2,1)', fill: 'forwards' }),
      el.sceneWorld.animate([{ transform: 'scale(1.9)', filter: 'blur(10px) brightness(1.4) saturate(1.3)' }, { transform: 'scale(1.06)', filter: 'blur(0) brightness(1) saturate(1)', offset: 0.85 }, { transform: 'scale(1)', filter: 'none' }],
        { duration: ms * 1.25, easing: 'cubic-bezier(.3,.6,.2,1)' }),
      portal.animate([{ transform: 'translate(-50%,-50%) scale(1, 1)', opacity: 1 }, { transform: `translate(-50%,-50%) scale(${scaleTo}, ${scaleTo * rx / ry})`, opacity: 0.0 }],
        { duration: ms, easing: 'cubic-bezier(.8,0,.2,1)', fill: 'forwards' }),
      el.viewport.animate([{ filter: 'blur(0)' }, { filter: 'blur(6px)' }], { duration: ms, fill: 'forwards' }),
    ];
    setCam(cam.x, cam.y, 4, ms / (REDUCED ? 0.35 : 1), 'cubic-bezier(.8,0,.2,1)');
    if (rewind) el.rewind.classList.remove('is-on');
    await anims[0].finished;
    el.scene.style.clipPath = 'none';
    anims.forEach((a) => a.cancel());
    portal.classList.remove('is-on');
    $$('.node.is-diving').forEach((x) => x.classList.remove('is-diving'));
    show(el.timeline, false);
    busy = false;

    await runScene(n);
  }

  async function exitScene(n) {
    busy = true;
    SFX.stopAll();
    SFX.play('whooshOut');
    show(el.timeline, true);
    renderTimeline();
    // räkna ut var plattformen hamnar när kameran landat, och krymp scenen dit
    await camPlat(n.id, 1, 0);
    const r = $(`.node[data-id="${n.id}"] .node__disc`).getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, rx = r.width / 2, ry = r.height / 2;
    await camPlat(n.id, 4, 0);
    const R = Math.hypot(innerWidth, innerHeight);
    const ms = T(1000);
    const anims = [
      el.scene.animate([{ clipPath: `ellipse(${R}px ${R}px at ${cx}px ${cy}px)` }, { clipPath: `ellipse(${rx}px ${ry}px at ${cx}px ${cy}px)`, offset: 0.92 }, { clipPath: `ellipse(0px 0px at ${cx}px ${cy}px)` }],
        { duration: ms, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }),
      el.sceneWorld.animate([{ transform: 'scale(1)', filter: 'none' }, { transform: 'scale(1.5)', filter: 'blur(6px) brightness(1.3)' }],
        { duration: ms, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }),
      el.viewport.animate([{ filter: 'blur(6px)' }, { filter: 'blur(0)' }], { duration: ms }),
    ];
    camPlat(n.id, 1, ms / (REDUCED ? 0.35 : 1), 'cubic-bezier(.7,0,.3,1)');
    await anims[0].finished;
    show(el.scene, false);
    anims.forEach((a) => a.cancel());
    el.scene.style.clipPath = '';
    cleanupScene();
    current = null;
    busy = false;
  }

  /* ===================================================================
     SCEN
     =================================================================== */
  let fast = false;
  // "Läs i egen takt" (WCAG 2.2.1): repliker väntar på klick och valet kl 07:30 får ingen tidsgräns
  let selfPaced = false;
  try { selfPaced = localStorage.getItem('pp_selfpaced') === '1'; } catch (e) { /* ignore */ }
  function setSelfPaced(on) {
    selfPaced = on;
    try { localStorage.setItem('pp_selfpaced', on ? '1' : '0'); } catch (e) { /* ignore */ }
    $$('.js-pace').forEach((b) => { b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-on', on); });
  }
  let advance = null; // nuvarande "klicka för att gå vidare"
  let speakers = {};  // vem står var i den aktuella scenen
  const choiceKeys = {};

  function prepareScene(n) {
    cleanupScene();
    speakers = {};
    const env = val(n.env, state);
    buildEnv(el.env, env, val(n.envVariant, state));
    el.scene.dataset.env = env;
    el.scene.classList.toggle('is-cinematic', !!val(n.cinematic, state));
    el.scene.classList.toggle('is-summary', env === 'summary');
    el.skip.classList.toggle('is-on', !!val(n.cinematic, state));
    if (n.eyesClosed) { el.scene.classList.add('is-dozing'); el.eyelids.style.setProperty('--open', 0); el.stage.style.filter = 'blur(12px) brightness(.55) saturate(.5)'; }
    renderProgress();
  }

  function cleanupScene() {
    fast = false;
    el.hotspots.innerHTML = '';
    el.captions.innerHTML = '';
    el.choice.innerHTML = ''; el.choice.classList.remove('is-on');
    el.panelHost.innerHTML = '';
    el.memory.innerHTML = '';
    el.titlecard.classList.remove('is-on');
    el.fxTint.className = 'fx fx--tint';
    el.eyelids.style.setProperty('--open', 1);
    el.stage.style.filter = '';
    $$('.ov-clock', el.stage).forEach((o) => o.remove());
    el.scene.classList.remove('is-cinematic', 'is-shake', 'is-reflect', 'is-dozing');
    $$('video', el.env).forEach((v) => v.pause());
  }

  async function runScene(n) {
    try {
      await n.play(api);
    } catch (err) {
      console.error(err);
    }
    if (!state.played.includes(n.id)) state.played.push(n.id);
    await sleep(T(300));
    await afterScene(n);
  }

  /* ------------------------------------------------------------ API till story.js */
  const api = {
    get state() { return state; },
    lastTimedOut: false,
    wait: (ms) => sleep(fast ? 0 : T(ms)),
    sfx: (n) => SFX.play(n),
    loop: (n) => SFX.loop(n),
    stopLoop: (n) => SFX.stop(n),

    clock(t) {
      if (el.hudClock.textContent === t) return;
      el.hudClock.classList.remove('flip'); void el.hudClock.offsetWidth;
      el.hudClock.textContent = t;
      el.hudClock.classList.add('flip');
    },

    setPersona(p) {
      el.hudName.textContent = p.name;
      el.hudRole.textContent = `${p.role}, ${p.age} år`;
      el.hudAvatar.textContent = p.name[0];
    },

    cinematic(on) {
      el.scene.classList.toggle('is-cinematic', on);
      el.skip.classList.toggle('is-on', on);
      if (!on) fast = false;
      return sleep(T(500));
    },

    tint(kind) { el.fxTint.className = 'fx fx--tint' + (kind ? ' is-' + kind : ''); el.scene.classList.toggle('is-shake', kind === 'alarm'); },

    async title(time, place) {
      el.tcTime.textContent = time;
      el.tcPlace.textContent = place;
      el.titlecard.classList.add('is-on');
      await sleep(fast ? 80 : T(2300));
      el.titlecard.classList.remove('is-on');
      await sleep(fast ? 0 : T(350));
    },

    say(text, o = {}) {
      return new Promise((resolve) => {
        // talare placeras vänster/höger i turordning per scen; Ola (spelaren), tankar och berättare i mitten
        let pos = 'center';
        const spoken = o.who && !o.inner && !o.narrator && o.who !== 'Ola';
        if (spoken) {
          if (!speakers[o.who]) speakers[o.who] = Object.keys(speakers).length % 2 === 0 ? 'left' : 'right';
          pos = speakers[o.who];
        }
        const c = h('div', `cap cap--${pos} ${o.narrator ? 'cap--narr' : ''} ${o.inner ? 'cap--inner' : ''} ${o.small ? 'cap--small' : ''} ${o.big ? 'cap--big' : ''}`);
        const name = o.who ? `${o.who}${o.inner ? ' (tänker)' : ''}: ` : '';
        c.innerHTML = `<span class="cap__line"><span class="cap__who">${name}</span><span class="cap__text"></span></span>${spoken ? '<i class="cap__tail"></i>' : ''}`;
        el.captions.innerHTML = '';
        el.captions.appendChild(c);
        const t = $('.cap__text', c);
        let i = 0, typing = true, timer;
        const finish = () => {
          clearTimeout(timer);
          advance = null;
          c.classList.add('is-out');
          setTimeout(() => { c.remove(); resolve(); }, fast ? 0 : T(260));
        };
        const type = () => {
          if (fast) { t.textContent = text; typing = false; return setTimeout(finish, 60); }
          i += 2;
          // osynlig resttext håller rutans storlek fast medan texten skrivs ut
          t.innerHTML = esc(text.slice(0, i)) + `<span class="cap__ghost">${esc(text.slice(i))}</span>`;
          if (i < text.length) timer = setTimeout(type, 22);
          else { typing = false; t.textContent = text; waitOrGo(); }
        };
        // i egen takt ligger repliken kvar tills man klickar
        const waitOrGo = (ms) => {
          if (selfPaced && !fast) { c.classList.add('is-waiting'); return; }
          timer = setTimeout(finish, T(ms || Math.max(1700, 900 + text.length * 42)));
        };
        advance = () => {
          if (typing) { clearTimeout(timer); typing = false; t.textContent = text; waitOrGo(1100); }
          else finish();
        };
        requestAnimationFrame(() => c.classList.add('is-in'));
        type();
      });
    },

    choose(o) {
      return new Promise((resolve) => {
        api.lastTimedOut = false;
        const kind = o.kind || 'pink';
        el.choice.className = `choice choice--${kind}`;
        el.choice.innerHTML = `
          <div class="choice__head">
            <h2 class="choice__prompt">${o.prompt}</h2>
          </div>
          ${o.timer && !selfPaced ? `<div class="choice__timer"><span>${o.timerLabel || ''}</span><i><b></b></i></div>` : ''}
          <div class="choice__opts ${o.options.length === 4 ? 'choice__opts--grid' : ''}">${o.options.map((op, i) => `
            <button class="opt ${op.fresh ? 'is-fresh' : ''}" data-id="${op.id}" ${op.disabled ? 'disabled' : ''}>
              <kbd>${i + 1}</kbd>
              <span class="opt__label">${op.label}${op.sub ? `<small>${op.sub}</small>` : ''}</span>
              ${op.tag ? `<span class="opt__tag ${op.fresh ? 'opt__tag--new' : ''}">${op.tag}</span>` : ''}
            </button>`).join('')}
          </div>`;
        let done = false;
        let tick;
        const pick = (id, timedOut = false) => {
          if (done) return;
          done = true;
          clearInterval(tick);
          api.lastTimedOut = timedOut;
          SFX.play('select');
          const b = $(`.opt[data-id="${id}"]`, el.choice);
          b && b.classList.add('is-picked');
          el.choice.classList.add('is-picked');
          el.hotspots.innerHTML = '';
          for (const k in choiceKeys) delete choiceKeys[k];
          setTimeout(() => { el.choice.classList.remove('is-on'); setTimeout(() => resolve(id), T(380)); }, T(520));
        };
        $$('.opt', el.choice).forEach((b, i) => {
          b.addEventListener('click', () => pick(b.dataset.id));
          b.addEventListener('mouseenter', () => SFX.play('hover'));
          if (!b.disabled) choiceKeys[String(i + 1)] = () => pick(b.dataset.id);
        });
        if (o.hotspot) api._hotspot(o.hotspot).then(() => pick(o.hotspot.id));
        if (o.timer && !selfPaced) {
          const bar = $('.choice__timer b', el.choice);
          const total = T(o.timer * 1000);
          const start = performance.now();
          el.choice.classList.add('has-timer');
          tick = setInterval(() => {
            const left = 1 - (performance.now() - start) / total;
            bar.style.transform = `scaleX(${Math.max(0, left)})`;
            el.choice.classList.toggle('is-urgent', left < 0.35);
            if (left < 0.35 && Math.random() < 0.18) SFX.play('tick');
            if (left <= 0) pick(o.timeoutId, true);
          }, 50);
        }
        requestAnimationFrame(() => el.choice.classList.add('is-on'));
      });
    },

    _hotspot({ x, y, w, h: hh, label }) {
      return new Promise((resolve) => {
        const b = h('button', 'hotspot');
        Object.assign(b.style, { left: x + '%', top: y + '%', width: w + '%', height: hh + '%' });
        b.innerHTML = `<span class="hotspot__pulse"></span>${label ? `<span class="hotspot__label">${label}</span>` : ''}`;
        b.setAttribute('aria-label', label || 'Interagera');
        b.addEventListener('click', (e) => { e.stopPropagation(); b.remove(); resolve(); });
        el.hotspots.appendChild(b);
      });
    },
    hotspot(o) { return api._hotspot(o); },

    overlay(kind, value) {
      if (kind === 'alarmclock') {
        let o = $('.ov-clock', el.stage);
        if (!o) { o = h('div', 'ov-clock'); el.stage.appendChild(o); }
        o.textContent = value;
      }
    },

    /* Ögonen: tunga lock som sluts i omgångar (somnar) eller fladdrar upp (vaknar),
       med suddig, dov bild medan man är halvvaken. */
    async eyes(close, { instant = false } = {}) {
      const lids = el.eyelids;
      el.scene.classList.toggle('is-dozing', close);
      if (instant) { lids.style.setProperty('--open', close ? 0 : 1); return; }
      const kf = close
        ? [[1, 0], [0.45, 0.3], [0.62, 0.46], [0.12, 0.78], [0, 1]]       // tungt… kämpar emot… sluts
        : [[0, 0], [0.35, 0.26], [0.06, 0.4], [0.55, 0.62], [0.4, 0.72], [1, 1]]; // glipa… blink… upp
      const ms = T(close ? 1900 : 2300);
      const a = lids.animate(kf.map(([o, offset]) => ({ '--open': o, offset })), { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
      const b = el.stage.animate(close
        ? [{ filter: 'none' }, { filter: 'blur(3px) brightness(.85)', offset: 0.5 }, { filter: 'blur(9px) brightness(.6) saturate(.6)' }]
        : [{ filter: 'blur(12px) brightness(.55) saturate(.5)' }, { filter: 'blur(7px) brightness(.7) saturate(.7)', offset: 0.45 }, { filter: 'blur(2px) brightness(.92)', offset: 0.8 }, { filter: 'none' }],
      { duration: ms * (close ? 1 : 1.25), easing: 'ease-out', fill: 'forwards' });
      await a.finished;
      lids.style.setProperty('--open', close ? 0 : 1);
      a.cancel();
      if (!close) { await b.finished; b.cancel(); }
      else b.cancel(), (el.stage.style.filter = 'blur(9px) brightness(.6) saturate(.6)');
      if (!close) el.stage.style.filter = '';
    },

    async memory(text, badge) {
      SFX.play('memory');
      el.memory.innerHTML = `<div class="mem"><span>${text}</span></div>`;
      await sleep(fast ? 300 : T(2600));
      const m = $('.mem', el.memory);
      m && m.classList.add('is-out');
      await sleep(T(400));
      el.memory.innerHTML = '';
    },

    panel(cls, html) {
      const p = h('div', `panel ${cls}`, html);
      el.panelHost.innerHTML = '';
      el.panelHost.appendChild(p);
      requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('is-on')));
      return p;
    },
    async closePanel(p) { p.classList.remove('is-on'); await sleep(T(450)); p.remove(); },

    personaPick(personas, prompt) {
      return new Promise((resolve) => {
        const p = api.panel('panel--mirror', `
          <h2 class="mirror__prompt">${prompt}</h2>
          <div class="mirror__cards">${personas.map((x) => `
            <button class="pcard ${x.locked ? 'is-locked' : ''}" data-id="${x.id}" ${x.locked ? 'aria-disabled="true"' : ''}>
              <span class="pcard__face"><span>${x.name[0]}</span></span>
              <strong>${x.name}, ${x.age} år</strong><span>${x.role}</span>
              ${x.locked ? '<em>🔒 Kommer snart</em>' : '<em class="go">Välj</em>'}
            </button>`).join('')}</div>`);
        $$('.pcard', p).forEach((b) => b.addEventListener('click', async () => {
          if (b.classList.contains('is-locked')) { SFX.play('warn'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
          SFX.play('select');
          b.classList.add('is-picked');
          await sleep(T(700));
          await api.closePanel(p);
          resolve(b.dataset.id);
        }));
      });
    },

    agenda(items) {
      return new Promise((resolve) => {
        const p = api.panel('panel--agenda', `
          <div class="phone">
            <div class="phone__top"><b>I dag</b><span>tor 2 okt</span></div>
            <ul>${items.map(([t, txt, clash], i) => `<li style="--i:${i}" class="${clash ? 'clash' : ''}"><time>${t}</time><span>${txt}</span>${clash ? '<em>Krock!</em>' : ''}</li>`).join('')}</ul>
            <button class="btn btn--primary">Okej. Kör.</button>
          </div>`);
        $('button', p).addEventListener('click', async () => { SFX.play('click'); await api.closePanel(p); resolve(); });
      });
    },

    mailSort(mails) {
      return new Promise((resolve) => {
        const order = [];
        const p = api.panel('panel--mail', `
          <div class="mailwin">
            <div class="mailwin__bar"><i></i><i></i><i></i><span>Inkorg – 3 olästa</span></div>
            <p class="mailwin__help">Klicka på mailen i den ordning Ola ska ta hand om dem.</p>
            <ul class="mailwin__list">${mails.map((m) => `
              <li><button class="mail" data-id="${m.id}">
                <span class="mail__rank"></span>
                <span class="mail__body"><b>${m.from}</b><strong>${m.subject}</strong><small>${m.preview}</small></span>
              </button></li>`).join('')}</ul>
            <div class="mailwin__foot"><button class="btn btn--ghost js-reset">Börja om</button><button class="btn btn--primary js-done" disabled>Klar</button></div>
          </div>`);
        const sync = () => {
          $$('.mail', p).forEach((b) => {
            const i = order.indexOf(b.dataset.id);
            b.classList.toggle('is-ranked', i >= 0);
            $('.mail__rank', b).textContent = i >= 0 ? i + 1 : '';
          });
          $('.js-done', p).disabled = order.length !== mails.length;
        };
        $$('.mail', p).forEach((b) => b.addEventListener('click', () => {
          const id = b.dataset.id;
          const i = order.indexOf(id);
          if (i >= 0) order.splice(i, 1); else order.push(id);
          SFX.play('click');
          sync();
        }));
        $('.js-reset', p).addEventListener('click', () => { order.length = 0; sync(); });
        $('.js-done', p).addEventListener('click', async () => { SFX.play('select'); await api.closePanel(p); resolve(order.slice()); });
      });
    },

    async calendarMove(keepLisa) {
      const p = api.panel('panel--cal', `
        <div class="cal">
          <div class="cal__head">Kalender · torsdag</div>
          <div class="cal__grid">
            <span class="cal__h">14:00</span><span class="cal__h">15:00</span><span class="cal__h">16:00</span>
            <div class="ev ev--a">14:30 Budgetgenomgång</div>
            <div class="ev ev--b">14:30 Avstämning underhåll</div>
            ${keepLisa ? '<div class="ev ev--lisa">15:30 Lisa – ledighet</div>' : ''}
          </div>
        </div>`);
      await sleep(fast ? 200 : T(1600));
      SFX.play('warn');
      p.classList.add('is-clash');
      await sleep(fast ? 200 : T(1400));
      p.classList.add(keepLisa ? 'move-a' : 'move-b');
      SFX.play('whooshOut');
      await sleep(fast ? 200 : T(1600));
      await api.closePanel(p);
    },

    bigQuestion(text) {
      return new Promise((resolve) => {
        const p = api.panel('panel--question', `<h2>${text}</h2><button class="btn btn--primary btn--lg">Tillbaka till tidslinjen</button>`);
        el.captions.innerHTML = '';
        $('button', p).addEventListener('click', async () => { SFX.play('click'); resolve(); });
      });
    },

    /* Reflektion: ett steg i taget, svar ger återkoppling, resolvar med alla svar */
    reflect(steps) {
      return new Promise((resolve) => {
        el.scene.classList.add('is-reflect');
        const answers = {};
        const p = api.panel('panel--reflect', `
          <div class="refl">
            <div class="refl__dots">${steps.map(() => '<i></i>').join('')}</div>
            <div class="refl__body"></div>
          </div>`);
        const body = $('.refl__body', p);
        const dots = $$('.refl__dots i', p);
        let idx = -1;

        const foot = (label = 'Fortsätt', disabled = false) =>
          `<div class="refl__foot"><button class="btn btn--primary js-next" ${disabled ? 'disabled' : ''}>${label}</button></div>`;
        const reply = (text) => `<p class="refl__reply">${text}</p>`;

        async function go(n) {
          idx = n;
          dots.forEach((d, k) => { d.classList.toggle('is-done', k < n); d.classList.toggle('is-now', k === n); });
          body.classList.add('is-out');
          await sleep(T(320));
          render(steps[n]);
          body.scrollTop = 0;
          body.classList.remove('is-out');
        }
        const next = () => { SFX.play('click'); if (idx < steps.length - 1) go(idx + 1); };

        function render(st) {
          const head = `<p class="refl__eyebrow">${st.eyebrow || ''}</p>`;
          if (st.type === 'recap') {
            body.innerHTML = `${head}<h2 class="refl__q">${st.title}</h2>
              <ol class="recap">${st.items.map((it, k) => `
                <li class="${it.key ? 'is-key' : ''}" style="--i:${k}"><time>${it.time}</time>
                  <span>${it.was ? `<s>${it.was}</s>` : ''}${it.text}</span></li>`).join('')}</ol>${foot()}`;
          } else if (st.type === 'choice') {
            body.innerHTML = `${head}<h2 class="refl__q">${st.question}</h2>${st.hint ? `<p class="refl__hint">${st.hint}</p>` : ''}
              <div class="refl__opts">${st.options.map((o) => `<button class="opt" data-id="${o.id}">${o.label}</button>`).join('')}</div>
              <div class="refl__after"></div>`;
            $$('.opt', body).forEach((b) => b.addEventListener('click', () => {
              SFX.play('select');
              answers[st.id] = b.dataset.id;
              $$('.opt', body).forEach((x) => { x.classList.toggle('is-picked', x === b); x.classList.toggle('is-dim', x !== b); });
              $('.refl__after', body).innerHTML = reply(st.respond(b.dataset.id)) + foot();
              $('.js-next', body).addEventListener('click', next);
            }));
            return;
          } else if (st.type === 'scale') {
            body.innerHTML = `${head}<h2 class="refl__q">${st.question}</h2>
              <div class="scale" role="radiogroup">${[1, 2, 3, 4, 5].map((v) => `<button class="scale__pt" role="radio" aria-checked="false" data-v="${v}" aria-label="${v} av 5"><i></i></button>`).join('')}</div>
              <div class="scale__labels"><span>${st.labels[0]}</span><span>${st.labels[1]}</span></div>
              <div class="refl__after"></div>`;
            $$('.scale__pt', body).forEach((b) => b.addEventListener('click', () => {
              SFX.play('select');
              const v = +b.dataset.v;
              answers[st.id] = v;
              $$('.scale__pt', body).forEach((x) => { const on = +x.dataset.v <= v; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', String(+x.dataset.v === v)); });
              $('.refl__after', body).innerHTML = reply(st.respond(v)) + foot();
              $('.js-next', body).addEventListener('click', next);
            }));
            return;
          } else if (st.type === 'text') {
            body.innerHTML = `${head}<h2 class="refl__q">${st.question}</h2>
              <textarea class="refl__text" id="refl-${st.id}" rows="3" placeholder="${st.placeholder || ''}"></textarea>
              ${st.hint ? `<p class="refl__hint">${st.hint}</p>` : ''}
              <div class="refl__after"><div class="refl__foot"><button class="btn btn--ghost js-skip">Hoppa över</button><button class="btn btn--primary js-save">Spara tanken</button></div></div>`;
            const ta = $('textarea', body);
            const done = (txt) => {
              answers[st.id] = txt;
              SFX.play('select');
              ta.readOnly = true;
              $('.refl__after', body).innerHTML = reply(st.respond(txt)) + foot();
              $('.js-next', body).addEventListener('click', next);
            };
            $('.js-save', body).addEventListener('click', () => done(ta.value.trim()));
            $('.js-skip', body).addEventListener('click', () => done(''));
            setTimeout(() => ta.focus({ preventScroll: true }), T(400));
            return;
          } else if (st.type === 'takeaways') {
            body.innerHTML = `${head}<h2 class="refl__q">${st.title}</h2>
              <ul class="takeaways">${st.items.map((t, k) => `<li style="--i:${k}"><strong>${t.lead}</strong> ${t.text}</li>`).join('')}</ul>${foot()}`;
          } else if (st.type === 'commit') {
            body.innerHTML = `${head}<h2 class="refl__q">${st.question}</h2>${st.hint ? `<p class="refl__hint">${st.hint}</p>` : ''}
              <div class="commits">${st.options.map((c, k) => `
                <label class="commit"><input type="checkbox" id="commit-${k}" value="${k}"><span class="commit__box"></span><span>${c}</span></label>`).join('')}
                <textarea class="refl__text" id="commit-own" rows="2" placeholder="${st.ownPlaceholder || ''}"></textarea>
              </div>${foot('Jag committar', true)}`;
            const btn = $('.js-next', body);
            const own = $('#commit-own', body);
            const sync = () => { btn.disabled = !$$('input:checked', body).length && !own.value.trim(); };
            $$('input', body).forEach((b) => b.addEventListener('change', () => { SFX.play(b.checked ? 'select' : 'click'); sync(); }));
            own.addEventListener('input', sync);
            btn.addEventListener('click', () => {
              answers[st.id] = [...$$('input:checked', body).map((b) => st.options[+b.value]), own.value.trim()].filter(Boolean);
              SFX.play('success');
              next();
            });
            return;
          } else if (st.type === 'closing') {
            const mine = answers.atagande || [];
            body.innerHTML = `${head}<h2 class="refl__q refl__q--big">${st.title}</h2><p class="refl__lead">${st.text}</p>
              ${mine.length ? `<div class="pledge"><p class="refl__eyebrow">Mitt åtagande</p>${mine.map((m) => `<blockquote>${m}</blockquote>`).join('')}</div>` : ''}
              <p class="done-msg">Kursen är genomförd ✓</p>
              <div class="refl__foot"><button class="btn btn--ghost js-again">Spela igen</button><button class="btn btn--primary js-tl">Se din tidslinje</button></div>`;
            $('.js-again', body).addEventListener('click', () => restart());
            $('.js-tl', body).addEventListener('click', async () => {
              await exitScene(byId.nend);
              await setCam(centerX(), layout.n1324.y, 0.32, 1400);
              banner('<strong>Din dag – rak och olycksfri.</strong><small>Tack för att du spelade.</small>', 'tl-banner--good');
            });
            dots.forEach((d) => d.classList.add('is-done'));
            resolve(answers);
            return;
          }
          const nb = $('.js-next', body);
          nb && nb.addEventListener('click', next);
        }
        go(0);
      });
    },
  };

  // klick / mellanslag = gå vidare i repliker; siffror = val
  el.scene.addEventListener('click', (e) => {
    if (e.target.closest('button, .panel, label, input')) return;
    advance && advance();
  });
  document.addEventListener('keydown', (e) => {
    if (!el.scene.classList.contains('is-active')) return;
    if (choiceKeys[e.key]) { choiceKeys[e.key](); return; }
    if ((e.key === ' ' || e.key === 'Enter') && advance && !e.target.closest('button')) { e.preventDefault(); advance(); }
  });
  el.skip.addEventListener('click', (e) => { e.stopPropagation(); fast = true; advance && advance(); });

  /* ===================================================================
     FLÖDE
     =================================================================== */
  async function afterScene(n) {
    // Spår avgörs av det kritiska valet kl 07:30
    if (n.id === 'n0730') {
      const wasRewind = state.phase === 'rewind';
      // vid omspelning byts spåret först när sidohändelserna lösts upp (straighten)
      if (!wasRewind) state.track = BAD_A.includes(state.choices.A) ? 'A' : 'A2';
      if (wasRewind) {
        await exitScene(n);
        await straighten();
        return;
      }
    }

    if (n.id !== 'nend') await exitScene(n);

    if (n.id === 'nend') return; // sammanfattningen blir kvar

    if (n.id === 'n1614' && state.accident && state.phase === 'normal') {
      await chainBack();
      return;
    }
    await goNext();
  }

  async function goNext() {
    renderTimeline();
    const nx = nextNode();
    if (!nx) return;
    await camTo(nx.id, 1, 1100);
    const auto = val(nx.cinematic, state) || nx.kind === 'film' || nx.kind === 'side';
    if (auto) {
      banner(`<span class="tl-banner__time">${nx.time}</span> ${val(nx.title, state)}<small>Filmen startar…</small>`);
      await sleep(T(1500));
      if (!busy && nextNode() === nx) enterNode(nx);
    } else {
      banner('');
    }
  }

  function onNodeClick(n) {
    if (busy) return;
    if (state.phase === 'rewind' && n.id === 'n0730') { doRewind(n); return; }
    const nx = nextNode();
    if (nx && nx.id === n.id) { SFX.play('click'); enterNode(n); }
  }

  /* Efter olyckan: följ kedjan bakåt, låt 07:30 lysa */
  async function chainBack() {
    busy = true;
    el.timeline.classList.add('is-alarm');
    banner('<strong>Något gick fel.</strong><small>Följ kedjan tillbaka…</small>', 'tl-banner--alarm');
    const chain = ['n1614', 'n1402', 'n1223', 'n1115', 'n0730'];
    for (const id of chain) {
      await camTo(id, 1, 800);
      const e = $(`.node[data-id="${id}"]`);
      e.classList.add('is-chain');
      SFX.play('pulse');
      await sleep(T(450));
    }
    state.phase = 'rewind';
    renderTimeline();
    await camTo('n0730', 1.05, 700);
    banner('<strong>Hur hade detta kunnat förhindras?</strong><small>Valet kl 07:30 lyser. Hoppa tillbaka och ändra det.</small>', 'tl-banner--alarm');
    busy = false;
  }

  async function doRewind(n) {
    busy = true;
    banner('');
    SFX.play('rewind');
    el.rewind.classList.add('is-on');
    // klockan spolas bakåt 16:14 -> 07:30
    const from = 16 * 60 + 14, to = 7 * 60 + 30;
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const m = Math.round(from - (from - to) * (i / steps) ** 0.7);
      el.rewindClock.textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      await sleep(T(38));
    }
    $$('.node.is-chain').forEach((e) => e.classList.remove('is-chain'));
    state.rewound = true;
    busy = false;
    await enterNode(n, { rewind: true });
  }

  /* Rätt val: sidohändelserna försvinner och tidslinjen blir rak */
  async function straighten() {
    busy = true;
    el.timeline.classList.remove('is-alarm');
    banner('<strong>Ett annat val. En annan dag.</strong>', 'tl-banner--good');
    await setCam(compact() ? sideX() * 0.5 : sideX() * 0.5, layout.n1223.y, compact() ? 0.45 : 0.6, 1000);
    SFX.play('dissolve');
    $$('.node--side').forEach((e, i) => setTimeout(() => e.classList.add('is-dissolving'), i * T(220)));
    const bp = $('#branchPath');
    if (bp) { bp.style.transition = `stroke-dashoffset ${T(1300)}ms ease-in`; bp.style.strokeDashoffset = bp.getTotalLength(); }
    await sleep(T(1500));
    $$('.node--side').forEach((e) => e.remove());
    state.track = 'A2';
    // 16:14 spelas om i ny version
    state.played = state.played.filter((id) => id !== 'n1614' && !byId[id].track);
    state.phase = 'fixed';
    delete el.timeline.dataset.branchShown;
    renderTimeline();
    await sleep(T(700));
    // ljuspuls längs den raka linjen
    await lightPulse('n0730', 'n1614');
    SFX.play('success');
    banner('<strong>Tidslinjen är rak igen.</strong><small>Olyckan inträffade aldrig.</small>', 'tl-banner--good');
    await sleep(T(1400));
    busy = false;
    await goNext();
  }

  async function lightPulse(fromId, toId) {
    const a = layout[fromId], b = layout[toId];
    const dot = h('div', 'tl-pulse');
    el.world.appendChild(dot);
    dot.style.top = a.y + 'px';
    setCam(centerX(), a.y, 0.8, 0);
    const ms = T(2400);
    dot.animate([{ top: a.y + 'px' }, { top: b.y + 'px' }], { duration: ms, easing: 'cubic-bezier(.5,0,.5,1)', fill: 'forwards' });
    setCam(centerX(), b.y, 0.8, ms / (REDUCED ? 0.35 : 1), 'cubic-bezier(.5,0,.5,1)');
    el.timeline.classList.add('is-healed');
    await sleep(ms + 200);
    dot.remove();
  }

  function restart() {
    SFX.stopAll();
    state = freshState();
    if (location.search) location.href = location.pathname; else location.reload();
  }

  /* ------------------------------------------------------------ start */
  async function start() {
    SFX.unlock();
    $$('video', el.intro).forEach((v) => setTimeout(() => v.pause(), 700));
    SFX.play('whooshIn');
    show(el.intro, false);
    show(el.timeline, true);
    renderTimeline();
    // etableringsbild: svep över hela dagen, landa på 06:00
    const last = visibleNodes().length - 1;
    await setCam(centerX(), last * ROW * 0.5, 0.3, 0);
    banner('<strong>En dag i produktionen.</strong><small>Varje punkt är ett ögonblick du kan hoppa in i.</small>');
    await sleep(T(1700));
    await goNext();
  }

  $('#startBtn').addEventListener('click', start);

  // två klick i stället för confirm() (som inte fungerar i alla inbäddade visare)
  let resetArmed = null;
  $('#resetBtn').addEventListener('click', () => {
    const b = $('#resetBtn');
    if (resetArmed) { restart(); return; }
    b.classList.add('is-armed'); b.textContent = 'Börja om?';
    resetArmed = setTimeout(() => { resetArmed = null; b.classList.remove('is-armed'); b.textContent = '↺'; }, 3000);
  });
  $$('.js-pace').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); SFX.play('click'); setSelfPaced(!selfPaced); }));
  setSelfPaced(selfPaced);
  const muteIcon = () => $$('.js-mute').forEach((b) => { b.textContent = SFX.isMuted() ? '🔇' : '🔊'; });
  $$('.js-mute').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); SFX.toggleMute(); muteIcon(); }));
  muteIcon();
  let wasCompact = compact();
  window.addEventListener('resize', () => {
    el.timeline.classList.toggle('is-compact', compact());
    if (compact() !== wasCompact) { wasCompact = compact(); $$('.node', el.nodes).forEach((n) => { delete n.dataset.sig; }); if (el.timeline.classList.contains('is-active')) renderTimeline(); }
    if (!busy) setCam(cam.x, cam.y, cam.s, 0);
  });
  el.timeline.classList.toggle('is-compact', compact());

  /* ------------------------------------------------------------ utvecklarläge
     ?at=n1324           hoppa till en punkt (tidigare punkter markeras som spelade)
     ?at=n1614&a=lugnt   välj vad som svarades kl 07:30 */
  const qs = new URLSearchParams(location.search);
  if (qs.get('at') && byId[qs.get('at')]) {
    const target = qs.get('at');
    const idx = nodes.findIndex((n) => n.id === target);
    if (idx > nodes.findIndex((n) => n.id === 'n0730')) {
      state.choices.A = qs.get('a') || 'lugnt';
      state.firstA = state.choices.A;
      state.triedA = [state.choices.A];
      state.track = BAD_A.includes(state.choices.A) ? 'A' : 'A2';
    }
    if (idx > nodes.findIndex((n) => n.id === 'n0803')) state.choices.B = qs.get('b') || 'motet';
    if (idx > nodes.findIndex((n) => n.id === 'n1324')) state.choices.C = ['rapport', 'kim', 'aw'];
    state.played = nodes.slice(0, idx).filter(isVisible).map((n) => n.id);
    if (target === 'n1614' && state.track === 'A') state.accident = false;
    api.setPersona(STORY.personas[1]);
    el.timeline.dataset.branchShown = '1';
    $('.intro__startlabel').textContent = `Fortsätt vid ${byId[target].time}`;
  }

  // fokus på element utanför bild får aldrig scrolla upplevelsen
  $$('#app, .layer, #tlViewport, #sceneWorld').forEach((x) => x.addEventListener('scroll', () => { x.scrollTop = 0; x.scrollLeft = 0; }));

  window.__pp = { state: () => state, busy: () => busy, enterNode, nodes, api };
})();
