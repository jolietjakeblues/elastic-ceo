## Dataset: Erfgoed – zoekprojectie van CHO

**Status**
Experiment. Bouw hier geen toepassingen op. Inhoud, velden en naam kunnen zonder aankondiging veranderen.

**Uitgever**
Rijksdienst voor het Cultureel Erfgoed (RCE)
Meer informatie: https://www.cultureelerfgoed.nl

**Beschrijving**
Deze dataset is afgeleid van de dataset [CHO – Cultuurhistorische Objecten](https://linkeddata.cultureelerfgoed.nl/rce/cho). De objecten zijn dezelfde, maar elk object heeft hier één platte beschrijving. Zo kun je objecten met één zoekvraag vinden, filteren en tellen.

De dataset bevat:
- rijksmonumenten, ook objecten die geen rijksmonument meer zijn, en complexen;
- stads- en dorpsgezichten en werelderfgoed, met kern- en bufferzones;
- archeologische terreinen, onderzoeksgebieden, vondstlocaties, archeologische complexen, grondsporen en vondsten.

Samen zijn dat ongeveer 1,2 miljoen objecten (stand oktober 2026).

**Opbouw**
- Elk object heeft dezelfde URI als in CHO (`https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/…`).
- Gegevens die in CHO via tussenliggende registraties aan het object hangen, staan hier direct op het object. Het gaat om naam, omschrijving, functie, type, materiaal, stijl, datering, adres, kadaster en geometrie.
- Begrippen staan er twee keer in: als URI (rn, ABR, OWMS) en als label.
- Velden houden de naam van de CEO-property waar ze vandaan komen, maar staan in een eigen namespace.
- Jaartallen staan als getal, negatief voor jaren vóór Christus. Geometrie staat in WGS84 (`geo:asWKT`).
- Registratiegegevens zijn weggelaten: kennisregistratienummers, formeel standpunt, registratiedata van deelregistraties, herkomst en kwaliteit van de geometrie en RD-coördinaten.

**Wat deze dataset niet is**
Dit is geen gezaghebbende registratie en geen data volgens de Cultureel Erfgoed Ontologie (CEO). Doordat alles plat is gemaakt, gaat de samenhang binnen herhaalde registraties verloren. Je ziet bijvoorbeeld niet welk jaartal bij welke gebeurtenis hoort. Voor de volledige en gezaghebbende gegevens volg je de URI van het object naar CHO.

**Totstandkoming**
De dataset is gemaakt met CONSTRUCT-queries op `rce/cho`, gedraaid als query-jobs.

**Actualisatie**
Handmatig, zonder vaste frequentie. CHO wordt dagelijks bijgewerkt, dus deze dataset kan achterlopen.

**Licentie**
Attribution 4.0 International (CC BY 4.0), zoals de brondata in CHO.

**Relatie tot andere datasets**
- Bron: [rce/cho](https://linkeddata.cultureelerfgoed.nl/rce/cho)
- Vergelijkbaar, maar in schema.org en met een deel van de objecten: [rce/erfgoed-sdo](https://linkeddata.cultureelerfgoed.nl/rce/erfgoed-sdo) en [rce/archeologie-sdo](https://linkeddata.cultureelerfgoed.nl/rce/archeologie-sdo)

**Trefwoorden**
Cultureel erfgoed, rijksmonumenten, archeologie, beschermde gezichten, werelderfgoed, vondsten, zoeken, Linked Open Data, Nederland.
