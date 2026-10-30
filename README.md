# fts5-or-search

For natural-language, multi-word queries against SQLite FTS5, the usual
strict `term1 AND term2 AND …` match string loses almost every relevant
document — even with Porter stemming enabled. A quoted OR match scored by
FTS5's built-in BM25 (`ORDER BY rank`) fixes that.

**The core finding** (nDCG@10; `and` and `or` have no tuned parameters;
every number from `docs/VALIDATION.md`):

| dataset | documents | strict AND | quoted OR |
|---|---:|---:|---:|
| SciFact (English) | 5 183 | 0.0616 | 0.6878 |
| WebFAQ-de (native German) | 891 201 | 0.1332 | 0.4665 |
| mMARCO-de (German) | 1 000 000 | 0.1508 | 0.3493 |
| MS MARCO, all passages (English) | 8 841 823 | 0.0947 | 0.2254 |
| mMARCO-de, all passages (German) | 8 841 823 | 0.0718 | 0.1367 |

**Recommendation.**

- **English:** OR on a `porter unicode61` index. On four BEIR datasets none
  of the tested extensions — coverage re-ranking, BM25/coverage blends,
  title weighting — was measurably better.
- **German:** OR with `STOPWORDS_DE` (the Snowball German stop word list plus
  28 more words); below 50 000 documents on a `trigram` index (provisional;
  not confirmed on GerDaLIRSmall, −0.0006), from 50 000 documents on a
  `unicode61` index. Prefix queries on the `unicode61` index are a measured
  option from 50 000 documents (T26), not yet a library function and not yet
  the recommendation.
- **Scale:** latency and index size grow about linearly with the corpus. At
  1 000 000 passages the OR lane had a p95 of 118.78 ms (English) and
  24.72 ms (German), on the full 8 841 823 passages 1 027.75 ms (English).

