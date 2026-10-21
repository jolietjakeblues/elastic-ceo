// Vergelijkt twee taalanalyses op hetzelfde corpus in een lokale Elasticsearch (zie docs/taalanalyse.md).
// Maakt twee indexen met de mappings uit triply/elastic-service.json: één met triply/nl-analyse-nl3.json
// (zoals Erfgoed-sdo-nl3) en één met triply/nl-analyse.json (ceo-elastic). Zoekt in alle tekstvelden,
// zoals het zoekveld "Alles" in de demo, en toont per zoekvraag het aantal treffers en de woorden
// die in de eerste 100 treffers gemarkeerd werden.
// Gebruik: node tests/vergelijk-analyse.mjs <corpus.ndjson>   (maak het corpus met tests/corpus.mjs)
import { readFileSync, createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const ES = process.env.ES_URL ?? 'http://127.0.0.1:9201';
const [corpus] = process.argv.slice(2);
if (!corpus) throw new Error('gebruik: node tests/vergelijk-analyse.mjs <corpus.ndjson>');
const lees = f => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
const service = lees('../triply/elastic-service.json');
const ANALYSES = { nl3: lees('../triply/nl-analyse-nl3.json'), nieuw: lees('../triply/nl-analyse.json') };

// Elk zoekwoord met een korte reden; groep "monument" moet gelijk blijven of beter worden.
const VRAGEN = [
  ['archeologie', 'terp'], ['archeologie', 'terpen'], ['archeologie', 'wierde'], ['archeologie', 'paal'],
  ['archeologie', 'paalgat'], ['archeologie', 'paalgaten'], ['archeologie', 'kuil'], ['archeologie', 'greppel'],
  ['archeologie', 'graf'], ['archeologie', 'graven'], ['archeologie', 'crematiegraven'], ['archeologie', 'urnenvelden'],
  ['archeologie', 'hunebed'], ['archeologie', 'aardewerk'], ['archeologie', 'keramiek'], ['archeologie', 'haard'],
  ['archeologie', 'schrabber'], ['archeologie', 'scherven'], ['archeologie', 'waterput'], ['archeologie', 'kom'], ['archeologie', 'grape'], ['archeologie', 'onbepaald'],
  ['monument', 'cuypers'], ['monument', 'kapel'], ['monument', 'kapellen'], ['monument', 'dakkapel'], ['monument', 'kerk'],
  ['monument', 'molen'], ['monument', 'toren'], ['monument', 'kasteel'], ['monument', 'fort'],
  ['monument', 'grafmonument'], ['monument', 'waterpomp'], ['monument', 'boerderij'], ['monument', 'woning'],
  ['monument', 'Lekkerkerk'], ['monument', 'Kerkstraat'], ['monument', 'dijk'],
];

async function es(method, path, body, ndjson = false) {
  const res = await fetch(ES + path, { method, headers: { 'Content-Type': ndjson ? 'application/x-ndjson' : 'application/json' },
    body: body === undefined ? undefined : ndjson ? body : JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

// mappings uit de service-configuratie, met de gekozen analyse
const props = Object.assign({}, ...service.config.componentTemplates.map(c => c.template.mappings.properties));
const dyn = service.config.componentTemplates.flatMap(c => c.template.mappings.dynamic_templates ?? []);
const TEKST = Object.keys(props).filter(k => props[k].analyzer === 'nl_index');

for (const [naam, analysis] of Object.entries(ANALYSES)) {
  await es('DELETE', `/vergelijk-${naam}`);
  const r = await es('PUT', `/vergelijk-${naam}`, { settings: { analysis, number_of_replicas: 0 }, mappings: { dynamic_templates: dyn, properties: props } });
  if (r.status !== 200) throw new Error(`${naam}: ${JSON.stringify(r.json.error?.reason ?? r.json)}`);
}

// corpus in beide indexen
let batch = [], aantal = 0;
const stuur = async () => {
  if (!batch.length) return;
  for (const naam of Object.keys(ANALYSES)) {
    const body = batch.map(d => `${JSON.stringify({ index: { _index: `vergelijk-${naam}`, _id: d._id } })}\n${JSON.stringify(d._source)}\n`).join('');
    const r = await es('POST', '/_bulk', body, true);
    if (r.json.errors) throw new Error(`bulk ${naam}: ${JSON.stringify(r.json.items.find(i => i.index.error).index.error)}`);
  }
  aantal += batch.length; batch = [];
};
for await (const line of createInterface({ input: createReadStream(corpus) })) {
  if (!line) continue;
  batch.push(JSON.parse(line));
  if (batch.length === 1000) await stuur();
}
await stuur();
for (const naam of Object.keys(ANALYSES)) await es('POST', `/vergelijk-${naam}/_refresh`);
console.log(`${aantal} documenten in beide indexen, ${TEKST.length} tekstvelden\n`);

async function zoek(naam, q) {
  const r = await es('POST', `/vergelijk-${naam}/_search`, {
    size: 100, _source: false, track_total_hits: true,
    query: { query_string: { query: q, fields: TEKST } },
    highlight: { fields: Object.fromEntries(TEKST.map(f => [f, { number_of_fragments: 3, fragment_size: 40 }])) },
  });
  const woorden = new Map();
  for (const h of r.json.hits.hits) {
    const gezien = new Set();
    for (const frags of Object.values(h.highlight ?? {})) for (const f of frags) for (const m of f.matchAll(/<em>(.*?)<\/em>/g)) gezien.add(m[1].toLowerCase());
    for (const w of gezien) woorden.set(w, (woorden.get(w) ?? 0) + 1);
  }
  const top = [...woorden].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w, n]) => `${w} ${n}`).join(', ');
  return { n: r.json.hits.total.value, top };
}

console.log('| Groep | Zoekvraag | nl3 | nieuw | Gemarkeerd in de eerste 100 (nl3) | Gemarkeerd in de eerste 100 (nieuw) |');
console.log('|---|---|---:|---:|---|---|');
for (const [groep, q] of VRAGEN) {
  const [a, b] = [await zoek('nl3', q), await zoek('nieuw', q)];
  console.log(`| ${groep} | \`${q}\` | ${a.n} | ${b.n} | ${a.top} | ${b.top} |`);
}
