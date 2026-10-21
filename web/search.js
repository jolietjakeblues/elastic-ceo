import { WKT_FIELD, GELEEND_FIELD } from './geo.js';
// Zoekprojectie van rce/cho (construct/alles.rq) in de Elasticsearch-service Erfgoed-ceo op rce/erfgoed.
export const ENDPOINT = 'https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/erfgoed/services/Erfgoed-ceo/_search';
export const PAGE_SIZE = 25;
export const MAX_WINDOW = 10000;
export const EXPORT_MAX = 1000;
const MAX_VALUES = 20;
export const BASE = 'https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/';
// Veldnaam in Elastic = property-IRI met een spatie in plaats van elke punt (zie docs/elastic-document.md).
const CE = 'https://linkeddata cultureelerfgoed nl/def/ceo-elastic#';
const NAMEN = [
  'naam', 'locatienaam', 'locatieomschrijving', 'omschrijving', 'overigeOmschrijving', 'toelichting',
  'functie', 'hoofdfunctie', 'oorspronkelijkeFunctie', 'huidigeFunctie', 'type', 'typegroep', 'materiaal', 'materiaalgroep', 'stijl', 'actor', 'rol',
  'volledigAdres', 'postcode', 'woonplaatsnaam', 'gemeente', 'provincie', 'kadastraleGemeente',
  'juridischeStatus', 'monumentAard', 'bouwkundigeStaat', 'gezichtsstatus', 'werelderfgoedstatus', 'werelderfgoedType', 'zone',
  'archeologischeWaardering', 'vertrouwelijk', 'verwerving', 'toestand', 'gebeurtenis', 'beginperiode', 'eindperiode',
  'beginjaar', 'eindjaar', 'aantalVondsten', 'aantalGrondsporen', 'aantalBeelden', 'afbeelding', 'buitenplaats', 'datumInschrijvingInMonumentenregister',
  'cultuurhistorischObjectnummer', 'rijksmonumentnummer', 'complexnummer', 'gezichtsnummer', 'werelderfgoednummer',
  'archis2Monumentnummer', 'archis2Waarnemingsnummer', 'archis2Vondstmeldingsnummer', 'archis2Complexnummer', 'archis2Vondstnummer',
  'ligtInObject', 'bevatObject', 'heeftRijksmonument', 'heeftHoofdobject', 'isOnderdeelVanComplex', 'onderzoeksgebied',
];
export const fields = { ...Object.fromEntries(NAMEN.map(naam => [naam, CE + naam])), seeAlso: 'http://www w3 org/2000/01/rdf-schema#seeAlso' };

// De soort staat in de URI: …/id/rijksmonument/…, …/id/vondsten/… enzovoort.
export const soorten = {
  rijksmonument: 'Rijksmonument', complex: 'Complex', gezicht: 'Gezicht', werelderfgoed: 'Werelderfgoed',
  archeologischterrein: 'Archeologisch terrein', archeologischonderzoeksgebied: 'Onderzoeksgebied', vondstlocatie: 'Vondstlocatie',
  archeologischcomplex: 'Archeologisch complex', grondsporen: 'Grondspoor', vondsten: 'Vondst',
};
export const soortVan = uri => /\/id\/([a-z]+)\//.exec(String(uri ?? ''))?.[1] ?? null;
// @id.soort is een keyword-subveld uit de index template (normalizer soort).
const SOORT_FIELD = '@id.soort';
const soortClause = soort => ({ term: { [SOORT_FIELD]: soort } });
// Het nummer dat bij een soort hoort; archeologische objecten hebben alleen het CHO-nummer (= het getal in de URI).
export const nummerVeld = { rijksmonument: 'rijksmonumentnummer', complex: 'complexnummer', gezicht: 'gezichtsnummer', werelderfgoed: 'werelderfgoednummer' };
const NUMMERS = ['cultuurhistorischObjectnummer', 'rijksmonumentnummer', 'complexnummer', 'gezichtsnummer', 'werelderfgoednummer', 'archis2Monumentnummer', 'archis2Waarnemingsnummer', 'archis2Vondstmeldingsnummer', 'archis2Complexnummer', 'archis2Vondstnummer'];
export const nummerVan = source => {
  const soort = soortVan(source?.['@id']);
  return values(source?.[fields[nummerVeld[soort] ?? 'cultuurhistorischObjectnummer']])[0] ?? /\/(\d+)$/.exec(source?.['@id'] ?? '')?.[1] ?? null;
};

