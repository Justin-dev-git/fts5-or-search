# fts5-or-search

For natural-language, multi-word queries against SQLite FTS5, the usual
strict `term1 AND term2 AND …` match string loses almost every relevant
document — even with Porter stemming enabled. A quoted OR match scored by
FTS5's built-in BM25 (`ORDER BY rank`) fixes that.

- **English:** OR on a `porter unicode61` index. On four BEIR datasets none
  of the tested extensions — coverage re-ranking (with a 500 or a 50 pool),
  soft BM25/coverage blends, title weighting — was measurably better.
- **German:** OR on a `unicode61` index with `STOPWORDS_DE` (the Snowball
  German stop word list plus 28 more words). With this list none of the
  tested extensions — a trigram index, a query-side stemmer
  (german-fts5-stemmer), coverage re-ranking — met the adoption criterion on
  every untuned dataset; at 1 000 000 mMARCO-de passages none was more than
  +0.0011 nDCG@10 above OR.
- **Scale:** latency and index size grow about linearly with the corpus. At
  1 000 000 passages the OR lane had a p95 of 118.78 ms (English) and
  24.72 ms (German).

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
db.exec("CREATE VIRTUAL TABLE docs_fts USING fts5(content, tokenize='unicode61')");
// … INSERT INTO docs_fts (content) VALUES (?) …
const stmt = db.prepare(
  'SELECT rowid, content FROM docs_fts WHERE docs_fts MATCH ? ORDER BY rank LIMIT ?');
