# fts5-or-search

For natural-language, multi-word queries against SQLite FTS5, the usual
strict `term1 AND term2 AND …` match string loses almost every relevant
document — even with Porter stemming enabled. A quoted OR match scored by
FTS5's built-in BM25 (`ORDER BY rank`) fixes that.

- **English:** OR on a `porter unicode61` index. On four BEIR datasets none
  of the tested extensions — coverage re-ranking (with a 500 or a 50 pool),
  soft BM25/coverage blends, title weighting — was measurably better.
- **German:** OR on a `trigram` index (built into FTS5). On two German
  datasets it beat OR on `unicode61` by +0.0541 and +0.0691 nDCG@10; a
  query-side stemmer (german-fts5-stemmer) and coverage re-ranking did not
  beat it.

The measurements are in `docs/VALIDATION.md` and summarized below.

## Quick start

### English

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

### German

```js
import { DatabaseSync } from 'node:sqlite';
import { buildOrMatch, STOPWORDS_DE } from 'fts5-or-search';

const db = new DatabaseSync('mycorpus.db');
db.exec("CREATE VIRTUAL TABLE docs_fts USING fts5(content, tokenize='trigram remove_diacritics 1')");
// … INSERT INTO docs_fts (content) VALUES (?) …
const stmt = db.prepare(
  'SELECT rowid, content FROM docs_fts WHERE docs_fts MATCH ? ORDER BY rank LIMIT ?');
const q = 'Wo beantrage ich einen neuen Personalausweis?';
const top10 = stmt.all(buildOrMatch(q, { stopwords: STOPWORDS_DE }), 10);
```

The trigram tokenizer matches sub-words, so „Ausweis“ finds
„Personalausweis“, and `remove_diacritics 1` lets „Mullabfuhr“ find
„Müllabfuhr“. `STOPWORDS_DE` is the list every German measurement used. With
trigram it also keeps short function words out of sub-word matching: „die“
would otherwise match inside „Dienst“ (`test/german-recipe.test.mjs`). Query terms shorter than three characters match
nothing. The trigram index was 2.59× (GermanDPR) and 2.50× (GovService) the
size of a `unicode61` index. `npm test` checks that your Node build supports
the recipe.

If the index cannot change (an existing `unicode61` table), use the same
call against it: plain OR with `STOPWORDS_DE`. A substring coverage re-rank
of the top 50 added +0.0363 and +0.0280 nDCG@10 there (T17); it is
`substringCoverageRerank` in `scripts/beir-bench.mjs`, meets E5 on both
German datasets, and is not part of the library.

## Measurements

### English

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
are clearly worse, both with the 500-row pool of T11–T14 and with the 50-row
pool of a normal top-10 search (T18).

| variant | idea | FiQA | TREC-COVID |
|---|---|---:|---:|
| `or` (reference) | quoted OR, FTS5 BM25 | 0.2535 | 0.6020 |
| coverage re-rank (`hybrid`) | sort by number of query terms present, BM25 breaks ties; pool 500 | 0.1621 | 0.4471 |
| coverage re-rank, FTS-exact (`hybrid-fts`) | same, presence checked by FTS5 (Porter-aware); pool 500 | 0.1732 | 0.4791 |
| coverage re-rank at k=10 (`hybrid-k10`) | `hybridSearch` as used for a top-10 result; pool 50 | 0.1891 | 0.5130 |
| substring coverage re-rank (`hybrid-substr-k10`) | the German re-rank of T17 on English; pool 50 | 0.1977 | 0.5443 |
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

### German

nDCG@10 on GermanDPR (test split, 2 876 passages, 1 025 questions, via the
BEIR export `PM-AI/germandpr-beir`) and GermanGovService
(`it-at-m/LHM-Dienstleistungen-QA`, test split, 105 documents, 357
questions). All lanes use `STOPWORDS_DE`. `or-stem` was chosen over
`or-stem-paradigm` on GermanDPR, so only GovService is untuned for it; every
other lane is untuned on both.

| variant | idea | GermanDPR | GovService |
|---|---|---:|---:|
| `and` | strict AND, `unicode61` | 0.0263 | 0.0753 |
| `or` (reference) | quoted OR, `unicode61` | 0.4797 | 0.6937 |
| `or-stem` | OR of all german-fts5-stemmer variants | 0.4874 | 0.6968 |
| `hybrid` | `or` + substring coverage re-rank, pool 50 | 0.5160 | 0.7217 |
| `hybrid-expanded` | `or-stem` + variant coverage re-rank, pool 50 | 0.5227 | 0.7123 |
| **`or-trigram`** | quoted OR, `trigram remove_diacritics 1` | **0.5338** | **0.7628** |
| `hybrid-trigram` | `or-trigram` + substring coverage re-rank | 0.5257 | 0.7489 |

`or-trigram` meets E5 on both datasets: +0.0541 and +0.0691 nDCG@10, P@10
+0.0040 and +0.0039, p95 2.38× and 1.85× of `or`. Re-ranking on top of
trigram does not add to it. Plausibility: `or` is close to the BM25 values
of NanoMTEB-German (0.4647 and 0.6132, 200-query subsets).

Full provenance — download commands, checksums, licenses, per-query
compares — in [docs/VALIDATION.md](docs/VALIDATION.md).

## Other exports

`STOPWORDS_DE` is the German stopword list for `tokenize`, `buildOrMatch`
and `sanitizeMatch`. `coverageRerank`, `hybridSearch` and
`makeFtsTermPresent` remain exported so
the measurements stay reproducible. They are measured, not recommended; see
the English table 3 above. `makeFtsTermPresent` had a bug under `node:sqlite` that
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

German: download and conversion are in `tasks/T16-german-validation.md`
(`scripts/to-beir.mjs`); the stemmer lanes load german-fts5-stemmer at run
time:

```bash
node scripts/beir-bench.mjs --data <dir> --lang de --stemmer <german-fts5-stemmer>/lib/stem-german.mjs --repeat 3 --json
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
`makeFtsTermPresent` bug that T14 fixed; the review of T17 found that the
English re-rank lanes of T11–T14 re-ranked a 500-row pool, which T18
re-measured at k=10. Development happened in a private
repository (`fts5-hybrid-search`); this repository starts from its 0.2.0
state, with all task files and measurements included.

## Limitations

- Measured for English (Porter) and German (trigram) only.
- The German datasets are small (2 876 and 105 documents); latency and index
  size of trigram on large German corpora are not measured.
- Purely lexical: no synonyms beyond what stemming or sub-words cover.
- Datasets are not shipped (licenses: see `docs/VALIDATION.md`).
- Latencies come from a single machine.

## License

MIT
