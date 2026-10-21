# Open punten

Stand van 21 oktober 2026.

## Gedaan

- **Volledige run:** 7 query-jobs, één per klasse ([`construct/delen/`](../construct/delen/), zie [schema.md](schema.md#in-7-queries-één-per-klasse)), samen ongeveer 3 uur. De resultaten staan in `rce/erfgoed`: 23.847.404 statements in 7 graphs. Eén job met de hele query (`rce/alles-ceo-elastic/2`) was te traag: na ongeveer 4 uur stond die op 5%.
- **Index template zonder scripts:** de eerste versie met `condition`-filters gaf bij TriplyDB *cannot execute scripts using [analysis] context*. De huidige [`triply/elastic-service.json`](../triply/elastic-service.json) gebruikt alleen standaardfilters en is lokaal getest (zie [taalanalyse.md](taalanalyse.md) en [elastic-document.md](elastic-document.md#lokaal-testen)).
- **Service aangemaakt:** `Erfgoed-ceo` op `rce/erfgoed` (21 oktober), status *running*, 1.209.366 documenten. De commando's staan in de README, onder *Service aanmaken en controleren*.
- **Service opnieuw aangemaakt** (21 oktober, avond) met `punt_tussen_letters` en `zonder_functiecode`: `npm run test:live` volledig gelukt; *cuypers AND station* vindt het Centraal Station en de facet functie heeft geen codes meer.
- **Workers Builds:** gekoppeld (21 oktober); elke push naar `main` zet de website online.
- **Zoekwebsite:** online op <https://erfgoed-cho-zoekdemo.jolietjakeblues64.workers.dev/> (zie [website.md](website.md)).

## Te doen

0. **Eén taalanalyse voor alle demo's (nl5).** [`triply/nl-analyse.json`](../triply/nl-analyse.json) is de bron; elastic-erfgoed en elastic-archeologie hebben een kopie en een script `triply/maak-nl5.mjs`. Hun nl5-templates zijn voorbereid en lokaal getest (zie hun README, *Versie 5*), maar nog niet aangemaakt. Na een wijziging hier: de kopieën bijwerken en daar `node triply/maak-nl5.mjs` draaien.
   - De tekenfilters voor valse *kuil* en *haard* (Ter Kuile, Kuilenburg, kerkuil, Haardijk) kwamen erbij nadat `Erfgoed-ceo` opnieuw was aangemaakt. De live service heeft ze dus nog niet; ze komen mee bij de volgende keer dat de service opnieuw wordt aangemaakt. Het verschil is klein: in het testcorpus *kuil* 1.325 → 1.318.

1. **Controles** als de service op *running* staat:
   - Het aantal documenten per soort is gelijk aan de tabel in [cho-data.md](cho-data.md).
   - `geo_shape` is gevuld.
   - De jaartallen staan als getal.
   - Een steekproef met `tests/elastic-document.mjs` komt overeen met het document in Elastic.

   Gaat de service op *Error*, dan staat de melding op de servicekaart.
2. **Thumbnails.** De website staat online (<https://erfgoed-cho-zoekdemo.jolietjakeblues64.workers.dev/>). De thumbnails uit de beeldbank vallen nu weg, omdat `images.memorix.nl` tijdelijk offline is. Opnieuw bekijken als de beeldbank weer online is.
3. **Naam en toegang van de dataset.** Hij heet nu `rce/erfgoed` (*public*), met de beschrijving "Volledige CHO-KENNIS voor Elastic test". Voorstel:
   - de naam `erfgoed-ceo`, naast `erfgoed-sdo`;
   - *internal* zolang het een experiment is;
   - de beschrijving uit [`triply/dataset-beschrijving.md`](../triply/dataset-beschrijving.md).

   Krijgt de dataset een nieuwe naam, dan veranderen de URL van het zoekendpoint en de commando's in de README.
4. **Verversen.** `rce/cho` wordt dagelijks herladen. Bepalen hoe vaak de projectie opnieuw draait (eerst de graphs leegmaken, dan de 7 jobs) en hoe de Elastic-service daarna bijgewerkt wordt.
5. **Taalanalyse bijhouden.** De lijsten voor terp, graf en paal liggen vast. Komt er een nieuwe samenstelling in de data, dan moet die erbij (zie [taalanalyse.md](taalanalyse.md)). Er kunnen ook regels bij als de voorkant er is en blijkt waarop mensen zoeken.
6. **Oude kaarten verversen.** `web/oude-kaarten.json` is gemaakt op 21 oktober 2026. Er komen in Allmaps steeds kaarten bij; draai af en toe `node allmaps/maak-oude-kaarten.mjs`. De lijst met collecties (`COLLECTIES`, `HOSTS`) is dezelfde als in Dodenakkers en Joodse begraafplaatsen; houd die gelijk.
7. **Wijzigingen in elastic-erfgoed overnemen.** `triply/nl-analyse.json` is gebaseerd op een kopie. Verandert de analyse in elastic-erfgoed (bijvoorbeeld synoniemen uit de CHT-thesaurus), neem dat dan hier met de hand over. Draai daarna `node triply/maak-service.mjs`, `node tests/lokaal-elastic.mjs` en `node tests/vergelijk-analyse.mjs` opnieuw.

## Te beslissen of af te stemmen

- **Namespace `ceo-elastic:`.** Die staat onder `linkeddata.cultureelerfgoed.nl/def/`, waar de officiële RCE-ontologieën staan. Afstemmen met wie de ontologie beheert, ook al gaat het alleen om zoekvelden.
- **Vertrouwelijkheid.** Vertrouwelijke onderzoeksgebieden en vondstlocaties gaan nu met hun geometrie mee. Ze staan al openbaar in `rce/cho`, maar een zoekindex maakt ze veel makkelijker te vinden. De RCE moet beoordelen of dat mag, of dat de geometrie dan grover of weg moet.
- **Geleende geometrie.** Nu voor terreinen (vlak van het rijksmonument) en vondstlocaties (vlak van het onderzoeksgebied). Moet dit in de kaart en in ruimtelijk zoeken meetellen, of alleen ter informatie?
- **Gemeente en provincie voor terreinen.** Terreinen hebben die niet zelf. Ze kunnen ze erven van het rijksmonument waarin ze liggen (alleen bij 1.812 terreinen), of van een ruimtelijke koppeling.
- **Meerdere gebeurtenissen.** Bij een monument met bouw en verbouwing staan alle jaren in `beginjaar` en `eindjaar`. Is een apart veld voor het bouwjaar (alleen *vervaardiging*) nodig?
- **Actor.** `ceo-elastic:actor` (uit `ceo:heeftActor`) is tekst inclusief een plaats ("Cuypers, P.J. ; Noord-Brabant"). Splitsen, of de URI uit graph `actorenrol` gebruiken?
- **Beelden.** Nu het aantal en één thumbnail. Meer nodig, bijvoorbeeld licentie of link naar de beeldbank?
- **Relatie gezicht/werelderfgoed.** "Ligt in gezicht" blijft een ruimtelijke zoekvraag (`geo_shape`), net als in de demo. Een vooraf berekende koppeling zit niet in de projectie.

## Bekende beperkingen

- Platte documenten: samenhang binnen herhaalde registraties gaat verloren (zie [achtergrond.md](achtergrond.md)).
- `ceo:asWKT-RD` zit er niet in.
- Archeologische complexen, grondsporen en vondsten hebben geen eigen geometrie. Je vindt ze ruimtelijk alleen via hun onderzoeksgebied.
