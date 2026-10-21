# Besluiten

Gemaakte keuzes, met de reden. Datum: 19 oktober 2026, tenzij anders vermeld.

## 1. Met Triply, niet met een eigen Elastic

Een eigen Elasticsearch, met geneste documenten, is in de huidige opzet niet haalbaar. Alles moet dus via een TriplyDB-Elasticsearch-service. Gevolg: platte documenten, één per subject, en geen `nested` (zie [achtergrond.md](achtergrond.md)).

## 2. Een zoekprojectie, niet Elastic rechtstreeks op `rce/cho`

Rechtstreeks maakt een document per CEO-knoop (naam, omschrijving, type, datering, geometrie), en voor archeologie zit het label drie stappen van het object af. Daarom komt er een afgeleide dataset met één subject per erfgoedobject. De projectie is een zoeksleutel. Het subject is de cho-kennis-URI, zodat de volledige data in `rce/cho` bereikbaar blijft.

## 3. Geen schema.org

schema.org propt alles in een paar algemene properties en gooit daarbij te veel weg (zie [achtergrond.md](achtergrond.md), optie 2). De projectie gebruikt CEO-termen.

## 4. Monumenten én archeologie, in één index

Alle tien klassen gaan erin: rijksmonument, complex, gezicht, werelderfgoed, archeologisch terrein, onderzoeksgebied, vondstlocatie, archeologisch complex, grondsporen en vondsten. Dat zijn ca. 1,2 mln objecten. Nu zijn dat twee aparte projecties met elk een eigen service (`erfgoed-sdo`, `archeologie-sdo`).

## 5. Geen beperkingen

Er wordt niets weggefilterd: ook ex-rijksmonumenten, niet-beschermde gezichten, bufferzones van werelderfgoed en vertrouwelijke archeologie. Juridische status, gezichtsstatus, zone en vertrouwelijkheid worden velden, zodat een zoekvraag erop kan filteren of facetteren.

Nog te beoordelen door de RCE: of vertrouwelijke vondstlocaties met hun exacte geometrie in een open zoekindex mogen (zie [open-punten.md](open-punten.md)).

## 6. Alle velden in `ceo-elastic:`, met de CEO-naam waar het kan

Alle velden in de projectie staan in `https://linkeddata.cultureelerfgoed.nl/def/ceo-elastic#`. Er komt geen `ceo:`- of `ceox:`-property in, zodat projectie en CEO niet door elkaar lopen.

- Een waarde die in CEO al tekst, een getal, een datum of een relatie is, houdt de **lokale naam** van haar CEO-property. Dat geldt ook als de property in CEO aan een tussenknoop hangt: `heeftNaam/ceo:naam` wordt `ceo-elastic:naam` op het object. Zo blijft te zien waar een veld vandaan komt.
- In de query heten die velden nog naar CEO. Eén BIND aan het eind zet `ceo:` om naar `ceo-elastic:`.
- De klasse staat als waarde in `ceo-elastic:klasse` (`ceo:Rijksmonument`), niet in `rdf:type`, want het document is geen CEO-object.
- `ceox:RCEBuitenplaats` wordt `ceo-elastic:buitenplaats`.
- Waarden blijven CEO-URI's: begrippen, objecten en klassen zijn verwijzingen.
- `geo:asWKT` en `rdfs:seeAlso` blijven, want dat zijn standaardvocabulaires en geen CEO.

Eerdere opzet (ook 19 oktober): velden uit CEO hielden hun `ceo:`-property, zoals `ceo:naam` op het object, en alleen labels en afgeleide velden gingen naar `ceo-elastic:`. Dat liet de twee door elkaar lopen. Het schond ook het domein uit de ontologie, want `ceo:naam` hoort bij `ceo:Naam` en niet bij `ceo:Rijksmonument`.

De projectie blijft een **aparte dataset**, die zegt dat het een zoekprojectie is en geen CEO-data.

## 7. `ceo-elastic:`, niet `ceox:`

Eerst was `ceox:` voorgesteld, omdat de RCE dat al gebruikt voor aanvullingen (`ceox:RCEBuitenplaats`). Dat is teruggedraaid. `ceox:` is een echte ontologie ("Cultureel Erfgoed Ontologie Extentie") met eigen klassen en properties, waaronder `ceox:functienaam`. Een zoekveld `ceox:functie` zou daar met een andere betekenis naast staan. De naam `ceo-elastic` heeft de gebruiker voorgesteld.

## 8. Begrippen twee keer: URI en label

Bij een begrip (rn, ABR, owms) staat de URI in het veld met de CEO-naam (`ceo-elastic:heeftTypeNaam`, `ceo-elastic:heeftJuridischeStatus`). Daarmee kun je exact filteren en naar ABR of CHT linken. Het label staat in een veld met een eigen naam (`ceo-elastic:type`, `ceo-elastic:juridischeStatus`), voor zoeken en facetten. Vuistregel: een veld dat met `heeft…` begint, bevat een URI.

## 9. Botsingen krijgen een eigen naam

Soms betekent dezelfde CEO-property op verschillende plekken iets anders. Plat maken zou dat door elkaar halen:

