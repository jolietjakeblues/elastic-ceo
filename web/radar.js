// Kruislink naar RADAR (archeobotanische vindplaatsen, aparte dataset/service op
// archeobotanie/radar-elastic, zie C:\AI\RADAR): een vondstlocatie met hetzelfde
// archis2-waarnemingsnummer als een RADAR-site krijgt een regel met wat daar aan
// plantenresten is gevonden. Opzoeking op zoeknummer, geen owl:sameAs-koppeling
// in de brondata: een match is een sterke aanwijzing, geen garantie dat het
// exact hetzelfde object is. Zelfde opzet als de kruislink naar BoneInfo in app.js.
//
// De logica staat hier, zonder DOM, zodat tests/web.test.mjs hem kan testen.
import { values } from './search.js';

// Zet op true zodra de service "Radar" op archeobotanie/radar-elastic draait; tot die tijd
// doet de website geen verzoeken naar een endpoint dat nog niet bestaat.
export const RADAR_ACTIEF = true;
export const RADAR_ENDPOINT = 'https://api.linkeddata.cultureelerfgoed.nl/datasets/archeobotanie/radar-elastic/services/Radar/_search';
// Adres van een RADAR-zoeksite; die bestaat nog niet. Zolang dit null is, staat de sitenummer als tekst, zonder link.
export const RADAR_SITE = null;
// Veldnamen in de zoekprojectie (construct/radar.rq in C:\AI\RADAR): property-IRI met spaties in plaats van punten.
export const RR = 'https://linkeddata cultureelerfgoed nl/def/radar-elastic#';

const MAX_TAXA_GETOOND = 6;

// De waarnemingsnummers van de vondstlocaties op deze pagina. Sites waarvan RADAR het
// waarnemingsnummer als onzeker markeert ("ar?" in de bron) worden niet gekoppeld.
export function radarQuery(nummers) {
  return {
    size: 100,
    _source: ['waarnemingsnummer', 'siteNr', 'locatienaam', 'aantalSporen', 'aantalMonsters', 'aantalWaarnemingen', 'wetenschappelijkeNaam', 'plantnaam'].map(veld => RR + veld),
    query: { bool: { filter: [{ terms: { [`${RR}waarnemingsnummer.keyword`]: nummers } }], must_not: [{ term: { [`${RR}waarnemingsnummerOnzeker`]: true } }] } },
  };
}

// Samenvatting van één RADAR-document, zonder de ruwe veldnamen.
export function radarSite(source = {}) {
  const een = veld => values(source[RR + veld])[0];
  return {
    siteNr: een('siteNr'),
    nummer: een('waarnemingsnummer'),
    locatienaam: een('locatienaam'),
    waarnemingen: Number(een('aantalWaarnemingen')) || 0,
    taxa: values(source[RR + 'wetenschappelijkeNaam']),
    namen: values(source[RR + 'plantnaam']),
  };
}

// Per vondstlocatie (id) de RADAR-sites met hetzelfde waarnemingsnummer. targets: [{ id, nummers: [..] }].
export function radarMatches(targets, sources) {
  const sites = sources.map(radarSite);
  const per = new Map();
  for (const target of targets) {
    const gevonden = sites.filter(site => target.nummers.includes(site.nummer));
    if (gevonden.length) per.set(target.id, gevonden);
  }
  return per;
}

const getal = n => n.toLocaleString('nl-NL');
const meervoud = (n, een, meer) => `${getal(n)} ${n === 1 ? een : meer}`;

// De tekst bij de regel. Meerdere RADAR-sites met hetzelfde waarnemingsnummer komen samen (87 nummers
// horen bij meer dan één site). Een site zonder plantenwaarnemingen in de dataset krijgt geen aantallen:
// dat is niet hetzelfde als "geen planten gevonden".
export function radarTekst(sites) {
  const waarnemingen = sites.reduce((som, site) => som + site.waarnemingen, 0);
  const taxa = [...new Set(sites.flatMap(site => site.taxa))];
  if (!waarnemingen && !taxa.length) return '';
  const namen = [...new Set(sites.flatMap(site => site.namen))].sort((a, b) => a.localeCompare(b, 'nl'));
  // een groep in de bron staat met '|' ('Carex otrubae|Carex vulpina'); in de tekst als 'Carex otrubae / Carex vulpina'
  const getoond = (namen.length ? namen : taxa.slice().sort((a, b) => a.localeCompare(b, 'nl'))).slice(0, MAX_TAXA_GETOOND).map(naam => naam.replaceAll('|', ' / '));
  const rest = (namen.length || taxa.length) > MAX_TAXA_GETOOND;
  return `${meervoud(waarnemingen, 'plantenwaarneming', 'plantenwaarnemingen')}, ${meervoud(taxa.length, 'taxon', 'taxa')}: ${getoond.join(', ')}${rest ? ', …' : ''} `;
}

// Link naar een RADAR-site, of alleen een label zolang er geen RADAR-zoeksite is.
export const radarSiteUrl = siteNr => (RADAR_SITE && siteNr ? `${RADAR_SITE}?site=${encodeURIComponent(siteNr)}` : null);