Contents: [Introduction](#introduction) · [Results](#results) ·
[Case study](#case-study-openclaw-memory-and-context) ·
[How to read the results](#how-to-read-the-results) ·
[Conclusion](#conclusion) · [Quick start](#quick-start) ·
[Other exports](#other-exports) · [Reproduce](#reproduce) ·
[How this was built](#how-this-was-built) · [License](#license)

## Introduction

SQLite's full-text extension FTS5 is often all the search a small
application needs: it ships with SQLite, runs in-process and ranks with
BM25. The usual way to turn a sentence into an FTS5 query is to join its
words with AND. For natural-language questions that fails: a relevant
document rarely contains every word of the question. On SciFact strict AND
reaches 0.0616 nDCG@10, plain OR 0.6878.

This matters in particular for AI agents that search their own memory. The
assistant framework OpenClaw (version 2026.10.7) combines vector search with
an FTS5 keyword search for its memory, and the context-management plugin
lossless-claw (1.1.1) searches the compacted conversation history with FTS5
in its full-text mode; both join the query words with AND. Agents phrase
memory requests as sentences (a median of 7 words on the installation we
looked at), so the keyword half rarely finds anything — see the
[case study](#case-study-openclaw-memory-and-context).

This project asks a narrow question: **what is the simplest FTS5 query that
works for natural-language search, and does anything more complex beat
it?** The reference is the plainest alternative: every word quoted and
joined with OR, ranked by FTS5's built-in BM25. Every extension we tried —
coverage re-ranking, score blends, title weights, a German stemmer, a
trigram index, adaptive expansion, prefix queries — had to beat this
reference on data it was not tuned on, at little cost in latency and code.
The adoption criterion is called E5 and is defined in `docs/ZIEL.md`.
Neural models, embeddings and re-rankers are out of scope on purpose: the
point is what plain SQLite can do.

The tests use public benchmarks — four English BEIR datasets; the German
GermanDPR, GovService, WebFAQ and GerDaLIR; MS MARCO and its German
translation mMARCO from 10 000 up to 8 841 823 passages — and measure
latency and index size as the corpus grows. Every number in this README is
taken from `docs/VALIDATION.md`, which records commands, checksums,
per-query comparisons and confidence intervals.

## Results

Terms and metrics are explained in
[How to read the results](#how-to-read-the-results).

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

**Extensions on top of OR.** Tuning happened only on SciFact and NFCorpus;
the table shows nDCG@10 on the **untuned** datasets. None of them is
measurably better: the two blends are at most 0.0013 above `or` on FiQA and
below it on TREC-COVID; the coverage re-ranks are clearly worse, both with
the 500-row pool of T11–T14 and with the 50-row pool of a normal top-10
search (T18). No variant meets the adoption criterion E5. FiQA has almost no
titles, which is why `or-title-3` has no value there.

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

Latency of the `or` lane: p95 26.26 ms on FiQA and 83.63 ms on TREC-COVID,
in-memory database, one machine. On 1 000 000 MS MARCO passages (T19,
1 000 dev questions) every coverage re-rank lane stayed below `or` (−0.0383
to −0.0753 nDCG@10), and the two blends differed from it by −0.0006 and
+0.0037.

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

E5 is applied per size class (T23; small below 50 000 documents, medium up
to 500 000, large above). **Small** (GermanDPR, GovService, mMARCO-de
10 000): `or-trigram`, `hybrid-trigram` and `hybrid-expanded` meet it on all
three; `or-trigram` needs no library code, and the other two are not better
than it on every set or need german-fts5-stemmer as an extra package.
**Medium** (mMARCO-de 100 000): only `hybrid-expanded` meets it, on one test
set and with the extra package; `or-trigram` exceeds its latency budget
(p95 21.30 ms against 12.24 ms). **Large** (mMARCO-de 1 000 000): every
extension misses the +0.01 nDCG@10 threshold (`or-trigram` +0.0007,
`hybrid` +0.0011, `hybrid-expanded` −0.0042, `hybrid-trigram` −0.0072,
`or-stem` −0.0296). Plausibility (T16): `or` with the former 94-word list
(0.4797 and 0.6937) is close to the BM25 values of NanoMTEB-German (0.4647
and 0.6132, 200-query subsets).

**Native German (T25, T26).** WebFAQ-de (`PaDaS-Lab/webfaq-retrieval`,
3 000 questions per set) and GerDaLIRSmall (`mteb/GerDaLIRSmall`, 9 969
court decisions, 1 000 paragraph-length questions); nothing was tuned on
them. nDCG@10, all lanes in one run per set:

| dataset | docs | `and` | `or` | `or-trigram` | `or-prefix-4` |
|---|---:|---:|---:|---:|---:|
| WebFAQ-de | 100 000 | 0.1453 | 0.6065 | 0.6370 | 0.6395 |
| WebFAQ-de | 891 201 | 0.1332 | 0.4665 | 0.4904 | 0.4946 |
| GerDaLIRSmall | 9 969 | 0.0343 | 0.6150 | 0.6143 | 0.6153 |

p95 on WebFAQ-de 891 201 in the T26 run (latencies are comparable only
within one run): `or` 72.58 ms, `or-prefix-4` 86.76 ms, `or-trigram`
408.66 ms.

**Sub-word matching: trigram.** The trigram tokenizer matches sub-words:
„Ausweis“ finds „Personalausweis“. Over `or` it added +0.0543 (GermanDPR)
and +0.0349 (GovService) nDCG@10, on mMARCO-de +0.0255 (10 000 passages),
+0.0121 (100 000) and +0.0007 (1 000 000); on WebFAQ-de +0.0304 and +0.0239,
on GerDaLIRSmall −0.0006 (T25). It costs 2.93× the index size (mMARCO-de
1 000 000) and 2.08× (GovService) to 9.51× (mMARCO-de, 100 000 passages) the
p95 of `or`; at 1 000 000 passages 188.39 instead of 24.72 ms, on
GerDaLIRSmall 6191.33 instead of 425.84 ms (T25).

**Sub-word matching: prefix queries (T26).** Every word of at least four
letters as a prefix query (`"wort"*`) on the normal `unicode61` index:
+0.0174 to +0.0409 nDCG@10 on 5 of 6 untuned German test sets (mMARCO-de
1 000 000: 0.3668 against 0.3493), at 1.2 to 3 times the p95 of OR. It meets
the measurable parts of E5 on every untuned test set of the medium and large
classes, not in the small class (GerDaLIRSmall +0.0003). A prefix finds
compounds that start with the query word („Hund“ → „Hundehalter“), not those
that end with it („Ausweis“ → „Personalausweis“).

**Adaptive stemming (measured, needs german-fts5-stemmer).** Expanding only
the queries whose plain OR match hits at most 1 000 documents — stemmer
variants plus a coverage re-rank of the top 50, `adaptive-stem-1000` in
`scripts/beir-bench.mjs` — met the measurable parts of E5 on every untuned
test set of every size class (T24): +0.0121 (GovService), +0.0397, +0.0180
and +0.0125 nDCG@10 (mMARCO-de 10 000, 100 000, 1 000 000), at about the
latency of `or` (p95 24.36 against 24.67 ms at 1 000 000). On native German
data tested later (WebFAQ-de, GerDaLIRSmall, T25) it gained at most +0.0031.
It is not part of the library: it needs german-fts5-stemmer as a runtime
dependency, which this project excludes so far.

**Substring coverage re-rank.** A re-rank of the top 50
(`substringCoverageRerank` in `scripts/beir-bench.mjs`, not part of the
library) added +0.0385 and +0.0140 nDCG@10 on GermanDPR and GovService, and
at most +0.0014 on mMARCO-de.

**The stopword list matters for latency.** Until T21 `STOPWORDS_DE` had only
94 words: frequent words such as „in“ (half of all mMARCO-de passages) were
missing, and each query with one of them made FTS5 score a large part of the
corpus. With the complete list the p95 of `or` at 1 000 000 passages fell
from 266.96 to 24.72 ms, and nDCG@10 dropped on no German dataset.

### Scale

MS MARCO passages (English, `porter unicode61`) and the same passages in
mMARCO-de (`unicode61`, `STOPWORDS_DE`), 1 000 dev questions, `or` lane:

| | 100 000 passages | 1 000 000 passages | 8 841 823 passages (all 6 980 questions) |
|---|---:|---:|---:|
| English nDCG@10 | 0.7705 | 0.5497 | 0.2254 |
| English p50 / p95 ms | 3.77 / 9.43 | 44.66 / 118.78 | 393.13 / 1 027.75 |
| English index MB | 59.08 | 590.23 | 5 254.55 |
| German nDCG@10 | 0.4948 | 0.3493 | 0.1367 |
| German p50 / p95 ms | 0.74 / 2.24 | 6.43 / 24.72 | 104.67 / 350.35 (loaded machine) |
| German index MB | 67.47 | 663.22 | 5 839.24 |

Latency and index size grow about linearly: for `ORDER BY rank`, FTS5
computes BM25 for every document that contains at least one query term
before `LIMIT` takes the top results. Strict AND stays faster (English p50
0.81 ms at 1 000 000 passages) but finds much less: nDCG@10 0.1709 (English)
and 0.1508 (German). At full size (T20) `or` reaches MRR@10 0.1797 (English)
and 0.1105 (German) against the published BM25 values 0.184 and 0.136; the
subsets are easier because they keep all judged passages (other questions,
too).

Full provenance — download commands, checksums, licenses, per-query
compares — in [docs/VALIDATION.md](docs/VALIDATION.md).

## Case study: OpenClaw memory and context

On one private OpenClaw installation (only aggregate numbers; details in
`docs/VALIDATION.md`, T28):

- **What the code does.** The memory search scores 0.7 × vector similarity +
  0.3 × FTS5 keyword score; the keyword half joins the words with AND, and a
  result found only by the keyword half gets vector score 0, so it can never
  pass the default threshold. The context search `lcm_grep` uses an implicit
  AND in full-text mode.
- **Usage.** 14 distinct memory requests, median 7 words; the AND keyword
  match found nothing for 10 of them, quoted OR with `STOPWORDS_DE` for none.
- **Local patch (OR instead of AND).** Memory search, OR with
  `STOPWORDS_DE`: known-item requests (100) MRR@6 0.274 → 0.357 (+0.083,
  95 % CI [+0.033, +0.135]); real requests (34, blind-judged by LLMs) nDCG@6
  0.767 → 0.800, not significant — the vector half already carries most of
  the ranking. `lcm_grep` with the German stemmer, sorted by relevance (the
  patch only acts there; the default sort is by date): nDCG@10 0.576 → 0.748
  (33 cases; date-sorted default 0.557) and 0.727 → 0.897 (8 cases), without
  confidence intervals.
- **Prefix queries (T26) do not transfer.** Memory known-item MRR@6 +0.015
  (95 % CI [−0.025, +0.054]); `lcm_grep` mixed (−0.0081 to +0.0384 nDCG@10);
  not adopted.
- **Limits.** One installation; LLM-written and LLM-judged test material.

## How to read the results

**Method, in five steps.**

1. **Data.** Public test collections with relevance judgments: queries, the
   documents and, per query, which documents are relevant.
2. **Lanes.** Each search variant is a *lane* (`or`, `and`, `or-trigram`, …).
   All lanes of a comparison run in the same process on the same documents
   and queries (`scripts/beir-bench.mjs`); trigram lanes use their own
   trigram index.
3. **Metrics.** Ranking quality and latency per lane (glossary below).
4. **Decision.** An extension replaces plain OR only if it meets E5 on every
   dataset of its size class that it was *not* tuned on; parameters are
   chosen on separate tuning data before the test.
5. **Confirmation and review.** Promising results are re-measured on further
   independent data; every change is a task file in `tasks/` with its own
   check, and the results were reviewed by a second agent.

**Glossary.**

- **FTS5** – SQLite's full-text search extension. A `MATCH` query finds
  documents; `ORDER BY rank` sorts them by **BM25**, a standard relevance
  score that weights rare words higher and penalizes long documents.
- **AND / OR match** – `"solar" AND "panel"` requires every word, `"solar" OR
  "panel"` any word; BM25 then ranks documents with more and rarer matching
  words higher.
- **Tokenizer** – how FTS5 splits text into indexed terms: `unicode61` (words,
  diacritics folded), `porter unicode61` (English stemming: "running" →
  "run"), `trigram` (every three-character sequence, so a word also matches
  inside a longer word).
- **Stopwords** – frequent function words ("the", "und", "in") left out of
  the query.
- **Prefix query** – `"hund"*` matches every word starting with "hund".
- **Stemmer** – reduces words to a common stem: Porter inside the English
  index; for German, german-fts5-stemmer adds stem variants to the query
  (query side only, the index stays unchanged).
- **Coverage re-rank, pool** – re-order the top results (the *pool*, e.g. the
  top 50 or 500) by how many query words each result contains. **Blend** –
  mix the BM25 score with such a coverage score.
- **Tuned / untuned dataset** – a dataset used to choose a parameter is
  *tuned* for that lane; only untuned datasets count for the decision.
- **nDCG@10** – quality of the top 10 results, 0 to 1; relevant documents
  count more the higher they are ranked. **MRR@10** – mean over the queries
  of 1 / rank of the first relevant result (0 if none is in the top 10).
  **P@10** – share of relevant documents among the top 10.
  **Recall@100** – share of all relevant documents within the top 100.
- **p50 / p95** – median and 95th-percentile latency per query, in ms.
- **E5** – the adoption criterion: on every untuned dataset at least +0.01
  nDCG@10 over plain OR, P@10 not worse, p95 at most 3× that of plain OR or
  at most 10 ms more, whichever is larger (same run), about 50 lines of
  library code at most; applied per **size class** (small < 50 000, medium
  up to 500 000, large above).
- **95 % CI** – confidence interval of a difference from a paired bootstrap
  over the queries; if it excludes 0 the difference is unlikely to be chance.
- **W / T / L** – number of queries where a lane is better / equal / worse.
- **Known-item test** – a request is written for one known document; the
  measure is whether and at which rank the search finds it.
- **Adaptive expansion** – expand the query (stemmer variants, trigram) only
  if the plain OR match hits at most τ documents.
- **BEIR** – a standard collection of retrieval benchmarks in one format.
  **LLM** – large language model.
- **Vector search, hybrid score** – vector search ranks by the similarity of
  embedding vectors; a hybrid score mixes it with the keyword score (case
  study). **@6** – the OpenClaw memory search returns the top 6, so its
  metrics are taken at 6.

## Conclusion

**What holds.**

- Quoted OR with FTS5's BM25 beats strict AND on every dataset where both
  were measured and at every size: SciFact 0.6878 vs. 0.0616, mMARCO-de with
  1 000 000 passages 0.3493 vs. 0.1508, WebFAQ-de with 891 201 answers 0.4665
  vs. 0.1332, and on the full 8 841 823 passages 0.2254 vs. 0.0947 (English)
  and 0.1367 vs. 0.0718 (German) nDCG@10. There its MRR@10 is within the task
  tolerance of 0.05 of published BM25 (0.1797 vs. 0.184 English, 0.1105 vs.
  0.136 German). It needs no tuning, no second index and no dependency.
- Its cost grows linearly with the corpus: for `ORDER BY rank` FTS5 scores
  every document that contains a query word. The English p95 was 118.78 ms at
  1 000 000 and 1 027.75 ms at 8 841 823 passages.
- German needs a complete stopword list: with it the p95 at 1 000 000
  passages fell from 266.96 to 24.72 ms, at no loss in quality.

**What did not hold.**

- In English, re-ranking by term coverage, BM25/coverage blends and title
  weights were never measurably better than OR on untuned data (at most
  +0.0037 nDCG@10, at 1 000 000 passages). In German, coverage re-ranks
  helped only on some sets (`hybrid`: +0.0385 on GermanDPR, +0.0140 on
  GovService; `hybrid-expanded` also +0.0140 on mMARCO-de 100 000), in no
  size class once WebFAQ-de and GerDaLIRSmall are counted (T25), and were not
  better than the trigram index alone (T23).
- A query-side German stemmer, always applied, gained more than +0.01 only on
  mMARCO-de 10 000 (+0.0310) and lost at 100 000 and 1 000 000 passages
  (−0.0100, −0.0296) and on native German WebFAQ-de (−0.0174, −0.0231);
  applied only to sparse queries it gained at most +0.0031 on the native
  German sets tested later (WebFAQ-de, GerDaLIRSmall, T25).

**The trade-off that remains: sub-word matching in German.** On native
German, matching inside words — inflected forms and compounds, „Hund“ in
„Hundehalter“ — is what helps: a trigram index gained +0.0304 and +0.0239
nDCG@10 on WebFAQ-de (100 000 and 891 201 answers), but at about three times
the index size and a p95 of 36.13 vs. 5.39 ms and 295.40 vs. 50.97 ms (T25).
Prefix queries on the normal index (T26: every word of at least four letters
as `"wort"*`) reach most of this without a second index: +0.0174 to +0.0409
nDCG@10 on 5 of 6 untuned German test sets, as good as or better than
trigram on mMARCO-de and WebFAQ-de, at 1.2 to 3 times the p95 of OR. They do
not help on paragraph-length questions (GerDaLIRSmall +0.0003), cannot find
compounds that end with the query word („Ausweis“ in „Personalausweis“) and
did not help in the OpenClaw case study.

**Recommendation.**

- English: OR on a `porter unicode61` index.
- German: OR with `STOPWORDS_DE`; below 50 000 documents on a `trigram`
  index (provisional, T23; not confirmed on GerDaLIRSmall, −0.0006, T25/T26),
  from 50 000 documents on a `unicode61` index.
- Measured option for German corpora of 50 000 documents or more (T26: it
  meets the measurable parts of E5 on every untuned test set of the medium
  and large classes): the same OR match with prefix queries for words of at
  least four letters, on the same `unicode61` index. It is not yet a library
  function and therefore not yet the recommendation; below 50 000 documents
  it did not hold on every test set.

**Limits and open questions.**

- Measured for English (Porter) and German (`unicode61`, trigram) only.
- German native test sets are small or narrow (GermanDPR 2 876, GovService
  105, GerDaLIRSmall 9 969 documents) apart from WebFAQ-de (891 201
  answers); mMARCO-de is a machine translation with about one judged passage
  per question.
- At full size only `and` and `or` were measured.
- With 1 000 questions and about one judged passage each, differences below
  about ±0.016 nDCG@10 at 100 000 and 1 000 000 passages lie within the 95 %
  interval (T24); size-class results near the +0.01 threshold are uncertain.
- Purely lexical: no synonyms beyond what stemming or sub-words cover.
- Datasets are not shipped (licenses: see `docs/VALIDATION.md`).
- Latencies come from a single machine.

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
earlier measurements and the spellings without umlaut; why the complete list
matters, see [Results](#german).

**Trigram for small corpora (provisional).** Below 50 000 documents use
`tokenize='trigram remove_diacritics 1'` instead of `unicode61`, with the
same `buildOrMatch(q, { stopwords: STOPWORDS_DE })` call. The size limit was
set after the measurements (T23); it is confirmed only when a further small
test set agrees, and GerDaLIRSmall did not (−0.0006, T25). A corpus that
grows past it needs a new `unicode61` index. With trigram, query terms
shorter than three characters match nothing, and `STOPWORDS_DE` keeps short
function words out of sub-word matching ([Results](#german)): „die“ would
otherwise match inside
„Dienst“ (`test/german-recipe.test.mjs`; `npm test` checks that your Node
build supports it).

Requires Node 22.13 or newer (built-in `node:sqlite`). No dependencies.

## Other exports

`STOPWORDS_DE` (259 words, T21) is the German stopword list for `tokenize`,
`buildOrMatch` and `sanitizeMatch`. `coverageRerank`, `hybridSearch`,
`makeFtsTermPresent` and `adaptiveSearch` (T25) remain exported so the
measurements stay reproducible. They are measured, not recommended; see the
English results above and, for `adaptiveSearch`, T25 in
`docs/VALIDATION.md`. `makeFtsTermPresent` had a bug under `node:sqlite`
that silently ignored the row under test; it is fixed since T14, see the
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

## License

MIT
