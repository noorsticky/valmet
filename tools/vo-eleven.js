#!/usr/bin/env node
/* Skapar voice over med ElevenLabs: en mp3 per rad i voiceover/manus.csv, i assets/vo/.
   Kräver miljövariabeln ELEVENLABS_API_KEY och att api.elevenlabs.io är tillåten i nätverket.

   node tools/vo-eleven.js --voices        listar rösterna på kontot (namn och voice_id)
   node tools/vo-eleven.js                 skapar alla rader som saknar ljudfil
   node tools/vo-eleven.js --only u0830    bara rader vars filnamn börjar så (en scen, en dag: "u", "t", "n")
   node tools/vo-eleven.js --redo          skapar om även rader som redan har en fil
   node tools/vo-eleven.js --dry           visar vad som skulle skapas, utan att anropa ElevenLabs

   Röster per talare står i voiceover/voices.json. Efteråt körs tools/vo-manus.js, så att
   kursen hittar de nya filerna. Anropen går via curl, som följer miljöns proxy. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const KEY = process.env.ELEVENLABS_API_KEY;
const API = 'https://api.elevenlabs.io/v1';

function api(method, url, body, outFile) {
  const a = ['-sS', '--fail-with-body', '-X', method, url, '-H', `xi-api-key: ${KEY}`, '-H', 'accept: application/json, audio/mpeg'];
  if (body) a.push('-H', 'content-type: application/json', '--data-binary', JSON.stringify(body));
  if (outFile) a.push('-o', outFile);
  return execFileSync('curl', a, { encoding: outFile ? 'utf8' : 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

if (!KEY && !flag('--dry')) {
  console.error('ELEVENLABS_API_KEY saknas. Lägg in nyckeln i miljöns inställningar och starta en ny session.');
  process.exit(1);
}

if (flag('--voices')) {
  const v = JSON.parse(api('GET', `${API}/voices`));
  for (const x of v.voices) console.log(`${x.voice_id}  ${x.name}  ${Object.values(x.labels || {}).join(', ')}`);
  process.exit(0);
}

// manuset: uppdatera först så att det stämmer med story.js
execFileSync('node', [path.join(__dirname, 'vo-manus.js')], { stdio: 'inherit' });
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'voiceover/voices.json'), 'utf8'));
const csv = fs.readFileSync(path.join(ROOT, 'voiceover/manus.csv'), 'utf8').replace(/^﻿/, '').trim().split('\n');
const head = csv.shift().split(';');
const parse = (line) => (line.match(/("([^"]|"")*"|[^;]*)(;|$)/g) || []).slice(0, head.length).map((c) => c.replace(/;$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
const rows = csv.map((l) => Object.fromEntries(parse(l).map((v, i) => [head[i], v])));

const speaker = (r) => (r.Vem || '(namnlös)').split(',')[0].trim();
const voiceFor = (r) => cfg.voices[speaker(r)] || cfg.default;
const only = opt('--only');
const todo = rows.filter((r) => (!only || r.Fil.startsWith(only)) && (flag('--redo') || !fs.existsSync(path.join(ROOT, 'assets/vo', r.Fil))));

const missingVoice = [...new Set(todo.filter((r) => !voiceFor(r)).map(speaker))];
if (missingVoice.length && !flag('--dry')) {
  console.error(`Röst saknas i voiceover/voices.json för: ${missingVoice.join(', ')} (eller sätt "default").`);
  process.exit(1);
}

console.log(`${todo.length} rader att skapa, ${todo.reduce((n, r) => n + r.Text.length, 0)} tecken.`);
fs.mkdirSync(path.join(ROOT, 'assets/vo'), { recursive: true });
let done = 0;
for (const r of todo) {
  const out = path.join(ROOT, 'assets/vo', r.Fil);
  if (flag('--dry')) { console.log(`${r.Fil}  ${speaker(r)}  ${r.Text}`); continue; }
  const body = {
    text: r.Text,
    model_id: cfg.model_id,
    language_code: cfg.language_code,
    voice_settings: r.Typ === 'Tanke' ? cfg.thought_settings : cfg.settings,
  };
  const tmp = out + '.part';
  try {
    api('POST', `${API}/text-to-speech/${voiceFor(r)}?output_format=${cfg.output_format}`, body, tmp);
    fs.renameSync(tmp, out);
    done++;
    console.log(`✓ ${r.Fil}  ${speaker(r)}`);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    console.error(`✗ ${r.Fil}: ${(e.stdout || e.message).toString().slice(0, 300)}`);
    if (/quota|401|unauthorized/i.test(String(e.stdout || e.message))) break;
  }
}
if (!flag('--dry')) {
  console.log(`${done} filer skapade.`);
  execFileSync('node', [path.join(__dirname, 'vo-manus.js')], { stdio: 'inherit' });
}