// Zoekvelden. TEKST heeft Nederlandse taalverwerking (en .exact), KORT alleen kleine letters en accenten.
const TEKST = ['naam', 'locatienaam', 'locatieomschrijving', 'omschrijving', 'overigeOmschrijving', 'toelichting', 'functie', 'hoofdfunctie', 'oorspronkelijkeFunctie', 'huidigeFunctie', 'type', 'typegroep', 'materiaal', 'materiaalgroep', 'stijl', 'actor'];
const KORT = ['volledigAdres', 'postcode', 'woonplaatsnaam', 'gemeente', 'provincie', 'kadastraleGemeente', 'juridischeStatus', 'monumentAard', 'archeologischeWaardering', 'gebeurtenis', 'beginperiode', 'eindperiode', 'werelderfgoedType', 'rol', 'verwerving', 'toestand'];
const veld = list => list.map(naam => fields[naam]);
export const searchFields = {
  Alles: veld([...TEKST, ...KORT, ...NUMMERS]),
  Omschrijving: veld(['omschrijving', 'overigeOmschrijving', 'toelichting', 'locatieomschrijving']),
  Naam: veld(['naam', 'locatienaam']),
  Adres: veld(['volledigAdres', 'postcode']),
  Plaats: veld(['woonplaatsnaam', 'gemeente', 'provincie', 'kadastraleGemeente']),
  'Type en functie': veld(['type', 'typegroep', 'functie', 'hoofdfunctie', 'oorspronkelijkeFunctie', 'huidigeFunctie']),
  Materiaal: veld(['materiaal', 'materiaalgroep']),
  'Periode en stijl': veld(['beginperiode', 'eindperiode', 'stijl']),
  Maker: veld(['actor', 'rol']),
  Nummer: veld(NUMMERS),
  // Zonder stemming, samenstellingen en synoniemen (subveld .exact; de korte velden zijn al exact).
  Exact: [...veld(TEKST).map(key => `${key}.exact`), ...veld([...KORT, ...NUMMERS])],
};
export const DEFAULT_FIELD = 'Alles';
// Weging voor de volgorde: een treffer in naam, type of functie telt WEIGHT keer zo zwaar. Alleen bij Alles en Exact;
// het verandert alleen de volgorde, nooit welke of hoeveel objecten gevonden worden.
export const WEIGHT = 3;
const WEIGHTED = veld(['naam', 'locatienaam', 'type', 'functie', 'hoofdfunctie']);
const weighted = key => WEIGHTED.some(base => key === base || key === `${base}.exact`);
export function queryFields(field) {
  return field === 'Alles' || field === 'Exact' ? searchFields[field].map(key => (weighted(key) ? `${key}^${WEIGHT}` : key)) : searchFields[field];
}

export const facets = { soort: 'Soort', provincie: 'Provincie', gemeente: 'Gemeente', juridischeStatus: 'Juridische status', functie: 'Functie', type: 'Type', materiaal: 'Materiaal', beginperiode: 'Periode (begin)', vertrouwelijk: 'Vertrouwelijkheid' };
const facetField = key => (key === 'soort' ? SOORT_FIELD : `${fields[key]}.keyword`);

