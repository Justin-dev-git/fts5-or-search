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
- package.json

## Vorgaben
- `buildOrMatch(query, { stopwords, prefixMin })`: Tokens aus nur Buchstaben mit mindestens `prefixMin` Zeichen
  werden zu `"wort"*`, alle anderen bleiben exakt; ohne `prefixMin` (oder 0) Ausgabe byte-gleich wie bisher;
  ungültige Werte (keine nicht-negative ganze Zahl) werfen. Weiter injection-sicher (das `*` setzt nur die Library).
- Bench: `or-prefix-<n>` nutzt `buildOrMatch(..., { prefixMin: n })`. Gleichheit: nDCG@10 pro Frage identisch zu T26
  auf mindestens einem Satz je Klasse mittel/groß (WebFAQ-de 100 000, mMARCO-de 1 000 000).
- Präfix-Index: Bench-Option `--fts-prefix '<längen>'` legt den `unicode61`-Index mit `prefix='<längen>'` an.
  Messung auf WebFAQ-de 891 201 und mMARCO-de 1 000 000: `or` und `or-prefix-4` ohne Index sowie mit
  `prefix='4'` und `prefix='4 5 6 7 8'`; Latenz (p50/p95), Indexgröße, Bauzeit; nDCG@10 muss gleich bleiben.
  FTS5 nutzt einen Präfix-Index nur für Präfix-Abfragen genau der konfigurierten Längen: an den Daten prüfen
  (Wortlängen der Anfragen), nicht annehmen.
- Empfehlung streng nach E5 (`docs/ZIEL.md`): Hält E5 mit der Library-Option, wird Deutsch ab 50 000 Dokumenten
  `buildOrMatch(q, { stopwords: STOPWORDS_DE, prefixMin: 4 })` auf `unicode61` empfohlen; unter 50 000 ändert sich
  nichts. Der Präfix-Index wird nur als Option genannt, wenn er messbar hilft. README (Kurzfassung, deutsche
  Ergebnisse, Fazit, Quick start), `docs/ZIEL.md` („Ergebnis nach T31“), CHANGELOG, VALIDATION-Abschnitt. Jede Zahl der
  README steht in `docs/VALIDATION.md` oder `docs/ZIEL.md`.
- Release 0.4.0 (neue Library-Option): `package.json` und datierter CHANGELOG-Abschnitt `## 0.4.0 (2026-10-31)` im PR;
  GitHub-Release nach dem Merge (nicht Teil der Dateien). Kein npm.

## Prüfung
```bash
npm test
node -e "import('./lib/or-search.mjs').then(m=>{const de={stopwords:m.STOPWORDS_DE};if(m.buildOrMatch('Wo beantrage ich den Hundeausweis',{...de,prefixMin:4})!=='(\"beantrage\"* OR \"hundeausweis\"*)')process.exit(1);if(m.buildOrMatch('Fehler E4512',{...de,prefixMin:4})!=='(\"fehler\"* OR \"e4512\")')process.exit(2);if(m.buildOrMatch('Wo beantrage ich den Hundeausweis',de)!=='(\"beantrage\" OR \"hundeausweis\")')process.exit(3)})"
grep -F "## T31 – Prefix queries in the library" docs/VALIDATION.md
grep -F "## Ergebnis nach T31" docs/ZIEL.md
grep -F "prefixMin: 4" README.md
grep -F '"version": "0.4.0"' package.json
grep -F "## 0.4.0 (2026-10-31)" CHANGELOG.md
! grep -F "## Unreleased" CHANGELOG.md
node -e "const t=require('fs').readFileSync('README.md','utf8');const want=['Introduction','Results','Case study: OpenClaw memory and context','Conclusion','How to read the results','Quick start','Other exports','Reproduce','How this was built','License'];const got=[...t.matchAll(/^## (.+)$/gm)].map(m=>m[1]);if(JSON.stringify(got)!==JSON.stringify(want)){console.error(got);process.exit(1)}"
node -e "const fs=require('fs');const strip=s=>s.replace(/\`\`\`[\s\S]*?\`\`\`/g,'');const r=strip(fs.readFileSync('README.md','utf8'));const ref=fs.readFileSync('docs/VALIDATION.md','utf8')+fs.readFileSync('docs/ZIEL.md','utf8');const ok=new Set(['22.13','2021','0.4.0','0.3.0','0.2.0']);const bad=[...new Set(r.match(/\d{1,3}(?: \d{3})+(?:\.\d+)?|\d+\.\d+(?:\.\d+)?|\d{3,}/g))].filter(n=>!ok.has(n)&&!ref.includes(n));if(bad.length){console.error(bad);process.exit(1)}"
! grep -nE "/home/|/Users/" docs/VALIDATION.md README.md
```

## Nicht Teil dieser Task
- Präfix für `sanitizeMatch`, `adaptiveSearch` oder Englisch; npm-Veröffentlichung.
- README-Absatz, was „findet besser“ für einen Agenten bedeutet (→ T32, mit eigener Messung).
