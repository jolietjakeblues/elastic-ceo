# Het document in Elasticsearch

Hoe een object uit de projectie er in de Elastic-service uitziet, en wat de index template ervan moet maken.

De service bestaat nog niet. De JSON hieronder is opgebouwd uit de uitvoer van `construct/alles.rq` (19 oktober 2026), volgens dezelfde regels die de bestaande service `Archeologie-sdo-abr` laat zien:

```bash
node tests/elastic-document.mjs construct/alles.rq https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/rijksmonument/59284
```

## Hoe Triply een subject in Elastic zet

Zo doet de TriplyDB-Elasticsearch-service het, gecontroleerd aan `vondsten/10000096` in `Archeologie-sdo-abr`:

| RDF | Elastic |
|---|---|
| subject | één document; `_id` en `"@id"` zijn de URI |
| property-IRI | veldnaam, met een **spatie in plaats van elke punt**: `https://linkeddata.cultureelerfgoed.nl/def/ceo-elastic#naam` wordt `"https://linkeddata cultureelerfgoed nl/def/ceo-elastic#naam"` |
| waarde | altijd een **lijst**, ook bij één waarde |
| literal | de tekst zonder datatype en taal: `90`, `-12`, `1970-02-10` en `true` worden `"90"`, `"-12"`, `"1970-02-10"` en `"true"` |
| IRI als waarde | de URI als tekst; in de waarde blijven de punten staan |

Daaruit volgt: of een veld een getal, een datum of een vlak is, bepaalt **alleen de index template**. Zonder template maakt Elastic van alles `text` + `.keyword`. Dan werkt een `range` op `"-12"` als tekst, en komt "-12" na "1945".

## Rijksmonument 14948

Omschrijving en vlak zijn ingekort.

```json
{
  "_id": "https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/rijksmonument/59284",
  "_source": {
    "@id": "https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/rijksmonument/59284",
    "http://www opengis net/ont/geosparql#asWKT": ["MultiPolygon (((5.849337668182876 51.91972590566878, …)))"],
    "http://www w3 org/2000/01/rdf-schema#seeAlso": ["https://monumentenregister.cultureelerfgoed.nl/monumenten/14948"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#aantalBeelden": ["55"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#afbeelding": ["https://images.memorix.nl/rce/thumb/640x480/f28d6ff0-7152-9969-53d1-81f71707c88a.jpg"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#bebouwdeKomType": ["onbekend"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#cultuurhistorischObjectnummer": ["59284"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#datumInschrijvingInMonumentenregister": ["1970-02-10"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#functie": ["Kerk"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#gemeente": ["Overbetuwe"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#heeftBebouwdeKomType": ["https://data.cultureelerfgoed.nl/term/id/rn/2/a273be15-311e-4246-b99e-52c2efd97a77"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#heeftFunctieNaam": ["https://data.cultureelerfgoed.nl/term/id/rn/2/6fa5f251-cd84-4f3a-acb7-7c219df2540f"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#heeftGemeente": ["http://standaarden.overheid.nl/owms/terms/Overbetuwe"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#heeftJuridischeStatus": ["https://data.cultureelerfgoed.nl/term/id/rn/2/b2d9a59a-fe1e-4552-9a05-3c2acddff864"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#heeftMonumentAard": ["https://data.cultureelerfgoed.nl/term/id/rn/2/fc966a68-8863-4970-a83e-110f96006c21"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#heeftProvincie": ["http://standaarden.overheid.nl/owms/terms/Gelderland"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#heeftVerblijfsobject": ["http://bag.basisregistraties.overheid.nl/bag/id/verblijfsobject/1734010000027841"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#hoofdfunctie": ["Kerk"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#huisnummer": ["2"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#internationaalKenteken": ["true"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#juridischeStatus": ["rijksmonument"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#kadasterdeel": ["82970"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#kadasterdeelnummer": ["182"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#kadastraleGemeente": ["Elst"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#klasse": ["https://linkeddata.cultureelerfgoed.nl/def/ceo#Rijksmonument"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#monumentAard": ["onroerend gebouwd"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#omschrijving": ["Herv. Kerk. Bouwwerk in late Nederrijnse gotiek, …"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#oorspronkelijkeFunctie": ["Kerk"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#openbareRuimte": ["Grote Molenstraat"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#perceelnummer": ["542"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#postcode": ["6661DJ"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#provincie": ["Gelderland"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#registratiedatum": ["2021-11-25"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#rijksmonumentnummer": ["14948"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#sectie": ["K"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#verblijfsobjectIdentificatie": ["1734010000027841"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#volledigAdres": ["Grote Molenstraat 2"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#woonplaatsnaam": ["Elst"]
  }
}
```

