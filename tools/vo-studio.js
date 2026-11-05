#!/usr/bin/env node
/* Bygger voiceover/rostverktyg.html: ett fristående verktyg som öppnas i webbläsaren på den egna
   datorn och skapar alla voice over-filer med ElevenLabs, utan att molnmiljön behöver nå ElevenLabs.
   Nyckeln skrivs in i verktyget och stannar i webbläsaren. Resultatet är en zip med en mp3 per rad,
   namngivna som i voiceover/manus.csv – packa upp i assets/vo/ och kör node tools/vo-manus.js.

   node tools/vo-studio.js   (kör vo-manus.js först så att manuset är aktuellt) */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
execFileSync('node', [path.join(__dirname, 'vo-manus.js')], { stdio: 'inherit' });
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'voiceover/voices.json'), 'utf8'));
const csv = fs.readFileSync(path.join(ROOT, 'voiceover/manus.csv'), 'utf8').replace(/^﻿/, '').trim().split('\n');
const head = csv.shift().split(';');
const parse = (line) => (line.match(/("([^"]|"")*"|[^;]*)(;|$)/g) || []).slice(0, head.length).map((c) => c.replace(/;$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
const rows = csv.map((l) => Object.fromEntries(parse(l).map((v, i) => [head[i], v])))
  .map((r) => ({ file: r.Fil, day: r.Dag, time: r.Tid, scene: r.Scen, who: (r.Vem || '(namnlös)').split(',')[0].trim(), whoFull: r.Vem, kind: r.Typ, text: r.Text }));

const data = JSON.stringify({ rows, cfg }).replace(/</g, '\\u003c');
const html = `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vår dag – röstverktyg</title>
<style>
  :root { --bg: #f6f4ef; --card: #fff; --ink: #1d1c19; --mute: #6b675f; --line: #e4e0d8; --accent: #2f6f4f; --bad: #b3261e; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 980px; margin: 0 auto; padding: 32px 16px 80px; }
  h1 { margin: 0 0 4px; font-size: 26px; } h2 { margin: 0 0 12px; font-size: 18px; }
  p { margin: 0 0 12px; color: var(--mute); }
  section { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 20px; margin: 18px 0; }
  label { font-weight: 600; display: block; margin-bottom: 6px; }
  input[type=password], select { width: 100%; padding: 9px 10px; border: 1px solid var(--line); border-radius: 8px; font: inherit; background: #fff; }
  button { padding: 9px 16px; border-radius: 8px; border: 1px solid var(--accent); background: var(--accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  button.ghost { background: #fff; color: var(--accent); }
  button:disabled { opacity: .45; cursor: default; }
  .row { display: flex; gap: 10px; align-items: end; flex-wrap: wrap; }
  .row > div { flex: 1 1 260px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--line); vertical-align: middle; }
  th { font-size: 13px; color: var(--mute); font-weight: 600; }
  td.n { color: var(--mute); font-size: 13px; white-space: nowrap; }
  .bar { height: 10px; background: var(--line); border-radius: 99px; overflow: hidden; margin: 12px 0 6px; }
  .bar i { display: block; height: 100%; width: 0; background: var(--accent); transition: width .2s; }
  #log { font: 12.5px/1.45 ui-monospace, monospace; max-height: 220px; overflow: auto; background: #faf9f6; border: 1px solid var(--line); border-radius: 8px; padding: 10px; white-space: pre-wrap; }
  .err { color: var(--bad); } .ok { color: var(--accent); }
  .flow { margin-top: 22px; } .flow h3 { margin: 0 0 4px; font-size: 16px; } .flow > p { margin: 0 0 8px; font-size: 13.5px; }
  .dup td { background: #fbebeb; } .warn { color: var(--bad); font-size: 13px; display: block; margin-top: 4px; }
  .steps { margin: 0; padding-left: 20px; color: var(--mute); } .steps li { margin: 4px 0; }
</style>
</head>
<body>
<main>
  <h1>Vår dag – röstverktyg</h1>
  <p>Skapar voice over till alla ${rows.length} repliker, tankar och berättarrader med ElevenLabs. Allt körs här i webbläsaren. Nyckeln sparas inte och skickas bara till ElevenLabs.</p>
  <ol class="steps"><li>Klistra in nyckeln och hämta rösterna.</li><li>Välj en röst per person och provlyssna.</li><li>Skapa alla och ladda ner zip-filen. Skicka den till Claude.</li></ol>

  <section>
    <h2>1. Nyckel</h2>
    <div class="row">
      <div><label for="key">ElevenLabs API-nyckel</label><input id="key" type="password" autocomplete="off" placeholder="sk_…"></div>
      <button id="load">Hämta röster</button>
    </div>
    <p id="keymsg" style="margin-top:10px"></p>
  </section>

  <section>
    <h2>2. Röster</h2>
    <p>Rösterna visas per dag, så att du ser vilka som hörs i samma flöde. Inom en dag bör alla ha olika röster. Mellan dagarna går det bra att återanvända. Samma person har samma röst i alla dagar den är med i, och i både repliker och tankar. Valen sparas i webbläsaren till nästa gång.</p>
    <p id="need"></p>
    <div id="voices"></div>
  </section>

  <section>
    <h2>3. Skapa</h2>
    <div class="row">
      <div><label for="only">Vilka rader</label>
        <select id="only"><option value="">Alla (${rows.length} rader, ${rows.reduce((n, r) => n + r.text.length, 0)} tecken)</option>
        <option value="n">Olas dag (och de gemensamma scenerna)</option><option value="u">Ulrikas dag</option><option value="t">Tomas dag</option></select></div>
      <button id="run" disabled>Skapa ljudfiler</button>
      <button id="dl" class="ghost" disabled>Ladda ner zip</button>
    </div>
    <div class="bar"><i id="prog"></i></div>
    <p id="status">Hämta rösterna först.</p>
    <div id="log"></div>
  </section>
</main>
<script>
const { rows, cfg } = ${data};
const API = 'https://api.elevenlabs.io/v1';
const $ = (s) => document.querySelector(s);
const speakers = [...new Set(rows.map((r) => r.who))];
const count = (w) => rows.filter((r) => r.who === w).length;
let voices = [], files = new Map();
let saved = {}; try { saved = JSON.parse(localStorage.getItem('vardag_voices') || '{}'); } catch (e) {}
const log = (t, cls) => { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = t; $('#log').prepend(d); };
const key = () => $('#key').value.trim();

async function tts(r) {
  const voice = (saved[r.who] || saved['Berättare'] || '');
  if (!voice) throw new Error('ingen röst vald för ' + r.who);
  const res = await fetch(API + '/text-to-speech/' + voice + '?output_format=' + cfg.output_format, {
    method: 'POST',
    headers: { 'xi-api-key': key(), 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text: r.text, model_id: cfg.model_id, voice_settings: r.kind === 'Tanke' ? cfg.thought_settings : cfg.settings }),
  });
  if (!res.ok) throw new Error(res.status + ' ' + (await res.text()).slice(0, 200));
  return res.blob();
}

// vilka dagar en rad hörs i: gemensamma rader (06:00, 06:20) hörs i alla, utom personens egen tanke vid kalendern
const FLOWS = ['Ola', 'Ulrika', 'Tomas'];
const flowsOf = (r) => (r.day !== 'Gemensam' ? [r.day] : FLOWS.includes(r.who) ? [r.who] : FLOWS);
const inFlow = (f) => rows.filter((r) => flowsOf(r).includes(f));
const flowSpeakers = (f) => { const c = {}; inFlow(f).forEach((r) => { c[r.who] = (c[r.who] || 0) + 1; }); return Object.entries(c).sort((a, b) => (a[0] === 'Berättare' ? -1 : b[0] === 'Berättare' ? 1 : b[1] - a[1])); };
const voiceName = (id) => (voices.find((v) => v.voice_id === id) || {}).name || '';
const flowTitle = { Ola: 'Olas dag – Produktion och press', Ulrika: 'Ulrikas dag – Människor och möten', Tomas: 'Tomas dag – Arbete i kokaren' };

function checkDups() {
  document.querySelectorAll('#voices tr[data-who]').forEach((tr) => {
    const f = tr.dataset.flow, w = tr.dataset.who, v = saved[w];
    const same = v ? flowSpeakers(f).map((x) => x[0]).filter((o) => o !== w && saved[o] === v) : [];
    tr.classList.toggle('dup', same.length > 0);
    tr.querySelector('.warn').textContent = same.length ? 'Samma röst som ' + (same.length > 3 ? same.slice(0, 3).join(', ') + ' och ' + (same.length - 3) + ' till' : same.join(', ')) + ' i den här dagen' : '';
  });
}

function renderVoices() {
  const opts = '<option value="">– välj röst –</option>' + voices.map((v) => '<option value="' + v.voice_id + '">' + v.name + (v.labels ? ' · ' + Object.values(v.labels).join(', ') : '') + '</option>').join('');
  const most = Math.max(...FLOWS.map((f) => flowSpeakers(f).length));
  $('#need').innerHTML = 'Du har <b>' + voices.length + '</b> röster. Den dag med flest talare har <b>' + most + '</b>. Har du färre röster än så: ge samma röst till personer som har få rader och aldrig hörs i samma scen.';
  $('#voices').innerHTML = FLOWS.map((f) => {
    const sp = flowSpeakers(f);
    return '<div class="flow"><h3>' + flowTitle[f] + '</h3><p>' + sp.length + ' röster i den här dagen, ' + inFlow(f).length + ' rader.</p><table><thead><tr><th>Person</th><th>Rader</th><th>Röst</th><th></th></tr></thead><tbody>' +
      sp.map(([w, n]) => '<tr data-flow="' + f + '" data-who="' + w + '"><td><b>' + w + '</b></td><td class="n">' + n + '</td><td><select>' + opts + '</select><span class="warn"></span></td><td><button class="ghost" data-play>Provlyssna</button></td></tr>').join('') +
      '</tbody></table></div>';
  }).join('');
  document.querySelectorAll('#voices tr[data-who]').forEach((tr) => {
    const w = tr.dataset.who, s = tr.querySelector('select'), b = tr.querySelector('[data-play]');
    s.value = saved[w] || '';
    // samma person i flera dagar: alla dess rutor följer med
    s.onchange = () => {
      saved[w] = s.value;
      try { localStorage.setItem('vardag_voices', JSON.stringify(saved)); } catch (e) {}
      document.querySelectorAll('#voices tr[data-who="' + CSS.escape(w) + '"] select').forEach((o) => { o.value = s.value; });
      checkDups();
    };
    b.onclick = async () => {
      const r = rows.find((x) => x.who === w && flowsOf(x).includes(tr.dataset.flow)) || rows.find((x) => x.who === w);
      b.disabled = true; b.textContent = 'Skapar…';
      try { const blob = await tts(r); new Audio(URL.createObjectURL(blob)).play(); log('Provlyssnade ' + w + ': ' + r.text); }
      catch (e) { log('Provlyssning misslyckades: ' + e.message, 'err'); }
      b.disabled = false; b.textContent = 'Provlyssna';
    };
  });
  checkDups();
}

$('#load').onclick = async () => {
  if (!key()) { $('#keymsg').textContent = 'Klistra in nyckeln först.'; return; }
  $('#keymsg').textContent = 'Hämtar röster…';
  try {
    const res = await fetch(API + '/voices', { headers: { 'xi-api-key': key() } });
    if (!res.ok) throw new Error(res.status + ' ' + (await res.text()).slice(0, 200));
    voices = (await res.json()).voices;
    $('#keymsg').innerHTML = '<span class="ok">Nyckeln fungerar. ' + voices.length + ' röster hittades.</span>';
    renderVoices(); $('#run').disabled = false; $('#status').textContent = 'Välj röster och klicka på Skapa ljudfiler.';
  } catch (e) {
    $('#keymsg').innerHTML = '<span class="err">Kunde inte hämta röster: ' + e.message + '</span>';
  }
};

$('#run').onclick = async () => {
  const only = $('#only').value;
  const todo = rows.filter((r) => !only || r.file.startsWith(only)).filter((r) => !files.has(r.file));
  const missing = [...new Set(todo.filter((r) => !saved[r.who] && !saved['Berättare']).map((r) => r.who))];
  if (missing.length) { $('#status').innerHTML = '<span class="err">Välj röst för: ' + missing.join(', ') + '</span>'; return; }
  $('#run').disabled = true;
  let n = 0, fail = 0;
  for (const r of todo) {
    $('#status').textContent = 'Skapar ' + (n + 1) + ' av ' + todo.length + ': ' + r.who + ' – ' + r.text.slice(0, 60);
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try { files.set(r.file, await tts(r)); ok = true; }
      catch (e) { if (attempt === 2 || /401|quota/i.test(e.message)) { fail++; log('✗ ' + r.file + ': ' + e.message, 'err'); break; } await new Promise((s) => setTimeout(s, 1500 * (attempt + 1))); }
    }
    n++;
    $('#prog').style.width = (100 * n / todo.length) + '%';
    if (ok) log('✓ ' + r.file + '  ' + r.who);
  }
  $('#status').innerHTML = (fail ? '<span class="err">' + fail + ' rader misslyckades – klicka igen för att försöka med dem.</span> ' : '<span class="ok">Klart.</span> ') + files.size + ' ljudfiler klara att ladda ner.';
  $('#run').disabled = false; $('#dl').disabled = !files.size;
};

// enkel zip utan komprimering (mp3 går ändå inte att packa mer)
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u) => { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
async function makeZip(entries) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  for (const [name, data] of entries) {
    const u = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : enc.encode(data);
    const nm = enc.encode(name), crc = crc32(u);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, u.length, true); h.setUint32(22, u.length, true); h.setUint16(26, nm.length, true);
    parts.push(h, nm, u);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, u.length, true); c.setUint32(24, u.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    central.push(c, nm);
    off += 30 + nm.length + u.length;
  }
  const size = central.reduce((n, x) => n + x.byteLength, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, e], { type: 'application/zip' });
}

$('#dl').onclick = async () => {
  const v = { ...cfg, voices: Object.fromEntries(speakers.map((w) => [w, saved[w] || ''])) };
  const blob = await makeZip([...files, ['voices.json', JSON.stringify(v, null, 2)]]);
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vardag-voiceover.zip'; a.click();
};
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'voiceover/rostverktyg.html'), html);
console.log(`voiceover/rostverktyg.html: ${rows.length} rader, ${new Set(rows.map((r) => r.who)).size} talare.`);
