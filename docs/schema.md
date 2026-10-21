# Zoekprojectie ceo-elastic

Eén document per erfgoedobject uit `rce/cho`, voor een TriplyDB-Elasticsearch-service. Gebouwd met één CONSTRUCT: [`construct/alles.rq`](../construct/alles.rq).

- **Subject** is de cho-kennis-URI van het object. Er zijn geen tussenknopen (Naam, Omschrijving, Type, Datering, BAG-relatie): wat daar staat, komt op het object.
- **Alle velden in `ceo-elastic:`** (`https://linkeddata.cultureelerfgoed.nl/def/ceo-elastic#`). Er staat geen `ceo:`- of `ceox:`-property in de projectie, zodat projectie en CEO niet door elkaar lopen. Dit zijn zoekvelden, geen ontologie.
- **Een veld dat uit CEO komt, houdt de lokale naam van zijn CEO-property**, ook als die in CEO aan een tussenknoop hangt: `heeftNaam/ceo:naam` wordt `ceo-elastic:naam`, `…/heeftBAGRelatie/ceo:postcode` wordt `ceo-elastic:postcode`. In de query heten de velden nog naar CEO. Eén BIND aan het eind zet `ceo:` om naar `ceo-elastic:`.
- **Eigen namen** alleen voor labels van begrippen, velden die in CEO op twee plekken iets anders betekenen (`kadastraleGemeente`) en afgeleide waarden (`beginjaar`, `onderzoeksgebied`).
- **Waarden blijven CEO-URI's**: begrippen (rn, ABR, owms), objecten (cho-kennis) en de klasse. De klasse staat in `ceo-elastic:klasse` en niet in `rdf:type`, want het document is geen CEO-object.
- **Begrippen** staan twee keer: de URI met de CEO-naam (`ceo-elastic:heeftTypeNaam`; exact filteren, link naar ABR/CHT) en het label met een eigen naam (`ceo-elastic:type`; zoeken, facetten). Vuistregel: een veld dat met `heeft…` begint, bevat een URI.
- Standaardvocabulaires blijven: `geo:asWKT` (geometrie) en `rdfs:seeAlso` (links).
- Wat verloren gaat: welke waarden bij elkaar hoorden binnen een herhaalde registratie (functie A met datum x, functie B met datum y). Elastic kan dat met `nested`, maar de Triply-service maakt platte documenten per subject. De volledige structuur blijft in `rce/cho`, via de URI.

## Objecten

| Soort (URI `…/cho-kennis/id/<soort>/`) | Klasse | Aantal |
|---|---|---:|
| `rijksmonument` | `ceo:Rijksmonument` | 67.496 |
| `complex` | `ceo:Complex` | 2.834 |
| `gezicht` | `ceo:Gezicht` | 472 |
| `werelderfgoed` | `ceo:Werelderfgoed` (kern- en bufferzone apart) | 18 |
| `archeologischterrein` | `ceo:ArcheologischTerrein` | 13.025 |
| `archeologischonderzoeksgebied` | `ceo:ArcheologischOnderzoeksgebied` | 113.562 |
| `vondstlocatie` | `ceo:Vondstlocatie` | 111.885 |
| `archeologischcomplex` | `ceo:ArcheologischComplex` | 360.408 |
| `grondsporen` | `ceo:Grondsporen` | 92.697 |
| `vondsten` | `ceo:Vondsten` | 446.809 |
| | **totaal** | **1.209.206** |

Geen beperkingen: ook ex-rijksmonumenten, niet-beschermde gezichten, bufferzones en vertrouwelijke archeologie. Juridische status, gezichtsstatus, zone en vertrouwelijkheid zijn velden en kunnen dus een facet of filter in de zoekvraag zijn.

## Velden

Soorten: RM rijksmonument, CX complex, GZ gezicht, WE werelderfgoed, AT archeologisch terrein, OG onderzoeksgebied, VL vondstlocatie, AC archeologisch complex, GS grondsporen, VO vondsten.

