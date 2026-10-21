// Draait alles.rq voor alle objecten van één klasse en telt tijd, triples en velden.
// Gebruik: node tests/schaal.mjs construct/alles.rq <klasse zonder ceo:, bijv. Complex>
import { readFileSync } from 'node:fs';
const [file, klasse] = process.argv.slice(2);
const rq = readFileSync(file, 'utf8').replace(/# --- objecten[\s\S]*?# --- einde objecten/, `GRAPH graph:instanties-rce { ?s a ceo:${klasse} }`);
const t0 = Date.now();
const res = await fetch('https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/sparql', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/n-triples' }, body: new URLSearchParams({ query: rq }) });
const text = await res.text();
const lines = text.split('\n').filter(l => l.endsWith(' .'));
const subj = new Set(lines.map(l => l.split(' ')[0]));
const props = new Map(); for (const l of lines) { const p = l.split(' ')[1]; props.set(p, (props.get(p) || 0) + 1); }
console.log(`${klasse}: status ${res.status}, ${((Date.now() - t0) / 1000).toFixed(1)} s, ${lines.length} triples, ${subj.size} subjecten, ${(text.length / 1e6).toFixed(1)} MB`);
if (!res.ok) console.log(text.slice(0, 500));
for (const [p, n] of [...props].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(7)}  ${p.replace(/.*[#/]/, '')}`);
