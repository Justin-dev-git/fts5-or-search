# Zieldokument – fts5-or-search (entstanden als fts5-hybrid-search)

**Status:** Englisch und Deutsch ausgewertet (siehe „Ergebnis Englisch“
und „Ergebnis Deutsch“). Zweck, Kriterien und Schwellen legt der Owner fest.

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
- **Vorbehalt geklärt (T18):** Die `hybrid`-Lanes aus T11 bis T14
  sortierten einen Pool von 500 Treffern um, weil sie mit k=100 liefen. T18
  hat das Re-Rank deshalb in der normalen Top-10-Konfiguration nachgemessen
  (k=10, Pool 50). Auch dort liegt es auf allen vier Datensätzen unter `or`.
  Beispiele für `hybrid-k10`: SciFact −0.0812, FiQA −0.0644, TREC-COVID
  −0.0890. E2 ist damit auch für die übliche Konfiguration nicht erfüllt, und
  die Empfehlung bleibt.

## Deutsch (Entwurf, 28.10.2026)
Die Leitlinie gilt unverändert. Die Frage lautet: Schlägt eine Erweiterung
das einfache OR auch auf Deutsch?

- **Referenz:** `or` auf einem `unicode61`-Index. Er faltet Umlaute
  (ä→a), ß bleibt erhalten. Alle Lanes nutzen dieselbe Stoppwortliste, die
  `STOPWORDS` aus german-fts5-stemmer.
- **Erweiterungen:**
  - `or-stem` und `or-stem-paradigm`: alle Varianten aus german-fts5-stemmer,
    mit OR verknüpft. Die beiden zählen als eine Familie.
  - `or-trigram`: der FTS5-Tokenizer `trigram`, also Teilwort-Treffer, etwa
    „Ausweis“ in „Personalausweis“.
  - Ergänzt mit T17: `hybrid-expanded`, das ist Stemmer-OR plus
    Coverage-Re-Rank, genau wie `fts-hybrid-expanded` in german-fts5-stemmer
    und die beste Lane auf dem privaten Korpus. Dazu `hybrid`, dasselbe
    Re-Rank ohne Stemmer, damit sich die Wirkung zuordnen lässt. Beide
    wurden auf keinem der öffentlichen Datensätze abgestimmt, für sie
    zählen also beide.
- **Daten:**
  - **GermanDPR** (Test-Split, CC BY 4.0) ist der Auswahldatensatz. Nur hier
    wird zwischen `or-stem` und `or-stem-paradigm` gewählt.
  - **GermanGovService** (LHM-Dienstleistungen-QA, Test-Split, MIT) ist der
    Testdatensatz. Dort wird nichts nachjustiert.
  - `or-trigram` hat nichts abzustimmen. Für ihn zählen also beide
    Datensätze als nicht abgestimmt.
- **E1-DE:** `or` nDCG@10 ≥ `and` + 0.10 auf beiden Datensätzen.
- **E5** gilt unverändert, und zwar auf jedem Datensatz, der für die
  jeweilige Lane nicht abgestimmt wurde. Zusätzlich wird die
  Datenbankgröße berichtet, denn ein Trigram-Index ist größer.
  `or-stem` bräuchte german-fts5-stemmer als zusätzliches Paket (mit
  Vokabelliste). Ob das den Nutzen wert ist, entscheidet der Owner.
- **Plausibilität:** `or` wird grob mit dem BM25-Wert aus NanoMTEB-German
  verglichen: GermanDPR 0.4647, GovService 0.6132. Das sind Teilmengen mit
  200 Anfragen, und die Implementierung ist unbekannt. Liegt die Abweichung
  über 0.15, wird erst der Aufbau geprüft.
- **Bekannte Grenzen:**
  - Wie die GermanDPR-Negativbeispiele ausgewählt wurden, ist hier nicht
    belegt.
  - GovService ist klein (105 Dokumente).
  - Erfüllt eine Lane E5 nur knapp (unter +0.02) oder widersprechen sich die
    Datensätze, kommt GerDaLIR (Recht, MIT) als weiterer Testdatensatz dazu.

