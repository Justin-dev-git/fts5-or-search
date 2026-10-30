# BEIR validation of OR + coverage re-rank (T11)

Measured on the GX10 host on 2026-10-28 with `scripts/beir-bench.mjs`,
`--repeat 3` (worst-of-3 p50/p95 latency per query, retrieval + re-rank),
five lanes over in-memory FTS5 (`tokenize='porter unicode61'`,
content = `title + "\n" + text`). Metrics from `scripts/metrics.mjs`
(trec_eval conventions: linear gain, `log2(rank+1)` discount; queries
without a relevant judged document are excluded; judged queries missing
from a run count as 0). The datasets were downloaded for measurement and
are **not** committed to this repo; the `sha256sum` lines below pin exactly
what was measured.

Run command (per dataset):

```
node scripts/beir-bench.mjs --data /tmp/beir/<dataset> --repeat 3 --json
```

## SciFact

> Note (T14): values for hybrid-fts, blend-* and blendidf-* in this section were measured with the broken makeFtsTermPresent hook and are invalid. Valid values: section T14.

- Source: SciFact claim-verification evidence retrieval, distributed in
  BEIR format by Thakur et al. (2021),
  <https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip>;
  dataset homepage <https://github.com/allenai/scifact>.
- License: CC BY-NC 2.0 (dataset license as stated in Appendix E of
  Thakur et al., 2021). The BEIR framework/repo itself is Apache-2.0.
- Checksum as printed at download:

536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165  scifact.zip

- Documents: 5 183 (`corpus.jsonl`). Queries: `queries.jsonl` holds 1 109
  entries; `qrels/test.tsv` judges 300 of them, and those 300 are the
  evaluated queries (all 300 have at least one relevant document).

Results (`--repeat 3`, this machine):

```
lane            ndcg@10  mrr@10  recall@100  p50ms  p95ms
and             0.0616   0.0667  0.0603      0.08   0.19
or              0.6878   0.6497  0.9193      1.90   3.46
hybrid          0.5907   0.5596  0.8552      32.73  40.39
hybrid-nofloor  0.5924   0.5618  0.8552      32.12  38.79
hybrid-fts      0.6870   0.6488  0.9193      24.94  45.77
```

Raw JSON line (last line of the `--json` run):

```
{"dataset":"scifact","docs":5183,"queries":300,"lanes":{"and":{"ndcg10":0.0616,"mrr10":0.0667,"recall100":0.0603,"p50ms":0.08,"p95ms":0.19},"or":{"ndcg10":0.6878,"mrr10":0.6497,"recall100":0.9193,"p50ms":1.9,"p95ms":3.46},"hybrid":{"ndcg10":0.5907,"mrr10":0.5596,"recall100":0.8552,"p50ms":32.73,"p95ms":40.39},"hybrid-nofloor":{"ndcg10":0.5924,"mrr10":0.5618,"recall100":0.8552,"p50ms":32.12,"p95ms":38.79},"hybrid-fts":{"ndcg10":0.687,"mrr10":0.6488,"recall100":0.9193,"p50ms":24.94,"p95ms":45.77}}}
```

Published BM25 nDCG@10 for SciFact: **0.665** (Table 2, Thakur et al.,
2021, "BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of
Information Retrieval Models", NeurIPS 2021 Datasets and Benchmarks).
Measured `or` lane: 0.6878; difference **+0.0228**.

## NFCorpus

> Note (T14): values for hybrid-fts, blend-* and blendidf-* in this section were measured with the broken makeFtsTermPresent hook and are invalid. Valid values: section T14.

- Source: NFCorpus natural-language medical retrieval (Boteva et al.,
  2016), distributed in BEIR format by Thakur et al. (2021),
  <https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/nfcorpus.zip>;
  dataset homepage <https://www.cl.uni-heidelberg.de/statnlpgroup/nfcorpus/>.
- License: no formal license is stated — the NFCorpus homepage says the
  corpus is "free to use for academic purposes" and refers other uses of
  the included NutritionFacts.org data to that site's terms of service;
  Appendix E of Thakur et al. (2021) explicitly lists NFCorpus among the
  datasets whose authors do not report a license. The BEIR framework/repo
  itself is Apache-2.0.
- Checksum as printed at download:

efe5be03f8c5b86a5870102d0599d227c8c6e2484328e68c6522560385671b0b  nfcorpus.zip

- Documents: 3 633 (`corpus.jsonl`). Queries: `queries.jsonl` holds 3 237
  entries; `qrels/test.tsv` (12 334 judged pairs) judges 323 of them, and
  those 323 are the evaluated queries (all 323 have at least one relevant
  document).

Results (`--repeat 3`, this machine):

```
lane            ndcg@10  mrr@10  recall@100  p50ms  p95ms
and             0.2097   0.3484  0.1043      0.04   0.19
or              0.3209   0.5247  0.2458      0.30   1.25
hybrid          0.2988   0.5041  0.2337      8.21   21.11
hybrid-nofloor  0.2988   0.5042  0.2338      8.14   20.29
hybrid-fts      0.3202   0.5244  0.2457      3.29   16.02
```

Raw JSON line (last line of the `--json` run):

```
{"dataset":"nfcorpus","docs":3633,"queries":323,"lanes":{"and":{"ndcg10":0.2097,"mrr10":0.3484,"recall100":0.1043,"p50ms":0.04,"p95ms":0.19},"or":{"ndcg10":0.3209,"mrr10":0.5247,"recall100":0.2458,"p50ms":0.3,"p95ms":1.25},"hybrid":{"ndcg10":0.2988,"mrr10":0.5041,"recall100":0.2337,"p50ms":8.21,"p95ms":21.11},"hybrid-nofloor":{"ndcg10":0.2988,"mrr10":0.5042,"recall100":0.2338,"p50ms":8.14,"p95ms":20.29},"hybrid-fts":{"ndcg10":0.3202,"mrr10":0.5244,"recall100":0.2457,"p50ms":3.29,"p95ms":16.02}}}
```

Published BM25 nDCG@10 for NFCorpus: **0.325** (Table 2, Thakur et al.,
2021, same source as above). Measured `or` lane: 0.3209; difference
**−0.0041**.

## Deviation check against the published BM25 values

| dataset  | published BM25 | `or` lane | difference |
|----------|---------------:|----------:|-----------:|
| SciFact  |          0.665 |    0.6878 |    +0.0228 |
| NFCorpus |          0.325 |    0.3209 |    −0.0041 |

Both |difference| ≤ 0.10; the stop criterion (deviation > 0.10 on either
dataset) did not trigger. The differences are recorded as measured.

## E1–E4 (docs/ZIEL.md), per dataset

> Note (T14): values for hybrid-fts, blend-* and blendidf-* in this section were measured with the broken makeFtsTermPresent hook and are invalid. Valid values: section T14.

- **E1** (`or` nDCG@10 ≥ `and` + 0.10 on both datasets): **erfüllt** —
  SciFact 0.6878 ≥ 0.0616 + 0.10 (gap 0.6262); NFCorpus 0.3209 ≥
  0.2097 + 0.10 (gap 0.1112).
- **E2** (`hybrid` nDCG@10 ≥ `or` on both datasets): **nicht erfüllt** —
  SciFact 0.5907 < 0.6878 (−0.0971); NFCorpus 0.2988 < 0.3209 (−0.0221).
- **E3** (`hybrid` Recall@100 ≥ `and` Recall@100): **erfüllt** — SciFact
  0.8552 ≥ 0.0603; NFCorpus 0.2337 ≥ 0.1043.
- **E4** (`hybrid` p95 ≤ 50 ms per query): **erfüllt** — SciFact 40.39 ms;
  NFCorpus 21.11 ms.

Judgement and any recommendation are the Owner's call; this page only
records the measurements behind E1–E4.

## T12

> Note (T14): values for hybrid-fts, blend-* and blendidf-* in this section were measured with the broken makeFtsTermPresent hook and are invalid. Valid values: section T14.

T12 asks whether the coverage re-rank ever helps: per-query win/tie/loss
against `or`, a term-count breakdown, and two gentler blends
(`blend-λ`: `norm + λ·cov` over the OR top-500 pool; `blendidf-λ`: same with
IDF-weighted coverage). Lanes live in `scripts/beir-bench.mjs`; `lib/` is
unchanged. Tuning happened on SciFact and NFCorpus only; FiQA is a pure
holdout (nothing was adjusted on it).

### FiQA (holdout dataset)

- Source: FiQA-2018 financial QA retrieval, distributed in BEIR format by
  Thakur et al. (2021),
  <https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/fiqa.zip>;
  dataset homepage <https://sites.google.com/view/fiqa/> (BEIR repo
  dataset table).
- License: no formal license is reported — Appendix E of Thakur et al.
  (2021) explicitly lists FiQA-2018 among the four BEIR datasets whose
  authors do not report a dataset license. The BEIR framework/repo itself
  is Apache-2.0.
- Checksum as printed at download:

32c7df99ed21252fdfb2cf3f5673502a8d245ee0c44c4a133570d92ce2b3ad02  fiqa.zip

- Documents: 57 638 (`corpus.jsonl`). Queries: `queries.jsonl` holds 6 648
  entries; `qrels/test.tsv` judges 648 of them, and those 648 are the
  evaluated queries.
- Published BM25 nDCG@10: **0.236** (Table 2, Thakur et al., 2021).
  Measured `or` lane: 0.2535; difference **+0.0175**.

### λ selection (SciFact + NFCorpus only)

Mean nDCG@10 over SciFact and NFCorpus, per task rule "highest mean wins":

| lane | SciFact | NFCorpus | mean |
|------|--------:|---------:|-----:|
| blend-0 | 0.6878 | 0.3209 | 0.50435 |
| blend-0.1 | 0.6878 | 0.3209 | 0.50435 |
| blend-0.2 | 0.6878 | 0.3209 | 0.50435 |
| blend-0.5 | 0.6878 | 0.3209 | 0.50435 |
| blendidf-0.1 | 0.6878 | 0.3209 | 0.50435 |
| blendidf-0.2 | 0.6878 | 0.3209 | 0.50435 |
| blendidf-0.5 | 0.6878 | 0.3209 | 0.50435 |

All λ tie at the same mean on both datasets. Chosen: **blend-0.1** and
**blendidf-0.1** — the smallest strictly positive λ of each family among
the tied maxima (no other tie-break rule was specified).

Why every blend equals `or` exactly: in all three corpora the FTS-exact
coverage of the distinct query terms is monotonically non-increasing along
BM25 pool order, so `norm + λ·cov` never inverts the pool. Direct check on
SciFact: 300/300 judged queries have non-increasing coverage along the
OR top-500 order; per-query compares on all three datasets show
W=0 L=0 T=all for every blend lane against `or`.

### Full-lane tables (tuning datasets, `--repeat 3`)

SciFact (`node scripts/beir-bench.mjs --data /tmp/beir/scifact --repeat 3 --per-query /tmp/beir/scifact.pq.jsonl --json`):

```
lane            ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
and             0.0616   0.0667  0.0603      0.0067  0.07   0.18
or              0.6878   0.6497  0.9193      0.0910  1.80   3.27
hybrid          0.5907   0.5596  0.8552      0.0780  19.85  24.23
hybrid-nofloor  0.5924   0.5618  0.8552      0.0780  19.42  23.92
hybrid-fts      0.6870   0.6488  0.9193      0.0910  22.06  42.07
blend-0         0.6878   0.6497  0.9193      0.0910  22.44  43.33
blend-0.1       0.6878   0.6497  0.9193      0.0910  21.58  40.91
blend-0.2       0.6878   0.6497  0.9193      0.0910  21.19  40.49
blend-0.5       0.6878   0.6497  0.9193      0.0910  21.17  40.86
blendidf-0.1    0.6878   0.6497  0.9193      0.0910  21.32  41.22
blendidf-0.2    0.6878   0.6497  0.9193      0.0910  23.00  43.38
blendidf-0.5    0.6878   0.6497  0.9193      0.0910  22.29  42.99
```

NFCorpus (`node scripts/beir-bench.mjs --data /tmp/beir/nfcorpus --repeat 3 --per-query /tmp/beir/nfcorpus.pq.jsonl --json`):

```
lane            ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
and             0.2097   0.3484  0.1043      0.1415  0.04   0.25
or              0.3209   0.5247  0.2458      0.2337  0.36   1.32
hybrid          0.2988   0.5041  0.2337      0.2149  8.46   21.02
hybrid-nofloor  0.2988   0.5042  0.2338      0.2149  8.23   20.49
hybrid-fts      0.3202   0.5244  0.2457      0.2331  3.44   16.37
blend-0         0.3209   0.5247  0.2458      0.2337  3.11   15.59
blend-0.1       0.3209   0.5247  0.2458      0.2337  3.07   15.65
blend-0.2       0.3209   0.5247  0.2458      0.2337  3.07   15.62
blend-0.5       0.3209   0.5247  0.2458      0.2337  3.06   15.55
blendidf-0.1    0.3209   0.5247  0.2458      0.2337  3.09   15.85
blendidf-0.2    0.3209   0.5247  0.2458      0.2337  3.07   15.70
blendidf-0.5    0.3209   0.5247  0.2458      0.2337  3.08   15.63
```

### FiQA holdout (`--repeat 1`, only the required lanes)

`node scripts/beir-bench.mjs --data /tmp/beir/fiqa --repeat 1 --lanes or,hybrid,hybrid-fts,blend-0.1,blendidf-0.1 --per-query /tmp/beir/fiqa.pq.jsonl --json`

```
lane          ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or            0.2535   0.3164  0.5604      0.0690  12.57  25.83
hybrid        0.1621   0.2076  0.4774      0.0463  25.50  42.21
hybrid-fts    0.2423   0.2981  0.5570      0.0665  38.26  67.81
blend-0.1     0.2535   0.3164  0.5604      0.0690  36.89  65.23
blendidf-0.1  0.2535   0.3164  0.5604      0.0690  36.85  65.52
```

Raw JSON line (last line of the `--json` run):

```
{"dataset":"fiqa","docs":57638,"queries":648,"lanes":{"or":{"ndcg10":0.2535,"mrr10":0.3164,"recall100":0.5604,"p10":0.069,"p50ms":12.57,"p95ms":25.83},"hybrid":{"ndcg10":0.1621,"mrr10":0.2076,"recall100":0.4774,"p10":0.0463,"p50ms":25.5,"p95ms":42.21},"hybrid-fts":{"ndcg10":0.2423,"mrr10":0.2981,"recall100":0.557,"p10":0.0665,"p50ms":38.26,"p95ms":67.81},"blend-0.1":{"ndcg10":0.2535,"mrr10":0.3164,"recall100":0.5604,"p10":0.069,"p50ms":36.89,"p95ms":65.23},"blendidf-0.1":{"ndcg10":0.2535,"mrr10":0.3164,"recall100":0.5604,"p10":0.069,"p50ms":36.85,"p95ms":65.52}}}
```

### Per-query compares (`scripts/beir-compare.mjs`)

SciFact:

```
hybrid vs or: W=19 T=206 L=75
terms 1-3  n=1  W=0 T=1 L=0  hybrid: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
terms 4-6  n=86  W=3 T=66 L=17  hybrid: ndcg@10=0.6327 p@10=0.0802  or: ndcg@10=0.7067 p@10=0.0895
terms 7+   n=213  W=16 T=139 L=58  hybrid: ndcg@10=0.5718 p@10=0.0770  or: ndcg@10=0.6787 p@10=0.0915
blend-0.1 vs or: W=0 T=300 L=0
blendidf-0.1 vs or: W=0 T=300 L=0
```

NFCorpus:

```
hybrid vs or: W=49 T=201 L=73
terms 1-3  n=234  W=26 T=173 L=35  hybrid: ndcg@10=0.3135 p@10=0.2226  or: ndcg@10=0.3305 p@10=0.2355
terms 4-6  n=83  W=23 T=24 L=36  hybrid: ndcg@10=0.2723 p@10=0.2048  or: ndcg@10=0.3054 p@10=0.2373
terms 7+   n=6  W=0 T=4 L=2  hybrid: ndcg@10=0.0913 p@10=0.0500  or: ndcg@10=0.1601 p@10=0.1167
blend-0.1 vs or: W=0 T=323 L=0
blendidf-0.1 vs or: W=0 T=323 L=0
```

FiQA (holdout):

```
hybrid vs or: W=80 T=347 L=221
terms 1-3  n=34  W=4 T=25 L=5  hybrid: ndcg@10=0.0593 p@10=0.0294  or: ndcg@10=0.0709 p@10=0.0324
terms 4-6  n=264  W=27 T=149 L=88  hybrid: ndcg@10=0.1666 p@10=0.0417  or: ndcg@10=0.2597 p@10=0.0652
terms 7+   n=350  W=49 T=173 L=128  hybrid: ndcg@10=0.1687 p@10=0.0514  or: ndcg@10=0.2665 p@10=0.0754
blend-0.1 vs or: W=0 T=648 L=0
blendidf-0.1 vs or: W=0 T=648 L=0
```

### Facts (no recommendation)

- **Wins a lane on FiQA against `or` at nDCG@10 AND P@10?** No.
  hybrid: 0.1621 < 0.2535 nDCG@10 and 0.0463 < 0.0690 P@10 (loses both).
  blend-0.1: 0.2535 = 0.2535 and 0.0690 = 0.0690 (ties, does not win).
  blendidf-0.1: ties, does not win. hybrid-fts: 0.2423 < 0.2535 and
  0.0665 < 0.0690 (loses both).
- **Wins `hybrid` in the group `terms 1-3`?** SciFact: no (n=1, single
  query ties; 0 W / 1 T / 0 L). NFCorpus: no (26 W / 173 T / 35 L, group
  means 0.3135 < 0.3305 nDCG@10 and 0.2226 < 0.2355 P@10). FiQA: no
  (4 W / 25 T / 5 L, group means 0.0593 < 0.0709 nDCG@10 and
  0.0294 < 0.0324 P@10).
- On these three corpora, `blend-λ` and `blendidf-λ` are identical to `or`
  on every judged query for every λ tested (W=0 T=all L=0), because FTS-exact
  coverage never inverts BM25 pool order here (SciFact: 300/300 queries
  monotonically non-increasing).

## T13

T13 tests the cheapest imaginable improvement over plain OR with BM25:
title and text in separate FTS5 columns scored with
`bm25(docs2, 0.0, w, 1.0)` (title column weighted w-fach). No dependency,
no second query, one SQL line. Judged against criterion E5 in
`docs/ZIEL.md` on a dataset that was **not** tuned on. Tuning datasets:
SciFact and NFCorpus (weights 1, 2, 3, 5). Holdout: TREC-COVID. FiQA was
rejected as the holdout because its documents almost never carry a title
(`title` is empty in essentially all `corpus.jsonl` rows), so title
weighting could not show any effect there. Lanes live in
`scripts/beir-bench.mjs`; `lib/` is unchanged.

### Weight selection (SciFact + NFCorpus only, `--repeat 3`)

`node scripts/beir-bench.mjs --data /tmp/beir/<ds> --repeat 3 --lanes or,or-title-1,or-title-2,or-title-3,or-title-5 --title-weights 1,2,3,5 --json`

SciFact:

```
lane        ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or          0.6878   0.6497  0.9193      0.0910  1.77   3.24
or-title-1  0.6878   0.6497  0.9193      0.0910  2.21   3.52
or-title-2  0.6927   0.6569  0.9160      0.0910  2.23   3.53
or-title-3  0.6942   0.6578  0.9160      0.0913  2.21   3.52
or-title-5  0.6922   0.6564  0.9153      0.0910  2.20   3.52
```

NFCorpus:

```
lane        ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or          0.3209   0.5247  0.2458      0.2337  0.36   1.39
or-title-1  0.3209   0.5247  0.2458      0.2337  0.61   1.92
or-title-2  0.3236   0.5306  0.2461      0.2353  0.62   1.88
or-title-3  0.3237   0.5259  0.2474      0.2347  0.60   1.88
or-title-5  0.3216   0.5195  0.2476      0.2334  0.60   1.90
```

Mean nDCG@10 over both datasets: `or-title-1` 0.50435, `or-title-2`
0.50815, `or-title-3` **0.50895**, `or-title-5` 0.5069. Selected
**w = 3** (highest mean over SciFact + NFCorpus). `or-title-1` is the fair
no-weight comparison for split columns: it matches `or` on every metric on
both tuning datasets (and on TREC-COVID below), i.e. splitting columns
alone changes nothing.

### TREC-COVID (holdout, `--repeat 1`, nothing adjusted here)

- Source: TREC-COVID ad-hoc challenge over the CORD-19 corpus (July 16,
  2020 version), final cumulative judgements, distributed in BEIR format by
  Thakur et al. (2021),
  <https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/trec-covid.zip>;
  task homepage <https://trec-covid.org/>.
- License: CORD-19 is distributed under CC BY 4.0 (per the CORD-19 release
  terms cited by the TREC-COVID organizers); the BEIR framework/repo itself
  is Apache-2.0.
- Checksum as printed at download:

120f42a7864d2214234537733c0d2c6684e42fdfafff2c5eacf98afca6656aa0  trec-covid.zip

- Documents: 171 332 (`corpus.jsonl`). Queries: `queries.jsonl` holds 50
  entries; all 50 are judged in `qrels/test.tsv` (66 336 judged pairs) and
  are the evaluated queries.
