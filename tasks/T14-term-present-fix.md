# T14: makeFtsTermPresent-Fehler beheben und neu messen

Stufe: 2 (Fehlerbehebung in `lib/` mit Test, danach Messung)
Arbeits-Branch: validation-2026-10-28
Voraussetzung: T13 ist gepusht und hat `CHECK T13: PASS`.

## Ziel
Im Review von T12 fiel ein Fehler in `lib/hybrid.mjs` auf. `makeFtsTermPresent`
prüft nicht die übergebene Zeile, sondern antwortet „vorhanden“, sobald der
Term **irgendwo** im Index vorkommt. Die Ursache: `node:sqlite` bindet
JS-Zahlen als REAL, und FTS5 verwirft eine Bedingung `rowid = <REAL>` neben
`MATCH`. Unabhängig nachgestellt mit SQLite 3.53.1 (Python) und 3.53.4
(Node 22):
`MATCH '"wind"' AND rowid = 1` liefert Zeile 2 statt nichts.

Folgen für die bisherigen Messungen:
- Die FTS-exakte Abdeckung war pro Anfrage konstant.
- Deshalb waren alle `blend-*`/`blendidf-*`-Lanes identisch mit `or`. Die
  Aussage aus T12, die Abdeckung falle entlang der BM25-Reihenfolge monoton,
  ist ein Artefakt dieses Fehlers.
- `hybrid-fts` war in Wahrheit „AND-Top-k zuerst, dann OR-Reihenfolge“.

Nicht betroffen sind `and`, `or`, `hybrid`, `hybrid-nofloor` und `or-title-*`.

T14 behebt den Fehler mit einem Test, der ihn fängt, und misst die betroffenen
Lanes neu.

Erlaubte Dateien:
- test/fts-term-present.test.mjs
- lib/hybrid.mjs
- CHANGELOG.md
- docs/VALIDATION.md

## Schritte
1. `tasks/T14/fts-term-present.test.mjs.pending` **unverändert** nach
   `test/fts-term-present.test.mjs` kopieren. Vor Schritt 2 schlagen drei
   der vier Tests fehl, das ist erwartet. Commit `T14: Schritt 1 – …`.
2. Fehlerbehebung:
   - In `lib/hybrid.mjs`, `makeFtsTermPresent`, wird `${rowidCol} = ?` zu
     `${rowidCol} = CAST(? AS INTEGER)`. Sonst ändert sich nichts an der
     Funktion.
   - Darüber steht ein einzeiliger Kommentar mit dem Grund (node:sqlite
     bindet Zahlen als REAL, FTS5 ignoriert dann die rowid-Bedingung).
   - In `CHANGELOG.md` kommt unter `## 0.1.1` ein Abschnitt
     `### Fixed: makeFtsTermPresent ignored the row under node:sqlite` mit
     2–4 Zeilen: Ursache, Wirkung (konstante Abdeckung) und die Behebung.
   
   Commit `T14: Schritt 2 – …`.
3. **Messen auf dem GX10.** Die Daten liegen wie in T11 bis T13 unter
   `/tmp/beir/`. `scripts/beir-bench.mjs` wird **nicht** geändert.
   - a) **Abstimmung nur auf SciFact und NFCorpus**, je:
     `node scripts/beir-bench.mjs --data /tmp/beir/<ds> --repeat 3 --lanes or,hybrid,hybrid-fts,blend-0,blend-0.1,blend-0.2,blend-0.5,blendidf-0.1,blendidf-0.2,blendidf-0.5 --per-query /tmp/beir/<ds>.t14.jsonl --json`
     - Kontrolle: `blend-0` muss bei nDCG@10, MRR@10, Recall@100 und P@10
       exakt gleich `or` sein. Ist es das nicht: **STOPP** und melden.
     - Pro Familie (`blend`, `blendidf`) wählst du das λ > 0 mit dem
       höchsten Mittel der nDCG@10 über beide Datensätze. Bei Gleichstand
       gilt das kleinere λ.
   - b) **Testdatensätze FiQA und TREC-COVID**, je:
     `node scripts/beir-bench.mjs --data /tmp/beir/<ds> --repeat 3 --lanes or,hybrid-fts,<gewähltes blend>,<gewähltes blendidf> --per-query /tmp/beir/<ds>.t14.jsonl --json`
     Auf diesen beiden Datensätzen wird nichts nachjustiert.
   - c) Pro Datensatz (alle vier) `node scripts/beir-compare.mjs /tmp/beir/<ds>.t14.jsonl --a <lane> --b or`
     für die zwei gewählten Lanes und für `hybrid-fts`.
