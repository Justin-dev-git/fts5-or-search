# T22: E5 mit Latenz-Untergrenze (Neubewertung ohne neue Messung)

Stufe: 1 (nur Doku; keine Messung, kein Code)
Arbeits-Branch: e5-latency-2026-10-30

## Ziel
Der Latenzteil von E5 („p95 höchstens das 3-Fache von `or`“) ließ bei
kleinen Korpora Unterschiede von Bruchteilen einer Millisekunde entscheiden.
Auf GovService liegt die p95 von `or` bei 0.24 ms, die Grenze also bei
0.72 ms. Der Owner hat die Anpassung freigegeben: Künftig gilt das 3-Fache
**oder** 10 ms mehr als `or`, es zählt das Größere, beide im selben Lauf
gemessen. Ein Datensatz in mehreren Größen zählt je Größe. Alle vorhandenen
Messungen werden damit neu bewertet.

Erlaubte Dateien:
- docs/ZIEL.md
- docs/VALIDATION.md
- README.md
- CHANGELOG.md

## Vorgaben
- `docs/ZIEL.md`: E5-Zeile neu, Absatz „Änderung an E5“ mit Begründung,
  Abschnitt „Ergebnis nach T22“.
- `docs/VALIDATION.md`: Abschnitt
  `## T22 – E5 with a latency floor (re-assessment, no new measurement)`.
  Tabelle je deutscher Erweiterung und Testsatz (T21-Dateien, `STOPWORDS_DE`)
  mit Budget und Urteil je Kriterium. Lanes aus zwei Läufen kennzeichnen.
- README und CHANGELOG: E5-Definition und deutsche Begründung anpassen.
  Jede Zahl muss in `docs/VALIDATION.md` stehen.

## Prüfung
```bash
git diff --quiet origin/master -- lib scripts test package.json
grep -F "oder** höchstens 10 ms mehr als" docs/ZIEL.md
grep -F "## T22 – E5 with a latency floor (re-assessment, no new measurement)" docs/VALIDATION.md
sed -n '/^## T22/,$p' docs/VALIDATION.md | grep -F '| `or-trigram` | mMARCO-de 100 000 | +0.0121 | +0.0017 | 21.30 / 2.24 | 12.24 | yes | yes | no | not met |'
sed -n '/^## T22/,$p' docs/VALIDATION.md | grep -F '| `hybrid-expanded` | mMARCO-de 1 000 000 | −0.0042 | −0.0009 | 37.14 / 24.72 (2 runs) | 74.16 | no | no | yes | not met |'
grep -F "or at most 10 ms more (whichever is larger, same run" README.md
! grep -nE "/home/|/Users/" docs/VALIDATION.md README.md
```

## Referenzwerte
- Untuned Testsätze, die die messbaren Teile von E5 erfüllen (von 5;
  `or-stem` von 4): `or-stem` 1, `or-trigram` 3, `hybrid` 2,
  `hybrid-expanded` 4, `hybrid-trigram` 3. Keine Lane erfüllt alle.
- Englisch: keine Änderung (jede Erweiterung scheitert an nDCG@10).

## Nicht Teil dieser Task
- Neue Messungen. Die Stemmer-Lanes sind nach dem T21-Review in einem
  zweiten Lauf gemessen; ein Lauf gemeinsam mit `or` folgt, wenn die
  Maschine frei ist.