- Published BM25 nDCG@10: **0.656** (Table 2, Thakur et al., 2021; Table 4
  lists 0.668 after the authors' hole-filling re-annotation). Measured `or`
  lane: 0.6020; difference against the Table 2 value **−0.0540**, below the
  0.10 deviation threshold from T11.

`node scripts/beir-bench.mjs --data /tmp/beir/trec-covid --repeat 1 --lanes or,or-title-1,or-title-3 --title-weights 1,3 --per-query /tmp/beir/trec-covid.pq.jsonl --json`

```
lane         ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or           0.6020   0.9150  0.1037      0.6240  60.23  82.22
or-title-1   0.6020   0.9150  0.1036      0.6240  43.66  61.92
or-title-3   0.5893   0.8883  0.1004      0.6240  43.26  60.51
```

Raw JSON line (last line of the `--json` run):

```
{"dataset":"trec-covid","docs":171332,"queries":50,"lanes":{"or":{"ndcg10":0.602,"mrr10":0.915,"recall100":0.1037,"p10":0.624,"p50ms":60.23,"p95ms":82.22},"or-title-1":{"ndcg10":0.602,"mrr10":0.915,"recall100":0.1036,"p10":0.624,"p50ms":43.66,"p95ms":61.92},"or-title-3":{"ndcg10":0.5893,"mrr10":0.8883,"recall100":0.1004,"p10":0.624,"p50ms":43.26,"p95ms":60.51}}}
```

### Facts — E5 for `or-title-3` against `or` on TREC-COVID (no recommendation)

- ΔnDCG@10 = 0.5893 − 0.6020 = **−0.0127** (E5 requires ≥ +0.01: not met).
- ΔP@10 = 0.6240 − 0.6240 = **0.0000** (E5 requires "not worse": met).
- p95 ratio = 60.51 / 82.22 = **0.74** (E5 requires ≤ 3.0: met).
- Additional library lines if adopted: **2** (one schema line for the split
  `docs2` table, one SQL line using `bm25(docs2, 0.0, ?, 1.0)`); E5 budget
  ≈ 50 lines: met.
- E5 overall on this holdout: **not met** — the nDCG@10 gate fails; the
  selected weight loses 0.0127 nDCG@10 against `or` while winning on
  latency and cost.

## T14

T14 fixes a bug in `makeFtsTermPresent` (`lib/hybrid.mjs`) found in the T12
review. `node:sqlite` binds JS numbers as REAL, and FTS5 silently drops a
`rowid = <REAL>` condition next to `MATCH`; independently reproduced on
SQLite 3.53.1 (Python) and 3.53.4 (Node 22): `MATCH '"wind"' AND rowid = 1`
returns row 2 instead of nothing. The hook therefore answered "present"
whenever the term occurred anywhere in the index, which made FTS-exact
coverage constant per query. Consequences: every `blend-*`/`blendidf-*` lane
was identical to `or`, and the T12 claim that coverage falls monotonically
along BM25 pool order was an artefact of this bug; `hybrid-fts` was really
"AND-top-k first, then OR order". `and`, `or`, `hybrid`, `hybrid-nofloor`
and `or-title-*` were not affected. The fix binds the rowid as
`CAST(? AS INTEGER)`; `test/fts-term-present.test.mjs` fails 3 of 4 tests
without it and 4/4 with it.

### Re-measurement, tuning datasets (SciFact, NFCorpus; `--repeat 3`)

Command (per dataset):
`node scripts/beir-bench.mjs --data /tmp/beir/<ds> --repeat 3 --lanes or,hybrid,hybrid-fts,blend-0,blend-0.1,blend-0.2,blend-0.5,blendidf-0.1,blendidf-0.2,blendidf-0.5 --per-query /tmp/beir/<ds>.t14.jsonl --json`

Control: `blend-0` equals `or` exactly on nDCG@10, MRR@10, Recall@100 and
P@10 on both datasets (SciFact 0.6878/0.6497/0.9193/0.0910; NFCorpus
0.3209/0.5247/0.2458/0.2337).

SciFact:

```
lane          ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or            0.6878   0.6497  0.9193      0.0910  2.09   3.77
hybrid        0.5907   0.5596  0.8552      0.0780  33.62  41.71
hybrid-fts    0.6100   0.5761  0.8590      0.0810  30.83  60.80
blend-0       0.6878   0.6497  0.9193      0.0910  28.33  56.44
blend-0.1     0.6860   0.6473  0.9160      0.0910  28.98  57.57
blend-0.2     0.6837   0.6449  0.9127      0.0907  29.97  60.25
blend-0.5     0.6834   0.6490  0.9147      0.0890  28.72  57.74
blendidf-0.1  0.6859   0.6472  0.9160      0.0910  29.52  59.04
blendidf-0.2  0.6840   0.6456  0.9160      0.0907  30.43  60.17
blendidf-0.5  0.6860   0.6482  0.9187      0.0907  30.45  60.35
```

NFCorpus:

```
lane          ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or            0.3209   0.5247  0.2458      0.2337  0.50   1.46
hybrid        0.2988   0.5041  0.2337      0.2149  12.06  33.75
hybrid-fts    0.3056   0.4987  0.2398      0.2186  4.47   21.37
blend-0       0.3209   0.5247  0.2458      0.2337  3.89   20.36
blend-0.1     0.3193   0.5213  0.2455      0.2322  3.27   19.07
blend-0.2     0.3178   0.5190  0.2455      0.2303  3.39   18.86
blend-0.5     0.3159   0.5188  0.2438      0.2288  3.27   18.85
blendidf-0.1  0.3206   0.5237  0.2458      0.2331  3.31   18.98
blendidf-0.2  0.3200   0.5238  0.2457      0.2325  3.37   18.84
blendidf-0.5  0.3171   0.5161  0.2443      0.2303  3.40   18.98
```

### λ selection (SciFact + NFCorpus only)

Mean nDCG@10 over the two tuning datasets per task rule "highest mean
wins", ties go to the smaller λ:

| lane | SciFact | NFCorpus | mean |
|------|--------:|---------:|-----:|
| blend-0.1 | 0.6860 | 0.3193 | **0.50265** |
| blend-0.2 | 0.6837 | 0.3178 | 0.50075 |
| blend-0.5 | 0.6834 | 0.3159 | 0.49965 |
| blendidf-0.1 | 0.6859 | 0.3206 | **0.50325** |
| blendidf-0.2 | 0.6840 | 0.3200 | 0.50200 |
| blendidf-0.5 | 0.6860 | 0.3171 | 0.50155 |

Selected: **blend-0.1** and **blendidf-0.1** (highest mean in each family;
no ties occurred).

### Re-measurement, test datasets (FiQA, TREC-COVID; `--repeat 3`, nothing adjusted here)

Command (per dataset):
`node scripts/beir-bench.mjs --data /tmp/beir/<ds> --repeat 3 --lanes or,hybrid-fts,blend-0.1,blendidf-0.1 --per-query /tmp/beir/<ds>.t14.jsonl --json`

FiQA:

```
lane          ndcg@10  mrr@10  recall@100  p@10    p50ms   p95ms
or            0.2535   0.3164  0.5604      0.0690  13.07   26.26
hybrid-fts    0.1732   0.2249  0.4625      0.0466  79.89   147.33
blend-0.1     0.2540   0.3164  0.5613      0.0691  78.29   146.36
blendidf-0.1  0.2548   0.3172  0.5609      0.0690  76.44   142.53
```

TREC-COVID:

```
lane          ndcg@10  mrr@10  recall@100  p@10    p50ms   p95ms
or            0.6020   0.9150  0.1037      0.6240  60.85   83.63
hybrid-fts    0.4791   0.7533  0.0837      0.5420  133.70  253.98
blend-0.1     0.5997   0.9050  0.1026      0.6300  125.55  250.82
blendidf-0.1  0.5915   0.9083  0.1028      0.6220  133.02  244.82
```

### Per-query compares (`node scripts/beir-compare.mjs /tmp/beir/<ds>.t14.jsonl --a <lane> --b or`)

SciFact:

```
hybrid-fts vs or: W=15 T=217 L=68
blend-0.1 vs or: W=5 T=287 L=8
blendidf-0.1 vs or: W=2 T=291 L=7
```

NFCorpus:

```
hybrid-fts vs or: W=24 T=247 L=52
blend-0.1 vs or: W=15 T=287 L=21
blendidf-0.1 vs or: W=17 T=295 L=11
```

FiQA:

```
hybrid-fts vs or: W=67 T=378 L=203
blend-0.1 vs or: W=41 T=555 L=52
blendidf-0.1 vs or: W=42 T=563 L=43
```

TREC-COVID:

```
hybrid-fts vs or: W=18 T=1 L=31
blend-0.1 vs or: W=24 T=12 L=14
blendidf-0.1 vs or: W=17 T=15 L=18
```

Term-count group detail (nDCG@10/P@10 group means) is in the raw compare
runs; the full four-dataset output is reproduced in the T14 report.

### Latency note

`blend-*`, `blendidf-*` and `hybrid-fts` issue one FTS5 query per term and
document. Their latency is therefore an upper bound.

### Facts (E5 from docs/ZIEL.md without the line-count criterion; no recommendation)

ΔnDCG@10 / ΔP@10 / p95 ratio against `or` per lane and holdout dataset:

| dataset | lane | ΔnDCG@10 | ΔP@10 | p95 ratio | E5 (excl. lines) |
|---------|------|---------:|------:|----------:|------------------|
| FiQA | blend-0.1 | +0.0005 | +0.0001 | 146.36/26.26 = 5.57 | not met (nDCG < +0.01; p95 > 3) |
| FiQA | blendidf-0.1 | +0.0013 | 0.0000 | 142.53/26.26 = 5.43 | not met (nDCG < +0.01; p95 > 3) |
| FiQA | hybrid-fts | −0.0803 | −0.0224 | 147.33/26.26 = 5.61 | not met (all three) |
| TREC-COVID | blend-0.1 | −0.0023 | +0.0060 | 250.82/83.63 = 3.00 | not met (nDCG < +0.01) |
| TREC-COVID | blendidf-0.1 | −0.0105 | −0.0020 | 244.82/83.63 = 2.93 | not met (nDCG, P@10) |
| TREC-COVID | hybrid-fts | −0.1229 | −0.0820 | 253.98/83.63 = 3.04 | not met (all three) |

- Line-count reference point: the `blend` function in
  `scripts/beir-bench.mjs` spans **26 lines** (131–156); E5 budget ≈ 50.
- Steering criterion from `docs/ZIEL.md` (`hybrid-fts` beats `hybrid` by
  ≥ 0.02 nDCG@10 → FTS-exact coverage becomes the recommendation): SciFact
  0.6100 − 0.5907 = **+0.0193** (below 0.02), NFCorpus 0.3056 − 0.2988 =
  **+0.0068** (below 0.02). Criterion not triggered on either dataset.

## T16 – German

Question from `docs/ZIEL.md` ("Deutsch"): does any extension beat plain
quoted OR with FTS5 BM25 for German? Two extensions were measured:
`or-stem`/`or-stem-paradigm` (all variants from `german-fts5-stemmer`,
OR-joined; one family) and `or-trigram` (the built-in FTS5 `trigram`
tokenizer, sub-word hits such as "Ausweis" inside "Personalausweis").
Selection was allowed on GermanDPR only; GovService was a holdout with
nothing adjusted. The reference lane `or` runs on a `unicode61` index
(folds umlauts, keeps ß); all lanes share the `STOPWORDS` list from
german-fts5-stemmer.

Stemmer module commit used for every `or-stem*` lane:
`git -C <german-fts5-stemmer-clone> rev-parse HEAD` →
`17e64135d75c6948baa113479e80548cc93ba74c` (branch
`review-fixes-2026-10-28`).

Command form (3a on GermanDPR showed all lanes; 3b on GovService was
restricted to the selected stem lane):

```
node "$REPO/scripts/beir-bench.mjs" --data /tmp/beir-de/germandpr --lang de --stemmer "$STEMMER" --repeat 3 --per-query /tmp/beir-de/germandpr.t16.jsonl --json
node "$REPO/scripts/beir-bench.mjs" --data /tmp/beir-de/govservice --lang de --stemmer "$STEMMER" --repeat 3 --lanes and,or,or-stem,or-trigram --per-query /tmp/beir-de/govservice.t16.jsonl --json
```

### GermanDPR (selection dataset)

- Source: BEIR export `PM-AI/germandpr-beir`, variant "original"
  (unmodified titles/texts), test split. The original source
  `germanquad.s3.amazonaws.com/GermanDPR.zip` is offline (the S3 bucket no
  longer exists, found 2026-10-28), so the PM-AI export was used; PM-AI
  states no license of its own. GermanDPR itself is CC BY 4.0.
- Checksum of the downloaded archive:

```
ad8bcb01e317f1a4ffef5f3a41f170dd9379c1f3e6e28ec114c695db1f2b1f5d  original.tar.gz
```

- Size/format check (step 1): `docs=2876 queries=1025 qrels=1025
  header="q_id\tc_id\trel"` — matches the reference values from the task
  (2876 docs / 1025 queries / 1025 qrels, per `PM-AI/germandpr-beir`,
  "original").

Results (`--repeat 3`, worst-of-N timing):

```
lane              ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
and               0.0263   0.0235  0.0351      0.0035  0.05   0.11
or                0.4797   0.3759  0.9454      0.0816  1.04   2.36
or-stem           0.4874   0.3881  0.9610      0.0808  1.53   3.09
or-stem-paradigm  0.4703   0.3793  0.9629      0.0765  2.16   4.61
or-trigram        0.5338   0.4332  0.9600      0.0856  3.07   5.61
db size MB: unicode61=7.69 trigram=19.93
```

Stem-lane selection (GermanDPR only): `or-stem` nDCG@10 0.4874 vs
`or-stem-paradigm` 0.4703 → **`or-stem` selected** (higher nDCG@10; the
tie rule "smaller/`or-stem`" was not needed).

Plausibility against NanoMTEB-German BM25 (0.4647; subset of 200 queries,
unknown implementation): measured `or` 0.4797, difference **+0.0150**
(below the 0.15 review trigger).

Per-query compares (`node "$REPO/scripts/beir-compare.mjs"
/tmp/beir-de/germandpr.t16.jsonl --a <lane> --b <base>`):

```
or-stem vs or: W=172 T=621 L=232
terms 1-3  n=125  W=15 T=81 L=29  or-stem: ndcg@10=0.4352 p@10=0.0784  or: ndcg@10=0.4366 p@10=0.0792
terms 4-6  n=595  W=108 T=357 L=130  or-stem: ndcg@10=0.4714 p@10=0.0795  or: ndcg@10=0.4565 p@10=0.0795
terms 7+  n=305  W=49 T=183 L=73  or-stem: ndcg@10=0.5401 p@10=0.0843  or: ndcg@10=0.5425 p@10=0.0866
or-trigram vs or: W=331 T=510 L=184
terms 1-3  n=125  W=34 T=63 L=28  or-trigram: ndcg@10=0.4671 p@10=0.0824  or: ndcg@10=0.4366 p@10=0.0792
terms 4-6  n=595  W=197 T=290 L=108  or-trigram: ndcg@10=0.5165 p@10=0.0839  or: ndcg@10=0.4565 p@10=0.0795
terms 7+  n=305  W=100 T=157 L=48  or-trigram: ndcg@10=0.5947 p@10=0.0902  or: ndcg@10=0.5425 p@10=0.0866
or vs and: W=800 T=219 L=6
terms 1-3  n=125  W=77 T=47 L=1  or: ndcg@10=0.4366 p@10=0.0792  and: ndcg@10=0.1165 p@10=0.0176
terms 4-6  n=595  W=461 T=130 L=4  or: ndcg@10=0.4565 p@10=0.0795  and: ndcg@10=0.0175 p@10=0.0020
terms 7+  n=305  W=262 T=42 L=1  or: ndcg@10=0.5425 p@10=0.0866  and: ndcg@10=0.0066 p@10=0.0007
```

### GermanGovService (holdout dataset)

- Source: Hugging Face `it-at-m/LHM-Dienstleistungen-QA`, test split,
  license MIT. Revision from step 2: `ed40131b56ce86ce3666f2942953595dd9d29608`.
- Rows fetched via the datasets-server rows API (`config=default`,
  `split=test`, offsets 0/100/200/300) and converted with
  `scripts/to-beir.mjs --format hf-rows`, which printed:

```
docs=105 queries=357 qrels=357
```

  Reference values: dataset README says the test split has 357 rows (357
  queries) — matches. MTEB lists 105 documents and 356 queries; the
  query-count difference (357 measured vs 356) is reported, not adjusted.
- Checksums of the converted files:

```
d2e54e7b02625b2a8463839a079cb5cc96048effe94991c898bb3340d2bf3af9  /tmp/beir-de/govservice/corpus.jsonl
78aebfc65c4d3ee1fce5902cc78d2b7c125f448f8b00a2a2acfaeb9b6b628bc0  /tmp/beir-de/govservice/queries.jsonl
0ed41baf5da834612e3350f8fd1990c47652ce79ea635e92a0451baf4bc48c8e  /tmp/beir-de/govservice/qrels/test.tsv
```

Results (`--repeat 3`, lanes fixed by the task; nothing adjusted here):

```
lane        ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
and         0.0753   0.0742  0.0784      0.0078  0.01   0.03
or          0.6937   0.6378  0.9160      0.0866  0.15   0.47
or-stem     0.6968   0.6380  0.9272      0.0877  0.40   1.11
or-trigram  0.7628   0.7164  0.9692      0.0905  0.56   0.87
db size MB: unicode61=0.26 trigram=0.64
```

Plausibility against NanoMTEB-German BM25 (0.6132): measured `or` 0.6937,
difference **+0.0805** (below the 0.15 review trigger).

Per-query compares (`node "$REPO/scripts/beir-compare.mjs"
/tmp/beir-de/govservice.t16.jsonl --a <lane> --b <base>`):

```
or-stem vs or: W=35 T=275 L=47
terms 1-3  n=66  W=0 T=62 L=4  or-stem: ndcg@10=0.6181 p@10=0.0773  or: ndcg@10=0.6312 p@10=0.0773
terms 4-6  n=180  W=20 T=134 L=26  or-stem: ndcg@10=0.6909 p@10=0.0889  or: ndcg@10=0.6797 p@10=0.0867
terms 7+  n=111  W=15 T=79 L=17  or-stem: ndcg@10=0.7530 p@10=0.0919  or: ndcg@10=0.7537 p@10=0.0919
or-trigram vs or: W=93 T=232 L=32
terms 1-3  n=66  W=12 T=53 L=1  or-trigram: ndcg@10=0.6880 p@10=0.0788  or: ndcg@10=0.6312 p@10=0.0773
terms 4-6  n=180  W=48 T=112 L=20  or-trigram: ndcg@10=0.7464 p@10=0.0894  or: ndcg@10=0.6797 p@10=0.0867
terms 7+  n=111  W=33 T=67 L=11  or-trigram: ndcg@10=0.8337 p@10=0.0991  or: ndcg@10=0.7537 p@10=0.0919
or vs and: W=281 T=76 L=0
terms 1-3  n=66  W=31 T=35 L=0  or: ndcg@10=0.6312 p@10=0.0773  and: ndcg@10=0.2863 p@10=0.0303
terms 4-6  n=180  W=149 T=31 L=0  or: ndcg@10=0.6797 p@10=0.0867  and: ndcg@10=0.0389 p@10=0.0039
terms 7+  n=111  W=101 T=10 L=0  or: ndcg@10=0.7537 p@10=0.0919  and: ndcg@10=0.0090 p@10=0.0009
```

### Facts (no recommendation)

E1-DE (`or` nDCG@10 ≥ `and` + 0.10 on both datasets):
- GermanDPR: 0.4797 ≥ 0.0263 + 0.10 (gap 0.4534) → **met**.
- GovService: 0.6937 ≥ 0.0753 + 0.10 (gap 0.6184) → **met**.

E5 (from `docs/ZIEL.md`): ≥ +0.01 nDCG@10 on every untuned dataset, P@10
not worse, p95 at most 3× `or`, about 50 library lines or fewer. `or-stem`
was tuned on GermanDPR, so only GovService counts for it; `or-trigram`
tuned nothing, so both datasets count.

| lane | dataset | ΔnDCG@10 vs `or` | ΔP@10 vs `or` | p95 ratio (lane/or) |
|------|---------|-----------------:|--------------:|--------------------:|
| `or-trigram` | GermanDPR | +0.0541 | +0.0040 | 5.61/2.36 = 2.38 |
| `or-trigram` | GovService | +0.0691 | +0.0039 | 0.87/0.47 = 1.85 |
| `or-stem` (selected) | GovService | +0.0031 | +0.0011 | 1.11/0.47 = 2.36 |

- `or-trigram`: all three measurable E5 conditions (nDCG, P@10, p95) hold
  on both untuned datasets; the line-count condition concerns library code
  and is left to the owner.
- `or-stem` on GovService: ΔnDCG@10 +0.0031 is below the +0.01 threshold —
  E5 not met on GovService.
- Database size, trigram vs unicode61 (`dbBytes` from the bench JSON):
  GermanDPR 20897792/8060928 = **2.59×**, GovService 675840/270336 =
  **2.50×** (reported per ZIEL.md because a trigram index is larger).

## T17 – German, coverage re-rank lanes

T16 omitted the lane that was strongest on the private corpus in earlier
work: `fts-hybrid-expanded` from german-fts5-stemmer — a stemmer-expanded OR
pool followed by coverage re-ranking. It is rebuilt exactly as `hybrid-expanded`,
together with `hybrid` (same re-rank without stemmer), and measured here on
the same data as T16 (checksums verified identical to the `## T16 – German`
section before measuring: GermanDPR `original.tar.gz`
`ad8bcb01e317f1a4ffef5f3a41f170dd9379c1f3e6e28ec114c695db1f2b1f5d`,
govservice `corpus.jsonl`
`d2e54e7b02625b2a8463839a079cb5cc96048effe94991c898bb3340d2bf3af9`,
`queries.jsonl`
`78aebfc65c4d3ee1fce5902cc78d2b7c125f448f8b00a2a2acfaeb9b6b628bc0`,
`qrels/test.tsv`
`0ed41baf5da834612e3350f8fd1990c47652ce79ea635e92a0451baf4bc48c8e`).

Method: a 50-document pool per lane, then per-word-group substring coverage
on the lowercased text, exactly as in german-fts5-stemmer's `bench.mjs`;
`hybrid-expanded` builds its pool from stemmer-expanded OR terms, `hybrid`
from plain OR. Recall@100 is therefore bounded by the 50-document pool.
Stemmer module: `german-fts5-stemmer` at
`17e64135d75c6948baa113479e80548cc93ba74c` (branch `review-fixes-2026-10-28`).

Commands (per dataset `<ds>` in `germandpr`, `govservice`):

```
node "$REPO/scripts/beir-bench.mjs" --data /tmp/beir-de/<ds> --lang de --stemmer "$STEMMER" --repeat 3 --lanes or,or-stem,or-trigram,hybrid,hybrid-expanded --per-query /tmp/beir-de/<ds>.t17.jsonl --json
```

Step 1 control: `or`, `or-stem` and `or-trigram` reproduced the T16 tables
**exactly** at nDCG@10, MRR@10, Recall@100 and P@10 on both datasets
(deterministic rankings; e.g. GermanDPR or 0.4797/0.3759/0.9454/0.0816 and
GovService or-trigram 0.7628/0.7164/0.9692/0.0905 are bit-for-bit the T16
values). Only the worst-of-N latency columns differ within run noise.

### GermanDPR

```
lane             ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or               0.4797   0.3759  0.9454      0.0816  1.01   2.30
or-stem          0.4874   0.3881  0.9610      0.0808  1.55   2.99
or-trigram       0.5338   0.4332  0.9600      0.0856  2.98   5.41
hybrid           0.5160   0.4177  0.9298      0.0832  0.97   2.28
hybrid-expanded  0.5227   0.4319  0.9502      0.0813  1.49   2.96
db size MB: unicode61=7.69 trigram=19.93
```

Per-query compares (`node "$REPO/scripts/beir-compare.mjs"
/tmp/beir-de/germandpr.t17.jsonl --a <a> --b <b>`):

```
hybrid-expanded vs or: W=361 T=414 L=250
terms 1-3  n=125  W=31 T=60 L=34  hybrid-expanded: ndcg@10=0.4464 p@10=0.0792  or: ndcg@10=0.4366 p@10=0.0792
terms 4-6  n=595  W=220 T=228 L=147  hybrid-expanded: ndcg@10=0.5049 p@10=0.0798  or: ndcg@10=0.4565 p@10=0.0795
terms 7+  n=305  W=110 T=126 L=69  hybrid-expanded: ndcg@10=0.5887 p@10=0.0849  or: ndcg@10=0.5425 p@10=0.0866
hybrid vs or: W=268 T=584 L=173
terms 1-3  n=125  W=18 T=90 L=17  hybrid: ndcg@10=0.4355 p@10=0.0784  or: ndcg@10=0.4366 p@10=0.0792
terms 4-6  n=595  W=159 T=336 L=100  hybrid: ndcg@10=0.4963 p@10=0.0818  or: ndcg@10=0.4565 p@10=0.0795
terms 7+  n=305  W=91 T=158 L=56  hybrid: ndcg@10=0.5875 p@10=0.0879  or: ndcg@10=0.5425 p@10=0.0866
hybrid-expanded vs hybrid: W=232 T=539 L=254
terms 1-3  n=125  W=22 T=74 L=29  hybrid-expanded: ndcg@10=0.4464 p@10=0.0792  hybrid: ndcg@10=0.4355 p@10=0.0784
terms 4-6  n=595  W=140 T=299 L=156  hybrid-expanded: ndcg@10=0.5049 p@10=0.0798  hybrid: ndcg@10=0.4963 p@10=0.0818
terms 7+  n=305  W=70 T=166 L=69  hybrid-expanded: ndcg@10=0.5887 p@10=0.0849  hybrid: ndcg@10=0.5875 p@10=0.0879
hybrid-expanded vs or-trigram: W=319 T=373 L=333
terms 1-3  n=125  W=38 T=44 L=43  hybrid-expanded: ndcg@10=0.4464 p@10=0.0792  or-trigram: ndcg@10=0.4671 p@10=0.0824
terms 4-6  n=595  W=188 T=211 L=196  hybrid-expanded: ndcg@10=0.5049 p@10=0.0798  or-trigram: ndcg@10=0.5165 p@10=0.0839
terms 7+  n=305  W=93 T=118 L=94  hybrid-expanded: ndcg@10=0.5887 p@10=0.0849  or-trigram: ndcg@10=0.5947 p@10=0.0902
```

### GermanGovService

```
lane             ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or               0.6937   0.6378  0.9160      0.0866  0.16   0.55
or-stem          0.6968   0.6380  0.9272      0.0877  0.47   1.28
or-trigram       0.7628   0.7164  0.9692      0.0905  0.61   0.91
hybrid           0.7217   0.6723  0.9104      0.0874  0.29   0.71
hybrid-expanded  0.7123   0.6586  0.9244      0.0880  0.60   1.48
db size MB: unicode61=0.26 trigram=0.64
```

Per-query compares (`node "$REPO/scripts/beir-compare.mjs"
/tmp/beir-de/govservice.t17.jsonl --a <a> --b <b>`):

```
hybrid-expanded vs or: W=78 T=223 L=56
terms 1-3  n=66  W=10 T=51 L=5  hybrid-expanded: ndcg@10=0.6526 p@10=0.0773  or: ndcg@10=0.6312 p@10=0.0773
terms 4-6  n=180  W=46 T=103 L=31  hybrid-expanded: ndcg@10=0.7123 p@10=0.0906  or: ndcg@10=0.6797 p@10=0.0867
terms 7+  n=111  W=22 T=69 L=20  hybrid-expanded: ndcg@10=0.7476 p@10=0.0901  or: ndcg@10=0.7537 p@10=0.0919
hybrid vs or: W=58 T=276 L=23
terms 1-3  n=66  W=3 T=63 L=0  hybrid: ndcg@10=0.6392 p@10=0.0773  or: ndcg@10=0.6312 p@10=0.0773
terms 4-6  n=180  W=32 T=133 L=15  hybrid: ndcg@10=0.7144 p@10=0.0883  or: ndcg@10=0.6797 p@10=0.0867
terms 7+  n=111  W=23 T=80 L=8  hybrid: ndcg@10=0.7826 p@10=0.0919  or: ndcg@10=0.7537 p@10=0.0919
hybrid-expanded vs hybrid: W=42 T=258 L=57
terms 1-3  n=66  W=8 T=53 L=5  hybrid-expanded: ndcg@10=0.6526 p@10=0.0773  hybrid: ndcg@10=0.6392 p@10=0.0773
terms 4-6  n=180  W=25 T=127 L=28  hybrid-expanded: ndcg@10=0.7123 p@10=0.0906  hybrid: ndcg@10=0.7144 p@10=0.0883
terms 7+  n=111  W=9 T=78 L=24  hybrid-expanded: ndcg@10=0.7476 p@10=0.0901  hybrid: ndcg@10=0.7826 p@10=0.0919
hybrid-expanded vs or-trigram: W=50 T=217 L=90
terms 1-3  n=66  W=4 T=51 L=11  hybrid-expanded: ndcg@10=0.6526 p@10=0.0773  or-trigram: ndcg@10=0.6880 p@10=0.0788
terms 4-6  n=180  W=34 T=101 L=45  hybrid-expanded: ndcg@10=0.7123 p@10=0.0906  or-trigram: ndcg@10=0.7464 p@10=0.0894
terms 7+  n=111  W=12 T=65 L=34  hybrid-expanded: ndcg@10=0.7476 p@10=0.0901  or-trigram: ndcg@10=0.8337 p@10=0.0991
```

### Facts (no recommendation)

Neither lane was tuned on any dataset, so E5 (≥ +0.01 nDCG@10 on every
untuned dataset, P@10 not worse, p95 at most 3× `or`, ≈50 library lines)
must hold on **both** datasets. Deltas against `or`, same runs:

| lane | dataset | ΔnDCG@10 | ΔP@10 | p95 ratio (lane/or) |
|------|---------|---------:|------:|--------------------:|
| `hybrid-expanded` | GermanDPR | +0.0430 | −0.0003 | 2.96/2.30 = 1.29 |
| `hybrid-expanded` | GovService | +0.0186 | +0.0014 | 1.48/0.55 = 2.69 |
| `hybrid` | GermanDPR | +0.0363 | +0.0016 | 2.28/2.30 = 0.99 |
| `hybrid` | GovService | +0.0280 | +0.0008 | 0.71/0.55 = 1.29 |

- `hybrid`: all three measurable E5 conditions hold on both datasets
  (nDCG ≥ +0.01 everywhere, P@10 never worse, p95 ≤ 3×); the line-count
  condition concerns library code and is left to the owner.
- `hybrid-expanded`: nDCG and p95 hold on both datasets; on GermanDPR P@10
  is 0.0003 below `or` (0.0813 vs 0.0816).
- ΔnDCG@10 of `hybrid-expanded` against `or-trigram`: GermanDPR
  0.5227 − 0.5338 = **−0.0111**; GovService 0.7123 − 0.7628 = **−0.0505**.
- Within the re-rank family, the stemmer effect (`hybrid-expanded` vs
  `hybrid`) is +0.0067 on GermanDPR (0.5227 vs 0.5160) and −0.0094 on
  GovService (0.7123 vs 0.7217).

## T18 – Re-rank at k=10 (pool 50)

The `hybrid` lanes of T11–T14 called `hybridSearch` with k=100, i.e. they
re-ranked an OR pool of **500** hits. A normal top-10 search only re-ranks
**50**. T17 showed that in German the 50-pool re-rank beats plain OR, so T18
measures two things: (A) the English re-rank at k=10 (pool 50), and (B)
whether trigram + re-rank (`hybrid-trigram`) beats `or-trigram` in German.
The new `*-k10` lanes model the normal top-10 deployment: they return only
10 hits (`hybrid-substr-k10` returns 50), so their Recall@100 is not
comparable to the pool-500 lanes.

Step 1 controls passed: `or` and `hybrid` reproduced the previous tables
exactly at nDCG@10 and P@10 (SciFact `or` 0.6878/0.0910 and `hybrid`
0.5907/0.0780; NFCorpus 0.3209/0.2337 and 0.2988/0.2149; FiQA 0.2535/0.0690
and 0.1621/0.0463; TREC-COVID `or` 0.6020/0.6240). TREC-COVID `hybrid` had
no prior value and is measured here for the first time (0.4471/0.4980). In
German, `or`, `or-trigram` and `hybrid` reproduced T16/T17 exactly on both
datasets (GermanDPR 0.4797/0.5338/0.5160; GovService 0.6937/0.7628/0.7217
nDCG@10, plus identical MRR@10, Recall@100 and P@10). Checksums of all
inputs were verified against this file before measuring (all four English
zips and the German data). No STOPP was triggered.

Commands — English, per `<ds>` in scifact, nfcorpus, fiqa, trec-covid:

```
node "$REPO/scripts/beir-bench.mjs" --data /tmp/beir/<ds> --repeat 3 --lanes or,hybrid,hybrid-k10,hybrid-nofloor-k10,hybrid-fts-k10,hybrid-substr-k10 --per-query /tmp/beir/<ds>.t18.jsonl --json
```

German, per `<ds>` in germandpr, govservice (STEMMER =
german-fts5-stemmer `17e64135d75c6948baa113479e80548cc93ba74c`):

```
node "$REPO/scripts/beir-bench.mjs" --data /tmp/beir-de/<ds> --lang de --stemmer "$STEMMER" --repeat 3 --lanes or,or-trigram,hybrid,hybrid-trigram --per-query /tmp/beir-de/<ds>.t18.jsonl --json
```

Compares, per English dataset:

```
node "$REPO/scripts/beir-compare.mjs" /tmp/beir/<ds>.t18.jsonl --a <lane> --b or
```

for all four `*-k10` lanes; per German dataset the same with
`/tmp/beir-de/<ds>.t18.jsonl`, `--a hybrid-trigram --b or` and
`--a hybrid-trigram --b or-trigram`.

### A) English, `--repeat 3`

SciFact:

```
lane                ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or                  0.6878   0.6497  0.9193      0.0910  2.06   3.68
hybrid              0.5907   0.5596  0.8552      0.0780  33.64  40.80
hybrid-k10          0.6066   0.5698  0.7451      0.0820  4.88   7.64
hybrid-nofloor-k10  0.6083   0.5721  0.7451      0.0820  4.87   7.44
hybrid-fts-k10      0.6122   0.5772  0.7398      0.0817  4.72   8.96
hybrid-substr-k10   0.5960   0.5634  0.8963      0.0797  2.18   4.04
```

NFCorpus:

```
lane                ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or                  0.3209   0.5247  0.2458      0.2337  0.61   1.64
hybrid              0.2988   0.5041  0.2337      0.2149  12.82  34.70
hybrid-k10          0.3002   0.5043  0.1415      0.2167  2.87   4.50
hybrid-nofloor-k10  0.3004   0.5043  0.1415      0.2170  2.83   4.76
hybrid-fts-k10      0.3061   0.4988  0.1442      0.2195  1.19   3.22
hybrid-substr-k10   0.3024   0.5001  0.2166      0.2161  0.54   1.60
```

FiQA:

```
lane                ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or                  0.2535   0.3164  0.5604      0.0690  13.26  27.85
hybrid              0.1621   0.2076  0.4774      0.0463  38.09  61.02
hybrid-k10          0.1891   0.2332  0.2489      0.0554  15.44  30.82
hybrid-nofloor-k10  0.1968   0.2433  0.2578      0.0573  14.64  29.06
hybrid-fts-k10      0.1939   0.2455  0.2486      0.0540  19.92  38.15
hybrid-substr-k10   0.1977   0.2399  0.4847      0.0576  13.03  26.89
```

TREC-COVID:

```
lane                ndcg@10  mrr@10  recall@100  p@10    p50ms   p95ms
or                  0.6020   0.9150  0.1037      0.6240  60.43   82.71
hybrid              0.4471   0.7411  0.0809      0.4980  81.50   116.44
hybrid-k10          0.5130   0.8059  0.0142      0.5760  66.57   97.89
hybrid-nofloor-k10  0.5327   0.8350  0.0143      0.5820  61.54   98.71
hybrid-fts-k10      0.5115   0.7598  0.0143      0.5800  72.08   107.22
hybrid-substr-k10   0.5443   0.8026  0.0616      0.6000  60.44   83.49
```

Per-query compares (all four `*-k10` lanes vs `or`, per dataset; full
term-count group lines):

```
== scifact ==
hybrid-k10 vs or: W=22 T=207 L=71
terms 1-3  n=1  W=0 T=1 L=0  hybrid-k10: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
terms 4-6  n=86  W=4 T=67 L=15  hybrid-k10: ndcg@10=0.6497 p@10=0.0837  or: ndcg@10=0.7067 p@10=0.0895
terms 7+  n=213  W=18 T=139 L=56  hybrid-k10: ndcg@10=0.5874 p@10=0.0812  or: ndcg@10=0.6787 p@10=0.0915
hybrid-nofloor-k10 vs or: W=23 T=207 L=70
terms 1-3  n=1  W=0 T=1 L=0  hybrid-nofloor-k10: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
terms 4-6  n=86  W=5 T=67 L=14  hybrid-nofloor-k10: ndcg@10=0.6555 p@10=0.0837  or: ndcg@10=0.7067 p@10=0.0895
terms 7+  n=213  W=18 T=139 L=56  hybrid-nofloor-k10: ndcg@10=0.5874 p@10=0.0812  or: ndcg@10=0.6787 p@10=0.0915
hybrid-fts-k10 vs or: W=15 T=217 L=68
terms 1-3  n=1  W=0 T=1 L=0  hybrid-fts-k10: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
terms 4-6  n=86  W=4 T=69 L=13  hybrid-fts-k10: ndcg@10=0.6636 p@10=0.0826  or: ndcg@10=0.7067 p@10=0.0895
terms 7+  n=213  W=11 T=147 L=55  hybrid-fts-k10: ndcg@10=0.5896 p@10=0.0812  or: ndcg@10=0.6787 p@10=0.0915
hybrid-substr-k10 vs or: W=18 T=199 L=83
terms 1-3  n=1  W=0 T=1 L=0  hybrid-substr-k10: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
terms 4-6  n=86  W=3 T=68 L=15  hybrid-substr-k10: ndcg@10=0.6475 p@10=0.0814  or: ndcg@10=0.7067 p@10=0.0895
terms 7+  n=213  W=15 T=130 L=68  hybrid-substr-k10: ndcg@10=0.5734 p@10=0.0789  or: ndcg@10=0.6787 p@10=0.0915
== nfcorpus ==
hybrid-k10 vs or: W=50 T=201 L=72
terms 1-3  n=234  W=26 T=173 L=35  hybrid-k10: ndcg@10=0.3148 p@10=0.2244  or: ndcg@10=0.3305 p@10=0.2355
terms 4-6  n=83  W=24 T=24 L=35  hybrid-k10: ndcg@10=0.2752 p@10=0.2084  or: ndcg@10=0.3054 p@10=0.2373
terms 7+  n=6  W=0 T=4 L=2  hybrid-k10: ndcg@10=0.0773 p@10=0.0333  or: ndcg@10=0.1601 p@10=0.1167
hybrid-nofloor-k10 vs or: W=49 T=203 L=71
terms 1-3  n=234  W=25 T=175 L=34  hybrid-nofloor-k10: ndcg@10=0.3151 p@10=0.2248  or: ndcg@10=0.3305 p@10=0.2355
terms 4-6  n=83  W=24 T=24 L=35  hybrid-nofloor-k10: ndcg@10=0.2752 p@10=0.2084  or: ndcg@10=0.3054 p@10=0.2373
terms 7+  n=6  W=0 T=4 L=2  hybrid-nofloor-k10: ndcg@10=0.0773 p@10=0.0333  or: ndcg@10=0.1601 p@10=0.1167
hybrid-fts-k10 vs or: W=24 T=247 L=52
terms 1-3  n=234  W=9 T=207 L=18  hybrid-fts-k10: ndcg@10=0.3244 p@10=0.2286  or: ndcg@10=0.3305 p@10=0.2355
terms 4-6  n=83  W=15 T=38 L=30  hybrid-fts-k10: ndcg@10=0.2704 p@10=0.2048  or: ndcg@10=0.3054 p@10=0.2373
terms 7+  n=6  W=0 T=2 L=4  hybrid-fts-k10: ndcg@10=0.0879 p@10=0.0667  or: ndcg@10=0.1601 p@10=0.1167
hybrid-substr-k10 vs or: W=43 T=208 L=72
terms 1-3  n=234  W=20 T=177 L=37  hybrid-substr-k10: ndcg@10=0.3209 p@10=0.2252  or: ndcg@10=0.3305 p@10=0.2355
terms 4-6  n=83  W=22 T=28 L=33  hybrid-substr-k10: ndcg@10=0.2641 p@10=0.2024  or: ndcg@10=0.3054 p@10=0.2373
terms 7+  n=6  W=1 T=3 L=2  hybrid-substr-k10: ndcg@10=0.1122 p@10=0.0500  or: ndcg@10=0.1601 p@10=0.1167
== fiqa ==
hybrid-k10 vs or: W=95 T=356 L=197
terms 1-3  n=34  W=5 T=25 L=4  hybrid-k10: ndcg@10=0.0714 p@10=0.0382  or: ndcg@10=0.0709 p@10=0.0324
terms 4-6  n=264  W=28 T=155 L=81  hybrid-k10: ndcg@10=0.1879 p@10=0.0492  or: ndcg@10=0.2597 p@10=0.0652
terms 7+  n=350  W=62 T=176 L=112  hybrid-k10: ndcg@10=0.2015 p@10=0.0617  or: ndcg@10=0.2665 p@10=0.0754
hybrid-nofloor-k10 vs or: W=103 T=355 L=190
terms 1-3  n=34  W=5 T=25 L=4  hybrid-nofloor-k10: ndcg@10=0.0932 p@10=0.0412  or: ndcg@10=0.0709 p@10=0.0324
terms 4-6  n=264  W=35 T=155 L=74  hybrid-nofloor-k10: ndcg@10=0.1989 p@10=0.0530  or: ndcg@10=0.2597 p@10=0.0652
terms 7+  n=350  W=63 T=175 L=112  hybrid-nofloor-k10: ndcg@10=0.2054 p@10=0.0620  or: ndcg@10=0.2665 p@10=0.0754
hybrid-fts-k10 vs or: W=73 T=382 L=193
terms 1-3  n=34  W=0 T=28 L=6  hybrid-fts-k10: ndcg@10=0.0454 p@10=0.0176  or: ndcg@10=0.0709 p@10=0.0324
terms 4-6  n=264  W=25 T=164 L=75  hybrid-fts-k10: ndcg@10=0.1978 p@10=0.0492  or: ndcg@10=0.2597 p@10=0.0652
terms 7+  n=350  W=48 T=190 L=112  hybrid-fts-k10: ndcg@10=0.2054 p@10=0.0611  or: ndcg@10=0.2665 p@10=0.0754
hybrid-substr-k10 vs or: W=101 T=356 L=191
terms 1-3  n=34  W=5 T=25 L=4  hybrid-substr-k10: ndcg@10=0.0756 p@10=0.0353  or: ndcg@10=0.0709 p@10=0.0324
terms 4-6  n=264  W=32 T=152 L=80  hybrid-substr-k10: ndcg@10=0.1897 p@10=0.0519  or: ndcg@10=0.2597 p@10=0.0652
terms 7+  n=350  W=64 T=179 L=107  hybrid-substr-k10: ndcg@10=0.2156 p@10=0.0640  or: ndcg@10=0.2665 p@10=0.0754
== trec-covid ==
hybrid-k10 vs or: W=17 T=0 L=33
terms 1-3  n=1  W=0 T=0 L=1  hybrid-k10: ndcg@10=0.2646 p@10=0.3000  or: ndcg@10=0.2973 p@10=0.4000
terms 4-6  n=27  W=10 T=0 L=17  hybrid-k10: ndcg@10=0.4772 p@10=0.5630  or: ndcg@10=0.5693 p@10=0.6000
terms 7+  n=22  W=7 T=0 L=15  hybrid-k10: ndcg@10=0.5682 p@10=0.6045  or: ndcg@10=0.6560 p@10=0.6636
hybrid-nofloor-k10 vs or: W=19 T=1 L=30
terms 1-3  n=1  W=0 T=0 L=1  hybrid-nofloor-k10: ndcg@10=0.2646 p@10=0.3000  or: ndcg@10=0.2973 p@10=0.4000
terms 4-6  n=27  W=11 T=1 L=15  hybrid-nofloor-k10: ndcg@10=0.5014 p@10=0.5704  or: ndcg@10=0.5693 p@10=0.6000
terms 7+  n=22  W=8 T=0 L=14  hybrid-nofloor-k10: ndcg@10=0.5832 p@10=0.6091  or: ndcg@10=0.6560 p@10=0.6636
hybrid-fts-k10 vs or: W=16 T=2 L=32
terms 1-3  n=1  W=0 T=0 L=1  hybrid-fts-k10: ndcg@10=0.2646 p@10=0.3000  or: ndcg@10=0.2973 p@10=0.4000
terms 4-6  n=27  W=11 T=1 L=15  hybrid-fts-k10: ndcg@10=0.4706 p@10=0.5481  or: ndcg@10=0.5693 p@10=0.6000
terms 7+  n=22  W=5 T=1 L=16  hybrid-fts-k10: ndcg@10=0.5728 p@10=0.6318  or: ndcg@10=0.6560 p@10=0.6636
hybrid-substr-k10 vs or: W=23 T=4 L=23
terms 1-3  n=1  W=0 T=0 L=1  hybrid-substr-k10: ndcg@10=0.1795 p@10=0.2000  or: ndcg@10=0.2973 p@10=0.4000
terms 4-6  n=27  W=12 T=3 L=12  hybrid-substr-k10: ndcg@10=0.5083 p@10=0.5704  or: ndcg@10=0.5693 p@10=0.6000
terms 7+  n=22  W=11 T=1 L=10  hybrid-substr-k10: ndcg@10=0.6051 p@10=0.6545  or: ndcg@10=0.6560 p@10=0.6636
```

### B) German, `--repeat 3` (STEMMER `17e64135d75c6948baa113479e80548cc93ba74c`)

GermanDPR:

```
lane            ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or              0.4797   0.3759  0.9454      0.0816  1.08   2.44
or-trigram      0.5338   0.4332  0.9600      0.0856  3.16   5.84
hybrid          0.5160   0.4177  0.9298      0.0832  1.01   2.30
hybrid-trigram  0.5257   0.4321  0.9522      0.0823  3.12   5.80
db size MB: unicode61=7.69 trigram=19.93
```

GovService:

```
lane            ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
or              0.6937   0.6378  0.9160      0.0866  0.16   0.53
or-trigram      0.7628   0.7164  0.9692      0.0905  0.57   0.88
hybrid          0.7217   0.6723  0.9104      0.0874  0.28   0.68
hybrid-trigram  0.7489   0.6994  0.9468      0.0902  0.62   1.00
db size MB: unicode61=0.26 trigram=0.64
```

Per-query compares:

```
== germandpr ==
hybrid-trigram vs or: W=345 T=447 L=233
terms 1-3  n=125  W=34 T=58 L=33  hybrid-trigram: ndcg@10=0.4471 p@10=0.0784  or: ndcg@10=0.4366 p@10=0.0792
terms 4-6  n=595  W=198 T=261 L=136  hybrid-trigram: ndcg@10=0.5035 p@10=0.0805  or: ndcg@10=0.4565 p@10=0.0795
terms 7+  n=305  W=113 T=128 L=64  hybrid-trigram: ndcg@10=0.6013 p@10=0.0875  or: ndcg@10=0.5425 p@10=0.0866
hybrid-trigram vs or-trigram: W=165 T=677 L=183
terms 1-3  n=125  W=8 T=103 L=14  hybrid-trigram: ndcg@10=0.4471 p@10=0.0784  or-trigram: ndcg@10=0.4671 p@10=0.0824
terms 4-6  n=595  W=92 T=400 L=103  hybrid-trigram: ndcg@10=0.5035 p@10=0.0805  or-trigram: ndcg@10=0.5165 p@10=0.0839
terms 7+  n=305  W=65 T=174 L=66  hybrid-trigram: ndcg@10=0.6013 p@10=0.0875  or-trigram: ndcg@10=0.5947 p@10=0.0902
== govservice ==
hybrid-trigram vs or: W=92 T=220 L=45
terms 1-3  n=66  W=12 T=53 L=1  hybrid-trigram: ndcg@10=0.6880 p@10=0.0788  or: ndcg@10=0.6312 p@10=0.0773
terms 4-6  n=180  W=47 T=104 L=29  hybrid-trigram: ndcg@10=0.7365 p@10=0.0900  or: ndcg@10=0.6797 p@10=0.0867
terms 7+  n=111  W=33 T=63 L=15  hybrid-trigram: ndcg@10=0.8052 p@10=0.0973  or: ndcg@10=0.7537 p@10=0.0919
hybrid-trigram vs or-trigram: W=18 T=317 L=22
terms 1-3  n=66  W=0 T=66 L=0  hybrid-trigram: ndcg@10=0.6880 p@10=0.0788  or-trigram: ndcg@10=0.6880 p@10=0.0788
terms 4-6  n=180  W=11 T=157 L=12  hybrid-trigram: ndcg@10=0.7365 p@10=0.0900  or-trigram: ndcg@10=0.7464 p@10=0.0894
terms 7+  n=111  W=7 T=94 L=10  hybrid-trigram: ndcg@10=0.8052 p@10=0.0973  or-trigram: ndcg@10=0.8337 p@10=0.0991
```

### Facts (no recommendation)

None of the `*-k10` lanes was tuned on any dataset (k=10 and the 50-pool
are the library default), so E5 must hold on every dataset. Against `or`,
same runs; E5 assessed without the line-count criterion:

| lane | dataset | ΔnDCG@10 | ΔP@10 | p95 ratio | E5 |
|------|---------|---------:|------:|----------:|----|
| `hybrid-k10` | SciFact | −0.0812 | −0.0090 | 7.64/3.68 = 2.08 | not met (nDCG, P@10) |
| `hybrid-k10` | NFCorpus | −0.0207 | −0.0170 | 4.50/1.64 = 2.74 | not met (nDCG, P@10) |
| `hybrid-k10` | FiQA | −0.0644 | −0.0136 | 30.82/27.85 = 1.11 | not met (nDCG, P@10) |
| `hybrid-k10` | TREC-COVID | −0.0890 | −0.0480 | 97.89/82.71 = 1.18 | not met (nDCG, P@10) |
| `hybrid-nofloor-k10` | SciFact | −0.0795 | −0.0090 | 7.44/3.68 = 2.02 | not met (nDCG, P@10) |
| `hybrid-nofloor-k10` | NFCorpus | −0.0205 | −0.0167 | 4.76/1.64 = 2.90 | not met (nDCG, P@10) |
| `hybrid-nofloor-k10` | FiQA | −0.0567 | −0.0117 | 29.06/27.85 = 1.04 | not met (nDCG, P@10) |
| `hybrid-nofloor-k10` | TREC-COVID | −0.0693 | −0.0420 | 98.71/82.71 = 1.19 | not met (nDCG, P@10) |
| `hybrid-fts-k10` | SciFact | −0.0756 | −0.0093 | 8.96/3.68 = 2.43 | not met (nDCG, P@10) |
| `hybrid-fts-k10` | NFCorpus | −0.0148 | −0.0142 | 3.22/1.64 = 1.96 | not met (nDCG, P@10) |
| `hybrid-fts-k10` | FiQA | −0.0596 | −0.0150 | 38.15/27.85 = 1.37 | not met (nDCG, P@10) |
| `hybrid-fts-k10` | TREC-COVID | −0.0905 | −0.0440 | 107.22/82.71 = 1.30 | not met (nDCG, P@10) |
| `hybrid-substr-k10` | SciFact | −0.0918 | −0.0113 | 4.04/3.68 = 1.10 | not met (nDCG, P@10) |
| `hybrid-substr-k10` | NFCorpus | −0.0185 | −0.0176 | 1.60/1.64 = 0.98 | not met (nDCG, P@10) |
| `hybrid-substr-k10` | FiQA | −0.0558 | −0.0114 | 26.89/27.85 = 0.97 | not met (nDCG, P@10) |
| `hybrid-substr-k10` | TREC-COVID | −0.0577 | −0.0240 | 83.49/82.71 = 1.01 | not met (nDCG, P@10) |

`hybrid-trigram` (untuned on both German datasets) against `or`:

| dataset | ΔnDCG@10 | ΔP@10 | p95 ratio | E5 |
|---------|---------:|------:|----------:|----|
| GermanDPR | +0.0460 | +0.0007 | 5.80/2.44 = 2.38 | met on the three measurable conditions |
| GovService | +0.0552 | +0.0036 | 1.00/0.53 = 1.89 | met on the three measurable conditions |

ΔnDCG@10 of `hybrid-trigram` against `or-trigram`: GermanDPR
0.5257 − 0.5338 = **−0.0081**; GovService 0.7489 − 0.7628 = **−0.0139**.

## T21 – German stopwords (Snowball) and German scale (mMARCO-de)

Question: does the German result of T16–T18 hold with a complete stopword
list and on a large corpus? The 94-word list of T16–T18 (`STOPWORDS` of
german-fts5-stemmer, until T21 identical with `STOPWORDS_DE`) lacks frequent
function words: on the mMARCO-de 100 000 subset "in" occurs in 50.1 % of the
passages and in 137 of 1 000 queries, "sie" in 38.3 %, "es" in 24.9 %,
"wird" in 18.2 %; 212 of 1 000 queries contain at least one query term with a
document frequency above 5 %. Every such OR query makes FTS5 score a large
part of the corpus.

Change: `STOPWORDS_DE` = the 94 words + the Snowball German stop word list
(`snowballstem.org/algorithms/german/stop.txt`, BSD-3-Clause, 231 words,
sha256 `22a7785b53860256280fba74b93d8f09a0f3a8f52edaa3cdc3750e8c13a3874c`)
+ the spellings without umlaut of its words = 259 entries: the 231 Snowball
words plus 28 more (25 words of the 94-word list that Snowball lacks, such as
"wurde", "seit", "dass", "beim" and the English function words, and
"konnen", "konnte", "wahrend"). Nothing was tuned on any dataset; the
Snowball list was taken as published. It has "viel" but not "viele" or
"vielen", and "weg" and "waren" are also nouns ("Weg", "Waren").
`beir-bench --stopwords lib` uses `STOPWORDS_DE` for every German lane; the
stemmer lanes get the query without those words, and stemmer variants that
are in `STOPWORDS_DE` are dropped. `--stopwords stemmer` (default) is the
list of T16–T19.

Code: commit `92eb6174a4c925dc6848a66cff08d8f53e28a596` for every lane
except the stemmer lanes with the new list, which ran at
`ac4ccba` after the review fix below (same code for every other lane).
Stemmer: `17e64135d75c6948baa113479e80548cc93ba74c`. Machine: `nproc` 20,
121 GiB RAM, Node v24.22.1, SQLite 3.53.4. A local LLM server ran on the same
machine (shared CPU/GPU memory): a vLLM model, and from 13:36 another engine
that loads its model at start; only the old-list run of `hybrid-trigram` at
1 000 000 (13:34–13:38) overlapped with that start. The two scale runs (old
and new list) ran in parallel, each pinned to its own core (`taskset`); the
GermanDPR/GovService runs ran on a third core at the same time. Latencies
are from one loaded machine.

### Review fix (stemmer lanes with the new list)

The review of T21 found that with `--stopwords lib` the stemmer lanes still
got stopwords back: as stemmer variants ("viele" also yields "viel",
"ausmachen" yields "machen", "Änderung" yields "ander") and as hyphen parts
("Check-in" yields "in", "Vor-" yields "vor"). After the fix the stemmer
groups change for 70 of 1 025 GermanDPR, 13 of 357 GovService and 13 of
1 000 mMARCO-de questions. `or-stem`, `or-stem-paradigm` (GermanDPR,
GovService) and `hybrid-expanded` were measured again with the fixed code;
the tables below show the new values. Their p95 ratios to `or` therefore
compare two runs. Values before the fix (nDCG@10): `or-stem` 0.4891, 0.7169,
0.6333, 0.4850, 0.3197 and `hybrid-expanded` 0.5307, 0.7401, 0.6410, 0.5087,
0.3451 (GermanDPR, GovService, mMARCO-de 10 000, 100 000, 1 000 000).

### Data (mMARCO)

`unicamp-dl/mmarco`, revision `6d039c4638c0ba3e46a9cb7b498b145e7edc6230`
(Hugging Face API; `cardData.license` not set — MS MARCO: non-commercial
research only, the data is not part of this repository). Files from
`resolve/main/data/` (`google/collections/…`, `google/queries/dev/…`,
`qrels.dev.small.tsv`):

```
86e0c5820be6b22280337a67e54cbb626645453d9ac3c377bac45abb81c5653d  english_collection.tsv
60d93b172e1ebd6b7c2d04b4b64fd25e8bc140b94dfedf71d6b04c0081a1d87f  german_collection.tsv
988cb8424d997bd5cf829753de7dfe7496efcdba318186c5d904a2d5c410d2e7  english_queries.dev.small.tsv
ac54aadb7258254cc641a1a91a56933ade78509799f481f32331d00740bdab42  german_queries.dev.small.tsv
ddc607dbe7b748d7168e8675a242f0811d47febaa2e69d3af09d7ab249c68d7e  qrels.dev.small.tsv
```

Conversion (`scripts/to-beir.mjs --format msmarco-tsv`), English and
German, both equal to the reference of T19: `docs=8841823 queries=6980
qrels=7437`. Subsets (`scripts/subsample-beir.mjs`, the same for both
languages): `docs=10000|100000|1000000 queries=1000 qrels=1053 rel_docs=1053
missing_rel=0`. id sequence identical for en and de at every size
(`results/idhash.txt`, size, en, de):

```
1000000 d8f65c13b77f252d2ed327e2d9c0612d3e1dbd2478bf62cf05a152eff75532e5 d8f65c13b77f252d2ed327e2d9c0612d3e1dbd2478bf62cf05a152eff75532e5
100000 2dd56dd62ff567ceae2b14112e1528a83bdc7738a27a4ea1ec1326da6b342ee0 2dd56dd62ff567ceae2b14112e1528a83bdc7738a27a4ea1ec1326da6b342ee0
10000 6983221e7679cbc4fddcba9109c812369cd61e9ca57c443af45e21bb600fba8d 6983221e7679cbc4fddcba9109c812369cd61e9ca57c443af45e21bb600fba8d
```

Commands (`$SCALE_DIR` holds `beir/{en,de}-full`; the subsets were reused
from an earlier run with the same tooling; the review fix resumed the
`t21-lib` run after its two stemmer lanes had been moved away):

```
SCALE_DIR=$SCALE_DIR/t21-stemmer STEMMER="$STEMMER" FULL=0 EN_LANES=and DE_STOPWORDS=stemmer bash scripts/scale-run.sh
SCALE_DIR=$SCALE_DIR/t21-lib STEMMER="$STEMMER" FULL=0 EN_LANES=and DE_STOPWORDS=lib bash scripts/scale-run.sh
node scripts/beir-bench.mjs --data <germandpr|govservice> --lang de --stemmer "$STEMMER" --stopwords <stemmer|lib> --repeat 3 --per-query <file> --json
node scripts/beir-bench.mjs --data <germandpr|govservice> --lang de --stemmer "$STEMMER" --stopwords lib --repeat 3 --lanes or-stem,or-stem-paradigm,hybrid-expanded --json
```

Control: with `--stopwords stemmer` every lane reproduces T16–T18 exactly
(GermanDPR `or` 0.4797, `or-trigram` 0.5338, `hybrid-expanded` 0.5227;
GovService `or` 0.6937, `or-trigram` 0.7628, `hybrid-expanded` 0.7123).

### mMARCO-de, new list (`DE_STOPWORDS=lib`, `results/summary.md`)

| size | docs | queries | lane | nDCG@10 | MRR@10 | Recall@100 | P@10 | p50 ms | p95 ms |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 10000 | 10000 | 1000 | and | 0.1853 | 0.1870 | 0.1888 | 0.0195 | 0.02 | 0.06 |
| 10000 | 10000 | 1000 | or | 0.6022 | 0.5833 | 0.7255 | 0.0707 | 0.24 | 0.46 |
| 10000 | 10000 | 1000 | or-stem | 0.6332 | 0.6082 | 0.7992 | 0.0761 | 0.36 | 0.97 |
| 10000 | 10000 | 1000 | or-trigram | 0.6277 | 0.6074 | 0.7675 | 0.0737 | 1.30 | 3.04 |
| 10000 | 10000 | 1000 | hybrid | 0.6036 | 0.5843 | 0.7107 | 0.0710 | 0.21 | 0.43 |
| 10000 | 10000 | 1000 | hybrid-expanded | 0.6419 | 0.6185 | 0.7827 | 0.0767 | 0.31 | 0.93 |
| 10000 | 10000 | 1000 | hybrid-trigram | 0.6163 | 0.5943 | 0.7505 | 0.0732 | 1.25 | 2.96 |
| 100000 | 100000 | 1000 | and | 0.1783 | 0.1793 | 0.1888 | 0.0190 | 0.06 | 0.20 |
| 100000 | 100000 | 1000 | or | 0.4948 | 0.4748 | 0.6730 | 0.0600 | 0.74 | 2.24 |
| 100000 | 100000 | 1000 | or-stem | 0.4848 | 0.4548 | 0.7340 | 0.0625 | 1.08 | 4.28 |
| 100000 | 100000 | 1000 | or-trigram | 0.5069 | 0.4855 | 0.6983 | 0.0617 | 7.99 | 21.30 |
| 100000 | 100000 | 1000 | hybrid | 0.4954 | 0.4739 | 0.6505 | 0.0610 | 0.65 | 2.16 |
| 100000 | 100000 | 1000 | hybrid-expanded | 0.5088 | 0.4842 | 0.7056 | 0.0636 | 1.06 | 4.21 |
| 100000 | 100000 | 1000 | hybrid-trigram | 0.4957 | 0.4759 | 0.6683 | 0.0604 | 8.01 | 21.35 |
| 1000000 | 1000000 | 1000 | and | 0.1508 | 0.1468 | 0.1838 | 0.0176 | 0.21 | 1.44 |
| 1000000 | 1000000 | 1000 | or | 0.3493 | 0.3258 | 0.5719 | 0.0454 | 6.43 | 24.72 |
| 1000000 | 1000000 | 1000 | or-stem | 0.3197 | 0.2960 | 0.6072 | 0.0425 | 9.43 | 37.21 |
| 1000000 | 1000000 | 1000 | or-trigram | 0.3500 | 0.3283 | 0.5854 | 0.0450 | 67.69 | 188.39 |
| 1000000 | 1000000 | 1000 | hybrid | 0.3504 | 0.3305 | 0.5403 | 0.0448 | 6.23 | 24.55 |
| 1000000 | 1000000 | 1000 | hybrid-expanded | 0.3451 | 0.3238 | 0.5503 | 0.0445 | 9.32 | 37.14 |
| 1000000 | 1000000 | 1000 | hybrid-trigram | 0.3421 | 0.3213 | 0.5542 | 0.0441 | 67.68 | 189.36 |

| size | index | build s | size MB |
|---|---|---:|---:|
| 10000 | unicode61 | 0.1 | 7.22 |
| 10000 | trigram | 0.3 | 20.38 |
| 100000 | unicode61 | 1.1 | 67.47 |
| 100000 | trigram | 3.9 | 188.87 |
| 1000000 | unicode61 | 12.4 | 663.22 |
| 1000000 | trigram | 51.5 | 1942.40 |

### mMARCO-de, old list (`DE_STOPWORDS=stemmer`, `results/summary.md`)

| size | docs | queries | lane | nDCG@10 | MRR@10 | Recall@100 | P@10 | p50 ms | p95 ms |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 10000 | 10000 | 1000 | and | 0.1733 | 0.1750 | 0.1763 | 0.0181 | 0.03 | 0.08 |
| 10000 | 10000 | 1000 | or | 0.5997 | 0.5811 | 0.7245 | 0.0704 | 0.30 | 2.57 |
| 10000 | 10000 | 1000 | or-stem | 0.6318 | 0.6068 | 0.8002 | 0.0760 | 0.41 | 2.91 |
| 10000 | 10000 | 1000 | or-trigram | 0.6272 | 0.6076 | 0.7685 | 0.0735 | 1.36 | 3.58 |
| 10000 | 10000 | 1000 | hybrid | 0.5948 | 0.5769 | 0.7107 | 0.0698 | 0.24 | 2.52 |
| 10000 | 10000 | 1000 | hybrid-expanded | 0.6302 | 0.6075 | 0.7817 | 0.0755 | 0.36 | 3.10 |
| 10000 | 10000 | 1000 | hybrid-trigram | 0.6087 | 0.5887 | 0.7495 | 0.0719 | 1.34 | 3.47 |
| 100000 | 100000 | 1000 | and | 0.1668 | 0.1678 | 0.1763 | 0.0176 | 0.07 | 0.28 |
| 100000 | 100000 | 1000 | or | 0.4937 | 0.4753 | 0.6720 | 0.0595 | 1.00 | 26.76 |
| 100000 | 100000 | 1000 | or-stem | 0.4837 | 0.4543 | 0.7300 | 0.0622 | 1.46 | 27.98 |
| 100000 | 100000 | 1000 | or-trigram | 0.5062 | 0.4844 | 0.6953 | 0.0618 | 8.43 | 26.68 |
| 100000 | 100000 | 1000 | hybrid | 0.4888 | 0.4694 | 0.6480 | 0.0597 | 0.88 | 26.73 |
| 100000 | 100000 | 1000 | hybrid-expanded | 0.5024 | 0.4788 | 0.7016 | 0.0627 | 1.31 | 27.79 |
| 100000 | 100000 | 1000 | hybrid-trigram | 0.4889 | 0.4689 | 0.6683 | 0.0598 | 8.24 | 26.28 |
| 1000000 | 1000000 | 1000 | and | 0.1432 | 0.1395 | 0.1713 | 0.0166 | 0.25 | 2.31 |
| 1000000 | 1000000 | 1000 | or | 0.3468 | 0.3225 | 0.5689 | 0.0454 | 9.31 | 266.96 |
| 1000000 | 1000000 | 1000 | or-stem | 0.3159 | 0.2918 | 0.6052 | 0.0422 | 14.03 | 278.70 |
| 1000000 | 1000000 | 1000 | or-trigram | 0.3492 | 0.3269 | 0.5854 | 0.0451 | 72.33 | 270.92 |
| 1000000 | 1000000 | 1000 | hybrid | 0.3441 | 0.3239 | 0.5378 | 0.0442 | 9.00 | 267.06 |
| 1000000 | 1000000 | 1000 | hybrid-expanded | 0.3400 | 0.3180 | 0.5473 | 0.0441 | 13.76 | 279.32 |
| 1000000 | 1000000 | 1000 | hybrid-trigram | 0.3367 | 0.3155 | 0.5512 | 0.0436 | 84.73 | 290.68 |

### Old list vs new list (nDCG@10, P@10, p95 ms)

GermanDPR and GovService with `--repeat 3`, mMARCO-de with `--repeat 2`.

| dataset | lane | nDCG@10 old | nDCG@10 new | P@10 old | P@10 new | p95 old | p95 new |
|---|---|---:|---:|---:|---:|---:|---:|
| germandpr | and | 0.0263 | 0.0356 | 0.0035 | 0.0045 | 0.09 | 0.08 |
| germandpr | or | 0.4797 | 0.4807 | 0.0816 | 0.0819 | 2.06 | 0.83 |
| germandpr | or-stem | 0.4874 | 0.4895 | 0.0808 | 0.0811 | 2.81 | 1.94 |
| germandpr | or-trigram | 0.5338 | 0.5350 | 0.0856 | 0.0860 | 4.68 | 4.21 |
| germandpr | hybrid | 0.5160 | 0.5192 | 0.0832 | 0.0838 | 2.02 | 0.80 |
| germandpr | hybrid-expanded | 0.5227 | 0.5313 | 0.0813 | 0.0826 | 2.46 | 1.24 |
| germandpr | hybrid-trigram | 0.5257 | 0.5292 | 0.0823 | 0.0830 | 4.73 | 4.20 |
| govservice | and | 0.0753 | 0.1005 | 0.0078 | 0.0104 | 0.03 | 0.03 |
| govservice | or | 0.6937 | 0.7280 | 0.0866 | 0.0880 | 0.44 | 0.24 |
| govservice | or-stem | 0.6968 | 0.7169 | 0.0877 | 0.0894 | 3.16 | 1.51 |
| govservice | or-trigram | 0.7628 | 0.7629 | 0.0905 | 0.0905 | 0.73 | 0.50 |
| govservice | hybrid | 0.7217 | 0.7420 | 0.0874 | 0.0885 | 0.53 | 0.37 |
| govservice | hybrid-expanded | 0.7123 | 0.7401 | 0.0880 | 0.0888 | 0.87 | 0.77 |
| govservice | hybrid-trigram | 0.7489 | 0.7645 | 0.0902 | 0.0910 | 0.81 | 0.68 |
| mmarco-de-10000 | and | 0.1733 | 0.1853 | 0.0181 | 0.0195 | 0.08 | 0.06 |
| mmarco-de-10000 | or | 0.5997 | 0.6022 | 0.0704 | 0.0707 | 2.57 | 0.46 |
| mmarco-de-10000 | or-stem | 0.6318 | 0.6332 | 0.0760 | 0.0761 | 2.91 | 0.97 |
| mmarco-de-10000 | or-trigram | 0.6272 | 0.6277 | 0.0735 | 0.0737 | 3.58 | 3.04 |
| mmarco-de-10000 | hybrid | 0.5948 | 0.6036 | 0.0698 | 0.0710 | 2.52 | 0.43 |
| mmarco-de-10000 | hybrid-expanded | 0.6302 | 0.6419 | 0.0755 | 0.0767 | 3.10 | 0.93 |
| mmarco-de-10000 | hybrid-trigram | 0.6087 | 0.6163 | 0.0719 | 0.0732 | 3.47 | 2.96 |
| mmarco-de-100000 | and | 0.1668 | 0.1783 | 0.0176 | 0.0190 | 0.28 | 0.20 |
| mmarco-de-100000 | or | 0.4937 | 0.4948 | 0.0595 | 0.0600 | 26.76 | 2.24 |
| mmarco-de-100000 | or-stem | 0.4837 | 0.4848 | 0.0622 | 0.0625 | 27.98 | 4.28 |
| mmarco-de-100000 | or-trigram | 0.5062 | 0.5069 | 0.0618 | 0.0617 | 26.68 | 21.30 |
| mmarco-de-100000 | hybrid | 0.4888 | 0.4954 | 0.0597 | 0.0610 | 26.73 | 2.16 |
| mmarco-de-100000 | hybrid-expanded | 0.5024 | 0.5088 | 0.0627 | 0.0636 | 27.79 | 4.21 |
| mmarco-de-100000 | hybrid-trigram | 0.4889 | 0.4957 | 0.0598 | 0.0604 | 26.28 | 21.35 |
| mmarco-de-1000000 | and | 0.1432 | 0.1508 | 0.0166 | 0.0176 | 2.31 | 1.44 |
| mmarco-de-1000000 | or | 0.3468 | 0.3493 | 0.0454 | 0.0454 | 266.96 | 24.72 |
| mmarco-de-1000000 | or-stem | 0.3159 | 0.3197 | 0.0422 | 0.0425 | 278.70 | 37.21 |
| mmarco-de-1000000 | or-trigram | 0.3492 | 0.3500 | 0.0451 | 0.0450 | 270.92 | 188.39 |
| mmarco-de-1000000 | hybrid | 0.3441 | 0.3504 | 0.0442 | 0.0448 | 267.06 | 24.55 |
| mmarco-de-1000000 | hybrid-expanded | 0.3400 | 0.3451 | 0.0441 | 0.0445 | 279.32 | 37.14 |
| mmarco-de-1000000 | hybrid-trigram | 0.3367 | 0.3421 | 0.0436 | 0.0441 | 290.68 | 189.36 |

### E5 facts with the new list (each lane vs `or`, both with `STOPWORDS_DE`)

ΔnDCG@10 / ΔP@10 / p95 ratio. `or-stem` was selected on GermanDPR in T16, so
GermanDPR is tuned for it; every other cell is untuned.

| lane | germandpr | govservice | mmarco-de-10000 | mmarco-de-100000 | mmarco-de-1000000 |
|---|---:|---:|---:|---:|---:|
| or-stem | +0.0088 / -0.0008 / 2.34× | -0.0111 / +0.0014 / 6.29× | +0.0310 / +0.0054 / 2.11× | -0.0100 / +0.0025 / 1.91× | -0.0296 / -0.0029 / 1.51× |
| or-trigram | +0.0543 / +0.0041 / 5.07× | +0.0349 / +0.0025 / 2.08× | +0.0255 / +0.0030 / 6.61× | +0.0121 / +0.0017 / 9.51× | +0.0007 / -0.0004 / 7.62× |
| hybrid | +0.0385 / +0.0019 / 0.96× | +0.0140 / +0.0005 / 1.54× | +0.0014 / +0.0003 / 0.93× | +0.0006 / +0.0010 / 0.96× | +0.0011 / -0.0006 / 0.99× |
| hybrid-expanded | +0.0506 / +0.0007 / 1.49× | +0.0121 / +0.0008 / 3.21× | +0.0397 / +0.0060 / 2.02× | +0.0140 / +0.0036 / 1.88× | -0.0042 / -0.0009 / 1.50× |
| hybrid-trigram | +0.0485 / +0.0011 / 5.06× | +0.0365 / +0.0030 / 2.83× | +0.0141 / +0.0025 / 6.43× | +0.0009 / +0.0004 / 9.53× | -0.0072 / -0.0013 / 7.66× |

### Per-query compares, mMARCO-de, new list (`results/compare-*.txt`)

de-100000:
```
or vs and: W=395 T=602 L=3
terms 1-3  n=790  W=258 T=529 L=3  or: ndcg@10=0.4628 p@10=0.0562  and: ndcg@10=0.2097 p@10=0.0224
terms 4-6  n=205  W=133 T=72 L=0  or: ndcg@10=0.6059 p@10=0.0737  and: ndcg@10=0.0566 p@10=0.0059
terms 7+  n=5  W=4 T=1 L=0  or: ndcg@10=1.0000 p@10=0.1000  and: ndcg@10=0.2000 p@10=0.0200
```

de-100000:
```
or-trigram vs or: W=122 T=748 L=130
terms 1-3  n=790  W=92 T=601 L=97  or-trigram: ndcg@10=0.4781 p@10=0.0582  or: ndcg@10=0.4628 p@10=0.0562
terms 4-6  n=205  W=30 T=142 L=33  or-trigram: ndcg@10=0.6060 p@10=0.0741  or: ndcg@10=0.6059 p@10=0.0737
terms 7+  n=5  W=0 T=5 L=0  or-trigram: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-100000:
```
or-stem vs or: W=82 T=769 L=149
terms 1-3  n=790  W=71 T=596 L=123  or-stem: ndcg@10=0.4556 p@10=0.0591  or: ndcg@10=0.4628 p@10=0.0562
terms 4-6  n=205  W=11 T=168 L=26  or-stem: ndcg@10=0.5846 p@10=0.0746  or: ndcg@10=0.6059 p@10=0.0737
terms 7+  n=5  W=0 T=5 L=0  or-stem: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-100000:
```
hybrid vs or: W=55 T=880 L=65
terms 1-3  n=790  W=35 T=716 L=39  hybrid: ndcg@10=0.4648 p@10=0.0573  or: ndcg@10=0.4628 p@10=0.0562
terms 4-6  n=205  W=20 T=159 L=26  hybrid: ndcg@10=0.6010 p@10=0.0741  or: ndcg@10=0.6059 p@10=0.0737
terms 7+  n=5  W=0 T=5 L=0  hybrid: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-100000:
```
hybrid-expanded vs or: W=132 T=735 L=133
terms 1-3  n=790  W=100 T=585 L=105  hybrid-expanded: ndcg@10=0.4790 p@10=0.0599  or: ndcg@10=0.4628 p@10=0.0562
terms 4-6  n=205  W=32 T=145 L=28  hybrid-expanded: ndcg@10=0.6118 p@10=0.0771  or: ndcg@10=0.6059 p@10=0.0737
terms 7+  n=5  W=0 T=5 L=0  hybrid-expanded: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-1000000:
```
or vs and: W=274 T=720 L=6
terms 1-3  n=790  W=165 T=620 L=5  or: ndcg@10=0.3229 p@10=0.0419  and: ndcg@10=0.1754 p@10=0.0206
terms 4-6  n=205  W=105 T=99 L=1  or: ndcg@10=0.4372 p@10=0.0576  and: ndcg@10=0.0548 p@10=0.0059
terms 7+  n=5  W=4 T=1 L=0  or: ndcg@10=0.9262 p@10=0.1000  and: ndcg@10=0.2000 p@10=0.0200
```

de-1000000:
```
or-trigram vs or: W=120 T=748 L=132
terms 1-3  n=790  W=87 T=609 L=94  or-trigram: ndcg@10=0.3229 p@10=0.0419  or: ndcg@10=0.3229 p@10=0.0419
terms 4-6  n=205  W=33 T=134 L=38  or-trigram: ndcg@10=0.4405 p@10=0.0556  or: ndcg@10=0.4372 p@10=0.0576
terms 7+  n=5  W=0 T=5 L=0  or-trigram: ndcg@10=0.9262 p@10=0.1000  or: ndcg@10=0.9262 p@10=0.1000
```

de-1000000:
```
or-stem vs or: W=59 T=791 L=150
terms 1-3  n=790  W=50 T=631 L=109  or-stem: ndcg@10=0.2981 p@10=0.0396  or: ndcg@10=0.3229 p@10=0.0419
terms 4-6  n=205  W=9 T=155 L=41  or-stem: ndcg@10=0.3885 p@10=0.0522  or: ndcg@10=0.4372 p@10=0.0576
terms 7+  n=5  W=0 T=5 L=0  or-stem: ndcg@10=0.9262 p@10=0.1000  or: ndcg@10=0.9262 p@10=0.1000
```

de-1000000:
```
hybrid vs or: W=53 T=893 L=54
terms 1-3  n=790  W=27 T=733 L=30  hybrid: ndcg@10=0.3230 p@10=0.0414  or: ndcg@10=0.3229 p@10=0.0419
terms 4-6  n=205  W=25 T=156 L=24  hybrid: ndcg@10=0.4403 p@10=0.0566  or: ndcg@10=0.4372 p@10=0.0576
terms 7+  n=5  W=1 T=4 L=0  hybrid: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=0.9262 p@10=0.1000
```

de-1000000:
```
hybrid-expanded vs or: W=103 T=770 L=127
terms 1-3  n=790  W=70 T=625 L=95  hybrid-expanded: ndcg@10=0.3195 p@10=0.0413  or: ndcg@10=0.3229 p@10=0.0419
terms 4-6  n=205  W=33 T=141 L=31  hybrid-expanded: ndcg@10=0.4315 p@10=0.0556  or: ndcg@10=0.4372 p@10=0.0576
terms 7+  n=5  W=0 T=4 L=1  hybrid-expanded: ndcg@10=0.8524 p@10=0.1000  or: ndcg@10=0.9262 p@10=0.1000
```

### English at the same sizes (`porter unicode61`, T19 tooling at `f0eb469`)

`scale-run.sh` with `EN_LANES="and or"`, same subsets and machine, `--repeat 2`:

| size | docs | queries | lane | nDCG@10 | MRR@10 | Recall@100 | P@10 | p50 ms | p95 ms |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 10000 | 10000 | 1000 | and | 0.1872 | 0.1908 | 0.1891 | 0.0196 | 0.04 | 0.10 |
| 10000 | 10000 | 1000 | or | 0.8916 | 0.8729 | 0.9845 | 0.1006 | 0.56 | 1.14 |
| 100000 | 100000 | 1000 | and | 0.1841 | 0.1876 | 0.1891 | 0.0193 | 0.14 | 0.55 |
| 100000 | 100000 | 1000 | or | 0.7705 | 0.7433 | 0.9600 | 0.0913 | 3.77 | 9.43 |
| 1000000 | 1000000 | 1000 | and | 0.1709 | 0.1718 | 0.1861 | 0.0187 | 0.81 | 5.40 |
| 1000000 | 1000000 | 1000 | or | 0.5497 | 0.5107 | 0.8714 | 0.0718 | 44.66 | 118.78 |

| size | index | build s | size MB |
|---|---|---:|---:|
| 10000 | porter-unicode61 | 0.1 | 6.32 |
| 100000 | porter-unicode61 | 0.9 | 59.08 |
| 1000000 | porter-unicode61 | 10.7 | 590.23 |

### Facts (no recommendation)

- New list vs old list, `or` p95: GermanDPR 2.06 → 0.83 ms, GovService
  0.44 → 0.24 ms, mMARCO-de 10 000 2.57 → 0.46 ms, 100 000 26.76 → 2.24 ms,
  1 000 000 266.96 → 24.72 ms. `or` nDCG@10: +0.0010, +0.0343, +0.0025,
  +0.0011, +0.0025; no German lane loses nDCG@10 with the new list.
- Growth 100 000 → 1 000 000, new list: `or` p50 0.74 → 6.43 ms (8.7×), p95
  2.24 → 24.72 ms (11.0×); `or-trigram` p50 7.99 → 67.69 ms (8.5×), p95
  21.30 → 188.39 ms (8.8×); index unicode61 67.47 → 663.22 MB (9.8×),
  trigram 188.87 → 1942.40 MB (10.3×). Trigram/unicode61 at 1 000 000: 2.93×.
- English `or`, 100 000 → 1 000 000: p50 3.77 → 44.66 ms (11.8×), p95 9.43 →
  118.78 ms (12.6×), index 59.08 → 590.23 MB (10.0×).
- E5 with the new list: no German lane meets it on every untuned dataset.
  `or-trigram` exceeds 3× p95 on GermanDPR (5.07×) and on mMARCO-de at
  every size (6.61×, 9.51×, 7.62×) and gains +0.0007 nDCG@10 at 1 000 000.
  `hybrid` stays below +0.01 on mMARCO-de at every size (at most +0.0014;
  +0.0011 at 1 000 000). `hybrid-expanded` meets the nDCG/P@10/p95 parts on
  GermanDPR, 10 000 and 100 000, exceeds 3× p95 on GovService (3.21×, two
  runs) and loses at 1 000 000 (−0.0042 / −0.0009). `or-stem` loses on
  GovService, 100 000 and 1 000 000 (−0.0111, −0.0100, −0.0296).
  `hybrid-trigram` exceeds 3× p95 and loses at 1 000 000.
- `or` vs `and` at 1 000 000, new list: 0.3493 vs 0.1508, W=274 T=720 L=6.
- The full corpus (8 841 823 passages) and the comparison with the published
  BM25 values follow in their own task.

## T19 – Scale (MS MARCO / mMARCO)

Executed on 30.10.2026 by the reviewing agent on the GX10 (not by the local
agent), Phase A and B as in `tasks/T19-scale.md`, with two deviations: the
German lanes use `STOPWORDS_DE` (T21, `DE_STOPWORDS=lib`), and their results
are the ones of the T21 run (`t21-lib`, stemmer lanes after the review fix),
linked into this run so that `scale-run.sh` skipped them. The English lanes
were measured in this run (code at `b91f437`; the English code paths are
unchanged up to `07aa056`). Compares and `results/summary.md` were then
regenerated at `07aa056` (every lane skipped, `results/params`:
`queries=1000 repeat=2 full_queries=300 full_repeat=1 de_stopwords=lib`).

Data, checksums, revision and conversion: as in T21 (same files). Machine:
`nproc` 20, 121 GiB RAM, Node v24.22.1, SQLite 3.53.4. During the run a
local LLM server (the llama.cpp-based Strata engine) served on the same
machine, another session ran LLM benchmarks, and other measurements of this
validation ran on other cores part of the time; latencies are from a loaded
machine. Subsets: `docs=10000|100000|1000000 queries=1000 qrels=1053
rel_docs=1053 missing_rel=0` for both languages. id sequence identical for en
and de at every size (`results/idhash.txt`, size, en, de):

```
1000000 d8f65c13b77f252d2ed327e2d9c0612d3e1dbd2478bf62cf05a152eff75532e5 d8f65c13b77f252d2ed327e2d9c0612d3e1dbd2478bf62cf05a152eff75532e5
100000 2dd56dd62ff567ceae2b14112e1528a83bdc7738a27a4ea1ec1326da6b342ee0 2dd56dd62ff567ceae2b14112e1528a83bdc7738a27a4ea1ec1326da6b342ee0
10000 6983221e7679cbc4fddcba9109c812369cd61e9ca57c443af45e21bb600fba8d 6983221e7679cbc4fddcba9109c812369cd61e9ca57c443af45e21bb600fba8d
```

Command (Phase A, step 4, with the T21 variable):

```
cd "$REPO" && SCALE_DIR="$SCALE_DIR" STEMMER="$STEMMER" FULL=0 DE_STOPWORDS=lib nohup bash scripts/scale-run.sh > "$SCALE_DIR/scale-run.nohup.log" 2>&1 &
```

No lane hit the 6-hour limit (no `timeout` in the table). The full corpus
(8 841 823 passages) and the comparison with the published BM25 values
follow in their own task.

### `results/summary.md`


### English

| size | docs | queries | lane | nDCG@10 | MRR@10 | Recall@100 | P@10 | p50 ms | p95 ms |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 10000 | 10000 | 1000 | and | 0.1872 | 0.1908 | 0.1891 | 0.0196 | 0.04 | 0.10 |
| 10000 | 10000 | 1000 | or | 0.8916 | 0.8729 | 0.9845 | 0.1006 | 0.55 | 1.14 |
| 10000 | 10000 | 1000 | hybrid | 0.7866 | 0.7669 | 0.9505 | 0.0905 | 4.95 | 6.38 |
| 10000 | 10000 | 1000 | hybrid-fts | 0.8345 | 0.8129 | 0.9725 | 0.0958 | 15.27 | 25.86 |
| 10000 | 10000 | 1000 | hybrid-k10 | 0.7904 | 0.7689 | 0.8685 | 0.0916 | 1.07 | 1.78 |
| 10000 | 10000 | 1000 | hybrid-nofloor-k10 | 0.7931 | 0.7726 | 0.8685 | 0.0916 | 0.98 | 1.67 |
| 10000 | 10000 | 1000 | hybrid-fts-k10 | 0.8357 | 0.8139 | 0.9110 | 0.0960 | 2.03 | 3.63 |
| 10000 | 10000 | 1000 | hybrid-substr-k10 | 0.8158 | 0.7935 | 0.9815 | 0.0944 | 0.57 | 1.20 |
| 10000 | 10000 | 1000 | blend-0.1 | 0.8900 | 0.8711 | 0.9845 | 0.1005 | 14.92 | 25.81 |
| 10000 | 10000 | 1000 | blendidf-0.1 | 0.8928 | 0.8742 | 0.9845 | 0.1007 | 15.53 | 26.44 |
| 100000 | 100000 | 1000 | and | 0.1841 | 0.1876 | 0.1891 | 0.0193 | 0.17 | 0.62 |
| 100000 | 100000 | 1000 | or | 0.7705 | 0.7433 | 0.9600 | 0.0913 | 3.79 | 9.99 |
| 100000 | 100000 | 1000 | hybrid | 0.6644 | 0.6408 | 0.8695 | 0.0797 | 8.84 | 15.68 |
| 100000 | 100000 | 1000 | hybrid-fts | 0.6963 | 0.6704 | 0.9145 | 0.0834 | 38.07 | 68.58 |
| 100000 | 100000 | 1000 | hybrid-k10 | 0.6743 | 0.6474 | 0.7777 | 0.0819 | 4.21 | 10.36 |
| 100000 | 100000 | 1000 | hybrid-nofloor-k10 | 0.6791 | 0.6534 | 0.7787 | 0.0820 | 4.02 | 9.85 |
| 100000 | 100000 | 1000 | hybrid-fts-k10 | 0.6996 | 0.6727 | 0.7983 | 0.0841 | 7.12 | 14.46 |
| 100000 | 100000 | 1000 | hybrid-substr-k10 | 0.6961 | 0.6664 | 0.9423 | 0.0847 | 3.68 | 9.24 |
| 100000 | 100000 | 1000 | blend-0.1 | 0.7678 | 0.7418 | 0.9555 | 0.0906 | 37.52 | 67.80 |
| 100000 | 100000 | 1000 | blendidf-0.1 | 0.7715 | 0.7451 | 0.9610 | 0.0910 | 37.07 | 67.07 |
| 1000000 | 1000000 | 1000 | and | 0.1709 | 0.1718 | 0.1861 | 0.0187 | 0.80 | 5.39 |
| 1000000 | 1000000 | 1000 | or | 0.5497 | 0.5107 | 0.8714 | 0.0718 | 48.87 | 123.10 |
| 1000000 | 1000000 | 1000 | hybrid | 0.4744 | 0.4457 | 0.7668 | 0.0606 | 61.65 | 126.25 |
| 1000000 | 1000000 | 1000 | hybrid-fts | 0.4958 | 0.4621 | 0.8032 | 0.0645 | 83.48 | 163.67 |
| 1000000 | 1000000 | 1000 | hybrid-k10 | 0.4845 | 0.4512 | 0.6071 | 0.0632 | 47.38 | 117.24 |
| 1000000 | 1000000 | 1000 | hybrid-nofloor-k10 | 0.4944 | 0.4620 | 0.6141 | 0.0639 | 51.07 | 128.87 |
| 1000000 | 1000000 | 1000 | hybrid-fts-k10 | 0.4991 | 0.4646 | 0.6246 | 0.0651 | 49.53 | 119.85 |
| 1000000 | 1000000 | 1000 | hybrid-substr-k10 | 0.5114 | 0.4786 | 0.8294 | 0.0656 | 44.23 | 110.68 |
| 1000000 | 1000000 | 1000 | blend-0.1 | 0.5491 | 0.5094 | 0.8669 | 0.0719 | 79.94 | 157.46 |
| 1000000 | 1000000 | 1000 | blendidf-0.1 | 0.5534 | 0.5134 | 0.8694 | 0.0725 | 78.45 | 156.43 |

| size | index | build s | size MB |
|---|---|---:|---:|
| 10000 | porter-unicode61 | 0.1 | 6.32 |
| 100000 | porter-unicode61 | 1.2 | 59.08 |
| 1000000 | porter-unicode61 | 10.6 | 590.23 |

### German

| size | docs | queries | lane | nDCG@10 | MRR@10 | Recall@100 | P@10 | p50 ms | p95 ms |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 10000 | 10000 | 1000 | and | 0.1853 | 0.1870 | 0.1888 | 0.0195 | 0.02 | 0.06 |
| 10000 | 10000 | 1000 | or | 0.6022 | 0.5833 | 0.7255 | 0.0707 | 0.24 | 0.46 |
| 10000 | 10000 | 1000 | or-stem | 0.6332 | 0.6082 | 0.7992 | 0.0761 | 0.36 | 0.97 |
| 10000 | 10000 | 1000 | or-trigram | 0.6277 | 0.6074 | 0.7675 | 0.0737 | 1.30 | 3.04 |
| 10000 | 10000 | 1000 | hybrid | 0.6036 | 0.5843 | 0.7107 | 0.0710 | 0.21 | 0.43 |
| 10000 | 10000 | 1000 | hybrid-expanded | 0.6419 | 0.6185 | 0.7827 | 0.0767 | 0.31 | 0.93 |
| 10000 | 10000 | 1000 | hybrid-trigram | 0.6163 | 0.5943 | 0.7505 | 0.0732 | 1.25 | 2.96 |
| 100000 | 100000 | 1000 | and | 0.1783 | 0.1793 | 0.1888 | 0.0190 | 0.06 | 0.20 |
| 100000 | 100000 | 1000 | or | 0.4948 | 0.4748 | 0.6730 | 0.0600 | 0.74 | 2.24 |
| 100000 | 100000 | 1000 | or-stem | 0.4848 | 0.4548 | 0.7340 | 0.0625 | 1.08 | 4.28 |
| 100000 | 100000 | 1000 | or-trigram | 0.5069 | 0.4855 | 0.6983 | 0.0617 | 7.99 | 21.30 |
| 100000 | 100000 | 1000 | hybrid | 0.4954 | 0.4739 | 0.6505 | 0.0610 | 0.65 | 2.16 |
| 100000 | 100000 | 1000 | hybrid-expanded | 0.5088 | 0.4842 | 0.7056 | 0.0636 | 1.06 | 4.21 |
| 100000 | 100000 | 1000 | hybrid-trigram | 0.4957 | 0.4759 | 0.6683 | 0.0604 | 8.01 | 21.35 |
| 1000000 | 1000000 | 1000 | and | 0.1508 | 0.1468 | 0.1838 | 0.0176 | 0.21 | 1.44 |
| 1000000 | 1000000 | 1000 | or | 0.3493 | 0.3258 | 0.5719 | 0.0454 | 6.43 | 24.72 |
| 1000000 | 1000000 | 1000 | or-stem | 0.3197 | 0.2960 | 0.6072 | 0.0425 | 9.43 | 37.21 |
| 1000000 | 1000000 | 1000 | or-trigram | 0.3500 | 0.3283 | 0.5854 | 0.0450 | 67.69 | 188.39 |
| 1000000 | 1000000 | 1000 | hybrid | 0.3504 | 0.3305 | 0.5403 | 0.0448 | 6.23 | 24.55 |
| 1000000 | 1000000 | 1000 | hybrid-expanded | 0.3451 | 0.3238 | 0.5503 | 0.0445 | 9.32 | 37.14 |
| 1000000 | 1000000 | 1000 | hybrid-trigram | 0.3421 | 0.3213 | 0.5542 | 0.0441 | 67.68 | 189.36 |

| size | index | build s | size MB |
|---|---|---:|---:|
| 10000 | unicode61 | 0.1 | 7.22 |
| 10000 | trigram | 0.3 | 20.38 |
| 100000 | unicode61 | 1.1 | 67.47 |
| 100000 | trigram | 3.9 | 188.87 |
| 1000000 | unicode61 | 12.4 | 663.22 |
| 1000000 | trigram | 51.5 | 1942.40 |

### `results/compare-*.txt`

de-10000.hybrid-expanded-vs-hybrid:
```
hybrid-expanded vs hybrid: W=114 T=787 L=99
terms 1-3  n=790  W=89 T=620 L=81  hybrid-expanded: ndcg@10=0.6115 p@10=0.0725  hybrid: ndcg@10=0.5698 p@10=0.0668
terms 4-6  n=205  W=25 T=162 L=18  hybrid-expanded: ndcg@10=0.7503 p@10=0.0922  hybrid: ndcg@10=0.7243 p@10=0.0863
terms 7+  n=5  W=0 T=5 L=0  hybrid-expanded: ndcg@10=1.0000 p@10=0.1000  hybrid: ndcg@10=1.0000 p@10=0.1000
```

de-10000.hybrid-expanded-vs-or-trigram:
```
hybrid-expanded vs or-trigram: W=167 T=671 L=162
terms 1-3  n=790  W=136 T=524 L=130  hybrid-expanded: ndcg@10=0.6115 p@10=0.0725  or-trigram: ndcg@10=0.5913 p@10=0.0696
terms 4-6  n=205  W=31 T=142 L=32  hybrid-expanded: ndcg@10=0.7503 p@10=0.0922  or-trigram: ndcg@10=0.7589 p@10=0.0888
terms 7+  n=5  W=0 T=5 L=0  hybrid-expanded: ndcg@10=1.0000 p@10=0.1000  or-trigram: ndcg@10=1.0000 p@10=0.1000
```

de-10000.hybrid-expanded-vs-or:
```
hybrid-expanded vs or: W=135 T=751 L=114
terms 1-3  n=790  W=105 T=596 L=89  hybrid-expanded: ndcg@10=0.6115 p@10=0.0725  or: ndcg@10=0.5645 p@10=0.0663
terms 4-6  n=205  W=30 T=150 L=25  hybrid-expanded: ndcg@10=0.7503 p@10=0.0922  or: ndcg@10=0.7377 p@10=0.0868
terms 7+  n=5  W=0 T=5 L=0  hybrid-expanded: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-10000.hybrid-trigram-vs-or-trigram:
```
hybrid-trigram vs or-trigram: W=21 T=932 L=47
terms 1-3  n=790  W=12 T=751 L=27  hybrid-trigram: ndcg@10=0.5846 p@10=0.0692  or-trigram: ndcg@10=0.5913 p@10=0.0696
terms 4-6  n=205  W=9 T=176 L=20  hybrid-trigram: ndcg@10=0.7293 p@10=0.0878  or-trigram: ndcg@10=0.7589 p@10=0.0888
terms 7+  n=5  W=0 T=5 L=0  hybrid-trigram: ndcg@10=1.0000 p@10=0.1000  or-trigram: ndcg@10=1.0000 p@10=0.1000
```

de-10000.hybrid-trigram-vs-or:
```
hybrid-trigram vs or: W=124 T=747 L=129
terms 1-3  n=790  W=98 T=596 L=96  hybrid-trigram: ndcg@10=0.5846 p@10=0.0692  or: ndcg@10=0.5645 p@10=0.0663
terms 4-6  n=205  W=26 T=146 L=33  hybrid-trigram: ndcg@10=0.7293 p@10=0.0878  or: ndcg@10=0.7377 p@10=0.0868
terms 7+  n=5  W=0 T=5 L=0  hybrid-trigram: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-10000.hybrid-vs-or:
```
hybrid vs or: W=37 T=917 L=46
terms 1-3  n=790  W=29 T=731 L=30  hybrid: ndcg@10=0.5698 p@10=0.0668  or: ndcg@10=0.5645 p@10=0.0663
terms 4-6  n=205  W=8 T=181 L=16  hybrid: ndcg@10=0.7243 p@10=0.0863  or: ndcg@10=0.7377 p@10=0.0868
terms 7+  n=5  W=0 T=5 L=0  hybrid: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-10000.or-stem-vs-or:
```
or-stem vs or: W=93 T=794 L=113
terms 1-3  n=790  W=78 T=619 L=93  or-stem: ndcg@10=0.6060 p@10=0.0729  or: ndcg@10=0.5645 p@10=0.0663
terms 4-6  n=205  W=15 T=170 L=20  or-stem: ndcg@10=0.7292 p@10=0.0878  or: ndcg@10=0.7377 p@10=0.0868
terms 7+  n=5  W=0 T=5 L=0  or-stem: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-10000.or-trigram-vs-or:
```
or-trigram vs or: W=127 T=763 L=110
terms 1-3  n=790  W=100 T=604 L=86  or-trigram: ndcg@10=0.5913 p@10=0.0696  or: ndcg@10=0.5645 p@10=0.0663
terms 4-6  n=205  W=27 T=154 L=24  or-trigram: ndcg@10=0.7589 p@10=0.0888  or: ndcg@10=0.7377 p@10=0.0868
terms 7+  n=5  W=0 T=5 L=0  or-trigram: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-10000.or-vs-and:
```
or vs and: W=487 T=512 L=1
terms 1-3  n=790  W=328 T=461 L=1  or: ndcg@10=0.5645 p@10=0.0663  and: ndcg@10=0.2185 p@10=0.0230
terms 4-6  n=205  W=155 T=50 L=0  or: ndcg@10=0.7377 p@10=0.0868  and: ndcg@10=0.0566 p@10=0.0059
terms 7+  n=5  W=4 T=1 L=0  or: ndcg@10=1.0000 p@10=0.1000  and: ndcg@10=0.2000 p@10=0.0200
```

en-10000.blend-0.1-vs-or:
```
blend-0.1 vs or: W=6 T=974 L=20
terms 1-3  n=451  W=1 T=438 L=12  blend-0.1: ndcg@10=0.8596 p@10=0.0976  or: ndcg@10=0.8645 p@10=0.0976
terms 4-6  n=510  W=5 T=497 L=8  blend-0.1: ndcg@10=0.9128 p@10=0.1025  or: ndcg@10=0.9117 p@10=0.1027
terms 7+  n=39  W=0 T=39 L=0  blend-0.1: ndcg@10=0.9423 p@10=0.1077  or: ndcg@10=0.9423 p@10=0.1077
```

en-10000.blendidf-0.1-vs-or:
```
blendidf-0.1 vs or: W=11 T=982 L=7
terms 1-3  n=451  W=3 T=443 L=5  blendidf-0.1: ndcg@10=0.8637 p@10=0.0978  or: ndcg@10=0.8645 p@10=0.0976
terms 4-6  n=510  W=7 T=501 L=2  blendidf-0.1: ndcg@10=0.9147 p@10=0.1027  or: ndcg@10=0.9117 p@10=0.1027
terms 7+  n=39  W=1 T=38 L=0  blendidf-0.1: ndcg@10=0.9441 p@10=0.1077  or: ndcg@10=0.9423 p@10=0.1077
```

en-10000.hybrid-fts-k10-vs-or:
```
hybrid-fts-k10 vs or: W=18 T=859 L=123
terms 1-3  n=451  W=3 T=386 L=62  hybrid-fts-k10: ndcg@10=0.7892 p@10=0.0907  or: ndcg@10=0.8645 p@10=0.0976
terms 4-6  n=510  W=15 T=435 L=60  hybrid-fts-k10: ndcg@10=0.8692 p@10=0.1000  or: ndcg@10=0.9117 p@10=0.1027
terms 7+  n=39  W=0 T=38 L=1  hybrid-fts-k10: ndcg@10=0.9344 p@10=0.1051  or: ndcg@10=0.9423 p@10=0.1077
```

en-10000.hybrid-fts-vs-or:
```
hybrid-fts vs or: W=18 T=858 L=124
terms 1-3  n=451  W=3 T=386 L=62  hybrid-fts: ndcg@10=0.7885 p@10=0.0905  or: ndcg@10=0.8645 p@10=0.0976
terms 4-6  n=510  W=15 T=434 L=61  hybrid-fts: ndcg@10=0.8675 p@10=0.0998  or: ndcg@10=0.9117 p@10=0.1027
terms 7+  n=39  W=0 T=38 L=1  hybrid-fts: ndcg@10=0.9344 p@10=0.1051  or: ndcg@10=0.9423 p@10=0.1077
```

en-10000.hybrid-k10-vs-or:
```
hybrid-k10 vs or: W=41 T=774 L=185
terms 1-3  n=451  W=15 T=338 L=98  hybrid-k10: ndcg@10=0.7355 p@10=0.0863  or: ndcg@10=0.8645 p@10=0.0976
terms 4-6  n=510  W=25 T=402 L=83  hybrid-k10: ndcg@10=0.8307 p@10=0.0959  or: ndcg@10=0.9117 p@10=0.1027
terms 7+  n=39  W=1 T=34 L=4  hybrid-k10: ndcg@10=0.8979 p@10=0.0974  or: ndcg@10=0.9423 p@10=0.1077
```

en-10000.hybrid-nofloor-k10-vs-or:
```
hybrid-nofloor-k10 vs or: W=41 T=781 L=178
terms 1-3  n=451  W=15 T=345 L=91  hybrid-nofloor-k10: ndcg@10=0.7416 p@10=0.0863  or: ndcg@10=0.8645 p@10=0.0976
terms 4-6  n=510  W=25 T=402 L=83  hybrid-nofloor-k10: ndcg@10=0.8307 p@10=0.0959  or: ndcg@10=0.9117 p@10=0.1027
terms 7+  n=39  W=1 T=34 L=4  hybrid-nofloor-k10: ndcg@10=0.8979 p@10=0.0974  or: ndcg@10=0.9423 p@10=0.1077
```

en-10000.hybrid-substr-k10-vs-or:
```
hybrid-substr-k10 vs or: W=39 T=797 L=164
terms 1-3  n=451  W=12 T=352 L=87  hybrid-substr-k10: ndcg@10=0.7618 p@10=0.0889  or: ndcg@10=0.8645 p@10=0.0976
terms 4-6  n=510  W=24 T=410 L=76  hybrid-substr-k10: ndcg@10=0.8534 p@10=0.0986  or: ndcg@10=0.9117 p@10=0.1027
terms 7+  n=39  W=3 T=35 L=1  hybrid-substr-k10: ndcg@10=0.9495 p@10=0.1026  or: ndcg@10=0.9423 p@10=0.1077
```

en-10000.hybrid-vs-or:
```
hybrid vs or: W=41 T=773 L=186
terms 1-3  n=451  W=15 T=338 L=98  hybrid: ndcg@10=0.7319 p@10=0.0851  or: ndcg@10=0.8645 p@10=0.0976
terms 4-6  n=510  W=25 T=401 L=84  hybrid: ndcg@10=0.8264 p@10=0.0947  or: ndcg@10=0.9117 p@10=0.1027
terms 7+  n=39  W=1 T=34 L=4  hybrid: ndcg@10=0.8979 p@10=0.0974  or: ndcg@10=0.9423 p@10=0.1077
```

en-10000.or-vs-and:
```
or vs and: W=770 T=228 L=2
terms 1-3  n=451  W=305 T=146 L=0  or: ndcg@10=0.8645 p@10=0.0976  and: ndcg@10=0.2638 p@10=0.0279
terms 4-6  n=510  W=429 T=79 L=2  or: ndcg@10=0.9117 p@10=0.1027  and: ndcg@10=0.1279 p@10=0.0131
terms 7+  n=39  W=36 T=3 L=0  or: ndcg@10=0.9423 p@10=0.1077  and: ndcg@10=0.0769 p@10=0.0077
```

de-100000.hybrid-expanded-vs-hybrid:
```
hybrid-expanded vs hybrid: W=113 T=773 L=114
terms 1-3  n=790  W=89 T=604 L=97  hybrid-expanded: ndcg@10=0.4790 p@10=0.0599  hybrid: ndcg@10=0.4648 p@10=0.0573
terms 4-6  n=205  W=24 T=164 L=17  hybrid-expanded: ndcg@10=0.6118 p@10=0.0771  hybrid: ndcg@10=0.6010 p@10=0.0741
terms 7+  n=5  W=0 T=5 L=0  hybrid-expanded: ndcg@10=1.0000 p@10=0.1000  hybrid: ndcg@10=1.0000 p@10=0.1000
```

de-100000.hybrid-expanded-vs-or-trigram:
```
hybrid-expanded vs or-trigram: W=175 T=661 L=164
terms 1-3  n=790  W=138 T=517 L=135  hybrid-expanded: ndcg@10=0.4790 p@10=0.0599  or-trigram: ndcg@10=0.4781 p@10=0.0582
terms 4-6  n=205  W=37 T=139 L=29  hybrid-expanded: ndcg@10=0.6118 p@10=0.0771  or-trigram: ndcg@10=0.6060 p@10=0.0741
terms 7+  n=5  W=0 T=5 L=0  hybrid-expanded: ndcg@10=1.0000 p@10=0.1000  or-trigram: ndcg@10=1.0000 p@10=0.1000
```

de-100000.hybrid-expanded-vs-or:
```
hybrid-expanded vs or: W=132 T=735 L=133
terms 1-3  n=790  W=100 T=585 L=105  hybrid-expanded: ndcg@10=0.4790 p@10=0.0599  or: ndcg@10=0.4628 p@10=0.0562
terms 4-6  n=205  W=32 T=145 L=28  hybrid-expanded: ndcg@10=0.6118 p@10=0.0771  or: ndcg@10=0.6059 p@10=0.0737
terms 7+  n=5  W=0 T=5 L=0  hybrid-expanded: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-100000.hybrid-trigram-vs-or-trigram:
```
hybrid-trigram vs or-trigram: W=39 T=901 L=60
terms 1-3  n=790  W=28 T=729 L=33  hybrid-trigram: ndcg@10=0.4722 p@10=0.0575  or-trigram: ndcg@10=0.4781 p@10=0.0582
terms 4-6  n=205  W=11 T=167 L=27  hybrid-trigram: ndcg@10=0.5743 p@10=0.0707  or-trigram: ndcg@10=0.6060 p@10=0.0741
terms 7+  n=5  W=0 T=5 L=0  hybrid-trigram: ndcg@10=1.0000 p@10=0.1000  or-trigram: ndcg@10=1.0000 p@10=0.1000
```

de-100000.hybrid-trigram-vs-or:
```
hybrid-trigram vs or: W=124 T=727 L=149
terms 1-3  n=790  W=94 T=588 L=108  hybrid-trigram: ndcg@10=0.4722 p@10=0.0575  or: ndcg@10=0.4628 p@10=0.0562
terms 4-6  n=205  W=30 T=134 L=41  hybrid-trigram: ndcg@10=0.5743 p@10=0.0707  or: ndcg@10=0.6059 p@10=0.0737
terms 7+  n=5  W=0 T=5 L=0  hybrid-trigram: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-100000.hybrid-vs-or:
```
hybrid vs or: W=55 T=880 L=65
terms 1-3  n=790  W=35 T=716 L=39  hybrid: ndcg@10=0.4648 p@10=0.0573  or: ndcg@10=0.4628 p@10=0.0562
terms 4-6  n=205  W=20 T=159 L=26  hybrid: ndcg@10=0.6010 p@10=0.0741  or: ndcg@10=0.6059 p@10=0.0737
terms 7+  n=5  W=0 T=5 L=0  hybrid: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-100000.or-stem-vs-or:
```
or-stem vs or: W=82 T=769 L=149
terms 1-3  n=790  W=71 T=596 L=123  or-stem: ndcg@10=0.4556 p@10=0.0591  or: ndcg@10=0.4628 p@10=0.0562
terms 4-6  n=205  W=11 T=168 L=26  or-stem: ndcg@10=0.5846 p@10=0.0746  or: ndcg@10=0.6059 p@10=0.0737
terms 7+  n=5  W=0 T=5 L=0  or-stem: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-100000.or-trigram-vs-or:
```
or-trigram vs or: W=122 T=748 L=130
terms 1-3  n=790  W=92 T=601 L=97  or-trigram: ndcg@10=0.4781 p@10=0.0582  or: ndcg@10=0.4628 p@10=0.0562
terms 4-6  n=205  W=30 T=142 L=33  or-trigram: ndcg@10=0.6060 p@10=0.0741  or: ndcg@10=0.6059 p@10=0.0737
terms 7+  n=5  W=0 T=5 L=0  or-trigram: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=1.0000 p@10=0.1000
```

de-100000.or-vs-and:
```
or vs and: W=395 T=602 L=3
terms 1-3  n=790  W=258 T=529 L=3  or: ndcg@10=0.4628 p@10=0.0562  and: ndcg@10=0.2097 p@10=0.0224
terms 4-6  n=205  W=133 T=72 L=0  or: ndcg@10=0.6059 p@10=0.0737  and: ndcg@10=0.0566 p@10=0.0059
terms 7+  n=5  W=4 T=1 L=0  or: ndcg@10=1.0000 p@10=0.1000  and: ndcg@10=0.2000 p@10=0.0200
```

en-100000.blend-0.1-vs-or:
```
blend-0.1 vs or: W=21 T=946 L=33
terms 1-3  n=451  W=7 T=426 L=18  blend-0.1: ndcg@10=0.7364 p@10=0.0871  or: ndcg@10=0.7399 p@10=0.0878
terms 4-6  n=510  W=14 T=482 L=14  blend-0.1: ndcg@10=0.7906 p@10=0.0931  or: ndcg@10=0.7926 p@10=0.0939
terms 7+  n=39  W=0 T=38 L=1  blend-0.1: ndcg@10=0.8335 p@10=0.0974  or: ndcg@10=0.8368 p@10=0.0974
```

en-100000.blendidf-0.1-vs-or:
```
blendidf-0.1 vs or: W=23 T=958 L=19
terms 1-3  n=451  W=5 T=437 L=9  blendidf-0.1: ndcg@10=0.7399 p@10=0.0876  or: ndcg@10=0.7399 p@10=0.0878
terms 4-6  n=510  W=17 T=483 L=10  blendidf-0.1: ndcg@10=0.7943 p@10=0.0935  or: ndcg@10=0.7926 p@10=0.0939
terms 7+  n=39  W=1 T=38 L=0  blendidf-0.1: ndcg@10=0.8380 p@10=0.0974  or: ndcg@10=0.8368 p@10=0.0974
```

en-100000.hybrid-fts-k10-vs-or:
```
hybrid-fts-k10 vs or: W=39 T=784 L=177
terms 1-3  n=451  W=12 T=368 L=71  hybrid-fts-k10: ndcg@10=0.6713 p@10=0.0789  or: ndcg@10=0.7399 p@10=0.0878
terms 4-6  n=510  W=25 T=384 L=101  hybrid-fts-k10: ndcg@10=0.7162 p@10=0.0876  or: ndcg@10=0.7926 p@10=0.0939
terms 7+  n=39  W=2 T=32 L=5  hybrid-fts-k10: ndcg@10=0.8108 p@10=0.0974  or: ndcg@10=0.8368 p@10=0.0974
```

en-100000.hybrid-fts-vs-or:
```
hybrid-fts vs or: W=39 T=782 L=179
terms 1-3  n=451  W=12 T=368 L=71  hybrid-fts: ndcg@10=0.6712 p@10=0.0789  or: ndcg@10=0.7399 p@10=0.0878
terms 4-6  n=510  W=25 T=382 L=103  hybrid-fts: ndcg@10=0.7102 p@10=0.0865  or: ndcg@10=0.7926 p@10=0.0939
terms 7+  n=39  W=2 T=32 L=5  hybrid-fts: ndcg@10=0.8061 p@10=0.0949  or: ndcg@10=0.8368 p@10=0.0974
```

en-100000.hybrid-k10-vs-or:
```
hybrid-k10 vs or: W=78 T=708 L=214
terms 1-3  n=451  W=30 T=317 L=104  hybrid-k10: ndcg@10=0.6300 p@10=0.0761  or: ndcg@10=0.7399 p@10=0.0878
terms 4-6  n=510  W=47 T=361 L=102  hybrid-k10: ndcg@10=0.7074 p@10=0.0867  or: ndcg@10=0.7926 p@10=0.0939
terms 7+  n=39  W=1 T=30 L=8  hybrid-k10: ndcg@10=0.7528 p@10=0.0872  or: ndcg@10=0.8368 p@10=0.0974
```

en-100000.hybrid-nofloor-k10-vs-or:
```
hybrid-nofloor-k10 vs or: W=82 T=714 L=204
terms 1-3  n=451  W=33 T=323 L=95  hybrid-nofloor-k10: ndcg@10=0.6382 p@10=0.0763  or: ndcg@10=0.7399 p@10=0.0878
terms 4-6  n=510  W=48 T=361 L=101  hybrid-nofloor-k10: ndcg@10=0.7096 p@10=0.0867  or: ndcg@10=0.7926 p@10=0.0939
terms 7+  n=39  W=1 T=30 L=8  hybrid-nofloor-k10: ndcg@10=0.7528 p@10=0.0872  or: ndcg@10=0.8368 p@10=0.0974
```

en-100000.hybrid-substr-k10-vs-or:
```
hybrid-substr-k10 vs or: W=64 T=735 L=201
terms 1-3  n=451  W=24 T=340 L=87  hybrid-substr-k10: ndcg@10=0.6613 p@10=0.0787  or: ndcg@10=0.7399 p@10=0.0878
terms 4-6  n=510  W=37 T=364 L=109  hybrid-substr-k10: ndcg@10=0.7193 p@10=0.0894  or: ndcg@10=0.7926 p@10=0.0939
terms 7+  n=39  W=3 T=31 L=5  hybrid-substr-k10: ndcg@10=0.7958 p@10=0.0923  or: ndcg@10=0.8368 p@10=0.0974
```

en-100000.hybrid-vs-or:
```
hybrid vs or: W=76 T=698 L=226
terms 1-3  n=451  W=28 T=318 L=105  hybrid: ndcg@10=0.6202 p@10=0.0729  or: ndcg@10=0.7399 p@10=0.0878
terms 4-6  n=510  W=47 T=350 L=113  hybrid: ndcg@10=0.6969 p@10=0.0851  or: ndcg@10=0.7926 p@10=0.0939
terms 7+  n=39  W=1 T=30 L=8  hybrid: ndcg@10=0.7503 p@10=0.0872  or: ndcg@10=0.8368 p@10=0.0974
```

en-100000.or-vs-and:
```
or vs and: W=692 T=303 L=5
terms 1-3  n=451  W=266 T=183 L=2  or: ndcg@10=0.7399 p@10=0.0878  and: ndcg@10=0.2579 p@10=0.0273
terms 4-6  n=510  W=393 T=114 L=3  or: ndcg@10=0.7926 p@10=0.0939  and: ndcg@10=0.1269 p@10=0.0131
terms 7+  n=39  W=33 T=6 L=0  or: ndcg@10=0.8368 p@10=0.0974  and: ndcg@10=0.0769 p@10=0.0077
```

de-1000000.hybrid-expanded-vs-hybrid:
```
hybrid-expanded vs hybrid: W=84 T=810 L=106
terms 1-3  n=790  W=63 T=644 L=83  hybrid-expanded: ndcg@10=0.3195 p@10=0.0413  hybrid: ndcg@10=0.3230 p@10=0.0414
terms 4-6  n=205  W=21 T=163 L=21  hybrid-expanded: ndcg@10=0.4315 p@10=0.0556  hybrid: ndcg@10=0.4403 p@10=0.0566
terms 7+  n=5  W=0 T=3 L=2  hybrid-expanded: ndcg@10=0.8524 p@10=0.1000  hybrid: ndcg@10=1.0000 p@10=0.1000
```

de-1000000.hybrid-expanded-vs-or-trigram:
```
hybrid-expanded vs or-trigram: W=151 T=686 L=163
terms 1-3  n=790  W=116 T=548 L=126  hybrid-expanded: ndcg@10=0.3195 p@10=0.0413  or-trigram: ndcg@10=0.3229 p@10=0.0419
terms 4-6  n=205  W=35 T=134 L=36  hybrid-expanded: ndcg@10=0.4315 p@10=0.0556  or-trigram: ndcg@10=0.4405 p@10=0.0556
terms 7+  n=5  W=0 T=4 L=1  hybrid-expanded: ndcg@10=0.8524 p@10=0.1000  or-trigram: ndcg@10=0.9262 p@10=0.1000
```

de-1000000.hybrid-expanded-vs-or:
```
hybrid-expanded vs or: W=103 T=770 L=127
terms 1-3  n=790  W=70 T=625 L=95  hybrid-expanded: ndcg@10=0.3195 p@10=0.0413  or: ndcg@10=0.3229 p@10=0.0419
terms 4-6  n=205  W=33 T=141 L=31  hybrid-expanded: ndcg@10=0.4315 p@10=0.0556  or: ndcg@10=0.4372 p@10=0.0576
terms 7+  n=5  W=0 T=4 L=1  hybrid-expanded: ndcg@10=0.8524 p@10=0.1000  or: ndcg@10=0.9262 p@10=0.1000
```

de-1000000.hybrid-trigram-vs-or-trigram:
```
hybrid-trigram vs or-trigram: W=50 T=888 L=62
terms 1-3  n=790  W=28 T=726 L=36  hybrid-trigram: ndcg@10=0.3198 p@10=0.0413  or-trigram: ndcg@10=0.3229 p@10=0.0419
terms 4-6  n=205  W=21 T=158 L=26  hybrid-trigram: ndcg@10=0.4119 p@10=0.0537  or-trigram: ndcg@10=0.4405 p@10=0.0556
terms 7+  n=5  W=1 T=4 L=0  hybrid-trigram: ndcg@10=1.0000 p@10=0.1000  or-trigram: ndcg@10=0.9262 p@10=0.1000
```

de-1000000.hybrid-trigram-vs-or:
```
hybrid-trigram vs or: W=116 T=733 L=151
terms 1-3  n=790  W=84 T=602 L=104  hybrid-trigram: ndcg@10=0.3198 p@10=0.0413  or: ndcg@10=0.3229 p@10=0.0419
terms 4-6  n=205  W=31 T=127 L=47  hybrid-trigram: ndcg@10=0.4119 p@10=0.0537  or: ndcg@10=0.4372 p@10=0.0576
terms 7+  n=5  W=1 T=4 L=0  hybrid-trigram: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=0.9262 p@10=0.1000
```

de-1000000.hybrid-vs-or:
```
hybrid vs or: W=53 T=893 L=54
terms 1-3  n=790  W=27 T=733 L=30  hybrid: ndcg@10=0.3230 p@10=0.0414  or: ndcg@10=0.3229 p@10=0.0419
terms 4-6  n=205  W=25 T=156 L=24  hybrid: ndcg@10=0.4403 p@10=0.0566  or: ndcg@10=0.4372 p@10=0.0576
terms 7+  n=5  W=1 T=4 L=0  hybrid: ndcg@10=1.0000 p@10=0.1000  or: ndcg@10=0.9262 p@10=0.1000
```

de-1000000.or-stem-vs-or:
```
or-stem vs or: W=59 T=791 L=150
terms 1-3  n=790  W=50 T=631 L=109  or-stem: ndcg@10=0.2981 p@10=0.0396  or: ndcg@10=0.3229 p@10=0.0419
terms 4-6  n=205  W=9 T=155 L=41  or-stem: ndcg@10=0.3885 p@10=0.0522  or: ndcg@10=0.4372 p@10=0.0576
terms 7+  n=5  W=0 T=5 L=0  or-stem: ndcg@10=0.9262 p@10=0.1000  or: ndcg@10=0.9262 p@10=0.1000
```

de-1000000.or-trigram-vs-or:
```
or-trigram vs or: W=120 T=748 L=132
terms 1-3  n=790  W=87 T=609 L=94  or-trigram: ndcg@10=0.3229 p@10=0.0419  or: ndcg@10=0.3229 p@10=0.0419
terms 4-6  n=205  W=33 T=134 L=38  or-trigram: ndcg@10=0.4405 p@10=0.0556  or: ndcg@10=0.4372 p@10=0.0576
terms 7+  n=5  W=0 T=5 L=0  or-trigram: ndcg@10=0.9262 p@10=0.1000  or: ndcg@10=0.9262 p@10=0.1000
```

de-1000000.or-vs-and:
```
or vs and: W=274 T=720 L=6
terms 1-3  n=790  W=165 T=620 L=5  or: ndcg@10=0.3229 p@10=0.0419  and: ndcg@10=0.1754 p@10=0.0206
terms 4-6  n=205  W=105 T=99 L=1  or: ndcg@10=0.4372 p@10=0.0576  and: ndcg@10=0.0548 p@10=0.0059
terms 7+  n=5  W=4 T=1 L=0  or: ndcg@10=0.9262 p@10=0.1000  and: ndcg@10=0.2000 p@10=0.0200
```

en-1000000.blend-0.1-vs-or:
```
blend-0.1 vs or: W=40 T=921 L=39
terms 1-3  n=451  W=14 T=422 L=15  blend-0.1: ndcg@10=0.5294 p@10=0.0694  or: ndcg@10=0.5286 p@10=0.0687
terms 4-6  n=510  W=25 T=463 L=22  blend-0.1: ndcg@10=0.5595 p@10=0.0739  or: ndcg@10=0.5620 p@10=0.0745
terms 7+  n=39  W=1 T=36 L=2  blend-0.1: ndcg@10=0.6402 p@10=0.0744  or: ndcg@10=0.6342 p@10=0.0718
```

en-1000000.blendidf-0.1-vs-or:
```
blendidf-0.1 vs or: W=45 T=932 L=23
terms 1-3  n=451  W=13 T=428 L=10  blendidf-0.1: ndcg@10=0.5303 p@10=0.0692  or: ndcg@10=0.5286 p@10=0.0687
terms 4-6  n=510  W=30 T=468 L=12  blendidf-0.1: ndcg@10=0.5666 p@10=0.0751  or: ndcg@10=0.5620 p@10=0.0745
terms 7+  n=39  W=2 T=36 L=1  blendidf-0.1: ndcg@10=0.6479 p@10=0.0769  or: ndcg@10=0.6342 p@10=0.0718
```

en-1000000.hybrid-fts-k10-vs-or:
```
hybrid-fts-k10 vs or: W=75 T=736 L=189
terms 1-3  n=451  W=22 T=348 L=81  hybrid-fts-k10: ndcg@10=0.4751 p@10=0.0619  or: ndcg@10=0.5286 p@10=0.0687
terms 4-6  n=510  W=48 T=358 L=104  hybrid-fts-k10: ndcg@10=0.5086 p@10=0.0673  or: ndcg@10=0.5620 p@10=0.0745
terms 7+  n=39  W=5 T=30 L=4  hybrid-fts-k10: ndcg@10=0.6512 p@10=0.0744  or: ndcg@10=0.6342 p@10=0.0718
```

en-1000000.hybrid-fts-vs-or:
```
hybrid-fts vs or: W=73 T=734 L=193
terms 1-3  n=451  W=22 T=348 L=81  hybrid-fts: ndcg@10=0.4751 p@10=0.0619  or: ndcg@10=0.5286 p@10=0.0687
terms 4-6  n=510  W=47 T=355 L=108  hybrid-fts: ndcg@10=0.5027 p@10=0.0663  or: ndcg@10=0.5620 p@10=0.0745
terms 7+  n=39  W=4 T=31 L=4  hybrid-fts: ndcg@10=0.6444 p@10=0.0718  or: ndcg@10=0.6342 p@10=0.0718
```

en-1000000.hybrid-k10-vs-or:
```
hybrid-k10 vs or: W=125 T=653 L=222
terms 1-3  n=451  W=49 T=304 L=98  hybrid-k10: ndcg@10=0.4572 p@10=0.0590  or: ndcg@10=0.5286 p@10=0.0687
terms 4-6  n=510  W=71 T=321 L=118  hybrid-k10: ndcg@10=0.4987 p@10=0.0663  or: ndcg@10=0.5620 p@10=0.0745
terms 7+  n=39  W=5 T=28 L=6  hybrid-k10: ndcg@10=0.6159 p@10=0.0718  or: ndcg@10=0.6342 p@10=0.0718
```

en-1000000.hybrid-nofloor-k10-vs-or:
```
hybrid-nofloor-k10 vs or: W=125 T=676 L=199
terms 1-3  n=451  W=48 T=321 L=82  hybrid-nofloor-k10: ndcg@10=0.4747 p@10=0.0603  or: ndcg@10=0.5286 p@10=0.0687
terms 4-6  n=510  W=72 T=327 L=111  hybrid-nofloor-k10: ndcg@10=0.5025 p@10=0.0665  or: ndcg@10=0.5620 p@10=0.0745
terms 7+  n=39  W=5 T=28 L=6  hybrid-nofloor-k10: ndcg@10=0.6159 p@10=0.0718  or: ndcg@10=0.6342 p@10=0.0718
```

en-1000000.hybrid-substr-k10-vs-or:
```
hybrid-substr-k10 vs or: W=107 T=714 L=179
terms 1-3  n=451  W=38 T=342 L=71  hybrid-substr-k10: ndcg@10=0.4932 p@10=0.0623  or: ndcg@10=0.5286 p@10=0.0687
terms 4-6  n=510  W=65 T=343 L=102  hybrid-substr-k10: ndcg@10=0.5176 p@10=0.0680  or: ndcg@10=0.5620 p@10=0.0745
terms 7+  n=39  W=4 T=29 L=6  hybrid-substr-k10: ndcg@10=0.6420 p@10=0.0718  or: ndcg@10=0.6342 p@10=0.0718
```

en-1000000.hybrid-vs-or:
```
hybrid vs or: W=116 T=652 L=232
terms 1-3  n=451  W=45 T=305 L=101  hybrid: ndcg@10=0.4534 p@10=0.0576  or: ndcg@10=0.5286 p@10=0.0687
terms 4-6  n=510  W=67 T=318 L=125  hybrid: ndcg@10=0.4830 p@10=0.0627  or: ndcg@10=0.5620 p@10=0.0745
terms 7+  n=39  W=4 T=29 L=6  hybrid: ndcg@10=0.6035 p@10=0.0667  or: ndcg@10=0.6342 p@10=0.0718
```

en-1000000.or-vs-and:
```
or vs and: W=518 T=465 L=17
terms 1-3  n=451  W=191 T=252 L=8  or: ndcg@10=0.5286 p@10=0.0687  and: ndcg@10=0.2319 p@10=0.0259
terms 4-6  n=510  W=302 T=199 L=9  or: ndcg@10=0.5620 p@10=0.0745  and: ndcg@10=0.1241 p@10=0.0131
terms 7+  n=39  W=25 T=14 L=0  or: ndcg@10=0.6342 p@10=0.0718  and: ndcg@10=0.0769 p@10=0.0077
```

### Facts (no recommendation)

English, ΔnDCG@10 / ΔP@10 vs `or`; p95 100 000 → 1 000 000
| lane | 10000 | 100000 | 1000000 | p95 100 000 → 1 000 000 |
|---|---:|---:|---:|---:|
| and | -0.7044 / -0.0810 | -0.5864 / -0.0720 | -0.3788 / -0.0531 | 0.62 → 5.39 ms (8.7×) |
| or | reference | reference | reference | 9.99 → 123.10 ms (12.3×) |
| hybrid | -0.1050 / -0.0101 | -0.1061 / -0.0116 | -0.0753 / -0.0112 | 15.68 → 126.25 ms (8.1×) |
| hybrid-fts | -0.0571 / -0.0048 | -0.0742 / -0.0079 | -0.0539 / -0.0073 | 68.58 → 163.67 ms (2.4×) |
| hybrid-k10 | -0.1012 / -0.0090 | -0.0962 / -0.0094 | -0.0652 / -0.0086 | 10.36 → 117.24 ms (11.3×) |
| hybrid-nofloor-k10 | -0.0985 / -0.0090 | -0.0914 / -0.0093 | -0.0553 / -0.0079 | 9.85 → 128.87 ms (13.1×) |
| hybrid-fts-k10 | -0.0559 / -0.0046 | -0.0709 / -0.0072 | -0.0506 / -0.0067 | 14.46 → 119.85 ms (8.3×) |
| hybrid-substr-k10 | -0.0758 / -0.0062 | -0.0744 / -0.0066 | -0.0383 / -0.0062 | 9.24 → 110.68 ms (12.0×) |
| blend-0.1 | -0.0016 / -0.0001 | -0.0027 / -0.0007 | -0.0006 / +0.0001 | 67.80 → 157.46 ms (2.3×) |
| blendidf-0.1 | +0.0012 / +0.0001 | +0.0010 / -0.0003 | +0.0037 / +0.0007 | 67.07 → 156.43 ms (2.3×) |

German (`STOPWORDS_DE`), ΔnDCG@10 / ΔP@10 vs `or`; p95 100 000 → 1 000 000
| lane | 10000 | 100000 | 1000000 | p95 100 000 → 1 000 000 |
|---|---:|---:|---:|---:|
| and | -0.4169 / -0.0512 | -0.3165 / -0.0410 | -0.1985 / -0.0278 | 0.20 → 1.44 ms (7.2×) |
| or | reference | reference | reference | 2.24 → 24.72 ms (11.0×) |
| or-stem | +0.0310 / +0.0054 | -0.0100 / +0.0025 | -0.0296 / -0.0029 | 4.28 → 37.21 ms (8.7×) |
| or-trigram | +0.0255 / +0.0030 | +0.0121 / +0.0017 | +0.0007 / -0.0004 | 21.30 → 188.39 ms (8.8×) |
| hybrid | +0.0014 / +0.0003 | +0.0006 / +0.0010 | +0.0011 / -0.0006 | 2.16 → 24.55 ms (11.4×) |
| hybrid-expanded | +0.0397 / +0.0060 | +0.0140 / +0.0036 | -0.0042 / -0.0009 | 4.21 → 37.14 ms (8.8×) |
| hybrid-trigram | +0.0141 / +0.0025 | +0.0009 / +0.0004 | -0.0072 / -0.0013 | 21.35 → 189.36 ms (8.9×) |

Index size 100 000 → 1 000 000: English porter-unicode61 59.08 → 590.23 MB (10.0×), German unicode61 67.47 → 663.22 MB (9.8×), trigram 188.87 → 1942.40 MB (10.3×); trigram/unicode61 at 1 000 000: 2.93×.

ΔnDCG@10 vs `or-trigram` (German): hybrid-expanded +0.0142, +0.0019, -0.0049; hybrid-trigram -0.0114, -0.0112, -0.0079 (10 000, 100 000, 1 000 000).

## T22 – E5 with a latency floor (re-assessment, no new measurement)

Change of E5 (`docs/ZIEL.md`, on behalf of the owner): the latency part was
"p95 at most 3× the p95 of `or`". It now is: p95 at most 3× **or** at most
10 ms more than `or`, whichever is larger, both measured in the same run.
Reason: on small corpora the ratio alone let sub-millisecond differences
decide (GovService: `or` p95 0.24 ms, so the old limit was 0.72 ms), which
are neither noticeable nor stable between runs. Also made explicit: a
dataset measured at several sizes counts once per size. The change only
makes E5 more lenient. Nothing was measured again; the table uses the T21
files (`STOPWORDS_DE`).

German, every extension against `or` (budget = max(3 × p95 of `or`, p95 of
`or` + 10 ms)). "2 runs": the stemmer lanes were measured again after the
T21 review fix, so their p95 and that of `or` come from two runs; the
margins to the budget are large (at most 37.21 ms against 74.16 ms).

| lane | dataset | ΔnDCG@10 | ΔP@10 | p95 lane / `or` ms | budget ms | nDCG | P@10 | p95 | E5 (excl. lines) |
|---|---|---:|---:|---:|---:|---|---|---|---|
| `or-stem` | GermanDPR | +0.0088 | −0.0008 | 1.94 / 0.83 (2 runs) | 10.83 | no | no | yes | tuned (does not count) |
| `or-stem` | GovService | −0.0111 | +0.0014 | 1.51 / 0.24 (2 runs) | 10.24 | no | yes | yes | not met |
| `or-stem` | mMARCO-de 10 000 | +0.0310 | +0.0054 | 0.97 / 0.46 (2 runs) | 10.46 | yes | yes | yes | met |
| `or-stem` | mMARCO-de 100 000 | −0.0100 | +0.0025 | 4.28 / 2.24 (2 runs) | 12.24 | no | yes | yes | not met |
| `or-stem` | mMARCO-de 1 000 000 | −0.0296 | −0.0029 | 37.21 / 24.72 (2 runs) | 74.16 | no | no | yes | not met |
| `or-trigram` | GermanDPR | +0.0543 | +0.0041 | 4.21 / 0.83 | 10.83 | yes | yes | yes | met |
| `or-trigram` | GovService | +0.0349 | +0.0025 | 0.50 / 0.24 | 10.24 | yes | yes | yes | met |
| `or-trigram` | mMARCO-de 10 000 | +0.0255 | +0.0030 | 3.04 / 0.46 | 10.46 | yes | yes | yes | met |
| `or-trigram` | mMARCO-de 100 000 | +0.0121 | +0.0017 | 21.30 / 2.24 | 12.24 | yes | yes | no | not met |
| `or-trigram` | mMARCO-de 1 000 000 | +0.0007 | −0.0004 | 188.39 / 24.72 | 74.16 | no | no | no | not met |
| `hybrid` | GermanDPR | +0.0385 | +0.0019 | 0.80 / 0.83 | 10.83 | yes | yes | yes | met |
| `hybrid` | GovService | +0.0140 | +0.0005 | 0.37 / 0.24 | 10.24 | yes | yes | yes | met |
| `hybrid` | mMARCO-de 10 000 | +0.0014 | +0.0003 | 0.43 / 0.46 | 10.46 | no | yes | yes | not met |
| `hybrid` | mMARCO-de 100 000 | +0.0006 | +0.0010 | 2.16 / 2.24 | 12.24 | no | yes | yes | not met |
| `hybrid` | mMARCO-de 1 000 000 | +0.0011 | −0.0006 | 24.55 / 24.72 | 74.16 | no | no | yes | not met |
| `hybrid-expanded` | GermanDPR | +0.0506 | +0.0007 | 1.24 / 0.83 (2 runs) | 10.83 | yes | yes | yes | met |
| `hybrid-expanded` | GovService | +0.0121 | +0.0008 | 0.77 / 0.24 (2 runs) | 10.24 | yes | yes | yes | met |
| `hybrid-expanded` | mMARCO-de 10 000 | +0.0397 | +0.0060 | 0.93 / 0.46 (2 runs) | 10.46 | yes | yes | yes | met |
| `hybrid-expanded` | mMARCO-de 100 000 | +0.0140 | +0.0036 | 4.21 / 2.24 (2 runs) | 12.24 | yes | yes | yes | met |
| `hybrid-expanded` | mMARCO-de 1 000 000 | −0.0042 | −0.0009 | 37.14 / 24.72 (2 runs) | 74.16 | no | no | yes | not met |
| `hybrid-trigram` | GermanDPR | +0.0485 | +0.0011 | 4.20 / 0.83 | 10.83 | yes | yes | yes | met |
| `hybrid-trigram` | GovService | +0.0365 | +0.0030 | 0.68 / 0.24 | 10.24 | yes | yes | yes | met |
| `hybrid-trigram` | mMARCO-de 10 000 | +0.0141 | +0.0025 | 2.96 / 0.46 | 10.46 | yes | yes | yes | met |
| `hybrid-trigram` | mMARCO-de 100 000 | +0.0009 | +0.0004 | 21.35 / 2.24 | 12.24 | no | yes | no | not met |
| `hybrid-trigram` | mMARCO-de 1 000 000 | −0.0072 | −0.0013 | 189.36 / 24.72 | 74.16 | no | no | no | not met |

Per lane, untuned datasets met: `or-stem` 1 of 4, `or-trigram` 3 of 5, `hybrid` 2 of 5, `hybrid-expanded` 4 of 5, `hybrid-trigram` 3 of 5.

### Facts (no recommendation)

- German: no extension meets E5 on every untuned dataset. At 1 000 000
  mMARCO-de passages every extension misses the nDCG@10 part (`or-trigram`
  +0.0007, `hybrid` +0.0011, `hybrid-expanded` −0.0042, `hybrid-trigram`
  −0.0072, `or-stem` −0.0296). `or-trigram` also exceeds the latency budget
  from 100 000 passages on (21.30 ms against a budget of 12.24 ms; 188.39 ms
  against 74.16 ms at 1 000 000).
- With the floor, `or-trigram` and `hybrid-trigram` meet the latency part on
  GermanDPR (4.21 and 4.20 ms against 10.83 ms); under the old rule they
  exceeded 3× there (5.07× and 5.06×, T21).
- `hybrid-expanded` meets the measurable parts on GermanDPR, GovService,
  mMARCO-de 10 000 and 100 000 and misses at 1 000 000; it needs
  german-fts5-stemmer as an extra package.
- English (T12–T19): every extension misses the nDCG@10 part on at least
  one untuned dataset (largest gain at 1 000 000 passages: `blendidf-0.1`
  +0.0037, T19), so the floor changes no English result.
- German with the former 94-word list (T16–T18): `or-trigram`, `hybrid` and
  `hybrid-trigram` met the three measurable parts on both small datasets
  under the old rule; the floor keeps that.

## T23 – E5 per size class (re-assessment, no new measurement)

Change of E5 (`docs/ZIEL.md`, on behalf of the owner): the recommendation is
made per size class — small below 50 000 documents, medium 50 000 to
500 000, large above. An extension is recommended for a class if it meets
E5 (with the latency floor of T22) on every untuned test set of that class.
The class limits were set after the measurements, so every class
recommendation is provisional until a further independent test set of that
class confirms it. Nothing was measured again.

Test sets per class (untuned only): German small = GermanDPR (2 876),
GovService (105), mMARCO-de 10 000; German medium = mMARCO-de 100 000;
German large = mMARCO-de 1 000 000. English small = mMARCO 10 000 (SciFact
and NFCorpus were tuning sets); English medium = FiQA (57 638), TREC-COVID
(171 332), mMARCO 100 000; English large = mMARCO 1 000 000.

### German (`STOPWORDS_DE`, verdicts from T22)

| lane | small | medium | large | library code |
|---|---|---|---|---|
| `or-trigram` | met on 3 of 3 (+0.0543, +0.0349, +0.0255) | not met (p95 21.30 ms, budget 12.24 ms) | not met (+0.0007) | none: tokenizer option |
| `hybrid-expanded` | met on 3 of 3 (+0.0506, +0.0121, +0.0397) | met (+0.0140) | not met (−0.0042) | needs german-fts5-stemmer (a new runtime dependency) |
| `hybrid-trigram` | met on 3 of 3 (+0.0485, +0.0365, +0.0141) | not met (+0.0009) | not met (−0.0072) | substring re-rank, not in the library |
| `hybrid` | not met (mMARCO-de 10 000: +0.0014) | not met (+0.0006) | not met (+0.0011) | substring re-rank, not in the library |
| `or-stem` | not met (GovService −0.0111; GermanDPR tuned) | not met (−0.0100) | not met (−0.0296) | needs german-fts5-stemmer |

- Small: three lanes meet the measurable parts. `or-trigram` needs no
  library code. `hybrid-trigram` adds a re-rank and is not better than
  `or-trigram` (−0.0058, +0.0016, −0.0114 nDCG@10 on GermanDPR, GovService,
  mMARCO-de 10 000). `hybrid-expanded` needs a new runtime dependency, which
  `docs/ZIEL.md` excludes; against `or-trigram` it gives −0.0037, −0.0228,
  +0.0142.
- Medium: only `hybrid-expanded` meets the measurable parts, on one test set,
  and it needs the excluded dependency.
- Large: no lane.

### English (best measured extension per untuned test set, ΔnDCG@10 vs `or`)

| class | test set | best extension | ΔnDCG@10 | source |
|---|---|---|---:|---|
| small | mMARCO 10 000 | `blendidf-0.1` | +0.0012 | T19 |
| medium | FiQA | `blendidf-0.1` | +0.0013 | T14 |
| medium | TREC-COVID | `blend-0.1` | −0.0023 | T14 |
| medium | mMARCO 100 000 | `blendidf-0.1` | +0.0010 | T19 |
| large | mMARCO 1 000 000 | `blendidf-0.1` | +0.0037 | T19 |

No English extension reaches +0.01 in any class.

### Facts (provisional class recommendation)

- English, every class: OR on `porter unicode61`.
- German small (below 50 000 documents): OR on a
  `trigram remove_diacritics 1` index with `STOPWORDS_DE`; German medium and
  large: OR on `unicode61` with `STOPWORDS_DE`.
- A German corpus that grows past 50 000 documents needs a new index
  (trigram → `unicode61`); the trigram index is 2.93× the size of the
  `unicode61` index at 1 000 000 passages (T21).

## T24 – Adaptive lanes (expansion for sparse queries)

Question: does an extension help in every size class if it is applied only
to queries whose plain OR match is sparse? A query is sparse if the OR match
on the `unicode61` index hits at most τ documents (counted with `LIMIT τ+1`).
`adaptive-trigram-τ` then takes `or-trigram`, `adaptive-stem-τ` takes
`hybrid-expanded` (german-fts5-stemmer variants + coverage re-rank); every
other query takes plain `or`. All lanes use `--stopwords lib`.

Code: commit `d5d2179f2ff53287c5d687d643e0d3b07a813f70` (bench lanes only, no
library change). Stemmer: `17e64135d75c6948baa113479e80548cc93ba74c`. Same
machine as T19–T21; during the runs CI test suites and a model download of
other sessions ran, and the four test sets ran in parallel, each pinned to
its own core. Latencies are compared only within one run.

### Tuning (τ chosen before the test)

Tuning sets: GermanDPR (the German selection set since T16) and a separate
mMARCO-de split with the questions 1 001 to 2 000 in qrels order, at 10 000,
100 000 and 1 000 000 passages (own subsets, `subsample-beir --queries 2000`:
`docs=10000|100000|1000000 queries=2000 qrels=2100 rel_docs=2100
missing_rel=0`; 1 000 questions kept per size). Grid τ = 10, 30, 100, 300,
1 000, 3 000, 10 000; chosen per family: the highest mean ΔnDCG@10 against
`or` over the four sets, equal weights (`--repeat 1`).

| lane | germandpr | de-10000 | de-100000 | de-1000000 | mean Δ |
|---|---:|---:|---:|---:|---:|
| adaptive-trigram-10 | +0.0005 | +0.0030 | +0.0012 | -0.0005 | +0.0010 |
| adaptive-trigram-30 | +0.0031 | +0.0030 | +0.0006 | -0.0009 | +0.0014 |
| adaptive-trigram-100 | +0.0131 | +0.0128 | -0.0010 | -0.0004 | +0.0061 |
| adaptive-trigram-300 | +0.0433 | +0.0241 | -0.0039 | -0.0009 | +0.0157 |
| adaptive-trigram-1000 | +0.0543 | +0.0360 | +0.0013 | -0.0014 | +0.0226 |
| adaptive-trigram-3000 | +0.0543 | +0.0357 | +0.0066 | -0.0023 | +0.0236 |
| adaptive-trigram-10000 | +0.0543 | +0.0357 | +0.0140 | +0.0032 | +0.0268 |
| adaptive-stem-10 | -0.0016 | +0.0197 | +0.0097 | +0.0069 | +0.0087 |
| adaptive-stem-30 | +0.0018 | +0.0190 | +0.0108 | +0.0069 | +0.0096 |
| adaptive-stem-100 | +0.0186 | +0.0268 | +0.0118 | +0.0079 | +0.0163 |
| adaptive-stem-300 | +0.0463 | +0.0247 | +0.0080 | +0.0080 | +0.0218 |
| adaptive-stem-1000 | +0.0506 | +0.0259 | +0.0111 | +0.0100 | +0.0244 |
| adaptive-stem-3000 | +0.0506 | +0.0249 | +0.0040 | +0.0063 | +0.0215 |
| adaptive-stem-10000 | +0.0506 | +0.0249 | +0.0049 | +0.0093 | +0.0224 |
| or-trigram (always) | +0.0543 | +0.0357 | +0.0132 | +0.0109 | +0.0285 |
| hybrid-expanded (always) | +0.0506 | +0.0249 | +0.0045 | +0.0056 | +0.0214 |
selected: adaptive-trigram tau=10000 (mean Δ 0.0268); adaptive-stem tau=1000 (mean Δ 0.0244)

### Test (questions 1 to 1 000, the T19/T21 subsets; GovService; all lanes in one run per set)

Commands (`--repeat 3` for GovService and GermanDPR, 2 for mMARCO-de):

```
node scripts/beir-bench.mjs --data <set> --lang de --stemmer "$STEMMER" --stopwords lib --adaptive-tau 10000,1000 --lanes and,or,or-stem,or-trigram,hybrid,hybrid-expanded,hybrid-trigram,adaptive-trigram-10000,adaptive-stem-1000 --db-dir <dir> --repeat <n> --per-query <file> --json
```

govservice:

```
lane                    ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
and                     0.1005   0.0994  0.1036      0.0104  0.02   0.03
or                      0.7280   0.6785  0.9020      0.0880  0.08   0.25
or-stem                 0.7169   0.6594  0.9160      0.0894  0.21   2.07
or-trigram              0.7629   0.7162  0.9356      0.0905  0.24   0.51
hybrid                  0.7420   0.6953  0.9020      0.0885  0.12   0.37
hybrid-expanded         0.7401   0.6917  0.9160      0.0888  0.24   0.93
hybrid-trigram          0.7645   0.7171  0.9328      0.0910  0.31   0.67
adaptive-trigram-10000  0.7629   0.7162  0.9356      0.0905  0.25   0.53
adaptive-stem-1000      0.7401   0.6917  0.9160      0.0888  0.24   0.70
```

germandpr:

```
lane                    ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
and                     0.0356   0.0326  0.0449      0.0045  0.04   0.09
or                      0.4807   0.3765  0.9473      0.0819  0.63   0.90
or-stem                 0.4895   0.3898  0.9649      0.0811  0.81   1.82
or-trigram              0.5350   0.4337  0.9590      0.0860  2.48   4.46
hybrid                  0.5192   0.4199  0.9307      0.0838  0.56   0.85
hybrid-expanded         0.5313   0.4390  0.9493      0.0826  0.79   1.30
hybrid-trigram          0.5292   0.4343  0.9541      0.0830  2.41   4.39
adaptive-trigram-10000  0.5350   0.4337  0.9590      0.0860  2.54   4.54
adaptive-stem-1000      0.5313   0.4390  0.9493      0.0826  0.82   1.35
```

de-10000:

```
lane                    ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
and                     0.1853   0.1870  0.1888      0.0195  0.03   0.06
or                      0.6022   0.5833  0.7255      0.0707  0.24   0.47
or-stem                 0.6332   0.6082  0.7992      0.0761  0.36   0.95
or-trigram              0.6277   0.6074  0.7675      0.0737  1.32   3.06
hybrid                  0.6036   0.5843  0.7107      0.0710  0.21   0.42
hybrid-expanded         0.6419   0.6185  0.7827      0.0767  0.30   0.69
hybrid-trigram          0.6163   0.5943  0.7505      0.0732  1.26   2.96
adaptive-trigram-10000  0.6277   0.6074  0.7675      0.0737  1.35   3.10
adaptive-stem-1000      0.6419   0.6185  0.7827      0.0767  0.33   0.74
```

de-100000:

```
lane                    ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
and                     0.1783   0.1793  0.1888      0.0190  0.06   0.20
or                      0.4948   0.4748  0.6730      0.0600  0.75   2.26
or-stem                 0.4848   0.4548  0.7340      0.0625  1.11   4.40
or-trigram              0.5069   0.4855  0.6983      0.0617  8.11   21.57
hybrid                  0.4954   0.4739  0.6505      0.0610  0.64   2.18
hybrid-expanded         0.5088   0.4842  0.7056      0.0636  0.97   3.23
hybrid-trigram          0.4957   0.4759  0.6683      0.0604  7.95   21.36
adaptive-trigram-10000  0.5069   0.4855  0.6983      0.0617  8.21   21.69
adaptive-stem-1000      0.5128   0.4890  0.7028      0.0633  0.98   2.53
```

de-1000000:

```
lane                    ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
and                     0.1508   0.1468  0.1838      0.0176  0.21   1.44
or                      0.3493   0.3258  0.5719      0.0454  6.45   24.67
or-stem                 0.3197   0.2960  0.6072      0.0425  9.08   37.29
or-trigram              0.3500   0.3283  0.5854      0.0450  67.72  190.72
hybrid                  0.3504   0.3305  0.5403      0.0448  6.19   24.39
hybrid-expanded         0.3451   0.3238  0.5503      0.0445  8.86   36.13
hybrid-trigram          0.3421   0.3213  0.5542      0.0441  67.73  190.06
adaptive-trigram-10000  0.3430   0.3205  0.5694      0.0441  19.95  113.05
adaptive-stem-1000      0.3618   0.3379  0.5889      0.0468  6.86   24.36
```

### E5 per size class (T22 latency floor, T23 classes), every lane against `or` of the same run

| lane | test set | class | ΔnDCG@10 | ΔP@10 | p95 lane / `or` ms | budget ms | E5 (excl. lines) |
|---|---|---|---:|---:|---:|---:|---|
| `or-stem` | GovService | small | −0.0111 | +0.0014 | 2.07 / 0.25 | 10.25 | not met |
| `or-stem` | mMARCO-de 10 000 | small | +0.0310 | +0.0054 | 0.95 / 0.47 | 10.47 | met |
| `or-stem` | mMARCO-de 100 000 | medium | −0.0100 | +0.0025 | 4.40 / 2.26 | 12.26 | not met |
| `or-stem` | mMARCO-de 1 000 000 | large | −0.0296 | −0.0029 | 37.29 / 24.67 | 74.01 | not met |
| `or-stem` | GermanDPR | small | +0.0088 | −0.0008 | 1.82 / 0.90 | 10.90 | tuned |
| `or-trigram` | GovService | small | +0.0349 | +0.0025 | 0.51 / 0.25 | 10.25 | met |
| `or-trigram` | mMARCO-de 10 000 | small | +0.0255 | +0.0030 | 3.06 / 0.47 | 10.47 | met |
| `or-trigram` | mMARCO-de 100 000 | medium | +0.0121 | +0.0017 | 21.57 / 2.26 | 12.26 | not met |
| `or-trigram` | mMARCO-de 1 000 000 | large | +0.0007 | −0.0004 | 190.72 / 24.67 | 74.01 | not met |
| `or-trigram` | GermanDPR | small | +0.0543 | +0.0041 | 4.46 / 0.90 | 10.90 | met |
| `hybrid` | GovService | small | +0.0140 | +0.0005 | 0.37 / 0.25 | 10.25 | met |
| `hybrid` | mMARCO-de 10 000 | small | +0.0014 | +0.0003 | 0.42 / 0.47 | 10.47 | not met |
| `hybrid` | mMARCO-de 100 000 | medium | +0.0006 | +0.0010 | 2.18 / 2.26 | 12.26 | not met |
| `hybrid` | mMARCO-de 1 000 000 | large | +0.0011 | −0.0006 | 24.39 / 24.67 | 74.01 | not met |
| `hybrid` | GermanDPR | small | +0.0385 | +0.0019 | 0.85 / 0.90 | 10.90 | met |
| `hybrid-expanded` | GovService | small | +0.0121 | +0.0008 | 0.93 / 0.25 | 10.25 | met |
| `hybrid-expanded` | mMARCO-de 10 000 | small | +0.0397 | +0.0060 | 0.69 / 0.47 | 10.47 | met |
| `hybrid-expanded` | mMARCO-de 100 000 | medium | +0.0140 | +0.0036 | 3.23 / 2.26 | 12.26 | met |
| `hybrid-expanded` | mMARCO-de 1 000 000 | large | −0.0042 | −0.0009 | 36.13 / 24.67 | 74.01 | not met |
| `hybrid-expanded` | GermanDPR | small | +0.0506 | +0.0007 | 1.30 / 0.90 | 10.90 | met |
| `hybrid-trigram` | GovService | small | +0.0365 | +0.0030 | 0.67 / 0.25 | 10.25 | met |
| `hybrid-trigram` | mMARCO-de 10 000 | small | +0.0141 | +0.0025 | 2.96 / 0.47 | 10.47 | met |
| `hybrid-trigram` | mMARCO-de 100 000 | medium | +0.0009 | +0.0004 | 21.36 / 2.26 | 12.26 | not met |
| `hybrid-trigram` | mMARCO-de 1 000 000 | large | −0.0072 | −0.0013 | 190.06 / 24.67 | 74.01 | not met |
| `hybrid-trigram` | GermanDPR | small | +0.0485 | +0.0011 | 4.39 / 0.90 | 10.90 | met |
| `adaptive-trigram-10000` | GovService | small | +0.0349 | +0.0025 | 0.53 / 0.25 | 10.25 | met |
| `adaptive-trigram-10000` | mMARCO-de 10 000 | small | +0.0255 | +0.0030 | 3.10 / 0.47 | 10.47 | met |
| `adaptive-trigram-10000` | mMARCO-de 100 000 | medium | +0.0121 | +0.0017 | 21.69 / 2.26 | 12.26 | not met |
| `adaptive-trigram-10000` | mMARCO-de 1 000 000 | large | −0.0063 | −0.0013 | 113.05 / 24.67 | 74.01 | not met |
| `adaptive-trigram-10000` | GermanDPR | small | +0.0543 | +0.0041 | 4.54 / 0.90 | 10.90 | tuned |
| `adaptive-stem-1000` | GovService | small | +0.0121 | +0.0008 | 0.70 / 0.25 | 10.25 | met |
| `adaptive-stem-1000` | mMARCO-de 10 000 | small | +0.0397 | +0.0060 | 0.74 / 0.47 | 10.47 | met |
| `adaptive-stem-1000` | mMARCO-de 100 000 | medium | +0.0180 | +0.0033 | 2.53 / 2.26 | 12.26 | met |
| `adaptive-stem-1000` | mMARCO-de 1 000 000 | large | +0.0125 | +0.0014 | 24.36 / 24.67 | 74.01 | met |
| `adaptive-stem-1000` | GermanDPR | small | +0.0506 | +0.0007 | 1.35 / 0.90 | 10.90 | tuned |

### Confidence intervals (paired bootstrap, 4 000 resamples, 95 %)

Mean ΔnDCG@10 per question pair and its 95 % interval; "changed" = questions
whose nDCG@10 differs between the two lanes.

```
or-trigram − or, 10k, test split: n=1000 mean +0.0255, 95 % CI [+0.0084, +0.0428], changed queries 237
or-trigram − or, 100k, test split: n=1000 mean +0.0121, 95 % CI [-0.0054, +0.0299], changed queries 252
or-trigram − or, 100k, tuning split: n=1000 mean +0.0131, 95 % CI [-0.0025, +0.0297], changed queries 261
or-trigram − or, 1M, test split: n=1000 mean +0.0007, 95 % CI [-0.0156, +0.0168], changed queries 252
or-trigram − or, 1M, tuning split: n=1000 mean +0.0110, 95 % CI [-0.0041, +0.0261], changed queries 255
hybrid-expanded − or, 1M, test split: n=1000 mean -0.0042, 95 % CI [-0.0215, +0.0129], changed queries 230
hybrid-expanded − or, 1M, tuning split: n=1000 mean +0.0056, 95 % CI [-0.0107, +0.0217], changed queries 234
adaptive-stem-1000 − or, 1M, tuning split: n=1000 mean +0.0101, 95 % CI [+0.0036, +0.0173], changed queries 17
adaptive-stem-1000 − or, govservice (test): n=357 mean +0.0121, 95 % CI [-0.0097, +0.0341], changed queries 103
adaptive-stem-1000 − or, de-10000 (test): n=1000 mean +0.0397, 95 % CI [+0.0206, +0.0581], changed queries 249
adaptive-stem-1000 − or, de-100000 (test): n=1000 mean +0.0180, 95 % CI [+0.0039, +0.0320], changed queries 131
adaptive-stem-1000 − or, de-1000000 (test): n=1000 mean +0.0124, 95 % CI [+0.0036, +0.0215], changed queries 39
adaptive-stem-1000 − hybrid-expanded, de-100000 (test): n=1000 mean +0.0040, 95 % CI [-0.0093, +0.0169], changed queries 134
adaptive-trigram-10000 − or, de-100000 (test): n=1000 mean +0.0121, 95 % CI [-0.0054, +0.0299], changed queries 252
adaptive-stem-1000 − hybrid-expanded, de-1000000 (test): n=1000 mean +0.0166, 95 % CI [+0.0018, +0.0320], changed queries 191
adaptive-trigram-10000 − or, de-1000000 (test): n=1000 mean -0.0063, 95 % CI [-0.0175, +0.0049], changed queries 138
```

### Facts (no recommendation)

- `adaptive-stem-1000` meets the measurable parts of E5 on every untuned
  test set of every size class: GovService +0.0121, mMARCO-de 10 000
  +0.0397, 100 000 +0.0180, 1 000 000 +0.0125 nDCG@10, P@10 never worse,
  p95 at most 0.70 ms against 0.25 ms (GovService) and 24.36 against 24.67 ms
  (1 000 000). The 95 % intervals against `or` exclude zero at 10 000
  [+0.0206, +0.0581], 100 000 [+0.0039, +0.0320] and 1 000 000 [+0.0036,
  +0.0215]; on GovService (357 questions) they do not [−0.0097, +0.0341].
- At 1 000 000 it changes 39 of 1 000 questions and beats always expanding
  (`hybrid-expanded`) by +0.0166 [+0.0018, +0.0320].
- It needs german-fts5-stemmer, a runtime dependency that `docs/ZIEL.md`
  excludes; the adaptive switch itself is a count query and one condition.
- `adaptive-trigram-10000` equals `or-trigram` up to 100 000 passages and is
  below `or` at 1 000 000 (−0.0063, p95 113.05 ms).
- Resolution: with 1 000 questions and about one judged passage each, the
  95 % interval of a difference against `or` is about ±0.016 nDCG@10 wide at
  100 000 and 1 000 000 passages (`or-trigram`: +0.0007 [−0.0156, +0.0168]
  on the test split and +0.0110 [−0.0041, +0.0261] on the tuning split at
  1 000 000). Differences around the E5 threshold of +0.01 are within that.


## T25 – adaptiveSearch (library) and confirmation on untuned data

Question: T24 found that expanding only sparse queries (`adaptive-stem-1000`)
meets the measurable parts of E5 in every size class on mMARCO-de and
GovService. Does a library version reproduce it exactly, and does the gain
hold on data where nothing was tuned?

Code: commit `c398b8723ba789b310b5868544f1da564aadf581`. `adaptiveSearch(search,
countUpTo, query, getText, { k, tau, expand, stopwords })` in
`lib/or-search.mjs` runs plain OR unless the OR match hits at most τ documents;
then it searches the caller-provided expansion groups and re-ranks by group
coverage (pool 5k). The library has no stemmer dependency; the bench lane
`adaptive-search-<τ>` passes german-fts5-stemmer variants (library code
unchanged since `366ed51`). `test/adaptive-search.test.mjs` covers the
boundary τ=5/4, the k=1 pool, the query text handed to `expand` and a guard
against empty or upper-case variants. The guard was added after the review of
this section (commit after `277011b`); the stemmer never produced such variants
on the test questions (0 of 86 311 groups over 6 382 questions of five sets), so
it does not change any number here.

### Parity with the T24 lane

`--adaptive-tau 1000 --lanes adaptive-search-1000 --repeat 1 --per-query` on the
T24 test sets: per-query nDCG@10 is identical to T24 `adaptive-stem-1000` for
all 4 382 questions (mMARCO-de 10 000 / 100 000 / 1 000 000: 1 000 each,
GermanDPR 1 025, GovService 357; 0 differences, also for P@10). Parity holds for
`--stopwords lib`: the library always drops stopwords before calling `expand`,
the T24 lane does so only with that option.

### Confirmation (τ = 1 000 fixed, nothing tuned on these sets)

- WebFAQ-de: `PaDaS-Lab/webfaq-retrieval`, subset `deu`, CC BY 4.0, revision
  `1abff20b9ea37abeec151bd8bcfa78c31a48f9fb`; sha256 of the downloaded source files
  (`corpus.jsonl` `f3d0fcaacd581785f179d202f1e720e2634e7762926ce2ce19d0539bb4a168e2`,
  `queries-test.jsonl` `f468afadb196f84370ab8816665f4843e0ea33efbfe4dbb09aaee1f035741110`,
  `qrels-test.jsonl` `165c005594afeaab8b034a3f89707c4767e02b6580013bd46b985f21ef205eb4`), converted to BEIR layout.
  Full corpus (891 201 answers, class large) and a subset with 100 000
  (class medium), each with the first 3 000 test questions in qrels order
  (`docs=100000|891201 queries=3000 qrels=3000 rel_docs=3000 missing_rel=0`).
- GerDaLIRSmall: `mteb/GerDaLIRSmall`, MIT, revision
  `b199f38071bc06a2cb86c4c10d57ecee6c46056a`; 9 969 decisions (class small),
  the first 1 000 test questions (1 215 qrels). The questions are long
  paragraphs.
- Lanes `and,or,or-stem,or-trigram,hybrid-expanded,adaptive-search-1000`,
  `--stopwords lib`, `--repeat 2`, one run per set, each pinned to its own
  core. Other work ran on the machine (another benchmark on other cores);
  latencies are compared only within one run. The GerDaLIRSmall numbers are
  from a rerun at commit `5aad34f` (library identical to `c398b87`; the bench
  only gains the `or-prefix-<n>` lanes, which were not selected).

WebFAQ-de 100 000:

```
dataset=deu-100000 docs=100000 queries=3000 repeat=2
lane                  ndcg@10  mrr@10  recall@100  p@10    p50ms  p95ms
and                   0.1453   0.1437  0.1517      0.0150  0.08   0.25
or                    0.6065   0.5774  0.7930      0.0698  1.26   5.39
or-stem               0.5891   0.5572  0.8070      0.0690  2.00   8.36
or-trigram            0.6370   0.6076  0.8273      0.0729  15.39  36.13
hybrid-expanded       0.5814   0.5494  0.7780      0.0683  1.73   7.82
adaptive-search-1000  0.6074   0.5766  0.7043      0.0704  1.22   5.00
db size MB: unicode61=68.48 trigram=189.38
```

WebFAQ-de 891 201:

```
dataset=deu-all docs=891201 queries=3000 repeat=2
lane                  ndcg@10  mrr@10  recall@100  p@10    p50ms   p95ms
and                   0.1332   0.1295  0.1500      0.0145  0.28    1.57
or                    0.4665   0.4317  0.7120      0.0577  10.10   50.97
or-stem               0.4433   0.4088  0.7063      0.0553  15.68   73.95
or-trigram            0.4904   0.4549  0.7373      0.0603  120.37  295.40
hybrid-expanded       0.4489   0.4154  0.6583      0.0556  15.30   73.71
adaptive-search-1000  0.4695   0.4349  0.5797      0.0580  9.91    49.84
db size MB: unicode61=579.20 trigram=1670.14
```

GerDaLIRSmall:

```
dataset=small-q1000 docs=9969 queries=1000 repeat=2
lane                  ndcg@10  mrr@10  recall@100  p@10    p50ms    p95ms
and                   0.0343   0.0355  0.0343      0.0036  2.24     7.60
or                    0.6150   0.5988  0.8416      0.0867  94.37    425.84
or-stem               0.5907   0.5745  0.8264      0.0847  116.45   341.81
or-trigram            0.6143   0.5970  0.8493      0.0875  1970.73  6191.33
hybrid-expanded       0.3977   0.3768  0.7923      0.0628  201.07   856.45
adaptive-search-1000  0.6150   0.5988  0.7214      0.0867  82.79    400.85
db size MB: unicode61=273.13 trigram=611.05
```

E5 per lane against `or` of the same run (paired bootstrap, 4 000 resamples). `or` fetches 100 rows per query (for recall@100), `adaptive-search-1000` returns k = 10 rows, so its p95 is not directly comparable:

| lane | test set | class | ΔnDCG@10 [95 % CI] | ΔP@10 | p95 lane / `or` ms | budget ms | E5 (excl. lines) |
|---|---|---|---|---:|---:|---:|---|
| `or-stem` | GerDaLIRSmall (9 969) | small | −0.0243 [−0.0345, −0.0137] | −0.0020 | 341.81 / 425.84 | 1277.52 | not met |
| `or-stem` | WebFAQ-de 100 000 | medium | −0.0174 [−0.0247, −0.0096] | −0.0008 | 8.36 / 5.39 | 16.17 | not met |
| `or-stem` | WebFAQ-de 891 201 | large | −0.0231 [−0.0304, −0.0159] | −0.0024 | 73.95 / 50.97 | 152.91 | not met |
| `or-trigram` | GerDaLIRSmall (9 969) | small | −0.0006 [−0.0096, +0.0084] | +0.0008 | 6191.33 / 425.84 | 1277.52 | not met |
| `or-trigram` | WebFAQ-de 100 000 | medium | +0.0304 [+0.0213, +0.0392] | +0.0030 | 36.13 / 5.39 | 16.17 | not met |
| `or-trigram` | WebFAQ-de 891 201 | large | +0.0239 [+0.0152, +0.0330] | +0.0026 | 295.40 / 50.97 | 152.91 | not met |
| `hybrid-expanded` | GerDaLIRSmall (9 969) | small | −0.2172 [−0.2392, −0.1947] | −0.0239 | 856.45 / 425.84 | 1277.52 | not met |
| `hybrid-expanded` | WebFAQ-de 100 000 | medium | −0.0251 [−0.0357, −0.0150] | −0.0016 | 7.82 / 5.39 | 16.17 | not met |
| `hybrid-expanded` | WebFAQ-de 891 201 | large | −0.0175 [−0.0275, −0.0076] | −0.0021 | 73.71 / 50.97 | 152.91 | not met |
| `adaptive-search-1000` | GerDaLIRSmall (9 969) | small | +0.0000 [+0.0000, +0.0000] | +0.0000 | 400.85 / 425.84 | 1277.52 | not met |
| `adaptive-search-1000` | WebFAQ-de 100 000 | medium | +0.0009 [−0.0052, +0.0069] | +0.0006 | 5.00 / 5.39 | 16.17 | not met |
| `adaptive-search-1000` | WebFAQ-de 891 201 | large | +0.0031 [+0.0005, +0.0058] | +0.0003 | 49.84 / 50.97 | 152.91 | not met |

Δ values are means of the per-query differences (not differences of the rounded table means).

### Facts (no recommendation change)

- The library function reproduces the T24 lane exactly (0 of 4 382 questions differ).
- On the untuned native-German sets it is never significantly worse than `or`,
  but it gains little: WebFAQ-de 891 201 +0.0031 [+0.0005, +0.0058],
  100 000 +0.0009 [−0.0052, +0.0069], GerDaLIRSmall +0.0000 (the switch never
  fires: the paragraph-length questions hit more than 1 000 documents). It
  misses the E5 threshold of +0.01 on all three, so plain OR stays the
  recommendation; `adaptiveSearch` stays in the library as a measured option.
- Its recall@100 is lower (0.5797 vs. 0.7120 on WebFAQ-de 891 201) only
  because the function returns k = 10 results (10 × P@10 = 0.580 ≈ 0.5797, one
  relevant answer per question); nDCG@10 and P@10 are unaffected.
- `or-stem` is worse on all three sets (−0.0174 to −0.0243, intervals exclude zero);
  `hybrid-expanded` too, by −0.2172 on GerDaLIRSmall.
- `or-trigram` gains on WebFAQ-de (+0.0304 and +0.0239, intervals exclude
  zero) but fails the latency budget (p95 36.13 vs. 5.39 ms and 295.40 vs.
  50.97 ms) and is neutral on GerDaLIRSmall at a p95 of 6 191 ms.
