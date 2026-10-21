# Taalanalyse

Hoe tekst in de index wordt opgesplitst en genormaliseerd, en waarom het anders is dan in `Erfgoed-sdo-nl3`.

De analyse staat in [`triply/nl-analyse.json`](../triply/nl-analyse.json) en komt via [`triply/maak-service.mjs`](../triply/maak-service.mjs) in de index template. [`triply/nl-analyse-nl3.json`](../triply/nl-analyse-nl3.json) is een ongewijzigde kopie van de analyse in `Erfgoed-sdo-nl3` (versie 3, zie de README van elastic-erfgoed). Die dient alleen als referentie voor de vergelijking.

## Uitgangspunt: de analyse van `Erfgoed-sdo-nl3`

| Analyzer | Filters | Gebruikt voor |
|---|---|---|
| `nl_index` | kleine letters, accenten weg, samenstellingen splitsen, vaste meervouden, stopwoorden, stemmer `dutch_kp` | tekstvelden, bij indexeren |
| `nl_zoeken` | idem, maar zonder splitsen en met synoniemen en zoekuitbreiding | tekstvelden, bij zoeken |
| `nl_exact` | kleine letters, accenten weg | adres, plaats, labels van begrippen, `.exact` |

Die analyse is afgestemd op monumenten. Bij de archeologie gaan er vier dingen mis (gemeten op 19 oktober 2026).

### 1. Woorddelen die midden in andere woorden zitten

De splitser (`dictionary_decompounder`) zoekt een woord uit de lijst overal in een token, ook midden in een ander woord. Bij een paar woorden levert dat vooral valse treffers op. De aantallen geven aan hoe vaak het woord in het testcorpus voorkomt (zie verderop):

| Deel | Echte samenstellingen | Valse treffers |
|---|---|---|
| `terp` | huisterp 208, terplagen 44, dorpsterp 25, terpzool 10 | **waterput 344**, geïnterpreteerd 138, vensterpartij 41, waterpartij 35, waterpomp 15, waterpoort 10, oosterpark, priesterpolder |
| `kapel` | doopkapel 38, grafkapel 17, zijkapellen 11, mariakapel 8 | **dakkapel 553, dakkapellen 291**, kapelanie 8, Oostkapelle 5 |
| `graf` (stond niet in de lijst) | grafheuvel 171, grafmonument 83, crematiegraf 47, grafkuil 9 | topografische 87, geografische 56, stratigrafie 30, gefotografeerd 16, grafelijke 6 |
| `paal` (stond niet in de lijst) | paalkuil 411, paalgat 363, paalsporen 103, grenspaal 38 | **onbepaald 5.212**, bepaald 208, opaal |

`terp` en `kapel` staan wel in de lijst van nl3. Daardoor geeft zoeken op *terp* in de live demo bovenaan WATERPUT (2.559 treffers in `Erfgoed-sdo-nl3`).

### 2. Meervouden die de stemmer anders afkapt dan het enkelvoud

`dutch_kp` maakt van *paalgaten* `paalgaat` (en van *paalgat* `paalgat`), van *graven* `graaf`, van *crematiegraven* `crematiegraaf` en van *urnenvelden* `urnenvel`. Enkelvoud en meervoud vinden elkaar dan niet.

### 3. Begrippen die in de data anders heten dan waar mensen op zoeken

- Materiaal **keramiek** (207.706 vondsten) stond los van de typen met **aardewerk** ("Aardewerk, handgevormd", "roodbakkend aardewerk", pingsdorfaardewerk).
- ABR gebruikt **megalietgraf**, terwijl mensen op **hunebed** zoeken.

### 4. ABR-labels met een dubbele punt

"roodbakkend aardewerk:kom" en "handgevormd:onbepaald" blijven één token, omdat de tokenizer niet splitst op een dubbele punt tussen letters. Zoeken op *kom* of *onbepaald* vindt die labels dan niet.

## Wat er veranderd is

