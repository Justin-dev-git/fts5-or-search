// fts5-or-search — injection-safe match builder for SQLite FTS5.
//
// The finding (BEIR measurements, see README and docs/VALIDATION.md): for
// natural-language multi-word queries, strict AND-of-terms loses most
// relevant documents; a quoted OR match ordered by FTS5's built-in BM25
// (`ORDER BY rank`) was not beaten by any re-rank variant that was tested.
//
// Recommended:
//   buildOrMatch(query)      — quote every token, OR them; use with ORDER BY rank.
// Strict baseline:
//   sanitizeMatch(query)     — quote every token, AND them.
// Measured, not recommended (kept so the measurements stay reproducible):
//   coverageRerank, hybridSearch, makeFtsTermPresent.
//
// All quoting is injection-safe: tokens are double-quoted so FTS5 operators
// (AND/OR/NOT), column refs, and syntax characters (hyphens!, code tokens
// like `memory-lancedb` or `127.0.0.1:8080`) can never be parsed as syntax.

const STOPWORDS_DEFAULT = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'when', 'to', 'of',
  'in', 'on', 'at', 'by', 'for', 'with', 'from', 'is', 'are', 'was', 'were',
  'be', 'been', 'do', 'does', 'did', 'have', 'has', 'had', 'i', 'you', 'it',
  'we', 'they', 'he', 'she', 'my', 'your', 'its', 'our', 'their', 'this',
  'that', 'these', 'those', 'as', 'so', 'than', 'too', 'very', 'can', 'will',
  'just', 'not', 'no', 'yes', 'should', 'would', 'could', 'about', 'into',
]);

/** German stopwords, for tokenize/buildOrMatch/sanitizeMatch via
 *  `{ stopwords: STOPWORDS_DE }`. 259 entries (T21): the 94 words of T16-T18
 *  (STOPWORDS in german-fts5-stemmer at 17e64135), then the Snowball German
 *  stop word list (snowballstem.org/algorithms/german/stop.txt, BSD-3-Clause,
 *  231 words), then the spellings without umlaut of its words ("konnen").
 *  The 94 lacked frequent words such as "in" (half of all mMARCO passages)
 *  and "sie", "es", "wird": an OR query with one of them makes FTS5 score a
 *  large part of the corpus (docs/VALIDATION.md, T21). With a trigram index
 *  the list matters more than with unicode61: a short function word such as
 *  "die" would otherwise match inside "Dienst". */
export const STOPWORDS_DE = new Set([
  'der', 'die', 'das', 'und', 'oder', 'ist', 'sind', 'war', 'wurde', 'wurden',
  'haben', 'habe', 'hast', 'hat', 'hatte', 'hatten', 'gehabt', 'werden',
  'worden', 'mit', 'von', 'fuer', 'sich', 'mich', 'dich', 'uns', 'euch',
  'ihm', 'ihn', 'ihnen', 'man', 'kann', 'muss', 'soll', 'will', 'darf', 'sei',
  'seit', 'hin', 'her', 'nur', 'noch', 'sehr', 'so', 'zu', 'vom', 'ins',
  'für', 'fur', 'über', 'uber', 'unter', 'auf', 'aus', 'bei', 'nach', 'zum',
  'zur', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'einen', 'was', 'wie',
  'wann', 'wo', 'welche', 'welcher', 'welches', 'dass', 'auch', 'nicht',
  'als', 'wenn', 'aber', 'denn', 'im', 'um', 'an', 'am', 'beim', 'pro', 'the',
  'and', 'for', 'with', 'that', 'this', 'from', 'were', 'are',
  // Snowball German stop word list (T21), then its spellings without umlaut
  'alle', 'allem', 'allen', 'aller', 'alles', 'also', 'ander', 'andere',
  'anderem', 'anderen', 'anderer', 'anderes', 'anderm', 'andern', 'anderr',
  'anders', 'bin', 'bis', 'bist', 'da', 'damit', 'dann', 'daß', 'derselbe',
  'derselben', 'denselben', 'desselben', 'demselben', 'dieselbe', 'dieselben',
  'dasselbe', 'dazu', 'dein', 'deine', 'deinem', 'deinen', 'deiner', 'deines',
  'derer', 'dessen', 'dir', 'du', 'dies', 'diese', 'diesem', 'diesen',
  'dieser', 'dieses', 'doch', 'dort', 'durch', 'einem', 'eines', 'einig',
  'einige', 'einigem', 'einigen', 'einiger', 'einiges', 'einmal', 'er', 'es',
  'etwas', 'euer', 'eure', 'eurem', 'euren', 'eurer', 'eures', 'gegen',
  'gewesen', 'hab', 'hier', 'hinter', 'ich', 'mir', 'ihr', 'ihre', 'ihrem',
  'ihren', 'ihrer', 'ihres', 'in', 'indem', 'jede', 'jedem', 'jeden', 'jeder',
  'jedes', 'jene', 'jenem', 'jenen', 'jener', 'jenes', 'jetzt', 'kein',
  'keine', 'keinem', 'keinen', 'keiner', 'keines', 'können', 'könnte',
  'machen', 'manche', 'manchem', 'manchen', 'mancher', 'manches', 'mein',
  'meine', 'meinem', 'meinen', 'meiner', 'meines', 'musste', 'nichts', 'nun',
  'ob', 'ohne', 'sein', 'seine', 'seinem', 'seinen', 'seiner', 'seines',
  'selbst', 'sie', 'solche', 'solchem', 'solchen', 'solcher', 'solches',
  'sollte', 'sondern', 'sonst', 'unse', 'unsem', 'unsen', 'unser', 'unses',
  'viel', 'vor', 'während', 'waren', 'warst', 'weg', 'weil', 'weiter',
  'welchem', 'welchen', 'werde', 'wieder', 'wir', 'wird', 'wirst', 'wollen',
  'wollte', 'würde', 'würden', 'zwar', 'zwischen', 'konnen', 'konnte',
  'wahrend',
]);