## Vondst 10000096

```json
{
  "_id": "https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/vondsten/10000096",
  "_source": {
    "@id": "https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/vondsten/10000096",
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#aantalVondsten": ["90"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#beginjaar": ["-12"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#beginperiode": ["Romeinse Tijd"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#cultuurhistorischObjectnummer": ["10000096"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#eindjaar": ["1945"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#eindperiode": ["Nieuwe Tijd Laat"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#gebeurtenis": ["vervaardiging"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#heeftMateriaalNaam": ["https://data.cultureelerfgoed.nl/term/id/rn/2/6d7809db-db25-4c09-90c3-e455f61148a9"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#heeftToestand": ["https://data.cultureelerfgoed.nl/term/id/rn/2/33f1f4fe-77b8-41f0-81ed-39ec510a2712"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#heeftTypeNaam": ["https://data.cultureelerfgoed.nl/term/id/rn/2/7bcfc891-1148-49e9-b28c-c10c90b444f4"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#klasse": ["https://linkeddata.cultureelerfgoed.nl/def/ceo#Vondsten"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#ligtInObject": ["https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/vondstlocatie/6175458"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#materiaal": ["keramiek"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#materiaalgroep": ["anorganisch"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#onderzoeksgebied": ["https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/archeologischonderzoeksgebied/2038045"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#registratiedatum": ["2015-06-05"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#toestand": ["onbekend"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#type": ["vaatwerk"],
    "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#vertrouwelijk": ["openbaar"]
  }
}
```

Ter vergelijking: in `Archeologie-sdo-abr` heeft dezelfde vondst 14 velden, met schema.org-namen (`schema:name` "vaatwerk", `schema:material` "anorganisch", "keramiek", `schema:startDate` "-12"). In de projectie zijn het er 19, met materiaal en materiaalgroep apart, begin- en eindperiode apart, en de begrip-URI's erbij.

## De index template

De configuratie van de service staat in [`triply/elastic-service.json`](../triply/elastic-service.json). Bewerk dat bestand niet met de hand. Pas [`triply/maak-service.mjs`](../triply/maak-service.mjs) aan en maak het opnieuw:

```bash
node triply/maak-service.mjs
```

In het script staat elk veld één keer, in de lijst van zijn type. De Nederlandse analyse (analyzers `nl_index`, `nl_zoeken`, `nl_exact`, synoniemen, meervoudsregels, samenstellingen en de normalizer `soort`) komt uit [`triply/nl-analyse.json`](../triply/nl-analyse.json). Dat is de analyse van `Erfgoed-sdo-nl3`, aangepast voor archeologie (zie [taalanalyse.md](taalanalyse.md)). Er zitten Painless-scripts in (`condition`-filters); of TriplyDB die accepteert, blijkt bij het aanmaken van de service.

Elastic zet de strings bij het indexeren om naar het type uit de template.

