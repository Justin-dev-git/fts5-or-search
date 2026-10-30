#!/usr/bin/env bash
# T19 scale runner. Expects the converted full corpora in
#   $SCALE_DIR/beir/en-full and $SCALE_DIR/beir/de-full (scripts/to-beir.mjs)
# and runs, per size: subsets (scripts/subsample-beir.mjs), the en/de id-hash
# check, one bench process per lane (indexes built once, then --reuse-db),
# per-query merges and compares, and finally results/summary.md.
#
# Resumable: finished subsets (.complete), finished lanes (result file) and
# finished index builds (.db.done) are skipped when the script is started
# again. Start it in the background and check results/run.log:
#   nohup bash scripts/scale-run.sh > "$SCALE_DIR/results-nohup.log" 2>&1 &
#
# Environment: SCALE_DIR, STEMMER (required); SIZES (default
# "10000 100000 1000000"), QUERIES (1000), FULL (1 = also the whole corpus),
# FULL_QUERIES (300), REPEAT (2), FULL_REPEAT (1), LANE_TIMEOUT (6h), MIN_FREE_GB (20),
# EN_LANES / DE_LANES (default: every lane that was a candidate before, at
# the parameters chosen then), FULL_EN_LANES / FULL_DE_LANES (lanes for the
# whole corpus; default: the same lists), DE_STOPWORDS (stemmer = the stemmer's
# list as in T16-T19, lib = STOPWORDS_DE; beir-bench --stopwords, T21).
# Exit codes: 0 done, 2 id hashes differ, 3 disk full, 4 a lane failed.
set -uo pipefail
: "${SCALE_DIR:?set SCALE_DIR}" "${STEMMER:?set STEMMER}"
REPO=$(cd "$(dirname "$0")/.." && pwd)
SIZES=${SIZES:-"10000 100000 1000000"}
QUERIES=${QUERIES:-1000}
FULL=${FULL:-1}
FULL_QUERIES=${FULL_QUERIES:-300}
REPEAT=${REPEAT:-2}
FULL_REPEAT=${FULL_REPEAT:-1}
LANE_TIMEOUT=${LANE_TIMEOUT:-6h}
MIN_FREE_GB=${MIN_FREE_GB:-20}
EN_LANES=${EN_LANES:-"and or hybrid hybrid-fts hybrid-k10 hybrid-nofloor-k10 hybrid-fts-k10 hybrid-substr-k10 blend-0.1 blendidf-0.1"}
DE_LANES=${DE_LANES:-"and or or-stem or-trigram hybrid hybrid-expanded hybrid-trigram"}
FULL_EN_LANES=${FULL_EN_LANES:-$EN_LANES}
FULL_DE_LANES=${FULL_DE_LANES:-$DE_LANES}
DE_STOPWORDS=${DE_STOPWORDS:-stemmer}
RES="$SCALE_DIR/results"
mkdir -p "$RES" "$SCALE_DIR/db"

log() { echo "$(date -Is) $*" | tee -a "$RES/run.log"; }
free_gb() { df -BG --output=avail "$SCALE_DIR" | tail -1 | tr -dc 0-9; }
idhash() {
  node -e "const rl=require('readline').createInterface({input:require('fs').createReadStream(process.argv[1])});const h=require('crypto').createHash('sha256');rl.on('line',l=>{if(l.trim())h.update(JSON.parse(l)._id+'\n')});rl.on('close',()=>console.log(h.digest('hex')))" "$1"
}

labels="$SIZES"
[ "$FULL" = 1 ] && labels="$labels all"
log "start sizes=[$labels] queries=$QUERIES full_queries=$FULL_QUERIES repeat=$REPEAT full_repeat=$FULL_REPEAT timeout=$LANE_TIMEOUT"
log "en lanes: $EN_LANES"
log "de lanes: $DE_LANES (stopwords: $DE_STOPWORDS)"
[ "$FULL" = 1 ] && log "full-size lanes: en [$FULL_EN_LANES] de [$FULL_DE_LANES]"

