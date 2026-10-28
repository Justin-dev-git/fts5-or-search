# Zieldokument – fts5-hybrid-search

**Status:** Englisch ausgewertet (28.10.2026, siehe „Ergebnis Englisch“).
Deutsch ist offen. Zweck, Kriterien und Schwellen legt der Owner fest.

## Zweck
Natürlichsprachige Mehrwort-Anfragen an einen SQLite-FTS5-Korpus sollen die
relevanten Dokumente finden, die eine strikte AND-Suche verfehlt. Dabei wird
der Index nicht verändert, und die Latenz bleibt interaktiv.

## Leitlinie (vom Owner festgelegt, 28.10.2026)
Die Suche soll einfach und ressourcenarm sein: so einfach wie möglich, so
komplex wie nötig, mit maximalem Nutzen pro Aufwand.
- **Referenz ist OR mit FTS5-BM25.** Jede Erweiterung muss sich gegen diese
  einfachste Variante behaupten.
- **Nicht-Ziel:** neuronale Modelle, Embeddings und Reranker-Modelle sowie
  jede neue Laufzeitabhängigkeit außer SQLite/FTS5 und Node.
- Zuerst Englisch. Deutsch wird erst danach betrachtet.

## Messgrundlage
`scripts/beir-bench.mjs` auf den öffentlichen BEIR-Datensätzen **SciFact**
und **NFCorpus** (Test-Split). Lanes: `and`, `or`, `hybrid` (AND-Floor),
`hybrid-nofloor`, `hybrid-fts` (FTS5-exakte Coverage). Kennzahlen:
nDCG@10, MRR@10, Recall@100, Latenz p50/p95.

## Erfolgskriterien (Vorschlag)
| ID | Kriterium | Bedeutung |
|---|---|---|
| E1 | `or` nDCG@10 ≥ `and` + 0.10 auf beiden Datensätzen | OR als Recall-Basis ist gerechtfertigt |
| E2 | `hybrid` nDCG@10 ≥ `or` auf beiden Datensätzen | Das Coverage-Re-Rank bringt einen Mehrwert (Kernaussage) |
| E3 | `hybrid` Recall@100 ≥ `and` Recall@100 | Der AND-Floor hält auf echten Daten |
| E4 | `hybrid` p95 ≤ 50 ms pro Anfrage | Interaktiv bei diesen Korpusgrößen |
| E5 | Eine Erweiterung gegenüber `or` wird nur übernommen, wenn sie auf einem **nicht abgestimmten** Datensatz bei nDCG@10 mindestens +0.01 erreicht, bei P@10 nicht schlechter ist, höchstens die 3-fache p95-Latenz von `or` hat und höchstens etwa 50 Zeilen Library-Code kostet. Gibt es mehrere nicht abgestimmte Datensätze, muss E5 auf jedem davon halten | Nutzen pro Aufwand |

## Abbruch- und Umlenkkriterien (Vorschlag)
- **E2 scheitert auf beiden Datensätzen:** Das Coverage-Re-Rank fällt aus der
  Empfehlung. Die Library empfiehlt dann OR plus AND-Floor, und das README
  sagt das ausdrücklich.
- **`or` weicht um mehr als 0.10 nDCG@10 vom veröffentlichten BM25-Wert
  (BEIR) ab:** Der Messaufbau gilt als fehlerhaft. Vor jeder Schlussfolgerung
  wird er korrigiert.
- **`hybrid-fts` schlägt `hybrid` um mindestens 0.02 nDCG@10:** Die
  FTS5-exakte Coverage wird zur Empfehlung.

## Umfang
- Zuerst Englisch mit Porter. Deutsch und Stemmer (`german-fts5-stemmer`)
  ruhen bis zur Entscheidung über E1 bis E4.
- Die Datensätze werden nicht ins Repo übernommen. Committet werden nur
  Quelle, Prüfsumme und Lizenzangabe.

## Ergebnis Englisch (28.10.2026)
Alle Zahlen stammen aus `docs/VALIDATION.md`. Abgestimmt wurde auf SciFact
und NFCorpus, getestet auf FiQA und TREC-COVID.

- **E1 erfüllt.** `or` erreicht 0.6878 gegenüber 0.0616 für `and` (SciFact)
  und 0.3209 gegenüber 0.2097 (NFCorpus).
- **E2 nicht erfüllt.** `hybrid` liegt bei 0.5907 gegenüber 0.6878 (SciFact)
  und bei 0.2988 gegenüber 0.3209 (NFCorpus). Das Umlenkkriterium greift, und
  das Coverage-Re-Rank fällt aus der Empfehlung.
- **E5** ist für keine geprüfte Erweiterung erfüllt (Abschnitte T13 und
  T14):
  - `hybrid-fts`, `blend-0.1` und `blendidf-0.1` auf FiQA und TREC-COVID
  - `or-title-3` auf TREC-COVID
- **Der AND-Floor wird nicht empfohlen.** Nach der Leitlinie ist er eine
  Erweiterung und müsste sich gegen `or` behaupten. Das ist nicht gezeigt.
  Er kostet eine zweite Abfrage, und `or` hat schon ohne ihn die höhere
  Recall@100: 0.9193 gegenüber 0.0603 (SciFact) und 0.2458 gegenüber 0.1043
  (NFCorpus). Die Umlenk-Empfehlung „OR plus AND-Floor“ oben ist damit
  überholt.
- **Empfehlung:** OR mit FTS5-BM25, also `buildOrMatch(q)` mit
  `ORDER BY rank`.
