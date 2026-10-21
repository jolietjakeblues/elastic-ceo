# Query-jobs en services in TriplyDB

Wat de documentatie van TriplyDB zegt over query-jobs, flows en Elasticsearch-services, voor zover het dit experiment raakt. Nagelezen op 21 oktober 2026. Bronnen staan onderaan.

## Query-jobs (pipelines)

In TriplyDB.js heet een query-job een *pipeline*: `account.runPipeline(opts)`. Volgens de documentatie:

- Een pipeline "runs saved queries as one batch job and writes their results into a dataset". Het is "the way to materialise query results at scale, rather than paging through them in process".
- `queries` is een lijst van saved queries, elk eventueel met `variables` en een `priority`. De queries draaien **"in parallel"**. Met `priority` bepaal je welke eerst gaan.
- `destination` is een dataset met eventueel een graph. Zonder graph kiest TriplyDB er zelf een.
- **Hoe** een construct-job intern draait (in pagina's, met `LIMIT`/`OFFSET`, of als stream) staat nergens beschreven.

De tabel *Query Jobs* in de webinterface toont per job de pipeline, de saved query (met versie), de bron- en doeldataset, de duur, het aantal resultaten en de voortgang.

## Flows (Preview)

Flows zijn de nieuwere manier om taken achter elkaar of naast elkaar te zetten. Relevant:

- **Construct query-taak:** de query staat inline (**maximaal 10.000 tekens**) of is een saved query. Je kiest een saved query op naam, of je neemt alle CONSTRUCT-queries met bepaalde tags, eventueel in een vaste versie. Variabelen kunnen alleen bij saved queries.
- **Schrijven voegt toe.** "Tasks that produce data never replace what a graph already holds." Wil je opnieuw beginnen, draai dan eerst een Delete-taak op de graph.
- **Volgorde:** taken die niet met een pijl verbonden zijn, mogen tegelijk draaien. Twee taken die alleen statements aan dezelfde dataset toevoegen, hebben geen pijl nodig.
- **Time-out:** geen, tenzij je bij de taak een *Timeout* instelt.
- **(Re)create service:** maakt een service aan of maakt hem opnieuw, zodat hij "serves the dataset's current data". Bij Elasticsearch kun je hier de component en index templates als JSON meegeven (geavanceerde velden). Dit is het alternatief voor het `curl`-commando.

## Elasticsearch-services

- **Aanmaken in de webinterface** kan pas als de dataset minstens één graph heeft, en dan **zonder templates**. Templates gaan alleen via de API (`POST …/datasets/ACCOUNT/DATASET/services`) of via de flow-taak *(Re)create service*.
- De service maakt één index, `index`. Daarom moet elk index template `"index_patterns": "index"` hebben, anders wordt hij "silently unused". Een component template werkt pas als een index template hem in `composed_of` noemt.
- Templates worden alleen bij het aanmaken gelezen. Een wijziging betekent: service opnieuw aanmaken.
- Veldnaam = property-IRI met een spatie in plaats van elke punt.
- Verandert de dataset, dan staat er op de servicekaart "Click here to update." Bijwerken kan alleen als de service draait.
- Over scripts in templates (de `condition`-filters uit [taalanalyse.md](taalanalyse.md)) staat niets in de documentatie.

## Wat dit betekent voor de projectie

| Punt | Gevolg |
|---|---|
| Inline maximaal 10.000 tekens | `alles.rq` en elk deel zijn ongeveer 18.200 tekens. Ze moeten dus als **saved query** in TriplyDB staan, zoals je eerdere jobs (`rce/alles-ceo-elastic/2`). |
| Queries in één pipeline draaien parallel | Zet je alle 16 delen in één pipeline, dan draaien ze tegelijk op dezelfde Virtuoso, die ook de productiedataset bedient. Liever per job of in kleine groepen, of met `priority`. |
| Schrijven voegt toe | Alle delen mogen naar dezelfde dataset en graph schrijven. Draai je opnieuw, maak dan eerst de graph leeg, anders staat alles dubbel. |
| Geen limiet aan het aantal resultaten | Je eerdere jobs schreven 8 mln resultaten (`vondsten-sdo-construct-1/6`), dus de omvang van de uitvoer is niet het probleem. |
| Werking van een job onbekend | Dat één job op 5% stond na 4 uur, is een meting en geen gedocumenteerde grens. Waarom kleine delen sneller zijn, staat niet in de documentatie. |
| Service via de API of via een flow | De template met scripts kan alleen via `curl` of via *(Re)create service*, niet via de knop in de webinterface. |

## Bronnen

- [Flow tasks](https://docs.triply.cc/reference/flow-tasks/): Construct query, (Re)create service, timeouts
- [Flows (concept)](https://docs.triply.cc/concepts/flows/): toevoegen in plaats van vervangen, parallelle taken
- [Flows (reference)](https://docs.triply.cc/reference/flows/): statussen, time-out, schema's
- [Manage services](https://docs.triply.cc/how-to/manage-services/): Elasticsearch, templates, bijwerken
- [Saved queries](https://docs.triply.cc/reference/saved-queries/) en [SPARQL pagination](https://docs.triply.cc/how-to/sparql-pagination/): 10.000 resultaten per pagina via de API
- [TriplyDB.js: `runPipeline`](https://static.triply.cc/triplydb-js/interfaces/AccountBase.html) en [`RunPipelineOpts`](https://static.triply.cc/triplydb-js/interfaces/RunPipelineOpts.html)
- [TriplyDB changelog](https://docs.triply.cc/triplydb-changelog/): reparaties aan query-jobs, o.a. "Fixed query job failures for certain queries that processed very large CONSTRUCT query results" (25.10.300) en "A construct query job could report a green ("finished") status even when importing its results failed" (26.6.100)
