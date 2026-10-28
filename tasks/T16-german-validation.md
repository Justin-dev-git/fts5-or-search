# T16: Deutsch messen – OR gegen Stemmer und Trigram

Stufe: 1 (nur Messung; Code, Tests und Fixture sind im Review entstanden)
Arbeits-Branch: german-2026-10-28

## Ziel
Gemessen wird, ob für deutsche Anfragen eine Erweiterung das einfache OR mit
BM25 schlägt: german-fts5-stemmer (`or-stem*`) oder der eingebaute
FTS5-Tokenizer `trigram` (`or-trigram`). Kriterien und Datensätze stehen in
`docs/ZIEL.md` unter „Deutsch“.

Der Code ist fertig und getestet:
- `scripts/beir-bench.mjs --lang de --stemmer <modul>`
- `scripts/to-beir.mjs`
- `test/de-bench.test.mjs` und `test/to-beir.test.mjs`

Du lädst die Daten, konvertierst sie, misst und dokumentierst. **Am Code
änderst du nichts.**

Erlaubte Dateien:
- docs/VALIDATION.md

## Vorbereitung
- `STEMMER` zeigt auf `lib/stem-german.mjs` in deinem Klon von
  german-fts5-stemmer. Der Klon steht auf Branch `review-fixes-2026-10-28`
  mit Commit `17e64135d75c6948baa113479e80548cc93ba74c`. Beispiel:
  `export STEMMER=/pfad/zu/german-fts5-stemmer/lib/stem-german.mjs`
- `export REPO=$(pwd)` im Repo-Wurzelverzeichnis.
- Alle Daten liegen unter `/tmp/beir-de/` und werden nicht committet.

## Schritte
1. **GermanDPR laden und konvertieren:**
   ```bash
   mkdir -p /tmp/beir-de && cd /tmp/beir-de
   curl -fsSLO https://germanquad.s3.amazonaws.com/GermanDPR.zip && sha256sum GermanDPR.zip && unzip -qo GermanDPR.zip
   node "$REPO/scripts/to-beir.mjs" --format germandpr --in /tmp/beir-de/GermanDPR/GermanDPR_test.json --out /tmp/beir-de/germandpr
   ```
   - Scheitert der Download: **STOPP** und melden.
   - Liegt die Testdatei unter einem anderen Pfad: mit `unzip -l
     GermanDPR.zip` nachsehen, den Pfad melden und mit ihm weitermachen.
2. **GermanGovService laden und konvertieren**
   (Hugging Face `it-at-m/LHM-Dienstleistungen-QA`, Test-Split):
   ```bash
   curl -fsS "https://huggingface.co/api/datasets/it-at-m/LHM-Dienstleistungen-QA" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log('revision',j.sha,'license',(j.cardData||{}).license)"
   curl -fsS "https://datasets-server.huggingface.co/splits?dataset=it-at-m%2FLHM-Dienstleistungen-QA"
   for o in 0 100 200 300; do curl -fsS "https://datasets-server.huggingface.co/rows?dataset=it-at-m%2FLHM-Dienstleistungen-QA&config=default&split=test&offset=$o&length=100" -o /tmp/beir-de/govservice-rows-$o.json; done
   node "$REPO/scripts/to-beir.mjs" --format hf-rows --in /tmp/beir-de/govservice-rows-0.json,/tmp/beir-de/govservice-rows-100.json,/tmp/beir-de/govservice-rows-200.json,/tmp/beir-de/govservice-rows-300.json --out /tmp/beir-de/govservice
   sha256sum /tmp/beir-de/govservice/corpus.jsonl /tmp/beir-de/govservice/queries.jsonl /tmp/beir-de/govservice/qrels/test.tsv
   ```
   - Nennt die `splits`-Ausgabe für `test` keine `config` namens `default`:
     **STOPP** und melden.
   - Bricht `to-beir` ab, etwa wegen gekürzter Zellen oder zu weniger
     Zeilen: **STOPP**, Fehlermeldung melden. Nicht umgehen.
