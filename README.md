# fts5-or-search

For natural-language, multi-word queries against SQLite FTS5, the usual
strict `term1 AND term2 AND …` match string loses almost every relevant
document — even with Porter stemming enabled. A quoted OR match scored by
FTS5's built-in BM25 (`ORDER BY rank`) fixes that, and on four BEIR
datasets none of the tested extensions — coverage re-ranking, soft
BM25/coverage blends, title weighting — was measurably better than plain OR
with BM25. The measurements are in `docs/VALIDATION.md` and reproduced below.

## Quick start

```js
import { DatabaseSync } from 'node:sqlite';
import { buildOrMatch } from 'fts5-or-search';

const db = new DatabaseSync('mycorpus.db', { readOnly: true });
const stmt = db.prepare(
  'SELECT id, content FROM docs_fts WHERE docs_fts MATCH ? ORDER BY rank LIMIT ?');
const top10 = stmt.all(buildOrMatch('how do solar panels make electricity'), 10);
```

`rank` is FTS5's built-in BM25 score. For English, build the index with
`tokenize='porter unicode61'`. `buildOrMatch` puts every token in double
quotes, so FTS5 syntax from user input — `AND`/`OR`/`NOT`, column refs
(`col:tok`), `NEAR()`, stray quotes — is never evaluated. When you
deliberately want strict search, `sanitizeMatch` builds the AND baseline.

## Measurements

nDCG@10 on the BEIR test splits. `and` is the strict-AND baseline, `or` the
quoted-OR lane with FTS5 BM25, and the last column the published BM25
reference from Thakur et al., 2021 (BEIR).

| dataset | docs | judged queries | `and` | `or` | published BM25 (Thakur et al., 2021) |
|---|---:|---:|---:|---:|---:|
| SciFact | 5 183 | 300 | 0.0616 | 0.6878 | 0.665 |
| NFCorpus | 3 633 | 323 | 0.2097 | 0.3209 | 0.325 |
| FiQA | 57 638 | 648 | – | 0.2535 | 0.236 |
| TREC-COVID | 171 332 | 50 | – | 0.6020 | 0.656 |

Recall@100 shows the same picture: strict AND finds far fewer of the judged
documents than OR — about a fifteenth on SciFact and less than half on
NFCorpus.

| dataset | `and` | `or` |
|---|---:|---:|
| SciFact | 0.0603 | 0.9193 |
| NFCorpus | 0.1043 | 0.2458 |

We tested three families of enhancements on top of OR. Tuning happened only
on SciFact and NFCorpus; the table shows nDCG@10 on the **untuned**
datasets. None of them is measurably better: the two blends are at most
0.0013 above `or` on FiQA and below it on TREC-COVID; the coverage re-ranks
are clearly worse.

| variant | idea | FiQA | TREC-COVID |
|---|---|---:|---:|
| `or` (reference) | quoted OR, FTS5 BM25 | 0.2535 | 0.6020 |
| coverage re-rank (`hybrid`) | sort by number of query terms present, BM25 breaks ties | 0.1621 | – |
| coverage re-rank, FTS-exact (`hybrid-fts`) | same, presence checked by FTS5 (Porter-aware) | 0.1732 | 0.4791 |
| soft blend (`blend-0.1`) | normalized BM25 + 0.1 · coverage | 0.2540 | 0.5997 |
| IDF-weighted blend (`blendidf-0.1`) | same, coverage weighted by IDF | 0.2548 | 0.5915 |
| title weight (`or-title-3`) | `bm25(t, 0, 3, 1)`: title counts 3× | – | 0.5893 |

Adoption criterion E5 from `docs/ZIEL.md`: an extension over `or` is
adopted only if it reaches at least +0.01 nDCG@10 on **every** untuned
dataset, is not worse at P@10, stays within 3× the p95 latency of `or`, and
costs roughly 50 lines of library code or less. No variant meets it. FiQA
has almost no titles, which is why `or-title-3` has no value there.

Latency of the `or` lane: p95 26.26 ms on FiQA and 83.63 ms on TREC-COVID,
in-memory database, one machine.

Full provenance — download commands, checksums, licenses, per-query
compares — in [docs/VALIDATION.md](docs/VALIDATION.md).

## Other exports

`coverageRerank`, `hybridSearch` and `makeFtsTermPresent` remain exported so
the measurements stay reproducible. They are measured, not recommended; see
table 3 above. `makeFtsTermPresent` had a bug under `node:sqlite` that
silently ignored the row under test; it is fixed since T14, see the
CHANGELOG.

## Reproduce

Download one dataset, verify its checksum against `docs/VALIDATION.md`, and
run the bench (SciFact as the example):

```bash
curl -fsSLO https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip
sha256sum scifact.zip    # compare with docs/VALIDATION.md
unzip -qo scifact.zip
node scripts/beir-bench.mjs --data scifact --repeat 3 --json
```

```bash
npm test      # tokenizing, quoting/injection, rerank semantics
npm run bench # small demo: 8 docs, 8 curated paraphrases; AND misses 2 of 8
```

Requires Node 22.13 or newer (built-in `node:sqlite`). No dependencies.

## How this was built

Every change is a task file in `tasks/` with its own verification command
(`npm run check -- tasks/<file>.md`). A local coding agent implemented each
task; every push was reviewed independently. The review of T12 found the
`makeFtsTermPresent` bug that T14 fixed. Development happened in a private
repository (`fts5-hybrid-search`); this repository starts from its 0.2.0
state, with all task files and measurements included.

## Limitations

- English with Porter only; German follows.
- Purely lexical: no synonyms beyond what stemming covers.
- BEIR datasets are not shipped (licenses: see `docs/VALIDATION.md`).
- Latencies come from a single machine.

## License

MIT
