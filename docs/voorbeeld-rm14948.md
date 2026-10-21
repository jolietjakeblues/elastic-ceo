# Voorbeeld: rijksmonument 14948

De Hervormde Kerk aan de Grote Molenstraat 2 in Elst (CHOI 59284), van CEO in `rce/cho` naar één document in de projectie. Uitvoer van `construct/alles.rq` op 19 oktober 2026:

```bash
node tests/objecten.mjs construct/alles.rq https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/rijksmonument/59284
```

## In `rce/cho`: 7 knopen en 55 beelden

```text
rijksmonument/59284
 ├─ heeftBasisregistratieRelatie → basisregistratierelatie/68398
 │    ├─ heeftBAGRelatie → bagrelatie/10027938   (adres, postcode, woonplaats Elst)
 │    ├─ heeftBRKRelatie → brkrelatie/57805      (kadastrale gemeente Elst, sectie K, perceel 542)
 │    ├─ heeftGemeente   → owms:Overbetuwe
 │    └─ heeftProvincie  → owms:Gelderland
 ├─ heeftGeometrie → geometrie/24289             (WGS84 en RD, kwaliteit, status, herkomst)
 ├─ heeftKennisregistratie / heeftOorspronkelijkeFunctie → functie/147472 → rn:… "Kerk"
 ├─ heeftKennisregistratie / heeftOmschrijving → omschrijving/196994 ("Herv. Kerk. Bouwwerk in …")
 ├─ heeftJuridischeStatus → rn:… "rijksmonument"
 ├─ heeftMonumentAard → rn:… "onroerend gebouwd"
 └─ heeftBebouwdeKomType → rn:… "onbekend"
graph image: 55 × edm:ProvidedCHO met edm:aggregatedCHO → dit monument
```

Dit monument heeft geen `ceo:heeftNaam`, en er verwijst geen complex of archeologisch terrein naar.

## In de projectie: één subject, 37 velden

```turtle
PREFIX ceo:         <https://linkeddata.cultureelerfgoed.nl/def/ceo#>
PREFIX ceo-elastic: <https://linkeddata.cultureelerfgoed.nl/def/ceo-elastic#>
PREFIX geo:         <http://www.opengis.net/ont/geosparql#>
PREFIX rdfs:        <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:         <http://www.w3.org/2001/XMLSchema#>
PREFIX rn:          <https://data.cultureelerfgoed.nl/term/id/rn/2/>
PREFIX owms:        <http://standaarden.overheid.nl/owms/terms/>

<https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/rijksmonument/59284>
    ceo-elastic:klasse ceo:Rijksmonument ;                                    # rdf:type in CEO

    # CEO-naam, staat in CEO al op het object
    ceo-elastic:rijksmonumentnummer "14948" ;
    ceo-elastic:cultuurhistorischObjectnummer "59284" ;
    ceo-elastic:datumInschrijvingInMonumentenregister "1970-02-10"^^xsd:date ;
    ceo-elastic:registratiedatum "2021-11-25"^^xsd:date ;
    ceo-elastic:internationaalKenteken true ;
    ceo-elastic:kadasterdeel "82970" ;
    ceo-elastic:kadasterdeelnummer "182" ;

    # CEO-naam, laatste stap van een pad
    ceo-elastic:omschrijving "Herv. Kerk. Bouwwerk in late Nederrijnse gotiek, …" ;   # heeftOmschrijving/ceo:omschrijving, formeel
    ceo-elastic:volledigAdres "Grote Molenstraat 2" ;                                 # …/heeftBAGRelatie/ceo:volledigAdres
    ceo-elastic:openbareRuimte "Grote Molenstraat" ;
    ceo-elastic:huisnummer "2" ;
    ceo-elastic:postcode "6661DJ" ;
    ceo-elastic:woonplaatsnaam "Elst" ;
    ceo-elastic:verblijfsobjectIdentificatie "1734010000027841" ;
    ceo-elastic:heeftVerblijfsobject <http://bag.basisregistraties.overheid.nl/bag/id/verblijfsobject/1734010000027841> ;
    ceo-elastic:sectie "K" ;                                                          # …/heeftBRKRelatie/ceo:sectie
    ceo-elastic:perceelnummer "542" ;
    geo:asWKT "MultiPolygon (((5.849337668182876 51.91972590566878, …)))" ;          # heeftGeometrie/geo:asWKT

    # begrippen: URI met de CEO-naam …
    ceo-elastic:heeftJuridischeStatus rn:b2d9a59a-fe1e-4552-9a05-3c2acddff864 ;
    ceo-elastic:heeftMonumentAard     rn:fc966a68-8863-4970-a83e-110f96006c21 ;
    ceo-elastic:heeftBebouwdeKomType  rn:a273be15-311e-4246-b99e-52c2efd97a77 ;
    ceo-elastic:heeftFunctieNaam      rn:6fa5f251-cd84-4f3a-acb7-7c219df2540f ;     # heeftKennisregistratie/ceo:heeftFunctieNaam
    ceo-elastic:heeftGemeente  owms:Overbetuwe ;
    ceo-elastic:heeftProvincie owms:Gelderland ;

    # … en het label met een eigen naam
    ceo-elastic:juridischeStatus "rijksmonument" ;
    ceo-elastic:monumentAard "onroerend gebouwd" ;
    ceo-elastic:bebouwdeKomType "onbekend" ;
    ceo-elastic:functie "Kerk" ;
    ceo-elastic:hoofdfunctie "Kerk" ;
    ceo-elastic:oorspronkelijkeFunctie "Kerk" ;
    ceo-elastic:gemeente "Overbetuwe" ;
    ceo-elastic:provincie "Gelderland" ;

    # botsing: eigen naam
    ceo-elastic:kadastraleGemeente "Elst" ;        # BRK ceo:gemeentenaam, niet de gemeente (Overbetuwe)

    # beelden en register
    ceo-elastic:aantalBeelden 55 ;
    ceo-elastic:afbeelding <https://images.memorix.nl/rce/thumb/640x480/f28d6ff0-7152-9969-53d1-81f71707c88a.jpg> ;
    rdfs:seeAlso <https://monumentenregister.cultureelerfgoed.nl/monumenten/14948> .
```

