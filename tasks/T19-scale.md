# T19: Skalierung – Englisch und Deutsch bis 8,8 Mio. Abschnitte

Stufe: 1 (nur Messung; Code und Tests sind im Review entstanden)
Arbeits-Branch: scale-2026-10-29

## Ziel
Wie verhalten sich die Suchen, wenn der Korpus wächst?
Gemessen wird jede Lane, die schon einmal Kandidat war, mit den damals
gewählten Parametern:
- **Englisch** (`porter unicode61`), 10 Lanes: `and`, `or`, `hybrid`,
  `hybrid-fts` (500er-Pool), `hybrid-k10`, `hybrid-nofloor-k10`,
  `hybrid-fts-k10`, `hybrid-substr-k10` (50er-Pool), `blend-0.1` und
  `blendidf-0.1`.
- **Deutsch** (`unicode61` bzw. `trigram`), 7 Lanes: `and`, `or`,
  `or-stem`, `or-trigram`, `hybrid`, `hybrid-expanded` (die Lane des
  Owners) und `hybrid-trigram`.

Gemessen werden Qualität, Latenz, Bauzeit und Indexgröße bei 10 000,
100 000, 1 000 000 und allen 8 841 823 Abschnitten. Bei den drei kleineren
Größen laufen 1000 Fragen mit 2 Wiederholungen. Bei voller Größe sind es
die ersten 300 davon mit 1 Wiederholung, sonst würde der Lauf nicht über
Nacht fertig.

Grundlage ist **mMARCO**: MS MARCO im englischen Original und in deutscher
Übersetzung, mit denselben Abschnitts-IDs und denselben Relevanzurteilen.
Beide Sprachen sehen bei jeder Größe also dieselben Abschnitte und Fragen.
Keine Lane wurde auf mMARCO abgestimmt. Für Englisch ist mMARCO der fünfte
Datensatz, für Deutsch der dritte.

Die Task hat **zwei Phasen**:
- **A** startet den langen Lauf im Hintergrund.
- **B** dokumentiert, sobald der Lauf fertig ist.

Am Code änderst du nichts.

Erlaubte Dateien:
- docs/VALIDATION.md

## Phase A – vorbereiten und starten

1. **Vorbereitung mit STOPP-Regeln:**
   ```bash
   export REPO=$(pwd)
   export STEMMER=<dein Klon von german-fts5-stemmer>/lib/stem-german.mjs
   export SCALE_DIR=<Verzeichnis auf einer echten Platte, z. B. unter deinem Home>
   mkdir -p "$SCALE_DIR"/raw "$SCALE_DIR"/beir
   findmnt -n -o FSTYPE -T "$SCALE_DIR"
   df -BG --output=avail "$SCALE_DIR" | tail -1
   free -g
   nproc; node --version; node -e "const {DatabaseSync}=require('node:sqlite');console.log('sqlite',new DatabaseSync(':memory:').prepare('select sqlite_version() v').get().v)"
   ```
   - `findmnt` meldet `tmpfs`: **STOPP**. `/tmp` liegt auf Fedora im
     Arbeitsspeicher.
   - Weniger als **80 GB** frei oder unter „available“ weniger als
     **8 GB** RAM: **STOPP**.
   - vLLM und andere Prozesse fasst du nicht an.
   - Die Ausgaben dieser Befehle hebst du für Phase B auf.
2. **Laden.** Erst die Erreichbarkeit prüfen. Liefert eine Datei keinen
   Code 200: **STOPP**.
   ```bash
   B=https://huggingface.co/datasets/unicamp-dl/mmarco/resolve/main/data
   F="google/collections/english_collection.tsv google/collections/german_collection.tsv google/queries/dev/english_queries.dev.small.tsv google/queries/dev/german_queries.dev.small.tsv qrels.dev.small.tsv"
   for u in $F; do curl -fsSIL -o /dev/null -w "%{http_code} $u\n" "$B/$u"; done
   cd "$SCALE_DIR/raw" && for u in $F; do curl -fsSLO "$B/$u"; done
   sha256sum english_collection.tsv german_collection.tsv english_queries.dev.small.tsv german_queries.dev.small.tsv qrels.dev.small.tsv | tee "$SCALE_DIR/sha256.txt"
   curl -fsS https://huggingface.co/api/datasets/unicamp-dl/mmarco | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log('revision',j.sha,'license',(j.cardData||{}).license)" | tee "$SCALE_DIR/revision.txt"
   ```
