# T15: README, CHANGELOG und package.json auf das Messergebnis umstellen

Stufe: 1 (nur Doku und Metadaten; `lib/` und Tests bleiben unverändert)
Arbeits-Branch: validation-2026-10-28
Voraussetzung: T14 ist gepusht und hat `CHECK T14: PASS`.

## Ziel
Das README behauptet heute, OR plus Coverage-Re-Rank sei besser. Die
BEIR-Messungen (T11 bis T14) widerlegen das: Am besten ist OR mit FTS5-BM25.
Das Ergebnis steht in `docs/ZIEL.md` unter „Ergebnis Englisch“.

Danach soll das Repo genau das sagen und belegen, sachlich und
nachprüfbar. Alle Belege bleiben im Repo.

Erlaubte Dateien:
- README.md
- CHANGELOG.md
- package.json

## Schritte
1. **`README.md` vollständig neu schreiben**, auf Englisch, in dieser
   Reihenfolge der Abschnitte:
   1. **Titel und Kernaussage** in 3–5 Sätzen:
      - Für natürlichsprachige Mehrwort-Anfragen an SQLite FTS5 verliert der
        übliche strikte AND-Match fast alle relevanten Dokumente.
      - Ein gequoteter OR-Match mit dem eingebauten BM25 (`ORDER BY rank`)
        war die beste der getesteten Varianten.
      - Coverage-Re-Rank, weiche BM25/Coverage-Mischungen und
        Titelgewichtung wurden gemessen und schlagen ihn nicht.
   2. **`## Quick start`** mit genau diesem Code:
      ```js
      import { DatabaseSync } from 'node:sqlite';
      import { buildOrMatch } from 'fts5-hybrid-search';

      const db = new DatabaseSync('mycorpus.db', { readOnly: true });
      const stmt = db.prepare(
        'SELECT id, content FROM docs_fts WHERE docs_fts MATCH ? ORDER BY rank LIMIT ?');
      const top10 = stmt.all(buildOrMatch('how do solar panels make electricity'), 10);
      ```
      Darunter in 2–4 Sätzen:
      - `rank` ist das eingebaute BM25 von FTS5.
      - Für Englisch wird der Index mit `tokenize='porter unicode61'` angelegt.
      - `buildOrMatch` setzt jeden Token in Anführungszeichen. FTS5-Syntax
        aus der Nutzereingabe wird dadurch nie ausgewertet
        (`AND`/`OR`/`NOT`, `col:tok`, `NEAR()`, Anführungszeichen).
      - Für bewusst strenge Suche gibt es `sanitizeMatch` (AND).
   3. **`## Measurements`** mit diesen drei Tabellen, die Werte **exakt so**,
      plus je einem Satz Kontext. Darunter ein Link auf `docs/VALIDATION.md`
      mit Befehlen, Prüfsummen und Lizenzen.
      Tabelle 1, nDCG@10 auf den BEIR-Test-Splits:
      | dataset | docs | judged queries | `and` | `or` | published BM25 (Thakur et al., 2021) |
      |---|---:|---:|---:|---:|---:|
      | SciFact | 5 183 | 300 | 0.0616 | 0.6878 | 0.665 |
      | NFCorpus | 3 633 | 323 | 0.2097 | 0.3209 | 0.325 |
      | FiQA | 57 638 | 648 | – | 0.2535 | 0.236 |
      | TREC-COVID | 171 332 | 50 | – | 0.6020 | 0.656 |

      Tabelle 2, Recall@100:
      | dataset | `and` | `or` |
      |---|---:|---:|
      | SciFact | 0.0603 | 0.9193 |
      | NFCorpus | 0.1043 | 0.2458 |

      Tabelle 3, „Tested, not recommended“: nDCG@10 auf den
      **nicht abgestimmten** Datensätzen. Abgestimmt wurde nur auf SciFact
      und NFCorpus.
      | variant | idea | FiQA | TREC-COVID |
      |---|---|---:|---:|
      | `or` (reference) | quoted OR, FTS5 BM25 | 0.2535 | 0.6020 |
      | coverage re-rank (`hybrid`) | sort by number of query terms present, BM25 breaks ties | 0.1621 | – |
      | coverage re-rank, FTS-exact (`hybrid-fts`) | same, presence checked by FTS5 (Porter-aware) | 0.1732 | 0.4791 |
      | soft blend (`blend-0.1`) | normalized BM25 + 0.1 · coverage | 0.2540 | 0.5997 |
      | IDF-weighted blend (`blendidf-0.1`) | same, coverage weighted by IDF | 0.2548 | 0.5915 |
      | title weight (`or-title-3`) | `bm25(t, 0, 3, 1)`: title counts 3× | – | 0.5893 |

      Darunter in 1–2 Sätzen das Kriterium E5 aus `docs/ZIEL.md`:
      - übernommen nur bei ≥ +0.01 nDCG@10 auf **jedem** nicht abgestimmten
        Datensatz,
      - P@10 nicht schlechter,
      - p95 höchstens das 3-fache von `or`,
      - höchstens etwa 50 Zeilen.
      
      Keine Variante erfüllt es. FiQA hat fast keine Titel, deshalb gibt es
      dort keinen Wert für `or-title-3`.

      Ein Satz zur Latenz von `or`: p95 26.26 ms auf FiQA und 83.63 ms auf
      TREC-COVID, In-Memory-Datenbank, eine Maschine.
   4. **`## Other exports`**:
      - `coverageRerank`, `hybridSearch` und `makeFtsTermPresent` bleiben
        exportiert, damit die Messungen reproduzierbar sind. Sie sind
        „measured, not recommended“, mit Verweis auf Tabelle 3.
      - Ein Satz: `makeFtsTermPresent` hatte unter `node:sqlite` einen
        Fehler. Der ist seit T14 behoben, siehe CHANGELOG.
   5. **`## Reproduce`**:
      - Download, Prüfsumme und Bench am Beispiel SciFact:
        `curl -fsSLO https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip`,
        `sha256sum scifact.zip` (Vergleich mit `docs/VALIDATION.md`),
        `unzip -qo scifact.zip`,
        `node scripts/beir-bench.mjs --data scifact --repeat 3 --json`.
      - Dazu `npm test`, und `npm run bench` als kleine Demo: 8 Dokumente,
        8 kuratierte Umschreibungen, AND verfehlt 2 von 8. Diese Angabe
        prüfst du selbst mit `npm run bench`.
   6. **`## How this was built`** in 2–3 Sätzen:
      - Jede Änderung ist eine Task-Datei in `tasks/` mit eigener Prüfung
        (`npm run check -- tasks/<file>.md`).
      - Umgesetzt hat sie ein lokaler Coding-Agent, geprüft wurde jeder Push
        unabhängig.
      - Das Review von T12 fand den `makeFtsTermPresent`-Fehler, den T14
        behoben hat.
   7. **`## Limitations`**:
      - nur Englisch mit Porter; Deutsch folgt
      - rein lexikalisch: keine Synonyme über das Stemming hinaus
      - BEIR-Daten werden nicht mitgeliefert (Lizenzen siehe
        `docs/VALIDATION.md`)
      - Latenzen stammen von einer Maschine
   8. **`## License`**: MIT
   
   **Entfernen:** die alte Kopftabelle, den Block „Private-corpus
   measurement“ und die Garantien zu AND-Floor und Coverage. Andere Zahlen
   als oben kommen nicht hinein. Versionsnummern schreibst du ohne
   Nachkommastellen, z. B. „Node 22 or newer“.

   Commit `T15: Schritt 1 – …`.