Elastic: het type in de index template ([triply/elastic-service.json](../triply/elastic-service.json), zie [elastic-document.md](elastic-document.md#de-index-template)). `tekst` = `text` met Nederlandse analyse ([taalanalyse.md](taalanalyse.md)) + `.keyword` + `.exact`; `kort` = `text` met alleen kleine letters en accenten (adres, plaats) + `.keyword`; `uri` = `keyword`.

### Identificatie en soort

| Veld | Bron in CEO | Soorten | Elastic |
|---|---|---|---|
| `ceo-elastic:klasse` | `rdf:type` (een van de tien klassen, als waarde: `ceo:Rijksmonument` enz.) | alle | uri |
| `ceo-elastic:cultuurhistorischObjectnummer` | op het object | alle | kort + `long` |
| `ceo-elastic:rijksmonumentnummer`, `ceo-elastic:complexnummer`, `ceo-elastic:gezichtsnummer`, `ceo-elastic:werelderfgoednummer` | op het object | RM, CX, GZ, WE | kort + `long` |
| `ceo-elastic:archis2Monumentnummer`, `…Waarnemingsnummer`, `…Vondstmeldingsnummer`, `…Complexnummer`, `…Vondstnummer` | op het object | AT, VL, AC, GS, VO | kort + `long` |
| `ceo-elastic:registratiedatum` | op het object (niet die van de kennisregistraties) | alle | `date` |
| `ceo-elastic:datumInschrijvingInMonumentenregister` | op het object | RM | `date` |
| `rdfs:seeAlso` | Monumentenregister (berekend), Kennisbank (`gezicht_hvdl`), UNESCO (`werelderfgoed_hvdl`) | RM, CX, GZ, WE | uri |

### Naam en tekst

| Veld | Bron in CEO | Soorten | Elastic |
|---|---|---|---|
| `ceo-elastic:naam` | `heeftNaam/naam` | RM (9.327), CX, GZ, WE | tekst |
| `ceo-elastic:locatienaam` | `heeftLocatieAanduiding/locatienaam` | RM, AT, OG, VL | tekst |
| `ceo-elastic:locatieomschrijving` | `heeftLocatieAanduiding/locatieomschrijving` | RM, AT, OG, VL | tekst |
| `ceo-elastic:omschrijving` | `heeftOmschrijving/omschrijving` met `formeelStandpunt true` | alle | tekst |
| `ceo-elastic:overigeOmschrijving` | idem, niet formeel (bij archeologie bijna altijd) | alle | tekst |
| `ceo-elastic:toelichting` | `heeftKennisregistratie/kennisregistratieToelichting` (bijv. "zomerhuis") | vooral RM | tekst |

### Status en waardering

| Veld | Bron in CEO | Soorten | Elastic |
|---|---|---|---|
| `ceo-elastic:heeftJuridischeStatus` + `ceo-elastic:juridischeStatus` | op het object, label | RM | uri + kort |
| `ceo-elastic:heeftMonumentAard` + `ceo-elastic:monumentAard` | idem | RM | uri + kort |
| `ceo-elastic:heeftBebouwdeKomType` + `ceo-elastic:bebouwdeKomType` | idem | RM | uri + kort |
| `ceo-elastic:bouwkundigeStaat` | `heeftBouwkundigeKwaliteit/heeftBouwkundigeStaat`, label | RM (9.178) | kort |
| `ceo-elastic:internationaalKenteken` | op het object | RM | `boolean` |
| `ceo-elastic:heeftGezichtsstatus` + `ceo-elastic:gezichtsstatus` | op het object, label | GZ | uri + kort |
| `ceo-elastic:bijzonderGebied` | op het object | GZ | `boolean` |
| `ceo-elastic:heeftWerelderfgoedstatus` + `ceo-elastic:werelderfgoedstatus` | op het object, label | WE | uri + kort |
| `ceo-elastic:werelderfgoedType` | `heeftWerelderfgoedType` (`werelderfgoed_hvdl`), label | WE | kort |
| `ceo-elastic:zone` | `heeftGeometrie/heeftGeometrieType`, label ("kernzone", "bufferzone") | WE | kort |
| `ceo-elastic:heeftArcheologischeWaardering` + `ceo-elastic:archeologischeWaardering` | op het object, label | AT | uri + kort |
| `ceo-elastic:indicatieArcheologischeMonumentenKaartWaardig` | op het object | OG | `boolean` |
| `ceo-elastic:heeftVertrouwelijkAanduiding` + `ceo-elastic:vertrouwelijk` | op het object, label; bij VO, GS en AC ook die van het object waarin het ligt | AT, OG, VL, AC, GS, VO | uri + kort |
| `ceo-elastic:heeftVerwerving` + `ceo-elastic:verwerving` | op het object, label | VL | uri + kort |
| `ceo-elastic:heeftToestand` + `ceo-elastic:toestand` | op het object, label | VO | uri + kort |
| `ceo-elastic:buitenplaats` | `ceox:RCEBuitenplaats` (graph `buitenplaatsen`) | CX | `boolean` |

### Functie, type, materiaal, stijl

| Veld | Bron in CEO | Soorten | Elastic |
|---|---|---|---|
| `ceo-elastic:heeftFunctieNaam` | `heeftKennisregistratie` → `Functie/heeftFunctieNaam` | RM | uri |
| `ceo-elastic:functie` | idem, label | RM | tekst |
| `ceo-elastic:hoofdfunctie` | idem, met `hoofdfunctie true` | RM | tekst |
| `ceo-elastic:oorspronkelijkeFunctie`, `ceo-elastic:huidigeFunctie` | `heeftOorspronkelijkeFunctie`, `heeftHuidigeFunctie` → label | RM | tekst |
| `ceo-elastic:heeftTypeNaam` + `ceo-elastic:type` | `heeftType/heeftTypeNaam`; ABR-label, anders rn-label | RM (10.810), GZ, AC, GS, VO | uri + tekst |
| `ceo-elastic:typegroep` | bovenliggende ABR-begrippen van het type, zonder topconcept | AC, GS, VO | tekst |
| `ceo-elastic:heeftMateriaalNaam` + `ceo-elastic:materiaal` | `heeftMateriaal/heeftMateriaalNaam`; ABR-label | VO | uri + tekst |
| `ceo-elastic:materiaalgroep` | bovenliggende ABR-begrippen van het materiaal | VO | tekst |
| `ceo-elastic:heeftStijlEnCultuurNaam` + `ceo-elastic:stijl` | `heeftStijlEnCultuur/heeftStijlEnCultuurNaam`; ABR-, anders rn-label | RM, GS, VO | uri + tekst |

### Gebeurtenis en datering

| Veld | Bron in CEO | Soorten | Elastic |
|---|---|---|---|
| `ceo-elastic:gebeurtenis` | `heeftGebeurtenis/heeftGebeurtenisNaam`, label (vervaardiging, verbouwing, restauratie, gebruik) | RM, AC, GS, VO | kort |
| `ceo-elastic:beginperiode`, `ceo-elastic:eindperiode` | `heeftGebeurtenis/heeftDatering/heeftBegin-/EindDatering/heeftPeriode`, ABR-label | AC, GS, VO | kort |
| `ceo-elastic:beginjaar`, `ceo-elastic:eindjaar` | ABR-jaar van de periode (`rnce:beginYearAbr`, `rnce:endYearAbr`), of het jaar van `ceo:datum` (RM). Negatief = v. Chr. | RM, AC, GS, VO | `integer` |
| `ceo-elastic:actor`, `ceo-elastic:rol` | `heeftGebeurtenis/heeftActorEnRol/heeftActor`, `…/heeftRol` (tekst in `instanties-rce`) | RM | tekst (`actor`), kort (`rol`) |

Bij meerdere gebeurtenissen (bouw 1866, verbouwing 1920) staan alle jaren in hetzelfde veld. Welk jaar bij welke gebeurtenis hoort, blijft in `rce/cho`.

### Plaats

| Veld | Bron in CEO | Soorten | Elastic |
|---|---|---|---|
| `ceo-elastic:volledigAdres`, `ceo-elastic:openbareRuimte`, `ceo-elastic:huisnummer`, `ceo-elastic:huisletter`, `ceo-elastic:huisnummertoevoeging`, `ceo-elastic:postcode`, `ceo-elastic:woonplaatsnaam` | `heeftBasisregistratieRelatie/heeftBAGRelatie/…` | RM, AT, OG, VL | kort |
| `ceo-elastic:verblijfsobjectIdentificatie`, `ceo-elastic:heeftVerblijfsobject` | idem | RM | kort, uri |
| `ceo-elastic:heeftGemeente` + `ceo-elastic:gemeente` | `heeftBasisregistratieRelatie/heeftGemeente`, label uit `owms` | RM, OG, VL | uri + kort |
| `ceo-elastic:heeftProvincie` + `ceo-elastic:provincie` | `heeftBasisregistratieRelatie/heeftProvincie`, label uit `owms` | RM, OG, VL | uri + kort |
| `ceo-elastic:sectie`, `ceo-elastic:perceelnummer` | `heeftBasisregistratieRelatie/heeftBRKRelatie/…` | RM | kort |
| `ceo-elastic:kadastraleGemeente` | `…/heeftBRKRelatie/gemeentenaam`: de kadastrale gemeente, niet de gemeente (14948: Elst, gemeente Overbetuwe) | RM | kort |
| `ceo-elastic:kadasterdeel`, `ceo-elastic:kadasterdeelnummer` | op het object | RM | kort |
| `geo:asWKT` | `heeftGeometrie/geo:asWKT` (WGS84) | RM, GZ, WE, OG | `geo_shape` |
| `ceo-elastic:geleendeGeometrie` | geometrie van het object waarin het ligt: AT → rijksmonument, VL → onderzoeksgebied (het hele gebied, niet de vindplek) | AT (1.812), VL | `geo_shape` |

`ceo:asWKT-RD` gaat niet mee: Elastic zou RD-coördinaten als lengte- en breedtegraad lezen.

### Relaties

| Veld | Bron in CEO | Soorten | Elastic |
|---|---|---|---|
| `ceo-elastic:heeftRijksmonument`, `ceo-elastic:heeftHoofdobject` | op het complex | CX | uri |
| `ceo-elastic:isOnderdeelVanComplex`, `ceo-elastic:isHoofdobjectVanComplex` | op het monument | RM | uri |
| `ceo-elastic:ligtInObject` | op het object | AT, VL, AC, GS, VO | uri |
| `ceo-elastic:bevatObject` | op het object | RM, AT, OG, VL | uri |
| `ceo-elastic:onderzoeksgebied` | `ligtInObject` (vondstlocatie) `/ligtInObject` (onderzoeksgebied) | AC, GS, VO | uri |

Met `ceo-elastic:ligtInObject` en `ceo-elastic:onderzoeksgebied` is "alles in dit onderzoeksgebied" één `terms`-filter, over alle niveaus.

### Beelden

| Veld | Bron | Soorten | Elastic |
|---|---|---|---|
| `ceo-elastic:aantalBeelden` | aantal `edm:ProvidedCHO` met `edm:aggregatedCHO` → object (graph `image`) | RM | `integer` |
| `ceo-elastic:afbeelding` | één `foaf:depiction` daarvan | RM | uri |

## Niet opgenomen

Blijft in `rce/cho`, via de URI van het object:

- nummers en datums van kennisregistraties, `formeelStandpunt`, omschrijvingstype
- nummers van de BAG-, BRK- en basisregistratierelatie, `provinciecode`
- geometrienummer, herkomst, kwaliteit en status van de geometrie, `asWKT-RD`
- zuiverheid (stijl), betrouwbaarheid, dateringsmethode en nauwkeurigheid
- status van de locatieaanduiding, kaartbladcode
- de beelden zelf, behalve aantal en één afbeelding
- de thesauri (ABR, CHT) zelf; alleen labels en bovenliggende begrippen gaan mee

## Draaien

`construct/alles.rq` is één CONSTRUCT met een UNION-blok per veld. Elk blok volgt vanaf het object één pad, dus het aantal rijen groeit lineair met het aantal waarden en er ontstaan geen kruisproducten.

Gemeten op `https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/sparql` (19 oktober 2026):

| Objecten | Tijd | Triples |
|---|---:|---:|
| 10 voorbeelden (één per soort) | 0,9 s | ca. 150 |
| alle complexen (2.834) | 12 s | 37.706 |
| alle archeologische terreinen (13.025) | 46 s | 159.633 |

Dat is ongeveer 3,5 ms per object op het SPARQL-endpoint. Als één query-job voor alle 1,2 mln objecten werkt het niet. De job `rce/alles-ceo-elastic/2` stond op 19 oktober na ongeveer 4 uur op 5%, wat neerkomt op zo'n 80 uur in totaal. Ook de eerdere jobs voor `archeologie-sdo` liepen alleen goed in stukken van hooguit een paar honderdduizend objecten.

### In 16 delen

[`construct/delen/`](../construct/delen/) bevat dezelfde query in 16 delen, elk bedoeld als een losse query-job met dezelfde doeldataset. Alleen het blok *objecten* verschilt. Samen leveren de delen precies dezelfde triples als `alles.rq`.

| Deel | Objecten (19 oktober 2026) |
|---|---:|
| `01-rijksmonument.rq` | 67.496 |
| `02-complex-gezicht-werelderfgoed-terrein.rq` | 2.834 + 472 + 18 + 13.025 |
| `03-grondsporen.rq` | 92.697 |
| `04`–`05-archeologischonderzoeksgebied-1/2.rq` | 57.000 + 56.562 |
| `06`–`07-vondstlocatie-1/2.rq` | 56.000 + 55.885 |
| `08`–`11-archeologischcomplex-1…4.rq` | 4 × ca. 90.000 |
| `12`–`16-vondsten-1…5.rq` | 4 × 100.000 + 46.809 |
| **totaal** | **1.209.206** |

- **Afbakening op URI, niet met `OFFSET`.** De grote klassen zijn gesplitst met `FILTER(STR(?s) >= "…" && STR(?s) < "…")` in een subquery. Wordt `rce/cho` tussen twee jobs herladen, dan valt elk object nog steeds in precies één deel. Met `OFFSET` zou alles verschuiven, met dubbele en ontbrekende objecten tot gevolg. De grenzen zijn op 19 oktober gemeten. Groeit een klasse flink, dan worden de delen wat groter.
- **Gecontroleerd:** de aantallen per deel tellen per klasse precies op tot het totaal. Een smal stukje van deel 13 geeft dezelfde 84 triples als `alles.rq` voor dezelfde 4 vondsten. De vorm met subquery is even snel als de gewone vorm (complexen: 11,0 tegenover 11,2 s, met dezelfde 37.706 triples).
- **Niet als HTTP-query te testen:** deel 02 duurt langer dan de grens van ongeveer 58 seconden op het SPARQL-endpoint (504), vooral door de grote vlakken van gezichten en werelderfgoed. In een query-job geldt die grens niet.
- **Niet met de hand bewerken.** Pas `alles.rq` aan en maak de delen opnieuw:

```bash
node construct/maak-delen.mjs
```

De query is ook per veld te splitsen: laat dan alle UNION-blokken weg op één na.

Testen op losse objecten: vervang het blok *objecten* door `VALUES ?s { <uri> … }`. Dat doen de scripts in [`tests/`](../tests/) (Node.js 18 of nieuwer, vanuit de hoofdmap):

```bash
node tests/objecten.mjs construct/alles.rq https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/rijksmonument/59284
```

```bash
node tests/schaal.mjs construct/alles.rq Complex
```
