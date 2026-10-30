# T27: README mit Einleitung, Lesehilfe, OpenClaw-Fallstudie und Fazit

Stufe: 1 (nur Doku; keine Messung, kein Code)
Arbeits-Branch: readme-2026-10-30 (von master)
Voraussetzung: T20, T25 gemergt; T26 (Präfix-Abfragen) gemergt oder ihre Ergebnisse eingetragen.

## Ziel
Die README soll ohne Vorwissen lesbar sein: eine Einleitung (Problem, Frage, Vorgehen), eine Lesehilfe
(Methode in fünf Schritten und Glossar aller Begriffe), eine Fallstudie zu OpenClaw (wo FTS5 für Memory und Kontext
genutzt wird, was der lokale Patch misst – nur Gesamtzahlen) und ein Fazit (was hält, was nicht, verbleibender
Zielkonflikt, Empfehlung, Grenzen). Der bisherige Abschnitt „Limitations“ geht im Fazit auf.

Erlaubte Dateien:
- README.md
- docs/VALIDATION.md
- CHANGELOG.md

## Vorgaben
- `docs/VALIDATION.md`: Abschnitt `## T28 – Case study: FTS5 in OpenClaw memory and context search (aggregate numbers)`
  mit Versionen, Code-Fakten, Nutzung, Messungen (Methode, Tabelle) und Grenzen. Keine Anfragen, Dokumente oder Inhalte.
- README: `## Introduction`, `## How to read the results`, `## Case study: OpenClaw memory and context`,
  `## Conclusion`. Jede Zahl muss in `docs/VALIDATION.md` stehen.
- Vor dem Merge: unabhängiges Review von README und VALIDATION (Zahlen gegen VALIDATION, Verständlichkeit).

## Prüfung
```bash
git diff --quiet origin/master -- lib scripts test package.json
grep -F "## Introduction" README.md
grep -F "## How to read the results" README.md
grep -F "## Case study: OpenClaw memory and context" README.md
grep -F "## Conclusion" README.md
! grep -F "## Limitations" README.md
grep -F "## T28 – Case study: FTS5 in OpenClaw memory and context search (aggregate numbers)" docs/VALIDATION.md
! grep -F "<!-- T26" README.md
! grep -nE "/home/|/Users/" docs/VALIDATION.md README.md
```

## Nicht Teil dieser Task
- Neue Messungen, Code, Änderungen der Empfehlung über die Messergebnisse hinaus.