for N in $labels; do
  if [ "$N" = all ]; then q=$FULL_QUERIES; d=999999999; rep=$FULL_REPEAT; else q=$QUERIES; d=$N; rep=$REPEAT; fi
  for L in en de; do
    out="$SCALE_DIR/beir/$L-$N"
    if [ ! -f "$out/.complete" ]; then
      rm -rf "$out"
      node "$REPO/scripts/subsample-beir.mjs" --data "$SCALE_DIR/beir/$L-full" --out "$out" --queries "$q" --docs "$d" > "$RES/subsample-$L-$N.txt" || { log "FAIL subsample $L-$N"; exit 4; }
      touch "$out/.complete"
    fi
    log "subset $L-$N: $(cat "$RES/subsample-$L-$N.txt")"
  done
  he=$(idhash "$SCALE_DIR/beir/en-$N/corpus.jsonl")
  hd=$(idhash "$SCALE_DIR/beir/de-$N/corpus.jsonl")
  echo "$N $he $hd" >> "$RES/idhash.txt"
  if [ "$he" != "$hd" ]; then log "STOP id hashes differ at $N: en=$he de=$hd"; exit 2; fi
  log "id hash $N identical: $he"

  for L in en de; do
    db="$SCALE_DIR/db/$L-$N"
    mkdir -p "$db"
    if [ "$L" = en ]; then lanes=$EN_LANES; full=$FULL_EN_LANES; langargs=(); else lanes=$DE_LANES; full=$FULL_DE_LANES; langargs=(--lang de --stemmer "$STEMMER" --stopwords "$DE_STOPWORDS"); fi
    [ "$N" = all ] && lanes=$full
    for lane in $lanes; do
      res="$RES/$L-$N.$lane.txt"
      if [ -f "$res" ] || [ -f "$res.timeout" ]; then log "skip $L-$N $lane (done earlier)"; continue; fi
      if [ "$(free_gb)" -lt "$MIN_FREE_GB" ]; then log "STOP free disk $(free_gb) GB < $MIN_FREE_GB GB"; exit 3; fi
      log "run $L-$N $lane"
      timeout "$LANE_TIMEOUT" node "$REPO/scripts/beir-bench.mjs" --data "$SCALE_DIR/beir/$L-$N" "${langargs[@]}" --lanes "$lane" \
        --db-dir "$db" --reuse-db --report-db --repeat "$rep" --per-query "$RES/$L-$N.$lane.pq.jsonl" --json \
        > "$res.tmp" 2> "$RES/$L-$N.$lane.err"
      rc=$?
      if [ $rc -eq 0 ]; then mv "$res.tmp" "$res"; log "ok $L-$N $lane: $(grep -E "^$lane " "$res" | tr -s ' ')"
      elif [ $rc -eq 124 ]; then mv "$res.tmp" "$res.timeout"; log "TIMEOUT $L-$N $lane after $LANE_TIMEOUT"
      else log "FAIL $L-$N $lane rc=$rc (see $RES/$L-$N.$lane.err)"; exit 4; fi
    done
    rm -rf "$db"
  done

  merge() { # $1=lang $2=a $3=b
    local a="$RES/$1-$N.$2.pq.jsonl" b="$RES/$1-$N.$3.pq.jsonl"
    [ -f "$a" ] && [ -f "$b" ] || { log "no compare $1-$N $2 vs $3 (lane missing)"; return; }
    node "$REPO/scripts/merge-per-query.mjs" "$RES/$1-$N.$2__$3.jsonl" "$a" "$b" > /dev/null
    node "$REPO/scripts/beir-compare.mjs" "$RES/$1-$N.$2__$3.jsonl" --a "$2" --b "$3" > "$RES/compare-$1-$N.$2-vs-$3.txt"
  }
  merge en or and
  for lane in $EN_LANES; do case $lane in and|or) ;; *) merge en "$lane" or ;; esac; done
  merge de or and
  for lane in $DE_LANES; do case $lane in and|or) ;; *) merge de "$lane" or ;; esac; done
  merge de hybrid-expanded hybrid
  merge de hybrid-expanded or-trigram
  merge de hybrid-trigram or-trigram
  log "size $N done"
done

node "$REPO/scripts/scale-summary.mjs" "$RES" > "$RES/summary.md"
log "DONE summary in $RES/summary.md"