## Ergebnis Deutsch (29.10.2026)
Alle Zahlen stammen aus `docs/VALIDATION.md`, Abschnitte T16 bis T18.

- **E1-DE erfüllt.** `or` erreicht 0.4797 gegenüber 0.0263 für `and`
  (GermanDPR) und 0.6937 gegenüber 0.0753 (GovService).
- **`or-trigram` erfüllt E5 auf beiden Datensätzen.**
  - nDCG@10: +0.0541 und +0.0691
  - P@10: +0.0040 und +0.0039
  - p95: das 2.38- und 1.85-fache von `or`
  - Library-Code: keiner. Der Index ist aber 2.59- bzw. 2.50-mal so groß.
- **`or-stem` erfüllt E5 nicht.** Auf GovService bringt er +0.0031. Auch im
  Re-Rank bringt der Stemmer nichts Eindeutiges: `hybrid-expanded` gegen
  `hybrid` ergibt +0.0067 auf GermanDPR und −0.0094 auf GovService.
- **`hybrid` erfüllt E5 auf beiden Datensätzen** (+0.0363 und +0.0280), das
  ist Substring-Coverage-Re-Rank auf `unicode61` mit 50er-Pool. Er bleibt
  aber unter `or-trigram`. Trigram mit Re-Rank (`hybrid-trigram`) liegt
  ebenfalls unter `or-trigram`: −0.0081 und −0.0139.
- **Empfehlung:**
  - Deutsch: OR auf einem Trigram-Index,
    `tokenize='trigram remove_diacritics 1'`, mit `STOPWORDS_DE`.
  - Ist der Index fest (`unicode61`): OR mit `STOPWORDS_DE`. Optional kommt
    das Substring-Re-Rank dazu.
- **Grenzen:**
  - Die Datensätze sind klein (2 876 und 105 Dokumente).
  - Latenz und Indexgröße bei großen deutschen Korpora sind nicht gemessen.
  - Die Messung auf dem privaten Korpus des Owners steht aus. Dessen Index
    nutzt `porter unicode61`.

## Ergebnis Deutsch nach T21 (30.10.2026)
Alle Zahlen stammen aus `docs/VALIDATION.md`, Abschnitt T21.

- Der Liste aus T16 bis T18 fehlten häufige Funktionswörter, etwa "in"
  (in 50.1 % der Abschnitte von mMARCO-de 100 000), "sie", "es", "wird".
  `STOPWORDS_DE` enthält jetzt die Snowball-Liste, zusammen 259 Wörter.
  Die p95 von `or` bei 1 000 000 Abschnitten fällt von 266.96 auf 24.72 ms.
  nDCG@10 sinkt auf keinem deutschen Datensatz.
- Neuer Testdatensatz mMARCO-de (maschinelle Übersetzung von MS MARCO) mit
  10 000, 100 000 und 1 000 000 Abschnitten, nicht abgestimmt.
- **E5 mit der vollständigen Liste:** Keine Erweiterung erfüllt es auf jedem
  nicht abgestimmten Datensatz.
  - `or-trigram`: p95 5.07-fach (GermanDPR) und 6.61- bis 9.51-fach
    (mMARCO-de) von `or`; nDCG@10 bei 1 000 000 nur +0.0007.
  - `hybrid`: auf mMARCO-de höchstens +0.0014.
  - `hybrid-expanded` (Lane des Owners) und `or-stem`: bei 1 000 000
    schlechter als `or` (−0.0042 und −0.0296).
- **Empfehlung Deutsch:** OR auf `unicode61` mit `STOPWORDS_DE`. Trigram
  bleibt eine Option für kleine Korpora mit vielen Komposita, kostet aber
  2.93-mal den Index und ein Mehrfaches der Latenz.