## Wat dit monument laat zien

- **Botsing.** BRK `ceo:gemeentenaam` is "Elst", maar de gemeente is Overbetuwe. Plat op `ceo-elastic:gemeentenaam` zou het facet Gemeente "Elst" en "Overbetuwe" geven. Daarom `ceo-elastic:kadastraleGemeente`.
- **Drie registratiedata.** Het monument heeft 2021-11-25, de omschrijving 2018-07-20 en de functie 1990-02-05. Alleen die van het object gaat mee.
- **Eén functie, twee paden.** `heeftKennisregistratie` en `heeftOorspronkelijkeFunctie` wijzen naar dezelfde `functie/147472`. De CONSTRUCT levert elke triple één keer, dus "Kerk" staat niet dubbel in `ceo-elastic:functie`.
- **Formeel standpunt.** De omschrijving is formeel en staat dus in `ceo-elastic:omschrijving`.

## Weggelaten (blijft in `rce/cho`)

- kennisregistratienummers, `formeelStandpunt`, omschrijvingstype
- de registratiedata van de functie en de omschrijving
- de nummers van de BAG-, BRK- en basisregistratierelatie
- `provinciecode` "GE" (dubbel met de provincie)
- geometrienummer, herkomst, kwaliteit en status van de geometrie, `asWKT-RD`
- 54 van de 55 beelden: alleen het aantal en één afbeelding

## Ter vergelijking: `Erfgoed-sdo-nl3`

In de huidige schema.org-index heeft dit monument 11 velden: `additionalType` ("Kerk"), `address`, `addressLocality` ("Elst"), `addressRegion`, `category`, `description`, `identifier`, `postalCode`, `sameAs`, `geo:asWKT` en `rdf:type`. Juridische status, gemeente, hoofdfunctie en oorspronkelijke functie, inschrijvingsdatum, kadaster, BAG-identificatie, beelden en de begrip-URI's ontbreken daar.

## Andere voorbeelden

Getest op 19 oktober 2026 met `tests/objecten.mjs`:

| Object | Velden | Opvallend |
|---|---:|---|
| `rijksmonument/74775` (St. Dionysiuskerk, Tilburg) | 44 | 15 actoren (o.a. Cuypers, P.J.), gebeurtenissen vervaardiging, verbouwing en restauratie, stijl Neo-Gotiek en Traditionalisme, `ceo-elastic:isOnderdeelVanComplex`, beginjaar 1835, 1903 en 1966 en eindjaar 1938, 1903 en 1966 (drie gebeurtenissen in één veld). Geen rol in de bron. |
| `rijksmonument/33398` (Wiebengahal) | 39 | `beginjaar`/`eindjaar` 1912 uit `ceo:datum` |
| `rijksmonument/18717` | 45 | actor Kramer, Hendrik met rol "architect / bouwkundige / constructeur" |
| `complex/62476` (Rijnoord) | 10 | 5 × `ceo-elastic:heeftRijksmonument`, `ceo-elastic:buitenplaats` (uit `ceox:RCEBuitenplaats`) |
| `gezicht/10134173` (Kamerik) | 12 | type "III. Het dorp" (rn-label), link naar de Kennisbank |
| `werelderfgoed/10134675` (Hollandse Waterlinies) | 11 | zone "kernzone"; `10134674` is de bufferzone |
| `archeologischterrein/10123020` | 10 | omschrijving "Landweer", ligt in `rijksmonument/45708`, geleende geometrie |
| `vondstlocatie/10032284` | 15 | twee verwervingen, geleende geometrie van het onderzoeksgebied |
| `archeologischcomplex/10000011` | 13 | Bronstijd – Nieuwe Tijd, −2000 tot 1945 |
| `grondsporen/10000026` | 15 | greppel / sloot, Romeinse Tijd, −12 tot 449, onderzoeksgebied via de vondstlocatie |
| `vondsten/10000096` | 19 | vaatwerk, keramiek (groep anorganisch), 90 stuks |