const getal = key => ({ [`${fields[key]}.getal`]: { order: 'asc', missing: '_last' } });
export const sorts = {
  relevantie: { label: 'Relevantie', sort: null },
  naam: { label: 'Naam (A–Z)', sort: [{ [`${fields.naam}.keyword`]: { order: 'asc', missing: '_last' } }, { [`${fields.locatienaam}.keyword`]: { order: 'asc', missing: '_last' } }, '_score'] },
  plaats: { label: 'Plaats (A–Z)', sort: [{ [`${fields.woonplaatsnaam}.keyword`]: { order: 'asc', missing: '_last' } }, { [`${fields.gemeente}.keyword`]: { order: 'asc', missing: '_last' } }] },
  soort: { label: 'Soort', sort: [{ '@id.keyword': { order: 'asc' } }] },
  nummer: { label: 'Nummer', sort: ['rijksmonumentnummer', 'complexnummer', 'gezichtsnummer', 'werelderfgoednummer', 'cultuurhistorischObjectnummer'].map(getal) },
  oudste: { label: 'Oudste eerst (beginjaar)', sort: [{ [fields.beginjaar]: { order: 'asc', missing: '_last' } }] },
  jongste: { label: 'Jongste eerst (eindjaar)', sort: [{ [fields.eindjaar]: { order: 'desc', missing: '_last' } }] },
};

// Periode [van, tot]; jaren voor Christus zijn negatief. Twee manieren (modus), zoals in de archeologiedemo:
//   overlapt: de datering valt er (deels) in: een eindjaar >= van en een beginjaar <= tot;
//   binnen:   de datering valt er helemaal in: geen beginjaar < van en geen eindjaar > tot (en wel gedateerd).
// Een monument kan meerdere begin- en eindjaren hebben (bouw, verbouwing, restauratie). Bij "helemaal" moeten ze
// er dus allemaal in vallen; bij "deels" is één genoeg.
const JAAR = /^-?\d{1,6}$/;
export const JAARMODI = { overlapt: '(deels)', binnen: 'helemaal' };
export function jaarClauses({ van = null, tot = null, modus = 'overlapt' } = {}) {
  if (van == null && tot == null) return [];
  if (modus === 'binnen') return [{ bool: { filter: [{ exists: { field: fields.beginjaar } }], must_not: [...(van != null ? [{ range: { [fields.beginjaar]: { lt: van } } }] : []), ...(tot != null ? [{ range: { [fields.eindjaar]: { gt: tot } } }] : [])] } }];
  return [...(van != null ? [{ range: { [fields.eindjaar]: { gte: van } } }] : []), ...(tot != null ? [{ range: { [fields.beginjaar]: { lte: tot } } }] : [])];
}

