import { buildQuery, buildExportQuery, buildRelationQuery, lookupQuery, partsClause, withinClause, nearClause, inhoudClause, gebiedenListQuery, ligtInQuery, AFSTANDEN, IN_SOORTEN, ROND_SOORTEN, bucketsOf, search, facets, fields, sorts, soorten, soortVan, nummerVan, values, textValue, safeUrl, registerLink, afbeeldingUrl, toParams, fromParams, describe, toCsv, zonderFunctiecode, MET_FUNCTIECODE, jaartal, jaarBereik, JAARMODI, searchFields, DEFAULT_FIELD, PAGE_SIZE, MAX_WINDOW, EXPORT_MAX } from './search.js';
import { geometryFor, mapGeometryFor, WKT_FIELD } from './geo.js';
import { OUDE_KAARTEN_URL, tegels, viewerUrl, kaartenOp, kaartLabel, eersteKeus } from './oude-kaarten.js';
const $ = id => document.getElementById(id);
const blank = () => ({ query: '', field: DEFAULT_FIELD, filters: {}, jaar: {}, page: 0, sort: 'relevantie', binnen: null, jokers: state?.jokers ?? false });
let state; state = blank();
let controller, needsFit = false, lastTotal = 0;
const cards = new Map(), markers = new Map(), shapes = new Map(), relationSlots = new Map();
const wide = window.matchMedia('(min-width: 1100px)');
const colors = { rijksmonument: '#01689b', complex: '#a90061', gezicht: '#39870c', werelderfgoed: '#b85500', archeologischterrein: '#673327', archeologischonderzoeksgebied: '#42145f', vondstlocatie: '#007bc7', archeologischcomplex: '#94710a', grondsporen: '#275937', vondsten: '#d52b1e' };
// Leaflet komt van een CDN; zonder Leaflet werkt de demo verder zonder kaart.
const map = window.L ? L.map('map', { zoomControl: true }).setView([52.2, 5.3], 7) : null;
const contextLayer = map ? L.featureGroup().addTo(map) : null;
const markerLayer = map ? L.featureGroup().addTo(map) : null;
if (map) L.tileLayer('https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png', { minZoom: 6, maxZoom: 19, attribution: 'Kaart: <a href="https://www.pdok.nl/" target="_blank" rel="noopener">PDOK</a> / Kadaster' }).addTo(map);
else $('map').append(el('p', 'De kaartbibliotheek kon niet worden geladen.', 'empty'));
const format = number => new Intl.NumberFormat('nl-NL').format(number);
const plural = (count, one, more) => `${format(count)} ${count === 1 ? one : more}`;
// Sommige bronwaarden zijn dubbel gecodeerd (bijv. "K. &amp; J. Wilkensbrug"). Entiteiten worden als tekst
// gedecodeerd; er komt nooit HTML uit de bron in de pagina.
const decode = text => (/&[#\w]+;/.test(text) ? new DOMParser().parseFromString(text, 'text/html').body.textContent : text);
// Een naam "-" (komt in de bron voor) is geen naam. ABR-labels als "aardewerk:onbepaald" krijgen een spatie na de
// dubbele punt (alleen in de weergave; facetten en filters gebruiken de oorspronkelijke waarde).
const show = value => { const text = decode(textValue(value)).replace(/(\p{L}):(\p{L})/gu, '$1: $2'); return text === '-' ? '' : text; };
function el(tag, text, className) { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; }
function button(text, callback, className) { const node = el('button', text, className); node.type = 'button'; node.addEventListener('click', callback); return node; }
function link(text, url) { const node = el('a', text); node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node; }
const naamVan = source => show(source?.[fields.naam]) || show(source?.[fields.locatienaam]);
const soortLabel = soort => (soort === 'bufferzone' ? 'Bufferzone werelderfgoed' : soorten[soort] ?? 'Object');

// Gezichten en werelderfgoederen (kern- en bufferzones) voor de keuzelijst, uit Elasticsearch (zonder vlakken).
const gebieden = { list: [], byKey: new Map(), byLabel: new Map() };
const gebiedKey = source => {
  const soort = soortVan(source['@id']);
  if (soort === 'gezicht') return `gezicht:${values(source[fields.gezichtsnummer])[0]}`;
  return `${values(source[fields.zone])[0] === 'bufferzone' ? 'bufferzone' : 'werelderfgoed'}:${values(source[fields.werelderfgoednummer])[0]}`;
};
const gebiedLabel = g => `${decode(g.naam ?? 'Zonder naam')} — ${soortLabel(g.soort)} ${g.nummer}`;
const gebiedenLoaded = search(gebiedenListQuery(), AbortSignal.timeout(20000)).then(data => {
  for (const { _source: source } of data.hits.hits) {
    const key = gebiedKey(source), [soort, nummer] = key.split(':');
    if (!nummer || nummer === 'undefined' || gebieden.byKey.has(key)) continue;
    const g = { key, soort, nummer, naam: naamVan(source), id: source['@id'] };
    gebieden.list.push(g); gebieden.byKey.set(key, g); gebieden.byLabel.set(gebiedLabel(g), key);
    $('gebieden-lijst').append(Object.assign(el('option'), { value: gebiedLabel(g) }));
  }
}).catch(error => { console.error('Gebiedenlijst', error); $('binnen-hint').textContent = 'De lijst met gezichten en werelderfgoed kon niet worden geladen.'; });

// Context "binnen": een gebied, complex, object met inhoud, of een afstand. Wordt opgezocht en bewaard.
const contexts = new Map();
async function resolveContext(binnen) {
  if (!binnen) return null;
  if (contexts.has(binnen)) return contexts.get(binnen);
  const bits = binnen.split(':');
  const [soort, nummer] = bits[0] === 'rond' || bits[0] === 'in' ? bits.slice(1, 3) : bits;
  const hit = (await search(lookupQuery(soort, nummer), AbortSignal.timeout(20000))).hits.hits[0];
  if (!hit) throw new Error(`${soortLabel(soort)} ${nummer} bestaat niet in deze index.`);
  const source = hit._source, uri = source['@id'], naam = naamVan(source), geometry = mapGeometryFor(source);
  const wie = `${soortLabel(soort).toLowerCase()} “${naam || 'zonder naam'}” (${nummer})`;
  let context;
  if (bits[0] === 'rond') {
    // Alles wat (deels) binnen een cirkel rond het (zwaarte)punt van het object valt: geo_distance op het geo_shape-veld.
    const own = geometryFor(source);
    if (!own) throw new Error(`${soortLabel(soort)} ${nummer} heeft geen eigen locatie.`);
    const meters = Number(bits[3]);
    context = { soort, nummer, uri, meters, clause: nearClause(own.point, meters, uri), label: `${format(meters)} m rond ${wie}`, summary: 'alles wat (deels) binnen deze afstand van het punt van het object ligt (geo_distance)', geometry: own, circle: { point: own.point, meters } };
  } else if (bits[0] === 'in') {
    context = { soort, nummer, uri, clause: inhoudClause(uri), label: wie, summary: 'alles wat erin ligt, ook via een vondstlocatie (ligtInObject en onderzoeksgebied)', geometry };
  } else if (soort === 'complex') {
    const parts = values(source[fields.heeftRijksmonument]);
    context = { soort, nummer, uri, clause: partsClause(parts), label: wie, summary: `${plural(parts.length, 'onderdeel', 'onderdelen')} volgens heeftRijksmonument`, geometry };
  } else {
    // Ruimtelijk: alles wat helemaal binnen het vlak valt (geo_shape within), ook met geleende geometrie.
    const wkt = values(source[WKT_FIELD])[0];
    if (!wkt) throw new Error(`${soortLabel(soort)} ${nummer} heeft geen vlak.`);
    context = { soort, nummer, uri, clause: withinClause(wkt, uri), label: wie, summary: 'alles wat helemaal binnen het vlak valt (geo_shape within)', geometry };
  }
  contexts.set(binnen, context);
  return context;
}
function setBinnen(binnen, extra = {}) {
  Object.assign(state, { binnen, page: 0 }, extra);
  syncForm(); run();
  window.scrollTo({ top: $('status').offsetTop - 16, behavior: 'smooth' });
}
// Eén object tonen via zijn nummer en soort (bijv. vanuit een relatie).
const showObject = (soort, nummer) => setBinnen(null, { query: `"${nummer}"`, field: 'Nummer', filters: { soort: [soort] }, jaar: {}, sort: 'relevantie' });
// Vanuit een resultaat naar een gebied, complex of inhoud: met een schone zoekactie.
const openBinnen = binnen => setBinnen(binnen, { query: '', field: DEFAULT_FIELD, filters: {}, jaar: {} });
const binnenVoor = (soort, nummer, source) => {
  if (soort === 'gezicht') return `gezicht:${nummer}`;
  if (soort === 'werelderfgoed') return `${values(source?.[fields.zone])[0] === 'bufferzone' ? 'bufferzone' : 'werelderfgoed'}:${nummer}`;
  if (soort === 'complex') return `complex:${nummer}`;
  return IN_SOORTEN.includes(soort) ? `in:${soort}:${nummer}` : null;
};

function highlight(fragment) {
  const node = el('p', null, 'match');
  // Decode escaped source text, but only recreate the exact highlight delimiters.
  // No upstream HTML nodes or attributes are inserted into the live document.
  for (const [index, part] of fragment.split(/(<mark>.*?<\/mark>)/gs).entries()) {
    const marked = index % 2 === 1;
    // In een span, anders gooit de parser de spatie aan het begin weg ("KERKGEBOUWuit" in plaats van "KERKGEBOUW uit").
    const parsed = new DOMParser().parseFromString(`<span>${marked ? part.slice(6, -7) : part}</span>`, 'text/html');
    const text = decode(parsed.body.textContent);
    node.append(marked ? el('mark', text) : document.createTextNode(text));
  }
  return node;
}
function relationRow(label, items) {
  const row = el('div', null, 'relation'); row.append(el('span', label, 'relation-label'));
  const list = el('span', null, 'relation-items'); list.append(...items); row.append(list); return row;
}
// Datering in gewone taal: "Romeinse Tijd – Nieuwe Tijd Laat (12 v.Chr. – 1945)" of "1835 – 1938".
function periodeVan(source) {
  const begin = values(source[fields.beginperiode]), eind = values(source[fields.eindperiode]);
  const jaren = [Math.min(...values(source[fields.beginjaar]).map(Number)), Math.max(...values(source[fields.eindjaar]).map(Number))].filter(Number.isFinite);
  const periode = begin.length ? (begin.join(', ') === eind.join(', ') ? begin.join(', ') : `${begin.join(', ')} – ${eind.join(', ')}`) : '';
  const jaartallen = jaren.length === 2 ? (jaren[0] === jaren[1] ? jaartal(jaren[0]) : `${jaartal(jaren[0])} – ${jaartal(jaren[1])}`) : jaren.length ? jaartal(jaren[0]) : '';
  return periode && jaartallen ? `${periode} (${jaartallen})` : periode || jaartallen;
}
const METADATA = [
  ['volledigAdres', 'Adres'], ['postcode', 'Postcode'], ['woonplaatsnaam', 'Plaats'], ['gemeente', 'Gemeente'], ['provincie', 'Provincie'],
  ['locatieomschrijving', 'Locatie'], ['hoofdfunctie', 'Functie'], ['type', 'Type'], ['typegroep', 'Typegroep'], ['werelderfgoedType', 'Type'],
  ['materiaal', 'Materiaal'], ['stijl', 'Stijl'], ['periode', 'Periode'], ['actor', 'Maker'], ['rol', 'Rol'], ['aantalVondsten', 'Aantal'], ['aantalGrondsporen', 'Aantal'],
  ['juridischeStatus', 'Status'], ['monumentAard', 'Aard'], ['gezichtsstatus', 'Status'], ['werelderfgoedstatus', 'Status'], ['zone', 'Zone'],
  ['archeologischeWaardering', 'Waardering'], ['vertrouwelijk', 'Vertrouwelijk'], ['verwerving', 'Verwerving'], ['toestand', 'Toestand'], ['datumInschrijvingInMonumentenregister', 'Ingeschreven'],
];
function renderResults(hits) {
  $('results').replaceChildren(); cards.clear(); relationSlots.clear();
  if (!hits.length) { $('results').append(el('p', 'Niets gevonden. Pas je zoekvraag aan of verwijder een filter.', 'empty')); return; }
  for (const hit of hits) {
    const source = hit._source || {}, soort = soortVan(source['@id']), nummer = nummerVan(source);
    const card = el('article'); card.dataset.id = hit._id; card.dataset.soort = soort ?? ''; cards.set(hit._id, card);
    card.addEventListener('click', event => { if (!event.target.closest('a, button, summary, details')) select(hit._id, true); });
    const head = el('p', null, 'number'); head.append(el('span', soorten[soort] ?? 'Object', 'badge'), document.createTextNode(` ${nummer ?? 'zonder nummer'}`));
    // Zonder naam: type of functie en adres als kop.
    const fallback = [zonderFunctiecode(source[fields.type])[0] ?? zonderFunctiecode(source[fields.hoofdfunctie])[0], values(source[fields.volledigAdres])[0] ?? values(source[fields.woonplaatsnaam])[0]].filter(Boolean).map(decode).join(', ');
    card.append(head, el('h3', naamVan(source) || fallback || `${soorten[soort] ?? 'Object'} zonder naam`));
    const image = afbeeldingUrl(values(source[fields.afbeelding])[0]);
    // Thumbnail uit de beeldbank; laadt die niet (of geeft de beeldbank geen afbeelding terug), dan valt hij weg.
    if (image) { const img = el('img', null, 'thumb'); img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; img.addEventListener('error', () => img.remove()); img.src = image; card.append(img); }
    const metadata = el('dl', null, 'metadata'), gezien = new Set();
    for (const [key, label] of METADATA) {
      const text = key === 'periode' ? periodeVan(source) : show(MET_FUNCTIECODE.includes(key) ? zonderFunctiecode(source[fields[key]]) : source[fields[key]]);
      if (!text || gezien.has(`${label}:${text}`)) continue;
      gezien.add(`${label}:${text}`);
      const row = el('div'); row.append(el('dt', `${label}:`), el('dd', text)); metadata.append(row);
    }
    if (metadata.childElementCount) card.append(metadata);
    // Relaties: wat erin ligt, waar het in ligt, onderdelen.
    const relations = el('div', null, 'relations');
    const binnen = nummer && binnenVoor(soort, nummer, source);
    if (soort === 'gezicht' || soort === 'werelderfgoed') relations.append(relationRow('Gebied:', [button('Toon wat erin ligt', () => openBinnen(binnen), 'relation-button')]));
    if (soort === 'complex') {
      const parts = values(source[fields.heeftRijksmonument]);
      relations.append(relationRow('Onderdelen:', [document.createTextNode(`${plural(parts.length, 'rijksmonument', 'rijksmonumenten')} `), button('Toon onderdelen', () => openBinnen(binnen), 'relation-button')]));
    }
    const bevat = values(source[fields.bevatObject]).length;
    if (bevat && binnen?.startsWith('in:')) relations.append(relationRow('Bevat:', [document.createTextNode(`${plural(bevat, 'object', 'objecten')} direct `), button('Toon wat erin ligt', () => openBinnen(binnen), 'relation-button')]));
    // Deze komen uit extra requests (zie loadRelations en loadLigtIn).
    const slot = el('div'); relations.append(slot); relationSlots.set(hit._id, { slot, source, soort });
    card.append(relations);
    const fragments = Object.values(hit.highlight || {}).flat().slice(0, 3);
    fragments.forEach(fragment => card.append(highlight(fragment)));
    const descriptions = ['omschrijving', 'overigeOmschrijving', 'toelichting'].flatMap(key => values(source[fields[key]])).map(decode);
    if (descriptions.length) { const detail = el('details'); detail.append(el('summary', 'Volledige omschrijving')); descriptions.forEach(text => detail.append(el('p', text, 'description'))); card.append(detail); }
    const links = el('div', null, 'links');
    for (const raw of values(source['@id'])) { const url = safeUrl(raw); if (url) { links.append(link('Linked Data (CHO)', url)); const uri = el('p', null, 'uri'); uri.append(link(raw, url)); card.append(uri); } }
    for (const raw of values(source[fields.seeAlso])) { const register = registerLink(raw); if (register) links.append(link(register.label, register.url)); }
    if (map && mapGeometryFor(source)) links.append(button('Toon op kaart', () => select(hit._id, true)), button('Oude kaarten', () => toonOudeKaarten(hit._id, source)));
    if (geometryFor(source) && nummer && ROND_SOORTEN.includes(soort)) links.append(button('In de buurt', () => openBinnen(`rond:${soort}:${nummer}:500`)));
    card.append(links); $('results').append(card);
  }
}
// Relaties van de resultaten op deze pagina met één extra request ophalen: namen en nummers van de objecten waarin ze
// liggen, het onderzoeksgebied, het complex waar een rijksmonument onderdeel van is en het hoofdobject van een complex.
const RELATIES = [['ligtInObject', 'Ligt in:'], ['onderzoeksgebied', 'Onderzoeksgebied:'], ['isOnderdeelVanComplex', 'Onderdeel van:'], ['heeftHoofdobject', 'Hoofdobject:']];
async function loadRelations(hits, signal) {
  const uris = new Set();
  for (const { _source: source = {} } of hits) for (const [key] of RELATIES) values(source[fields[key]]).forEach(uri => uris.add(uri));
  if (!uris.size) return;
  let data;
  try { data = await search(buildRelationQuery([...uris]), signal); } catch (error) { if (error.name !== 'AbortError') console.error('Relaties', error); return; }
  const byUri = new Map(data.hits.hits.map(({ _source: source }) => [source['@id'], source]));
  const objectButton = uri => {
    const source = byUri.get(uri), soort = soortVan(uri), nummer = source ? nummerVan(source) : /\/(\d+)$/.exec(uri)?.[1];
    const text = `${soorten[soort] ?? 'Object'} ${nummer ?? ''}${source && naamVan(source) ? ` ${naamVan(source)}` : ''}`.trim();
    const binnen = nummer && binnenVoor(soort, nummer, source);
    return nummer ? button(text, () => (binnen ? openBinnen(binnen) : showObject(soort, nummer)), 'relation-button') : el('span', text);
  };
  for (const { slot, source } of relationSlots.values()) {
    const ligtIn = values(source[fields.ligtInObject]);
    for (const [key, label] of RELATIES) {
      const list = values(source[fields[key]]).filter(uri => key !== 'onderzoeksgebied' || !ligtIn.includes(uri));
      if (list.length) slot.append(relationRow(label, list.slice(0, 10).map(objectButton).concat(list.length > 10 ? [el('span', `en ${list.length - 10} meer`)] : [])));
    }
  }
}
// In welk gezicht of werelderfgoed ligt elk object met een eigen vlak op deze pagina? Eén request met per object een
// benoemde geo_shape-query; matched_queries zegt welk gebied bij welk object hoort.
async function loadLigtIn(hits, signal) {
  const items = hits.filter(hit => !['gezicht', 'werelderfgoed'].includes(soortVan(hit._source?.['@id']))).map(hit => ({ name: hit._id, wkt: values(hit._source?.[WKT_FIELD])[0] })).filter(item => item.wkt);
  if (!items.length) return;
  let data;
  try { data = await search(ligtInQuery(items), signal); } catch (error) { if (error.name !== 'AbortError') console.error('Ligt in', error); return; }
  const per = new Map();
  for (const { _source: source, matched_queries: names = [] } of data.hits.hits) for (const name of names) per.set(name, [...(per.get(name) ?? []), source]);
  for (const [id, list] of per) {
    const entry = relationSlots.get(id); if (!entry) continue;
    entry.slot.prepend(relationRow('Ligt in gebied:', list.map(g => {
      const key = gebiedKey(g), [soort, nummer] = key.split(':');
      return button(`${soortLabel(soort)} ${naamVan(g)} (${nummer})`, () => openBinnen(key), 'relation-button');
    })));
  }
}
function markerIcon(number, soort, selected) {
  // Alleen het nummer als label, als tekst (geen HTML uit de bron).
  const label = el('span', number, selected ? 'selected' : null);
  label.style.setProperty('--kleur', colors[soort] ?? colors.rijksmonument);
  return L.divIcon({ className: 'label-marker', html: label, iconSize: [0, 0] });
}
const isArea = soort => soort === 'gezicht' || soort === 'werelderfgoed' || soort === 'archeologischonderzoeksgebied';
const shapeStyle = (soort, selected, geleend) => ({ color: selected ? '#000000' : colors[soort] ?? colors.rijksmonument, fillColor: selected ? '#ffb612' : colors[soort] ?? colors.rijksmonument, weight: selected ? 3 : 2, dashArray: geleend ? '4 6' : null, fillOpacity: selected ? 0.45 : geleend ? 0.04 : isArea(soort) ? 0.08 : 0.2 });
function renderContextGeometry(context) {
  if (!map) return;
  contextLayer.clearLayers();
  // Het gekozen gebied, complex of object, of de cirkel bij "in de buurt", als zwarte stippellijn zonder vulling.
  const style = { color: '#000', weight: 2, dashArray: '6 6', fill: false, interactive: false };
  if (context?.circle) contextLayer.addLayer(L.circle([context.circle.point.lat, context.circle.point.lon], { ...style, radius: context.circle.meters }));
  else if (context?.geometry?.polygons) contextLayer.addLayer(L.polygon(context.geometry.polygons, style));
}
function renderMap(hits) {
  if (!map) return 0;
  markerLayer.clearLayers(); markers.clear(); shapes.clear();
  const counts = { eigen: 0, geleend: 0 };
  for (const hit of hits) {
    const geometry = mapGeometryFor(hit._source);
    if (!geometry) continue;
    const soort = soortVan(hit._source?.['@id']);
    const number = nummerVan(hit._source) || '?';
    // Vlakken worden als vlak getekend; het label staat op het zwaartepunt van het (grootste) vlak.
    if (geometry.polygons) {
      const shape = L.polygon(geometry.polygons, shapeStyle(soort, false, geometry.geleend)).on('click', () => select(hit._id, false));
      shape.soort = soort; shape.geleend = geometry.geleend; shapes.set(hit._id, shape); markerLayer.addLayer(shape);
    }
    const marker = L.marker([geometry.point.lat, geometry.point.lon], { icon: markerIcon(number, soort, false), title: `${soorten[soort] ?? 'Object'} ${number}${geometry.geleend ? ' (geleende locatie)' : ''}`, keyboard: true });
    marker.on('click', () => select(hit._id, false));
    marker.number = number; marker.soort = soort;
    markers.set(hit._id, marker); markerLayer.addLayer(marker); counts[geometry.geleend ? 'geleend' : 'eigen']++;
  }
  // Grote gebieden onderop, zodat kleinere vlakken klikbaar blijven.
  for (const shape of shapes.values()) if (isArea(shape.soort) || shape.geleend) shape.bringToBack();
  const total = counts.eigen + counts.geleend;
  needsFit = total > 0 || contextLayer.getLayers().length > 0; fitMarkers();
  const zonder = hits.filter(hit => !mapGeometryFor(hit._source));
  const zonderArcheologie = zonder.filter(hit => ['archeologischcomplex', 'grondsporen', 'vondsten'].includes(soortVan(hit._source?.['@id']))).length;
  const delen = [`Op kaart: ${total} van ${hits.length} getoonde resultaten${counts.geleend ? `, waarvan ${counts.geleend} met een geleende locatie (stippellijn: het vlak van het monument of onderzoeksgebied waarin het ligt)` : ''}.`];
  if (zonder.length) delen.push(`${zonder.length} ${zonder.length === 1 ? 'heeft' : 'hebben'} geen locatie in de index${zonderArcheologie ? '. Archeologische complexen, grondsporen en vondsten hebben nooit een eigen locatie; je vindt ze via hun onderzoeksgebied' : ''}.`);
  if (contextLayer.getLayers().length) delen.push('Het gekozen gebied, object of de afstand staat als zwarte stippellijn op de kaart.');
  $('map-info').textContent = hits.length ? delen.join(' ') : 'Geen resultaten om op de kaart te tonen.';
  return total;
}
// Oude kaarten uit Allmaps over een object: een laag op de kaart, met een keuzelijst en een schuif voor de dekking.
// De index (oude-kaarten.json, ca. 300 kB ingepakt) wordt pas geladen bij de eerste keer.
let oudeIndex = null, oudeLaag = null, oudePaneel = null, oudeDekking = 80, oudeBeurt = 0;
const laadOudeKaarten = () => (oudeIndex ??= fetch(OUDE_KAARTEN_URL).then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }).catch(error => { oudeIndex = null; throw error; }));
const escapeHtml = text => el('span', text).innerHTML;
function sluitOudeKaart() { oudeBeurt++; oudeLaag?.remove(); oudeLaag = null; oudePaneel?.remove(); oudePaneel = null; }
function oudeKaartPaneel() {
  if (oudePaneel) return oudePaneel.getContainer();
  oudePaneel = new (L.Control.extend({ onAdd() { const box = el('div', null, 'oude-kaart'); L.DomEvent.disableClickPropagation(box); L.DomEvent.disableScrollPropagation(box); return box; } }))({ position: 'topright' }).addTo(map);
  return oudePaneel.getContainer();
}
function toonOudeLaag(kaart, bron) {
  oudeLaag?.remove();
  const [x0, y0, x1, y1] = kaart.bbox;
  // De tile server rekent elke tegel uit; boven zoom 18 vergroot Leaflet zelf. Buiten de omtrek worden geen tegels gevraagd.
  oudeLaag = L.tileLayer(tegels(kaart.id), { maxNativeZoom: 18, maxZoom: 19, zIndex: 2, opacity: oudeDekking / 100, bounds: [[y0, x0], [y1, x1]], attribution: `Oude kaart: ${escapeHtml(kaart.collectie)} via <a href="https://allmaps.org/" target="_blank" rel="noopener">Allmaps</a>` }).addTo(map);
  bron.replaceChildren(document.createTextNode(`${kaart.collectie}${kaart.jaar ? ` · ${kaart.jaar}` : ''} · `), link('hele kaart in Allmaps', viewerUrl(kaart.id)));
}
async function toonOudeKaarten(id, source) {
  const geometry = mapGeometryFor(source);
  if (!map || !geometry) return;
  const soort = soortVan(source['@id']), beurt = ++oudeBeurt;
  // Oude kaarten zijn meestal 1:25.000 of grover: bij een los object zoomen we niet verder in dan 16.
  select(id, true); if (!isArea(soort)) map.flyTo([geometry.point.lat, geometry.point.lon], 16, { duration: 0.8 });
  const naam = naamVan(source) || `${soortLabel(soort)} ${nummerVan(source) ?? ''}`.trim();
  const box = oudeKaartPaneel(), sluit = button('×', sluitOudeKaart, 'oude-kaart-sluit'); sluit.setAttribute('aria-label', 'Oude kaart sluiten');
  const kop = el('p', null, 'oude-kaart-kop'); kop.append(el('strong', 'Oude kaarten'), document.createTextNode(` bij ${naam}`), sluit);
  box.replaceChildren(kop, el('p', 'Laden…', 'hint'));
  let lijst;
  try { lijst = kaartenOp(await laadOudeKaarten(), geometry.point.lat, geometry.point.lon); }
  catch (error) { console.error(error); box.replaceChildren(kop, el('p', 'De lijst met oude kaarten kon niet worden geladen.', 'hint')); return; }
  if (beurt !== oudeBeurt || !oudePaneel) return;
  if (!lijst.length) { oudeLaag?.remove(); oudeLaag = null; box.replaceChildren(kop, el('p', 'Geen oude kaarten van bekende collecties op deze plek.', 'hint')); return; }
  const keuze = el('select'); keuze.setAttribute('aria-label', 'Kies een oude kaart');
  // Meerdere scans met dezelfde titel krijgen een volgnummer.
  const gezien = new Map();
  for (const kaart of lijst) { const tekst = kaartLabel(kaart), n = (gezien.get(tekst) ?? 0) + 1; gezien.set(tekst, n); const optie = el('option', n > 1 ? `${tekst} (${n})` : tekst); optie.value = kaart.id; keuze.append(optie); }
  const dekking = el('input'); Object.assign(dekking, { type: 'range', min: 0, max: 100, step: 5, value: oudeDekking });
  const dekkingLabel = el('label', 'Dekking '); dekkingLabel.append(dekking);
  const bron = el('p', null, 'hint');
  keuze.addEventListener('change', () => toonOudeLaag(lijst.find(kaart => kaart.id === keuze.value), bron));
  dekking.addEventListener('input', () => { oudeDekking = Number(dekking.value); oudeLaag?.setOpacity(oudeDekking / 100); });
  box.replaceChildren(kop, el('p', `${plural(lijst.length, 'kaart', 'kaarten')} op deze plek, oudste eerst.`, 'hint'), keuze, dekkingLabel, bron);
  keuze.value = eersteKeus(lijst).id; toonOudeLaag(eersteKeus(lijst), bron);
}
// Een verborgen kaart heeft geen afmetingen; pas passend inzoomen zodra de kaart zichtbaar is.
function fitMarkers() {
  if (!needsFit || !$('map').offsetWidth) return;
  const bounds = markerLayer.getBounds();
  if (contextLayer.getLayers().length) bounds.extend(contextLayer.getBounds());
  if (!bounds.isValid()) return;
  map.invalidateSize(); map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 }); needsFit = false;
}
function setView(view) {
  $('workspace').dataset.view = view;
  document.querySelectorAll('.view-toggle button').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.view === view)));
  if (view === 'map' && map) { map.invalidateSize(); fitMarkers(); }
}
// Selecteer een resultaat: markeer de kaart en het resultaat; vanuit de lijst vliegt de kaart naar het object.
function select(id, fromList) {
  for (const [key, card] of cards) card.classList.toggle('selected', key === id);
  for (const [key, marker] of markers) { marker.setIcon(markerIcon(marker.number, marker.soort, key === id)); marker.setZIndexOffset(key === id ? 1000 : 0); }
  for (const [key, shape] of shapes) { shape.setStyle(shapeStyle(shape.soort, key === id, shape.geleend)); if (key === id && !isArea(shape.soort)) shape.bringToFront(); }
  const marker = markers.get(id);
  if (fromList) {
    if (!marker) return;
    if (!wide.matches) setView('map');
    needsFit = false;
    if (shapes.has(id)) map.flyToBounds(shapes.get(id).getBounds(), { padding: [40, 40], maxZoom: 18, duration: 0.8 });
    else map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 17), { duration: 0.8 });
  } else {
    if (!wide.matches) setView('list');
    cards.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
const isActive = (key, value) => state.filters[key]?.includes(value) ?? false;
function toggleFilter(key, value) {
  const list = state.filters[key] ?? [];
  state.filters[key] = list.includes(value) ? list.filter(item => item !== value) : [...list, value];
  if (!state.filters[key].length) delete state.filters[key];
  state.page = 0; run();
}
const valueLabel = (key, value) => (key === 'soort' ? soorten[value] ?? value : decode(value));
function renderFilters(aggregations, context) {
  $('active-filters').replaceChildren();
  if (state.binnen) {
    const chip = button(`Binnen: ${context?.label ?? state.binnen} ×`, () => setBinnen(null)); chip.className = 'chip-binnen';
    chip.setAttribute('aria-label', `Verwijder ${context?.label ?? state.binnen}`); $('active-filters').append(chip);
  }
  if (state.jaar.van != null || state.jaar.tot != null) {
    const tekst = `Datering: ${JAARMODI[state.jaar.modus ?? 'overlapt']} in ${jaarBereik(state.jaar).replace(/^de periode /, '')} ×`;
    const chip = button(tekst, () => { state.jaar = {}; state.page = 0; syncForm(); run(); });
    chip.setAttribute('aria-label', 'Verwijder het filter op datering'); $('active-filters').append(chip);
  }
  for (const [key, list] of Object.entries(state.filters)) for (const value of list) {
    const chip = button(`${facets[key]}: ${valueLabel(key, value)} ×`, () => toggleFilter(key, value));
    chip.setAttribute('aria-label', `Verwijder filter ${facets[key]}: ${valueLabel(key, value)}`); $('active-filters').append(chip);
  }
  if (Object.keys(state.filters).length || state.binnen || state.jaar.van != null || state.jaar.tot != null) $('active-filters').append(button('Wis alle filters', () => { state.filters = {}; state.jaar = {}; state.binnen = null; state.page = 0; syncForm(); run(); }));
  $('facets').replaceChildren();
  for (const [key, label] of Object.entries(facets)) {
    const group = el('details'); group.open = ['soort', 'provincie', 'type'].includes(key) || Boolean(state.filters[key]?.length);
    const selected = state.filters[key]?.length;
    group.append(el('summary', selected ? `${label} (${selected} gekozen)` : label));
    const aggregation = bucketsOf(aggregations[key]);
    if (!aggregation) { group.append(el('p', 'Deze facet is niet beschikbaar.', 'hint')); $('facets').append(group); continue; }
    // Gekozen waarden blijven zichtbaar, ook als ze niet bij de 100 meest voorkomende horen.
    const buckets = [...aggregation.buckets];
    for (const value of state.filters[key] ?? []) if (!buckets.some(bucket => bucket.key === value)) buckets.unshift({ key: value, doc_count: null });
    const list = el('ul', null, 'facet-list');
    for (const bucket of buckets) {
      const item = el('li'), option = el('label', null, 'facet-option'), box = el('input');
      box.type = 'checkbox'; box.checked = isActive(key, bucket.key); box.addEventListener('change', () => toggleFilter(key, bucket.key));
      const approximate = bucket.doc_count_error_upper_bound > 0;
      const name = el('span', valueLabel(key, bucket.key), 'facet-name');
      if (key === 'soort') name.dataset.soort = bucket.key;
      option.append(box, name, el('span', bucket.doc_count == null ? '' : `${approximate ? '≈ ' : ''}${format(bucket.doc_count)}`, 'facet-count'));
      item.append(option); list.append(item);
    }
    group.append(list);
    if (!buckets.length) group.append(el('p', 'Geen waarden bij deze zoekvraag.', 'hint'));
    if (aggregation.sum_other_doc_count > 0) group.append(el('p', 'De 100 meest voorkomende waarden. Verfijn je zoekvraag voor andere waarden.', 'hint'));
    $('facets').append(group);
  }
}
// Zoekformulier, URL en uitleg volgen de state.
function syncForm() {
  $('query').value = state.query; $('field').value = state.field; $('sort').value = state.sort; checkQuery();
  $('jaar-van').value = state.jaar.van ?? ''; $('jaar-tot').value = state.jaar.tot ?? ''; $('jaarmodus').value = state.jaar.modus ?? 'overlapt';
  const g = state.binnen && gebieden.byKey.get(state.binnen);
  $('binnen').value = g ? gebiedLabel(g) : '';
}
function syncUrl(mode) {
  const query = toParams(state).toString();
  const url = `${location.pathname}${query ? `?${query}` : ''}`;
  if (mode === 'push' && url !== `${location.pathname}${location.search}`) history.pushState(null, '', url);
  else if (mode === 'replace') history.replaceState(null, '', url);
}
function explain(context) {
  const lines = describe(state, context?.label);
  $('explain').textContent = lines.slice(0, -1).join(' · ');
  $('explain').hidden = !$('explain').textContent;
  $('query-explain').replaceChildren(...lines.map(line => el('li', line)));
}
function renderContext(context) {
  $('context').replaceChildren(); $('context').hidden = !context;
  if (!context) return;
  const text = el('p'); text.append(el('strong', `Binnen ${context.label}`), document.createTextNode(`: ${context.summary}.`));
  const actions = el('div', null, 'links');
  if (context.meters) {
    const distance = el('select'); distance.setAttribute('aria-label', 'Afstand');
    for (const meters of AFSTANDEN) { const option = el('option', `${format(meters)} m`); option.value = meters; option.selected = meters === context.meters; distance.append(option); }
    distance.addEventListener('change', () => setBinnen(`rond:${context.soort}:${context.nummer}:${distance.value}`));
    actions.append(distance);
  }
  const url = safeUrl(context.uri); if (url) actions.append(link('Linked Data (CHO)', url));
  const echt = context.soort === 'bufferzone' ? 'werelderfgoed' : context.soort;
  actions.append(button(`Toon ${soortLabel(context.soort).toLowerCase()} ${context.nummer} zelf`, () => showObject(echt, context.nummer)), button('Weer overal zoeken', () => setBinnen(null)));
  $('context').append(text, actions);
}
// JSON-weergave: lange lijsten (onderdelen, vlakken) inkorten, zodat de query leesbaar blijft.
const readable = body => JSON.stringify(body, (key, value) => {
  if (Array.isArray(value) && value.length > 12 && value.every(item => typeof item === 'string')) return [...value.slice(0, 8), `… en nog ${value.length - 8}`];
  if (key === 'shape' && typeof value === 'string' && value.length > 300) return `${value.slice(0, 200)} … (${format(value.length)} tekens)`;
  return value;
}, 2);
async function run(urlMode = 'push') {
  controller?.abort(); const current = new AbortController(); controller = current;
  syncUrl(urlMode);
  $('error').hidden = true; $('status').textContent = 'Zoeken…'; $('workspace').setAttribute('aria-busy', 'true');
  $('results').replaceChildren(); renderMap([]); $('map-info').textContent = 'Zoeken…'; $('facets').replaceChildren(); $('active-filters').replaceChildren(); $('pagination').hidden = true; $('page-info').textContent = ''; $('export').disabled = true; $('export-info').textContent = '';
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; current.abort(); }, 20000);
  let context = null;
  try {
    context = await resolveContext(state.binnen);
    if (controller !== current) return;
    const body = buildQuery(state, context);
    $('query-json').textContent = readable(body); explain(context); renderContext(context);
    renderContextGeometry(context);
    const data = await search(body, current.signal);
    if (controller !== current) return;
    const total = typeof data.hits.total === 'number' ? data.hits.total : data.hits.total.value;
    const exact = typeof data.hits.total === 'number' || data.hits.total.relation === 'eq';
    const hits = data.hits.hits;
    await gebiedenLoaded;
    renderResults(hits); renderFilters(data.aggregations, context);
    const onMap = renderMap(hits);
    loadRelations(hits, current.signal); loadLigtIn(hits, current.signal);
    $('status').textContent = `Totaal gevonden: ${exact ? '' : 'minimaal '}${format(total)} | Getoond: ${hits.length}${map ? ` | Op kaart: ${onMap}` : ''}`;
    $('page-info').textContent = hits.length ? `${format(state.page * PAGE_SIZE + 1)} tot ${format(state.page * PAGE_SIZE + hits.length)}` : '';
    $('pagination').hidden = total <= PAGE_SIZE;
    $('previous').disabled = state.page === 0;
    $('next').disabled = (state.page + 1) * PAGE_SIZE >= Math.min(total, MAX_WINDOW);
    $('page-number').textContent = `Pagina ${state.page + 1} van ${Math.max(1, Math.ceil(Math.min(total, MAX_WINDOW) / PAGE_SIZE))}`;
    lastTotal = total; $('export').disabled = total === 0;
    if (total > MAX_WINDOW) $('results').append(el('p', 'Je kunt maximaal de eerste 10.000 resultaten bekijken. Verfijn je zoekvraag voor de overige resultaten.', 'hint'));
  } catch (error) {
    if (controller !== current) return;
    $('status').textContent = 'Zoeken niet gelukt.';
    $('error').textContent = timedOut ? 'De zoekopdracht duurde te lang. Verfijn je zoekvraag en probeer opnieuw.' : error instanceof TypeError ? 'De zoekservice is niet bereikbaar. Controleer je verbinding en probeer opnieuw.' : error.message;
    $('error').hidden = false;
    renderFilters({}, context); renderMap([]);
  } finally { clearTimeout(timer); if (controller === current) $('workspace').setAttribute('aria-busy', 'false'); }
}
// Beginsituatie bewaren, zodat "Opnieuw beginnen" de pagina terugzet zonder te herladen.
const initial = Object.fromEntries(['status', 'facets', 'results', 'query-json', 'query-explain', 'map-info'].map(id => [id, [...$(id).childNodes].map(node => node.cloneNode(true))]));
function reset() {
  controller?.abort(); controller = undefined;
  Object.assign(state, blank()); syncForm(); syncUrl('push');
  $('explain').hidden = true; $('context').hidden = true; $('export').disabled = true; $('export-info').textContent = '';
  for (const [id, nodes] of Object.entries(initial)) $(id).replaceChildren(...nodes.map(node => node.cloneNode(true)));
  $('active-filters').replaceChildren(); $('page-info').textContent = ''; $('pagination').hidden = true; $('error').hidden = true;
  $('workspace').setAttribute('aria-busy', 'false'); cards.clear();
  if (map) { markerLayer.clearLayers(); contextLayer.clearLayers(); markers.clear(); shapes.clear(); needsFit = false; map.setView([52.2, 5.3], 7); }
  setView('list'); $('query').focus();
}
// Jaartal uit het formulier: leeg is geen grens; "500 v.Chr." of "-500" wordt -500.
function leesJaar(id) {
  const raw = $(id).value.trim().replace(/\s+/g, ' ');
  if (!raw) return null;
  const match = /^(-?)(\d{1,6})( ?v\.? ?chr\.?)?$/i.exec(raw);
  if (!match) throw new Error('Gebruik hele jaartallen bij de datering, bijvoorbeeld 1600, of -500 (of 500 v.Chr.) voor jaren voor Christus.');
  return (match[1] || match[3] ? -1 : 1) * Number(match[2]);
}
$('reset').addEventListener('click', reset);
$('search-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const van = leesJaar('jaar-van'), tot = leesJaar('jaar-tot');
    if (van != null && tot != null && van > tot) throw new Error('Het jaartal bij Van moet vóór het jaartal bij tot liggen.');
    state.jaar = { ...(van != null ? { van } : {}), ...(tot != null ? { tot } : {}), ...(van != null || tot != null ? { modus: $('jaarmodus').value === 'binnen' ? 'binnen' : 'overlapt' } : {}) };
  } catch (error) { $('error').textContent = error.message; $('error').hidden = false; $('jaar-van').focus(); return; }
  state.query = $('query').value; state.field = $('field').value; state.page = 0;
  const typed = $('binnen').value.trim();
  if (!typed) { if (state.binnen && gebieden.byKey.has(state.binnen)) state.binnen = null; }
  else if (gebieden.byLabel.has(typed)) state.binnen = gebieden.byLabel.get(typed);
  else if (!(state.binnen && gebieden.byKey.get(state.binnen) && gebiedLabel(gebieden.byKey.get(state.binnen)) === typed)) {
    // Vrije tekst: neem het eerste gebied waarvan de naam erop lijkt (kernzones en gezichten eerst).
    const match = gebieden.list.find(g => g.soort !== 'bufferzone' && decode(g.naam ?? '').toLowerCase().includes(typed.toLowerCase())) ?? gebieden.list.find(g => decode(g.naam ?? '').toLowerCase().includes(typed.toLowerCase()));
    if (!match) { $('error').textContent = `Geen gezicht of werelderfgoed gevonden voor “${typed}”. Kies een naam uit de lijst.`; $('error').hidden = false; return; }
    state.binnen = match.key;
  }
  syncForm(); run();
});
// Een gebied uit de lijst kiezen zoekt meteen.
$('binnen').addEventListener('change', () => { if (gebieden.byLabel.has($('binnen').value)) $('search-form').requestSubmit(); });
$('binnen').addEventListener('search', () => { if (!$('binnen').value && state.binnen) $('search-form').requestSubmit(); });
$('sort').addEventListener('change', () => { state.sort = $('sort').value; state.page = 0; if ($('query-json').textContent.startsWith('{')) run(); });
document.querySelectorAll('[data-example]').forEach(node => node.addEventListener('click', () => {
  $('help').close();
  const jaar = { ...(node.dataset.van ? { van: Number(node.dataset.van) } : {}), ...(node.dataset.tot ? { tot: Number(node.dataset.tot) } : {}), ...(node.dataset.van || node.dataset.tot ? { modus: node.dataset.jaarmodus === 'binnen' ? 'binnen' : 'overlapt' } : {}) };
  Object.assign(state, { query: node.dataset.example, field: node.dataset.veld ?? DEFAULT_FIELD, page: 0, binnen: node.dataset.binnen ?? null, filters: node.dataset.soort ? { soort: node.dataset.soort.split(',') } : {}, jaar, sort: node.dataset.sorteer ?? 'relevantie' });
  syncForm(); run();
}));
$('help-open').addEventListener('click', () => $('help').showModal());
// "Hoe werkt de volgorde?" opent de zoekhulp bij dat onderwerp.
document.querySelectorAll('[data-help]').forEach(node => node.addEventListener('click', () => { if (!$('help').open) $('help').showModal(); $(`help-${node.dataset.help}`)?.scrollIntoView({ block: 'start' }); }));
$('help-close').addEventListener('click', () => $('help').close());
$('help').addEventListener('click', event => { if (event.target === $('help')) $('help').close(); });
// Tip bij operatoren in kleine letters of Nederlandse varianten: die worden als gewone zoekwoorden gezien.
function checkQuery() {
  const words = [...new Set(($('query').value.replace(/"[^"]*"/g, ' ').match(/(?<![\p{L}\d])(and|or|not|en|of|niet)(?![\p{L}\d])/gu) || []))];
  const operator = { and: 'AND', en: 'AND', or: 'OR', of: 'OR', not: 'NOT', niet: 'NOT' };
  $('query-tip').textContent = words.length ? `Tip: ${words.map(word => `“${word}”`).join(', ')} wordt als zoekwoord gezien. Bedoel je ${[...new Set(words.map(word => operator[word]))].join(' / ')}? Schrijf operatoren in hoofdletters.` : '';
  $('query-tip').hidden = !words.length;
}
$('query').addEventListener('input', checkQuery);

$('previous').addEventListener('click', () => { state.page--; run(); });
$('next').addEventListener('click', () => { state.page++; run(); });
document.querySelectorAll('.view-toggle button').forEach(node => node.addEventListener('click', () => setView(node.dataset.view)));
wide.addEventListener('change', () => { if (map) { map.invalidateSize(); fitMarkers(); } });
// Deelbare link: de URL bevat altijd de huidige zoekactie.
$('share').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); $('share').textContent = 'Link gekopieerd'; }
  catch { window.prompt('Kopieer deze link:', location.href); }
  setTimeout(() => { $('share').textContent = 'Kopieer link'; }, 2500);
});
// CSV-export: dezelfde zoekactie, maximaal EXPORT_MAX rijen.
$('export').addEventListener('click', async () => {
  $('export').disabled = true; $('export-info').textContent = 'Export wordt gemaakt…';
  try {
    const data = await search(buildExportQuery(state, contexts.get(state.binnen)), AbortSignal.timeout(30000));
    const blob = new Blob([toCsv(data.hits.hits, decode)], { type: 'text/csv;charset=utf-8' });
    const anchor = el('a'); anchor.href = URL.createObjectURL(blob); anchor.download = `erfgoed-cho-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click(); setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
    $('export-info').textContent = lastTotal > EXPORT_MAX ? `De export bevat de eerste ${format(EXPORT_MAX)} van ${format(lastTotal)} resultaten.` : `${format(data.hits.hits.length)} resultaten geëxporteerd.`;
  } catch (error) {
    console.error(error); $('export-info').textContent = 'Exporteren is niet gelukt. Probeer het opnieuw.';
  } finally { $('export').disabled = false; }
});
for (const name of Object.keys(searchFields)) { const option = el('option', name); option.value = name; $('field').append(option); }
for (const [key, { label }] of Object.entries(sorts)) { const option = el('option', label); option.value = key; $('sort').append(option); }
$('export').textContent = `Download CSV (max. ${format(EXPORT_MAX)})`;
// Zoekactie uit de URL laden: bij openen van een gedeelde link en bij terug/vooruit in de browser.
async function loadFromUrl() {
  const { state: next, active } = fromParams(location.search);
  Object.assign(state, next);
  await gebiedenLoaded; syncForm();
  if (active || next.sort !== 'relevantie') run('replace'); else reset();
}
window.addEventListener('popstate', loadFromUrl);
if (location.search) loadFromUrl();