| Onderdeel | nl3 | ceo-elastic |
|---|---|---|
| tekenfilter | — | `dubbele_punt`: `:` wordt een spatie (in `nl_index`, `nl_zoeken` en `nl_exact`) |
| samenstellingen (`nl_samenstellingen`) | 32 woorden, waaronder `terp` en `kapel` | `terp` en `kapel` eruit; `kuil`, `greppel`, `aardewerk`, `keramiek`, `haard` en `schrabber` erbij (36 woorden) |
| splitsen met een voorwaarde | — | een eigen splitser per riskant woorddeel. Die wordt alleen toegepast als een conditie (Painless-script) klopt, zie de tabel hieronder |
| meervouden (`nl_meervoud`) | 7 regels | 12 regels erbij: paalgat, paalspoor, graf/graven, crematiegraf, inhumatiegraf, vlakgraf, familiegraf, kindergraf, diergraf, dierengraf, urnenveld, grafveld |
| volgorde in `nl_index` | eerst splitsen, dan meervoud | meervoud, splitsen, meervoud. De eerste ronde is voor hele woorden: *crematiegraven* wordt `crematiegraf` en levert daarna ook `graf` op. De tweede ronde is voor de afgesplitste delen: `molen` uit *windmolens* blijft `molen`. |
| synoniemen (`erfgoed_synoniemen`) | 9 regels | 2 erbij: `keramiek => keramiek, aardewerk, steengoed, porselein, faience, fayence` (één richting, want aardewerk is een soort keramiek) en `hunebed, megalietgraf` |

| Splitser | Wordt toegepast als het token … |
|---|---|
| `nl_terp` | begint met *terp* (maar niet met *terpentijn*), of eindigt op *terp* of *terpen* |
| `nl_graf` | begint met *graf* (maar niet met *grafelijk*, *grafisch*, *grafiek*, *graficus* of *grafiet*, en niet precies *graft* is), of eindigt op *graf* |
| `nl_paal` | begint met *paal*, of eindigt op *paal* (maar niet *opaal* is) |
| `nl_kapel` | geen *dakkapel* bevat, niet begint met *kapela* (kapelaan, kapelanie) en niet eindigt op *kapelle* (Oostkapelle) |

De condities zijn afgeleid van de woorden die in het testcorpus voorkomen. De uitzonderingen markeren met een `keyword_marker` werkt niet, want de splitser negeert die markering.

## Testcorpus en vergelijking

[`tests/corpus.mjs`](../tests/corpus.mjs) haalt een vaste steekproef van 23.490 objecten uit `construct/alles.rq`: 6.000 rijksmonumenten, 1.000 complexen, alle 472 gezichten en 18 werelderfgoederen, 2.000 terreinen, 1.500 onderzoeksgebieden, 1.500 vondstlocaties, 3.000 archeologische complexen, 3.000 grondsporen en 5.000 vondsten. Dat duurt zo'n 2,5 minuut en levert 93 MB op.

[`tests/vergelijk-analyse.mjs`](../tests/vergelijk-analyse.mjs) zet het corpus in twee lokale indexen: één met de nl3-analyse en één met de nieuwe. Daarna zoekt het in alle 16 tekstvelden, net als het zoekveld *Alles*. Per zoekvraag toont het welke woorden in de eerste 100 treffers gemarkeerd werden.

```bash
node tests/corpus.mjs corpus.ndjson
```

```bash
node tests/vergelijk-analyse.mjs corpus.ndjson
```

