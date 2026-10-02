/* Enkel syntljudmotor (WebAudio) – inga ljudfiler behövs.
   Byt gärna ut mot riktiga ljud senare: anropen i story.js/app.js går via SFX.play(namn). */
(function () {
  let ctx = null;
  let master = null;
  let muted = false;
  const loops = {};

  try { muted = localStorage.getItem('pp_muted') === '1'; } catch (e) { /* ignore */ }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
    return ctx;
  }

  function noiseBuffer(sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function tone({ freq = 440, type = 'sine', dur = 0.2, vol = 0.2, attack = 0.01, slideTo = null, when = 0, dest = master }) {
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise({ dur = 0.6, vol = 0.25, from = 300, to = 3000, q = 1.2, when = 0, type = 'bandpass' }) {
    const t = ctx.currentTime + when;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuffer(dur + 0.1);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + dur + 0.1);
  }

  const sounds = {
    ding: () => { tone({ freq: 2093, dur: 1.4, vol: 0.18, attack: 0.005 }); tone({ freq: 4186, dur: 0.9, vol: 0.05, attack: 0.005 }); },
    hum: () => tone({ freq: 110, type: 'sawtooth', dur: 2.2, vol: 0.03, attack: 0.3 }),
    click: () => tone({ freq: 880, type: 'triangle', dur: 0.07, vol: 0.12 }),
    hover: () => tone({ freq: 1400, type: 'sine', dur: 0.04, vol: 0.04 }),
    select: () => { tone({ freq: 660, type: 'triangle', dur: 0.12, vol: 0.15 }); tone({ freq: 990, type: 'triangle', dur: 0.18, vol: 0.12, when: 0.07 }); },
    whooshIn: () => { noise({ dur: 0.9, vol: 0.35, from: 200, to: 4000 }); tone({ freq: 90, type: 'sine', dur: 1.0, vol: 0.25, slideTo: 40 }); },
    whooshOut: () => noise({ dur: 0.7, vol: 0.25, from: 3500, to: 250 }),
    memory: () => { tone({ freq: 523, dur: 0.5, vol: 0.12 }); tone({ freq: 784, dur: 0.7, vol: 0.1, when: 0.12 }); },
    tick: () => tone({ freq: 1800, type: 'square', dur: 0.03, vol: 0.05 }),
    success: () => [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.5, vol: 0.12, when: i * 0.09 })),
    warn: () => { tone({ freq: 220, type: 'sawtooth', dur: 0.35, vol: 0.12 }); tone({ freq: 207, type: 'sawtooth', dur: 0.5, vol: 0.1, when: 0.2 }); },
    rewind: () => { for (let i = 0; i < 14; i++) tone({ freq: 1200 - i * 60, type: 'square', dur: 0.06, vol: 0.05, when: i * 0.09 }); noise({ dur: 1.4, vol: 0.2, from: 5000, to: 400 }); },
    pulse: () => tone({ freq: 196, type: 'sine', dur: 1.2, vol: 0.25, attack: 0.3 }),
    dissolve: () => noise({ dur: 1.2, vol: 0.15, from: 6000, to: 9000, type: 'highpass' }),
    heartbeat: () => { tone({ freq: 60, dur: 0.15, vol: 0.5 }); tone({ freq: 55, dur: 0.2, vol: 0.4, when: 0.22 }); },
  };

  /* Loopar: väckarklocka, sirener, rumston */
  const loopDefs = {
    alarm: (stopFlag) => {
      const beep = () => {
        if (stopFlag.stop) return;
        for (let i = 0; i < 4; i++) tone({ freq: 2093, type: 'square', dur: 0.08, vol: 0.06, when: i * 0.13 });
        stopFlag.t = setTimeout(beep, 1000);
      };
      beep();
    },
    siren: (stopFlag) => {
      const wail = () => {
        if (stopFlag.stop) return;
        tone({ freq: 600, type: 'sawtooth', dur: 0.7, vol: 0.07, slideTo: 1100, attack: 0.05 });
        tone({ freq: 1100, type: 'sawtooth', dur: 0.7, vol: 0.07, slideTo: 600, attack: 0.05, when: 0.7 });
        stopFlag.t = setTimeout(wail, 1400);
      };
      wail();
    },
    room: (stopFlag) => {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuffer(4);
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 380;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 1.5);
      s.connect(f).connect(g).connect(master);
      s.start();
      stopFlag.node = { s, g };
    },
    factory: (stopFlag) => {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuffer(4);
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 160; f.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 1.5);
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 1.6; lg.gain.value = 0.12;
      lfo.connect(lg).connect(g.gain);
      lfo.start();
      s.connect(f).connect(g).connect(master);
      s.start();
      stopFlag.node = { s, g, lfo };
    },
    car: (stopFlag) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = 48;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 220;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 1.5);
      o.connect(f).connect(g).connect(master);
      o.start();
      stopFlag.node = { s: o, g };
    },
  };

  window.SFX = {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    play(name) {
      if (!ensure() || muted) return;
      try { sounds[name] && sounds[name](); } catch (e) { /* ignore */ }
    },
    loop(name) {
      if (!ensure() || loops[name]) return;
      const flag = { stop: false };
      loops[name] = flag;
      try { loopDefs[name](flag); } catch (e) { /* ignore */ }
    },
    stop(name) {
      const flag = loops[name];
      if (!flag) return;
      flag.stop = true;
      clearTimeout(flag.t);
      if (flag.node) {
        const { s, g, lfo } = flag.node;
        try {
          g.gain.cancelScheduledValues(ctx.currentTime);
          g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
          s.stop(ctx.currentTime + 0.7);
          lfo && lfo.stop(ctx.currentTime + 0.7);
        } catch (e) { /* ignore */ }
      }
      delete loops[name];
    },
    stopAll() { Object.keys(loops).forEach((k) => this.stop(k)); },
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('pp_muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      if (ensure()) master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.05);
      return muted;
    },
  };
})();