/** Tokenize for FTS5: strip punctuation except intra-token dots/hyphens
 *  (kept so code-like tokens such as `v1.2.3-beta` or `127.0.0.1` survive as
 *  quoted phrases — FTS5 re-tokenizes quoted strings with the index tokenizer,
 *  so passing dots through yields exact phrase matching). Leading/trailing
 *  dots and hyphens are stripped per token (`gateway.` → `gateway`) and
 *  tokens without any letter/digit are dropped (a stray `...` must never
 *  become a mandatory AND term). Lowercase, drop stopwords and 1-char tokens. */
export function tokenize(query, { stopwords = STOPWORDS_DEFAULT } = {}) {
  return String(query)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.\-]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^[.\-]+/, '').replace(/[.\-]+$/, ''))
    .filter((w) => w.length > 1 && /[\p{L}\p{N}]/u.test(w) && !stopwords.has(w));
}

const quote = (t) => `"${t.replaceAll('"', '')}"`;

/** unicode61-style folding: NFKD + strip combining marks (ä→a, é→e), `ß`
 *  stays `ß` (measured against the SQLite tokenizer, see companion repo).
 *  Applied to both query terms and text tokens so comparison is symmetric. */
const foldText = (s) => s.normalize('NFKD').replace(/\p{Mn}/gu, '').toLowerCase();

/** Raw token stream of a text: same cutting rules as tokenize() but STOPWORDS
 *  are kept (coverage asks "does this word occur", not "is it meaningful")
 *  and 1-char tokens are kept so dot-separated code tokens can match as
 *  token sequences. */
function textTokens(text) {
  return foldText(text)
    .replace(/[^\p{L}\p{N}\s.\-]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^[.\-]+/, '').replace(/[.\-]+$/, ''))
    .filter(Boolean);
}

/** Token-exact presence test (NOT substring: `rank` must not be covered by
 *  "Frank", `port` not by "airport"). Terms with inner dots/hyphens match
 *  either as one token (`memory-lancedb`) or as a contiguous token sequence
 *  (`127.0.0.1` → 127 · 0 · 0 · 1). */
