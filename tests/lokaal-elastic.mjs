// Test triply/elastic-service.json tegen een lokale Elasticsearch (Docker, zie docs/elastic-document.md):
// laadt de templates zoals Triply ze krijgt, indexeert voorbeeldobjecten uit construct/alles.rq en
// controleert de types en een paar zoekvragen.
// Gebruik: node tests/lokaal-elastic.mjs   (ES_URL, standaard http://127.0.0.1:9201)
// Let op: verwijdert en maakt de index "index" en de templates opnieuw in die lokale Elasticsearch.
import { readFileSync } from 'node:fs';
import { bouwDocumenten } from './documenten.mjs';

const ES = process.env.ES_URL ?? 'http://127.0.0.1:9201';
const CK = 'https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/';
const CE = 'https://linkeddata cultureelerfgoed nl/def/ceo-elastic#';
const GEO = 'http://www opengis net/ont/geosparql#asWKT';

const OBJECTEN = [
  'rijksmonument/59284', 'rijksmonument/74775', 'rijksmonument/33398', 'rijksmonument/18717', 'rijksmonument/32455', 'rijksmonument/65329',
  'complex/62476', 'gezicht/10134173', 'werelderfgoed/10134675', 'archeologischterrein/10123020',
  'archeologischonderzoeksgebied/2020275', 'vondstlocatie/10032284', 'archeologischcomplex/10000011',
  'grondsporen/10000026', 'vondsten/10000096',
].map(o => CK + o);

let fouten = 0;
const ok = (gelukt, tekst) => { console.log(`${gelukt ? 'ok  ' : 'FOUT'}  ${tekst}`); if (!gelukt) fouten++; };