3. **Messen.**
   - a) **Auswahl nur auf GermanDPR:**
     `node "$REPO/scripts/beir-bench.mjs" --data /tmp/beir-de/germandpr --lang de --stemmer "$STEMMER" --repeat 3 --per-query /tmp/beir-de/germandpr.t16.jsonl --json`
     Gewählt wird `or-stem` oder `or-stem-paradigm`, je nachdem, welche Lane
     das höhere nDCG@10 hat. Bei Gleichstand gilt `or-stem`.
   - b) **Test auf GovService**, dort wird nichts nachjustiert:
     `node "$REPO/scripts/beir-bench.mjs" --data /tmp/beir-de/govservice --lang de --stemmer "$STEMMER" --repeat 3 --lanes and,or,<gewählte stem-Lane>,or-trigram --per-query /tmp/beir-de/govservice.t16.jsonl --json`
   - c) Pro Datensatz `node "$REPO/scripts/beir-compare.mjs" /tmp/beir-de/<ds>.t16.jsonl --a <lane> --b or`
     für die gewählte stem-Lane und für `or-trigram`. Dazu einmal
     `--a or --b and`.
4. **`docs/VALIDATION.md`:** Neuer Abschnitt `## T16 – German` am Ende.
   Englisch wie der Rest der Datei.
   - Pro Datensatz:
     - Quelle und Lizenz
     - bei GermanDPR die `sha256sum`-Zeile der ZIP-Datei
     - bei GovService die Revision aus Schritt 2 und die drei
       `sha256sum`-Zeilen der konvertierten Dateien
     - die Ausgabezeile von `to-beir` (`docs=… queries=… qrels=…`) neben den
       Referenzwerten unten
   - Commit von german-fts5-stemmer: `git -C <klon> rev-parse HEAD`.
   - Alle Tabellen samt `db size MB`-Zeile, die Compare-Ausgaben vollständig
     mit Gruppenzeilen, die Befehle und die gewählte stem-Lane mit Begründung.
   - Plausibilität: `or` gegen NanoMTEB-German-BM25 (GermanDPR 0.4647,
     GovService 0.6132), als Differenz.
   - Am Ende **nur Fakten**, keine Empfehlung:
     - E1-DE pro Datensatz.
     - E5 für `or-trigram` auf **beiden** Datensätzen und für die gewählte
       stem-Lane auf GovService: ΔnDCG@10, ΔP@10 und das p95-Verhältnis
       gegen `or`. Dazu das Verhältnis der Datenbankgrößen trigram zu
       unicode61.
   
   Commit `T16: Schritt 4 – …`.

## Prüfung
```bash
test -n "${STEMMER:?export STEMMER=/path/to/german-fts5-stemmer/lib/stem-german.mjs}"
test "$(git -C "$(dirname "$STEMMER")/.." rev-parse HEAD)" = 17e64135d75c6948baa113479e80548cc93ba74c
node scripts/beir-bench.mjs --data test/fixtures/beir-de-mini --lang de --stemmer "$STEMMER" --repeat 1 --json | tail -1 | node -e "const L=JSON.parse(require('fs').readFileSync(0,'utf8')).lanes;const want={and:0,or:0.5436,'or-stem':0.6667,'or-stem-paradigm':0.6667,'or-trigram':0.877};const bad=Object.keys(want).filter(n=>!L[n]||L[n].ndcg10!==want[n]);console.log(bad.length?'mismatch '+bad.join(','):'beir-de-mini ok with real stemmer');process.exit(bad.length?1:0)"
git diff --quiet 9e1e269 -- lib scripts test package.json
grep -F "## T16 – German" docs/VALIDATION.md
grep -E "^[0-9a-f]{64}  .*GermanDPR\.zip" docs/VALIDATION.md
grep -E "^[0-9a-f]{64}  .*govservice/corpus\.jsonl" docs/VALIDATION.md
grep -E "docs=[0-9]+ queries=[0-9]+ qrels=[0-9]+" docs/VALIDATION.md
grep -F "17e64135d75c6948baa113479e80548cc93ba74c" docs/VALIDATION.md
```

## Referenzwerte
- **beir-de-mini mit dem echten Stemmer**, im Review gerechnet und identisch
  mit dem Stub in `npm test`: `and` 0, `or` 0.5436, `or-stem` 0.6667,
  `or-stem-paradigm` 0.6667, `or-trigram` 0.877.
- **GermanDPR:** Laut `PM-AI/germandpr-beir`, Variante „original“, hat der
  Test-Split 2876 Dokumente, 1025 Anfragen und 1025 qrels. Weicht `to-beir`
  ab, meldest du das. Nicht anpassen.
- **GovService:** Laut Datensatz-README hat der Test-Split 357 Zeilen, also
  357 Anfragen. MTEB nennt 105 Dokumente und 356 Anfragen. Abweichungen
  meldest du, nicht anpassen.

## Nicht Teil dieser Task
- Code, Tests, README, Empfehlungen, GerDaLIR.