| Type | Mapping | Velden (`…/ceo-elastic#…`) | Waarom |
|---|---|---|---|
| tekst (16) | `text` met `nl_index` / `nl_zoeken`, subvelden `.keyword` en `.exact` | `naam`, `locatienaam`, `locatieomschrijving`, `omschrijving`, `overigeOmschrijving`, `toelichting`, `functie`, `hoofdfunctie`, `oorspronkelijkeFunctie`, `huidigeFunctie`, `type`, `typegroep`, `materiaal`, `materiaalgroep`, `stijl`, `actor` | zoeken met taal; facetten en sorteren op `.keyword`; **Exact** op `.exact` |
| kort (31) | `text` met `nl_exact`, subveld `.keyword` | adres (`volledigAdres`, `openbareRuimte`, `huisnummer`, `huisletter`, `huisnummertoevoeging`, `postcode`, `woonplaatsnaam`), `gemeente`, `provincie`, kadaster (`kadastraleGemeente`, `sectie`, `perceelnummer`, `kadasterdeel`, `kadasterdeelnummer`), `verblijfsobjectIdentificatie` en de labels van begrippen (`juridischeStatus`, `monumentAard`, `bebouwdeKomType`, `bouwkundigeStaat`, `gezichtsstatus`, `werelderfgoedstatus`, `werelderfgoedType`, `zone`, `archeologischeWaardering`, `vertrouwelijk`, `verwerving`, `toestand`, `gebeurtenis`, `beginperiode`, `eindperiode`, `rol`) | zonder taalverwerking: anders vindt `kerk` ook Lekkerkerk en de Kerkstraat |
| nummer (10) | `text` met `nl_exact` + `.keyword` + `.getal` (`long`) | `cultuurhistorischObjectnummer`, `rijksmonumentnummer`, `complexnummer`, `gezichtsnummer`, `werelderfgoednummer`, `archis2Monumentnummer`, `archis2Waarnemingsnummer`, `archis2Vondstmeldingsnummer`, `archis2Complexnummer`, `archis2Vondstnummer` | zoeken als tekst, sorteren als getal |
| uri (26) | `keyword` (tot 1.024 tekens) | `klasse`, alle `heeft…` (18), `isOnderdeelVanComplex`, `isHoofdobjectVanComplex`, `ligtInObject`, `bevatObject`, `onderzoeksgebied`, `afbeelding`, en `rdfs:seeAlso` | exact filteren (`term`, `terms`); geen `.keyword`, het veld zelf is al keyword |
| getal (5) | `integer` | `beginjaar`, `eindjaar`, `aantalVondsten`, `aantalGrondsporen`, `aantalBeelden` | `range`, histogrammen; `"-12"` wordt -12 |
| datum (2) | `date` (`strict_date_optional_time`) | `registratiedatum`, `datumInschrijvingInMonumentenregister` | `range` op datum |
| ja/nee (4) | `boolean` | `internationaalKenteken`, `bijzonderGebied`, `buitenplaats`, `indicatieArcheologischeMonumentenKaartWaardig` | `"true"` wordt true |
| vlak (2) | `geo_shape`, `ignore_malformed` | `geo:asWKT`, `geleendeGeometrie` | ruimtelijk zoeken, zoals in `Erfgoed-sdo-nl3` |
| `@id` | `text` + `.keyword` + `.soort` | | soort uit de URI: `…/id/vondsten/…` wordt `vondsten` |