2. **`CHANGELOG.md`:** Ganz oben, über `## 0.1.1`, kommt
   `## 0.2.0 (unreleased)` mit diesen Unterabschnitten:
   - `### Changed: recommendation is plain OR with FTS5 BM25 (docs only, no API change)`
     mit 2–4 Zeilen:
     - Das README wurde um die BEIR-Messungen herum neu geschrieben.
     - Die drei Re-Rank-Exporte bleiben und sind als „measured, not
       recommended“ dokumentiert.
     - Die Private-Corpus-Messung ist aus dem README entfernt: nicht
       reproduzierbar, ersetzt durch öffentliche Daten.
   - `### Added: BEIR validation` mit 2–3 Zeilen:
     - `scripts/beir-bench.mjs`, `scripts/beir-compare.mjs`,
       `scripts/metrics.mjs` und `docs/VALIDATION.md`
     - geprüft auf SciFact, NFCorpus, FiQA und TREC-COVID
   
   Commit `T15: Schritt 2 – …`.
3. **`package.json`:** Nur drei Felder ändern sich, jedes in **einer**
   Zeile. Alles andere bleibt Zeichen für Zeichen gleich.
   - `"version": "0.2.0"`
   - `"description"`: ein Satz ohne „re-rank“, z. B. `"Injection-safe OR match builder for SQLite FTS5 with BM25 ranking, validated on four BEIR datasets against strict AND and several re-rank variants."`
   - `"keywords"`: `["sqlite", "fts5", "full-text-search", "retrieval", "bm25", "beir"]`
   
   Commit `T15: Schritt 3 – …`.

