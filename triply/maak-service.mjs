// Maakt triply/elastic-service.json: de configuratie van de Elasticsearch-service op de projectie.
// Velden staan hier één keer, per type (zie docs/schema.md, kolom Elastic). De Nederlandse analyse
// komt uit triply/nl-analyse.json: die van Erfgoed-sdo-nl3, aangepast voor archeologie (docs/taalanalyse.md).
// Gebruik: node triply/maak-service.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const map = new URL('.', import.meta.url);
const analysis = JSON.parse(readFileSync(new URL('nl-analyse.json', map), 'utf8'));

// Veldnaam in Elastic: property-IRI met een spatie in plaats van elke punt
const CE = 'https://linkeddata cultureelerfgoed nl/def/ceo-elastic#';
const GEO = 'http://www opengis net/ont/geosparql#asWKT';
const SEEALSO = 'http://www w3 org/2000/01/rdf-schema#seeAlso';

// Tekst met Nederlandse analyse, plus .keyword (facetten, sorteren) en .exact (zonder taalverwerking).
// Dit is ook de dynamic template: een veld dat hieronder niet staat, krijgt deze mapping.
const TEKST = [
  'naam', 'locatienaam', 'locatieomschrijving', 'omschrijving', 'overigeOmschrijving', 'toelichting',
  'functie', 'hoofdfunctie', 'oorspronkelijkeFunctie', 'huidigeFunctie',
  'type', 'typegroep', 'materiaal', 'materiaalgroep', 'stijl', 'actor',
];

// Korte tekst: alleen kleine letters en accenten, plus .keyword. Adres, plaats en labels van begrippen;
// zonder taalverwerking, anders vindt "kerk" ook Lekkerkerk en de Kerkstraat.
const KORT = [
  'volledigAdres', 'openbareRuimte', 'huisnummer', 'huisletter', 'huisnummertoevoeging', 'postcode',
  'woonplaatsnaam', 'gemeente', 'provincie', 'kadastraleGemeente', 'sectie', 'perceelnummer',
  'kadasterdeel', 'kadasterdeelnummer', 'verblijfsobjectIdentificatie',
  'juridischeStatus', 'monumentAard', 'bebouwdeKomType', 'bouwkundigeStaat', 'gezichtsstatus',
  'werelderfgoedstatus', 'werelderfgoedType', 'zone', 'archeologischeWaardering', 'vertrouwelijk',
  'verwerving', 'toestand', 'gebeurtenis', 'beginperiode', 'eindperiode', 'rol',
];

// Nummers: korte tekst + .keyword + .getal (long), om op nummer te kunnen sorteren
const NUMMER = [
  'cultuurhistorischObjectnummer', 'rijksmonumentnummer', 'complexnummer', 'gezichtsnummer',
  'werelderfgoednummer', 'archis2Monumentnummer', 'archis2Waarnemingsnummer',
  'archis2Vondstmeldingsnummer', 'archis2Complexnummer', 'archis2Vondstnummer',
];

// URI's: alleen exact filteren (term, terms)
const URI = [
  'klasse',
  'heeftJuridischeStatus', 'heeftMonumentAard', 'heeftBebouwdeKomType', 'heeftGezichtsstatus',
  'heeftWerelderfgoedstatus', 'heeftArcheologischeWaardering', 'heeftVertrouwelijkAanduiding',
  'heeftToestand', 'heeftVerwerving', 'heeftFunctieNaam', 'heeftTypeNaam', 'heeftMateriaalNaam',
  'heeftStijlEnCultuurNaam', 'heeftGemeente', 'heeftProvincie', 'heeftVerblijfsobject',
  'heeftRijksmonument', 'heeftHoofdobject', 'isOnderdeelVanComplex', 'isHoofdobjectVanComplex',
  'ligtInObject', 'bevatObject', 'onderzoeksgebied', 'afbeelding',
];