// "Binnen": een context voor de zoekactie.
//   gezicht:1325, werelderfgoed:818, bufferzone:818   ruimtelijk: wat binnen het vlak valt (geo_shape within)
//   complex:524444                                    de onderdelen (heeftRijksmonument)
//   in:archeologischonderzoeksgebied:2038045           wat erin ligt (ligtInObject of onderzoeksgebied), op alle niveaus
//   rond:rijksmonument:36075:500                      alles binnen 500 m van een object (geo_distance)
export const AFSTANDEN = [100, 250, 500, 1000, 2000];
export const IN_SOORTEN = ['rijksmonument', 'archeologischterrein', 'archeologischonderzoeksgebied', 'vondstlocatie'];
export const ROND_SOORTEN = ['rijksmonument', 'complex', 'gezicht', 'werelderfgoed', 'archeologischonderzoeksgebied'];
export const BINNEN = new RegExp(`^((gezicht|werelderfgoed|bufferzone|complex):\\d{1,9}|in:(${IN_SOORTEN.join('|')}):\\d{1,10}|rond:(${ROND_SOORTEN.join('|')}):\\d{1,10}:(100|250|500|1000|2000))$`);
const notItself = uri => [{ term: { '@id.keyword': uri } }];
// Ook de geleende geometrie telt mee (vondstlocaties met het vlak van hun onderzoeksgebied, terreinen met dat van hun monument).
const beideVelden = make => ({ bool: { should: [make(WKT_FIELD), make(GELEEND_FIELD)], minimum_should_match: 1 } });
export const withinClause = (wkt, uri) => ({ bool: { filter: [beideVelden(field => ({ geo_shape: { [field]: { shape: wkt, relation: 'within' } } }))], must_not: notItself(uri) } });
export const nearClause = ({ lat, lon }, meters, uri) => ({ bool: { filter: [beideVelden(field => ({ geo_distance: { distance: `${meters}m`, [field]: { lat, lon } } }))], must_not: notItself(uri) } });
export const partsClause = uris => ({ terms: { '@id.keyword': uris.length ? uris : ['-'] } });
export const inhoudClause = uri => ({ bool: { should: [{ term: { [fields.ligtInObject]: uri } }, { term: { [fields.onderzoeksgebied]: uri } }], minimum_should_match: 1, must_not: notItself(uri) } });
// Een object opzoeken met zijn soort en nummer. werelderfgoed = de kernzone, bufferzone = de bufferzone.
export function lookupQuery(soort, nummer) {
  const echt = soort === 'bufferzone' ? 'werelderfgoed' : soort;
  const zone = { term: { [`${fields.zone}.keyword`]: 'bufferzone' } };
  return {
    size: 1, _source: ['@id', fields.naam, fields.locatienaam, fields.zone, fields.heeftRijksmonument, ...veld(NUMMERS), WKT_FIELD, GELEEND_FIELD],
    query: { bool: {
      filter: [soortClause(echt), { term: { [`${fields[nummerVeld[echt] ?? 'cultuurhistorischObjectnummer']}.keyword`]: nummer } }, ...(soort === 'bufferzone' ? [zone] : [])],
      must_not: soort === 'werelderfgoed' ? [zone] : [],
    } },
  };
}
// De gezichten en werelderfgoederen (zonder vlakken) voor de keuzelijst.
export const gebiedenListQuery = () => ({
  size: 600, _source: ['@id', fields.naam, fields.gezichtsnummer, fields.werelderfgoednummer, fields.zone, fields.gezichtsstatus],
  query: { bool: { should: [soortClause('gezicht'), soortClause('werelderfgoed')], minimum_should_match: 1 } },
  sort: [{ [`${fields.naam}.keyword`]: { order: 'asc', missing: '_last' } }],
});
// In welke gezichten en werelderfgoederen liggen deze objecten? Eén request met per object een benoemde
// geo_shape-query (het gebied bevat het object); matched_queries zegt welk gebied bij welk object hoort.
export const ligtInQuery = items => ({
  size: 200, _source: ['@id', fields.naam, fields.gezichtsnummer, fields.werelderfgoednummer, fields.zone],
  query: { bool: {
    filter: [{ bool: { should: [soortClause('gezicht'), soortClause('werelderfgoed')], minimum_should_match: 1 } }],
    should: items.map(({ name, wkt }) => ({ geo_shape: { [WKT_FIELD]: { shape: wkt, relation: 'contains' }, _name: name } })),
    minimum_should_match: 1,
  } },
});
// Namen en nummers van de objecten waarnaar de resultaten op deze pagina verwijzen, in één request.
export const buildRelationQuery = uris => ({
  size: Math.max(1, uris.length), timeout: '15s', _source: ['@id', fields.naam, fields.locatienaam, fields.type, fields.hoofdfunctie, ...veld(NUMMERS)],
  query: { terms: { '@id.keyword': uris.length ? uris : ['-'] } },
});

