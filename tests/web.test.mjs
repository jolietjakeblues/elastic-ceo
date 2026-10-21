// Unit-tests voor web/search.js, zonder netwerk. Gebruik: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuery, buildExportQuery, buildRelationQuery, lookupQuery, withinClause, nearClause, inhoudClause, partsClause, jaarClauses, BINNEN, fields, soorten, soortVan, nummerVan, queryFields, WEIGHT, toParams, fromParams, describe, toCsv, safeUrl, registerLink, afbeeldingUrl, veiligeZoekvraag, BASE, EXPORT_MAX } from '../web/search.js';
import { WKT_FIELD, GELEEND_FIELD, mapGeometryFor } from '../web/geo.js';
import { zonderFunctiecode } from '../web/search.js';
import { readFileSync } from 'node:fs';
import { kaartenOp, eersteKeus, kaartLabel, tegels, viewerUrl, tegelOp, proefkaarten, bronFout, metVolgnummer, minuutplanUrl, minuutplannen, minuutplanLabel } from '../web/oude-kaarten.js';

const kw = key => `${fields[key]}.keyword`;
test('Zoeken (query) en filteren (post_filter) blijven gescheiden; facetten tellen zonder hun eigen filter', () => {
  const body = buildQuery({ query: 'kasteel AND gracht', filters: { provincie: ['Gelderland', 'Utrecht'], type: ['Kasteel'] }, page: 1 });
  assert.equal(body.query.query_string.query, 'kasteel AND gracht');
  assert.deepEqual(body.post_filter.bool.filter, [{ terms: { [kw('provincie')]: ['Gelderland', 'Utrecht'] } }, { terms: { [kw('type')]: ['Kasteel'] } }]);
  assert.deepEqual(body.aggs.provincie.filter.bool.filter, [{ terms: { [kw('type')]: ['Kasteel'] } }]);
  assert.equal(body.aggs.gemeente.filter.bool.filter.length, 2);
  assert.equal(body.from, 25); assert.equal(body.track_total_hits, true);
  assert.deepEqual(buildQuery().query, { match_all: {} });
});
test('Soort: filter en facet via @id.soort; alle tien soorten', () => {
  const body = buildQuery({ filters: { soort: ['vondsten', 'grondsporen'] } });
  assert.deepEqual(body.post_filter.bool.filter, [{ terms: { '@id.soort': ['vondsten', 'grondsporen'] } }]);
  assert.deepEqual(body.aggs.soort.aggs.values, { terms: { field: '@id.soort', size: 20 } });
  assert.equal(Object.keys(soorten).length, 10);
  assert.throws(() => buildQuery({ filters: { soort: ['kerk'] } }));
  assert.equal(soortVan(`${BASE}archeologischonderzoeksgebied/2038045`), 'archeologischonderzoeksgebied');
  assert.equal(nummerVan({ '@id': `${BASE}rijksmonument/59284`, [fields.rijksmonumentnummer]: ['14948'] }), '14948');
  assert.equal(nummerVan({ '@id': `${BASE}vondsten/10000096` }), '10000096');
});
test('Datering: overlap met [van, tot], ook in de facetten', () => {
  assert.deepEqual(jaarClauses({ van: -12, tot: 450 }), [{ range: { [fields.eindjaar]: { gte: -12 } } }, { range: { [fields.beginjaar]: { lte: 450 } } }]);
  const body = buildQuery({ jaar: { van: -12 } });
  assert.deepEqual(body.post_filter.bool.filter, [{ range: { [fields.eindjaar]: { gte: -12 } } }]);
  assert.deepEqual(body.aggs.soort.filter.bool.filter, [{ range: { [fields.eindjaar]: { gte: -12 } } }]);
  assert.throws(() => buildQuery({ jaar: { van: 1.5 } }), /jaartallen/);
  assert.throws(() => buildQuery({ jaar: { tot: 'x' } }), /jaartallen/);
  assert.throws(() => buildQuery({ jaar: { van: 500, tot: -500 } }), /vóór/);
  assert.throws(() => buildQuery({ jaar: { van: 1, modus: 'x' } }), /dateren/);
});
test('Datering helemaal binnen [van, tot]: alle jaren erin, en wel gedateerd', () => {
  assert.deepEqual(jaarClauses({ van: -12, tot: 450, modus: 'binnen' }), [{ bool: { filter: [{ exists: { field: fields.beginjaar } }], must_not: [{ range: { [fields.beginjaar]: { lt: -12 } } }, { range: { [fields.eindjaar]: { gt: 450 } } }] } }]);
  assert.deepEqual(jaarClauses({ tot: 1600, modus: 'binnen' })[0].bool.must_not, [{ range: { [fields.eindjaar]: { gt: 1600 } } }]);
  assert.deepEqual(jaarClauses({ modus: 'binnen' }), []);
});
test('Binnen: gebied, bufferzone, complex, inhoud en afstand', () => {
  for (const ok of ['gezicht:1325', 'werelderfgoed:818', 'bufferzone:759', 'complex:524444', 'in:archeologischonderzoeksgebied:2038045', 'in:vondstlocatie:10032284', 'rond:rijksmonument:36075:500']) assert.ok(BINNEN.test(ok), ok);
  for (const fout of ['in:vondsten:1', 'rond:vondsten:1:500', 'rond:rijksmonument:1:300', 'kerk:1']) assert.ok(!BINNEN.test(fout), fout);
  const uri = `${BASE}archeologischonderzoeksgebied/2038045`;
  assert.deepEqual(inhoudClause(uri).bool.should, [{ term: { [fields.ligtInObject]: uri } }, { term: { [fields.onderzoeksgebied]: uri } }]);
  const within = withinClause('POLYGON ((5 52, 6 52, 6 53, 5 52))', uri).bool.filter[0].bool.should;
  assert.deepEqual(within.map(clause => Object.keys(clause.geo_shape)[0]), [WKT_FIELD, GELEEND_FIELD]);
  assert.equal(nearClause({ lat: 52, lon: 5 }, 500, uri).bool.filter[0].bool.should[0].geo_distance.distance, '500m');
  assert.deepEqual(partsClause([]), { terms: { '@id.keyword': ['-'] } });
  const body = buildQuery({ query: 'kuil', binnen: 'in:archeologischonderzoeksgebied:2038045' }, { clause: inhoudClause(uri) });
  assert.equal(body.query.bool.must[0].query_string.query, 'kuil');
  assert.throws(() => buildQuery({ binnen: 'gezicht:1325' }), /Onbekend gebied/);
});
test('Opzoeken: werelderfgoed is de kernzone, bufferzone de bufferzone', () => {
  const kern = lookupQuery('werelderfgoed', '818').query.bool, buffer = lookupQuery('bufferzone', '759').query.bool;
  assert.deepEqual(kern.must_not, [{ term: { [kw('zone')]: 'bufferzone' } }]);
  assert.deepEqual(buffer.filter.at(-1), { term: { [kw('zone')]: 'bufferzone' } });
  assert.deepEqual(lookupQuery('gezicht', '1325').query.bool.filter[1], { term: { [kw('gezichtsnummer')]: '1325' } });
  assert.deepEqual(lookupQuery('vondstlocatie', '1').query.bool.filter[1], { term: { [kw('cultuurhistorischObjectnummer')]: '1' } });
  assert.equal(buildRelationQuery([`${BASE}vondstlocatie/1`]).query.terms['@id.keyword'].length, 1);
});
test('Grenzen: veld, filter, sortering, lengte en resultaatvenster', () => {
  assert.throws(() => buildQuery({ field: 'arbitrary' }));
  assert.throws(() => buildQuery({ filters: { arbitrary: ['x'] } }));
  assert.throws(() => buildQuery({ filters: { provincie: Array.from({ length: 21 }, (_, i) => `p${i}`) } }));
  assert.throws(() => buildQuery({ sort: 'script' }));
  assert.throws(() => buildQuery({ page: 400 }));
  assert.throws(() => buildQuery({ query: 'a'.repeat(501) }));
  const exported = buildExportQuery({ query: 'molen', filters: { provincie: ['Utrecht'] }, page: 7 });
  assert.equal(exported.size, EXPORT_MAX); assert.equal(exported.from, 0); assert.equal(exported.aggs, undefined);
});
test('Weging: naam, type en functie tellen zwaarder in Alles en Exact, alleen in de query', () => {
  const body = buildQuery({ query: 'molens' });
  assert.ok(body.query.query_string.fields.includes(`${fields.naam}^${WEIGHT}`));
  assert.ok(body.query.query_string.fields.includes(fields.omschrijving));
  assert.ok(Object.keys(body.highlight.fields).every(key => !key.includes('^')));
  assert.ok(queryFields('Exact').includes(`${fields.naam}.exact^${WEIGHT}`));
  assert.deepEqual(queryFields('Materiaal'), [fields.materiaal, fields.materiaalgroep]);
});
test('Deelbare URL: heen en terug, onbekende waarden worden genegeerd', () => {
  const state = { query: 'aardewerk', field: 'Materiaal', filters: { soort: ['vondsten'], provincie: ['Utrecht'] }, jaar: { van: -12, tot: 450 }, page: 2, sort: 'oudste', jokers: false, binnen: 'in:archeologischonderzoeksgebied:2038045' };
  const search = toParams(state).toString();
  assert.equal(search, 'q=aardewerk&veld=Materiaal&binnen=in%3Aarcheologischonderzoeksgebied%3A2038045&soort=vondsten&provincie=Utrecht&van=-12&tot=450&sorteer=oudste&pagina=3');
  assert.deepEqual(fromParams(`?${search}`), { state, active: true });
  const bad = fromParams('?veld=__proto__&sorteer=x&pagina=-4&onbekend=1&binnen=x:1&soort=kerk&van=abc');
  assert.deepEqual(bad.state, { query: '', field: 'Alles', filters: {}, jaar: {}, sort: 'relevantie', page: 0, jokers: false, binnen: null });
  assert.equal(fromParams('?van=1600').active, true);
  assert.equal(toParams({ jaar: { van: -12, tot: 450, modus: 'binnen' } }).toString(), 'van=-12&tot=450&jaarmodus=binnen');
  assert.deepEqual(fromParams('?van=-12&tot=450&jaarmodus=binnen').state.jaar, { van: -12, tot: 450, modus: 'binnen' });
  assert.deepEqual(fromParams('?jaarmodus=binnen').state.jaar, {});
  assert.deepEqual(fromParams('?van=500&tot=-500').state.jaar, {});
});
test('Uitleg in gewone taal, ook voor datering en inhoud', () => {
  const lines = describe({ query: 'kuil', jaar: { van: -500, tot: 12 }, binnen: 'in:vondstlocatie:1' }, 'vondstlocatie “X” (1)');
  assert.match(lines.join(' '), /in vondstlocatie “X” \(1\) ligt, op alle niveaus/);
  assert.match(lines.join(' '), /datering \(deels\) valt in 500 v\.Chr\. – 12/);
  assert.match(describe({ jaar: { van: 1600, modus: 'binnen' } }).join(' '), /helemaal valt in de periode vanaf 1600/);
});
test('Functie en type zonder code van de oude functie-indeling, zoals de normalizer in de index', () => {
  assert.deepEqual(zonderFunctiecode(['Boerderij (M)', 'Boerderij(M)', 'Boerderij(M1)']), ['Boerderij']);
  assert.deepEqual(zonderFunctiecode(['Woonhuis(K)', 'Kazemat (B10)', 'Pompgebouw(M05)', 'Gerechtsgebouw(EX3)', 'Veldoven(TFU1)']), ['Woonhuis', 'Kazemat', 'Pompgebouw', 'Gerechtsgebouw', 'Veldoven']);
  assert.deepEqual(zonderFunctiecode(['Lunet(te)', 'aardewerk:onbepaald (ROM)', 'paal (element)', 'weg, (on)verhard']), ['Lunet(te)', 'aardewerk:onbepaald (ROM)', 'paal (element)', 'weg, (on)verhard']);
  const analyse = JSON.parse(readFileSync(new URL('../triply/nl-analyse.json', import.meta.url), 'utf8'));
  assert.equal(analyse.char_filter.geen_functiecode.pattern, String.raw`\s*\((?:[A-Z]{1,2}[0-9]{0,2}|T[A-Z]{2}[0-9]?)\)\s*$`);
});
test('CSV: puntkomma, quotes en geen formules', () => {
  const csv = toCsv([{ _source: { '@id': `${BASE}rijksmonument/1`, [fields.rijksmonumentnummer]: ['14948'], [fields.naam]: ['=SOM(A1)'], [fields.omschrijving]: ['regel 1\nmet "quote"; en meer'], [fields.woonplaatsnaam]: ['A', 'B'] } }]);
  const [header, row] = csv.slice(1).split('\r\n');
  assert.ok(csv.startsWith('﻿Soort;Nummer;Naam;'));
  assert.equal(header.split(';').length, 19);
  assert.match(row, /^Rijksmonument;14948;'=SOM\(A1\);;A \| B;/);
  assert.match(csv, /"regel 1\nmet ""quote""; en meer"/);
});
test('Links en afbeeldingen alleen van bekende bronnen; geen reguliere expressies', () => {
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(registerLink('https://monumentenregister.cultureelerfgoed.nl/monumenten/14948').label, 'Monumentenregister');
  assert.equal(registerLink('https://example.org/x'), null);
  assert.equal(afbeeldingUrl('https://images.memorix.nl/rce/thumb/640x480/x.jpg'), 'https://images.memorix.nl/rce/thumb/640x480/x.jpg');
  assert.equal(afbeeldingUrl('https://example.org/x.jpg'), null);
  assert.equal(veiligeZoekvraag('greppel/sloot'), String.raw`greppel\/sloot`);
});
test('Kaart: eigen geometrie gaat voor, anders de geleende', () => {
  const vlak = 'POLYGON ((5 52, 5.1 52, 5.1 52.1, 5 52))';
  assert.equal(mapGeometryFor({ [WKT_FIELD]: [vlak], [GELEEND_FIELD]: [vlak] }).geleend, undefined);
  assert.equal(mapGeometryFor({ [GELEEND_FIELD]: [vlak] }).geleend, true);
  assert.equal(mapGeometryFor({}), null);
});
test('Oude kaarten: alleen kaarten waarvan de omtrek het punt bevat, met geldige Allmaps-id', () => {
  const index = { collecties: ['TU Delft Library'], kaarten: [
    ['002dac72fa326c9e', 'Bonneblad 394 Deventer', 0, 1891, [6, 52, 6.2, 52.3], [[6, 52, 6.2, 52, 6.2, 52.3, 6, 52.3, 6, 52]]],
    ['00000000000000aa', 'Driehoek', 0, 1700, [6, 52, 6.2, 52.3], [[6, 52, 6.2, 52, 6, 52.3, 6, 52]]],
    ['../../evil', 'Fout', 0, 1800, [6, 52, 6.2, 52.3], [[6, 52, 6.2, 52, 6.2, 52.3, 6, 52.3, 6, 52]]],
  ] };
  assert.deepEqual(kaartenOp(index, 52.25, 6.15).map(k => k.id), ['002dac72fa326c9e']);
  assert.deepEqual(kaartenOp(index, 52.05, 6.05).map(k => k.id), ['002dac72fa326c9e', '00000000000000aa']);
  assert.deepEqual(kaartenOp(index, 53, 6.1), []);
  assert.equal(eersteKeus(kaartenOp(index, 52.05, 6.05)).titel, 'Bonneblad 394 Deventer');
  assert.equal(kaartLabel({ jaar: 1891, titel: 'Bonneblad 394 Deventer' }), '1891 · Bonneblad 394 Deventer');
  assert.equal(tegels('002dac72fa326c9e'), 'https://allmaps.xyz/maps/002dac72fa326c9e/{z}/{x}/{y}.png');
  assert.equal(viewerUrl('002dac72fa326c9e'), 'https://viewer.allmaps.org/?url=https%3A%2F%2Fannotations.allmaps.org%2Fmaps%2F002dac72fa326c9e');
});
test('Oude kaarten: de index in web/ heeft het verwachte formaat', async () => {
  const { readFile } = await import('node:fs/promises');
  const index = JSON.parse(await readFile(new URL('../web/oude-kaarten.json', import.meta.url), 'utf8'));
  assert.ok(index.kaarten.length > 1000);
  assert.ok(index.kaarten.every(([id, titel, c, , bbox, ringen, bron]) => /^[0-9a-f]{16}$/.test(id) && titel && index.collecties[c] && bbox.length === 4 && ringen.length && index.bronnen[bron]));
  // Bergkerk Deventer ligt op een Bonneblad.
  assert.ok(kaartenOp(index, 52.2508, 6.1601).some(k => k.titel.startsWith('Bonneblad')));
});
test('Minuutplans: WFS-vraag rond het punt, alleen bladen die het punt bevatten, alleen links naar de beeldbank', () => {
  const url = new URL(minuutplanUrl(52.379, 4.9));
  assert.equal(url.origin + url.pathname, 'https://services.rce.geovoorziening.nl/misc/wfs');
  assert.equal(url.searchParams.get('typeNames'), 'misc:Minuutplanbegrenzingen');
  assert.equal(url.searchParams.get('bbox'), '4.8995,52.3785,4.9005,52.3795,EPSG:4326');
  const vlak = [[[[4.89, 52.37], [4.91, 52.37], [4.91, 52.39], [4.89, 52.39], [4.89, 52.37]]]];
  const ernaast = [[[[4.95, 52.37], [4.97, 52.37], [4.97, 52.39], [4.95, 52.37]]]];
  const json = { features: [
    { geometry: { type: 'MultiPolygon', coordinates: vlak }, properties: { CODE: 'MIN07005G01', GEMEENTE: 'Amsterdam', SECTIE: 'G', BLAD: '01', MPAANWEZIG: '', URL: 'http://beeldbank.cultureelerfgoed.nl/rce-mediabank/detail/a7603542' } },
    { geometry: { type: 'MultiPolygon', coordinates: vlak }, properties: { CODE: 'MIN07005F02', GEMEENTE: 'Amsterdam', SECTIE: 'F', BLAD: '02', URL: 'https://example.org/x' } },
    { geometry: { type: 'MultiPolygon', coordinates: vlak }, properties: { CODE: 'MIN0X', MPAANWEZIG: 'nee' } },
    { geometry: { type: 'MultiPolygon', coordinates: ernaast }, properties: { CODE: 'MIN0Y' } },
  ] };
  const bladen = minuutplannen(json, 52.379, 4.9);
  assert.deepEqual(bladen.map(b => b.code), ['MIN07005F02', 'MIN07005G01']);
  assert.equal(bladen[1].url, 'https://beeldbank.cultureelerfgoed.nl/rce-mediabank/detail/a7603542');
  assert.equal(bladen[0].url, null);
  assert.equal(minuutplanLabel(bladen[1]), 'Amsterdam, sectie G, blad 01');
  assert.deepEqual(minuutplannen({}, 52, 5), []);
});
test('Oude kaarten: volgnummer alleen bij dezelfde titel en hetzelfde jaar; proeftegel per bron', () => {
  const lijst = [
    { id: 'a', titel: 'Bonneblad 203 Diever', jaar: 1925, bron: 'dlc.services' },
    { id: 'b', titel: 'Bonneblad 203 Diever', jaar: 1934, bron: 'dlc.services' },
    { id: 'c', titel: 'Waterstaatskaart: Steenwijk', jaar: null, bron: 'objects.library.uu.nl' },
    { id: 'd', titel: 'Waterstaatskaart: Steenwijk', jaar: null, bron: 'objects.library.uu.nl' },
  ];
  assert.deepEqual(metVolgnummer(lijst).map(k => k.naam), ['Bonneblad 203 Diever', 'Bonneblad 203 Diever', 'Waterstaatskaart: Steenwijk', 'Waterstaatskaart: Steenwijk (2)']);
  assert.deepEqual(proefkaarten(lijst).map(k => k.id), ['a', 'c']);
  assert.equal(tegelOp('002dac72fa326c9e', 52.2508, 6.1601), 'https://allmaps.xyz/maps/002dac72fa326c9e/15/16944/10786.png');
  const kop = waarden => ({ get: naam => waarden[naam] ?? null });
  assert.equal(bronFout(kop({})), null);
  assert.deepEqual(bronFout(kop({ 'X-Allmaps-Error': 'source-info', 'X-Allmaps-Error-Status': '502', 'X-Allmaps-Error-Message': 'Could not load source metadata' })), { status: 502, melding: 'Could not load source metadata', bronPlat: true });
  assert.equal(bronFout(kop({ 'X-Allmaps-Error': 'x', 'X-Allmaps-Error-Status': '404' })).bronPlat, false);
});
