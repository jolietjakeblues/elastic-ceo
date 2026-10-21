# Open punten

Stand van 19 oktober 2026.

## Te doen

1. **Index template bij Triply.** De template [`triply/elastic-service.json`](../triply/elastic-service.json) is lokaal getest tegen Elasticsearch 8.17.0: alle controles gelukt (zie [elastic-document.md](elastic-document.md#lokaal-testen)). Bij Triply draait 8.14 of nieuwer; bij het aanmaken van de service blijkt of de template daar ook zonder fouten wordt geaccepteerd.
2. **Volledige run** in 16 query-jobs, één per bestand in [`construct/delen/`](../construct/delen/), allemaal met dezelfde doeldataset (zie [schema.md](schema.md#in-16-delen)). Daarna nagaan of het aantal subjecten per klasse klopt met [cho-data.md](cho-data.md). De job met alles in één query (`rce/alles-ceo-elastic/2`) liep te traag: 5% na ongeveer 4 uur. Doeldataset: `rce/erfgoed`, op 19 oktober aangemaakt voor deze test ("Volledige CHO-KENNIS voor Elastic test", nog leeg, *public*). Naam en toegang nog kiezen, bijvoorbeeld `erfgoed-ceo` naast `erfgoed-sdo` en *internal* zolang het een experiment is. Niet hernoemen terwijl er een job naartoe schrijft.
3. **Nieuwe dataset** aanmaken (naam nog kiezen, bijv. `rce/cho-elastic`), met in de beschrijving dat het een zoekprojectie is en geen CEO-data.
4. **Elastic-service** op die dataset aanmaken met de index template. Daar is een token met *Management access* voor nodig.
5. **Controles** na het laden: aantal documenten per soort gelijk aan de tabel in [cho-data.md](cho-data.md); `geo_shape` gevuld; jaartallen als getal; steekproef met `tests/objecten.mjs` tegen het document in Elastic.
6. **Verversen.** `rce/cho` wordt dagelijks herladen. Bepalen hoe vaak de projectie opnieuw draait en hoe de Elastic-service daarna bijgewerkt wordt.
7. **Voorkant.** De zoekdemo aanpassen aan de nieuwe velden en soorten, of een nieuwe voorkant in deze map.
8. **Taalanalyse bij Triply.** De analyse is aangepast voor archeologie en vergeleken met die van `Erfgoed-sdo-nl3` op een testcorpus van 23.490 objecten (zie [taalanalyse.md](taalanalyse.md)). Nog open: of TriplyDB de Painless-scripts in de `condition`-filters accepteert. Zo niet, dan de terugvaloptie uit taalanalyse.md. Nog meer regels kunnen erbij als de voorkant er is en blijkt waarop mensen zoeken.
9. **Wijzigingen in elastic-erfgoed overnemen.** `triply/nl-analyse.json` is gebaseerd op een kopie. Verandert de analyse in elastic-erfgoed (bijvoorbeeld synoniemen uit de CHT-thesaurus), neem dat dan hier met de hand over en draai `node triply/maak-service.mjs`, `node tests/lokaal-elastic.mjs` en `node tests/vergelijk-analyse.mjs` opnieuw.

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
