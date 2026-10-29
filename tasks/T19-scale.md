# T19: Skalierung – Englisch und Deutsch bis 8,8 Mio. Abschnitte

Stufe: 1 (nur Messung; Code und Tests sind im Review entstanden)
Arbeits-Branch: scale-2026-10-29

## Ziel
Wie verhalten sich die empfohlenen Suchen, wenn der Korpus wächst?
- **Englisch:** `or` auf `porter unicode61`, Referenz `and`.
- **Deutsch:** `or-trigram`, Referenz `or` und `and` auf `unicode61`.

Gemessen werden Qualität, Latenz, Bauzeit und Indexgröße bei 10 000,
100 000, 1 000 000 und allen 8 841 823 Abschnitten. Bei den drei kleineren
Größen laufen je 1000 Fragen, bei voller Größe die ersten 300 davon.

Grund für die 300: Ein Lasttest im Review mit 1 Mio. synthetischen
Dokumenten brauchte rund 1,2 s pro OR-Anfrage, wenn die Anfrage fast alle
Dokumente trifft. Bei 8,8 Mio. und mit Trigram kann eine Anfrage deutlich
länger dauern.

Die Grundlage ist **mMARCO**: MS MARCO im englischen Original und in deutscher
Übersetzung, mit denselben Abschnitts-IDs und denselben Relevanzurteilen.
Beide Sprachen sehen bei jeder Größe also dieselben Abschnitte und dieselben
Fragen.

Am Code änderst du nichts.

Erlaubte Dateien:
- docs/VALIDATION.md

## Vorbereitung (mit STOPP-Regeln)
```bash
export REPO=$(pwd)
export STEMMER=<dein Klon von german-fts5-stemmer>/lib/stem-german.mjs
export SCALE_DIR=<Verzeichnis auf einer echten Platte, z. B. unter deinem Home>
mkdir -p "$SCALE_DIR"/{raw,beir,db}
findmnt -n -o FSTYPE -T "$SCALE_DIR"
df -BG --output=avail "$SCALE_DIR" | tail -1
free -g
nproc; node --version; node -e "const {DatabaseSync}=require('node:sqlite');console.log('sqlite',new DatabaseSync(':memory:').prepare('select sqlite_version() v').get().v)"
```
- `findmnt` meldet `tmpfs`: **STOPP**. `/tmp` liegt auf Fedora im
  Arbeitsspeicher, dort hätten 45 GB keinen Platz.
- Weniger als **80 GB** frei: **STOPP**.
- `free -g` zeigt unter „available“ weniger als **8 GB**: **STOPP**.
- vLLM und andere Prozesse fasst du nicht an.
- In `docs/VALIDATION.md` schreibst du Pfade nur als `$SCALE_DIR/…`,
  niemals mit deinem Home-Verzeichnis.

## Schritte
1. **Laden.** Erst prüfen, dass alle fünf Dateien erreichbar sind. Bei einem
   Fehler: **STOPP**.
   ```bash
   B=https://huggingface.co/datasets/unicamp-dl/mmarco/resolve/main/data
   for u in google/collections/english_collection.tsv google/collections/german_collection.tsv google/queries/dev/english_queries.dev.small.tsv google/queries/dev/german_queries.dev.small.tsv qrels.dev.small.tsv; do curl -fsSIL -o /dev/null -w "%{http_code} $u\n" "$B/$u"; done
   cd "$SCALE_DIR/raw" && for u in google/collections/english_collection.tsv google/collections/german_collection.tsv google/queries/dev/english_queries.dev.small.tsv google/queries/dev/german_queries.dev.small.tsv qrels.dev.small.tsv; do curl -fsSLO "$B/$u"; done
   sha256sum english_collection.tsv german_collection.tsv english_queries.dev.small.tsv german_queries.dev.small.tsv qrels.dev.small.tsv
   curl -fsS https://huggingface.co/api/datasets/unicamp-dl/mmarco | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log('revision',j.sha,'license',(j.cardData||{}).license)"
   ```
2. **Konvertieren** mit `cd "$REPO"`:
   ```bash
   node scripts/to-beir.mjs --format msmarco-tsv --in "$SCALE_DIR/raw/english_collection.tsv,$SCALE_DIR/raw/english_queries.dev.small.tsv,$SCALE_DIR/raw/qrels.dev.small.tsv" --out "$SCALE_DIR/beir/en-full"
   node scripts/to-beir.mjs --format msmarco-tsv --in "$SCALE_DIR/raw/german_collection.tsv,$SCALE_DIR/raw/german_queries.dev.small.tsv,$SCALE_DIR/raw/qrels.dev.small.tsv" --out "$SCALE_DIR/beir/de-full"
   ```
   Referenz für beide Sprachen: `docs=8841823 queries=6980 qrels=7437`.
   Abweichungen meldest du, nicht anpassen.
3. **Teilmengen**, für `L` in `en de`:
   ```bash
   for N in 10000 100000 1000000; do node scripts/subsample-beir.mjs --data "$SCALE_DIR/beir/$L-full" --out "$SCALE_DIR/beir/$L-$N" --queries 1000 --docs $N; done
   node scripts/subsample-beir.mjs --data "$SCALE_DIR/beir/$L-full" --out "$SCALE_DIR/beir/$L-all" --queries 300 --docs 99999999
   ```
   - `all` heißt: alle Abschnitte, aber nur die ersten 300 Fragen. Die 300
     sind die ersten 300 der 1000.
   - **Kontrolle:** Die ID-Folge muss für en und de bei jeder Größe gleich
     sein. Gleich wird die Folge der Abschnitts-IDs in `corpus.jsonl`
     verglichen, über diesen Hash:
     ```bash
     node -e "const rl=require('readline').createInterface({input:require('fs').createReadStream(process.argv[1])});const h=require('crypto').createHash('sha256');rl.on('line',l=>{if(l.trim())h.update(JSON.parse(l)._id+'\n')});rl.on('close',()=>console.log(h.digest('hex')))" "$SCALE_DIR/beir/$L-$N/corpus.jsonl"
     ```
     Unterscheiden sich die Hashes für en und de bei einer Größe (`N` in
     `10000 100000 1000000 all`): **STOPP**.
   - Ist `missing_rel` größer als 0, meldest du das.
