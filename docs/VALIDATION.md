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
