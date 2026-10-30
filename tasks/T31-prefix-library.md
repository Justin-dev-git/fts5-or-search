# T31: Präfix-Abfragen als Library-Option, Gleichheit mit T26, FTS5-Präfix-Index gemessen

Stufe: 2 (Library-Option + Messung)
Arbeits-Branch: prefix-lib-2026-10-31 (von master)
Voraussetzung: T26 gemergt.

## Ziel
`or-prefix-4` erfüllte in T26 die messbaren Teile von E5 in den Klassen mittel und groß; laut T26 folgt die
Library-Option getrennt. Danach gibt es `buildOrMatch(q, { stopwords, prefixMin: 4 })`, die Bench-Lane nutzt sie (pro
Frage gleich wie T26), und es ist gemessen, ob der FTS5-Präfix-Index (`prefix='…'` beim Anlegen) die Latenz senkt
und was er an Größe kostet. Die Empfehlung wird nur geändert, wenn E5 damit vollständig erfüllt ist.

Erlaubte Dateien:
- lib/or-search.mjs
- scripts/beir-bench.mjs
- test/
- docs/VALIDATION.md
- docs/ZIEL.md
- README.md
- CHANGELOG.md

## Vorgaben
- `buildOrMatch(query, { stopwords, prefixMin })`: Tokens aus nur Buchstaben mit mindestens `prefixMin` Zeichen
  werden zu `"wort"*`, alle anderen bleiben exakt; ohne `prefixMin` (oder 0) Ausgabe byte-gleich wie bisher;
  ungültige Werte (keine nicht-negative ganze Zahl) werfen. Weiter injection-sicher (das `*` setzt nur die Library).
- Bench: `or-prefix-<n>` nutzt `buildOrMatch(..., { prefixMin: n })`. Gleichheit: nDCG@10 pro Frage identisch zu T26
  auf mindestens einem Satz je Klasse mittel/groß (WebFAQ-de 100 000, mMARCO-de 1 000 000).
- Präfix-Index: Bench-Option `--fts-prefix '<längen>'` legt den `unicode61`-Index mit `prefix='<längen>'` an.
  Messung auf WebFAQ-de 891 201 und mMARCO-de 1 000 000: `or` und `or-prefix-4` ohne Index sowie mit
  `prefix='4'` und `prefix='4 5 6 7 8'`; Latenz (p50/p95), Indexgröße, Bauzeit; nDCG@10 muss gleich bleiben.

## Prüfung
```bash
npm test
node -e "import('./lib/or-search.mjs').then(m=>{const de={stopwords:m.STOPWORDS_DE};if(m.buildOrMatch('Wo beantrage ich den Hundeausweis',{...de,prefixMin:4})!=='(\"beantrage\"* OR \"hundeausweis\"*)')process.exit(1);if(m.buildOrMatch('Fehler E4512',{...de,prefixMin:4})!=='(\"fehler\"* OR \"e4512\")')process.exit(2);if(m.buildOrMatch('Wo beantrage ich den Hundeausweis',de)!=='(\"beantrage\" OR \"hundeausweis\")')process.exit(3)})"
grep -F "## T31 – Prefix queries in the library" docs/VALIDATION.md
! grep -nE "/home/|/Users/" docs/VALIDATION.md README.md
```

## Nicht Teil dieser Task
- Präfix für `sanitizeMatch`, `adaptiveSearch` oder Englisch; npm-Veröffentlichung.
