// Maakt construct/delen/*.rq: dezelfde CONSTRUCT als alles.rq, in 7 delen (één per klasse), om als losse query-jobs
// in TriplyDB te draaien. Alleen het blok "objecten" verschilt. Samen leveren de delen precies
// dezelfde triples als alles.rq. Bewerk de delen niet: pas alles.rq aan en draai dit script opnieuw.
// Gebruik: node construct/maak-delen.mjs
//
// Grote klassen kunnen gesplitst worden op de URI (als tekst), niet met OFFSET (zie GRENZEN hieronder). Wordt rce/cho tussen twee jobs
// herladen, dan valt elk object nog steeds in precies één deel; met OFFSET zou alles verschuiven.
// De grenzen zijn op 19 oktober 2026 gemeten (ORDER BY STR(?s) ... OFFSET n) en geven delen van
// ongeveer 50.000 tot 100.000 objecten. Groeit een klasse flink, dan worden de delen groter; meet dan
// opnieuw en pas GRENZEN aan.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

const CK = 'https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/';
// Nu één query per klasse: geen grenzen. Werkt een klasse niet in één job, zet dan hier de grenzen
// terug die op 19 oktober zijn gemeten:
//   Vondsten: ['vondsten/10413355', 'vondsten/2244211', 'vondsten/3457866', 'vondsten/3568164']
//   ArcheologischComplex: ['archeologischcomplex/2126594', 'archeologischcomplex/3197277', 'archeologischcomplex/3308695']
//   ArcheologischOnderzoeksgebied: ['archeologischonderzoeksgebied/10521431']
//   Vondstlocatie: ['vondstlocatie/6119658']
const GRENZEN = {
  Vondsten: [],
  ArcheologischComplex: [],
  ArcheologischOnderzoeksgebied: [],
  Vondstlocatie: [],
};

// [bestandsnaam, klassen, klasse die gesplitst wordt (of null)]
const DELEN = [
  ['01-rijksmonument', ['Rijksmonument'], null],
  ['02-complex-gezicht-werelderfgoed-terrein', ['Complex', 'Gezicht', 'Werelderfgoed', 'ArcheologischTerrein'], null],
  ['03-grondsporen', ['Grondsporen'], null],
  ...['ArcheologischOnderzoeksgebied', 'Vondstlocatie', 'ArcheologischComplex', 'Vondsten'].flatMap(k =>
    Array.from({ length: GRENZEN[k].length + 1 }, (_, i) => [null, [k], k, i])),
].map((d, n) => {
  const [naam, klassen, gesplitst, i] = d;
  const nr = String(n + 1).padStart(2, '0');
  const enkel = gesplitst && GRENZEN[gesplitst].length === 0;
  return { naam: naam ?? `${nr}-${gesplitst.toLowerCase()}${enkel ? '' : `-${i + 1}`}`, klassen, gesplitst: enkel ? null : gesplitst, i };
});

// In een subquery, zodat het filter op de URI zeker eerst wordt toegepast (een FILTER op het hoogste
// niveau geldt voor de hele query en kan pas na alle UNION-blokken worden uitgerekend).
function objecten({ klassen, gesplitst, i }) {
  const regels = [
    `    { SELECT ?s WHERE {`,
    `        GRAPH graph:instanties-rce { ?s a ?klasse }`,
    `        VALUES ?klasse { ${klassen.map(k => `ceo:${k}`).join(' ')} }`,
  ];
  if (gesplitst) {
    const g = GRENZEN[gesplitst];
    const voorwaarden = [];
    if (i > 0) voorwaarden.push(`STR(?s) >= "${CK}${g[i - 1]}"`);
    if (i < g.length) voorwaarden.push(`STR(?s) < "${CK}${g[i]}"`);
    regels.push(`        FILTER(${voorwaarden.join(' && ')})`);
  }
  regels.push(`    } }`);
  return regels.join('\n');
}

const map = new URL('.', import.meta.url);
const alles = readFileSync(new URL('alles.rq', map), 'utf8');
const blok = /    # --- objecten[\s\S]*?# --- einde objecten/;
if (!blok.test(alles)) throw new Error('blok "objecten" niet gevonden in alles.rq');

const uit = new URL('delen/', map);
mkdirSync(uit, { recursive: true });
for (const f of readdirSync(uit)) if (f.endsWith('.rq')) rmSync(new URL(f, uit));

DELEN.forEach((d, n) => {
  const kop = `# Deel ${n + 1} van ${DELEN.length}: ${d.klassen.map(k => `ceo:${k}`).join(', ')}` +
    (d.gesplitst ? `, stuk ${d.i + 1} van ${GRENZEN[d.gesplitst].length + 1} (op URI)` : '') +
    `\n# Gemaakt met node construct/maak-delen.mjs uit construct/alles.rq. Niet met de hand bewerken.\n\n`;
  const rq = alles.replace(blok, `    # --- objecten (deel ${n + 1} van ${DELEN.length}, zie construct/maak-delen.mjs)\n${objecten(d)}\n    # --- einde objecten`);
  writeFileSync(new URL(`${d.naam}.rq`, uit), kop + rq);
});
console.log(`${DELEN.length} delen in construct/delen/:\n` + DELEN.map(d => `  ${d.naam}.rq`).join('\n'));