- **Onbekende velden** krijgen de mapping *tekst*, via een dynamic template. Komt er later een veld bij in de query, dan is het meteen doorzoekbaar. Voor een ander type moet het wel in het script.
- **Twee component templates.** `ceo-elastic-tekst` bevat de settings en alles wat een analyzer of normalizer gebruikt (tekst, kort, nummer, `@id`). Een component template wordt los gevalideerd, dus die mappings moeten bij de settings staan. `ceo-elastic-typen` bevat de rest.
- **Omvang:** 97 velden, met subvelden 182. Dat is ruim onder de standaardgrens van 1.000, dus `index.mapping.total_fields.limit` hoeft niet omhoog.
- **Gecontroleerd:** elk veld dat `construct/alles.rq` kan maken (94, plus `geo:asWKT`, `rdfs:seeAlso` en `@id`) staat in de template, en de template heeft geen velden die de query niet maakt. De 85 velden uit de uitvoer van 13 testobjecten zitten er allemaal in.
- **Lokaal getest** (19 oktober 2026) met de officiële image `docker.elastic.co/elasticsearch/elasticsearch:8.17.0`. De Triply-service accepteert `retriever`, dus daar draait 8.14 of nieuwer; welke versie precies is niet bekend. Uitkomst: zie [Lokaal testen](#lokaal-testen).

### Lokaal testen

Met [`tests/lokaal-elastic.mjs`](../tests/lokaal-elastic.mjs) laad je de templates zoals Triply ze krijgt in een lokale Elasticsearch. Het script indexeert 13 voorbeeldobjecten (alle tien soorten), omgezet zoals Triply dat doet, en controleert types en zoekvragen. Het verwijdert en maakt de index `index` in die lokale Elasticsearch opnieuw.

```bash
docker run -d --name ceo-elastic-test -p 127.0.0.1:9201:9200 -e discovery.type=single-node -e xpack.security.enabled=false -e ES_JAVA_OPTS="-Xms1g -Xmx1g" docker.elastic.co/elasticsearch/elasticsearch:8.17.0
```

```bash
node tests/lokaal-elastic.mjs
```

Opruimen:

```bash
docker rm -f ceo-elastic-test
```

De image is 2,0 GB. Weghalen met `docker rmi docker.elastic.co/elasticsearch/elasticsearch:8.17.0`.

Uitkomst op 19 oktober 2026: **alle 35 controles gelukt.**

| Controle | Uitkomst |
|---|---|
| component templates en index template | geaccepteerd (200) |
| 13 documenten indexeren | 0 fouten |
| types: tekst, keyword, integer, date, boolean, geo_shape; analyzers `nl_index`/`nl_zoeken`/`nl_exact` | zoals in de template |
| velden via de dynamic template | 0: alle 94 `ceo-elastic`-velden staan vast in de template |
| voorbeeldquery 1, kerken in Gelderland | RM 14948 |
| voorbeeldquery 2, Romeinse keramiek in onderzoeksgebied 2038045 | vondst 10000096 |
| `beginjaar < 0` | als getal: complex, grondspoor en vondst met −2000 en −12 |
| `@id.soort` | 10 soorten |
| `geo_distance` 50 m rond de kerk van Elst (op `geo_shape`) | alleen RM 14948 |
| `geleendeGeometrie` | terrein en vondstlocatie |
| "kerken" in functie | vindt "Kerk" (meervoud) |
| adres: "molen" / "molenstraat" | niet / wel "Grote Molenstraat 2": geen samenstellingen in adressen |
| `range` op inschrijvingsdatum, `term` op boolean | werkt |
| sorteren op `rijksmonumentnummer.getal` | als getal |
| facet op `gemeente.keyword` | werkt |

Wat opviel: bij lange omschrijvingen zet Elastic `omschrijving.keyword` en `overigeOmschrijving.keyword` in `_ignored`. Dat komt door `ignore_above: 256`, en het klopt zo: op een lange omschrijving facetteer je niet. Zoeken op `omschrijving` en `.exact` werkt gewoon.

De service aanmaken op de nieuwe dataset (naam nog kiezen) gaat met een token met *Management access*. Een leestoken geeft `Unauthorized`. In PowerShell:

```bash
curl.exe -H "Authorization: Bearer $env:TRIPLY_TOKEN" -H "Content-Type: application/json" -X POST "https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/<dataset>/services" -d "@triply/elastic-service.json"
```

TriplyDB leest de template alleen bij het aanmaken. Na een wijziging moet de service opnieuw worden aangemaakt.

Elk veld heeft een lange naam, maar in een query is dat alleen een string. Een voorkant zet de prefix er gewoon voor (`const CE = 'https://linkeddata cultureelerfgoed nl/def/ceo-elastic#'`).

## Voorbeeldqueries

Kerken in Gelderland, alleen rijksmonumenten:

```json
{
  "query": { "bool": {
    "must": [ { "query_string": {
      "query": "kerk",
      "fields": [ "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#functie^3",
                  "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#naam^3",
                  "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#omschrijving" ] } } ],
    "filter": [
      { "term": { "@id.soort": "rijksmonument" } },
      { "term": { "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#provincie.keyword": "Gelderland" } },
      { "term": { "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#juridischeStatus.keyword": "rijksmonument" } } ] } },
  "aggs": { "gemeente": { "terms": { "field": "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#gemeente.keyword" } } }
}
```

Keramiek uit de Romeinse tijd (overlap met −12 tot 450) in één onderzoeksgebied, alle niveaus:

```json
{
  "query": { "bool": { "filter": [
    { "term": { "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#materiaal.keyword": "keramiek" } },
    { "range": { "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#beginjaar": { "lte": 450 } } },
    { "range": { "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#eindjaar": { "gte": -12 } } },
    { "terms": { "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#onderzoeksgebied":
      [ "https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/archeologischonderzoeksgebied/2038045" ] } } ] } },
  "aggs": {
    "soort": { "terms": { "field": "@id.soort" } },
    "type":  { "terms": { "field": "https://linkeddata cultureelerfgoed nl/def/ceo-elastic#type.keyword" } } }
}
```

Let op bij meerdere gebeurtenissen: `beginjaar` en `eindjaar` zijn lijsten. Bij een `range` telt een document mee als **een** van de waarden past. Dat ze bij elkaar horen (1835–1938 en 1966–1966), weet Elastic niet (zie [achtergrond.md](achtergrond.md)).
