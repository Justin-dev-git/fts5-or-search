# T25: adaptiveSearch in der Library und Bestätigung auf unabhängigen Daten

Stufe: 2 (Library-Funktion mit Test, danach Messung)
Arbeits-Branch: adaptive-lib-2026-10-30

## Ziel
T24 hat gezeigt: Eine Erweiterung nur für dünn besetzte Anfragen
(`adaptive-stem-1000`) erfüllt die messbaren Teile von E5 in jeder
Größenklasse. Die Library bekommt dafür `adaptiveSearch`, **ohne eigene
Abhängigkeit**: Die Erweiterung (z. B. ein Stemmer) übergibt der Aufrufer.
Danach wird der Gewinn auf Daten bestätigt, an denen nichts abgestimmt wurde.

Erlaubte Dateien:
- lib/or-search.mjs
- scripts/beir-bench.mjs
- test/adaptive-search.test.mjs
- docs/VALIDATION.md
- docs/ZIEL.md
- README.md
- CHANGELOG.md

## Vorgaben
- `adaptiveSearch(search, countUpTo, query, getText, { k, tau, expand, stopwords })`
  (höchstens etwa 50 Zeilen). Bench-Lane `adaptive-search-<τ>` ruft sie mit
  german-fts5-stemmer auf (k = 10, Pool 50).
- **Parität:** `adaptive-search-1000` liefert auf den T24-Testsätzen pro Frage
  dieselbe nDCG@10 wie `adaptive-stem-1000`.
- **Bestätigung, τ = 1 000 fest (nichts abgestimmt):**
  - WebFAQ-de (`PaDaS-Lab/webfaq-retrieval`, `deu`, CC BY 4.0, Revision
    `1abff20b9ea37abeec151bd8bcfa78c31a48f9fb`): voller Korpus (891 201
    Antworten, Klasse groß) und eine Teilmenge mit 100 000 (Klasse mittel),
    je die ersten 3 000 Testfragen in qrels-Reihenfolge.
  - GerDaLIRSmall (`mteb/GerDaLIRSmall`, MIT, Revision
    `b199f38071bc06a2cb86c4c10d57ecee6c46056a`): 9 969 Entscheidungen
    (Klasse klein), die ersten 1 000 Testfragen. Die Fragen sind lange
    Absätze; erwartet ist dort vor allem „schadet nicht“.
  - Lanes: `and`, `or`, `or-stem`, `or-trigram`, `hybrid-expanded`,
    `adaptive-search-1000`; `--stopwords lib`; alle in einem Lauf je Satz,
    `--repeat 2`. E5 je Klasse und 95-%-Bootstrap-Intervalle.
- README: Die Empfehlung wird nur geändert, wenn die Bestätigung hält.

## Prüfung
```bash
git diff --quiet origin/master -- package.json
node --test test/adaptive-search.test.mjs
grep -F "## T25 – adaptiveSearch (library) and confirmation" docs/VALIDATION.md
! grep -nE "/home/|/Users/" docs/VALIDATION.md README.md
```

## Nicht Teil dieser Task
- Einen Stemmer in die Library aufnehmen.