4. `docs/VALIDATION.md`:
   - Direkt unter jeder der vier Überschriften `## SciFact`, `## NFCorpus`,
     `## E1–E4 (docs/ZIEL.md), per dataset` und `## T12` kommt **genau**
     diese Zeile, mit Leerzeile davor und danach:
     `> Note (T14): values for hybrid-fts, blend-* and blendidf-* in this section were measured with the broken makeFtsTermPresent hook and are invalid. Valid values: section T14.`
     Sonst ändert sich an den alten Abschnitten nichts. Die alten Zahlen
     bleiben als Beleg stehen.
   - Neuer Abschnitt `## T14` am Ende:
     - Ursache und Folgen sachlich in 3–6 Sätzen, mit den Fakten aus „Ziel“
       oben.
     - Alle Tabellen und Compare-Ausgaben mit den Befehlen.
     - Die gewählten λ mit Begründung („höchstes Mittel auf
       SciFact+NFCorpus“).
     - Ein Satz zur Latenz: `blend-*`, `blendidf-*` und `hybrid-fts` stellen
       eine FTS5-Abfrage pro Term und Dokument. Ihre Latenz ist deshalb eine
       obere Schranke.
     - Am Ende **nur Fakten**, keine Empfehlung:
       - Für jede gewählte Lane und `hybrid-fts` auf FiQA **und** TREC-COVID
         gegen `or`: ΔnDCG@10, ΔP@10 und das p95-Verhältnis.
       - Pro Datensatz, ob die Lane E5 aus `docs/ZIEL.md` erfüllt, ohne das
         Zeilenkriterium.
       - Die Zeilenzahl der Funktion `blend` in `scripts/beir-bench.mjs` als
         Anhaltspunkt für das Zeilenkriterium.
       - `hybrid-fts` minus `hybrid` bei nDCG@10 auf SciFact und NFCorpus
         (Umlenkkriterium in ZIEL.md).
   
   Commit `T14: Schritt 4 – …`.

## Prüfung
```bash
cmp test/fts-term-present.test.mjs tasks/T14/fts-term-present.test.mjs.pending
node --test test/fts-term-present.test.mjs test/regression.test.mjs
grep -F "CAST(? AS INTEGER)" lib/hybrid.mjs
grep -F "### Fixed: makeFtsTermPresent ignored the row under node:sqlite" CHANGELOG.md
node scripts/beir-bench.mjs --data test/fixtures/beir-blend --repeat 1 --json | tail -1 | node -e "const L=JSON.parse(require('fs').readFileSync(0,'utf8')).lanes;const want={'or':0.6309,'hybrid-fts':1,'blend-0':0.6309,'blend-0.1':0.6309,'blend-0.2':0.6309,'blend-0.5':1,'blendidf-0.1':0.6309,'blendidf-0.2':0.6309,'blendidf-0.5':1};const bad=Object.keys(want).filter(n=>!L[n]||L[n].ndcg10!==want[n]);console.log(bad.length?'mismatch '+bad.join(','):'beir-blend ok');process.exit(bad.length?1:0)"
node scripts/beir-bench.mjs --data test/fixtures/beir-mini --repeat 1 --json | tail -1 | node -e "const L=JSON.parse(require('fs').readFileSync(0,'utf8')).lanes;const ok=L.and.ndcg10===0.5&&L.or.ndcg10===1&&L['hybrid-fts'].ndcg10===1&&L['blend-0.5'].ndcg10===1&&L['blendidf-0.5'].ndcg10===1;process.exit(ok?0:1)"
grep -F "## T14" docs/VALIDATION.md
test "$(grep -cF '> Note (T14): values for hybrid-fts, blend-* and blendidf-* in this section were measured with the broken makeFtsTermPresent hook and are invalid. Valid values: section T14.' docs/VALIDATION.md)" -eq 4
```

## Referenzwerte (im Review unabhängig gerechnet)
- Neuer Test ohne Fix: 1 von 4 grün. Mit Fix: 4 von 4 grün.
- Fixture `test/fixtures/beir-blend` (14 Dokumente, eine Anfrage
  „solar wind electricity“, relevant ist e2):
  - BM25 setzt e1 („Solar solar solar.“) vor e2, das alle drei Terme
    enthält. Damit: `or` nDCG@10 = 0.6309 (e2 auf Rang 2).
  - `norm(e2) = 2.2539 / 2.8326 = 0.7957`.
  - λ = 0.5: e2 bekommt 0.7957 + 0.5 = 1.2957, e1 bekommt 1 + 0.5/3 = 1.1667.
    e2 rückt auf Rang 1, nDCG@10 = 1.
  - λ = 0.2: e2 bekommt 0.9957, e1 bekommt 1.0667. Die Reihenfolge bleibt
    gleich (0.6309).
  - `blendidf-0.5`: cov(e1) = 1.7918 / 4.1998 = 0.4266. e2 bekommt 1.2957,
    e1 bekommt 1.2133, also e2 vorn (1).
  - **Mit dem alten Fehler bleiben `blend-0.5` und `blendidf-0.5` bei
    0.6309.**
- Mini-Fixture: unverändert gegenüber T12 und T13.

## Nicht Teil dieser Task
- `scripts/`, README, Empfehlungen, Deutsch, Beschleunigung der Abdeckung.
