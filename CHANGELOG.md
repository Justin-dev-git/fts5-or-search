# Changelog

All notable changes to this project are documented here.
Behavior changes to public functions are marked **Behavior change**.

## Unreleased

### Added: German measurement mode (bench only, no library change)
- `scripts/beir-bench.mjs --lang de --stemmer <path/to/stem-german.mjs>`:
  lanes `and`, `or`, `or-stem`, `or-stem-paradigm` (german-fts5-stemmer
  variants, ORed) and `or-trigram` (FTS5 `trigram` tokenizer) on a
  `unicode61` index, one stopword list for all lanes; reports the in-memory
  database size of both indexes. The stemmer is loaded at run time and is not
  a dependency. English mode is unchanged (rankings and per-query output
  byte-identical on beir-mini, beir-blend and a 5 000-doc synthetic corpus).
- `scripts/to-beir.mjs`: converts GermanDPR JSON and Hugging Face dataset
  viewer rows (SQuAD-style) into the BEIR layout.
- Tests: `test/de-bench.test.mjs` (stub stemmer, reference values on
  `test/fixtures/beir-de-mini`), `test/to-beir.test.mjs`.
- German lanes `hybrid` and `hybrid-expanded` (T17): the coverage re-rank
  of german-fts5-stemmer's `bench.mjs` (`fts-hybrid`, `fts-hybrid-expanded`)
  reproduced exactly — 50-row pool, substring coverage per term group on the
  lower-cased text, `coverage*1000 + 1/(i+1)`. T16 had left out
  `hybrid-expanded`, the best lane on the private corpus. New fixture
  `test/fixtures/beir-de-lanes` (q4: only the re-rank lanes rank the
  full-coverage document first; a broken coverage fails the test).

## 0.2.0 (unreleased)

### Changed: package and repository renamed to fts5-or-search
- The name now matches the recommendation (plain OR with FTS5 BM25). This
  repository starts from the 0.2.0 tree of the private `fts5-hybrid-search`
  repository; its commit history is not carried over.
- README wording tightened: no tested extension is "measurably better"
  (instead of "best"/"wins"), Recall@100 ratio stated per dataset, Node
  requirement matches `engines` (22.13).
- File names follow the new name: `lib/hybrid.mjs` → `lib/or-search.mjs`,
  `test/hybrid.test.mjs` → `test/or-search.test.mjs`, demo database
  `fts5-or-demo.db`. `import … from 'fts5-or-search'` is unaffected; deep
  imports of `lib/hybrid.mjs` must switch to the new path. Function and lane
  names (`hybridSearch`, `hybrid`, `hybrid-fts`) stay, because the
  measurements refer to them. `tasks/` and `docs/VALIDATION.md` keep the old
  paths as historical records.

### Changed: recommendation is plain OR with FTS5 BM25 (docs only, no API change)
- The README was rewritten around the BEIR measurements: plain quoted OR
  with `ORDER BY rank` is the documented recommendation.
- The three re-rank exports (`coverageRerank`, `hybridSearch`,
  `makeFtsTermPresent`) stay exported and are documented as measured, not
  recommended.
- The private-corpus measurement left the README: not reproducible from the
  repo, replaced by public datasets.

### Added: BEIR validation
- `scripts/beir-bench.mjs`, `scripts/beir-compare.mjs`, `scripts/metrics.mjs`
  and `docs/VALIDATION.md`.
- Validated on SciFact, NFCorpus, FiQA and TREC-COVID.

## 0.1.1 (unreleased, review-fixes-2026-10-28)

### Fixed: makeFtsTermPresent ignored the row under node:sqlite
- `node:sqlite` binds JS numbers as REAL; FTS5 then silently drops a
  `rowid = <REAL>` condition next to `MATCH`, so the hook answered "present"
  whenever the term occurred anywhere in the index — coverage was constant
  per query and blend/blendidf lanes collapsed onto `or`.
- Fixed by binding the rowid as `CAST(? AS INTEGER)`; caught by
  `test/fts-term-present.test.mjs`.

### Removed: dead `--tokenizer` flag in bench.mjs
- It was only echoed in the header, never applied (the tokenizer is fixed at
  index-build time by corpus-from-md.mjs, where the flag legitimately lives).
  Removing a flag that never had any effect.

### Bench honesty
- `--repeat N` (default 3): per-lane, per-case **worst-of-N** timing; the
  hybrid lane's timer now covers both SQL queries (OR pool + AND floor) and
  the re-rank, not just the first query.
- `npm run bench` uses `--k 3` so the candidate pool is smaller than the
  demo corpus (at k=10 with 8 docs, hit@k=1.0 is vacuous).
- README headline numbers are now the reproducible demo-corpus measurements;
  the 1 291-doc private-corpus table is explicitly marked non-reproducible
  and the hybrid-below-OR MRR is stated honestly.

### Behavior change: coverageRerank counts token-exact, distinct terms
- Coverage used to be substring-based (`text.includes(term)`): "Frank"
  covered `rank`, "airport" covered `port`. It now splits the row text with
  the same cutting rules as `tokenize()` (stopwords and 1-char tokens kept,
  unicode61-style diacritic folding, `ß` preserved) and requires whole-token
  matches; dotted/hyphenated terms match as one token or a contiguous token
  sequence (`127.0.0.1`).
- Duplicate query terms counted twice although the docstring promised
  distinct terms; they now count once.
- New optional hook `opts.termPresent(term, row, text)`; when the database
  handle is available, `makeFtsTermPresent(db, table)` asks FTS5 itself and
  is tokenizer-exact (Porter-aware). This is the recommended variant.
- Ranking results can change (that is the point: the old ranking rewarded
  substring accidents).

### Behavior change: tokenize() strips edge punctuation
- `gateway.` yielded the term `gateway.`; `restart gateway ...` compiled to
  an AND term `"..."` that matches nothing. Leading/trailing `.` and `-` are
  now stripped per token and letter/digit-free tokens are dropped. Inner
  dots/hyphens of code-like tokens (`v1.2.3-beta`, `memory-lancedb`) are
  unchanged.

### Behavior change: hybridSearch issues two queries by default (andFloor)
- Under LIMIT, a truncated OR pool can evict the single document containing
  ALL query terms (short single-term docs with strong BM25 crowd it out),
  so `hybridSearch` could drop a hit that `fts-and` at the same k still
  returned — reproduced in `test/regression.test.mjs` (B2).
- New option `andFloor` (default `true`): hybrid additionally runs
  `search(AND-match, k)` and merges the hits into the rerank pool (dedup by
  `opts.idOf`, default `id ?? _rid ?? rowid`, content-equality fallback).
  Every AND@k document is now in the pool and, carrying full coverage,
  outranks partial coverers. This supersedes the previous unqualified
  "can never lose a hit" guarantee.
- `andFloor: false` restores the old single-query behavior exactly
  (pinned by a dedicated test).
- Cost: one extra FTS5 query per hybridSearch call. On the bundled demo
  corpus the bench latency stayed at 0.1 ms average per lane (well below
  measurement resolution); on large corpora budget roughly a second AND
  query's worth of time.