function termInTokens(t, tokens) {
  const f = foldText(t);
  if (tokens.includes(f)) return true;
  if (/[.\-]/.test(f)) {
    const parts = f.split(/[.\-]+/).filter(Boolean);
    if (!parts.length) return false;
    outer: for (let i = 0; i + parts.length <= tokens.length; i++) {
      for (let j = 0; j < parts.length; j++) if (tokens[i + j] !== parts[j]) continue outer;
      return true;
    }
  }
  return false;
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Build a `termPresent` hook that asks FTS5 itself — the only check that is
 *  exactly as smart as the index (Porter: `restarting` covers `restarts`).
 *  Table/column names are identifier-validated; anything else throws. */
export function makeFtsTermPresent(db, table, { idKey = 'id', rowidCol = 'rowid' } = {}) {
  if (!IDENT.test(table)) throw new Error(`makeFtsTermPresent: invalid table name: ${table}`);
  if (!IDENT.test(rowidCol)) throw new Error(`makeFtsTermPresent: invalid rowid column: ${rowidCol}`);
  // node:sqlite binds JS numbers as REAL and FTS5 then drops a `rowid = <REAL>`
  // condition next to MATCH, so the value must be cast to INTEGER explicitly.
  const stmt = db.prepare(`SELECT 1 AS hit FROM ${table} WHERE ${table} MATCH ? AND ${rowidCol} = CAST(? AS INTEGER)`);
  return (term, row) => {
    const id = row?.[idKey];
    if (id == null) return false;
    return stmt.get(quote(term), id)?.hit === 1;
  };
}

/** Strict AND baseline (what most FTS5 code ships). Brittle by design here —
 *  exposed for benchmarks and for callers who deliberately want precision. */
export function sanitizeMatch(query, opts) {
  const ts = tokenize(query, opts);
  return ts.length ? ts.map(quote).join(' AND ') : '""';
}

/** Wide retrieval match: (t1 OR t2 OR …). Never loses a document that a
 *  plain AND would have found (OR-additive), so recall is monotone. */
export function buildOrMatch(query, opts) {
  const ts = tokenize(query, opts);
  return ts.length ? `(${ts.map(quote).join(' OR ')})` : '""';
}

/** Re-rank an already BM25-ordered result set by term coverage: how many
 *  DISTINCT query terms occur in the row's text (duplicates in the query
 *  count once). Default presence test is token-exact with unicode61-style
 *  folding — deliberately NOT `includes()` ("Frank" must not cover "rank").
 *  It ignores stemmer equivalence; when you have the database handle, pass
 *  `opts.termPresent = makeFtsTermPresent(db, table)` for tokenizer-exact
 *  coverage (Porter-aware). Coverage dominates (x1000), BM25 rank only
 *  breaks ties. `getText` maps a row to its searchable text. */
export function coverageRerank(rows, query, getText, opts) {
  const ts = [...new Set(tokenize(query, opts))];
  if (!ts.length) return rows;
  const termPresent = opts?.termPresent;
  return rows
    .map((r, i) => {
      const text = String(getText(r) ?? '');
      const tokens = termPresent ? null : textTokens(text);
      let cov = 0;
      for (const t of ts) {
        cov += termPresent ? (termPresent(t, r, text) ? 1 : 0) : (termInTokens(t, tokens) ? 1 : 0);
      }
      return { ...r, _cov: cov, _score: cov * 1000 + 1 / (i + 1) };
    })
    .sort((a, b) => b._score - a._score);
}

/** One-call hybrid: given a prepared `search(match, limit)` that returns
 *  BM25-ordered rows, retrieve wide and re-rank. Widen the candidate pool
 *  (limit*5) so coverage ranking has material to work with.
 *
 *  `andFloor` (default `true`): a truncated OR pool under LIMIT can evict
 *  the one document containing ALL terms (short single-term docs with strong
 *  BM25 crowd it out), so hybrid would drop a hit that AND@k still returns.
 *  With the floor on, hybrid additionally runs `search(AND-match, k)` and
 *  merges the result into the pool (dedup via `opts.idOf`, default
 *  `r => r.id ?? r._rid ?? r.rowid`, falling back to content equality).
 *  Every AND@k document then carries full coverage and outranks partial
 *  coverers. `andFloor:false` restores single-query behavior exactly. */
export function hybridSearch(search, query, getText, { k = 10, andFloor = true, idOf, ...opts } = {}) {
  const rows = search(buildOrMatch(query, opts), k * 5);
  let pool = rows;
  if (andFloor) {
    const key = idOf ?? ((r) => r.id ?? r._rid ?? r.rowid);
    const seenIds = new Set();
    const seenTexts = new Set();
    pool = [];
    for (const r of [...search(sanitizeMatch(query, opts), k), ...rows]) {
      const id = key(r);
      if (id != null) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      } else {
        const txt = String(getText(r) ?? '');
        if (seenTexts.has(txt)) continue;
        seenTexts.add(txt);
      }
      pool.push(r);
    }
  }
  return coverageRerank(pool, query, getText, opts).slice(0, k);
}

/** Adaptive expansion (T24, T25): plain OR (`buildOrMatch`, BM25) unless the
 *  OR match hits at most `tau` documents; only such sparse queries are
 *  expanded. `countUpTo(match, n)` returns the number of matching documents,
 *  at most n — e.g. `SELECT count(*) AS c FROM (SELECT 1 FROM t WHERE t MATCH ?
 *  LIMIT ?)`, which stops early on dense queries. `expand(text)` gets the
 *  query without stopwords (lower-cased, edge hyphens stripped) and returns
 *  variant groups (string[][]), e.g. `queryTermVariants` of a stemmer such as
 *  german-fts5-stemmer; variants that are stopwords and empty groups are
 *  dropped. The groups are ORed, the top k*5 re-ranked by how many groups
 *  occur as a substring of the lower-cased text (BM25 order breaks ties).
 *  The library itself needs no stemmer: without `expand` this is `or`. */
export function adaptiveSearch(search, countUpTo, query, getText, { k = 10, tau = 1000, expand, ...opts } = {}) {
  const orMatch = buildOrMatch(query, opts);
  if (!expand || countUpTo(orMatch, tau + 1) > tau) return search(orMatch, k);
  const sw = opts.stopwords ?? STOPWORDS_DEFAULT;
  const text = String(query).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/)
    .map((w) => w.replace(/^-+/, '').replace(/-+$/, '')).filter((w) => w && !sw.has(w)).join(' ');
  const groups = expand(text).map((g) => g.filter((v) => !sw.has(v))).filter((g) => g.length);
  if (!groups.length) return search(orMatch, k);
  return search(groups.map((g) => `(${g.map(quote).join(' OR ')})`).join(' OR '), k * 5)
    .map((r, i) => {
      const low = String(getText(r) ?? '').toLowerCase();
      return { r, s: groups.filter((g) => g.some((v) => low.includes(v))).length * 1000 + 1 / (i + 1) };
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.r);
}
