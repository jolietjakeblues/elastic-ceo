# Achtergrond: waarom een zoekprojectie

De vraag was: kan Elasticsearch rechtstreeks op de CHO-kennisdata (`rce/cho`, gemodelleerd naar CEO), voor monumenten én archeologie? Hieronder staat wat de opties zijn en waarom het een projectie is geworden.

## Hoe een TriplyDB-Elasticsearch-service werkt

Een Elastic-service in TriplyDB maakt van elke **subject** in de dataset één document. De properties worden velden, met een spatie in plaats van een punt (`https://linkeddata cultureelerfgoed nl/def/ceo#naam`). Een waarde die een URI is, blijft een URI-tekst. Elasticsearch doet geen joins. Wat niet in hetzelfde document staat, kun je dus niet samen vinden, niet samen tellen en niet in één Booleaanse zoekvraag gebruiken.

De configuratie van een service bestaat uit index- en component-templates (mappings, analyzers). Ingest-pipelines of `nested`-documenten zijn er niet. Een template wordt alleen gelezen als je de service aanmaakt.

## Optie 1: een Elastic-service rechtstreeks op `rce/cho`

Gemeten op 19 oktober 2026 (zie [cho-data.md](cho-data.md)): 59,5 mln triples, 34 graphs, 8,5 mln subjecten in `instanties-rce` en 416 verschillende predicaten. Er stond alleen een Virtuoso-service op.

In CEO staat bijna niets doorzoekbaars op het object zelf:

| Object | Wat je wilt vinden | Afstand tot het object |
|---|---|---|
| Rijksmonument | naam, omschrijving | 2 stappen (`heeftNaam/naam`, `heeftOmschrijving/omschrijving`) |
| Rijksmonument | functie | 3 stappen (`heeftKennisregistratie` → `heeftFunctieNaam` → label van een rn-begrip) |
| Rijksmonument | plaats, provincie | 3–4 stappen (`heeftBasisregistratieRelatie/heeftBAGRelatie/woonplaatsnaam`; provincie-label in graph `owms`) |
| Alle | geometrie | 2 stappen (`heeftGeometrie/asWKT`); de Geometrie-knoop verwijst **niet** terug naar het object |
| Vondst | type, materiaal | 3 stappen (`heeftType/heeftTypeNaam` → rn-begrip → label in ABR) |
| Vondst | periode, jaartal | 4–5 stappen (`heeftGebeurtenis/heeftDatering/heeftBeginDatering/heeftPeriode` → ABR-jaar) |

Wat dat in een index betekent:

- Zoek je op *Domtoren*, dan vind je een `Omschrijving`-document en niet het monument. Dat is nog te herstellen: alle 3,3 mln kennisregistraties hebben `ceo:heeftBetrekkingOp` naar het object, dus met `collapse` op dat veld kom je terug bij het object.
- Zoek je op *bijl* of *aardewerk*, dan vind je een thesaurusbegrip. Daarna moet je alle Type-knopen met dat begrip zoeken, en dan de vondsten. Dat zijn drie requests, en één begrip kan aan meer dan 100.000 vondsten hangen. **Voor archeologie werkt dit niet.**
- Facetten tellen knopen, geen objecten. `kasteel AND Utrecht` kan niet, want de twee woorden staan in verschillende documenten.
- Ruimtelijk zoeken geeft Geometrie-knopen. Per treffer is een extra omgekeerde zoekactie nodig.
- Er komen ongeveer 10 mln documenten in de gezaghebbende productiedataset, inclusief de image-, print- en tooi-graphs. Met 416 predicaten maal `text`, `.keyword` en `.exact` kom je ook boven de standaardgrens van 1.000 velden per index.

Conclusie: rechtstreeks kan wel, maar dan doorzoek je de registratiestructuur van CEO en niet de erfgoedobjecten.

## Optie 2: schema.org (zoals de huidige demo's)

`erfgoed-sdo` en `archeologie-sdo` zijn al CONSTRUCTs op `rce/cho`. Een tussenstap is dus niet het probleem. Het nadeel is schema.org zelf: alles moet in een paar algemene properties (`name`, `description`, `additionalType`, `category`). Een rijksmonument heeft in `Erfgoed-sdo-nl3` 11 velden. Juridische status, gemeente naast kadastrale gemeente, hoofdfunctie, oorspronkelijke functie, bouwkundige staat, architect, inschrijvingsdatum en de begrip-URI's ontbreken of worden op één hoop gegooid.

## Optie 3: een eigen Elasticsearch buiten Triply

Een script haalt per object de CEO-boom op en indexeert die als geneste JSON (`nested`). Dan blijft de samenhang binnen herhaalde registraties bewaard: functie A met datum x, functie B met datum y. Dat valt af: **een eigen Elastic is in de huidige opzet niet haalbaar**. Het moet met Triply.

## Gekozen: een zoekprojectie in CEO-termen

- Een nieuwe dataset met **één subject per erfgoedobject**, gebouwd met één CONSTRUCT op `rce/cho`. Daarop komt een Elastic-service.
- Het subject is de cho-kennis-URI, dus wie doorklikt komt bij het volledige object in `rce/cho`. De projectie is een **zoeksleutel, geen tweede bron**: alle registratiestructuur blijft in `rce/cho`.
- Alle velden komen in **`ceo-elastic:`**. Een veld uit CEO houdt de lokale naam van zijn CEO-property (`ceo-elastic:naam`, `ceo-elastic:heeftTypeNaam`). Labels van begrippen en afgeleide velden krijgen een eigen naam (`ceo-elastic:type`, `ceo-elastic:beginjaar`).
- Er gaan ca. 1,2 mln objecten in (tien klassen), tegenover ca. 10 mln documenten bij optie 1.

## Wat verloren gaat bij plat maken

Dit verlies is er ook met CEO-namen, en met Triply is het niet te vermijden:

- **Samenhang binnen herhaalde registraties.** Een monument met twee functies, elk met een eigen datum en `formeelStandpunt`, wordt "functie: A, B" en "datum: x, y". Bij meerdere gebeurtenissen (bouw 1866, verbouwing 1920) staan alle jaren in hetzelfde veld.
- **Registratiemetadata** (kennisregistratienummers, registratiedata van deelregistraties, herkomst en kwaliteit van de geometrie) gaat niet mee.

Wat alleen samen betekenis heeft, haalt een voorkant bij het detail op uit `rce/cho`.

Zie [besluiten.md](besluiten.md) voor de afzonderlijke keuzes en [schema.md](schema.md) voor de velden.
