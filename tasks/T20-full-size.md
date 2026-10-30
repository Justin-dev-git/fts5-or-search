# T20: Volle Korpusgröße (8,8 Mio. Abschnitte) und Abgleich mit BM25 aus der Literatur

Stufe: 1 (nur Messung)
Arbeits-Branch: full-size-<Datum> (von master)
Voraussetzung: T19 und T21 sind gemergt. Der Owner hat den Zeitpunkt
freigegeben: Die Indizes (rund 35 GB) verdrängen den Page-Cache, und ein
per mmap geladenes Modell (z. B. Strata) wird danach langsamer, bis es seine
Daten wieder im Speicher hat.

## Ziel
Wie schnell sind `and`, `or` und `or-trigram` auf dem vollen MS-MARCO- bzw.
mMARCO-de-Korpus (8 841 823 Abschnitte), und liegt `or` dort nahe an den
veröffentlichten BM25-Werten? Gemessen werden **alle 6 980 Fragen von dev
small**, also dieselbe Fragenmenge wie bei den veröffentlichten Werten.

Erlaubte Dateien:
- docs/VALIDATION.md
- README.md

## Vorgaben
- Lanes: Englisch `and,or`; Deutsch `and,or,or-trigram` mit
  `--stopwords lib`. `--repeat 1`.
- Englisch und Deutsch laufen parallel, jede Sprache auf einem eigenen
  schnellen Kern (`lscpu -e`: die Kerne mit dem höchsten MAXMHZ; auf dem
  GX10 5–9 und 15–19).
- Daten: `$SCALE_DIR/beir/en-full` und `$SCALE_DIR/beir/de-full` aus T19
  bzw. T21 (Konvertierung `docs=8841823 queries=6980 qrels=7437`).
- Vorher prüfen und die Ausgaben aufheben: `free -g`, `df -BG`, laufende
  LLM-Benchmarks. Unter 40 GB frei auf der Platte oder unter 8 GB
  „available“: **STOPP**. Läuft ein Benchmark eines anderen Agenten:
  **STOPP**.

```bash
mkdir -p "$SCALE_DIR/t20/db-en" "$SCALE_DIR/t20/db-de"
taskset -c 17 node scripts/beir-bench.mjs --data "$SCALE_DIR/beir/en-full" --lanes and,or --db-dir "$SCALE_DIR/t20/db-en" --report-db --repeat 1 --per-query "$SCALE_DIR/t20/en.pq.jsonl" --json > "$SCALE_DIR/t20/en.txt" 2> "$SCALE_DIR/t20/en.err" &
taskset -c 19 node scripts/beir-bench.mjs --data "$SCALE_DIR/beir/de-full" --lang de --stemmer "$STEMMER" --stopwords lib --lanes and,or,or-trigram --db-dir "$SCALE_DIR/t20/db-de" --report-db --repeat 1 --per-query "$SCALE_DIR/t20/de.pq.jsonl" --json > "$SCALE_DIR/t20/de.txt" 2> "$SCALE_DIR/t20/de.err" &
wait
```

- Abgleich: MRR@10 von `or` gegen die veröffentlichten BM25-Werte aus
  mMARCO (Bonifacio et al., 2021, Pyserini): Englisch 0.184, Deutsch 0.136.
  Weicht `or` um mehr als 0.05 ab: **STOPP**, erst den Aufbau prüfen.
- `docs/VALIDATION.md`: Abschnitt `## T20 – Full size (MS MARCO / mMARCO)`
  mit Maschine, Befehlen, beiden Ergebniszeilen-Blöcken, Bauzeit und
  Indexgröße, dem Abgleich und als Fakten den Faktoren von p50/p95 und
  Indexgröße zwischen 1 000 000 (T19/T21) und 8 841 823.
- README: Die Skalierungstabelle um die volle Größe ergänzen. Jede Zahl muss
  in `docs/VALIDATION.md` stehen.

## Prüfung
```bash
git diff --quiet origin/master -- lib scripts test package.json
grep -F "## T20 – Full size (MS MARCO / mMARCO)" docs/VALIDATION.md
sed -n '/^## T20/,$p' docs/VALIDATION.md | grep -E "docs=8841823 queries=6980"
sed -n '/^## T20/,$p' docs/VALIDATION.md | grep -F "0.184"
sed -n '/^## T20/,$p' docs/VALIDATION.md | grep -F "0.136"
! grep -nE "/home/|/Users/" docs/VALIDATION.md README.md
```

## Referenzwerte
- Hochrechnung aus T19/T21 (linear, nicht gemessen): Englisch `or` p50 etwa
  0,4 s, p95 etwa 1 s; Deutsch `or` p95 etwa 0,2 s, `or-trigram` p50 etwa
  0,6 s. Indizes: Englisch etwa 5,2 GB, Deutsch `unicode61` etwa 5,9 GB und
  `trigram` etwa 17 GB.
- Laufzeit geschätzt 1 bis 1,5 Stunden, vor allem `or` (Englisch) und
  `or-trigram` (Deutsch).

## Nicht Teil dieser Task
- Re-Rank-, Blend- und Stemmer-Lanes bei voller Größe (bei 1 000 000 schon
  unter `or`, siehe T19 und T21).
- Code, Tests, Empfehlungen.
