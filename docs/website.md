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

`npm test` test de queryopbouw zonder netwerk ([`tests/web.test.mjs`](../tests/web.test.mjs)): zoeken en filteren, soorten, datering, contexten, opzoeken van kern- en bufferzones, URL, uitleg, CSV, links en kaartgeometrie. `npm run test:live` controleert de echte service ([`tests/live.mjs`](../tests/live.mjs)): CORS, som van de soort-facet, alles in een onderzoeksgebied, binnen Orvelte, datering, en dat *terp* geen waterput vindt.

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

Facetten: soort, provincie, gemeente, juridische status, functie, type, materiaal, periode (begin) en vertrouwelijkheid. Binnen een facet geldt *of*, tussen facetten *en*.

### Datering

Twee velden, *vanaf* en *tot*, met jaren voor Christus als negatief getal (of "500 v.Chr."). Een object telt mee als zijn datering overlapt: `eindjaar >= vanaf` en `beginjaar <= tot`. Bij archeologie zijn dat de jaren van de ABR-periode, bij monumenten de jaren van gebeurtenissen (bouw, verbouwing, restauratie). Een monument met meerdere gebeurtenissen telt mee als één jaar past. Het filter geldt ook voor de facetten. In de URL: `?van=-12&tot=450`.

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

### Resultaatkaart

- Kop: de naam of locatienaam; zonder naam het type of de functie met het adres.
- Gegevens, alleen als ze er zijn: adres, plaats, gemeente, provincie, functie, type, typegroep, materiaal, stijl, periode (met jaartallen), maker en rol, aantal, status, aard, waardering, vertrouwelijkheid, verwerving, toestand en inschrijvingsdatum.
- ABR-labels als "aardewerk:onbepaald" staan in de weergave als "aardewerk: onbepaald". De facetten en filters gebruiken de oorspronkelijke waarde.
- Een thumbnail uit de beeldbank (`afbeelding`). Laadt die niet, dan valt hij weg. Op 21 oktober 2026 was `images.memorix.nl` tijdelijk offline ("vanwege recent bekendgemaakte beveiligingsproblemen in PHP").
- Links: *Linked Data (CHO)* naar het volledige object, en de registers uit `rdfs:seeAlso` (Monumentenregister, Kennisbank, UNESCO).

### Overig

- De vooraf berekende telling per gezicht of werelderfgoed (`gebieden.json` in de SDO-demo) zit er niet in.
- Gemarkeerde zoektermen behouden de spatie erna. In de SDO-demo viel die weg ("KERKGEBOUWuit").
- De CSV heeft 19 kolommen: soort, nummer, naam, adres, plaats, gemeente, provincie, functie, type, materiaal, begin- en eindperiode, begin- en eindjaar, juridische status, vertrouwelijkheid, Linked Data, register en omschrijving.

## Beveiliging en publicatie

Zoals in de SDO-demo ([`web/_headers`](../web/_headers)): Content-Security-Policy, `frame-ancestors 'none'`, `noindex`, en geen HTML uit de bron in de pagina. Links gaan alleen naar http(s) en bekende registers, CSV-cellen worden beschermd tegen formules, en een schuine streep in de zoekvraag wordt geen reguliere expressie. Nieuw in de CSP: `img-src https://images.memorix.nl` voor de thumbnails.

## Online zetten

Net als de andere demo's: een Cloudflare Worker die alleen de bestanden uit `web/` serveert ([`wrangler.jsonc`](../wrangler.jsonc), naam `erfgoed-cho-zoekdemo`). Hij staat online sinds 21 oktober 2026, op <https://erfgoed-cho-zoekdemo.jolietjakeblues64.workers.dev/>. Een onbekende URL geeft `web/404.html`.

**Automatisch via Workers Builds.** Koppel de repository in het Cloudflare-dashboard, net als bij de SDO-demo:

1. **Workers & Pages** → **erfgoed-cho-zoekdemo** → **Settings** → **Builds** → **Connect**.
2. Kies de GitHub-repository van dit project, branch `main`.
3. Laat *Build command* leeg. *Deploy command*: `npx wrangler deploy`. *Root directory*: `/`.

Daarna wordt elke push naar `main` automatisch gepubliceerd, en krijgen andere branches een preview-URL. De eerste versie is op 21 oktober met de hand gepubliceerd; de koppeling moet nog worden gemaakt.

Met de hand publiceren kan ook:

```bash
npx wrangler deploy
```