Allebei hebben ze een lokale Elasticsearch nodig (zie [elastic-document.md](elastic-document.md#lokaal-testen)).

Uitkomst op 19 oktober 2026. Per zoekvraag staat het aantal treffers, en per gemarkeerd woord in hoeveel van de eerste 100 treffers het voorkwam:

| Groep | Zoekvraag | nl3 | nieuw | Gemarkeerd (nl3) | Gemarkeerd (nieuw) |
|---|---|---:|---:|---|---|
| archeologie | `terp` | 1367 | 753 | wierde 75, terp 59, priesterpolder 3, oosterpark 2, terplagen 2, wierden 2 | terp 71, wierde 66, huisterp 5, wierden 2, wier 1, terpzigt 1 |
| archeologie | `terpen` | 1171 | 541 | terp 35, waterput 25, huisterp 7, priesterpolder 4, oosterpark 3, terplagen 3 | terp 83, huisterp 17, terpen 7, slappeterp 5, terplagen 3, terprestant 2 |
| archeologie | `wierde` | 1367 | 753 | wierde 75, terp 59, priesterpolder 3, oosterpark 2, terplagen 2, wierden 2 | terp 71, wierde 66, huisterp 5, wierden 2, wier 1, terpzigt 1 |
| archeologie | `paal` | 193 | 831 | palen 56, paal 44, paaltjes 6, palig 1, paaltje 1 | paalkuil 30, paalgat 29, palen 28, stoeppaal 17, grenspaal 16, paal 10 |
| archeologie | `paalgat` | 363 | 384 | paalgat 100 | paalgat 85, paalgaten 18 |
| archeologie | `paalgaten` | 24 | 384 | paalgaten 24 | paalgat 85, paalgaten 18 |
| archeologie | `kuil` | 788 | 1325 | kuil 96, kuilen 29, kuiltje 1 | kuil 84, afvalkuil 30, kuilen 26, haardkuil 18, meilerkuil 10, kuiler 3 |
| archeologie | `greppel` | 869 | 922 | greppel 79, greppels 44, greppeltje 1 | greppel 79, greppels 43, kringgreppel 16, huisgreppel 6, kringgreppels 4, standgreppel 3 |
| archeologie | `graf` | 97 | 589 | graf 91, graft 4, graften 2 | grafheuvel 30, grafheuvels 27, graf 20, crematiegraf 11, grafmonument 9, graven 8 |
| archeologie | `graven` | 245 | 589 | graven 56, gegraven 30, graaf 16, gegraaf 1, gravend 1 | grafheuvel 30, grafheuvels 27, graf 20, crematiegraf 11, grafmonument 9, graven 8 |
| archeologie | `crematiegraven` | 7 | 43 | crematiegraven 7 | crematiegraf 38, crematiegraven 7 |
| archeologie | `urnenvelden` | 5 | 69 | urnenvelden 5 | urnenveld 67, urnenvelden 5 |
| archeologie | `hunebed` | 21 | 22 | hunebed 19, hunebedden 4 | hunebed 19, hunebedden 4, megalietgraf 2 |
| archeologie | `aardewerk` | 1574 | 2570 | aardewerk 100 | aardewerk 99, pingsdorfaardewerk 5, aardewerknijverheid 1, aardewerkproduktie 1, sieraardewerk 1, aardewerkvindplaats 1 |
| archeologie | `keramiek` | 2525 | 3211 | keramiek 99, keramieken 1 | aardewerk 95, keramiek 61, steengoed 9, faience 3, pingsdorfaardewerk 3, bouwkeramiek 3 |
| archeologie | `haard` | 35 | 118 | haard 33, haardje 2 | haard 33, haardkuil 20, haardkuilen 13, haardplaats 8, haardpartij 5, haardplaatsen 4 |
| archeologie | `schrabber` | 40 | 42 | schrabber 39, schrabbers 1 | schrabber 39, klingschrabber 5, afslagschrabber 4, dubbelschrabber 2, zijschrabber 1, duimnagelschrabber 1 |
| archeologie | `scherven` | 228 | 228 | scherven 76, scherf 31, scherfjes 2 | scherven 76, scherf 31, scherfjes 2 |
| archeologie | `waterput` | 321 | 321 | waterput 97, waterputten 10 | waterput 99, waterputten 8 |
| archeologie | `kom` | 240 | 240 | kom 99, kommetje 1, kommen 1 | kom 100, kommetje 1 |
| archeologie | `grape` | 42 | 42 | grape 41, grapes 1 | grape 41, grapes 1 |
| archeologie | `onbepaald` | 1470 | 1484 | onbepaald 100 | onbepaald 100 |
| monument | `kapel` | 830 | 262 | kapel 78, kapelletje 5, kapelle 4, kapelweg 3, blauwkapel 3, kapelstraat 3 | kapel 86, kapellen 6, kapelletje 5, grafkapel 2, kerkhofkapel 2, kapelweg 2 |
| monument | `kapellen` | 830 | 262 | kapel 78, kapelletje 5, kapelle 4, kapelweg 3, blauwkapel 3, kapelstraat 3 | kapel 86, kapellen 6, kapelletje 5, grafkapel 2, kerkhofkapel 2, kapelweg 2 |
| monument | `dakkapel` | 593 | 593 | dakkapel 93, dakkapellen 10 | dakkapel 93, dakkapellen 10 |
| monument | `kerk` | 684 | 684 | kerk 100, zaalkerk 10, kerkgebouw 9, kruiskerk 8, kerktoren 6, parochiekerk 4 | kerk 100, zaalkerk 9, kerkgebouw 9, kruiskerk 8, kerktoren 5, parochiekerk 4 |
| monument | `molen` | 347 | 347 | molen 85, korenmolen 18, poldermolen 13, stellingmolen 5, molenaar 4, monnikmolen 4 | molen 85, korenmolen 18, poldermolen 14, stellingmolen 5, molenaar 4, monnikmolen 4 |
| monument | `toren` | 936 | 936 | toren 68, kerktoren 21, torenuurwerk 19, indicatoren 16, watertoren 13, torens 5 | toren 67, kerktoren 21, torenuurwerk 18, indicatoren 17, watertoren 13, torens 5 |
| monument | `kasteel` | 409 | 409 | kasteel 100, kasteelweg 1, kasteelterrein 1, kasteeltje 1 | kasteel 100, kasteelweg 1, kasteelterrein 1, kasteeltje 1 |
| monument | `fort` | 128 | 128 | fort 74, forten 35, fortificatie 5, hackfort 5, fortdijk 2, hackfortse 2 | fort 74, forten 35, fortificatie 5, hackfort 5, fortdijk 2, hackfortse 2 |
| monument | `grafmonument` | 41 | 41 | grafmonument 28, grafmonumenten 17 | grafmonument 28, grafmonumenten 17 |
| monument | `waterpomp` | 9 | 9 | waterpomp 9 | waterpomp 9 |
| monument | `boerderij` | 1247 | 1247 | boerderij 97, langhuisboerderij 9, hallehuisboerderij 6, stolpboerderij 6, boerderijen 5, langgevelboerderij 3 | boerderij 97, langhuisboerderij 9, hallehuisboerderij 6, stolpboerderij 6, boerderijen 5, langgevelboerderij 3 |
| monument | `woning` | 7258 | 7258 | woonhuis 48, woning 46, woningen 41, geschenkwoning 10, woningcomplex 5, arbeiderswoning 5 | woonhuis 48, woning 46, woningen 41, geschenkwoning 10, woningcomplex 5, arbeiderswoning 5 |
| monument | `Lekkerkerk` | 2 | 2 | lekkerkerk 2 | lekkerkerk 2 |
| monument | `Kerkstraat` | 50 | 50 | kerkstraat 50 | kerkstraat 50 |
| monument | `dijk` | 261 | 261 | dijk 85, zeedijk 10, lekdijk 7, dijken 5, waaldijk 4, maasdijk 3 | dijk 85, zeedijk 10, lekdijk 7, dijken 5, waaldijk 4, maasdijk 3 |

Wat de tabel laat zien:

- **terp / wierde:** van 1.367 naar 753 treffers. Wat wegvalt zijn waterputten, waterpartijen, geïnterpreteerd, oosterpark en priesterpolder. In de eerste 100 treffers worden nu alleen terpen en wierden gemarkeerd.
- **kapel:** van 830 naar 262. Dat verschil komt helemaal door dakkapellen. Laat je dakkapel en verwante woorden weg, dan is het 214 bij nl3 tegen 213 nieuw.
- **paal, kuil, graf, haard, aardewerk, keramiek:** veel meer treffers, en de gemarkeerde woorden zijn echte samenstellingen (paalkuil, afvalkuil, crematiegraf, haardkuil, pingsdorfaardewerk).
- **meervouden:** *paalgaten* van 24 naar 384, *urnenvelden* van 5 naar 69, *crematiegraven* van 7 naar 43. Enkelvoud en meervoud vinden nu elkaar.
- **graven:** vindt nu graven in de zin van graf, en niet meer *gegraven* of *graaf*.
- **monumentwoorden** (*kerk, molen, toren, kasteel, fort, boerderij, woning, dijk, grafmonument, waterpomp, Lekkerkerk, Kerkstraat*): hetzelfde aantal als bij nl3.
- **kom, grape, onbepaald:** in deze steekproef nauwelijks verschil, omdat er weinig labels met een dubbele punt in staan. Met `_analyze` is gecontroleerd dat het filter werkt: "roodbakkend aardewerk:kom" wordt nu `roodbak aardewerk aardewerk kom`, eerst was het `roodbak aardewerk:kom`.

## Kanttekeningen

- **Painless in de analyse.** De condities zijn Painless-scripts in een `condition`-tokenfilter. Elasticsearch 8.17 accepteert ze, en `tests/lokaal-elastic.mjs` slaagt. Of TriplyDB scripts in een index template doorlaat, blijkt pas bij het aanmaken van de service. Zo niet, dan is er een terugvaloptie: `terp`, `kapel`, `graf` en `paal` niet splitsen, maar bij het zoeken uitbreiden met een vaste lijst samenstellingen. Zo doet nl3 het bij `kerk` en `dijk`. Dat vindt wel minder, want alleen de samenstellingen op de lijst tellen mee.
- **graven.** De regel `graf, graven => graf` maakt ook van *graven* als meervoud van graaf (de adellijke titel) `graf`. In de data gaat *graven* vooral over graven als in graf, en over graven als werkwoord. Het werkwoord staat bijna altijd in een vorm als *gegraven* of *afgegraven*, en die blijven los.
- **fort** blijft gesplitst. Valse treffers (comfort, fortuin, Beaufort) zijn zeldzaam vergeleken met torenfort, fortificatie en fortwachterswoning.
- **De nl3-demo heeft hetzelfde probleem** met *terp* (waterput) en *kapel* (dakkapel). Dat valt buiten dit experiment, maar de oplossing hier werkt daar ook.
- **De steekproef is niet willekeurig.** Het is per soort de eerste n objecten vanaf een vaste positie, in URI-volgorde. Zolang `rce/cho` niet verandert, is hij wel herhaalbaar.
