// Gedeeld door elastic-document.mjs en lokaal-elastic.mjs: draait alles.rq voor losse objecten en zet
// elk subject om zoals de TriplyDB-Elasticsearch-service dat doet: één document per subject,
// "@id" = de URI, veldnaam = property-IRI met spaties in plaats van punten, elke waarde een lijst van
// strings (datatype en taal vallen weg).
import { readFileSync } from 'node:fs';

export const ENDPOINT = 'https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/sparql';

export async function bouwDocumenten(file, uris) {
  return bouwDocumentenVoor(file, `VALUES ?s { ${uris.map(u => `<${u}>`).join(' ')} }`);
}

// zelfde, met een eigen blok "objecten", bijv. een subquery met LIMIT
export async function bouwDocumentenVoor(file, objecten) {
  const rq = readFileSync(file, 'utf8');
  const test = rq.replace(/# --- objecten[\s\S]*?# --- einde objecten/, objecten);
  if (test === rq) throw new Error('blok "objecten" niet gevonden');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/n-triples' },
    body: new URLSearchParams({ query: test }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SPARQL status ${res.status}: ${text.slice(0, 1000)}`);

  // lexicale waarde van een N-Triples-term: IRI zonder <>, literal zonder aanhalingstekens, datatype en taal
  const waarde = term => {
    if (term.startsWith('<')) return term.slice(1, -1);
    const m = term.match(/^"((?:[^"\\]|\\.)*)"/);
    return JSON.parse(`"${m[1]}"`);
  };

  const velden = new Map();
  for (const line of text.split('\n')) {
    const m = line.match(/^<([^>]+)> <([^>]+)> (.*) \.$/);
    if (!m) continue;
    const [, s, p, o] = m;
    if (!velden.has(s)) velden.set(s, {});
    (velden.get(s)[p.replaceAll('.', ' ')] ??= []).push(waarde(o));
  }
  return [...velden].map(([s, v]) => {
    const source = { '@id': s };
    for (const veld of Object.keys(v).sort()) source[veld] = v[veld].sort();
    return { _id: s, _source: source };
  });
}
