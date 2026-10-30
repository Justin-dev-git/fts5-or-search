# T21: Deutsche Stoppwörter vervollständigen (Snowball) und auf mMARCO-de messen

Stufe: 2 (Änderung in `lib/` mit Test, danach Messung)
Arbeits-Branch: stopwords-de-2026-10-30 (auf `scale-2026-10-29`, PR #2)

## Ziel
Der deutschen Liste aus T16 bis T18 (94 Wörter) fehlen häufige
Funktionswörter wie „in“, „sie“, „es“, „wird“. Jede OR-Anfrage mit einem
davon lässt FTS5 einen großen Teil des Korpus bewerten. Das fiel bei der
Validierung der Skalierungswerkzeuge auf: Bei 100 000 Abschnitten von
mMARCO-de steht „in“ in 50.1 % der Abschnitte und in 137 von 1 000 Fragen.
`STOPWORDS_DE` soll vollständig sein, und die deutschen Lanes werden damit
neu gemessen, auch bei 1 000 000 Abschnitten.

Erlaubte Dateien:
- lib/or-search.mjs
- scripts/beir-bench.mjs
- scripts/scale-run.sh
- test/german-recipe.test.mjs
- test/stopwords-de.test.mjs
- test/fixtures/beir-de-stop/
- docs/VALIDATION.md
- docs/ZIEL.md
- README.md
- CHANGELOG.md

## Vorgaben
- `STOPWORDS_DE` = die 94 bisherigen Wörter, dann die Snowball-Liste
  (`snowballstem.org/algorithms/german/stop.txt`, BSD-3-Clause, 231 Wörter,
  sha256 `22a7785b53860256280fba74b93d8f09a0f3a8f52edaa3cdc3750e8c13a3874c`),
  dann deren Schreibweisen ohne Umlaut. Zusammen 259. Keine weiteren Wörter,
  nichts an Messdaten abgestimmt.
- `beir-bench --stopwords stemmer|lib`, nur Deutsch. `stemmer` (Standard)
  ist die Liste von T16 bis T19, die Ausgabe bleibt unverändert. `lib` nimmt
  `STOPWORDS_DE` für jede deutsche Lane; die Stemmer-Lanes bekommen die
  Anfrage ohne diese Wörter. JSON-Feld `stopwords: "lib"`.
- `scale-run.sh`: Variable `DE_STOPWORDS` (Standard `stemmer`).
- Schritt 1: Code und Tests. Schritt 2: `docs/VALIDATION.md`, Abschnitt
  `## T21 – German stopwords (Snowball) and German scale (mMARCO-de)`.
  Schritt 3: README, CHANGELOG, ZIEL.

## Prüfung
```bash
node --input-type=module -e "import { STOPWORDS_DE as s } from './lib/or-search.mjs'; process.exit(s.size === 259 && ['in', 'sie', 'es', 'wird', 'der', 'fuer'].every((w) => s.has(w)) ? 0 : 1)"
node scripts/beir-bench.mjs --data test/fixtures/beir-de-stop --lang de --stemmer test/fixtures/de/stub-stemmer.mjs --stopwords lib --repeat 1 --lanes or --json | tail -1 | grep -F '"stopwords":"lib"'
node scripts/beir-bench.mjs --data test/fixtures/beir-de-mini --lang de --stemmer test/fixtures/de/stub-stemmer.mjs --repeat 1 --json | tail -1 | grep -F '"or-trigram":{"ndcg10":0.877,'
grep -F "## T21 – German stopwords (Snowball) and German scale (mMARCO-de)" docs/VALIDATION.md
sed -n '/^## T21/,$p' docs/VALIDATION.md | grep -F "id sequence identical for en and de at every size"
sed -n '/^## T21/,$p' docs/VALIDATION.md | grep -E "^[0-9a-f]{64}  german_collection\.tsv"
sed -n '/^## T21/,$p' docs/VALIDATION.md | grep -E "^\| 1000000 \| 1000000 \| 1000 \| or \| 0\.3493 "
sed -n '/^## T21/,$p' docs/VALIDATION.md | grep -F "or-trigram vs or: W="
sed -n '/^## T21/,$p' docs/VALIDATION.md | grep -F "hybrid-expanded vs or: W="
grep -F '| **`or`** (reference) | quoted OR, `unicode61` | **0.4807** | **0.7280** | **0.3493** |' README.md
! grep -nE "/home/|/Users/" docs/VALIDATION.md README.md
```

## Referenzwerte
Gemessen am 30.10.2026 mit Commit `92eb617` (Schritt 1), Stemmer
`17e64135`, auf dem GX10 (vLLM lief parallel):
- Kontrolle `--stopwords stemmer`: GermanDPR `or` 0.4797, `or-trigram`
  0.5338, `hybrid-expanded` 0.5227; GovService `or` 0.6937, `or-trigram`
  0.7628, `hybrid-expanded` 0.7123 (wie T16 bis T18).
- `--stopwords lib`, nDCG@10 `or`: GermanDPR 0.4807, GovService 0.7280,
  mMARCO-de 1 000 000 0.3493. p95 von `or` bei 1 000 000: 24.72 ms (alte
  Liste 266.96 ms).
- E5 mit neuer Liste: keine Lane erfüllt es auf jedem nicht abgestimmten
  Datensatz (Tabelle in `docs/VALIDATION.md`).
- mMARCO: Revision `6d039c4638c0ba3e46a9cb7b498b145e7edc6230`, Konvertierung
  je Sprache `docs=8841823 queries=6980 qrels=7437`.

## Nicht Teil dieser Task
- Volle Korpusgröße (8 841 823) und Abgleich mit den veröffentlichten
  BM25-Werten.
- Die englischen Re-Rank-Lanes von T19 bei großen Korpora.
- german-fts5-stemmer selbst (dessen `STOPWORDS` bleibt unverändert).
