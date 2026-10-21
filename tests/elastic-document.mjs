// Draait alles.rq voor losse objecten en toont het document zoals de TriplyDB-Elasticsearch-service
// het in _source zet (zie documenten.mjs en docs/elastic-document.md).
// Gebruik: node tests/elastic-document.mjs construct/alles.rq <uri> [<uri> ...]
import { bouwDocumenten } from './documenten.mjs';

const [file, ...uris] = process.argv.slice(2);
for (const doc of await bouwDocumenten(file, uris)) console.log(JSON.stringify(doc, null, 2));
