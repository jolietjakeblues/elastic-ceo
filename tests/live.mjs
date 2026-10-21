// Korte controle tegen de echte service Erfgoed-ceo (rce/erfgoed). Gebruik: npm run test:live
import { ENDPOINT, buildQuery, lookupQuery, inhoudClause, withinClause, bucketsOf, values, search, soorten, fields } from '../web/search.js';
import { WKT_FIELD } from '../web/geo.js';

let fouten = 0;
const ok = (gelukt, tekst) => { console.log(`${gelukt ? 'ok  ' : 'FOUT'}  ${tekst}`); if (!gelukt) fouten++; };

// CORS: de browser praat rechtstreeks met de service
const cors = await fetch(ENDPOINT, { method: 'OPTIONS', headers: { Origin: 'https://example.org', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
ok(cors.headers.get('access-control-allow-origin') === '*', `CORS: access-control-allow-origin ${cors.headers.get('access-control-allow-origin')}`);

const alles = await search(buildQuery({}));
const buckets = bucketsOf(alles.aggregations.soort).buckets;
const som = buckets.reduce((a, b) => a + b.doc_count, 0);
ok(som === alles.hits.total.value, `soort-facet: som ${som.toLocaleString('nl')} = totaal ${alles.hits.total.value.toLocaleString('nl')}`);
ok(buckets.length === Object.keys(soorten).length, `${buckets.length} soorten in de index`);

const og = (await search(lookupQuery('archeologischonderzoeksgebied', '2038045'))).hits.hits[0];
const inhoud = await search(buildQuery({ binnen: 'in:archeologischonderzoeksgebied:2038045' }, { clause: inhoudClause(og._id) }));
ok(inhoud.hits.total.value > 0, `alles in onderzoeksgebied 2038045: ${inhoud.hits.total.value}`);

const orvelte = (await search(lookupQuery('gezicht', '1325'))).hits.hits[0];
ok(values(orvelte?._source[fields.naam])[0] === 'Orvelte', 'gezicht 1325 is Orvelte');
const binnen = await search(buildQuery({ binnen: 'gezicht:1325' }, { clause: withinClause(values(orvelte._source[WKT_FIELD])[0], orvelte._id) }));
ok(binnen.hits.total.value > 0, `binnen Orvelte: ${binnen.hits.total.value}`);

const romeins = await search(buildQuery({ query: 'aardewerk', filters: { soort: ['vondsten'] }, jaar: { van: -12, tot: 450 } }));
ok(romeins.hits.hits.every(h => values(h._source[fields.eindjaar]).some(j => Number(j) >= -12) && values(h._source[fields.beginjaar]).some(j => Number(j) <= 450)), `datering -12 tot 450: ${romeins.hits.total.value} vondsten, eerste pagina klopt`);

const terp = await search(buildQuery({ query: 'terp', field: 'Exact' }));
const waterput = await search(buildQuery({ query: 'terp' }));
ok(waterput.hits.hits.every(h => !JSON.stringify(h.highlight ?? {}).toLowerCase().includes('<mark>waterput')), `terp vindt geen waterput (${waterput.hits.total.value} treffers, exact ${terp.hits.total.value})`);

console.log(fouten ? `\n${fouten} controle(s) mislukt` : '\nalle controles gelukt');
process.exit(fouten ? 1 : 0);
