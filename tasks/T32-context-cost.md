# T32: Kontextkosten der Retrieval-Seite – was „findet besser“ bei fester Trefferzahl bedeutet

Stufe: 2 (Bench-Erweiterung + Messung; nur CPU, öffentliche Daten)
Arbeits-Branch: context-cost-2026-10-31 (von prefix-lib-2026-10-31, nach dem Merge von T31 mit master zusammengeführt)
Voraussetzung: T31 (Lane `or-prefix-4` über die Library-Option).

## Ziel
Ein Agent bekommt je Suche eine feste Zahl von Treffern (OpenClaw-Memory-Suche: Top 6). Eine bessere Rangfolge
verkleinert daher nicht den Kontext je Suche; sie erhöht die Chance, dass das Gesuchte unter diesen Treffern ist.
T32 misst das auf der Retrieval-Seite: Rang des ersten relevanten Dokuments, die Zeichen bis dorthin und, in einem
ausdrücklich benannten Agentenmodell mit k = 6 und k = 10 Treffern je Aufruf, Suchaufrufe und gelesene Zeichen.
Nicht gemessen wird der Gesamtkontext eines LLM-Agenten (Systemprompt, Werkzeugbeschreibungen, Umformulierungen,
Antworten); eine Ende-zu-Ende-Messung mit einem echten Agenten plant der Owner getrennt (GPU) – im Repo nur als offene,
geplante Frage ohne Zahlen.

Erlaubte Dateien:
- scripts/beir-bench.mjs
- scripts/context-cost.mjs
- test/
- docs/VALIDATION.md
- README.md
- CHANGELOG.md

## Vorgaben
- Bench: `--context-cost <datei>` schreibt je bewerteter Frage und Lane `first` (Rang des ersten Dokuments mit
  Relevanz > 0 in der Liste der höchstens 100 Treffer, sonst null) und `chars` (Länge jedes zurückgegebenen
  Dokuments in Zeichen = Codepoints, wie indexiert: Titel, Zeilenumbruch, Text; in Rangfolge). Rangfolgen und
  bestehende Ausgaben bleiben unverändert.
- Auswertung `scripts/context-cost.mjs`:
  - ohne Annahmen: Anteil mit erstem relevanten Dokument auf Rang 1, in den Top 6, Top 10, in der Liste (≤ 100),
    Zahl nicht gefunden und Zahl leerer Trefferlisten; Median-Rang; Zeichen der Dokumente auf Rang 1..r.
  - Agentenmodell (Annahmen benannt): jeder Aufruf liefert k Treffer, der Agent liest der Reihe nach und ruft für die
    nächsten k erneut auf, bis das erste relevante Dokument kommt (Blättern, keine Umformulierung); Schnipsel = ganzes
    Dokument. Aufrufe = ceil(r/k), Schnipsel = min(Aufrufe·k, Treffer), Zeichen dieser Schnipsel. Nicht Gefundenes
    wird getrennt gezählt und nie gemittelt.
  - Paare `a:b`: Δ = Mittel der Differenzen je Frage (b − a), 95-%-Intervall aus gepaartem Bootstrap (4 000
    Ziehungen, mulberry32, Seed 32 je Paar und Kennzahl neu). Trefferanteile über alle Fragen; Aufrufe und Zeichen
    nur über Fragen, die beide Lanes in ihrer Liste finden.
  - Tokens werden nicht gemessen; höchstens als ausdrücklich benannte Näherung (≈ Zeichen / 4).
- Messung: Englisch `and,or` auf SciFact und NFCorpus; Deutsch `and,or,or-prefix-4` mit `--stopwords lib` auf
  GermanDPR, GovService, WebFAQ-de 100 000 und mMARCO-de 100 000. Paare `and:or` und `or:or-prefix-4`.
- `docs/VALIDATION.md`: Abschnitt „## T32 – Context cost of the retrieval side“ (Methode, Annahmen, Tabellen,
  Fakten). README: Absatz zur Bedeutung von „findet besser“ für einen Agenten, mit gemessenen Zahlen und dem
  ausdrücklichen Hinweis, dass das die Retrieval-Seite ist und nicht der Gesamtkontext eines LLM-Agenten.
  Jede Zahl der README steht in `docs/VALIDATION.md` oder `docs/ZIEL.md`.
- Release: gemeinsam mit T31 als 0.4.0, falls T31 noch nicht veröffentlicht ist (CHANGELOG-Eintrag im Abschnitt
  0.4.0); sonst 0.4.1.

## Prüfung
```bash
npm test
node --test test/context-cost.test.mjs
git diff --quiet origin/master -- lib
grep -F "## T32 – Context cost of the retrieval side" docs/VALIDATION.md
grep -F "not the context of an LLM agent" README.md
grep -F "T32" CHANGELOG.md
node -e "const fs=require('fs');const strip=s=>s.replace(/\`\`\`[\s\S]*?\`\`\`/g,'');const r=strip(fs.readFileSync('README.md','utf8'));const ref=fs.readFileSync('docs/VALIDATION.md','utf8')+fs.readFileSync('docs/ZIEL.md','utf8');const ok=new Set(['22.13','2021','0.4.0','0.3.0','0.2.0']);const bad=[...new Set(r.match(/\d{1,3}(?: \d{3})+(?:\.\d+)?|\d+\.\d+(?:\.\d+)?|\d{3,}/g))].filter(n=>!ok.has(n)&&!ref.includes(n));if(bad.length){console.error(bad);process.exit(1)}"
! grep -nE "/home/|/Users/" docs/VALIDATION.md README.md
```

## Nicht Teil dieser Task
- Ende-zu-Ende-Messung mit einem LLM-Agenten (Owner, GPU); Änderungen an `lib/`; neue Empfehlungen.