3. **Konvertieren** mit `cd "$REPO"`:
   ```bash
   node scripts/to-beir.mjs --format msmarco-tsv --in "$SCALE_DIR/raw/english_collection.tsv,$SCALE_DIR/raw/english_queries.dev.small.tsv,$SCALE_DIR/raw/qrels.dev.small.tsv" --out "$SCALE_DIR/beir/en-full" | tee "$SCALE_DIR/convert-en.txt"
   node scripts/to-beir.mjs --format msmarco-tsv --in "$SCALE_DIR/raw/german_collection.tsv,$SCALE_DIR/raw/german_queries.dev.small.tsv,$SCALE_DIR/raw/qrels.dev.small.tsv" --out "$SCALE_DIR/beir/de-full" | tee "$SCALE_DIR/convert-de.txt"
   ```
   Referenz für beide Sprachen: `docs=8841823 queries=6980 qrels=7437`.
   Abweichungen meldest du, nicht anpassen.
4. **Lauf im Hintergrund starten.** Er läuft viele Stunden, gut über Nacht:
   ```bash
   cd "$REPO" && SCALE_DIR="$SCALE_DIR" STEMMER="$STEMMER" nohup bash scripts/scale-run.sh > "$SCALE_DIR/scale-run.nohup.log" 2>&1 &
   sleep 60; tail -5 "$SCALE_DIR/results/run.log"
   ```
   Das Skript macht selbstständig:
   - die Teilmengen und den ID-Hash-Vergleich en/de
   - eine Messung pro Lane mit 6-Stunden-Limit
   - die Vergleiche und `results/summary.md`
   
   Es stoppt von selbst, wenn sich die Hashes unterscheiden (Exit 2), wenn
   weniger als 20 GB frei sind (3) oder wenn eine Lane fehlschlägt (4). Nach
   einem Neustart des Rechners startest du es einfach erneut. Fertiges wird
   übersprungen.
5. **Kurzmeldung an den Owner**, ohne Commit und ohne PR-Kommentar:
   - die Ausgaben aus den Schritten 1 bis 3
   - die letzten Zeilen von `run.log`
   
   Dann **STOPP**. Phase B beginnt erst, wenn der Owner „T19 Phase B“ sagt.

## Phase B – auswerten und dokumentieren

1. Prüfen, ob der Lauf fertig ist:
   - `tail -3 "$SCALE_DIR/results/run.log"` muss mit `DONE summary` enden.
   - Läuft er noch: Stand melden und **STOPP**.
   - Hat er mit `STOP` oder `FAIL` aufgehört: `run.log` und die zugehörige
     `.err`-Datei melden und **STOPP**.
