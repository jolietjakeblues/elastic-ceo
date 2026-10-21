# Elastic op de CHO-kennisdata (experiment)

> **Dit is een experiment.** Bouw hier niets op. Query, velden en namen kunnen nog veranderen.

Hoe zet je Elasticsearch op de primaire RCE-dataset `rce/cho`, die naar de Cultureel Erfgoed Ontologie (CEO) is gemodelleerd, zonder de omweg via schema.org? De demo's [Erfgoed SDO/Elastic](https://erfgoed-sdo-elastic-demo.jolietjakeblues64.workers.dev/) (`erfgoed-sdo`, lokaal in `C:\AI\elastic-erfgoed`) en [elastic-archeologie](https://github.com/jolietjakeblues/elastic-archeologie) (`archeologie-sdo`) zetten CHO eerst om naar schema.org. Dit experiment doet het vanuit CEO, voor monumenten én archeologie in één index.

Kort:

- Een Elastic-service **rechtstreeks** op `rce/cho` werkt niet goed. Triply maakt één document per subject, en in CEO staat de tekst één tot vijf stappen van het object af (zie [docs/achtergrond.md](docs/achtergrond.md)).
- Daarom een **zoekprojectie**: één document per erfgoedobject, gebouwd met CONSTRUCT-queries op `rce/cho` en in een eigen dataset gezet. Daarop komt een Elastic-service.
- **Alle velden** staan in een eigen namespace, **`ceo-elastic:`**, zodat projectie en CEO niet door elkaar lopen. Een veld dat uit CEO komt, houdt de lokale naam van zijn CEO-property (`ceo:naam` → `ceo-elastic:naam`).
- Het gaat om **alle tien soorten**, zonder beperkingen: rijksmonumenten, complexen, gezichten, werelderfgoed, archeologische terreinen, onderzoeksgebieden, vondstlocaties, archeologische complexen, grondsporen en vondsten. Samen ca. 1,2 mln objecten.

## Status (21 oktober 2026)

| Onderdeel | Status |
|---|---|
| Velden per soort | uitgewerkt in [docs/schema.md](docs/schema.md) |
| CONSTRUCT | [construct/alles.rq](construct/alles.rq), getest op voorbeelden van alle tien soorten, op alle complexen en op alle archeologische terreinen |
| Volledige run (1,2 mln objecten) | gedaan: 7 query-jobs, één per klasse ([construct/delen/](construct/delen/)), samen ongeveer 3 uur. Eén job voor alles was te traag (5% na 4 uur). |
| Dataset | `rce/erfgoed` (*public*): 23.847.404 statements in 7 graphs. De naam (bijvoorbeeld `erfgoed-ceo`) en de toegang zijn nog niet definitief. |
| Index template | [triply/elastic-service.json](triply/elastic-service.json): alle velden van de query, zonder scripts, lokaal getest tegen Elasticsearch 8.17.0 |
| Elastic-service | `Erfgoed-ceo` op `rce/erfgoed`, aangemaakt op 21 oktober, bezig met indexeren |
| Zoekwebsite | online: <https://erfgoed-cho-zoekdemo.jolietjakeblues64.workers.dev/> ([web/](web/), zie [docs/website.md](docs/website.md)) |

Wat nog openstaat: [docs/open-punten.md](docs/open-punten.md).

## Mappen

