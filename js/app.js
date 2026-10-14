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
  // manuset är skrivet med "Ola" – byt till vald person (och pronomen) när texten visas
  let persona = null;
  function personalize(t) {
    if (typeof t !== 'string' || !persona || persona.id === 'ola' || (DAY && DAY.own)) return t;
    let out = t.replace(/\bOlas\b/g, persona.name + 's').replace(/\bOla\b/g, persona.name);
    if (persona.pronoun === 'hon') out = out.replace(/\bhan\b/g, 'hon').replace(/\bHan\b/g, 'Hon').replace(/\bhonom\b/g, 'henne').replace(/\bhans\b/g, 'hennes');
    return out;
  }
  const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = (ms) => (REDUCED ? Math.round(ms * 0.35) : ms);

  const ROW = 290;        // lodrätt avstånd mellan punkterna (px i världen)
  const PLAT_X = 270;     // plattformens avstånd från linjen
  const SIDE_X = 600;     // sidospårets linje (till höger om huvudlinjen)
  const VIDEO_ENVS = { sovrum: 'assets/video/sovrum.mp4', kontor: 'assets/video/kontor.mp4', fika: 'assets/video/fika.mp4', lunch: 'assets/video/lunch.mp4', korridor: 'assets/video/korridor.mp4', larm: 'assets/video/larm.mp4', mote: 'assets/video/mote.mp4', bil: 'assets/video/bil.mp4' };
  // stillbildsmiljöer (t.ex. platshållare tills en film finns) – byt bilden, eller flytta namnet till VIDEO_ENVS när filmen är klar
  const IMAGE_ENVS = { kok: 'assets/img/kok.jpg', 'motesrum-kvall': 'assets/img/motesrum-kvall.jpg' };
  const POSTERS = { sovrum: 'assets/img/sovrum.jpg', kontor: 'assets/img/kontor.jpg', fika: 'assets/img/fika.jpg', lunch: 'assets/img/lunch.jpg', korridor: 'assets/img/korridor.jpg', larm: 'assets/img/larm.jpg', mote: 'assets/img/mote.jpg', bil: 'assets/img/bil.jpg', spegel: 'assets/img/sovrum.jpg' };

  /* ------------------------------------------------------------ state */
  const freshState = () => ({
    choices: {}, snooze: 0, track: null, played: [], persona: null,
    rewound: false, firstA: null, triedA: [], accident: false, phase: 'normal', signals: [],
  });
  let state = freshState();
  /* Varje person kan ha en egen dag (STORY.days). Dagen byts när man väljer person i spegeln;
     06:00 och 06:20 är gemensamma. Personer utan egen dag spelar Olas dag med sitt namn. */
  let DAY = STORY.days.ola;
  let nodes = DAY.nodes;
  let byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  function useDay(personaId) {
    DAY = STORY.dayFor(personaId);
    nodes = DAY.nodes;
    byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  }

  const isVisible = (n) => !n.track || state.track === n.track;
  const visibleNodes = () => nodes.filter(isVisible);
  const isPlayed = (n) => state.played.includes(n.id);
  const nextNode = () => visibleNodes().find((n) => !isPlayed(n));

  /* ------------------------------------------------------------ DOM */
  const el = {
    intro: $('#intro'), timeline: $('#timeline'), scene: $('#scene'),
    viewport: $('#tlViewport'), world: $('#tlWorld'), lines: $('#tlLines'), nodes: $('#tlNodes'), banner: $('#tlBanner'),
    sceneWorld: $('#sceneWorld'), stage: $('#stage'), env: $('#env'), hotspots: $('#hotspots'),
    hud: $('#hud'), hudClock: $('#hudClock'), hudName: $('#hudName'), hudRole: $('#hudRole'), hudAvatar: $('#hudAvatar'),
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
    // tom, varm yta (t.ex. när notisen är hela scenen)
    tom: () => '<div class="env-tom"></div>',
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
        <div class="spegel__tiles"></div>
        <div class="spegel__lamp"><i></i></div>
        <div class="spegel__light"></div>
        <div class="spegel__counter"></div>
        <div class="spegel__steam"><i></i><i></i><i></i><i></i></div>
      </div>`,
    summary: () => `<div class="summ"><i></i><i></i><i></i></div>`,
  };

  function buildEnv(host, name, variant, { thumb = false, live = false } = {}) {
    if (host._stop) { host._stop(); host._stop = null; }
    host.innerHTML = '';
    if (host.dataset.base == null) host.dataset.base = host.className.split(' ').filter((c) => c && !c.startsWith('env')).join(' ');
    host.className = `${host.dataset.base} env env--${name} ${variant ? 'env--' + variant : ''}`;
    // 3D-scener (maskinen) renderas med three.js när det inte finns en film; CSS-scenen är reserv utan WebGL
    if (IMAGE_ENVS[name] && !VIDEO_ENVS[name]) {
      host.appendChild(Object.assign(h('img', 'env__video'), { src: IMAGE_ENVS[name], alt: '' }));
      if (variant) host.appendChild(h('div', `env__tone env__tone--${variant}`));
      return;
    }
    if (!thumb && !VIDEO_ENVS[name] && window.Scene3D && Scene3D.has(name)) {
      try { host._stop = Scene3D.mount(host, name, variant); return; } catch (e) { console.warn(e); host.innerHTML = ''; }
    }
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
    const vis = visibleNodes();
    // när sidospåret syns går grenen ut till höger mellan det kritiska valet och konsekvensen –
    // då ligger huvudlinjens plattformar på den sträckan till vänster så att grenen aldrig korsar dem
    const branch = vis.some((n) => n.lane === 'side');
    const from = vis.findIndex((n) => n.id === DAY.critical), to = vis.findIndex((n) => n.id === DAY.consequence);
    vis.forEach((n, i) => {
      const side = n.lane === 'side';
      const alt = m++ % 2 === 0 ? 1 : -1;
      // (själva valet behåller sin sida – annars hoppar plattformen just när scenen krymper in i den)
      const dir = side ? 1 : (branch && i > from && i <= to ? -1 : alt);   // huvudlinjen växlar höger/vänster
      const x = side ? SIDE_X : 0;
      const y = i * ROW;
      layout[n.id] = { x, y, dir, px: x + dir * PLAT_X, py: y };
    });
  }
  const hasSide = () => visibleNodes().some((n) => n.lane === 'side');

  function renderTimeline() {
    computeLayout();
    const next = nextNode();
    const existing = Object.fromEntries($$('.node', el.nodes).map((e) => [e.dataset.id, e]));
    // punkter från en annan dag (före personvalet) tonas bort när dagen byts
    Object.entries(existing).forEach(([id, e]) => {
      if (byId[id] || e.classList.contains('is-dissolving')) return;
      e.classList.add('is-dissolving'); e.disabled = true;
      setTimeout(() => e.remove(), T(1200));
    });

    nodes.forEach((n) => {
      let e = existing[n.id];
      const visible = isVisible(n);
      if (!visible) { if (e && !e.classList.contains('is-dissolving')) e.remove(); return; }
      const pos = layout[n.id];
      const played = isPlayed(n);
      const isNext = next && next.id === n.id;
      const culprit = state.phase === 'rewind' && n.id === DAY.critical;
      const known = played || isNext || culprit || n.lane === 'side';
      const badge = val(n.badge, state);
      const sig = [val(n.title, state), badge, val(n.prop, state), played, isNext, known, culprit, pos.dir].join('|');

      if (!e) {
        // punkten byggs en gång; sedan uppdateras bara det som ändras, så att färg och glöd kan tonas
        e = h('button', `node node--${n.kind} is-new`);
        e.dataset.id = n.id;
        e.type = 'button';
        e.innerHTML = `
          <span class="node__arm"></span>
          <span class="node__dot"></span>
          <span class="node__label">
            <span class="node__pill">kl ${n.time.replace('Dagens slut', '17:00')}</span>
            <span class="node__title"></span>
            <span class="node__cta"></span>
          </span>
          <span class="node__plat">
            <span class="node__disc"></span>
            <span class="node__prop"></span>
          </span>`;
        e.addEventListener('click', () => onNodeClick(n));
        e.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        el.nodes.appendChild(e);
        requestAnimationFrame(() => requestAnimationFrame(() => e.classList.remove('is-new')));
      }
      // läget flyttas med transform (billigt) i stället för left/top
      e.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (e.dataset.sig !== sig) {
        if (e.dataset.dir && e.dataset.dir !== String(pos.dir)) { e.classList.remove('is-flip'); void e.offsetWidth; e.classList.add('is-flip'); }
        e.dataset.dir = String(pos.dir);
        e.dataset.sig = sig;
        e.classList.toggle('node--left', pos.dir < 0);
        e.classList.toggle('node--right', pos.dir >= 0);
        e.classList.toggle('node--side', n.lane === 'side');
        e.classList.toggle('is-played', played);
        e.classList.toggle('is-next', !!isNext);
        e.classList.toggle('is-future', !known);
        e.classList.toggle('is-culprit', culprit);
        $('.node__title', e).textContent = known ? val(n.title, state) : '';
        const cta = $('.node__cta', e);
        cta.textContent = culprit ? 'Hoppa tillbaka' : isNext ? 'Hoppa in' : '';
        cta.hidden = !(isNext || culprit);
        // bilden byts bara om den faktiskt är en annan (annars blinkar den när den laddas om)
        const src = val(n.prop, state);
        const prop = $('.node__prop', e);
        if (prop.dataset.src !== src) { prop.dataset.src = src; prop.innerHTML = PROPS.html(src); }
        e.setAttribute('aria-label', `kl ${n.time} ${known ? val(n.title, state) : 'okänd händelse'}`);
        e.disabled = !(isNext || culprit);
      }
    });
    drawLines();
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
    // den spelade linjen växer fram till nästa punkt i stället för att hoppa dit
    const doneY = lastPlayed ? layout[lastPlayed.id].y : first.y;
    const prevY = el.lines.dataset.doneY != null ? +el.lines.dataset.doneY : doneY;
    el.lines.dataset.doneY = doneY;
    const seg = $('.seg.done', el.lines);
    if (seg && doneY > prevY && !REDUCED) {
      const len = doneY - first.y;
      seg.style.strokeDasharray = `${len} ${len + 40}`;
      seg.style.strokeDashoffset = `${doneY - prevY}`;
      void seg.getBoundingClientRect();
      seg.style.transition = `stroke-dashoffset ${T(1200)}ms cubic-bezier(.45,0,.2,1)`;
      seg.style.strokeDashoffset = '0';
    }

    const side = visibleNodes().filter((n) => n.lane === 'side');
    const g = $('#branch', el.lines);
    if (!side.length) { g.innerHTML = ''; return; }
    const s0 = layout[DAY.critical], e0 = layout[DAY.consequence];
    const f = layout[side[0].id], l = layout[side[side.length - 1].id];
    const X = SIDE_X;
    // grenen är en lång, rundad S-kurva: den använder hela utrymmet fram till första sidohändelsen
    // (och från den sista tillbaka till konsekvensen), med lodräta handtag så att böjarna blir mjuka.
    // Punkterna emellan ligger till vänster, så kurvan går fri från ikoner och etiketter.
    const spanOut = Math.max(ROW * 0.85, Math.min(ROW * 1.9, f.y - s0.y - ROW * 0.3));
    const spanIn = Math.max(ROW * 0.85, Math.min(ROW * 1.9, e0.y - l.y - ROW * 0.3));
    const a0 = s0.y + ROW * 0.12, a1 = a0 + spanOut, b1 = e0.y - ROW * 0.12, b0 = b1 - spanIn;
    const ko = spanOut * 0.55, ki = spanIn * 0.55;
    const d = `M 0 ${s0.y} L 0 ${a0} C 0 ${a0 + ko}, ${X} ${a1 - ko}, ${X} ${a1} L ${X} ${b0} C ${X} ${b0 + ki}, 0 ${b1 - ki}, 0 ${b1} L 0 ${e0.y}`;
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

  /* ------------------------------------------------------------ kamera */
  function focusPoint() { return { cx: window.innerWidth / 2, cy: window.innerHeight * 0.5 }; }
  // grundskala så att hela bredden (linje + plattformar) får plats även på mobil
  function baseScale() {
    const need = hasSide() ? (SIDE_X + PLAT_X + 200) * 2 : (PLAT_X + 200) * 2;
    return Math.max(0.36, Math.min(1.1, (innerWidth - 32) / need, innerHeight / 820));
  }

  /* bakgrundens tid på dygnet: 0 = 06:00 (gryning), 0.5 = mitt på dagen, 1 = 17:00 (skymning) */
  let skyT = 0;
  const skyEl = $('.tl-sky', el.timeline);
  function skyAt(y) {
    const ys = Object.values(layout).map((p) => p.y);
    const max = ys.length ? Math.max(...ys) : 1;
    const t = Math.max(0, Math.min(1, y / (max || 1)));
    skyT = t;
    const dawn = Math.max(0, 1 - t * 2.2), dusk = Math.max(0, (t - 0.55) * 2.2), day = Math.max(0, 1 - dawn - dusk);
    // sätts på himlen själv (inte hela tidslinjen) så att bara den räknas om när kameran rör sig
    skyEl.style.setProperty('--dawn', dawn.toFixed(3));
    skyEl.style.setProperty('--day', Math.min(1, day).toFixed(3));
    skyEl.style.setProperty('--dusk', Math.min(1, dusk).toFixed(3));
  }
  // svävande ljuspartiklar med lätt parallax mot kameran
  (function motes() {
    const c = $('#tlMotes'); if (!c) return;
    const g = c.getContext('2d');
    const pts = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, v: 0.004 + Math.random() * 0.01, d: 0.2 + Math.random() * 0.8, a: Math.random() * 6.28 }));
    let w = 0, h = 0, last = performance.now();
    // färgen på ljuspartiklarna kan styras av temat (--mote-warm / --mote-cool som "r,g,b")
    let warmRGB = '255,224,180', coolRGB = '210,245,200';
    const readTheme = () => { const cs = getComputedStyle(el.timeline); warmRGB = cs.getPropertyValue('--mote-warm').trim() || warmRGB; coolRGB = cs.getPropertyValue('--mote-cool').trim() || coolRGB; };
    const fit = () => { const dpr = Math.min(2, devicePixelRatio || 1); w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); readTheme(); };
    new ResizeObserver(fit).observe(c); fit();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (el.timeline.classList.contains('is-active') && !REDUCED) {
        g.clearRect(0, 0, w, h);
        // världens faktiska läge just nu (mitt i en övergång), så att partiklarna glider med i stället för att hoppa
        let camY = cam.y;
        const m = new DOMMatrixReadOnly(getComputedStyle(el.world).transform);
        if (m.a) camY = (focusPoint().cy - m.f) / m.a;
        const warm = skyT < 0.3 || skyT > 0.7;
        pts.forEach((p) => {
          p.y -= p.v * dt * p.d; p.a += dt * 0.6;
          if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
          const px = (p.x + Math.sin(p.a) * 0.004) * w;
          const py = ((p.y - camY * 0.00012 * p.d) % 1 + 1) % 1 * h;
          g.beginPath(); g.arc(px, py, p.r, 0, 6.29);
          g.fillStyle = warm ? `rgba(${warmRGB},${0.12 + p.d * 0.22})` : `rgba(${coolRGB},${0.1 + p.d * 0.2})`;
          g.fill();
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();

  let camTweening = false;
  function setCam(x, y, s, ms = 900, ease = 'cubic-bezier(.65,0,.25,1)') {
    Object.assign(cam, { x, y, s });
    const { cx, cy } = focusPoint();
    const k = s * baseScale();
    if (ms) { el.world.style.transition = `transform ${T(ms)}ms ${ease}`; camTweening = true; }
    else if (camTweening) { el.world.style.transition = 'none'; camTweening = false; }
    el.world.style.transform = `translate3d(${cx - x * k}px, ${cy - y * k}px, 0) scale(${k})`;
    skyAt(y);
    if (!ms) void el.world.offsetWidth;
    return sleep(ms ? T(ms) : 0);
  }
  // kameran: följ punkten lodrätt, håll linjen (och ev. sidospår) i bild
  const camTo = (id, s = 1, ms, ease) => {
    const p = layout[id];
    // smal skärm med sidospår: båda spåren ryms inte, så följ den aktiva punkten och dess plattform
    const narrow = hasSide() && (SIDE_X + PLAT_X * 2 + 260) * baseScale() * s > innerWidth;
    const x = narrow ? p.x + p.dir * PLAT_X * 0.5 : hasSide() ? SIDE_X * 0.5 : 0;
    return setCam(x, p.y + 30, s, ms, ease);
  };
  // kameran centrerad på en plattform (används vid hopp in/ut)
  const camPlat = (id, s, ms, ease) => { const p = layout[id]; return setCam(p.px, p.py - 40, s, ms, ease); };

  function banner(html, cls = '') {
    // när bannern döljs behålls texten tills den tonat ut (annars syns en tom ruta)
    if (!html) { el.banner.classList.remove('is-on'); return; }
    el.banner.className = `tl-banner ${cls}`;
    el.banner.innerHTML = html;
    el.banner.classList.add('is-on');
  }

  /* ===================================================================
     PORTAL – "hoppa in" i en punkt / "kliva ut" ur den
     =================================================================== */
  let busy = false;
  let current = null;

  function show(layer, on) { layer.classList.toggle('is-active', on); }

  /* Öppningen in i scenen följer skivans exakta form och läge bildruta för bildruta,
     så att de aldrig kan glida isär medan kameran dyker eller stiger. */
  function followDisc(discEl, { until, maxMs }) {
    return new Promise((done) => {
      const t0 = performance.now();
      const step = () => {
        const d = discEl.getBoundingClientRect();
        const a = d.width / 2, b = d.height / 2;
        el.scene.style.clipPath = `ellipse(${a}px ${b}px at ${d.left + a}px ${d.top + b}px)`;
        if (until(a, b) || performance.now() - t0 > maxMs) return done();
        requestAnimationFrame(step);
      };
      step();
    });
  }
  // hur mycket skivan måste växa för att dess ellips ska täcka hela skärmen
  const coverScale = (rx, ry) => Math.hypot(innerWidth / 2 / rx, innerHeight / 2 / ry) * 1.04;

  async function enterNode(n, { rewind = false } = {}) {
    if (busy) return;
    busy = true;
    current = n;
    banner('');
    SFX.unlock();

    // 1. Kameran glider fram och centrerar skivan, och tar sedan ett litet andetag bakåt
    const p0 = layout[n.id];
    const S0 = 1.3;
    await setCam(p0.px, p0.py, S0, 800, 'cubic-bezier(.45,0,.2,1)');
    await setCam(p0.px, p0.py, S0, 0); // landa exakt (avbryt en ev. halvfärdig övergång)
    // skivans läge räknas ut i stället för att mätas: den ligger mitt i bild efter landningen
    const kk = S0 * baseScale();
    const { cx, cy } = focusPoint();
    const rx = 125 * kk, ry = 58 * kk;
    await setCam(p0.px, p0.py, S0 * 0.94, T(260), 'cubic-bezier(.2,.7,.3,1)');
    await setCam(p0.px, p0.py, S0 * 0.94, 0);
    const S1 = S0 * 0.94 * coverScale(rx * 0.94, ry * 0.94); // så djupt att skivans ellips täcker skärmen

    // 2. Bygg scenen bakom öppningen (klockan visar rätt tid från början)
    prepareScene(n);
    if (/^\d\d:\d\d$/.test(n.time)) el.hudClock.textContent = n.time;
    show(el.scene, true);
    el.scene.style.clipPath = `ellipse(${rx * 0.94}px ${ry * 0.94}px at ${cx}px ${cy}px)`;
    $(`.node[data-id="${n.id}"]`).classList.add('is-diving');

    // 3. Dyket: kameran accelererar ner i skivan och öppningen följer skivan exakt,
    //    tidslinjen rusar förbi och tonas bort, och scenen kommer emot en inifrån
    SFX.play('whooshIn');
    const ms = T(1250);
    const dive = 'cubic-bezier(.55,0,.75,.35)';
    setCam(p0.px, p0.py, S1, ms / (REDUCED ? 0.35 : 1), dive);
    el.sceneWorld.style.transformOrigin = `${cx}px ${cy}px`; // scenen växer ut ur skivan, inte ur skärmens mitt
    const anims = [
      el.sceneWorld.animate([{ transform: 'scale(.55)', opacity: 0.85 }, { transform: 'scale(1.04)', opacity: 1, offset: 0.88 }, { transform: 'scale(1)', opacity: 1 }],
        { duration: ms * 1.2, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }),
      el.viewport.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: ms, fill: 'forwards' }),
    ];
    const discEl = $(`.node[data-id="${n.id}"] .node__disc`);
    await followDisc(discEl, { until: (a, b) => Math.hypot(innerWidth / 2 / a, innerHeight / 2 / b) <= 1, maxMs: ms + 300 });
    if (rewind) el.rewind.classList.remove('is-on');
    el.scene.style.clipPath = 'none';
    await sleep(T(200));
    anims.forEach((a) => a.cancel());
    el.sceneWorld.style.transformOrigin = '';
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
    // vägen ut är dyket baklänges: man stiger upp ur scenen, den krymper in i skivan och tidslinjen zoomar ut runt en
    const p0 = layout[n.id];
    const S0 = 1.3;
    await setCam(p0.px, p0.py, S0, 0);
    const kk = S0 * baseScale();
    const { cx, cy } = focusPoint();
    const rx = 125 * kk, ry = 58 * kk;
    el.sceneWorld.style.transformOrigin = `${cx}px ${cy}px`;
    const S1 = S0 * coverScale(rx, ry);
    await setCam(p0.px, p0.py, S1, 0);
    const ms = T(1150);
    const rise = 'cubic-bezier(.25,.65,.45,1)';
    setCam(p0.px, p0.py, S0, ms / (REDUCED ? 0.35 : 1), rise);
    const anims = [
      el.sceneWorld.animate([{ transform: 'scale(1)' }, { transform: 'scale(.6)' }], { duration: ms, easing: rise, fill: 'forwards' }),
      el.viewport.animate([{ opacity: 0 }, { opacity: 1, offset: 0.45 }, { opacity: 1 }], { duration: ms }),
    ];
    // öppningen följer skivan medan kameran stiger, och stängs sedan helt in i skivan
    const discEl = $(`.node[data-id="${n.id}"] .node__disc`);
    const tEnd = performance.now() + ms;
    await followDisc(discEl, { until: () => performance.now() >= tEnd, maxMs: ms + 300 });
    anims.push(el.scene.animate([{ clipPath: el.scene.style.clipPath }, { clipPath: `ellipse(0px 0px at ${cx}px ${cy}px)` }], { duration: T(220), easing: 'ease-in', fill: 'forwards' }));
    await anims[anims.length - 1].finished;
    show(el.scene, false);
    anims.forEach((a) => a.cancel());
    el.scene.style.clipPath = '';
    el.sceneWorld.style.transformOrigin = '';
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
  }

  function cleanupScene() {
    fast = false;
    if (el.env._stop) { el.env._stop(); el.env._stop = null; }
    el.hotspots.innerHTML = '';
    el.captions.innerHTML = '';
    el.choice.innerHTML = ''; el.choice.classList.remove('is-on');
    el.panelHost.innerHTML = '';
    el.memory.innerHTML = '';
    el.titlecard.classList.remove('is-on');
    el.fxTint.className = 'fx fx--tint';
    el.eyelids.style.setProperty('--open', 1);
    el.stage.style.filter = '';
    $$('.ov-clock, .ov-note, .ov-person', el.stage).forEach((o) => o.remove());
    $$('.notif, .sighost, .phone', el.scene).forEach((o) => o.remove());
    el.scene.classList.remove('is-phone');
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
      persona = p;
      if (STORY.dayFor(p.id) !== DAY) useDay(p.id);
      $('#hudWho').hidden = false;
      el.hudName.textContent = p.name;
      el.hudRole.textContent = `${p.role}, ${p.age} år`;
      el.hudAvatar.textContent = '';
      el.hudAvatar.classList.add('has-photo');
      el.hudAvatar.style.backgroundImage = `url(${p.img})`;
      el.hudAvatar.setAttribute('aria-label', p.name);
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
      const isPlayer = o.who === 'Ola' || (persona && o.who === persona.name);
      text = personalize(text);
      o = { ...o, who: personalize(o.who) };
      return new Promise((resolve) => {
        // talare placeras vänster/höger i turordning per scen; Ola (spelaren), tankar och berättare i mitten
        let pos = 'center';
        const spoken = o.who && !o.inner && !o.narrator && !isPlayer;
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
      o = { ...o, prompt: personalize(o.prompt), options: o.options.map((x) => ({ ...x, label: personalize(x.label), sub: personalize(x.sub) })) };
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

    /* Signaler: diskreta punkter som deltagaren kan upptäcka (eller missa).
       Blockerar aldrig scenen; en upptäckt sparas i state.signals och visas som en kort notis. */
    signal({ id, line, ...spot }) {
      if (state.signals.includes(id)) return;
      api._hotspot({ label: 'Titta närmare', ...spot }).then(() => api._foundSignal(id, line));
    },
    _foundSignal(id, line) {
      if (!state.signals.includes(id)) state.signals.push(id);
      SFX.play('select');
      let host = $('.sighost', el.scene);
      if (!host) { host = h('div', 'sighost'); host.setAttribute('aria-live', 'polite'); el.scene.appendChild(host); }
      const t = h('div', 'sigtoast', `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg><span><small>Du lade märke till något</small>${line}</span>`);
      host.innerHTML = '';
      host.appendChild(t);
      requestAnimationFrame(() => t.classList.add('is-on'));
      setTimeout(() => { t.classList.remove('is-on'); setTimeout(() => t.remove(), T(500)); }, T(4200 + line.length * 30));
    },
    signalCount: () => state.signals.length,

    /* Mobilnotis som glider in uppifrån. signal: { id, line } lägger en signalpunkt på tidsstämpeln. */
    notify({ app = 'Mejl', from, subject, text, stamp, signal }) {
      api.unnotify();
      SFX.play('notif');
      const n = h('div', 'notif');
      n.innerHTML = `<div class="notif__top"><span class="notif__app">${app}</span><span class="notif__stamp">${stamp || 'nu'}</span></div>
        <b class="notif__from">${from}</b>${subject ? `<strong class="notif__subj">${subject}</strong>` : ''}<p class="notif__text">${text}</p>`;
      el.scene.appendChild(n);
      if (signal && !state.signals.includes(signal.id)) {
        const b = h('button', 'notif__sig', '<span class="hotspot__pulse"></span>');
        b.setAttribute('aria-label', 'Titta närmare på tidsstämpeln');
        b.addEventListener('click', (e) => { e.stopPropagation(); b.remove(); api._foundSignal(signal.id, signal.line); });
        $('.notif__stamp', n).appendChild(b);
      }
      requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add('is-on')));
      return n;
    },
    unnotify() { $$('.notif', el.scene).forEach((n) => { n.classList.remove('is-on'); setTimeout(() => n.remove(), T(500)); }); },

    /* Notisen som hela scenen: tom, lugn bakgrund där bara notisen animeras fram i mitten */
    phone() {
      api.unphone(true);
      el.scene.classList.add('is-phone');
      const ph = h('div', 'phone');
      ph.innerHTML = '<div class="phone__notifs" role="log" aria-live="polite"></div>';
      el.scene.appendChild(ph);
      requestAnimationFrame(() => requestAnimationFrame(() => ph.classList.add('is-on')));
      return ph;
    },
    phoneNotify({ app = 'Mejl', from, subject, text, stamp = 'nu', quiet = false, signal }) {
      const list = $('.phone .phone__notifs', el.scene);
      if (!list) return;
      if (!quiet) SFX.play('notif');
      const n = h('div', 'pnotif');
      n.innerHTML = `<div class="pnotif__top"><span class="pnotif__app">${app}</span><span class="pnotif__stamp">${stamp}</span></div>
        ${from ? `<b class="pnotif__from">${from}</b>` : ''}${subject ? `<strong class="pnotif__subj">${subject}</strong>` : ''}<p class="pnotif__text">${text}</p>`;
      list.prepend(n);
      if (signal && !state.signals.includes(signal.id)) {
        const b = h('button', 'notif__sig pnotif__sig', '<span class="hotspot__pulse"></span>');
        b.setAttribute('aria-label', 'Titta närmare på tidsstämpeln');
        b.addEventListener('click', (e) => { e.stopPropagation(); b.remove(); api._foundSignal(signal.id, signal.line); });
        $('.pnotif__stamp', n).appendChild(b);
      }
      requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add('is-on')));
      return n;
    },
    unphone(instant = false) {
      $$('.phone', el.scene).forEach((ph) => {
        if (instant) { ph.remove(); return; }
        ph.classList.remove('is-on'); ph.classList.add('is-off');
        setTimeout(() => ph.remove(), T(700));
      });
      el.scene.classList.remove('is-phone');
    },

    overlay(kind, value) {
      // en person (utklippt bild) som står i scenen: { src, x, bottom, h } i procent av scenen
      if (kind === 'person') {
        $$('.ov-person', el.stage).forEach((o) => o.remove());
        if (!value) return;
        const o = Object.assign(h('img', 'ov-person'), { src: value.src, alt: '' });
        Object.assign(o.style, { left: value.x + '%', bottom: (value.bottom || 0) + '%', height: (value.h || 70) + '%' });
        el.stage.appendChild(o);
        return;
      }
      if (kind === 'note') {
        let o = $('.ov-note', el.stage);
        if (!o) { o = h('div', 'ov-note'); o.setAttribute('aria-hidden', 'true'); el.stage.appendChild(o); }
        o.innerHTML = value;
        return;
      }
      if (kind === 'alarmclock') {
        let o = $('.ov-clock', el.stage);
        if (!o) { o = h('div', 'ov-clock'); o.setAttribute('aria-hidden', 'true'); el.stage.appendChild(o); }
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
      text = personalize(text);
      SFX.play('memory');
      el.memory.innerHTML = `<div class="mem" role="status"><svg class="mem__sign" viewBox="0 0 40 36" aria-hidden="true"><path d="M20 2 38.5 34H1.5z" fill="#ffd400" stroke="#111" stroke-width="2.5" stroke-linejoin="round"/><rect x="18" y="12" width="4" height="12" rx="1" fill="#111"/><circle cx="20" cy="28.5" r="2.3" fill="#111"/></svg><span>${text}</span></div>`;
      await sleep(fast ? 300 : T(2600));
      const m = $('.mem', el.memory);
      m && m.classList.add('is-out');
      await sleep(T(400));
      el.memory.innerHTML = '';
    },

    // gör att panelens innehåll alltid ryms utan scroll: krymper med zoom vid behov
    fit(elm, host) {
      if (!elm) return;
      const run = () => {
        elm.style.zoom = 1;
        const box = (host || elm.parentElement);
        const cs = getComputedStyle(box);
        const availH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const availW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const z = Math.min(1, availH / elm.scrollHeight, availW / elm.scrollWidth);
        elm.style.zoom = z < 1 ? Math.max(0.55, z * 0.98) : 1;
      };
      run();
      if (!elm._fitRO) { elm._fitRO = new ResizeObserver(() => requestAnimationFrame(run)); elm._fitRO.observe(host || elm.parentElement); }
      return run;
    },

    panel(cls, html) {
      const p = h('div', `panel ${cls}`, html);
      el.panelHost.innerHTML = '';
      el.panelHost.appendChild(p);
      requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('is-on')));
      return p;
    },
    async closePanel(p) { p.classList.remove('is-on'); await sleep(T(450)); p.remove(); },

    /* Spegeln: svepa mellan tre personer. Den i mitten står spegelvänd i glaset,
       de två andra syns vid sidorna så att det är tydligt att det finns tre. */
    personaPick(personas, prompt, sub) {
      return new Promise((resolve) => {
        let cur = Math.max(0, personas.findIndex((x) => x.id === 'ola'));
        const n = personas.length;
        const p = api.panel('panel--mirror', `
          <div class="mirror__wrap">
          <div class="mirror__head"><h2 class="mirror__prompt" id="mirrorQ">${prompt}</h2>${sub ? `<p class="mirror__sub">${sub}</p>` : ''}</div>
          <div class="mirror__stage">
          <div class="mirror" role="group" aria-roledescription="karusell" aria-labelledby="mirrorQ">
            <div class="mirror__frame">
              <div class="mirror__glass" tabindex="0" aria-label="Svep eller använd piltangenterna för att byta person">
                <div class="mirror__track">${personas.map((x, k) => `
                  <figure class="mirror__slide" data-i="${k}" aria-hidden="true"><img src="${x.img}" alt="" draggable="false">${x.wave ? `<video src="${x.wave}" muted playsinline loop preload="auto" aria-hidden="true"></video>` : ''}</figure>`).join('')}
                </div>
                <canvas class="mirror__fog" aria-hidden="true"></canvas>
                <p class="mirror__hint" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.2-3l-2.3-4a1.5 1.5 0 0 1 2.6-1.5L9 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Torka av spegeln</p>
                <div class="mirror__sheen" aria-hidden="true"></div>
              </div>
            </div>
            <button class="mirror__nav mirror__nav--prev" aria-label="Föregående person"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button class="mirror__nav mirror__nav--next" aria-label="Nästa person"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          </div>
          <div class="mirror__tabs" role="tablist" aria-label="Personer">${personas.map((x, k) => `
            <button class="mirror__tab" role="tab" data-i="${k}"><span class="mirror__face" style="background-image:url(${x.img})"></span><span><small>Dag ${x.day}</small>${x.name}</span></button>`).join('')}
          </div>
          <article class="mirror__info" aria-live="polite">
            <h3 class="mirror__theme"></h3>
            <p class="mirror__who"></p>
            <p class="mirror__desc"></p>
            <button class="opt mirror__pick"></button>
          </article>
          </div>
          </div>`);
        const slides = $$('.mirror__slide', p), tabs = $$('.mirror__tab', p), track = $('.mirror__track', p);
        const sync = () => {
          slides.forEach((sl, k) => {
            const off = ((k - cur + n + 1) % n) - 1; // -1, 0, 1 – runt om
            sl.style.setProperty('--off', off);
            sl.style.setProperty('--a', Math.abs(off));
            const was = sl.classList.contains('is-center');
            sl.classList.toggle('is-center', off === 0);
            // den som kliver fram i spegeln hälsar: en liten rörelse, eller vinkfilmen om den finns (persona.wave)
            const v = $('video', sl);
            if (off === 0 && !was) {
              sl.classList.remove('is-greet'); void sl.offsetWidth; sl.classList.add('is-greet');
              if (v) { v.currentTime = 0; v.play().then(() => sl.classList.add('has-wave')).catch(() => {}); }
            } else if (off !== 0 && v) { v.pause(); sl.classList.remove('has-wave'); }
          });
          tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === cur)); t.tabIndex = k === cur ? 0 : -1; });
          const x = personas[cur];
          const info = $('.mirror__info', p);
          info.classList.remove('is-swap'); void info.offsetWidth; info.classList.add('is-swap');
          $('.mirror__theme', p).textContent = x.theme;
          $('.mirror__who', p).textContent = `${x.name}, ${x.age} år · ${x.role}`;
          $('.mirror__desc', p).textContent = x.desc;
          $('.mirror__pick', p).textContent = `Välj dag ${x.day}`;
          refit && refit();
        };
        const glassEl = $('.mirror__glass', p);
        const go = (k) => {
          if (fogged) return;
          cur = (k + n) % n; SFX.play('hover'); sync();
          glassEl.classList.remove('is-sweep'); void glassEl.offsetWidth; glassEl.classList.add('is-sweep');
        };

        /* imma: torka bort med fingret/musen; försvinner av sig själv efter en stund */
        let fogged = true;
        p.classList.add('is-fogged');
        const fog = $('.mirror__fog', p), fg = fog.getContext('2d');
        const paintFog = () => {
          const r = fog.getBoundingClientRect();
          fog.width = Math.max(60, Math.round(r.width / 3)); fog.height = Math.max(90, Math.round(r.height / 3));
          const gr = fg.createLinearGradient(0, 0, 0, fog.height);
          gr.addColorStop(0, 'rgba(226,234,240,.94)'); gr.addColorStop(1, 'rgba(200,212,222,.9)');
          fg.globalCompositeOperation = 'source-over'; fg.fillStyle = gr; fg.fillRect(0, 0, fog.width, fog.height);
          for (let i = 0; i < 260; i++) { fg.fillStyle = `rgba(255,255,255,${Math.random() * 0.18})`; fg.beginPath(); fg.arc(Math.random() * fog.width, Math.random() * fog.height, Math.random() * 2.2, 0, 6.3); fg.fill(); }
        };
        requestAnimationFrame(paintFog);
        let lastWipe = null, wipeCount = 0;
        const clearFog = () => {
          if (!fogged) return;
          fogged = false;
          p.classList.remove('is-fogged'); p.classList.add('is-clear');
          SFX.play('dissolve');
          clearTimeout(autoClear);
          refit && refit();
        };
        const wipe = (e) => {
          if (!fogged) return;
          const r = fog.getBoundingClientRect();
          const x = (e.clientX - r.left) * fog.width / r.width, y = (e.clientY - r.top) * fog.height / r.height;
          fg.globalCompositeOperation = 'destination-out';
          fg.lineCap = 'round'; fg.lineJoin = 'round'; fg.lineWidth = fog.width * 0.22;
          fg.beginPath(); fg.moveTo(lastWipe ? lastWipe[0] : x, lastWipe ? lastWipe[1] : y); fg.lineTo(x, y); fg.stroke();
          lastWipe = [x, y];
          if (++wipeCount % 12 === 0) {
            const d = fg.getImageData(0, 0, fog.width, fog.height).data;
            let clear = 0; for (let i = 3; i < d.length; i += 16) if (d[i] < 40) clear++;
            if (clear / (d.length / 16) > 0.45) clearFog();
          }
        };
        const autoClear = setTimeout(clearFog, T(9000));
        glassEl.addEventListener('pointermove', (e) => { if (fogged && (e.buttons || e.pointerType === 'mouse')) wipe(e); });
        glassEl.addEventListener('pointerleave', () => { lastWipe = null; });
        glassEl.addEventListener('pointerup', () => { lastWipe = null; });
        glassEl.addEventListener('keydown', (e) => { if (fogged && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); clearFog(); } });

        /* spegeln lutar lite mot pekaren och reflexen följer med */
        const frameEl = $('.mirror__frame', p);
        if (!REDUCED) {
          // målet sätts av pekaren, lutningen glider dit en gång per bildruta (ingen CSS-övergång som startas om)
          const tilt = { x: 0, y: 0, tx: 0, ty: 0, raf: 0, last: 0 };
          const step = (now) => {
            const dt = Math.min(0.05, (now - tilt.last) / 1000 || 0.016); tilt.last = now;
            const f = 1 - Math.exp(-dt * 7);
            tilt.x += (tilt.tx - tilt.x) * f; tilt.y += (tilt.ty - tilt.y) * f;
            frameEl.style.setProperty('--rx', `${(-tilt.y * 5).toFixed(2)}deg`); frameEl.style.setProperty('--ry', `${(tilt.x * 7).toFixed(2)}deg`);
            frameEl.style.setProperty('--sx', `${(tilt.x * 30).toFixed(2)}%`);
            tilt.raf = Math.abs(tilt.tx - tilt.x) + Math.abs(tilt.ty - tilt.y) > 0.002 && p.isConnected ? requestAnimationFrame(step) : 0;
          };
          p.addEventListener('pointermove', (e) => {
            const r = frameEl.getBoundingClientRect();
            tilt.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2)));
            tilt.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (innerHeight / 2)));
            if (!tilt.raf) { tilt.last = performance.now(); tilt.raf = requestAnimationFrame(step); }
          });
        }
        $('.mirror__nav--prev', p).addEventListener('click', () => go(cur - 1));
        $('.mirror__nav--next', p).addEventListener('click', () => go(cur + 1));
        tabs.forEach((t) => t.addEventListener('click', () => go(+t.dataset.i)));
        slides.forEach((sl) => sl.addEventListener('click', () => { if (!sl.classList.contains('is-center') && !dragged) go(+sl.dataset.i); }));
        p.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
          if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
        });
        // svep
        const glass = $('.mirror__glass', p);
        let sx = null, dragged = false;
        glass.addEventListener('pointerdown', (e) => { if (fogged) { lastWipe = null; wipe(e); return; } sx = e.clientX; dragged = false; glass.setPointerCapture(e.pointerId); track.classList.add('is-drag'); });
        glass.addEventListener('pointermove', (e) => {
          if (sx == null) return;
          const dx = e.clientX - sx;
          if (Math.abs(dx) > 6) dragged = true;
          if (!fogged) track.style.setProperty('--drag', `${dx}px`);
        });
        const end = (e) => {
          if (sx == null) return;
          const dx = e.clientX - sx;
          sx = null;
          track.classList.remove('is-drag');
          track.style.setProperty('--drag', '0px');
          if (!fogged && Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
          setTimeout(() => { dragged = false; }, 0);
        };
        glass.addEventListener('pointerup', end);
        glass.addEventListener('pointercancel', end);
        $('.mirror__pick', p).addEventListener('click', async () => {
          SFX.play('select');
          p.classList.add('is-picked');
          await sleep(T(1300));
          await api.closePanel(p);
          resolve(personas[cur].id);
        });
        let refit = null;
        sync();
        refit = api.fit($('.mirror__wrap', p), p);
      });
    },

    /* Dagens kalender i dagsvy: timrutnät, block efter längd, nu-linje och krock sida vid sida */
    agenda(items, { from = 6, to = 17, now = '06:20', date = 'Torsdag 2 oktober' } = {}) {
      return new Promise((resolve) => {
        const min = (t) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + mm; };
        const top = (t) => `calc(${(min(t) - from * 60) / 60} * var(--hh))`;
        const hours = Array.from({ length: to - from + 1 }, (_, k) => from + k);
        const clashAt = items.filter((x) => x.clash).map((x) => x.t);
        const p = api.panel('panel--agenda', `
          <div class="dcal" role="img" aria-label="Kalender för i dag: ${items.map((x) => `${x.t} ${x.title}`).join(', ')}. Två möten krockar kl ${clashAt.join(', ')}.">
            <div class="dcal__head"><b>I dag</b><span>${date}</span></div>
            <div class="dcal__week">${['mån', 'tis', 'ons', 'tor', 'fre'].map((d, k) => `<span class="dcal__wd ${k === 3 ? 'is-today' : ''}">${d}<b>${29 + k > 30 ? 29 + k - 30 : 29 + k}</b></span>`).join('')}</div>
            <div class="dcal__grid">
              <div class="dcal__hours" style="--hours:${to - from}">
                ${hours.map((hh) => `<div class="dcal__h" style="top:${top(`${hh}:00`)}"><span>${String(hh).padStart(2, '0')}</span></div>`).join('')}
                <div class="dcal__now" style="top:${top(now)}"></div>
                ${items.map((x, k) => {
                  const pair = items.some((y) => y !== x && y.t === x.t);
                  const side = pair ? (items.findIndex((y) => y.t === x.t) === k ? 'half-l' : 'half-r') : '';
                  return `<div class="dcal__ev dcal__ev--${x.color || 'blue'} ${pair ? 'is-clash' : ''} ${side}" style="--i:${k};top:${top(x.t)};height:calc(${(x.d || 60) / 60} * var(--hh) - 3px)"><time>${x.t}</time><b>${x.title}</b></div>`;
                }).join('')}
                ${clashAt.map((t) => `<span class="dcal__clash" style="top:${top(t)}">Krock!</span>`).join('')}
              </div>
            </div>
            <div class="dcal__foot"><button class="btn">Okej. Kör.</button></div>
          </div>`);
        // hela dagen får plats: timhöjden räknas fram ur tillgänglig höjd
        const grid = $('.dcal__grid', p), hrs = $('.dcal__hours', p);
        const size = () => { const hh = Math.max(22, Math.min(54, (grid.clientHeight - 26) / (to - from))); hrs.style.setProperty('--hh', hh + 'px'); p.classList.toggle('is-tight', hh < 40); };
        size();
        new ResizeObserver(size).observe(grid);
        if ($('.dcal__clash', p)) setTimeout(() => SFX.play('warn'), T(1200));
        $('button', p).addEventListener('click', async () => { SFX.play('click'); await api.closePanel(p); resolve(); });
      });
    },

    mailSort(mails) {
      return new Promise((resolve) => {
        const order = [];
        const p = api.panel('panel--mail', `
          <div class="mailwin">
            <div class="mailwin__bar"><i></i><i></i><i></i><span>Inkorg – 3 olästa</span></div>
            <p class="mailwin__help">Klicka på mailen i den ordning ${persona ? persona.name : 'Ola'} ska ta hand om dem.</p>
            <ul class="mailwin__list">${mails.map((m) => `
              <li><button class="mail" data-id="${m.id}">
                <span class="mail__rank"></span>
                <span class="mail__body"><b>${m.from}</b><strong>${m.subject}</strong><small>${m.preview}</small></span>
              </button></li>`).join('')}</ul>
            <div class="mailwin__foot"><button class="btn btn--ghost js-reset">Börja om</button><button class="btn btn--primary js-done" disabled>Klar</button></div>
          </div>`);
        api.fit($('.mailwin', p), p);
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
            <div class="ev ev--a">14:30 Budgetmöte</div>
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
            <div class="refl__head"><span>${DAY.reportHead || 'Skiftrapport'}</span><span class="refl__page"></span></div>
            <div class="refl__dots">${steps.map(() => '<i></i>').join('')}</div>
            <div class="refl__body"></div>
          </div>`);
        const body = $('.refl__body', p);
        const dots = $$('.refl__dots i', p);
        let idx = -1;
        const refit = () => api.fit($('.refl', p), p);
        // när ett svar ger återkoppling växer bladet – krymp igen så att allt ryms
        let fitQueued = false;
        new MutationObserver(() => { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; refit(); }); }).observe(p, { childList: true, subtree: true });

        const foot = (label = 'Fortsätt', disabled = false) =>
          `<div class="refl__foot"><button class="btn btn--primary js-next" ${disabled ? 'disabled' : ''}>${label}</button></div>`;
        const reply = (text) => `<p class="refl__reply">${text}</p>`;

        async function go(n) {
          idx = n;
          dots.forEach((d, k) => { d.classList.toggle('is-done', k < n); d.classList.toggle('is-now', k === n); });
          $('.refl__page', p).textContent = `Sida ${n + 1} av ${steps.length}`;
          body.classList.add('is-out');
          await sleep(T(320));
          render(steps[n]);
          refit();
          body.classList.remove('is-out');
        }
        const next = () => { SFX.play('click'); if (idx < steps.length - 1) go(idx + 1); };

        function render(st) {
          st = JSON.parse(JSON.stringify(st, (k, v) => (typeof v === 'string' ? personalize(v) : v)), (k, v) => v);
          const orig = steps[idx];
          if (orig.respond) st.respond = (a) => personalize(orig.respond(a));
          const head = `<p class="refl__eyebrow">${st.eyebrow || ''}</p>`;
          if (st.type === 'recap') {
            body.innerHTML = `${head}<h2 class="refl__q">${st.title}</h2>
              <ol class="recap">${st.items.map((it, k) => `
                <li class="${it.key ? 'is-key' : ''}" style="--i:${k}"><time>${it.time}</time>
                  <span>${it.was ? `<span class="recap__was">${it.was}</span>` : ''}${it.text}</span></li>`).join('')}</ol>${foot()}`;
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
              ${mine.length ? `<div class="pledge"><p class="refl__eyebrow">Mitt åtagande</p>${mine.map((m) => `<blockquote>${m}</blockquote>`).join('')}<span class="pledge__stamp" aria-hidden="true">Signerat</span></div>` : ''}
              <p class="done-msg">Kursen är genomförd ✓</p>
              <div class="refl__foot"><button class="btn btn--primary js-finish">Avsluta dagen</button></div>`;
            $('.js-finish', body).addEventListener('click', () => finishDay(answers));
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
    if (n.id === DAY.critical) {
      const wasRewind = state.phase === 'rewind';
      // vid omspelning byts spåret först när sidohändelserna lösts upp (straighten)
      if (!wasRewind) state.track = DAY.bad.includes(state.choices.A) ? 'A' : 'A2';
      if (wasRewind) {
        await exitScene(n);
        await straighten();
        return;
      }
    }

    if (n.id !== DAY.end) await exitScene(n);

    if (n.id === DAY.end) return; // sammanfattningen blir kvar

    if (n.id === DAY.consequence && state.accident && state.phase === 'normal') {
      await chainBack();
      return;
    }
    await goNext();
  }

  async function goNext() {
    renderTimeline();
    const nx = nextNode();
    if (!nx) return;
    // ingen scen startar av sig själv – deltagaren hoppar in när den är redo
    banner('');
    await camTo(nx.id, 1, 1300, 'cubic-bezier(.45,0,.2,1)');
  }

  function onNodeClick(n) {
    if (busy) return;
    if (state.phase === 'rewind' && n.id === DAY.critical) { doRewind(n); return; }
    const nx = nextNode();
    if (nx && nx.id === n.id) { SFX.play('click'); enterNode(n); }
  }

  /* Efter olyckan: följ kedjan bakåt, låt 07:30 lysa */
  async function chainBack() {
    busy = true;
    el.timeline.classList.add('is-alarm');
    banner('<strong>Dagen tog en annan vändning.</strong><small>Vi följer trådarna bakåt…</small>', 'tl-banner--alarm');
    const chain = DAY.chain;
    for (const id of chain) {
      await camTo(id, 1, 800);
      const e = $(`.node[data-id="${id}"]`);
      e.classList.add('is-chain');
      SFX.play('pulse');
      await sleep(T(450));
    }
    state.phase = 'rewind';
    renderTimeline();
    await camTo(DAY.critical, 1.05, 700);
    banner(`<strong>Allt började i ett litet ögonblick.</strong><small>Valet kl ${byId[DAY.critical].time} lyser. Hoppa tillbaka och prova ett annat.</small>`, 'tl-banner--alarm');
    busy = false;
  }

  async function doRewind(n) {
    busy = true;
    banner('');
    SFX.play('rewind');
    el.rewind.classList.add('is-on');
    // klockan spolas bakåt från konsekvensen till det kritiska valet
    const mins = (t) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + mm; };
    const from = mins(byId[DAY.consequence].time), to = mins(byId[DAY.critical].time);
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
    await setCam(SIDE_X * 0.5, layout[DAY.sideFocus].y, 0.6, 1000);
    SFX.play('dissolve');
    $$('.node--side').forEach((e, i) => setTimeout(() => e.classList.add('is-dissolving'), i * T(220)));
    const bp = $('#branchPath');
    if (bp) { bp.style.transition = `stroke-dashoffset ${T(1300)}ms ease-in`; bp.style.strokeDashoffset = bp.getTotalLength(); }
    await sleep(T(1500));
    $$('.node--side').forEach((e) => e.remove());
    state.track = 'A2';
    // konsekvensen spelas om i ny version
    state.played = state.played.filter((id) => id !== DAY.consequence && !byId[id].track);
    state.phase = 'fixed';
    delete el.timeline.dataset.branchShown;
    renderTimeline();
    await sleep(T(700));
    // ljuspuls längs den raka linjen
    await lightPulse(DAY.critical, DAY.consequence);
    SFX.play('success');
    banner(`<strong>Tidslinjen är rak igen.</strong><small>${DAY.healedText}</small>`, 'tl-banner--good');
    await sleep(T(1400));
    busy = false;
    await goNext();
  }

  async function lightPulse(fromId, toId) {
    const a = layout[fromId], b = layout[toId];
    const dot = h('div', 'tl-pulse');
    el.world.appendChild(dot);
    dot.style.top = a.y + 'px';
    setCam(0, a.y, 0.8, 0);
    const ms = T(2400);
    dot.animate([{ top: a.y + 'px' }, { top: b.y + 'px' }], { duration: ms, easing: 'cubic-bezier(.5,0,.5,1)', fill: 'forwards' });
    setCam(0, b.y, 0.8, ms / (REDUCED ? 0.35 : 1), 'cubic-bezier(.5,0,.5,1)');
    el.timeline.classList.add('is-healed');
    await sleep(ms + 200);
    dot.remove();
  }

  /* ===================================================================
     DAGEN ÄR KLAR – hela tidslinjen i bild, en sammanfattning och de andra dagarna
     =================================================================== */
  const completed = new Set();
  async function finishDay(answers) {
    if (busy) return;
    completed.add(state.persona);
    await exitScene(byId[DAY.end]);
    busy = true;
    banner('');
    const panel = showEndPanel(answers || {});
    // hela dagen i bild, i ytan bredvid (bred skärm) eller ovanför (smal skärm) panelen
    const wide = innerWidth >= 900;
    const ys = Object.values(layout).map((v) => v.y);
    const y0 = Math.min(...ys) - ROW * 0.75, y1 = Math.max(...ys) + ROW * 0.35;
    const region = wide
      ? { x0: 0, x1: innerWidth - panel.offsetWidth - 40, y0: 90, y1: innerHeight - 24 }
      : { x0: 0, x1: innerWidth, y0: 84, y1: innerHeight - panel.offsetHeight - 28 };
    const base = baseScale();
    const K = Math.min(0.5 * base, (region.y1 - region.y0) / (y1 - y0), (region.x1 - region.x0) / (PLAT_X * 2 + 300));
    const sx = (region.x0 + region.x1) / 2, sy = (region.y0 + region.y1) / 2;
    await setCam((innerWidth / 2 - sx) / K, (y0 + y1) / 2 + (innerHeight / 2 - sy) / K, K / base, 1600);
    el.timeline.classList.add('is-done');
    panel.classList.add('is-on');
    busy = false;
  }

  function showEndPanel(answers) {
    const me = STORY.personas.find((x) => x.id === state.persona) || STORY.personas[1];
    const sum = DAY.summary ? DAY.summary(state) : [];
    const pledge = (answers.atagande || [])[0];
    const card = (x) => {
      const own = !!STORY.days[x.id];
      const done = completed.has(x.id);
      return `<button class="dcard ${x.id === me.id ? 'is-me' : ''}" data-id="${x.id}" ${own ? '' : 'disabled'}>
        <span class="dcard__img" style="background-image:url(${x.img})"></span>
        <span class="dcard__body">
          <span class="dcard__day">Dag ${x.day}${done ? ' · <b>Spelad</b>' : ''}</span>
          <strong>${x.name}</strong>
          <small>${x.role} · ${x.theme}</small>
          <span class="dcard__cta">${!own ? 'Kommer snart' : x.id === me.id ? 'Spela igen' : `Spela ${x.name}s dag`}</span>
        </span>
      </button>`;
    };
    const others = STORY.personas.filter((x) => x.id !== me.id);
    const p = h('aside', 'tl-end');
    p.setAttribute('aria-label', 'Dagen är klar');
    p.innerHTML = `
      <p class="tl-end__eyebrow">Vår dag · Dag ${me.day} klar</p>
      <h2 class="tl-end__title">${me.name}s dag är klar.</h2>
      ${sum.length ? `<ul class="tl-end__sum">${sum.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
      ${pledge ? `<blockquote class="tl-end__pledge"><span>Ditt åtagande</span>${pledge}</blockquote>` : ''}
      <p class="tl-end__label">Spela en annan dag</p>
      <div class="tl-end__cards">${others.map(card).join('')}</div>
      <div class="tl-end__foot">
        <button class="tl-end__link js-same">Spela ${me.name}s dag igen</button>
        <button class="tl-end__link js-restart">Börja om från start</button>
      </div>`;
    el.timeline.appendChild(p);
    $$('.dcard:not([disabled])', p).forEach((b) => {
      b.addEventListener('mouseenter', () => SFX.play('hover'));
      b.addEventListener('click', () => { SFX.play('select'); playDay(b.dataset.id); });
    });
    $('.js-same', p).addEventListener('click', () => { SFX.play('click'); playDay(me.id); });
    $('.js-restart', p).addEventListener('click', () => restart());
    setTimeout(() => { const f = $('.dcard:not([disabled])', p); f && f.focus({ preventScroll: true }); }, T(2400));
    return p;
  }

  /* Spela en dag direkt efter spegeln: 06:00 och 06:20 räknas som gjorda */
  async function playDay(personaId) {
    if (busy) return;
    busy = true;
    const p = $('.tl-end', el.timeline);
    if (p) { p.classList.remove('is-on'); setTimeout(() => p.remove(), T(600)); }
    SFX.stopAll();
    SFX.play('whooshIn');
    // tona ut den gamla dagen
    el.world.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(8px)' }], { duration: T(700), easing: 'ease-in', fill: 'forwards' });
    await sleep(T(720));
    state = freshState();
    const who = STORY.personas.find((x) => x.id === personaId);
    state.persona = who.id;
    api.setPersona(who);
    state.played = nodes.slice(0, 2).map((n) => n.id);
    el.nodes.innerHTML = '';
    el.lines.innerHTML = '';
    el.timeline.classList.remove('is-alarm', 'is-healed', 'is-done');
    delete el.timeline.dataset.branchShown;
    renderTimeline();
    await setCam(0, layout[nodes[1].id].y + 30, 0.7, 0);
    el.world.getAnimations().forEach((a) => a.cancel());
    el.world.animate([{ opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: T(900), easing: 'ease-out' });
    banner(`<strong>${who.name}s dag</strong><small>${who.theme}. ${who.role}, ${who.age} år.</small>`);
    await sleep(T(2200));
    busy = false;
    await goNext();
  }

  function restart() {
    SFX.stopAll();
    state = freshState();
    if (location.search) location.href = location.pathname; else location.reload();
  }

  /* ------------------------------------------------------------ start */
  async function start() {
    SFX.unlock();
    SFX.play('tick');
    await sleep(T(650));
    SFX.play('whooshIn');
    show(el.intro, false);
    show(el.timeline, true);
    renderTimeline();
    // etableringsbild: svep över hela dagen, landa på 06:00
    const last = visibleNodes().length - 1;
    await setCam(0, last * ROW * 0.5, 0.3, 0);
    banner('<strong>Här är dagen.</strong><small>Varje punkt är ett ögonblick du kan hoppa in i.</small>');
    await sleep(T(1700));
    await goNext();
  }

  let started = false;
  $('#startBtn').addEventListener('click', () => { if (!started) { started = true; start(); } });

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
  const SPEAKER = '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/>';
  const ICON_ON = `<svg viewBox="0 0 24 24" aria-hidden="true">${SPEAKER}<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const ICON_OFF = `<svg viewBox="0 0 24 24" aria-hidden="true">${SPEAKER}<path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const muteIcon = () => $$('.js-mute').forEach((b) => { b.innerHTML = SFX.isMuted() ? ICON_OFF : ICON_ON; b.setAttribute('aria-pressed', String(SFX.isMuted())); });
  $$('.js-mute').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); SFX.toggleMute(); muteIcon(); }));
  muteIcon();
  window.addEventListener('resize', () => { if (!busy) setCam(cam.x, cam.y, cam.s, 0); });

  /* ------------------------------------------------------------ utvecklarläge
     ?at=n1324                 hoppa till en punkt (tidigare punkter markeras som spelade)
     ?at=n1614&a=lugnt         välj vad som svarades vid det kritiska valet
     ?p=ulrika&at=u1330&a=vilosa&b=sen   Ulrikas dag */
  const qs = new URLSearchParams(location.search);
  const devPersona = STORY.personas.find((x) => x.id === (qs.get('p') || 'ola')) || STORY.personas[1];
  useDay(devPersona.id);
  if (qs.get('at') && byId[qs.get('at')]) {
    const target = qs.get('at');
    const idx = nodes.findIndex((n) => n.id === target);
    const past = (id) => idx > nodes.findIndex((n) => n.id === id);
    if (past(DAY.critical)) {
      state.choices.A = qs.get('a') || DAY.bad[0];
      state.firstA = state.choices.A;
      state.triedA = [state.choices.A];
      state.track = DAY.bad.includes(state.choices.A) ? 'A' : 'A2';
    }
    DAY.dev(state, qs, past);
    state.persona = devPersona.id;
    state.played = nodes.slice(0, idx).filter(isVisible).map((n) => n.id);
    if (target === DAY.consequence && state.track === 'A') state.accident = false;
    api.setPersona(devPersona);
    el.timeline.dataset.branchShown = '1';
    $('.intro__startlabel').textContent = `Fortsätt vid ${byId[target].time}`;
  } else {
    useDay('ola');
  }

  // fokus på element utanför bild får aldrig scrolla upplevelsen
  $$('#app, .layer, #tlViewport, #sceneWorld').forEach((x) => x.addEventListener('scroll', () => { x.scrollTop = 0; x.scrollLeft = 0; }));

  window.__pp = { state: () => state, busy: () => busy, enterNode, nodes: () => nodes, day: () => DAY, api, setCam, layout: () => layout, render: () => renderTimeline() };
})();
