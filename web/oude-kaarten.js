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
  for (const [id, titel, collectie, jaar, [x0, y0, x1, y1], ringen] of index?.kaarten ?? []) {
    if (!MAP_ID.test(id) || lon < x0 || lon > x1 || lat < y0 || lat > y1) continue;
    if (ringen.some(ring => inRing(ring, lon, lat))) result.push({ id, titel, collectie: index.collecties[collectie] ?? '', jaar, bbox: [x0, y0, x1, y1] });
  }
  return result;
}

export const kaartLabel = kaart => `${kaart.jaar ? `${kaart.jaar} · ` : ''}${kaart.titel}`;
// Eerste keus: een Bonneblad (1:25.000, nauwkeurig geplaatst), anders de oudste kaart.
export const eersteKeus = lijst => lijst.find(kaart => kaart.titel.startsWith('Bonneblad ')) ?? lijst[0];
