# T24: Adaptive Suche – Erweiterung nur bei dünn besetzten Anfragen

Stufe: 2 (Bench-Lanes mit Test, danach Messung; kein Library-Code)
Arbeits-Branch: adaptive-2026-10-30

## Ziel
Trigram und Stemmer helfen bei kleinen deutschen Korpora und schaden bei
großen (T19, T21, T23). Vermutete Ursache: Die Erweiterung lohnt, solange die
einfache OR-Anfrage wenige Kandidaten hat, und bringt Rauschen, wenn es viele
sind. Eine adaptive Lane entscheidet deshalb **pro Anfrage**: Trifft das
einfache OR auf dem `unicode61`-Index höchstens τ Dokumente (gezählt mit
`LIMIT τ+1`, bricht also früh ab), wird erweitert, sonst bleibt es bei `or`.
Damit könnte eine Methode in jeder Größenklasse gut sein.

Erlaubte Dateien:
- scripts/beir-bench.mjs
- test/adaptive.test.mjs
- test/fixtures/beir-de-adaptive/
- docs/VALIDATION.md
- README.md
- CHANGELOG.md

## Vorgaben
- `beir-bench --adaptive-tau <n,...>` (nur Deutsch) erzeugt je n die Lanes
  `adaptive-trigram-<n>` (Erweiterung `or-trigram`) und `adaptive-stem-<n>`
  (Erweiterung `hybrid-expanded`). Ohne Flag ändert sich nichts.
- **Abstimmung von τ (vor dem Test festgelegt):** Raster 10, 30, 100, 300,
  1 000, 3 000, 10 000. Abstimmsätze: GermanDPR (Auswahldatensatz seit T16)
  und ein eigener mMARCO-de-Split mit den Fragen 1 001 bis 2 000 (in
  qrels-Reihenfolge) bei 10 000, 100 000 und 1 000 000 Abschnitten (eigene
  Teilmengen mit `subsample-beir --queries 2000`). Gewählt wird je Lane-Familie
  das τ mit dem höchsten mittleren ΔnDCG@10 gegen `or` über diese vier Sätze,
  alle gleich gewichtet. `--stopwords lib`, `--repeat 1`.
- **Test:** GovService und die bisherigen Teilmengen (Fragen 1 bis 1 000) bei
  10 000, 100 000 und 1 000 000, alle deutschen Lanes in **einem** Lauf je
  Satz (`--repeat 2` bzw. 3 bei GovService). Dieser Lauf misst auch die
  Stemmer-Lanes gemeinsam mit `or` (offen aus T22).
- Bewertung nach E5 je Größenklasse (T22, T23). GermanDPR zählt für die
  adaptiven Lanes als abgestimmt.

## Prüfung
```bash
git diff --quiet origin/master -- lib package.json
node scripts/beir-bench.mjs --data test/fixtures/beir-de-adaptive --lang de --stemmer test/fixtures/de/stub-stemmer.mjs --stopwords lib --adaptive-tau 2 --repeat 1 --json | tail -1 | grep -F '"adaptive-trigram-2":{"ndcg10":0.5436,'
grep -F "## T24 – Adaptive lanes (expansion for sparse queries)" docs/VALIDATION.md
! grep -nE "/home/|/Users/" docs/VALIDATION.md README.md
```

## Referenzwerte
- Fixture `beir-de-adaptive` (von Hand): `or` 0.3333, `or-trigram` 0.5436,
  `hybrid-expanded` 0.6667, `adaptive-trigram-1` 0.6667,
  `adaptive-trigram-2` und `-10` 0.5436, `adaptive-stem-1` und `-10` 0.6667.

## Nicht Teil dieser Task
- Adaptive Lanes in die Library übernehmen (erst nach E5 je Klasse).
- Englisch (dort hilft keine Erweiterung).
