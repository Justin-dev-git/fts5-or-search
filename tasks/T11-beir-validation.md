# T11: OR + Re-Rank auf öffentlichen Benchmarks validieren (BEIR)

Stufe: 1 (nur Messung, keine Änderung an `lib/`)
Arbeits-Branch: validation-2026-10-28 (vom Stand `review-fixes-2026-10-28`
anlegen und pushen, falls er noch nicht existiert)

## Ziel
Die Kernaussage des Repos ist bisher nur auf 8 Demo-Dokumenten belegt: OR
plus Coverage-Re-Rank schlägt strikte AND-Suche. T11 misst das auf zwei
öffentlichen Datensätzen mit unabhängigen Relevanzurteilen und liefert die
Zahlen für die Kriterien E1 bis E4 in `docs/ZIEL.md`. Bewerten und
entscheiden tut der Owner, nicht du.

Erlaubte Dateien:
- scripts/metrics.mjs
- scripts/beir-bench.mjs
- test/metrics.test.mjs
- docs/VALIDATION.md

## Schritte
1. **Test übernehmen:** `tasks/T11/metrics.test.mjs.pending` **unverändert**
   nach `test/metrics.test.mjs` kopieren. `node --test` findet ihn dort
   automatisch. Commit `T11: Schritt 1 – …`. Danach ist `npm test` rot, das
   ist bis Schritt 2 erwartet.
2. **`scripts/metrics.mjs`** mit diesen Exporten:
   - `ndcgAtK(ranked, qrel, k)`: lineare Gain = Relevanzwert,
     Discount `log2(rang+1)`; IDCG aus allen Relevanzwerten > 0 der Anfrage.
   - `mrrAtK(ranked, qrel, k)` und `recallAtK(ranked, qrel, k)`: relevant
     heißt Wert > 0.
   - `evaluate(run, qrels, { k = 10, recallK = 100 })` mit `run` und `qrels`
     als `Map`. Rückgabe `{ queries, ndcg10, mrr10, recall100 }`.
     Anfragen ohne relevantes Dokument werden ausgeschlossen. Anfragen, die
     im Run fehlen, zählen mit 0.

   Keine Abhängigkeiten. Commit `T11: Schritt 2 – …`.
3. **`scripts/beir-bench.mjs --data <dir> [--repeat 3] [--json]`** für das
   BEIR-Format (`corpus.jsonl` mit `_id,title,text`, `queries.jsonl` mit
   `_id,text`, `qrels/test.tsv` mit Kopfzeile):
   - In-Memory-FTS5: `CREATE VIRTUAL TABLE docs USING fts5(id UNINDEXED, content, tokenize='porter unicode61')`,
     content = `title + "\n" + text`.
   - Suche: `SELECT rowid AS rid, id, content FROM docs WHERE docs MATCH ? ORDER BY rank LIMIT ?`.
   - Anfragen: nur solche aus `qrels/test.tsv`.
   - Lanes, je 100 Ergebnisse:
     - `and` = `sanitizeMatch`
     - `or` = `buildOrMatch`
     - `hybrid` = `hybridSearch(…, { k: 100 })`
     - `hybrid-nofloor` = `{ k: 100, andFloor: false }`
     - `hybrid-fts` = `{ k: 100, termPresent: makeFtsTermPresent(db, 'docs', { idKey: 'rid' }) }`
   - Latenz pro Anfrage (Suche plus Re-Rank), p50 und p95, jeweils das
     Schlechteste aus `--repeat` Läufen.
   - Ausgabe: eine Tabelle; mit `--json` als letzte Zeile
     `{ dataset, docs, queries, lanes: { <lane>: { ndcg10, mrr10, recall100, p50ms, p95ms } } }`.

   Commit `T11: Schritt 3 – …`.
4. **Messen auf dem GX10** (die Daten **nicht** committen):
   ```
   mkdir -p /tmp/beir && cd /tmp/beir
   for d in scifact nfcorpus; do curl -fsSLO https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/$d.zip && sha256sum $d.zip && unzip -qo $d.zip; done
   ```
   Lauf: `node scripts/beir-bench.mjs --data /tmp/beir/<d> --repeat 3 --json`.
5. **`docs/VALIDATION.md`** schreiben, pro Datensatz:
   - Quelle und Lizenz laut Quellseite, mit Link
   - die `sha256sum`-Zeile der ZIP-Datei wörtlich, also `<64 hex>  <d>.zip`
   - Anzahl Dokumente und Anfragen
   - die Tabelle und die rohe JSON-Zeile
   - den **veröffentlichten BM25-Wert** (nDCG@10) aus dem BEIR-Paper
     (Thakur et al., 2021) mit Quellenangabe, dazu die Differenz zu deiner
     `or`-Lane

   Darunter für E1 bis E4 nur „erfüllt“ oder „nicht erfüllt“, mit den
   Zahlen. **Keine Empfehlung.** Commit `T11: Schritt 5 – …`.

## Stop-Kriterium
Weicht `or` auf einem Datensatz um mehr als 0.10 nDCG@10 vom
veröffentlichten BM25-Wert ab, dann stoppen. Die Abweichung wird in
`docs/VALIDATION.md` dokumentiert, aber nicht interpretiert. Das deutet auf
einen Fehler im Messaufbau hin.

## Prüfung
```bash
cmp test/metrics.test.mjs tasks/T11/metrics.test.mjs.pending
node --test test/metrics.test.mjs
node scripts/beir-bench.mjs --data test/fixtures/beir-mini --repeat 1 --json | tail -1 | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));const L=j.lanes;const ok=j.queries===2&&j.docs===3&&L.and.ndcg10===0.5&&L.and.recall100===0.5&&L.or.ndcg10===1&&L.hybrid.ndcg10===1&&L['hybrid-nofloor'].ndcg10===1&&L['hybrid-fts'].ndcg10===1;console.log(JSON.stringify(L));process.exit(ok?0:1)"
grep -E "^[0-9a-f]{64}  scifact\.zip" docs/VALIDATION.md
grep -E "^[0-9a-f]{64}  nfcorpus\.zip" docs/VALIDATION.md
grep -F "Thakur" docs/VALIDATION.md
```

## Referenzwerte (Mini-Fixture `test/fixtures/beir-mini`, im Review von Hand nachgerechnet)
- `and`: q1 hat keinen Treffer, weil „how“ und „make“ in keinem Dokument
  stehen; q2 trifft. Ergibt nDCG@10 = 0.5 und Recall@100 = 0.5.
- `or`, `hybrid`, `hybrid-nofloor`, `hybrid-fts`: nDCG@10 = 1.
- q3 hat kein Relevanzurteil und wird ausgeschlossen. Gezählt werden also 2
  Anfragen.

## Nicht Teil dieser Task
- `lib/`, README, Bewertung oder Empfehlung, Deutsch, Stemmer.
