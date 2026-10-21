# De zoekwebsite

Een zoekdemo op de service `Erfgoed-ceo`, in [`web/`](../web/).

**Online:** <https://erfgoed-cho-zoekdemo.jolietjakeblues64.workers.dev/>

Voorbeelden:

- [Alles in onderzoeksgebied 2038045](https://erfgoed-cho-zoekdemo.jolietjakeblues64.workers.dev/?binnen=in:archeologischonderzoeksgebied:2038045)
- [Romeins aardewerk](https://erfgoed-cho-zoekdemo.jolietjakeblues64.workers.dev/?q=aardewerk&soort=vondsten&van=-12&tot=450)
- [Kerken in Gelderland](https://erfgoed-cho-zoekdemo.jolietjakeblues64.workers.dev/?q=kerk&provincie=Gelderland)
- [Gebouwd door Cuypers, oudste eerst](https://erfgoed-cho-zoekdemo.jolietjakeblues64.workers.dev/?q=Cuypers&veld=Maker&sorteer=oudste)
- [Alles in gezicht Orvelte](https://erfgoed-cho-zoekdemo.jolietjakeblues64.workers.dev/?binnen=gezicht:1325) Hij is gebaseerd op de Erfgoed SDO/Elastic demo (`C:\AI\elastic-erfgoed\web\`): dezelfde opbouw, huisstijl, zoeksyntax, deelbare URL, CSV-export en kaart. Hieronder staat wat er anders is.

De browser praat rechtstreeks met de Elasticsearch-service, want die staat CORS toe (`Access-Control-Allow-Origin: *`):

```text
POST https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/erfgoed/services/Erfgoed-ceo/_search
```

Krijgt de dataset een andere naam, dan pas je `ENDPOINT` aan in [`web/search.js`](../web/search.js).

## Lokaal starten

Vereist Node.js 18 of nieuwer, zonder npm-dependencies.

```bash
npm start
```

Open daarna `http://127.0.0.1:4175`.

```bash
npm test
```

```bash
npm run test:live
```

`npm test` test de queryopbouw zonder netwerk ([`tests/web.test.mjs`](../tests/web.test.mjs)): zoeken en filteren, soorten, datering, contexten, opzoeken van kern- en bufferzones, URL, uitleg, CSV, links, kaartgeometrie en het zoeken van oude kaarten op een punt (ook in de echte `oude-kaarten.json`). `npm run test:live` controleert de echte service ([`tests/live.mjs`](../tests/live.mjs)): CORS, som van de soort-facet, alles in een onderzoeksgebied, binnen Orvelte, datering, en dat *terp* geen waterput vindt.

## Wat er anders is dan de SDO-demo

### Tien soorten, één index

Rijksmonument, complex, gezicht, werelderfgoed, archeologisch terrein, onderzoeksgebied, vondstlocatie, archeologisch complex, grondspoor en vondst. Elke soort heeft een eigen kleur (`web/style.css`, `colors` in `web/app.js`). De soort komt uit `@id.soort` (de normalizer in de index template).

Het **nummer** bij een resultaat is het eigen nummer: monumentnummer, complexnummer, gezichtsnummer of werelderfgoednummer. Archeologische objecten hebben alleen het CHO-nummer, het getal in de URI. Ook de Archis-nummers zijn doorzoekbaar via *Zoek in: Nummer*.

### Zoekvelden en facetten

| Zoek in | Velden (`ceo-elastic:`) |
|---|---|
| Alles | alle tekstvelden, korte velden en nummers |
| Omschrijving | omschrijving, overigeOmschrijving, toelichting, locatieomschrijving |
| Naam | naam, locatienaam |
| Adres | volledigAdres, postcode |
| Plaats | woonplaatsnaam, gemeente, provincie, kadastraleGemeente |
| Type en functie | type, typegroep, functie, hoofdfunctie, oorspronkelijkeFunctie, huidigeFunctie |
| Materiaal | materiaal, materiaalgroep |
| Periode en stijl | beginperiode, eindperiode, stijl |
| Maker | actor, rol |
| Nummer | alle nummervelden |
| Exact | `.exact` van de tekstvelden, plus de korte velden en nummers |

Bij *Alles* en *Exact* tellen naam, locatienaam, type, functie en hoofdfunctie 3× zo zwaar (`WEIGHT`). Dat verandert alleen de volgorde.

Functie en type hebben in de bron vaak een code van de oude functie-indeling, met of zonder spatie: "Woonhuis(K)", "Boerderij (M)" naast "Boerderij(M)", "Kazemat (B10)". Vanaf de service met de normalizer `zonder_functiecode` (zie [taalanalyse.md](taalanalyse.md)) staat in de facet alleen "Woonhuis", "Boerderij" enzovoort. Op de resultaatkaart en in de CSV haalt de website de code zelf weg (`zonderFunctiecode` in `web/search.js`, dezelfde regel).

Facetten: soort, provincie, gemeente, juridische status, functie, type, materiaal, periode (begin) en vertrouwelijkheid. Binnen een facet geldt *of*, tussen facetten *en*.

### Datering

Zoals in de [archeologiedemo](https://elastic-archeologie.jolietjakeblues64.workers.dev/): *Van* en *tot* op één regel, met jaren voor Christus als negatief getal (of "500 v.Chr."), en een keuze:

- **datering valt er (deels) in** (standaard): de datering overlapt, `eindjaar >= van` en `beginjaar <= tot`.
- **datering valt er helemaal in**: het object is gedateerd en geen `beginjaar < van` en geen `eindjaar > tot` (`must_not`). Brede dateringen als Prehistorie – Nieuwe Tijd vallen dan weg. Bij een monument met meerdere gebeurtenissen moeten ze er allemaal in vallen.

Live op 21 oktober 2026: aardewerk bij vondsten, -12 tot 450, geeft 47.901 (deels) en 27.548 (helemaal) treffers. Bij archeologie zijn dat de jaren van de ABR-periode, bij monumenten de jaren van gebeurtenissen (bouw, verbouwing, restauratie). Een monument met meerdere gebeurtenissen telt mee als één jaar past. Het filter geldt ook voor de facetten. In de URL: `?van=-12&tot=450`, met `&jaarmodus=binnen` voor *helemaal*.

Extra sorteringen: *Oudste eerst* (beginjaar) en *Jongste eerst* (eindjaar).

### Binnen een gebied, object of afstand

| Context | URL-parameter | Elasticsearch |
|---|---|---|
| Gezicht | `binnen=gezicht:1325` | `geo_shape within` op het vlak, op `geo:asWKT` én `geleendeGeometrie` |
| Werelderfgoed, kernzone | `binnen=werelderfgoed:818` | idem; opzoeken met `zone` niet `bufferzone` |
| Werelderfgoed, bufferzone | `binnen=bufferzone:759` | idem, met `zone` = `bufferzone` |
| Complex | `binnen=complex:524444` | `terms` op `@id.keyword` met de URI's uit `heeftRijksmonument` |
| Wat erin ligt | `binnen=in:archeologischonderzoeksgebied:2038045` (ook `rijksmonument`, `archeologischterrein`, `vondstlocatie`) | `ligtInObject` = URI **of** `onderzoeksgebied` = URI. Bij een onderzoeksgebied geeft dat de vondstlocaties en alle complexen, grondsporen en vondsten daarin, op alle niveaus. |
| In de buurt | `binnen=rond:rijksmonument:36075:500` (ook `complex`, `gezicht`, `werelderfgoed`, `archeologischonderzoeksgebied`; 100 tot 2000 m) | `geo_distance` vanaf het (zwaarte)punt, op beide geometrievelden |

Het gekozen gebied, object of de cirkel staat als zwarte stippellijn op de kaart.

### Relaties bij elk resultaat

| Rij | Bron |
|---|---|
| *Ligt in gebied* | `geo_shape contains` met een benoemde query per object (één request per pagina), voor objecten met een eigen vlak |
| *Ligt in* | `ligtInObject` (vondst → vondstlocatie, vondstlocatie → onderzoeksgebied, terrein → rijksmonument, …) |
| *Onderzoeksgebied* | `onderzoeksgebied`, als dat niet al bij *Ligt in* staat |
| *Onderdeel van* | `isOnderdeelVanComplex` |
| *Hoofdobject* | `heeftHoofdobject` (bij een complex) |
| *Onderdelen* + **Toon onderdelen** | `heeftRijksmonument` (bij een complex) |
| *Bevat* + **Toon wat erin ligt** | `bevatObject` (aantal), bij rijksmonumenten, terreinen, onderzoeksgebieden en vondstlocaties |
| **Toon wat erin ligt** | bij gezichten en werelderfgoed (ruimtelijk) |

Namen en nummers van gerelateerde objecten komen voor de hele pagina uit één extra request (`terms` op `@id.keyword`).

### Kaart

Eigen geometrie (`geo:asWKT`) wordt als punt of vlak getekend. Objecten zonder eigen geometrie maar met `geleendeGeometrie` krijgen het vlak van het object waarin ze liggen, met een stippellijn: terreinen dat van hun rijksmonument, vondstlocaties dat van hun onderzoeksgebied. Archeologische complexen, grondsporen en vondsten hebben geen locatie; de tekst onder de kaart zegt dat.

### Oude kaarten (Allmaps)

Bij elk resultaat met een locatie staat de knop **Oude kaarten**. Die zoomt naar het object (bij een los object tot zoom 16) en legt er een gegeorefereerde historische kaart uit [Allmaps](https://allmaps.org/) overheen. Onder de kaart (niet erop, want dan valt het over het object heen) staat een paneel met een scrollbare lijst van alle kaarten op die plek (jaar, titel over hooguit twee regels en collectie; op jaar, oudste eerst), een schuif voor de dekking en een link naar de hele kaart in de Allmaps-viewer. Eerst was dat een `<select>`, maar bij 105 kaarten (Centraal Station) bleef het uitklapmenu leeg en waren lange titels niet te lezen. Op een breed scherm wordt de kaart dan lager, zodat kaart en paneel samen in beeld blijven. Een volgnummer ("(2)") staat alleen bij dezelfde titel én hetzelfde jaar, dus bij een tweede scan van dezelfde kaart, niet bij een andere editie. Als er een Bonneblad is, wordt dat eerst getoond. Dezelfde aanpak als in [Dodenakkers](https://github.com/jolietjakeblues/dodenakkers) en [Joodse begraafplaatsen](https://github.com/jolietjakeblues/joodse-begraafplaatsen).

| Onderdeel | Hoe |
|---|---|
| Welke kaarten | [`web/oude-kaarten.json`](../web/oude-kaarten.json), gemaakt met [`allmaps/maak-oude-kaarten.mjs`](../allmaps/maak-oude-kaarten.mjs) uit de open dump `https://files.allmaps.org/maps.geojsonl` (CC0) |
| Selectie | omtrek (deels) in Nederland, kleiner dan 600 km², collectie van een bekende instelling, herkenbare titel, per scan alleen de nieuwste georeferentie |
| Jaartal | Bonnebladen uit [`allmaps/bonnebladen_jaren.csv`](../allmaps/bonnebladen_jaren.csv) (overgenomen uit Joodse begraafplaatsen), anders een jaartal in de titel |
| Welke kaarten op een plek | in de browser: punt-in-vlak op de omtrek, voor het (zwaarte)punt van het object ([`web/oude-kaarten.js`](../web/oude-kaarten.js)) |
| Kaartbeeld | Leaflet-tegellaag `https://allmaps.xyz/maps/{id}/{z}/{x}/{y}.png` (Allmaps Tile Server), alleen binnen de omtrek, tot zoom 18 |
| Bron vooraf testen | De index bewaart per kaart de server van de scan (`bronnen`, 21 servers). Bij het openen haalt de website per server één proeftegel op het punt op (`tegelOp`, `proefkaarten`, `bronFout` in `web/oude-kaarten.js`). Een Allmaps-fout met status 500 of hoger betekent dat die server plat ligt: alle kaarten van die server gaan naar een ingeklapte lijst *nu niet bereikbaar*, en tellen niet mee. Op 21 oktober 2026 gold dat voor UB Utrecht, UB Leiden, BnF, Library of Congress en Harvard (502); bij het Centraal Station blijven 91 van de 105 kaarten over. |
| Onbereikbare scan | Is de scan bij de collectie onbereikbaar, dan geeft de tile server toch een tegel (HTTP 200) met "ALLMAPS ERROR" erop, en de kop `X-Allmaps-Error`. De website haalt de tegels daarom met `fetch` op (`AllmapsLaag` in `web/app.js`), toont zo'n tegel niet, en zet die kaart bij *nu niet bereikbaar*; dan wordt de eerste kaart gekozen die wel werkt. Op 21 oktober 2026 gaf de Universiteitsbibliotheek Utrecht 502. |

Onder de lijst staan de **kadastrale minuutplans** (1811–1832) op die plek: per blad gemeente, sectie en blad, met een link naar de scan in de RCE-beeldbank. Ze komen uit de WFS van de RCE (`https://services.rce.geovoorziening.nl/misc/wfs`, laag `misc:Minuutplanbegrenzingen`, CORS `*`), dezelfde bron als in [WatWasHier](https://github.com/jolietjakeblues/WatWasHier). De website vraagt een kleine bbox (±0,0005°) rond het punt en houdt alleen bladen over waarvan het vlak het punt bevat; bladen met `MPAANWEZIG` = `nee` vallen weg, en links gaan alleen naar `beeldbank.cultureelerfgoed.nl` (via https). Code: `minuutplanUrl` en `minuutplannen` in `web/oude-kaarten.js`, `minuutplanBlok` in `web/app.js`. Voorbeelden: Centraal Station Amsterdam → Amsterdam, sectie G, blad 03; hunebed D2 (geleende locatie in Norg) → Norg, sectie M, blad 01. De scans zelf zijn niet gegeorefereerd, dus geen laag op de kaart.

De Waterstaatskaart-bladen van de [Watertijdreis](https://watertijdreis.nl/) (957 bladen, 5 edities, 1865–1991), die WatWasHier ook gebruikt, zitten er niet in: ze staan niet in de Allmaps-API (de tile server kan ze dus niet tonen) en alle scans staan bij de UB Utrecht, die op 21 oktober 2026 503 gaf.

Stand 21 oktober 2026: 5.302 van de 66.091 kaarten in de dump, vooral TU Delft Library (3.459, waaronder de Bonnebladen), UB Utrecht (408), 4TU.ResearchData (394) en UB Amsterdam (344). Het bestand is 1,1 MB (ca. 300 kB ingepakt) en wordt pas geladen bij de eerste klik.

Verversen (de dump wordt twee keer per dag bijgewerkt; het script downloadt ca. 200 MB):

```bash
node allmaps/maak-oude-kaarten.mjs
```

Een lokale kopie van de dump kan ook: `node allmaps/maak-oude-kaarten.mjs pad/naar/maps.geojsonl`.

### Resultaatkaart

- Kop: de naam of locatienaam; zonder naam het type of de functie met het adres.
- Gegevens, alleen als ze er zijn: adres, plaats, gemeente, provincie, functie, type, typegroep, materiaal, stijl, periode (met jaartallen), maker en rol, aantal, status, aard, waardering, vertrouwelijkheid, verwerving, toestand en inschrijvingsdatum.
- ABR-labels als "aardewerk:onbepaald" staan in de weergave als "aardewerk: onbepaald". De facetten en filters gebruiken de oorspronkelijke waarde.
- Een thumbnail uit de beeldbank (`afbeelding`). Laadt die niet, dan valt hij weg. Op 21 oktober 2026 was `images.memorix.nl` tijdelijk offline ("vanwege recent bekendgemaakte beveiligingsproblemen in PHP").
- Links: *Linked Data (CHO)* naar het volledige object, en de registers uit `rdfs:seeAlso` (Monumentenregister, Kennisbank, UNESCO).

### Overig

- Oude kaarten uit Allmaps (zie hierboven) zitten niet in de SDO-demo's.
- In de zoekhulp staat een tabel *Wat kan deze demo meer dan de SDO-demo's?* (`#help-anders`), ook te openen vanuit de intro.
- De vooraf berekende telling per gezicht of werelderfgoed (`gebieden.json` in de SDO-demo) zit er niet in.
- Gemarkeerde zoektermen behouden de spatie erna. In de SDO-demo viel die weg ("KERKGEBOUWuit").
- De CSV heeft 19 kolommen: soort, nummer, naam, adres, plaats, gemeente, provincie, functie, type, materiaal, begin- en eindperiode, begin- en eindjaar, juridische status, vertrouwelijkheid, Linked Data, register en omschrijving.

## Beveiliging en publicatie

Zoals in de SDO-demo ([`web/_headers`](../web/_headers)): Content-Security-Policy, `frame-ancestors 'none'`, `noindex`, en geen HTML uit de bron in de pagina. Links gaan alleen naar http(s) en bekende registers, CSV-cellen worden beschermd tegen formules, en een schuine streep in de zoekvraag wordt geen reguliere expressie. Nieuw in de CSP: `img-src https://images.memorix.nl` voor de thumbnails `https://services.rce.geovoorziening.nl` (`connect-src`) voor de minuutplans, en `https://allmaps.xyz` voor de oude kaarten (ook in `connect-src`, omdat de tegels met `fetch` worden opgehaald, en `blob:` in `img-src`). De Allmaps-id's uit `oude-kaarten.json` moeten 16 hexadecimale tekens zijn; andere worden overgeslagen.

## Online zetten

Net als de andere demo's: een Cloudflare Worker die alleen de bestanden uit `web/` serveert ([`wrangler.jsonc`](../wrangler.jsonc), naam `erfgoed-cho-zoekdemo`). Hij staat online sinds 21 oktober 2026, op <https://erfgoed-cho-zoekdemo.jolietjakeblues64.workers.dev/>. Een onbekende URL geeft `web/404.html`.

**Automatisch via Workers Builds.** De repository is gekoppeld in het Cloudflare-dashboard, net als bij de SDO-demo:

1. **Workers & Pages** → **erfgoed-cho-zoekdemo** → **Settings** → **Builds** → **Connect**.
2. Kies de GitHub-repository van dit project, branch `main`.
3. Laat *Build command* leeg. *Deploy command*: `npx wrangler deploy`. *Root directory*: `/`.

Elke push naar `main` wordt automatisch gepubliceerd, en andere branches krijgen een preview-URL. De koppeling is gemaakt op 21 oktober 2026; de eerste twee versies zijn die dag met de hand gepubliceerd.

Met de hand publiceren kan ook:

```bash
npx wrangler deploy
```