async function es(method, path, body, ndjson = false) {
  const res = await fetch(ES + path, {
    method,
    headers: { 'Content-Type': ndjson ? 'application/x-ndjson' : 'application/json' },
    body: body === undefined ? undefined : ndjson ? body : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// 1. templates, zoals in de service-configuratie
const service = JSON.parse(readFileSync(new URL('../triply/elastic-service.json', import.meta.url), 'utf8'));
await es('DELETE', '/index');
for (const it of service.config.indexTemplates) await es('DELETE', `/_index_template/${it.name}`);
for (const ct of service.config.componentTemplates) {
  const r = await es('PUT', `/_component_template/${ct.name}`, { template: ct.template });
  ok(r.status === 200, `component template ${ct.name} (${r.status}${r.status === 200 ? '' : ' ' + JSON.stringify(r.json.error?.reason ?? r.json)})`);
}
for (const it of service.config.indexTemplates) {
  const r = await es('PUT', `/_index_template/${it.name}`, { index_patterns: [it.index_patterns].flat(), composed_of: it.composed_of });
  ok(r.status === 200, `index template ${it.name} (${r.status}${r.status === 200 ? '' : ' ' + JSON.stringify(r.json.error?.reason ?? r.json)})`);
}

// 2. documenten, zoals Triply ze maakt
const docs = await bouwDocumenten(new URL('../construct/alles.rq', import.meta.url), OBJECTEN);
ok(docs.length === OBJECTEN.length, `${docs.length} van ${OBJECTEN.length} documenten opgebouwd`);
const bulk = docs.map(d => `${JSON.stringify({ index: { _index: 'index', _id: d._id } })}\n${JSON.stringify(d._source)}\n`).join('');
const b = await es('POST', '/_bulk?refresh=true', bulk, true);
const mislukt = (b.json.items ?? []).filter(i => i.index.error);
ok(b.status === 200 && !b.json.errors, `bulk: ${b.json.items?.length ?? 0} geïndexeerd, ${mislukt.length} fouten`);
for (const i of mislukt) console.log(`      ${i.index._id}: ${i.index.error.type} ${i.index.error.reason}`);

// 3. types in de mapping
const mapping = (await es('GET', '/index/_mapping')).json.index.mappings.properties;
const type = veld => mapping[veld]?.type;
const verwacht = {
  [CE + 'naam']: 'text', [CE + 'omschrijving']: 'text', [CE + 'postcode']: 'text', [CE + 'rijksmonumentnummer']: 'text',
  [CE + 'klasse']: 'keyword', [CE + 'heeftTypeNaam']: 'keyword', [CE + 'ligtInObject']: 'keyword',
  [CE + 'beginjaar']: 'integer', [CE + 'aantalVondsten']: 'integer', [CE + 'registratiedatum']: 'date',
  [CE + 'internationaalKenteken']: 'boolean', [CE + 'buitenplaats']: 'boolean',
  [GEO]: 'geo_shape', [CE + 'geleendeGeometrie']: 'geo_shape',
};
for (const [veld, t] of Object.entries(verwacht)) ok(type(veld) === t, `${veld.replace(CE, 'ceo-elastic:')} is ${type(veld)} (verwacht ${t})`);
ok(mapping[CE + 'omschrijving']?.analyzer === 'nl_index' && mapping[CE + 'omschrijving']?.search_analyzer === 'nl_zoeken', 'omschrijving: nl_index / nl_zoeken');
ok(mapping[CE + 'postcode']?.analyzer === 'nl_exact', 'postcode: nl_exact');
const velden = Object.keys(mapping).filter(k => k.startsWith(CE));
const nietVast = velden.filter(k => !Object.prototype.hasOwnProperty.call(service.config.componentTemplates.reduce((a, c) => ({ ...a, ...c.template.mappings.properties }), {}), k));
ok(nietVast.length === 0, `${velden.length} ceo-elastic-velden in de index, ${nietVast.length} via de dynamic template${nietVast.length ? ': ' + nietVast.join(', ') : ''}`);

// 4. zoekvragen
async function zoek(tekst, body, verwachtIds, extra) {
  const r = await es('POST', '/index/_search', body);
  const ids = (r.json.hits?.hits ?? []).map(h => h._id.replace(CK, ''));
  const gelukt = r.status === 200 && verwachtIds.every(id => ids.includes(id)) && (!extra || extra(r.json));
  ok(gelukt, `${tekst}: ${r.status === 200 ? ids.join(', ') || '(niets)' : JSON.stringify(r.json.error?.root_cause?.[0] ?? r.json.error)}`);
  return r.json;
}

await zoek('kerken in Gelderland (voorbeeldquery 1)', {
  query: { bool: {
    must: [{ query_string: { query: 'kerk', fields: [CE + 'functie^3', CE + 'naam^3', CE + 'omschrijving'] } }],
    filter: [
      { term: { '@id.soort': 'rijksmonument' } },
      { term: { [CE + 'provincie.keyword']: 'Gelderland' } },
      { term: { [CE + 'juridischeStatus.keyword']: 'rijksmonument' } }] } },
}, ['rijksmonument/59284']);

await zoek('Romeinse keramiek in onderzoeksgebied 2038045 (voorbeeldquery 2)', {
  query: { bool: { filter: [
    { term: { [CE + 'materiaal.keyword']: 'keramiek' } },
    { range: { [CE + 'beginjaar']: { lte: 450 } } },
    { range: { [CE + 'eindjaar']: { gte: -12 } } },
    { terms: { [CE + 'onderzoeksgebied']: [CK + 'archeologischonderzoeksgebied/2038045'] } }] } },
}, ['vondsten/10000096']);

await zoek('beginjaar < 0 als getal (niet als tekst)', {
  query: { range: { [CE + 'beginjaar']: { lt: 0 } } }, size: 20,
}, ['vondsten/10000096', 'grondsporen/10000026', 'archeologischcomplex/10000011'],
j => j.hits.hits.every(h => h._source[CE + 'beginjaar'].some(v => Number(v) < 0)));

await zoek('soort uit de URI (@id.soort)', {
  size: 0, aggs: { soort: { terms: { field: '@id.soort', size: 20 } } },
}, [], j => j.aggregations.soort.buckets.length === 10);

await zoek('binnen 50 m van de kerk van Elst (geo_distance op geo_shape)', {
  query: { geo_distance: { distance: '50m', [GEO]: { lat: 51.9198, lon: 5.8494 } } },
}, ['rijksmonument/59284'], j => j.hits.total.value === 1);

await zoek('geleende geometrie van terrein 10123020 (geo_shape)', {
  query: { exists: { field: CE + 'geleendeGeometrie' } },
}, ['archeologischterrein/10123020', 'vondstlocatie/10032284']);

await zoek('meervoud "kerken" vindt "Kerk" (nl_zoeken)', {
  query: { match: { [CE + 'functie']: 'kerken' } },
}, ['rijksmonument/59284', 'rijksmonument/74775']);

await zoek('adres zonder samenstellingen: "molen" vindt "Grote Molenstraat 2" niet (nl_exact)', {
  query: { match: { [CE + 'volledigAdres']: 'molen' } },
}, [], j => j.hits.total.value === 0);

await zoek('adres: "molenstraat" vindt "Grote Molenstraat 2" wel', {
  query: { match: { [CE + 'volledigAdres']: 'molenstraat' } },
}, ['rijksmonument/59284']);

await zoek('inschrijving vóór 1980 (date)', {
  query: { range: { [CE + 'datumInschrijvingInMonumentenregister']: { lt: '1980-01-01' } } },
}, ['rijksmonument/59284']);

await zoek('internationaal kenteken (boolean)', {
  query: { term: { [CE + 'internationaalKenteken']: true } },
}, ['rijksmonument/59284']);

await zoek('sorteren op monumentnummer als getal (.getal)', {
  query: { term: { '@id.soort': 'rijksmonument' } }, sort: [{ [CE + 'rijksmonumentnummer.getal']: 'asc' }],
}, [], j => {
  const n = j.hits.hits.map(h => Number(h._source[CE + 'rijksmonumentnummer'][0]));
  return n.length === 6 && n.every((v, i) => i === 0 || n[i - 1] <= v);
});

// "P.J.H.Cuypers" zonder spatie: de standard tokenizer maakt daar één woord van, tenzij punt_tussen_letters het splitst.
for (const analyzer of ['nl_index', 'nl_zoeken', 'nl_exact']) {
  const r = await es('POST', '/index/_analyze', { analyzer, text: 'door P.J.H.Cuypers, St.Jan' });
  const tokens = (r.json.tokens ?? []).map(t => t.token);
  ok(tokens.some(t => t.startsWith('cuyper')) && tokens.includes('jan') && !tokens.some(t => t.includes('.')), `${analyzer}: "P.J.H.Cuypers, St.Jan" -> ${tokens.join(' ')}`);
}
await zoek('cuypers AND station vindt Centraal Station Amsterdam ("P.J.H.Cuypers" in de omschrijving)', {
  query: { query_string: { query: '(cuijpers OR cuypers) AND station', fields: [CE + 'omschrijving', CE + 'naam'] } },
}, ['rijksmonument/32455']);

// Functie en type: .keyword zonder de code van de oude functie-indeling (normalizer zonder_functiecode).
for (const [tekst, verwacht] of [['Woonhuis(K)', 'Woonhuis'], ['Boerderij (M1)', 'Boerderij'], ['Kazemat (B10)', 'Kazemat'], ['Lunet(te)', 'Lunet(te)'], ['aardewerk:onbepaald (ROM)', 'aardewerk:onbepaald (ROM)']]) {
  const r = await es('POST', '/index/_analyze', { normalizer: 'zonder_functiecode', text: tekst });
  ok(r.json.tokens?.[0]?.token === verwacht, `zonder_functiecode: "${tekst}" -> ${r.json.tokens?.[0]?.token ?? JSON.stringify(r.json.error?.reason)}`);
}
await zoek('facet functie zonder code (.keyword)', {
  size: 0, aggs: { f: { terms: { field: CE + 'functie.keyword', size: 50 } }, t: { terms: { field: CE + 'type.keyword', size: 50 } } },
}, [], j => {
  const keys = [...j.aggregations.f.buckets, ...j.aggregations.t.buckets].map(b => b.key);
  console.log('      functie/type:', keys.join(' | '));
  return keys.includes('Boerderij') && !keys.some(k => /\((?:[A-Z]{1,2}[0-9]{0,2}|T[A-Z]{2}[0-9]?)\)\s*$/.test(k));
});

await zoek('filter op functie "Boerderij" vindt "Boerderij (M)" (RM 65329)', {
  query: { term: { [CE + 'functie.keyword']: 'Boerderij' } },
}, ['rijksmonument/65329']);

await zoek('facet gemeente (.keyword)', {
  size: 0, aggs: { g: { terms: { field: CE + 'gemeente.keyword' } } },
}, [], j => j.aggregations.g.buckets.some(b => b.key === 'Overbetuwe'));

console.log(fouten ? `\n${fouten} controle(s) mislukt` : '\nalle controles gelukt');
process.exit(fouten ? 1 : 0);
