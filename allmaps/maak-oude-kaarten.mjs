// Maakt web/oude-kaarten.json: de gegeorefereerde oude kaarten uit Allmaps (https://allmaps.org) die in de
// zoekdemo over een object getoond kunnen worden. Zelfde selectie als in de projecten Dodenakkers en Joodse
// begraafplaatsen (scripts/fetch_allmaps.py daar), maar voor heel Nederland en zonder vooraf te koppelen:
// de browser zoekt zelf welke kaarten over een punt liggen.
//
// Bron: de open dump van alle Allmaps-kaarten (https://files.allmaps.org/maps.geojsonl, CC0, twee keer per
// dag ververst). Het kaartbeeld blijft bij de instelling en komt als tegels van de Allmaps Tile Server.
//
// Selectie:
//   - de omtrek ligt (deels) in Nederland;
//   - detailkaart: omtrek kleiner dan MAX_KM2 (geen overzichtskaarten);
//   - herkenbare titel (geen "Canvas 3", "Image", lege labels);
//   - alleen collecties van bekende instellingen (COLLECTIES, HOSTS);
//   - per scan (IIIF-image) een keer: bij meerdere georeferenties de nieuwste.
//
// Jaartal: bij de Bonnebladen (TU Delft) uit allmaps/bonnebladen_jaren.csv (overgenomen uit Joodse
// begraafplaatsen), anders een jaartal in de titel, anders leeg.
//
// Gebruik:
//   node allmaps/maak-oude-kaarten.mjs                       (dump downloaden, ca. 200 MB)
//   node allmaps/maak-oude-kaarten.mjs pad/naar/maps.geojsonl
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';

const DUMP_URL = 'https://files.allmaps.org/maps.geojsonl';
const JAREN = new URL('./bonnebladen_jaren.csv', import.meta.url);
const OUT = new URL('../web/oude-kaarten.json', import.meta.url);

// Nederland ruim (lon/lat).
const NL = [3.2, 50.7, 7.3, 53.6];
// Bonneblad ca. 62 km², Waterstaatskaart-blad 250-500 km²; provinciekaarten (850+ km²) zijn te grof.
const MAX_KM2 = 600;
// Coördinaten op 4 decimalen: ca. 10 m, ruim genoeg om te bepalen of een punt op de kaart ligt.
const DECIMALEN = 4;
// Iedereen kan in Allmaps georefereren; daardoor staan er ook testkaarten en verkeerd geplaatste kaarten in.
const COLLECTIES = new Set([
  'TU Delft Library', 'Universiteitsbibliotheek Utrecht', 'Universiteitsbibliotheek VU',
  'Universiteitsbibliotheek van Amsterdam', 'Universitaire Bibliotheken Leiden', 'Nationaal Archief',
  '4TU.ResearchData', 'University of Groningen', 'Stadsarchief Amsterdam', 'Gouda Tijdmachine',
  'Rotterdams Publiek', 'Erfgoed Leiden en Omstreken', 'Wageningen University & Research',
  'Library of Congress', 'David Rumsey Map Collection', 'Harvard Library Digital Collections',
  'Stanford Libraries', 'Yale University Library', 'Bibliothèque nationale de France',
]);
// Instellingen zonder provider-label in de IIIF-bron: herkend aan de host.
const HOSTS = {
  'proxy.archieven.nl': 'Stadsarchief Rotterdam',
  'preserve-iiif.archieven.nl': 'Stadsarchief Rotterdam',
  'iiif.tresoar.nl': 'Tresoar',
  'facsimile.ub.rug.nl': 'University of Groningen',
};
const GENERIEK = /^(canvas \d+|image|\d+|my manifest|generated from .*|iiif manifest.*|.*zonder metadata.*|\?)$/i;
// Bonnebladen-scan: https://dlc.services/iiif-img/[v3/]7/4/<hash>
const BONNE = /dlc\.services\/iiif-img\/(?:v3\/)?7\/4\/([0-9a-f]{32})$/;

// IIIF-label ({"nl": ["..."]}) naar tekst; soms is het label zelf JSON-tekst.
function label(v) {
  if (v && typeof v === 'object') { const first = Object.values(v)[0]; v = Array.isArray(first) ? first[0] ?? '' : ''; }
  v = String(v ?? '').trim();
  if (v.startsWith('{')) { try { return label(JSON.parse(v)); } catch { /* gewone tekst */ } }
  v = v.replace(/\s+/g, ' ').replace(/^[ /]+|[ /]+$/g, '');
  // Catalogusnummers en vulteksten (UB Utrecht, BnF).
  v = v.replace(/\s*(\.\.\.\s*)?KAART:.*$/, '').replace(/\s*[/:]?\s*\.\.\.\s*$/, '').replace(/\s*\*[IVX]+\*\S*(\s*\([^)]*\))?/g, '').replace(/^(page info:?|np|-)$/i, '');
  v = v.replace(/:? ?Page Info: ?/g, ' ');
  v = v.replace('Waterstaatskaart van Nederland : op de schaal van 1:50.000', 'Waterstaatskaart van Nederland');
  v = v.replace('NL-HaNA 4.TOPO Topografische Dienst en Rechtsvoorgangers: A6.1 TMK: veldminuten', 'TMK, veldminuut');
  return v.replace(/^[ :]+|[ :]+$/g, '');
}
const bruikbaar = t => Boolean(t) && !GENERIEK.test(t);

