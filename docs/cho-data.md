# De dataset `rce/cho`: metingen en valkuilen

Gemeten op 19 oktober 2026. De dataset wordt dagelijks herladen; op die dag om 04:48.

## Endpoints

| Endpoint | Gebruik |
|---|---|
| `https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/sparql` | **Dit gebruiken.** Alle tests in dit experiment draaien hierop. |
| `https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/services/cho/sparql` | Virtuoso-service `cho` (time-out 58 s). Was op 19 oktober een tijd niet beschikbaar (`updating`). |

Stuur queries één voor één. Tien zware queries tegelijk vielen samen met *This service is not ready to handle the request*.

## Omvang

| | |
|---|---:|
| Triples | 59.472.780 |
| Graphs | 34 |
| Subjecten in `graph:instanties-rce` | 8.498.707 (geen blank nodes) |
| Verschillende predicaten | 416 |

Grootste graphs: `instanties-rce` (55,0 mln), `image` en `image-1` (elk 1,1 mln, dubbel), `tooi/…/corr-kadastrale-gemeentencode` (565.000), CHT-thesaurus (518.000), ABR-thesaurus (323.000), `punten` (316.000), `OmschrijvingenOnderwerp` (156.000), `owms` (52.000), `actorenrol` (45.000).

## Klassen in `instanties-rce`

Erfgoedobjecten (het subject in de projectie):

| Klasse | Aantal | URI |
|---|---:|---|
| `ceo:Rijksmonument` | 67.496 | `…/cho-kennis/id/rijksmonument/<CHOI>` |
| `ceo:Complex` | 2.834 | `…/id/complex/` |
| `ceo:Gezicht` | 472 | `…/id/gezicht/` |
| `ceo:Werelderfgoed` | 18 | `…/id/werelderfgoed/` (kern- en bufferzone apart) |
| `ceo:ArcheologischTerrein` | 13.025 | `…/id/archeologischterrein/` |
| `ceo:ArcheologischOnderzoeksgebied` | 113.562 | `…/id/archeologischonderzoeksgebied/` |
| `ceo:Vondstlocatie` | 111.885 | `…/id/vondstlocatie/` |
| `ceo:ArcheologischComplex` | 360.408 | `…/id/archeologischcomplex/` |
| `ceo:Grondsporen` | 92.697 | `…/id/grondsporen/` |
| `ceo:Vondsten` | 446.809 | `…/id/vondsten/` |

Alle URI's volgen `…/cho-kennis/id/<soort>/<nummer>`. De soort-normalizer uit `Erfgoed-sdo-nl3` (`^.*/id/([a-z]+)/.*$`) werkt dus voor alle tien.

Tussenknopen (gaan niet als eigen document in de projectie):

| Klasse | Aantal |
|---|---:|
| `ceo:Kennisregistratie` (alle subklassen samen) | 3.307.107 |
| `ceo:Gebeurtenis` | 929.507 |
| `ceo:Datering`, `ceo:BeginDatering`, `ceo:EindDatering` | elk 917.926 |
| `ceo:Type` | 908.087 |
| `ceo:Omschrijving` | 550.942 |
| `ceo:Materiaal` | 444.738 |
| `ceo:StijlEnCultuur` | 376.627 |
| `ceo:BAGRelatie` | 361.123 |
| `ceo:BasisregistratieRelatie` | 305.956 |
| `ceo:LocatieAanduiding` | 216.758 |
| `ceo:Geometrie` | 179.592 |
| `ceo:BRKRelatie` | 148.797 |
| `ceo:Functie` | 75.509 |
| `ceo:Naam` | 12.519 |
| `ceo:ActorEnRol` | 11.581 |
| `ceo:BouwkundigeKwaliteit` | 9.178 |

## Wat er per klasse op het object staat

Aantal objecten met de property (direct op het object):

