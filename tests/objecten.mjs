// Draait alles.rq voor een paar losse objecten en toont de triples per object.
// Gebruik: node tests/objecten.mjs construct/alles.rq <uri> [<uri> ...]
import { readFileSync } from 'node:fs';

const [file, ...uris] = process.argv.slice(2);
const rq = readFileSync(file, 'utf8');
const values = `VALUES ?s { ${uris.map(u => `<${u}>`).join(' ')} }`;
const test = rq.replace(/# --- objecten[\s\S]*?# --- einde objecten/, values);
if (test === rq) throw new Error('blok "objecten" niet gevonden');

const t0 = Date.now();
const res = await fetch('https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/sparql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/n-triples' },
  body: new URLSearchParams({ query: test }),
});
const text = await res.text();
console.log(`status ${res.status}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (!res.ok) { console.log(text.slice(0, 2000)); process.exit(1); }

const short = s => s
  .replace('https://linkeddata.cultureelerfgoed.nl/def/ceo-elastic#', 'ceo-elastic:')
  .replace('https://linkeddata.cultureelerfgoed.nl/def/ceox#', 'ceox:')
  .replace('https://linkeddata.cultureelerfgoed.nl/def/ceo#', 'ceo:')
  .replace('http://www.opengis.net/ont/geosparql#', 'geo:')
  .replace('http://www.w3.org/2000/01/rdf-schema#', 'rdfs:')
  .replace('http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'a')
  .replace('https://data.cultureelerfgoed.nl/term/id/rn/2/', 'rn:')
  .replace('https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/', 'ck:');

const per = new Map();
for (const line of text.split('\n')) {
  const m = line.match(/^<([^>]+)> <([^>]+)> (.*) \.$/);
  if (!m) continue;
  const [, s, p, o] = m;
  if (!per.has(s)) per.set(s, []);
  per.get(s).push([short(p), short(o.replace(/^<|>$/g, '')).slice(0, 110)]);
}
for (const [s, rows] of per) {
  console.log(`\n=== ${short(s)}  (${rows.length} triples, ${new Set(rows.map(r => r[0])).size} velden)`);
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  for (const [p, o] of rows) console.log(`  ${p.padEnd(42)} ${o}`);
}
