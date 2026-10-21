#!/usr/bin/env node
/* Tar fram inspelningsmanus för voice over och listan över ljudfiler som finns.
   Användning:  node tools/vo-manus.js

   Skriver:
   - voiceover/manus.csv  en rad per replik/tanke/berättarrad, med filnamn och om filen finns
   - js/vo-files.js       vilka filer i assets/vo/ som hör till en rad i manuset (läses av kursen)

   Scenerna har många grenar (val, inkorgens ordning, tillbakaspolning …). Skriptet kör
   varje scen många gånger med slumpade val och tillstånd och samlar alla rader som sägs. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { window: {}, console };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
for (const f of ['js/story.js', 'js/vo.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const STORY\b/m, 'var STORY'), sandbox, { filename: f });
}
const STORY = sandbox.window.STORY;
const VO = sandbox.window.VO;

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
const STATES = {
  ola: () => ({ A: ['lugnt', 'avvakta', 'rapport', 'skylt'], B: ['lisa', 'motet'], C: ['kim', 'rapport', 'aw'] }),
  ulrika: () => ({ A: ['vilosa', 'nasta', 'flytta', 'vidare'], B: ['stanna', 'sen'], C: ['patrik', 'emma', 'linn'] }),
};
function randomState(dayId) {
  const o = STATES[dayId]();
  const A = pick(o.A);
  return {
    persona: dayId, track: pick(['A', 'B']), rewound: Math.random() < 0.5, snooze: pick([0, 1, 2]),
    choices: { A, B: pick(o.B), C: shuffle(o.C) }, firstA: pick([A, ...o.A]), triedA: [],
    signals: [], accident: Math.random() < 0.5,
  };
}

// en låtsas-api: say samlar rader, val slumpas, allt annat svarar direkt
function fakeApi(state, lines) {
  const api = {
    state, lastTimedOut: Math.random() < 0.3,
    say: async (text, o = {}) => { lines.push({ text, o }); },
    choose: async (o) => { const opts = o.options || []; return opts.length ? pick(opts).id : null; },
    mailSort: async (mails) => shuffle(mails.map((m) => m.id)),
    personaPick: async (ps) => pick(ps).id,
    bigQuestion: async () => {}, reflect: async () => ({}), agenda: async () => {},
    setPersona: () => {}, _foundSignal: () => {},
  };
  return new Proxy(api, { get: (t, k) => (k in t ? t[k] : async () => {}) });
}

const rows = new Map();
const val = (v, s) => (typeof v === 'function' ? v(s) : v);
(async () => {
  for (const [dayId, day] of Object.entries(STORY.days)) {
    for (const n of day.nodes) {
      if (!n.play) continue;
      for (let run = 0; run < 1500; run++) {
        const state = randomState(dayId);
        const lines = [];
        try { await n.play(fakeApi(state, lines)); } catch (e) { /* en gren som kräver ett tillstånd vi inte slumpat fram */ }
        for (const { text, o } of lines) {
          if (typeof text !== 'string') continue;
          const id = VO.id(n.id, text, o);
          if (!rows.has(id)) {
            rows.set(id, { id, day: n.id.startsWith('u') ? 'Ulrika' : n.id === 'n0600' || n.id === 'n0620' ? 'Gemensam' : 'Ola',
              time: n.time, title: val(n.title, state), who: o.who || (o.narrator ? 'Berättare' : ''), kind: VO.kind(o), text, order: rows.size });
          }
        }
      }
    }
  }

  const voDir = path.join(ROOT, 'assets/vo');
  fs.mkdirSync(voDir, { recursive: true });
  const files = new Set(fs.readdirSync(voDir).filter((f) => f.endsWith(VO.ext)).map((f) => f.slice(0, -VO.ext.length)));
  // ordning: scenernas ordning, sedan där texten står i story.js
  const src = fs.readFileSync(path.join(ROOT, 'js/story.js'), 'utf8');
  const nodeOrder = new Map();
  Object.values(STORY.days).forEach((d) => d.nodes.forEach((n) => { if (!nodeOrder.has(n.id)) nodeOrder.set(n.id, nodeOrder.size); }));
  const at = (r) => { const i = src.indexOf(r.text); return i < 0 ? 1e9 : i; };
  const list = [...rows.values()].sort((a, b) => nodeOrder.get(a.id.split('_')[0]) - nodeOrder.get(b.id.split('_')[0]) || at(a) - at(b));
  const kindName = { replik: 'Replik', tanke: 'Tanke', berattare: 'Berättare' };
  const csv = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const out = [['Fil', 'Dag', 'Tid', 'Scen', 'Vem', 'Typ', 'Text', 'Inspelad'].join(';')]
    .concat(list.map((r) => [r.id + VO.ext, r.day, r.time, r.title, r.who, kindName[r.kind], r.text, files.has(r.id) ? 'ja' : ''].map(csv).join(';')));
  fs.mkdirSync(path.join(ROOT, 'voiceover'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'voiceover/manus.csv'), '﻿' + out.join('\n') + '\n');

  const have = list.filter((r) => files.has(r.id)).map((r) => r.id);
  const orphans = [...files].filter((f) => !rows.has(f));
  fs.writeFileSync(path.join(ROOT, 'js/vo-files.js'),
    `/* Genereras av tools/vo-manus.js – ändra inte för hand. Inspelade rader som finns i assets/vo/. */\nwindow.VO_FILES = ${JSON.stringify(have, null, 0)};\n`);
  console.log(`${list.length} rader i manuset, ${have.length} inspelade.`);
  if (orphans.length) console.log(`Filer utan rad i manuset (texten har ändrats?): ${orphans.join(', ')}`);
})();