const GETAL = ['beginjaar', 'eindjaar', 'aantalVondsten', 'aantalGrondsporen', 'aantalBeelden'];
const DATUM = ['registratiedatum', 'datumInschrijvingInMonumentenregister'];
const JANEE = ['internationaalKenteken', 'bijzonderGebied', 'buitenplaats', 'indicatieArcheologischeMonumentenKaartWaardig'];
const VLAK = ['geleendeGeometrie'];

const alle = [TEKST, KORT, NUMMER, URI, GETAL, DATUM, JANEE, VLAK].flat();
const dubbel = alle.filter((v, i) => alle.indexOf(v) !== i);
if (dubbel.length) throw new Error(`dubbel: ${dubbel}`);

const keyword = { type: 'keyword', ignore_above: 256 };
const tekst = {
  type: 'text', analyzer: 'nl_index', search_analyzer: 'nl_zoeken',
  fields: { keyword, exact: { type: 'text', analyzer: 'nl_exact' } },
};
// Functie en type: .keyword zonder de code van de oude functie-indeling ("Woonhuis(K)", "Boerderij (M1)" → "Woonhuis",
// "Boerderij"), zodat de facet die varianten samenvoegt. De tekst zelf blijft zoals in de bron.
const MET_FUNCTIECODE = ['functie', 'hoofdfunctie', 'oorspronkelijkeFunctie', 'huidigeFunctie', 'type', 'typegroep'];
const tekstZonderCode = { ...tekst, fields: { ...tekst.fields, keyword: { ...keyword, normalizer: 'zonder_functiecode' } } };
const kort = { type: 'text', analyzer: 'nl_exact', fields: { keyword } };
const nummer = { type: 'text', analyzer: 'nl_exact', fields: { keyword, getal: { type: 'long', ignore_malformed: true } } };
const uri = { type: 'keyword', ignore_above: 1024 };
const vlak = { type: 'geo_shape', ignore_malformed: true };

const velden = (namen, mapping) => Object.fromEntries(namen.map(n => [CE + n, mapping]));

const config = {
  type: 'elasticSearch',
  name: 'Erfgoed-ceo',
  config: {
    indexTemplates: [
      { name: 'ceo-elastic', index_patterns: 'index', composed_of: ['ceo-elastic-tekst', 'ceo-elastic-typen'] },
    ],
    componentTemplates: [
      {
        // alles wat een analyzer of normalizer gebruikt, staat bij de settings die ze definiëren
        // (een component template wordt los gevalideerd)
        name: 'ceo-elastic-tekst',
        template: {
          settings: { analysis },
          mappings: {
            dynamic_templates: [{ tekst_nl: { match_mapping_type: 'string', mapping: tekst } }],
            properties: {
              '@id': { type: 'text', fields: { keyword, soort: { type: 'keyword', normalizer: 'soort' } } },
              ...velden(TEKST, tekst),
              ...velden(MET_FUNCTIECODE, tekstZonderCode),
              ...velden(KORT, kort),
              ...velden(NUMMER, nummer),
            },
          },
        },
      },
      {
        name: 'ceo-elastic-typen',
        template: {
          mappings: {
            properties: {
              ...velden(URI, uri),
              [SEEALSO]: uri,
              ...velden(GETAL, { type: 'integer', ignore_malformed: true }),
              ...velden(DATUM, { type: 'date', format: 'strict_date_optional_time', ignore_malformed: true }),
              ...velden(JANEE, { type: 'boolean' }),
              ...velden(VLAK, vlak),
              [GEO]: vlak,
            },
          },
        },
      },
    ],
  },
};

const uit = new URL('elastic-service.json', map);
writeFileSync(uit, JSON.stringify(config, null, 2) + '\n');
console.log(`triply/elastic-service.json: ${alle.length + 3} velden ` +
  `(tekst ${TEKST.length}, kort ${KORT.length}, nummer ${NUMMER.length}, uri ${URI.length + 1}, ` +
  `getal ${GETAL.length}, datum ${DATUM.length}, ja/nee ${JANEE.length}, vlak ${VLAK.length + 1}, @id)`);
