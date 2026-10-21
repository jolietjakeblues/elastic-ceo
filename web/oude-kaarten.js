// Oude kaarten uit Allmaps (https://allmaps.org) over een object. Welke kaarten er zijn staat in oude-kaarten.json
// (gemaakt met allmaps/maak-oude-kaarten.mjs); het kaartbeeld komt als tegels van de Allmaps Tile Server, die de scan
// van de collectie (IIIF) naar de juiste plek vervormt. Zelfde aanpak als in Dodenakkers en Joodse begraafplaatsen.
export const OUDE_KAARTEN_URL = 'oude-kaarten.json';
const MAP_ID = /^[0-9a-f]{16}$/;

export const tegels = id => `https://allmaps.xyz/maps/${encodeURIComponent(id)}/{z}/{x}/{y}.png`;
export const viewerUrl = id => `https://viewer.allmaps.org/?url=${encodeURIComponent(`https://annotations.allmaps.org/maps/${id}`)}`;

// Ligt (lon, lat) in de ring [lon, lat, lon, lat, ...]? (even-oneven-regel)
function inRing(ring, lon, lat) {
  let binnen = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) binnen = !binnen;
  }
  return binnen;
}

// Kaarten uit de index die het punt bevatten, oudste eerst (zonder jaar achteraan), zoals in oude-kaarten.json.
export function kaartenOp(index, lat, lon) {
  const result = [];
  for (const [id, titel, collectie, jaar, [x0, y0, x1, y1], ringen, bron] of index?.kaarten ?? []) {
    if (!MAP_ID.test(id) || lon < x0 || lon > x1 || lat < y0 || lat > y1) continue;
    if (ringen.some(ring => inRing(ring, lon, lat))) result.push({ id, titel, collectie: index.collecties[collectie] ?? '', jaar, bbox: [x0, y0, x1, y1], bron: index.bronnen?.[bron] ?? '' });
  }
  return result;
}

// Kadastrale minuutplans (1811-1832) uit de WFS van de RCE: de bladgrenzen, met een link naar de scan in de beeldbank.
// De WFS zoekt op een kleine bbox (lon, lat) rond het punt; daarna telt alleen een blad waarvan het vlak het punt bevat.
export const MINUUTPLANS_WFS = 'https://services.rce.geovoorziening.nl/misc/wfs';
export function minuutplanUrl(lat, lon) {
  const d = 0.0005, url = new URL(MINUUTPLANS_WFS), r = x => Number(x.toFixed(6));
  [lat, lon] = [Number(lat), Number(lon)];
  for (const [key, value] of Object.entries({ service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: 'misc:Minuutplanbegrenzingen', outputFormat: 'application/json', srsName: 'EPSG:4326', count: '50', bbox: `${r(lon - d)},${r(lat - d)},${r(lon + d)},${r(lat + d)},EPSG:4326` })) url.searchParams.set(key, value);
  return url.href;
}
// Alleen links naar de beeldbank van de RCE, altijd via https.
const beeldbankUrl = value => {
  try { const url = new URL(String(value)); return url.hostname === 'beeldbank.cultureelerfgoed.nl' ? `https://${url.host}${url.pathname}` : null; } catch { return null; }
};
const inVlak = (geometry, lon, lat) => {
  const polygonen = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : [];
  return polygonen.some(([buiten]) => Array.isArray(buiten) && inRing(buiten.flat(), lon, lat));
};
export function minuutplannen(json, lat, lon) {
  const bladen = new Map();
  for (const { geometry, properties: p = {} } of json?.features ?? []) {
    if (!p.CODE || bladen.has(p.CODE) || p.MPAANWEZIG === 'nee' || !inVlak(geometry, lon, lat)) continue;
    bladen.set(p.CODE, { code: String(p.CODE), gemeente: String(p.GEMEENTE ?? ''), sectie: String(p.SECTIE ?? ''), blad: String(p.BLAD ?? ''), url: beeldbankUrl(p.URL) });
  }
  return [...bladen.values()].sort((a, b) => a.code.localeCompare(b.code));
}
export const minuutplanLabel = blad => [blad.gemeente, blad.sectie && `sectie ${blad.sectie}`, blad.blad && `blad ${blad.blad}`].filter(Boolean).join(', ') || blad.code;

// Eén tegel van een kaart op het punt (zoom 15), om vooraf te testen of de scan bereikbaar is.
export function tegelOp(id, lat, lon, z = 15) {
  const n = 2 ** z, r = lat * Math.PI / 180;
  const x = Math.floor((lon + 180) / 360 * n), y = Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n);
  return tegels(id).replace('{z}', z).replace('{x}', x).replace('{y}', y);
}
// Proeftegels per bron (server van de scan): de eerste kaart van elke bron. Geeft die tegel een Allmaps-fout met een
// status van 500 of hoger (de server ligt plat), dan gelden alle kaarten van die bron als onbereikbaar.
export function proefkaarten(lijst) {
  const perBron = new Map();
  for (const kaart of lijst) if (kaart.bron && !perBron.has(kaart.bron)) perBron.set(kaart.bron, kaart);
  return [...perBron.values()];
}
export function bronFout(headers) {
  if (!headers.get('X-Allmaps-Error')) return null;
  const status = Number(headers.get('X-Allmaps-Error-Status') ?? 0);
  return { status, melding: headers.get('X-Allmaps-Error-Message') ?? 'fout', bronPlat: status >= 500 };
}
// Volgnummer alleen bij echte duplicaten: dezelfde titel én hetzelfde jaar (andere scans van dezelfde kaart).
export function metVolgnummer(lijst) {
  const gezien = new Map();
  return lijst.map(kaart => {
    const sleutel = `${kaart.titel}|${kaart.jaar ?? ''}`, n = (gezien.get(sleutel) ?? 0) + 1;
    gezien.set(sleutel, n);
    return { ...kaart, naam: n > 1 ? `${kaart.titel} (${n})` : kaart.titel };
  });
}

export const kaartLabel = kaart => `${kaart.jaar ? `${kaart.jaar} · ` : ''}${kaart.titel}`;
// Eerste keus: een Bonneblad (1:25.000, nauwkeurig geplaatst), anders de oudste kaart.
export const eersteKeus = lijst => lijst.find(kaart => kaart.titel.startsWith('Bonneblad ')) ?? lijst[0];
