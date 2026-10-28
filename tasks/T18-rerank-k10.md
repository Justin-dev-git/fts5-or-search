# T18: Re-Rank in der normalen Top-10-Konfiguration nachmessen

Stufe: 1 (nur Messung; Code, Tests und Fixtures sind im Review entstanden)
Arbeits-Branch: german-2026-10-28
Voraussetzung: T17 ist gepusht und hat `CHECK T17: PASS`.

## Ziel
Die englischen `hybrid`-Lanes aus T11 bis T14 riefen `hybridSearch` mit
k=100 auf. Sie sortierten damit einen OR-Pool von **500** Treffern nach
Abdeckung um. Eine normale Top-10-Suche sortiert aber nur **50** um. T17 hat
gezeigt: Auf Deutsch schlägt das Re-Rank mit einem 50er-Pool das einfache
OR.

T18 klärt zweierlei:
- **A)** Wie schneidet das englische Re-Rank mit k=10 ab, also mit einem
  50er-Pool?
- **B)** Bringt auf Deutsch Trigram plus Re-Rank (`hybrid-trigram`) mehr als
  `or-trigram`?

Am Code änderst du nichts.

Erlaubte Dateien:
- docs/VALIDATION.md

## Vorbereitung
- `STEMMER` und `REPO` wie in T16 und T17.
- **Englische Daten** liegen unter `/tmp/beir/<ds>` für scifact, nfcorpus,
  fiqa und trec-covid.
  - Fehlt ein Datensatz, lädst du ihn wie in T11 neu:
    `curl -fsSLO https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/<ds>.zip && sha256sum <ds>.zip && unzip -qo <ds>.zip`
  - Die Prüfsumme muss exakt der in `docs/VALIDATION.md` entsprechen.
    Weicht sie ab: **STOPP** und melden.
- **Deutsche Daten** wie in T17 unter `/tmp/beir-de/`, mit denselben
  Prüfsummen-Regeln.

## Schritte
1. **A) Englisch**, für `<ds>` in der Reihenfolge scifact, nfcorpus, fiqa,
   trec-covid:
   `node "$REPO/scripts/beir-bench.mjs" --data /tmp/beir/<ds> --repeat 3 --lanes or,hybrid,hybrid-k10,hybrid-nofloor-k10,hybrid-fts-k10,hybrid-substr-k10 --per-query /tmp/beir/<ds>.t18.jsonl --json`
   - Kontrolle: `or` und `hybrid` müssen bei nDCG@10 und P@10 **exakt**
     den bisherigen Werten entsprechen, siehe Referenzwerte. Für `hybrid` auf
     TREC-COVID gibt es noch keinen Wert, er wird neu gemessen. Weicht etwas
     ab: **STOPP** und melden.
   - Dann pro Datensatz:
     `node "$REPO/scripts/beir-compare.mjs" /tmp/beir/<ds>.t18.jsonl --a <lane> --b or`
     für alle vier `*-k10`-Lanes.
2. **B) Deutsch**, für `<ds>` in germandpr und govservice:
   `node "$REPO/scripts/beir-bench.mjs" --data /tmp/beir-de/<ds> --lang de --stemmer "$STEMMER" --repeat 3 --lanes or,or-trigram,hybrid,hybrid-trigram --per-query /tmp/beir-de/<ds>.t18.jsonl --json`
   - Kontrolle: `or`, `or-trigram` und `hybrid` müssen exakt den Werten aus
     T16 und T17 entsprechen. Sonst **STOPP**.
   - Compares: `--a hybrid-trigram --b or` und `--a hybrid-trigram --b or-trigram`.