2. **`docs/VALIDATION.md`:** Neuer Abschnitt `## T19 – Scale (MS MARCO / mMARCO)`
   am Ende, auf Englisch. Pfade schreibst du nur als `$SCALE_DIR/…`.
   - Quelle, Revision und Lizenz (`revision.txt`), dazu die fünf
     `sha256sum`-Zeilen (`sha256.txt`).
   - Die Maschine: `nproc`, Gesamt-RAM, die Node- und die SQLite-Version.
     Dazu der Hinweis, dass vLLM parallel lief.
   - Die Konverter-Zeilen (`convert-*.txt`) neben der Referenz, und die
     Teilmengen-Zeilen aus `run.log`.
   - Der Satz „id sequence identical for en and de at every size“, mit dem
     Inhalt von `results/idhash.txt`.
   - **Den Inhalt von `results/summary.md` unverändert**, also die Tabellen
     pro Sprache.
   - Alle `results/compare-*.txt` vollständig.
   - Den Befehl aus Phase A, Schritt 4. Für jede Lane mit `timeout` in der
     Tabelle den Hinweis, dass sie das 6-Stunden-Limit überschritten hat.
   - Plausibilität bei voller Größe, als Differenz:
     - `or` MRR@10 gegen die veröffentlichten BM25-Werte von mMARCO
       (Bonifacio et al., 2021): Englisch 0.184, Deutsch (Google) 0.136
     - Der Hinweis, dass dort alle 6980 Fragen und Pyserini liefen, hier 300
       Fragen und FTS5.
   - Am Ende **nur Fakten**, keine Empfehlung:
     - Faktor von p95 und von der Indexgröße zwischen 100 000 und voller
       Größe, pro Lane. Dazu der Hinweis 300 statt 1000 Fragen bei voller
       Größe.
     - Verhältnis trigram zu unicode61 bei voller Größe.
     - ΔnDCG@10 und ΔP@10 gegen `or` für jede Lane und jede Größe, in
       beiden Sprachen.
     - ΔnDCG@10 von `hybrid-expanded` und von `hybrid-trigram` gegen
       `or-trigram`.
     - Bei voller Größe lief 1 Wiederholung statt 2.
   
   Commit `T19: Schritt B2 – …`.
3. Gate, Push und Report nach AGENTS.md, als Kommentar auf PR #2.

## Prüfung
```bash
git diff --quiet 3f01f55 -- lib scripts test package.json
grep -F "## T19 – Scale (MS MARCO / mMARCO)" docs/VALIDATION.md
grep -E "^[0-9a-f]{64}  .*english_collection\.tsv" docs/VALIDATION.md
grep -E "^[0-9a-f]{64}  .*german_collection\.tsv" docs/VALIDATION.md
grep -E "^[0-9a-f]{64}  .*qrels\.dev\.small\.tsv" docs/VALIDATION.md
grep -F "id sequence identical for en and de at every size" docs/VALIDATION.md
sed -n '/^## T19/,$p' docs/VALIDATION.md | grep -F "or-trigram vs or: W="
sed -n '/^## T19/,$p' docs/VALIDATION.md | grep -F "hybrid-expanded vs or-trigram: W="
sed -n '/^## T19/,$p' docs/VALIDATION.md | grep -F "hybrid-k10 vs or: W="
sed -n '/^## T19/,$p' docs/VALIDATION.md | grep -F "blend-0.1 vs or: W="
sed -n '/^## T19/,$p' docs/VALIDATION.md | grep -E "^\| all \| [0-9]+ \| 300 \| or \|"
! grep -nE "/home/|/Users/" docs/VALIDATION.md
```

## Referenzwerte
- **Konvertierung**, je Sprache: `docs=8841823 queries=6980 qrels=7437`
  (MS MARCO passage, dev small).
- **Veröffentlichte BM25-MRR@10** auf dev, aus mMARCO (Bonifacio et al.,
  2021, Pyserini): Englisch 0.184, Deutsch mit Google-Übersetzung 0.136.
- **Im Review geprüft:**
  - `scale-run.sh` auf `test/fixtures/msmarco-mini` (`npm test`):
    Teilmengen, Hash, alle Lanes, Vergleiche, Zusammenfassung, Fortsetzen
    nach Neustart, Zeitlimit-Pfad.
  - Lasttest mit 1 Mio. synthetischen Dokumenten: Teilmenge in 7 s und
    239 MB, Index auf der Platte 400 MB. Pro Anfrage, die fast alles
    trifft, liegt der Median für `or` bei 1,4 s, für `hybrid-fts` bei
    1,4 s und für `hybrid-k10` bei 1,2 s. Die Zeit geht in die
    OR-Abfrage, nicht ins Re-Rank.
- **Platzbedarf:** rund 6,5 GB Rohdaten und 7 GB konvertiert. Dazu kommen
  die Indizes jeweils nur einer Größe, weil `scale-run.sh` sie nach jeder
  Größe löscht.

## Nicht Teil dieser Task
- Code, Tests, README, Empfehlungen, private Daten, vLLM.
