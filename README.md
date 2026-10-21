# Elastic op de CHO-kennisdata (experiment)

> **Dit is een experiment.** Bouw hier niets op. Query, velden en namen kunnen nog veranderen.

Hoe zet je Elasticsearch op de primaire RCE-dataset `rce/cho`, die naar de Cultureel Erfgoed Ontologie (CEO) is gemodelleerd, zonder de omweg via schema.org? De demo's [Erfgoed SDO/Elastic](https://erfgoed-sdo-elastic-demo.jolietjakeblues64.workers.dev/) (`erfgoed-sdo`, lokaal in `C:\AI\elastic-erfgoed`) en [elastic-archeologie](https://github.com/jolietjakeblues/elastic-archeologie) (`archeologie-sdo`) zetten CHO eerst om naar schema.org. Dit experiment doet het vanuit CEO, voor monumenten én archeologie in één index.

Kort:

- Een Elastic-service **rechtstreeks** op `rce/cho` werkt niet goed. Triply maakt één document per subject, en in CEO staat de tekst één tot vijf stappen van het object af (zie [docs/achtergrond.md](docs/achtergrond.md)).
- Daarom een **zoekprojectie**: één document per erfgoedobject, gebouwd met één CONSTRUCT op `rce/cho` en in een nieuwe dataset gezet. Daarop komt een Elastic-service.
- **Alle velden** staan in een eigen namespace, **`ceo-elastic:`**, zodat projectie en CEO niet door elkaar lopen. Een veld dat uit CEO komt, houdt de lokale naam van zijn CEO-property (`ceo:naam` → `ceo-elastic:naam`).
- Het gaat om **alle tien soorten**, zonder beperkingen: rijksmonumenten, complexen, gezichten, werelderfgoed, archeologische terreinen, onderzoeksgebieden, vondstlocaties, archeologische complexen, grondsporen en vondsten. Samen ca. 1,2 mln objecten.

## Status (19 oktober 2026)

| Onderdeel | Status |
|---|---|
| Velden per soort | uitgewerkt in [docs/schema.md](docs/schema.md) |
| CONSTRUCT | [construct/alles.rq](construct/alles.rq), getest op voorbeelden van alle tien soorten, op alle complexen en op alle archeologische terreinen |
| Volledige run (1,2 mln objecten) | in 16 losse query-jobs ([construct/delen/](construct/delen/)); als één job te traag (5% na 4 uur) |
| Nieuwe dataset en Elastic-service | nog niet aangemaakt |
| Index template | [triply/elastic-service.json](triply/elastic-service.json); dekt alle velden van de query; lokaal getest tegen Elasticsearch 8.17.0 (alle controles gelukt) |
| Voorkant | nog niet aangepast |

Wat nog openstaat: [docs/open-punten.md](docs/open-punten.md).

## Mappen

| Pad | Inhoud |
|---|---|
| [`construct/alles.rq`](construct/alles.rq) | De CONSTRUCT voor de hele projectie; hier pas je de query aan |
| [`construct/delen/`](construct/delen/) | Dezelfde query in 16 delen, elk als losse query-job in TriplyDB (gemaakt uit `alles.rq`) |
| [`construct/maak-delen.mjs`](construct/maak-delen.mjs) | Maakt de 16 delen uit `alles.rq` |
| [`triply/elastic-service.json`](triply/elastic-service.json) | Configuratie van de Elasticsearch-service (index template); niet met de hand bewerken |
| [`triply/maak-service.mjs`](triply/maak-service.mjs) | Maakt `elastic-service.json`: velden per type, Nederlandse analyse uit `nl-analyse.json` |
| [`triply/nl-analyse.json`](triply/nl-analyse.json) | Analyzers, filters en normalizer: die van `Erfgoed-sdo-nl3`, aangepast voor archeologie |
| [`triply/nl-analyse-nl3.json`](triply/nl-analyse-nl3.json) | Ongewijzigde kopie van de analyse in `Erfgoed-sdo-nl3`, alleen voor de vergelijking |
| [`docs/achtergrond.md`](docs/achtergrond.md) | Waarom een projectie, en niet Elastic rechtstreeks op `rce/cho`, schema.org of een eigen Elastic |
| [`docs/besluiten.md`](docs/besluiten.md) | Gemaakte keuzes, met de reden |
| [`docs/schema.md`](docs/schema.md) | Alle velden: bron in CEO, soorten, voorstel voor Elastic, hoe de query draait |
| [`docs/elastic-document.md`](docs/elastic-document.md) | Hoe een object er in Elastic uitziet (JSON), wat de index template ermee moet, voorbeeldqueries |
| [`docs/taalanalyse.md`](docs/taalanalyse.md) | Taalanalyse: wat er anders is dan in `Erfgoed-sdo-nl3` en waarom, met de vergelijking op een testcorpus |
| [`docs/voorbeeld-rm14948.md`](docs/voorbeeld-rm14948.md) | Eén monument uitgeschreven: van CEO naar document |
| [`docs/triply-jobs.md`](docs/triply-jobs.md) | Wat TriplyDB documenteert over query-jobs, flows en Elasticsearch-services, en wat dat betekent voor de projectie |
| [`docs/cho-data.md`](docs/cho-data.md) | Metingen aan `rce/cho` en valkuilen bij het queryen |
| [`docs/open-punten.md`](docs/open-punten.md) | Wat nog moet of nog besloten moet worden |
| [`tests/objecten.mjs`](tests/objecten.mjs) | Draait de query voor losse objecten en toont de velden per object |
| [`tests/elastic-document.mjs`](tests/elastic-document.mjs) | Draait de query voor losse objecten en toont het document zoals Triply het in Elastic zet |
| [`tests/lokaal-elastic.mjs`](tests/lokaal-elastic.mjs) | Laadt de template en 13 voorbeeldobjecten in een lokale Elasticsearch (Docker) en controleert types en zoekvragen |
| [`tests/documenten.mjs`](tests/documenten.mjs) | Gedeelde code: query draaien en omzetten zoals Triply dat doet |
| [`tests/corpus.mjs`](tests/corpus.mjs) | Bouwt een testcorpus van 23.490 objecten (NDJSON) voor de taalanalyse |
| [`tests/vergelijk-analyse.mjs`](tests/vergelijk-analyse.mjs) | Vergelijkt de nl3-analyse en de nieuwe op het corpus, in een lokale Elasticsearch |
| [`tests/schaal.mjs`](tests/schaal.mjs) | Draait de query voor alle objecten van één klasse: tijd, triples, velden |

## Testen

Vereist Node.js 18 of nieuwer, zonder npm-dependencies. Draai de commando's vanuit deze map. De scripts gebruiken het SPARQL-endpoint `https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/sparql`.

Losse objecten:

```bash
node tests/objecten.mjs construct/alles.rq https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/rijksmonument/59284
```

Het document zoals het in Elastic komt:

```bash
node tests/elastic-document.mjs construct/alles.rq https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/vondsten/10000096
```

Alle objecten van één klasse (de klassenaam zonder `ceo:`):

```bash
node tests/schaal.mjs construct/alles.rq Complex
```

De template testen tegen een lokale Elasticsearch: zie [docs/elastic-document.md](docs/elastic-document.md#lokaal-testen).

Stuur queries één voor één. Tien tegelijk viel samen met een moment waarop de service niet beschikbaar was (zie [docs/cho-data.md](docs/cho-data.md)).