| Property | RM | CX | GZ | WE | AT | OG | VL | AC | GS | VO |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `heeftBasisregistratieRelatie` | 67.496 | | | | 13.013 | 113.562 | 111.885 | | | |
| `heeftKennisregistratie` | 67.496 | 2.785 | 472 | 18 | 11.237 | 65.491 | 111.826 | 360.108 | 91.788 | 444.738 |
| `heeftOmschrijving` | 67.420 | 2.519 | | | 11.237 | 65.491 | 111.826 | 28.800 | 41.782 | 216.531 |
| `heeftGeometrie` | 65.786 | | 472 | 18 | | 113.316 | | | | |
| `heeftLocatieAanduiding` | 47.444 | | | | 12.653 | 42.354 | 104.090 | | | |
| `heeftNaam` | 9.327 | 2.702 | 472 | 18 | | | | | | |
| `heeftType` | 10.810 | | 472 | | | | | 360.108 | 91.788 | 444.738 |
| `heeftStijlEnCultuur` | 21.929 | | | | | | | | 44.749 | 308.009 |
| `heeftMateriaal` | | | | | | | | | | 444.738 |
| `heeftGebeurtenis` | 18.615 | | | | | | | 360.108 | 91.788 | 444.738 |
| `heeftOorspronkelijkeFunctie` | 67.488 | | | | | | | | | |
| `heeftHuidigeFunctie` | 5.393 | | | | | | | | | |
| `heeftBouwkundigeKwaliteit` | 9.178 | | | | | | | | | |
| `heeftVertrouwelijkAanduiding` | | | | | 11.211 | 113.562 | 110.023 | 17.616 | | |
| `ligtInObject` | | | | | 1.812 | | 40.306 | 359.779 | 92.697 | 446.809 |
| `bevatObject` | 1.457 | | | | 12.919 | 30.141 | 109.991 | | | |
| `isOnderdeelVanComplex` | 14.950 | | | | | | | | | |
| `heeftRijksmonument` | | 2.833 | | | | | | | | |

Verder per klasse: RM `heeftJuridischeStatus`, `heeftMonumentAard`, `heeftBebouwdeKomType`, `datumInschrijvingInMonumentenregister`, `kadasterdeel(nummer)`, `internationaalKenteken`, `isHoofdobjectVanComplex`. CX `complexnummer`, `heeftHoofdobject`. GZ `gezichtsnummer`, `heeftGezichtsstatus`, `bijzonderGebied`. WE `werelderfgoednummer`, `heeftWerelderfgoedstatus`. AT `archis2Monumentnummer`, `heeftArcheologischeWaardering`. OG `indicatieArcheologischeMonumentenKaartWaardig`. VL `heeftVerwerving`, `archis2Waarnemingsnummer`, `archis2Vondstmeldingsnummer`. AC `archis2Complexnummer`. GS `aantalGrondsporen`, `archis2Vondstnummer`. VO `aantalVondsten`, `heeftToestand`, `archis2Vondstnummer`.

## Tussenknopen: wat erop staat

| Knoop | Properties |
|---|---|
| Naam | `naam`, `huidigeNaam` (490×), `formeelStandpunt`, `heeftBetrekkingOp` |
| LocatieAanduiding | `locatienaam`, `locatieomschrijving` (8.613×), `heeftLocatieAanduidingStatus`, `kaartbladcode` |
| Functie | `heeftFunctieNaam`, `hoofdfunctie`, `kennisregistratieToelichting` (5.191×, bijv. "zomerhuis") |
| StijlEnCultuur | `heeftStijlEnCultuurNaam`, `heeftZuiverheid`; `formeelStandpunt` is `false` |
| Gebeurtenis | `heeftGebeurtenisNaam` (vervaardiging, verbouwing, restauratie, gebruik, niet bepaald), `heeftDatering`, `heeftActorEnRol` (11.581×) |
| Datering | `heeftBeginDatering`, `heeftEindDatering`, `heeftBetrouwbaarheid`, `heeftDateringsmethode` |
| Begin-/EindDatering | `heeftPeriode` (rn-begrip, ABR) of `datum` (`xsd:date`, 21.292×, monumenten) |
| ActorEnRol | `heeftActor`, `heeftRol`: in `instanties-rce` als **tekst** ("Cuypers, P.J. ; Noord-Brabant", "architect / bouwkundige / constructeur"); in graph `actorenrol` als URI |
| BouwkundigeKwaliteit | `heeftBouwkundigeStaat` |
| Geometrie | `geo:asWKT` (WGS84), `ceo:asWKT-RD`, `geometrienummer`, `heeftGeometrieStatus`, `heeftGeometrieKwaliteit`, `heeftHerkomst`, `heeftGeometrieType` (alleen werelderfgoed: `property` = kernzone, `bufferzone`) |

