// Test stub for scripts/beir-bench.mjs --lang de. It has the interface of
// german-fts5-stemmer (STOPWORDS, queryTermVariants) and returns, for the
// queries of test/fixtures/beir-de-mini and beir-de-lanes, the variant groups that
// german-fts5-stemmer 17e6413 returns (checked in review). Unknown terms map
// to themselves, so the stub never invents variants.
export const STOPWORDS = new Set(['der', 'die', 'das', 'und', 'sie', 'im', 'am', 'wann', 'wo', 'wie']);

const VARIANTS = {
  beantragte: ['beantragte', 'beantragt', 'beantragen', 'beantrage'],
  'reisepässe': ['reisepasse'],
  ausweis: ['ausweis'],
  hundesteuer: ['hundesteuer'],
  bezahlen: ['bezahlen', 'bezahl'],
  fahrrad: ['fahrrad'],
  termin: ['termin'],
  anmeldung: ['anmeldung', 'anmelden'],
  ausmachen: ['ausmachen', 'machen', 'ausmacht', 'mach'],
};
const PARADIGM = {
  beantragte: ['beantragte', 'beantrage', 'beantragen', 'beantragt'],
  'reisepässe': ['reisepasse'],
  ausweis: ['ausweis', 'ausweise', 'ausweisen'],
  hundesteuer: ['hundesteuer'],
  bezahlen: ['bezahlen', 'bezahl', 'bezahle', 'bezahlst', 'bezahlt', 'bezahlte', 'bezahlten'],
  fahrrad: ['fahrrad', 'fahrrader'],
  termin: ['termin', 'termine', 'terminen'],
  anmeldung: ['anmeldung', 'anmelden'],
  ausmachen: ['ausmachen', 'ausmacht', 'gemacht', 'mach', 'mache', 'machen', 'macher', 'machs', 'machst', 'macht', 'machte', 'machten'],
};

export function queryTermVariants(query, { paradigm = false } = {}) {
  const table = paradigm ? PARADIGM : VARIANTS;
  return String(query)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map((w) => table[w] ?? [w]);
}
