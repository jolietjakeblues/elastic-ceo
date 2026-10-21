// Bouwt een testcorpus voor de taalanalyse: per soort een vaste steekproef uit construct/alles.rq,
// omgezet zoals Triply dat doet, als NDJSON (één document per regel).
// Gebruik: node tests/corpus.mjs <uitvoer.ndjson>
// De steekproef is "de eerste n vanaf positie offset" in de volgorde van het endpoint; niet willekeurig,
// maar wel herhaalbaar zolang rce/cho niet verandert.
import { createWriteStream } from 'node:fs';
import { bouwDocumentenVoor } from './documenten.mjs';

const STEEKPROEF = [
  ['Rijksmonument', 4000, 0], ['Rijksmonument', 2000, 30000],
  ['Complex', 1000, 0], ['Gezicht', 472, 0], ['Werelderfgoed', 18, 0],
  ['ArcheologischTerrein', 2000, 0], ['ArcheologischOnderzoeksgebied', 1500, 20000],
  ['Vondstlocatie', 1500, 20000], ['ArcheologischComplex', 3000, 100000],
  ['Grondsporen', 3000, 20000], ['Vondsten', 5000, 100000],
];
const PER_KEER = 500;

const [uit] = process.argv.slice(2);
if (!uit) throw new Error('gebruik: node tests/corpus.mjs <uitvoer.ndjson>');
const out = createWriteStream(uit);
const file = new URL('../construct/alles.rq', import.meta.url);
let totaal = 0;
for (const [klasse, n, offset] of STEEKPROEF) {
  let klaar = 0;
  for (let o = offset; o < offset + n; o += PER_KEER) {
    const limit = Math.min(PER_KEER, offset + n - o);
    const blok = `{ SELECT ?s WHERE { GRAPH graph:instanties-rce { ?s a ceo:${klasse} } } ORDER BY ?s LIMIT ${limit} OFFSET ${o} }`;
    const docs = await bouwDocumentenVoor(file, blok);
    for (const d of docs) out.write(JSON.stringify(d) + '\n');
    klaar += docs.length;
  }
  totaal += klaar;
  console.log(`${klasse}: ${klaar}`);
}
out.end();
console.log(`totaal ${totaal} documenten in ${uit}`);