// Filters zijn { facet: [waarden] }: binnen één facet OF, tussen facetten EN. De periode geldt altijd.
const clauseFor = (key, list) => ({ terms: { [facetField(key)]: list } });
const filterClauses = (filters, jaar, skip) => [...Object.entries(filters).filter(([key, list]) => key !== skip && list.length).map(([key, list]) => clauseFor(key, list)), ...jaarClauses(jaar)];
function validate({ query = '', field = DEFAULT_FIELD, filters = {}, jaar = {}, page = 0, sort = 'relevantie', jokers = false, binnen = null }, context) {
  if (!Object.hasOwn(searchFields, field)) throw new Error('Onbekend zoekveld.');
  if (!Object.hasOwn(sorts, sort)) throw new Error('Onbekende sortering.');
  if (!Number.isInteger(page) || page < 0 || (page + 1) * PAGE_SIZE > MAX_WINDOW) throw new Error('Verfijn je zoekvraag om meer resultaten te bekijken.');
  if (typeof query !== 'string' || query.length > 500) throw new Error('Gebruik maximaal 500 tekens in je zoekvraag.');
  if (binnen != null && (!BINNEN.test(binnen) || !context?.clause)) throw new Error('Onbekend gebied of object.');
  for (const key of ['van', 'tot']) if (jaar?.[key] != null && !(Number.isInteger(jaar[key]) && JAAR.test(String(jaar[key])))) throw new Error('Gebruik hele jaartallen; jaren voor Christus met een min (bijv. -500).');
  if (jaar?.modus != null && !Object.hasOwn(JAARMODI, jaar.modus)) throw new Error('Onbekende manier van dateren.');
  if (jaar?.van != null && jaar?.tot != null && jaar.van > jaar.tot) throw new Error('Het jaartal bij Van moet vóór het jaartal bij tot liggen.');
  const clean = {};
  for (const [key, value] of Object.entries(filters)) {
    const list = Array.isArray(value) ? value : [value];
    if (!Object.hasOwn(facets, key) || list.length > MAX_VALUES || !list.every(item => typeof item === 'string' && item.length <= 300)) throw new Error('Ongeldig filter.');
    if (key === 'soort' && !list.every(item => Object.hasOwn(soorten, item))) throw new Error('Ongeldig filter.');
    if (list.length) clean[key] = [...new Set(list)];
  }
  const text = query.trim() ? { query_string: { query: veiligeZoekvraag(query.trim()), fields: queryFields(field), allow_leading_wildcard: jokers === true } } : { match_all: {} };
  const search = binnen ? { bool: { must: [text], filter: [context.clause] } } : text;
  return { search, filters: clean, jaar: { van: jaar?.van ?? null, tot: jaar?.tot ?? null, modus: jaar?.modus ?? 'overlapt' }, field, page, sort };
}
const facetAggs = (filters, jaar) => Object.fromEntries(Object.keys(facets).map(key => [key, {
  filter: { bool: { filter: filterClauses(filters, jaar, key) } },
  aggs: { values: key === 'soort' ? { terms: { field: SOORT_FIELD, size: 20 } } : { terms: { field: facetField(key), size: 100, show_term_doc_count_error: true } } },
}]));
// Zoeken (query) en filteren (post_filter) blijven gescheiden. Elke facet telt met de filters van de andere facetten,
// zodat je binnen een facet meerdere waarden kunt aanvinken. context = { clause } voor "binnen"; die beperkt ook de facetten.
export function buildQuery(state = {}, context) {
  const { search, filters, jaar, field, page, sort } = validate(state, context);
  return {
    from: page * PAGE_SIZE, size: PAGE_SIZE, track_total_hits: true, timeout: '15s',
    query: search,
    post_filter: { bool: { filter: filterClauses(filters, jaar) } },
    ...(sorts[sort].sort ? { sort: sorts[sort].sort } : {}),
    highlight: { fields: Object.fromEntries(searchFields[field].map(key => [key, { fragment_size: 275, number_of_fragments: 3 }])), pre_tags: ['<mark>'], post_tags: ['</mark>'], encoder: 'html' },
    aggs: facetAggs(filters, jaar),
  };
}
export function bucketsOf(aggregation) {
  const v = aggregation?.values;
  return v && Array.isArray(v.buckets) ? v : null;
}
// Export: dezelfde zoekvraag, filters en sortering, maximaal EXPORT_MAX resultaten, zonder geometrie, facetten en highlights.
const CSV_KOLOMMEN = [['Soort', 'soort'], ['Nummer', 'nummer'], ['Naam', 'naam'], ['Adres', 'volledigAdres'], ['Plaats', 'woonplaatsnaam'], ['Gemeente', 'gemeente'], ['Provincie', 'provincie'], ['Functie', 'functie'], ['Type', 'type'], ['Materiaal', 'materiaal'], ['Beginperiode', 'beginperiode'], ['Eindperiode', 'eindperiode'], ['Beginjaar', 'beginjaar'], ['Eindjaar', 'eindjaar'], ['Juridische status', 'juridischeStatus'], ['Vertrouwelijkheid', 'vertrouwelijk'], ['Linked Data', '@id'], ['Register', 'seeAlso'], ['Omschrijving', 'omschrijving']];
export function buildExportQuery(state = {}, context) {
  const { search, filters, jaar, sort } = validate({ ...state, page: 0 }, context);
  return {
    from: 0, size: EXPORT_MAX, track_total_hits: true, timeout: '20s',
    _source: ['@id', ...veld(NUMMERS), ...CSV_KOLOMMEN.map(([, key]) => fields[key]).filter(Boolean)],
    query: { bool: { must: [search], filter: filterClauses(filters, jaar) } },
    ...(sorts[sort].sort ? { sort: sorts[sort].sort } : {}),
  };
}
export const values = value => (Array.isArray(value) ? value : value == null ? [] : [value]).filter(item => typeof item === 'string' || typeof item === 'number').map(String);
export const textValue = value => values(value).join(', ');
// Code van de oude functie-indeling achter functie en type ("Woonhuis(K)", "Boerderij (M1)", "Kazemat (B10)").
// Dezelfde regel als de normalizer zonder_functiecode in de index (triply/nl-analyse.json); "Lunet(te)" en
// "aardewerk:onbepaald (ROM)" blijven staan.
export const FUNCTIECODE = /\s*\((?:[A-Z]{1,2}[0-9]{0,2}|T[A-Z]{2}[0-9]?)\)\s*$/;
export const MET_FUNCTIECODE = ['functie', 'hoofdfunctie', 'oorspronkelijkeFunctie', 'huidigeFunctie', 'type', 'typegroep'];
export const zonderFunctiecode = value => [...new Set(values(value).map(text => String(text).replace(FUNCTIECODE, '')))];
export function safeUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
// Bronlinks: alleen de bekende registers. Afbeeldingen: alleen de beeldbank.
const registers = { 'monumentenregister.cultureelerfgoed.nl': 'Monumentenregister', 'kennis.cultureelerfgoed.nl': 'Kennisbank RCE', 'whc.unesco.org': 'UNESCO' };
export function registerLink(value) {
  const url = safeUrl(value);
  return url && Object.hasOwn(registers, new URL(url).hostname) ? { label: registers[new URL(url).hostname], url } : null;
}
export const afbeeldingUrl = value => { const url = safeUrl(value); return url && new URL(url).hostname === 'images.memorix.nl' ? url : null; };