const q = 'Wo beantrage ich einen neuen Personalausweis?';
const top10 = stmt.all(buildOrMatch(q, { stopwords: STOPWORDS_DE }), 10);
```

`unicode61` folds umlauts (ä→a) and keeps ß. `STOPWORDS_DE` (259 words) is
the Snowball German stop word list (BSD-3-Clause), the 94-word list of the
earlier measurements and the spellings without umlaut. Until T21 it had only
those 94 words: frequent words such as „in“ (half of all mMARCO-de passages)
were missing, and each query with one of them made FTS5 score a large part
of the corpus. With the complete list the p95 of `or` at 1 000 000 passages
fell from 266.96 to 24.72 ms, and nDCG@10 dropped on no German dataset.

**Trigram (option).** `tokenize='trigram remove_diacritics 1'` matches
sub-words: „Ausweis“ finds „Personalausweis“. Over `or` it added +0.0543
(GermanDPR) and +0.0349 (GovService) nDCG@10, on mMARCO-de +0.0255
(10 000 passages), +0.0121 (100 000) and +0.0007 (1 000 000). It costs 2.93×
the index size and 2.08× (GovService) to 9.51× (mMARCO-de, 100 000
passages) the p95 of `or`; at 1 000 000 passages 188.39 instead of
24.72 ms. With trigram, query terms
shorter than three characters match nothing, and `STOPWORDS_DE` keeps short
function words out of sub-word matching: „die“ would otherwise match inside
„Dienst“ (`test/german-recipe.test.mjs`; `npm test` checks that your Node
build supports it).

A substring coverage re-rank of the top 50 (`substringCoverageRerank` in
`scripts/beir-bench.mjs`, not part of the library) added +0.0385 and +0.0140
nDCG@10 on GermanDPR and GovService, and at most +0.0014 on mMARCO-de.

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
dataset, is not worse at P@10, has a p95 latency of at most 3× that of `or`
or at most 10 ms more (whichever is larger, same run; the floor was added in
T22), and costs roughly 50 lines of library code or less. No variant meets
it. FiQA
has almost no titles, which is why `or-title-3` has no value there.

Latency of the `or` lane: p95 26.26 ms on FiQA and 83.63 ms on TREC-COVID,
in-memory database, one machine.

On 1 000 000 MS MARCO passages (T19, 1 000 dev questions) every coverage
re-rank lane stayed below `or` (−0.0383 to −0.0753 nDCG@10), and the two
blends differed from it by −0.0006 and +0.0037.

### German

nDCG@10 on GermanDPR (test split, 2 876 passages, 1 025 questions, via the
BEIR export `PM-AI/germandpr-beir`), GermanGovService
(`it-at-m/LHM-Dienstleistungen-QA`, test split, 105 documents, 357
questions) and mMARCO-de (the German machine translation of MS MARCO,
`unicamp-dl/mmarco`; 1 000 000 passages, 1 000 dev questions). All lanes use
`STOPWORDS_DE` (T21). `or-stem` was chosen over `or-stem-paradigm` on
GermanDPR, so GermanDPR is tuned for it; every other cell is untuned.

| variant | idea | GermanDPR | GovService | mMARCO-de |
|---|---|---:|---:|---:|
| `and` | strict AND, `unicode61` | 0.0356 | 0.1005 | 0.1508 |
| **`or`** (reference) | quoted OR, `unicode61` | **0.4807** | **0.7280** | **0.3493** |
| `or-stem` | OR of all german-fts5-stemmer variants | 0.4895 | 0.7169 | 0.3197 |
| `hybrid` | `or` + substring coverage re-rank, pool 50 | 0.5192 | 0.7420 | 0.3504 |
| `hybrid-expanded` | `or-stem` + variant coverage re-rank, pool 50 | 0.5313 | 0.7401 | 0.3451 |
| `or-trigram` | quoted OR, `trigram remove_diacritics 1` | 0.5350 | 0.7629 | 0.3500 |
| `hybrid-trigram` | `or-trigram` + substring coverage re-rank | 0.5292 | 0.7645 | 0.3421 |

No lane meets E5 on every untuned dataset (T22). At 1 000 000 mMARCO-de
passages every extension misses the +0.01 nDCG@10 threshold (`or-trigram`
+0.0007, `hybrid` +0.0011, `hybrid-expanded` −0.0042, `hybrid-trigram`
−0.0072, `or-stem` −0.0296), and `or-trigram` exceeds its latency budget
from 100 000 passages on (p95 21.30 ms against a budget of 12.24 ms).
`hybrid-expanded` meets E5 on the four smaller test sets but needs
german-fts5-stemmer as an extra package. With the 94-word list of T16–T18,
`or-trigram` met E5 on GermanDPR and GovService and was the German
recommendation; on mMARCO-de it does not. Plausibility (T16): `or` with the former list
(0.4797 and 0.6937) is close to the BM25 values of NanoMTEB-German (0.4647
and 0.6132, 200-query subsets).

### Scale

MS MARCO passages (English, `porter unicode61`) and the same passages in
mMARCO-de (`unicode61`, `STOPWORDS_DE`), 1 000 dev questions, `or` lane:

| | 100 000 passages | 1 000 000 passages |
|---|---:|---:|
| English nDCG@10 | 0.7705 | 0.5497 |
| English p50 / p95 ms | 3.77 / 9.43 | 44.66 / 118.78 |
| English index MB | 59.08 | 590.23 |
| German nDCG@10 | 0.4948 | 0.3493 |
| German p50 / p95 ms | 0.74 / 2.24 | 6.43 / 24.72 |
| German index MB | 67.47 | 663.22 |

Latency and index size grow about linearly: for `ORDER BY rank`, FTS5
computes BM25 for every document that contains at least one query term
before `LIMIT` takes the top results. Strict AND stays faster (English p50
0.81 ms at 1 000 000 passages) but finds much less: nDCG@10 0.1709 (English)
and 0.1508 (German). The full corpus (8.8 million passages) is not measured
yet.

Full provenance — download commands, checksums, licenses, per-query
compares — in [docs/VALIDATION.md](docs/VALIDATION.md).

## Other exports

`STOPWORDS_DE` (259 words, T21) is the German stopword list for `tokenize`,
`buildOrMatch` and `sanitizeMatch`. `coverageRerank`, `hybridSearch` and
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
node scripts/beir-bench.mjs --data <dir> --lang de --stemmer <german-fts5-stemmer>/lib/stem-german.mjs --stopwords lib --repeat 3 --json
```

`--stopwords lib` uses `STOPWORDS_DE` for every German lane, including the
variants of the stemmer lanes; without it the bench uses the stemmer's
94-word list of T16–T19. mMARCO download, conversion and the scale runner
(`scripts/scale-run.sh`) are in `tasks/T19-scale.md` and
`tasks/T21-stopwords-de.md`.

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
re-measured at k=10; the validation of the scale tooling found the gaps in
the German stopword list that T21 closed. Development happened in a private
repository (`fts5-hybrid-search`); this repository starts from its 0.2.0
state, with all task files and measurements included.

## Limitations

- Measured for English (Porter) and German (`unicode61`, trigram) only.
- German: two small native datasets (2 876 and 105 documents) and mMARCO-de,
  a machine translation with about one judged passage per question.
- Corpora above 1 000 000 passages are not measured.
- Purely lexical: no synonyms beyond what stemming or sub-words cover.
- Datasets are not shipped (licenses: see `docs/VALIDATION.md`).
- Latencies come from a single machine.

## License

MIT