4. **Messen**, für `N` in `10000 100000 1000000 all` aufsteigend, je Größe
   erst en, dann de. Jeder Lauf bekommt ein frisches `--db-dir`, das du nach
   dem Lauf wieder löschst.
   ```bash
   mkdir -p "$SCALE_DIR/db/en-$N" && timeout 6h node scripts/beir-bench.mjs --data "$SCALE_DIR/beir/en-$N" --lanes and,or --db-dir "$SCALE_DIR/db/en-$N" --report-db --repeat 2 --per-query "$SCALE_DIR/en-$N.t19.jsonl" --json; rm -rf "$SCALE_DIR/db/en-$N"
   mkdir -p "$SCALE_DIR/db/de-$N" && timeout 6h node scripts/beir-bench.mjs --data "$SCALE_DIR/beir/de-$N" --lang de --stemmer "$STEMMER" --lanes and,or,or-trigram --db-dir "$SCALE_DIR/db/de-$N" --report-db --repeat 2 --per-query "$SCALE_DIR/de-$N.t19.jsonl" --json; rm -rf "$SCALE_DIR/db/de-$N"
   ```
   - Bricht `timeout` einen Lauf ab, oder fällt der freie Platz unter
     20 GB: **STOPP**. Melde dann alle Ergebnisse bis dahin.
   - Danach pro Größe `node scripts/beir-compare.mjs "$SCALE_DIR/de-$N.t19.jsonl" --a or-trigram --b or`.
5. **`docs/VALIDATION.md`:** Neuer Abschnitt `## T19 – Scale (MS MARCO / mMARCO)`
   am Ende, auf Englisch.
   - Quelle, Revision und Lizenz aus Schritt 1, dazu die fünf
     `sha256sum`-Zeilen.
   - Die Maschine: `nproc`, Gesamt-RAM aus `free -g`, die Node- und die
     SQLite-Version. Dazu der Hinweis, dass vLLM parallel lief.
   - Die Konverter- und Teilmengen-Zeilen und das Ergebnis der Hash-Kontrolle
     als Satz „id sequence identical for en and de at every size“.
   - **Je eine Tabelle pro Sprache**, mit einer Zeile pro Größe und Lane:
     docs, nDCG@10, MRR@10, Recall@100, P@10, p50 ms, p95 ms. Dazu je Größe
     Bauzeit und Größe jedes Index, aus den `index …`-Zeilen.
   - Compare-Ausgaben vollständig mit Gruppenzeilen, und alle Befehle.
   - Plausibilität bei voller Größe, als Differenz:
     - `or` MRR@10 gegen die veröffentlichten BM25-Werte von mMARCO
       (Bonifacio et al., 2021): Englisch 0.184, Deutsch (Google-Übersetzung)
       0.136
     - Der Hinweis, dass dort alle 6980 Fragen und Pyserini liefen, hier 300
       Fragen und FTS5.
   - Am Ende **nur Fakten**, keine Empfehlung:
     - Faktor von p95 und von der Indexgröße zwischen 100 000 und voller
       Größe, pro Lane. Dazu der Hinweis, dass bei voller Größe 300 statt
       1000 Fragen liefen.
     - Verhältnis trigram zu unicode61 bei voller Größe.
     - ΔnDCG@10 von `or-trigram` gegen `or` bei jeder Größe.
   
   Commit `T19: Schritt 5 – …`.

## Prüfung
```bash
git diff --quiet 8b2cd31 -- lib scripts test package.json
grep -F "## T19 – Scale (MS MARCO / mMARCO)" docs/VALIDATION.md
grep -E "^[0-9a-f]{64}  .*english_collection\.tsv" docs/VALIDATION.md
grep -E "^[0-9a-f]{64}  .*german_collection\.tsv" docs/VALIDATION.md
grep -E "^[0-9a-f]{64}  .*qrels\.dev\.small\.tsv" docs/VALIDATION.md
grep -F "id sequence identical for en and de at every size" docs/VALIDATION.md
sed -n '/^## T19/,$p' docs/VALIDATION.md | grep -F "or-trigram vs or: W="
! grep -nE "/home/|/Users/" docs/VALIDATION.md
```

## Referenzwerte
- Konvertierung, je Sprache: `docs=8841823 queries=6980 qrels=7437`
  (MS MARCO passage, dev small).
- Veröffentlichte BM25-MRR@10 auf dev, aus mMARCO (Bonifacio et al., 2021,
  Pyserini): Englisch 0.184, Deutsch mit Google-Übersetzung 0.136.
- Lasttest im Review, 1 Mio. synthetische Dokumente: Teilmenge in 7 s mit
  239 MB Spitzen-RSS. Der Index auf der Platte war 400 MB groß.
- Erwarteter Platzbedarf, grob: rund 6,5 GB Rohdaten und 7 GB konvertiert.
  Bei voller Größe kommen pro Lauf einige GB Index dazu, bei Trigram
  deutlich mehr. Deshalb wird jedes `db`-Verzeichnis nach dem Lauf
  gelöscht.

## Nicht Teil dieser Task
- Code, Tests, README, Empfehlungen, private Daten, vLLM.
