# T17: Deutsch – die Re-Rank-Lanes nachmessen

Stufe: 1 (nur Messung; Code, Tests und Fixture sind im Review entstanden)
Arbeits-Branch: german-2026-10-28
Voraussetzung: T16 ist gepusht und hat `CHECK T16: PASS`.

## Ziel
In T16 fehlte die Lane, die auf dem privaten Korpus am besten war:
`fts-hybrid-expanded` aus german-fts5-stemmer. Das ist der
Stemmer-erweiterte OR-Pool mit anschließendem Coverage-Re-Rank. Die Lane
ist jetzt exakt nachgebaut, als `hybrid-expanded`. Dazu kommt `hybrid`,
dasselbe Re-Rank ohne Stemmer. T17 misst beide auf denselben Daten wie
T16.

Am Code änderst du nichts.

Erlaubte Dateien:
- docs/VALIDATION.md

## Vorbereitung
- `STEMMER` und `REPO` wie in T16.
- Die Daten aus T16 werden wiederverwendet: `/tmp/beir-de/germandpr` und
  `/tmp/beir-de/govservice`.
- Fehlen sie, wiederholst du die Schritte 1 und 2 aus T16. Danach müssen
  die Prüfsummen exakt denen im Abschnitt `## T16 – German` von
  `docs/VALIDATION.md` entsprechen. Weichen sie ab: **STOPP** und melden.

## Schritte
1. **Messen**, für `<ds>` erst `germandpr`, dann `govservice`:
   `node "$REPO/scripts/beir-bench.mjs" --data /tmp/beir-de/<ds> --lang de --stemmer "$STEMMER" --repeat 3 --lanes or,or-stem,or-trigram,hybrid,hybrid-expanded --per-query /tmp/beir-de/<ds>.t17.jsonl --json`
   - Kontrolle: `or`, `or-stem` und `or-trigram` müssen bei nDCG@10,
     MRR@10, Recall@100 und P@10 **exakt** den T16-Tabellen entsprechen. Die
     Rankings sind deterministisch. Weicht etwas ab: **STOPP** und melden.
2. **Vergleichen**, pro Datensatz:
   `node "$REPO/scripts/beir-compare.mjs" /tmp/beir-de/<ds>.t17.jsonl --a <a> --b <b>`
   für diese Paare:
   - `hybrid-expanded` gegen `or`
   - `hybrid` gegen `or`
   - `hybrid-expanded` gegen `hybrid`, das zeigt die Wirkung des Stemmers
     innerhalb des Re-Ranks
   - `hybrid-expanded` gegen `or-trigram`
3. **`docs/VALIDATION.md`:** Neuer Abschnitt `## T17 – German, coverage re-rank lanes`
   am Ende, auf Englisch.
   - Ein Satz zum Anlass: T16 hatte `hybrid-expanded` ausgelassen.
   - Ein Satz zur Methode: 50er-Pool, Teilstring-Abdeckung pro Wortgruppe
     auf dem kleingeschriebenen Text, wie in german-fts5-stemmer
     `bench.mjs`. Recall@100 ist deshalb durch den 50er-Pool begrenzt.
   - Beide Tabellen, das Ergebnis der Kontrolle aus Schritt 1, alle
     Compare-Ausgaben vollständig mit Gruppenzeilen und die Befehle.
   - Am Ende **nur Fakten**, keine Empfehlung:
     - E5 für `hybrid-expanded` und `hybrid` auf **beiden** Datensätzen
       (beide nicht abgestimmt): ΔnDCG@10, ΔP@10 und das p95-Verhältnis
       gegen `or`.
     - Zusätzlich ΔnDCG@10 von `hybrid-expanded` gegen `or-trigram`.
   
   Commit `T17: Schritt 3 – …`.

## Prüfung
```bash
test -n "${STEMMER:?export STEMMER=/path/to/german-fts5-stemmer/lib/stem-german.mjs}"
test "$(git -C "$(dirname "$STEMMER")/.." rev-parse HEAD)" = 17e64135d75c6948baa113479e80548cc93ba74c
node scripts/beir-bench.mjs --data test/fixtures/beir-de-lanes --lang de --stemmer "$STEMMER" --repeat 1 --json | tail -1 | node -e "const L=JSON.parse(require('fs').readFileSync(0,'utf8')).lanes;const want={and:0.25,or:0.5655,'or-stem':0.6577,'or-stem-paradigm':0.6577,'or-trigram':0.8155,hybrid:0.6577,'hybrid-expanded':0.75};const bad=Object.keys(want).filter(n=>!L[n]||L[n].ndcg10!==want[n]);console.log(bad.length?'mismatch '+bad.join(','):'beir-de-lanes ok with real stemmer');process.exit(bad.length?1:0)"
git diff --quiet 4f00bbb -- lib scripts test package.json
grep -F "## T17 – German, coverage re-rank lanes" docs/VALIDATION.md
grep -F "hybrid-expanded vs or: W=" docs/VALIDATION.md
grep -F "hybrid-expanded vs hybrid: W=" docs/VALIDATION.md
grep -F "hybrid-expanded vs or-trigram: W=" docs/VALIDATION.md
```

## Referenzwerte
- **beir-de-lanes mit dem echten Stemmer**, im Review gerechnet und
  identisch mit dem Stub: `and` 0.25, `or` 0.5655, `or-stem` 0.6577,
  `or-stem-paradigm` 0.6577, `or-trigram` 0.8155, `hybrid` 0.6577,
  `hybrid-expanded` 0.75.
- Bei q4 („Fahrrad Termin Anmeldung“) setzen nur `hybrid` und
  `hybrid-expanded` das Dokument mit allen drei Wörtern auf Rang 1.
- **T16-Werte für die Kontrolle in Schritt 1**, nDCG@10:
  - GermanDPR: `or` 0.4797, `or-stem` 0.4874, `or-trigram` 0.5338
  - GovService: `or` 0.6937, `or-stem` 0.6968, `or-trigram` 0.7628

## Nicht Teil dieser Task
- Code, Tests, README, Empfehlungen, private Daten.