## Prüfung
```bash
node -e "const fs=require('fs');const r=fs.readFileSync('README.md','utf8'),v=fs.readFileSync('docs/VALIDATION.md','utf8');const miss=[...new Set(r.match(/\b\d+\.\d{2,4}\b/g)||[])].filter(n=>!v.includes(n));console.log(miss.length?'not in VALIDATION.md: '+miss.join(' '):'all README numbers found in docs/VALIDATION.md');process.exit(miss.length?1:0)"
grep -F "buildOrMatch('how do solar panels make electricity')" README.md
grep -F "ORDER BY rank" README.md
grep -F "| IDF-weighted blend (\`blendidf-0.1\`) | same, coverage weighted by IDF | 0.2548 | 0.5915 |" README.md
grep -F "docs/VALIDATION.md" README.md
grep -F "## How this was built" README.md
! grep -F "Private-corpus" README.md
! grep -iE "recruiter|portfolio|showcase|production-grade|battle-tested" README.md
grep -F "## 0.2.0 (unreleased)" CHANGELOG.md
grep -F "### Changed: recommendation is plain OR with FTS5 BM25 (docs only, no API change)" CHANGELOG.md
node -e "const a=JSON.parse(require('child_process').execSync('git show e81280c:package.json'));const b=JSON.parse(require('fs').readFileSync('package.json','utf8'));const ok=b.version==='0.2.0'&&!/re-?rank/i.test(b.description)&&JSON.stringify(b.keywords)===JSON.stringify(['sqlite','fts5','full-text-search','retrieval','bm25','beir']);for(const k of ['description','version','keywords']){delete a[k];delete b[k]}process.exit(ok&&JSON.stringify(a)===JSON.stringify(b)?0:1)"
test "$(git diff --numstat e81280c -- package.json | cut -f1)" -le 3
git diff --quiet e81280c -- lib test scripts
```

## Referenzwerte
- Alle Tabellenwerte stehen wörtlich in `docs/VALIDATION.md`: T11-Abschnitte
  für `and`/`or` und die veröffentlichten Werte, T12 für `hybrid` auf FiQA,
  T13 für `or-title-3`, T14 für `hybrid-fts` und die Blends.
- `npm run bench` (im Review gelaufen): `fts-and` hit@k 0.75, also 6 von 8;
  `fts-or` und `fts-hybrid` 1.

## Nicht Teil dieser Task
- `lib/`, Tests, Skripte, Paketname und Repo-Name (die ändern sich erst im
  neuen Repo), Deutsch.