- Alle kennisregistraties (3.307.107) hebben `ceo:heeftBetrekkingOp` naar hun object.
- De Geometrie-knoop verwijst niet terug naar het object.
- Labels van rn-begrippen staan in `instanties-rce`, soms ook in een andere graph met `@nl` (bijv. "Kerk" en "Kerk"@nl in `bebouwdeomgeving`).
- Beelden: graph `image`, `edm:ProvidedCHO` met `edm:aggregatedCHO` naar het object, `foaf:depiction` (thumbnail), `edm:isShownAt`, `dc:rights`. RM 14948 heeft er 55. Graph `image-1` bevat hetzelfde.

## Valkuilen bij het queryen

- **YEAR() op `xsd:date`** geeft in Virtuoso niets terug. Gebruik `xsd:integer(SUBSTR(STR(?datum), 1, 4))`.
- **UNION-blokken** worden volgens SPARQL los uitgerekend. Een BIND in een blok op een variabele van buiten het blok (bijv. `?klasse`) is in dat blok leeg. Gebruik in een blok alleen de koppelvariabele (`?s`).
- **Gemeente- en provincielabels** (graph `owms`): zet pad en label in **één** OPTIONAL of blok. Los van elkaar matcht een lege variabele met alle ca. 4.700 labels in `owms`. In een eerdere query liep dat op tot 22 mln rijen en een time-out.
- **Graphs expliciet.** Alles komt uit `graph:instanties-rce`, behalve de hvdl-graphs (`gezicht_hvdl`, `werelderfgoed_hvdl`), `buitenplaatsen`, `owms`, `image` en de ABR-thesaurus.
- **Labels** staan soms dubbel, met en zonder `@nl`. Neem `STR()` van het label, dan valt het dubbele weg.
- **rn naar ABR:** een begrip `…/term/id/rn/2/<uuid>` is in ABR `…/term/id/abr/2/<uuid>`. Leg een berekende ABR-URI eerst vast met een gewone triple (`skos:prefLabel`) en gebruik pas daarna `skos:broader+`. Een broader-pad direct op een berekende URI, of `skos:broader*`, laat Virtuoso per object alle ABR-begrippen aflopen.
- **Een OPTIONAL met een lege koppelvariabele** matcht met alles. Laat elke OPTIONAL bij het object beginnen.
- **Kruisproducten:** meerdere meervoudige OPTIONALs in één patroon vermenigvuldigen de rijen. Zet elk meervoudig pad in een eigen UNION-blok.
- **Werelderfgoed:** status "werelderfgoed" is `rn:3dc4e152-8f8b-410d-9d5c-f12e65138dd9`. Kern- en bufferzone zijn aparte objecten; het zonetype staat bij de geometrie.
- **Juridische status rijksmonument** is `rn:b2d9a59a-fe1e-4552-9a05-3c2acddff864`, **beschermd gezicht** is `rn:fd968529-bf70-4afa-8564-7c6c2fcfcc54`, **archeologisch monument** (monumentaard) is `rn:b673c8c1-5d93-496d-8f9e-89133d579d77`.