// Deelbare URL: ?q=…&veld=…&soort=…&provincie=…&van=…&tot=…&jaarmodus=binnen&binnen=…&sorteer=…&pagina=…
const params = { soort: 'soort', provincie: 'provincie', gemeente: 'gemeente', juridischeStatus: 'status', functie: 'functie', type: 'type', materiaal: 'materiaal', beginperiode: 'periode', vertrouwelijk: 'vertrouwelijk' };
export function toParams({ query = '', field = DEFAULT_FIELD, filters = {}, jaar = {}, page = 0, sort = 'relevantie', jokers = false, binnen = null }) {
  const result = new URLSearchParams();
  if (query.trim()) result.set('q', query.trim());
  if (field !== DEFAULT_FIELD) result.set('veld', field);
  if (binnen) result.set('binnen', binnen);
  for (const [key, list] of Object.entries(filters)) for (const value of list) result.append(params[key], value);
  if (jaar?.van != null) result.set('van', String(jaar.van));
  if (jaar?.tot != null) result.set('tot', String(jaar.tot));
  if ((jaar?.van != null || jaar?.tot != null) && jaar.modus === 'binnen') result.set('jaarmodus', 'binnen');
  if (sort !== 'relevantie') result.set('sorteer', sort);
  if (page > 0) result.set('pagina', String(page + 1));
  if (jokers) result.set('jokers', '1');
  return result;
}
export function fromParams(search) {
  const input = new URLSearchParams(search);
  const filters = {};
  for (const [key, name] of Object.entries(params)) {
    const list = input.getAll(name).filter(value => value && value.length <= 300 && (key !== 'soort' || Object.hasOwn(soorten, value))).slice(0, MAX_VALUES);
    if (list.length) filters[key] = list;
  }
  const jaar = {};
  for (const key of ['van', 'tot']) { const raw = input.get(key); if (raw && JAAR.test(raw)) jaar[key] = Number(raw); }
  if (jaar.van != null && jaar.tot != null && jaar.van > jaar.tot) { delete jaar.van; delete jaar.tot; }
  if ((jaar.van != null || jaar.tot != null) && input.get('jaarmodus') === 'binnen') jaar.modus = 'binnen';
  const page = Number.parseInt(input.get('pagina') ?? '1', 10);
  const binnen = input.get('binnen');
  const state = {
    query: (input.get('q') ?? '').slice(0, 500),
    field: Object.hasOwn(searchFields, input.get('veld')) ? input.get('veld') : DEFAULT_FIELD,
    filters, jaar,
    sort: Object.hasOwn(sorts, input.get('sorteer')) ? input.get('sorteer') : 'relevantie',
    // Verborgen testschakelaar: ?jokers=1 staat een jokerteken aan het begin toe (bijv. *molen). Niet in de interface.
    jokers: input.get('jokers') === '1',
    binnen: binnen && BINNEN.test(binnen) ? binnen : null,
    page: Number.isInteger(page) && page >= 1 && page * PAGE_SIZE <= MAX_WINDOW ? page - 1 : 0,
  };
  return { state, active: [...input.keys()].some(key => ['q', 'binnen', 'van', 'tot', ...Object.values(params)].includes(key)) };
}
// Uitleg van de zoekactie in gewone taal. binnenLabel is bijv. 'gezicht “Orvelte” (1325)'.
const fieldText = { Alles: 'in alle tekstvelden', Omschrijving: 'in de omschrijving', Naam: 'in de naam', Adres: 'in het adres', Plaats: 'in plaats, gemeente en provincie', 'Type en functie': 'in type en functie', Materiaal: 'in het materiaal', 'Periode en stijl': 'in periode en stijl', Maker: 'in maker en rol', Nummer: 'in de nummers', Exact: 'exact (zonder meervoud, samenstellingen en synoniemen)' };
const filterValue = (key, value) => `“${key === 'soort' ? soorten[value] ?? value : value}”`;
export const jaartal = jaar => (jaar < 0 ? `${-jaar} v.Chr.` : String(jaar));
export const jaarBereik = ({ van = null, tot = null } = {}) => (van != null && tot != null ? `${jaartal(van)} – ${jaartal(tot)}` : van != null ? `de periode vanaf ${jaartal(van)}` : `de periode tot ${jaartal(tot)}`);
export function describe({ query = '', field = DEFAULT_FIELD, filters = {}, jaar = {}, page = 0, sort = 'relevantie', jokers = false, binnen = null }, binnenLabel) {
  const lines = [];
  const trimmed = query.trim();
  if (!trimmed) lines.push(binnen ? 'Toont alles (geen zoekvraag).' : 'Toont alle objecten (geen zoekvraag).');
  else {
    const readable = trimmed.split(/("[^"]*"(?:~\d+)?)/).map((part, index) => (index % 2 ? part : part.replace(/\bAND\b|&&/g, 'én').replace(/\bOR\b|\|\|/g, 'of').replace(/\bNOT\b/g, 'niet'))).join('');
    lines.push(`Zoekt ${fieldText[field]} naar: ${readable}`);
    const words = trimmed.replace(/"[^"]*"(~\d+)?/g, ' x ').replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length > 1 && !words.some(word => /^(AND|OR|NOT|&&|\|\|)$/.test(word) || /^[+-]/.test(word))) lines.push('Zonder AND/OR/NOT is het genoeg als één van de woorden voorkomt.');
  }
  if (binnen) {
    const label = binnenLabel ?? binnen;
    lines.push(binnen.startsWith('complex:') ? `Alleen de onderdelen van ${label}.` : binnen.startsWith('rond:') ? `Alleen wat binnen ${label} ligt.` : binnen.startsWith('in:') ? `Alleen wat in ${label} ligt, op alle niveaus.` : `Alleen wat ligt in ${label}.`);
  }
  const active = Object.entries(filters).filter(([, list]) => list.length);
  if (active.length) lines.push(`Alleen objecten met ${active.map(([key, list]) => `${facets[key].toLowerCase()} ${list.map(value => filterValue(key, value)).join(' of ')}`).join(', en ')}.`);
  if (jaar?.van != null || jaar?.tot != null) lines.push(`Alleen objecten waarvan de datering ${JAARMODI[jaar.modus ?? 'overlapt']} valt in ${jaarBereik(jaar)}.`);
  if (jokers) lines.push('Testmodus: een jokerteken aan het begin (bijv. *molen) is toegestaan.');
  if (trimmed && sort === 'relevantie' && (field === 'Alles' || field === 'Exact')) lines.push(`Volgorde: een treffer in naam, type of functie telt ${WEIGHT}× zo zwaar als een treffer in de omschrijving of het adres. Dat verandert alleen de volgorde, niet het aantal.`);
  lines.push(`Gesorteerd op ${sort === 'relevantie' ? 'relevantie (best passend eerst)' : sorts[sort].label.charAt(0).toLowerCase() + sorts[sort].label.slice(1)}; resultaten ${page * PAGE_SIZE + 1} tot ${(page + 1) * PAGE_SIZE}.`);
  return lines;
}
// CSV met puntkomma (opent direct goed in Nederlandse Excel) en BOM voor UTF-8.
export function toCsv(hits, decode = text => text) {
  const cell = text => {
    const value = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text; // voorkom formule-injectie in spreadsheets
    return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };
  const get = (source, key) => {
    if (key === 'soort') return [soorten[soortVan(source['@id'])] ?? ''];
    if (key === 'nummer') return [nummerVan(source) ?? ''];
    if (MET_FUNCTIECODE.includes(key)) return zonderFunctiecode(source[fields[key]]);
    return values(source[key === '@id' ? '@id' : fields[key]]);
  };
  const rows = hits.map(hit => CSV_KOLOMMEN.map(([, key]) => cell(decode(get(hit._source ?? {}, key).join(' | ')))).join(';'));
  return `﻿${CSV_KOLOMMEN.map(([label]) => label).join(';')}\r\n${rows.join('\r\n')}\r\n`;
}
// Een schuine streep start in query_string een reguliere expressie (/.*a.*/), die de service zwaar kan belasten.
// Daarom wordt elke niet-geëscapete / een gewoon teken; "greppel/sloot" werkt dan ook.
export const veiligeZoekvraag = query => query.replace(/(?<!\\)\//g, '\\/');
export async function search(body, signal) {
  const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal, credentials: 'omit' });
  if (!response.ok) {
    const detail = await response.text();
    console.error('Elasticsearch', response.status, detail);
    if (response.status === 503 || /not ready/i.test(detail)) throw new Error('De zoekservice wordt op dit moment bijgewerkt. Probeer het over een paar minuten opnieuw.');
    if (response.status === 400 && /parsing_exception|parse_exception|query_shard_exception/.test(detail)) throw new Error('Controleer je zoeksyntax: gebruik bijvoorbeeld kasteel AND gracht en sluit quotes en haakjes.');
    if (response.status === 400 && /aggregat|fielddata/.test(detail)) throw new Error('De facetquery werkt niet. Probeer het later opnieuw.');
    throw new Error('De zoekservice kan je vraag nu niet verwerken. Probeer het opnieuw.');
  }
  const result = await response.json();
  if (result.timed_out || result._shards?.failed) throw new Error('De zoekservice gaf een onvolledig antwoord. Verfijn je zoekvraag en probeer opnieuw.');
  if (!result.hits || (body.aggs && !result.aggregations)) throw new Error('De zoekservice gaf geen volledige resultaten en facetten terug.');
  return result;
}
