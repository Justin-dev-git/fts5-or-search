# T13: Titel stärker gewichten (FTS5-Spaltengewichte), gemessen gegen OR

Stufe: 1 (nur Messung, keine Änderung an `lib/`)
Arbeits-Branch: validation-2026-10-28
Voraussetzung: T12 ist gepusht und hat `CHECK T12: PASS`.

## Ziel
Gesucht ist die billigste denkbare Verbesserung gegenüber OR mit BM25.
Titel und Text liegen dafür in getrennten FTS5-Spalten, und
`bm25(docs, 0, w, 1)` gewichtet den Titel w-fach. Das kostet keine
Abhängigkeit, keine zweite Abfrage und nur eine Zeile SQL.

Bewertet wird nach Kriterium E5 in `docs/ZIEL.md`, und zwar auf einem
Datensatz, auf dem nicht abgestimmt wurde.

Erlaubte Dateien:
- scripts/beir-bench.mjs
- docs/VALIDATION.md

## Schritte
1. `scripts/beir-bench.mjs` erweitern:
   - Option `--title-weights 1,2,3,5`, Standard ist aus. Ist sie gesetzt,
     baut das Bench **zusätzlich** eine zweite In-Memory-Tabelle:
     `CREATE VIRTUAL TABLE docs2 USING fts5(id UNINDEXED, title, text, tokenize='porter unicode61')`.
   - Pro Gewicht w gibt es eine Lane `or-title-<w>`:
     `SELECT rowid AS rid, id, title || char(10) || text AS content FROM docs2 WHERE docs2 MATCH ? ORDER BY bm25(docs2, 0.0, ?, 1.0) LIMIT ?`
     mit `buildOrMatch(q)` und w als Parameter.
   - Alle bisherigen Lanes bleiben unverändert und laufen weiter auf `docs`.
   
   Commit `T13: Schritt 1 – …`.
2. **Abstimmen nur auf SciFact und NFCorpus:** Wähle das w mit dem höchsten
   Mittel der nDCG@10 über beide Datensätze. `or-title-1` ist dabei der
   faire Vergleich für Spalten ohne Gewicht.
3. **Testdatensatz TREC-COVID**, laden wie in T11 mit `trec-covid.zip`:
   - Lanes `or`, `or-title-1` und `or-title-<gewähltes w>`, `--repeat 1`.
   - Auf TREC-COVID wird nichts nachjustiert.
   - FiQA ist hier ungeeignet, weil die Dokumente dort fast nie einen Titel
     haben. Das in VALIDATION.md vermerken.
4. `docs/VALIDATION.md` bekommt einen Abschnitt `## T13`:
   - TREC-COVID mit Quelle, Lizenz, `sha256sum`-Zeile und veröffentlichtem
     BM25-Wert (Thakur et al., 2021)
   - alle Tabellen und das gewählte w mit Begründung
   - am Ende **nur Fakten** zu E5 für `or-title-<w>` gegen `or` auf
     TREC-COVID: ΔnDCG@10, ΔP@10, das p95-Verhältnis und die zusätzlichen
     Library-Zeilen. Im Library-Fall wären das eine Schema- und eine
     SQL-Zeile. Keine Empfehlung.
   
   Commit `T13: Schritt 4 – …`.

## Prüfung
```bash
node scripts/beir-bench.mjs --data test/fixtures/beir-mini --repeat 1 --title-weights 1,2,5 --json | tail -1 | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));const L=j.lanes;const ok=['or-title-1','or-title-2','or-title-5'].every(n=>L[n]&&L[n].ndcg10===1)&&L.or.ndcg10===1&&L.and.ndcg10===0.5;console.log(Object.keys(L).join(','));process.exit(ok?0:1)"
node scripts/beir-bench.mjs --data test/fixtures/beir-mini --repeat 1 --json | tail -1 | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));process.exit(Object.keys(j.lanes).some(n=>n.startsWith('or-title'))?1:0)"
grep -E "^[0-9a-f]{64}  trec-covid\.zip" docs/VALIDATION.md
grep -F "## T13" docs/VALIDATION.md
```

## Referenzwerte (Mini-Fixture)
Alle `or-title-*`-Lanes ergeben nDCG@10 = 1. In beiden Anfragen steht das
relevante Dokument sowohl nach Titel als auch nach Text vorn. Ohne
`--title-weights` gibt es keine `or-title`-Lane.

## Nicht Teil dieser Task
- `lib/`, README, Empfehlungen, Deutsch.