| CEO | Probleem | Oplossing |
|---|---|---|
| `ceo:gemeentenaam` (BRK) | is de kadastrale gemeente: RM 14948 "Elst", gemeente Overbetuwe | `ceo-elastic:kadastraleGemeente` |
| `ceo:registratiedatum` | staat op het object én op elke kennisregistratie | alleen die van het object |
| `ceo:omschrijving` | formeel en niet-formeel standpunt | formeel in `ceo-elastic:omschrijving`, de rest in `ceo-elastic:overigeOmschrijving` |
| jaartallen | ABR-jaar van een periode (archeologie) of `ceo:datum` (monumenten) | beide in `ceo-elastic:beginjaar` / `eindjaar` |

## 10. Formeel standpunt

Een omschrijving met `formeelStandpunt true` gaat naar `ceo-elastic:omschrijving`. Een andere omschrijving gaat naar `ceo-elastic:overigeOmschrijving`, want bij archeologie is de omschrijving bijna nooit formeel. Er wordt dus niets weggegooid, en de zoekvraag kiest wat ze wil.

## 11. Geometrie

- Alleen `geo:asWKT` (WGS84). `ceo:asWKT-RD` gaat niet mee: Elastic zou RD-coördinaten als lengte- en breedtegraad lezen.
- Werelderfgoed: kern- en bufferzone zijn in CHO aparte objecten. Allebei krijgen ze `geo:asWKT`, plus `ceo-elastic:zone` ("kernzone", "bufferzone").
- Geleende geometrie staat in een apart veld, `ceo-elastic:geleendeGeometrie`. Een terrein krijgt het vlak van het rijksmonument waarin het ligt, een vondstlocatie dat van het onderzoeksgebied. Dat laatste is het hele gebied en niet de vindplek. Vondsten, grondsporen en complexen krijgen geen geleend vlak, want dat zou honderdduizenden kopieën van hetzelfde vlak opleveren. Die vind je via `ceo-elastic:onderzoeksgebied`.

## 12. Eén CONSTRUCT, één UNION-blok per veld

Alle velden staan in één query. Elk blok volgt vanaf het object één pad en levert zelf `?s ?p ?o` op. Zo groeit het aantal rijen lineair, zonder kruisproducten (3 materialen × 4 perioden × …). En elk blok, of elke klasse, kan los draaien met dezelfde triples als uitkomst. Is de volledige run te zwaar, dan splits je per klasse of per veld (zie [schema.md](schema.md#draaien)).

## 13. Eigen map

Het experiment staat in `C:\AI\elastic-ceo` en niet in `elastic-erfgoed`, zodat het niet door de erfgoed-sdo-demo heen loopt.

## 14. Eigen taalanalyse, gebaseerd op nl3

De Nederlandse analyse van `Erfgoed-sdo-nl3` is het uitgangspunt, maar is aangepast voor archeologie:

- `terp`, `graf` en `paal` worden niet gesplitst, want anders vindt *terp* ook waterput, *graf* ook topografisch en *paal* ook onbepaald. Bij het zoeken breiden ze uit met een vaste lijst echte samenstellingen.
- `kapel` wordt wel gesplitst, maar tekenfilters maken *dakkapel*, *kapelaan* en *Kapelle* eerst onherkenbaar.
- Erbij kwamen: woorden in de samenstellingenlijst (kuil, greppel, aardewerk, keramiek, haard, schrabber), meervoudsregels (paalgaten, graven, urnenvelden), synoniemen (keramiek → aardewerk, hunebed ↔ megalietgraf) en een filter dat de dubbele punt in ABR-labels vervangt.

De zoekresultaten voor monumentwoorden blijven gelijk. Details en vergelijking: [taalanalyse.md](taalanalyse.md).

Op 21 oktober toegevoegd: `punt_tussen_letters`, zodat voorletters zonder spatie ("P.J.H.Cuypers") los van de achternaam worden gevonden, en de normalizer `zonder_functiecode`, zodat "Boerderij (M)", "Boerderij(M)" en "Boerderij(M1)" in de facet één waarde zijn. Dat laatste kan ook in de CONSTRUCT, maar dan moeten de 7 query-jobs opnieuw; in de index is alleen een nieuwe service nodig, en de bron blijft zichtbaar in `_source`.

Op 21 oktober aangepast: de eerste versie gebruikte `condition`-filters met Painless-scripts, maar TriplyDB laat geen scripts toe in een analyzer ("cannot execute scripts using [analysis] context").

## 15. Zeven query-jobs, één per klasse

De hele projectie als één query-job was te traag: 5% na ongeveer 4 uur. Opgesplitst in 7 queries, één per klasse (de vier kleine klassen samen), duurde het samen ongeveer 3 uur, op 21 oktober 2026. Het splitsen in kleinere delen op URI is voorbereid (de grenzen staan in `construct/maak-delen.mjs`), maar was niet nodig.

## 16. Oude kaarten uit een vaste lijst, niet uit de Allmaps-API

De Allmaps-API (`https://api.allmaps.org/maps?intersects=lon,lat`) geeft op een punt vooral grote overzichtskaarten en testkaarten; de filters zijn niet gedocumenteerd. Daarom dezelfde aanpak als in Dodenakkers en Joodse begraafplaatsen: de open dump offline filteren (detailkaarten, bekende collecties, herkenbare titel) tot `web/oude-kaarten.json`. Anders dan daar wordt niet per object vooraf gekoppeld (dat zijn 1,2 mln objecten): de browser zoekt zelf welke kaarten over het punt liggen. Het bestand is klein genoeg (ca. 300 kB ingepakt) en wordt pas bij de eerste klik geladen.