3. **`docs/VALIDATION.md`:** Neuer Abschnitt `## T18 – Re-rank at k=10 (pool 50)`
   am Ende, auf Englisch.
   - Ein Absatz zum Anlass, sachlich:
     - Die `hybrid`-Lanes aus T11 bis T14 nutzten k=100 und damit einen
       500er-Pool.
     - Die neuen `*-k10`-Lanes entsprechen dem normalen Top-10-Einsatz.
     - Sie liefern nur 10 Treffer (`hybrid-substr-k10` liefert 50). Recall@100
       ist für sie deshalb nicht vergleichbar.
   - Alle Tabellen, das Ergebnis der Kontrollen und alle Compare-Ausgaben
     vollständig mit Gruppenzeilen und den Befehlen.
   - Am Ende **nur Fakten**, keine Empfehlung:
     - Für jede `*-k10`-Lane auf **allen vier** englischen Datensätzen
       ΔnDCG@10, ΔP@10 und das p95-Verhältnis gegen `or`, plus ob E5 erfüllt
       ist, ohne das Zeilenkriterium. Keine dieser Lanes wurde abgestimmt:
       k=10 und der 50er-Pool sind die Library-Vorgabe.
     - Für `hybrid-trigram` auf beiden deutschen Datensätzen dasselbe gegen
       `or`, dazu ΔnDCG@10 gegen `or-trigram`.
   
   Commit `T18: Schritt 3 – …`.

## Prüfung
```bash
test -n "${STEMMER:?export STEMMER=/path/to/german-fts5-stemmer/lib/stem-german.mjs}"
test "$(git -C "$(dirname "$STEMMER")/.." rev-parse HEAD)" = 17e64135d75c6948baa113479e80548cc93ba74c
node scripts/beir-bench.mjs --data test/fixtures/beir-pool --repeat 1 --json | tail -1 | node -e "const L=JSON.parse(require('fs').readFileSync(0,'utf8')).lanes;const want={and:0,or:1,hybrid:0.6309,'hybrid-k10':0.6309,'hybrid-fts-k10':0.6309,'hybrid-nofloor-k10':1,'hybrid-substr-k10':1};const bad=Object.keys(want).filter(n=>!L[n]||L[n].ndcg10!==want[n]);console.log(bad.length?'mismatch '+bad.join(','):'beir-pool ok');process.exit(bad.length?1:0)"
node scripts/beir-bench.mjs --data test/fixtures/beir-de-lanes --lang de --stemmer "$STEMMER" --repeat 1 --json | tail -1 | node -e "const L=JSON.parse(require('fs').readFileSync(0,'utf8')).lanes;process.exit(L['hybrid-trigram'].ndcg10===0.9077&&L['or-trigram'].ndcg10===0.8155?0:1)"
git diff --quiet 180c10e -- lib scripts test package.json
grep -F "## T18 – Re-rank at k=10 (pool 50)" docs/VALIDATION.md
grep -F "hybrid-k10 vs or: W=" docs/VALIDATION.md
grep -F "hybrid-substr-k10 vs or: W=" docs/VALIDATION.md
grep -F "hybrid-trigram vs or-trigram: W=" docs/VALIDATION.md
```

## Referenzwerte
- **Fixture beir-pool**, im Review gerechnet:
  - `or` 1. Alle Lanes mit 500er-Pool (`hybrid`, `hybrid-nofloor`,
    `hybrid-fts`) 0.6309: Das lange Dokument mit allen vier Wörtern
    springt von BM25-Rang 57 nach vorn.
  - `hybrid-nofloor-k10` und `hybrid-substr-k10` 1.
  - `hybrid-k10` und `hybrid-fts-k10` 0.6309: Der AND-Floor holt genau
    dieses Dokument zurück.
- **Kontrolle Englisch**, nDCG@10 / P@10 aus T11 bis T13:
  - `or`: SciFact 0.6878/0.0910, NFCorpus 0.3209/0.2337, FiQA
    0.2535/0.0690, TREC-COVID 0.6020/0.6240
  - `hybrid`: SciFact 0.5907/0.0780, NFCorpus 0.2988/0.2149, FiQA
    0.1621/0.0463
- **Kontrolle Deutsch**, nDCG@10:
  - GermanDPR: `or` 0.4797, `or-trigram` 0.5338, `hybrid` 0.5160
  - GovService: `or` 0.6937, `or-trigram` 0.7628, `hybrid` 0.7217

## Nicht Teil dieser Task
- Code, Tests, README, Empfehlungen, private Daten.