// [serie, blad] uit canvas- en manifestlabels.
function titelVan(resource) {
  let serie = '', blad = '';
  for (const canvas of resource.partOf ?? []) {
    const c = label(canvas.label);
    if (bruikbaar(c) && !blad) blad = c;
    for (const man of canvas.partOf ?? []) {
      let m = label(man.label);
      const id = man.id ?? '';
      if (id.includes('river-map') && bruikbaar(m)) m = `Rivierkaart, ${m[0].toLowerCase()}${m.slice(1)}`;
      if (id.includes('luchtfotos-kadaster')) m = 'Luchtfoto Kadaster';
      if (bruikbaar(m) && !serie) serie = m;
    }
  }
  return [serie, blad];
}

function collectieVan(resource) {
  const prov = resource.provider ?? [];
  const t = prov.length ? label(prov[0].label) : '';
  if (COLLECTIES.has(t)) return t;
  return HOSTS[String(resource.id).replace(/^https?:\/\/([^/]+).*/, '$1')] ?? null;
}

// Buitenringen van een Polygon of MultiPolygon, als [[lon, lat], ...].
function ringen(geometry) {
  if (geometry?.type === 'Polygon') return [geometry.coordinates[0]];
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates.map(p => p[0]);
  return [];
}
function km2(ring) {
  let area = 0, lat = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1; lat += y1;
  }
  return Math.abs(area / 2) * 111.32 ** 2 * Math.cos((lat / ring.length) * Math.PI / 180);
}
const jaarUit = t => { const m = /\b(1[5-9]\d\d)\b/.exec(t); return m ? Number(m[1]) : null; };
const rond = x => Math.round(x * 10 ** DECIMALEN) / 10 ** DECIMALEN;

function bonnebladenJaren() {
  const [, ...rijen] = readFileSync(JAREN, 'utf8').trim().split(/\r?\n/);
  return new Map(rijen.map(r => { const [image, blad, jaar] = r.split(','); return [image, [blad, Number(jaar)]]; }));
}

async function* regels(dump) {
  let input;
  if (dump) input = createReadStream(dump, 'utf8');
  else {
    const res = await fetch(DUMP_URL);
    if (!res.ok) throw new Error(`${DUMP_URL}: HTTP ${res.status}`);
    input = Readable.fromWeb(res.body);
  }
  yield* createInterface({ input, crlfDelay: Infinity });
}

const jaren = bonnebladenJaren();
const perScan = new Map();
let gelezen = 0;
for await (const regel of regels(process.argv[2])) {
  if (!regel.trim()) continue;
  gelezen++;
  let f;
  try { f = JSON.parse(regel); } catch { continue; }
  const rs = ringen(f.geometry).filter(r => r.length >= 4);
  if (!rs.length) continue;
  const xs = rs.flat().map(c => c[0]), ys = rs.flat().map(c => c[1]);
  const bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  if (bbox[2] < NL[0] || bbox[0] > NL[2] || bbox[3] < NL[1] || bbox[1] > NL[3]) continue;
  const p = f.properties, res = p.resource;
  const collectie = collectieVan(res);
  if (!collectie || rs.reduce((a, r) => a + km2(r), 0) > MAX_KM2) continue;
  const [serie, blad] = titelVan(res);
  const bonne = BONNE.exec(res.id);
  let titel, jaar = null;
  if (bonne && jaren.has(bonne[1])) {
    const [nr, j] = jaren.get(bonne[1]);
    const m = /Blad \d+\w?: (.*)/.exec(blad);
    titel = `Bonneblad ${nr} ${m ? m[1].replace(/\w\S*/g, w => (/^[IVX]+$/i.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())) : ''}`.trim();
    jaar = j;
  } else {
    titel = serie && blad && !blad.includes(serie) && !serie.includes(blad) ? `${serie}: ${blad}` : (blad.length > serie.length ? blad : serie);
    jaar = jaarUit(titel);
  }
  if (!bruikbaar(titel)) continue;
  const oud = perScan.get(res.id);
  if (oud && oud.modified >= (p.modified ?? '')) continue;
  perScan.set(res.id, {
    id: p.id.split('/').pop(), modified: p.modified ?? '', titel, collectie, jaar, bron: new URL(res.id).host,
    bbox: bbox.map(rond),
    ringen: rs.map(r => r.flatMap(([x, y]) => [rond(x), rond(y)])),
  });
}

const kaarten = [...perScan.values()].sort((a, b) => (a.jaar ?? 9999) - (b.jaar ?? 9999) || a.titel.localeCompare(b.titel, 'nl') || a.id.localeCompare(b.id));
const collecties = [...new Set(kaarten.map(k => k.collectie))].sort();
// De server waar de scan staat (IIIF-host): ligt die plat, dan werken alle kaarten van die server niet (de website test er één).
const bronnen = [...new Set(kaarten.map(k => k.bron))].sort();
const out = {
  gegenereerd: new Date().toISOString().slice(0, 10),
  bron: 'Allmaps (https://allmaps.org), georeferenties CC0; kaartbeelden van de genoemde collecties',
  velden: ['id', 'titel', 'collectie (index in collecties)', 'jaar', 'bbox [minLon, minLat, maxLon, maxLat]', 'buitenringen [lon, lat, lon, lat, ...]', 'bron: server van de scan (index in bronnen)'],
  collecties,
  bronnen,
  kaarten: kaarten.map(k => [k.id, k.titel, collecties.indexOf(k.collectie), k.jaar, k.bbox, k.ringen, bronnen.indexOf(k.bron)]),
};
writeFileSync(OUT, JSON.stringify(out) + '\n');
const perCollectie = Object.entries(Object.groupBy(kaarten, k => k.collectie)).map(([c, l]) => `${c} ${l.length}`).join(', ');
console.log(`${gelezen.toLocaleString('nl')} kaarten gelezen, ${kaarten.length.toLocaleString('nl')} in web/oude-kaarten.json (${(JSON.stringify(out).length / 1e6).toFixed(1)} MB)`);
console.log(perCollectie);