| Pad | Inhoud |
|---|---|
| [`web/`](web/) | De zoekwebsite (HTML, CSS, JavaScript), zie [docs/website.md](docs/website.md) |
| [`server.mjs`](server.mjs), [`package.json`](package.json), [`wrangler.jsonc`](wrangler.jsonc) | Lokale server (`npm start`), testscripts en Cloudflare-instellingen voor de website |
| [`construct/alles.rq`](construct/alles.rq) | De CONSTRUCT voor de hele projectie; hier pas je de query aan |
| [`construct/delen/`](construct/delen/) | Dezelfde query in 7 delen, één per klasse, elk als losse query-job in TriplyDB (gemaakt uit `alles.rq`) |
| [`construct/maak-delen.mjs`](construct/maak-delen.mjs) | Maakt de 7 delen uit `alles.rq`; kan grote klassen ook kleiner splitsen |
| [`triply/elastic-service.json`](triply/elastic-service.json) | Configuratie van de Elasticsearch-service (index template); niet met de hand bewerken |
| [`triply/maak-service.mjs`](triply/maak-service.mjs) | Maakt `elastic-service.json`: velden per type, Nederlandse analyse uit `nl-analyse.json` |
| [`triply/nl-analyse.json`](triply/nl-analyse.json) | Analyzers, filters en normalizer: die van `Erfgoed-sdo-nl3`, aangepast voor archeologie |
| [`triply/nl-analyse-nl3.json`](triply/nl-analyse-nl3.json) | Ongewijzigde kopie van de analyse in `Erfgoed-sdo-nl3`, alleen voor de vergelijking |
| [`triply/dataset-beschrijving.md`](triply/dataset-beschrijving.md) | Beschrijving van de dataset, om in TriplyDB te plakken |
| [`docs/website.md`](docs/website.md) | De zoekwebsite: wat hij kan, hoe je hem start en test, wat anders is dan de SDO-demo |
| [`docs/achtergrond.md`](docs/achtergrond.md) | Waarom een projectie, en niet Elastic rechtstreeks op `rce/cho`, schema.org of een eigen Elastic |
| [`docs/besluiten.md`](docs/besluiten.md) | Gemaakte keuzes, met de reden |
| [`docs/schema.md`](docs/schema.md) | Alle velden: bron in CEO, soorten, type in Elastic, hoe de query draait |
| [`docs/elastic-document.md`](docs/elastic-document.md) | Hoe een object er in Elastic uitziet (JSON), de index template, lokaal testen, voorbeeldqueries |
| [`docs/taalanalyse.md`](docs/taalanalyse.md) | Taalanalyse: wat er anders is dan in `Erfgoed-sdo-nl3` en waarom, met de vergelijking op een testcorpus |
| [`docs/voorbeeld-rm14948.md`](docs/voorbeeld-rm14948.md) | Eén monument uitgeschreven: van CEO naar document |
| [`docs/triply-jobs.md`](docs/triply-jobs.md) | Wat TriplyDB documenteert over query-jobs, flows en Elasticsearch-services, en wat dat betekent voor de projectie |
| [`docs/cho-data.md`](docs/cho-data.md) | Metingen aan `rce/cho` en valkuilen bij het queryen |
| [`docs/open-punten.md`](docs/open-punten.md) | Wat nog moet of nog besloten moet worden |
| [`tests/web.test.mjs`](tests/web.test.mjs) | Unit-tests voor de website (`npm test`) |
| [`tests/live.mjs`](tests/live.mjs) | Controle van de website-queries tegen de live service (`npm run test:live`) |
| [`tests/objecten.mjs`](tests/objecten.mjs) | Draait de query voor losse objecten en toont de velden per object |
| [`tests/elastic-document.mjs`](tests/elastic-document.mjs) | Draait de query voor losse objecten en toont het document zoals Triply het in Elastic zet |
| [`tests/lokaal-elastic.mjs`](tests/lokaal-elastic.mjs) | Laadt de template en 13 voorbeeldobjecten in een lokale Elasticsearch (Docker) en controleert types en zoekvragen |
| [`tests/documenten.mjs`](tests/documenten.mjs) | Gedeelde code: query draaien en omzetten zoals Triply dat doet |
| [`tests/corpus.mjs`](tests/corpus.mjs) | Bouwt een testcorpus van 23.490 objecten (NDJSON) voor de taalanalyse |
| [`tests/vergelijk-analyse.mjs`](tests/vergelijk-analyse.mjs) | Vergelijkt de nl3-analyse en de nieuwe op het corpus, in een lokale Elasticsearch |
| [`tests/schaal.mjs`](tests/schaal.mjs) | Draait de query voor alle objecten van één klasse: tijd, triples, velden |

## Zoekwebsite

**Online:** <https://erfgoed-cho-zoekdemo.jolietjakeblues64.workers.dev/>

Lokaal:

```bash
npm start
```

Open daarna `http://127.0.0.1:4175`. Meer, ook over testen en online zetten: [docs/website.md](docs/website.md).

## Service aanmaken en controleren

In PowerShell, vanuit deze map. Je hebt een TriplyDB-token met *Management access* nodig. Zet het token niet in een bestand of in een gesprek.

Token zetten (geldt alleen voor dit terminalvenster):

```bash
$env:TRIPLY_TOKEN = "plak-hier-je-token"
```

Service aanmaken op `rce/erfgoed`:

```bash
curl.exe -H "Authorization: Bearer $env:TRIPLY_TOKEN" -H "Content-Type: application/json" -X POST "https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/erfgoed/services" -d "@C:\AI\elastic-ceo\triply\elastic-service.json"
```

Status van de services. Wacht tot bij `Erfgoed-ceo` `running` staat:

```bash
curl.exe -s "https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/erfgoed/services" | Select-String -Pattern '"name":"[^"]*","id"|"status":"[a-z]*"' -AllMatches | ForEach-Object { $_.Matches.Value }
```

Aantal documenten per soort:

```bash
(Invoke-RestMethod -Method Post -Uri "https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/erfgoed/services/Erfgoed-ceo/_search" -ContentType "application/json" -Body '{"size":0,"aggs":{"soort":{"terms":{"field":"@id.soort","size":20}}}}').aggregations.soort.buckets | Format-Table key, doc_count
```

Dat moet overeenkomen met de aantallen in [docs/cho-data.md](docs/cho-data.md): vondsten 446.809, archeologischcomplex 360.408, archeologischonderzoeksgebied 113.562, vondstlocatie 111.885, grondsporen 92.697, rijksmonument 67.496, archeologischterrein 13.025, complex 2.834, gezicht 472, werelderfgoed 18 (stand 19 oktober 2026).

Token weer weghalen:

```bash
Remove-Item Env:TRIPLY_TOKEN
```

Hernoem je de dataset, vervang dan `rce/erfgoed` in de URL's. Gaat de service op *Error*, dan staat de melding op de servicekaart in TriplyDB. De template wordt alleen bij het aanmaken gelezen. Na een wijziging (`node triply/maak-service.mjs`) verwijder je daarom de service en maak je hem opnieuw aan.

## Testen

Vereist Node.js 18 of nieuwer, zonder npm-dependencies. Draai de commando's vanuit deze map. De scripts hieronder gebruiken het SPARQL-endpoint `https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/sparql`.

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
