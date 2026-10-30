# T23: E5 je Größenklasse (Neubewertung ohne neue Messung)

Stufe: 1 (nur Doku; keine Messung, kein Code)
Arbeits-Branch: e5-latency-2026-10-30 (zusammen mit T22)
Voraussetzung: T22.

## Ziel
Trigram und Stemmer helfen bei kleinen deutschen Korpora deutlich und bei
großen nicht (T19, T21). E5 wird deshalb je Größenklasse angewendet: klein
unter 50 000 Dokumente, mittel 50 000 bis 500 000, groß darüber. Der Owner
hat das freigegeben. Weil die Klassengrenzen erst nach den Messungen
festgelegt wurden, ist jede Klassenempfehlung vorläufig, bis ein weiterer,
unabhängiger Testsatz der Klasse sie bestätigt.

Erlaubte Dateien:
- docs/ZIEL.md
- docs/VALIDATION.md
- README.md
- CHANGELOG.md

## Vorgaben
- `docs/ZIEL.md`: E5-Zeile um die Klassen ergänzen, Absatz „Änderung an E5
  (T23)“, Abschnitt „Ergebnis nach T23“.
- `docs/VALIDATION.md`: Abschnitt
  `## T23 – E5 per size class (re-assessment, no new measurement)` mit der
  Zuordnung der Testsätze, dem Urteil je Lane und Klasse (aus T22) und der
  englischen Übersicht (aus T14 und T19).
- README und CHANGELOG: Empfehlung je Klasse, als vorläufig gekennzeichnet.
  Jede Zahl muss in `docs/VALIDATION.md` stehen.

## Prüfung
```bash
git diff --quiet origin/master -- lib scripts test package.json
grep -F "E5 gilt **je Größenklasse** (seit T23)" docs/ZIEL.md
grep -F "## T23 – E5 per size class (re-assessment, no new measurement)" docs/VALIDATION.md
sed -n '/^## T23/,$p' docs/VALIDATION.md | grep -F '| `or-trigram` | met on 3 of 3 (+0.0543, +0.0349, +0.0255) | not met (p95 21.30 ms, budget 12.24 ms) | not met (+0.0007) | none: tokenizer option |'
sed -n '/^## T23/,$p' docs/VALIDATION.md | grep -F "| large | mMARCO 1 000 000 | \`blendidf-0.1\` | +0.0037 | T19 |"
grep -F "**Trigram for small corpora (provisional).**" README.md
! grep -nE "/home/|/Users/" docs/VALIDATION.md README.md
```

## Referenzwerte
- Deutsch klein: `or-trigram`, `hybrid-trigram`, `hybrid-expanded` erfüllen
  E5 auf allen drei Testsätzen; empfohlen `or-trigram` (kein Library-Code).
- Deutsch mittel: nur `hybrid-expanded` (ein Testsatz, Zusatzpaket).
  Deutsch groß: keine Lane. Englisch: in keiner Klasse eine Lane.

## Nicht Teil dieser Task
- Neue Messungen, ein weiterer Testsatz je Klasse (GerDaLIR o. ä.), Code.
- Eine automatische Wahl der Suchmethode (adaptiv); sie bräuchte eine eigene
  Messung.
