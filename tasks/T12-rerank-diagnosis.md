# T12: Wo hilft Re-Rank? Diagnose plus zwei sanftere Varianten

Stufe: 1 (nur Messung, keine Änderung an `lib/`)
Arbeits-Branch: validation-2026-10-28

## Ziel
T11 zeigt: Im Durchschnitt sortiert das Coverage-Re-Rank schlechter als reines
OR mit BM25. Bevor der Owner es aus der Empfehlung nimmt, beantwortet T12
drei Fragen:
1. Gibt es eine Anfragengruppe, etwa kurze Anfragen, in der Re-Rank
   **weniger Fehltreffer** in den Top 10 liefert?
2. Wie oft gewinnt bzw. verliert Re-Rank pro Anfrage?
3. Schlägt eine **sanfte** Mischung aus BM25 und Abdeckung das reine OR,
   und zwar auf einem Datensatz, auf dem **nicht** abgestimmt wurde?

Der Owner will eine nachweislich bessere Suche. Deshalb zählt nur, was sich
auf den nicht abgestimmten Daten hält.

Erlaubte Dateien:
- scripts/metrics.mjs
- scripts/beir-bench.mjs
- scripts/beir-compare.mjs
- test/metrics-p10.test.mjs
- docs/VALIDATION.md

## Schritte
1. `tasks/T12/metrics-p10.test.mjs.pending` **unverändert** nach
   `test/metrics-p10.test.mjs` kopieren. Commit `T12: Schritt 1 – …`.
2. `scripts/metrics.mjs` erweitern:
   - neuer Export `precisionAtK(ranked, qrel, k)`: relevant = Wert > 0,
     geteilt durch k
   - `evaluate()` liefert zusätzlich `p10`
   - die bisherigen Felder bleiben unverändert
   
   Commit `T12: Schritt 2 – …`.
3. `scripts/beir-bench.mjs` erweitern:
   - `p10` in Tabelle und JSON pro Lane.
   - Option `--per-query FILE.jsonl`: eine Zeile pro Anfrage,
     `{ qid, terms, lanes: { <lane>: { ndcg10, p10 } } }`. Dabei ist `terms`
     die Anzahl **verschiedener** Terme aus `tokenize(query)`.
   - Die Such-SQL liest zusätzlich `rank`.
   - Neue Lanes **im Bench** (nicht in `lib/`):
     - `blend-λ` für λ ∈ {0, 0.1, 0.2, 0.5}:
       - Pool = OR-Top-500.
       - `norm = (−rank) / max(−rank im Pool)`, bei max ≤ 0 gilt `norm = 0`.
       - `cov` = Anteil der verschiedenen Query-Terme im Dokument, geprüft
         FTS-exakt mit `makeFtsTermPresent(db, 'docs', { idKey: 'rid' })`.
       - Score = `norm + λ·cov`, absteigend sortiert; bei Gleichstand gilt
         die Pool-Reihenfolge; Top 100.
     - `blendidf-λ` für λ ∈ {0.1, 0.2, 0.5}: wie oben, aber
       `cov = Σ idf(t)·present(t) / Σ idf(t)` mit
       `idf = ln((N − df + 0.5)/(df + 0.5) + 1)`. `df` ist die Trefferzahl von
       `"<term>"` im FTS5-Index, pro Term gecacht; N = Anzahl Dokumente.
   - Die bisherigen Lanes bleiben **byte-gleich** in ihren Ergebnissen.
   
   Commit `T12: Schritt 3 – …`.
4. `scripts/beir-compare.mjs <per-query.jsonl> --a <lane> --b <lane> [--json]`:
   - erste Ausgabezeile exakt `<a> vs <b>: W=<n> T=<n> L=<n>`. W heißt a hat
     höheres nDCG@10, T heißt |Δ| < 1e-9.
   - danach je eine Zeile für die Gruppen `terms 1-3`, `terms 4-6` und
     `terms 7+`, jeweils mit n, W, T, L sowie dem mittleren nDCG@10 und P@10
     beider Lanes.
   
   Commit `T12: Schritt 4 – …`.
5. **Messen auf dem GX10.** Zusätzlich FiQA laden, wie in T11:
   `curl -fsSLO https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/fiqa.zip && sha256sum fiqa.zip && unzip -qo fiqa.zip`.
   - **Abstimmung nur auf SciFact und NFCorpus:** Pro Familie (`blend`,
     `blendidf`) wählst du das λ mit dem höchsten **Mittel** der nDCG@10 über
     beide Datensätze.
   - **FiQA ist reiner Testdatensatz.** Dort laufen nur `or`, `hybrid`,
     `hybrid-fts` und die zwei gewählten Lanes, mit `--repeat 1`. Auf FiQA wird
     nichts mehr nachjustiert.
   - Für jeden Datensatz `beir-compare` mit `--a hybrid --b or` und mit
     `--a <gewähltes blend> --b or`.
6. `docs/VALIDATION.md` bekommt einen Abschnitt `## T12`:
   - FiQA mit Quelle, Lizenz, `sha256sum`-Zeile und veröffentlichtem BM25-Wert
     (Thakur et al., 2021)
   - alle Tabellen, die Compare-Ausgaben und die gewählten λ mit Begründung
     („höchstes Mittel auf SciFact+NFCorpus“)
   - am Ende **nur Fakten**: Gewinnt eine Lane auf FiQA gegen `or` bei
     nDCG@10 **und** P@10, ja oder nein, mit Zahlen. Gewinnt `hybrid` in der
     Gruppe `terms 1-3`, ja oder nein, pro Datensatz. Keine Empfehlung.
   
   Commit `T12: Schritt 6 – …`.

## Prüfung
```bash
cmp test/metrics-p10.test.mjs tasks/T12/metrics-p10.test.mjs.pending
node --test test/metrics.test.mjs test/metrics-p10.test.mjs
node scripts/beir-bench.mjs --data test/fixtures/beir-mini --repeat 1 --per-query /tmp/t12-mini.jsonl --json | tail -1 | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));const L=j.lanes;const need=['and','or','hybrid','hybrid-nofloor','hybrid-fts','blend-0','blend-0.1','blend-0.2','blend-0.5','blendidf-0.1','blendidf-0.2','blendidf-0.5'];const ok=need.every(n=>L[n])&&L.and.ndcg10===0.5&&L.or.ndcg10===1&&L.or.p10===0.1&&L.and.p10===0.05&&L['blend-0'].ndcg10===1&&L['blendidf-0.5'].ndcg10===1;console.log(Object.keys(L).join(','));process.exit(ok?0:1)"
node scripts/beir-compare.mjs /tmp/t12-mini.jsonl --a or --b and | grep -F "or vs and: W=1 T=1 L=0"
grep -E "^[0-9a-f]{64}  fiqa\.zip" docs/VALIDATION.md
grep -F "## T12" docs/VALIDATION.md
```

## Referenzwerte (Mini-Fixture, im Review von Hand nachgerechnet)
- P@10: `or` = 0.1 (je ein Treffer in den Top 10 bei 2 Anfragen),
  `and` = 0.05 (nur q2 trifft).
- Alle `blend`/`blendidf`-Lanes: nDCG@10 = 1. d1 und d2 behalten Rang 1,
  weil sie in ihrer Anfrage höchstes BM25 **und** höchste Abdeckung haben.
- `or vs and`: q1 W (1 gegen 0), q2 T. q1 hat 5 Terme (Gruppe 4–6), q2
  hat 2 (Gruppe 1–3).

## Nicht Teil dieser Task
- `lib/`, README, Empfehlungen, neue Abhängigkeiten, neuronale Modelle.
