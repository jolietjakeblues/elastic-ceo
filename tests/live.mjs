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

// Voorletters zonder spatie: "door P.J.H.Cuypers gebouwd" (tekenfilter punt_tussen_letters, vanaf de nieuwe service).
const station = await search(buildQuery({ query: '(cuijpers OR cuypers) AND station', filters: { soort: ['rijksmonument'] } }));
ok(station.hits.hits.some(h => h._id.endsWith('/rijksmonument/32455')), `cuypers AND station vindt Centraal Station Amsterdam (RM 32455): ${station.hits.total.value} treffers`);

// Functie zonder code van de oude functie-indeling: "Boerderij (M)" en "Boerderij(M)" worden één facetwaarde (vanaf de nieuwe service).
const functies = bucketsOf((await search(buildQuery({}))).aggregations.functie).buckets.map(b => b.key);
const metCode = functies.filter(k => /\((?:[A-Z]{1,2}[0-9]{0,2}|T[A-Z]{2}[0-9]?)\)\s*$/.test(k));
ok(metCode.length === 0, `facet functie zonder code: ${metCode.length ? metCode.slice(0, 5).join(', ') : 'geen codes'}`);

const helemaal = await search(buildQuery({ query: 'aardewerk', filters: { soort: ['vondsten'] }, jaar: { van: -12, tot: 450, modus: 'binnen' } }));
ok(helemaal.hits.total.value < romeins.hits.total.value && helemaal.hits.hits.every(h => values(h._source[fields.beginjaar]).every(j => Number(j) >= -12) && values(h._source[fields.eindjaar]).every(j => Number(j) <= 450)), `datering helemaal in -12 tot 450: ${helemaal.hits.total.value} vondsten, minder dan (deels)`);

console.log(fouten ? `\n${fouten} controle(s) mislukt` : '\nalle controles gelukt');
process.exit(fouten ? 1 : 0);
