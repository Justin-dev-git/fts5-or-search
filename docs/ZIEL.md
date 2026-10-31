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
| E5 | Eine Erweiterung gegenüber `or` wird nur übernommen, wenn sie auf einem **nicht abgestimmten** Datensatz bei nDCG@10 mindestens +0.01 erreicht, bei P@10 nicht schlechter ist, bei der p95-Latenz höchstens das 3-Fache von `or` **oder** höchstens 10 ms mehr als `or` braucht (es gilt das Größere; beide im selben Lauf gemessen) und höchstens etwa 50 Zeilen Library-Code kostet. E5 gilt **je Größenklasse** (seit T23): klein unter 50 000 Dokumente, mittel 50 000 bis 500 000, groß darüber. Eine Erweiterung wird für eine Klasse empfohlen, wenn sie E5 auf jedem nicht abgestimmten Testsatz dieser Klasse erfüllt. Wird ein Datensatz in mehreren Größen gemessen, zählt jede Größe als eigener Testsatz ihrer Klasse | Nutzen pro Aufwand |

**Änderung an E5 (30.10.2026, T22, im Auftrag des Owners):** Bis T21 galt
für die Latenz nur das 3-Fache von `or`. Bei kleinen Korpora entschieden damit
Unterschiede von Bruchteilen einer Millisekunde: Auf GovService liegt die
p95 von `or` bei 0.24 ms, die Grenze also bei 0.72 ms. Solche Unterschiede
sind weder spürbar noch zwischen zwei Läufen stabil. Die Untergrenze von
10 ms gilt rückwirkend für alle Messungen. Sie macht E5 nur nachsichtiger;
keine Empfehlung ändert sich dadurch (`docs/VALIDATION.md`, T22).

**Änderung an E5 (30.10.2026, T23, im Auftrag des Owners):** Bis T22
musste eine Erweiterung auf allen Testsätzen gleich welcher Größe halten.
Die Messungen bis 1 000 000 Abschnitte zeigen aber, dass Trigram und Stemmer
bei kleinen Korpora deutlich helfen und bei großen nicht. Deshalb wird je
Größenklasse entschieden. **Vorläufig:** Die Klassengrenzen wurden erst nach
den Messungen festgelegt. Bestätigt ist eine Klassenempfehlung erst mit
einem weiteren, unabhängigen Testsatz in dieser Klasse (für Deutsch „mittel“
z. B. GerDaLIR).

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

## Ergebnis nach T22 (30.10.2026)
- Mit der 10-ms-Untergrenze scheitern die deutschen Erweiterungen an der
  Qualität bei großem Korpus, nicht mehr an Millisekunden: Bei 1 000 000
  Abschnitten von mMARCO-de liegt jede unter +0.01 nDCG@10. `or-trigram`
  überschreitet zusätzlich ab 100 000 Abschnitten das Latenzbudget.
- `hybrid-expanded` erfüllt die messbaren Teile von E5 auf GermanDPR,
  GovService, mMARCO-de 10 000 und 100 000 und scheitert bei 1 000 000
  (−0.0042). Es braucht außerdem german-fts5-stemmer als Zusatzpaket.
- Englisch: Jede Erweiterung scheitert schon an nDCG@10; die Änderung wirkt
  dort nicht.
- Die Empfehlung bleibt für beide Sprachen OR mit FTS5-BM25.

## Ergebnis nach T23 (30.10.2026, vorläufig)
Alle Zahlen stammen aus `docs/VALIDATION.md`, Abschnitt T23.

- **Englisch:** OR auf `porter unicode61` in jeder Größenklasse. Keine
  Erweiterung erreicht irgendwo +0.01 (beste: `blendidf-0.1` +0.0037 bei
  1 000 000).
- **Deutsch, klein (unter 50 000 Dokumente):** OR auf einem Trigram-Index mit
  `STOPWORDS_DE`. `or-trigram` erfüllt E5 auf GermanDPR, GovService und
  mMARCO-de 10 000 (+0.0543, +0.0349, +0.0255) und braucht keinen
  Library-Code. `hybrid-expanded` und `hybrid-trigram` erfüllen es auch,
  sind aber nicht durchgehend besser oder brauchen den Stemmer als
  Zusatzpaket.
- **Deutsch, mittel und groß:** OR auf `unicode61` mit `STOPWORDS_DE`.
  Bei 100 000 erfüllt nur `hybrid-expanded` E5, auf einem Testsatz und mit
  Zusatzpaket; bei 1 000 000 keine Erweiterung.
- **Offen:** je Klasse ein weiterer, unabhängiger Testsatz (für „mittel“ z. B.
  GerDaLIR). Wächst ein deutscher Korpus über 50 000 Dokumente, braucht er
  einen neuen Index.

## Ergebnis nach T24 (30.10.2026)
Alle Zahlen stammen aus `docs/VALIDATION.md`, Abschnitt T24.

- **Adaptiver Stemmer** (`adaptive-stem-1000`): erweitert nur Anfragen, deren
  OR-Match höchstens 1 000 Dokumente trifft. Er erfüllt die messbaren Teile
  von E5 auf jedem nicht abgestimmten Testsatz in jeder Größenklasse
  (+0.0121 bis +0.0397 nDCG@10), bei 10 000, 100 000 und 1 000 000 mit
  95-%-Intervallen über null, bei fast gleicher Latenz wie `or`. τ wurde auf
  einem eigenen Split gewählt.
- Er braucht german-fts5-stemmer als Laufzeitabhängigkeit. Das schließt der
  Nicht-Ziel-Absatz oben aus; ob das so bleibt, entscheidet der Owner.
- **Adaptives Trigram** bringt nichts über `or-trigram` hinaus und liegt bei
  1 000 000 unter `or`.
- **Auflösung:** Mit 1 000 Fragen sind Unterschiede unter etwa ±0.016
  nDCG@10 bei 100 000 und 1 000 000 nicht von Rauschen zu unterscheiden. Die
  Klassenaussagen von T23 für „mittel“ und „groß“ sind daher schwach belegt.

## Ergebnis nach T26 (30.10.2026)
Alle Zahlen stammen aus `docs/VALIDATION.md`, Abschnitt T26.

- **Präfix-Abfragen auf dem normalen Index** (`or-prefix-4`: Wörter ab 4
  Buchstaben als `"wort"*`): erfüllen die messbaren Teile von E5 auf 5 von 6
  nicht abgestimmten Testsätzen (+0.0174 bis +0.0409 nDCG@10, Intervalle über
  null) und auf GovService (gesehen), ohne zweiten Index und innerhalb des
  Latenzbudgets.
- Je Größenklasse: „mittel“ und „groß“ halten (je 2 von 2), „klein“ nicht –
  GerDaLIRSmall (Anfragen in Absatzlänge) gewinnt nichts, wie schon Trigram.
- Auf mMARCO-de signifikant besser als Trigram, auf WebFAQ-de gleichauf, bei
  einem Bruchteil der Latenz und der Indexgröße.
- Grenze: Präfixe finden Komposita, die mit dem Suchwort beginnen, nicht
  solche, die damit enden („Ausweis“ → „Personalausweis“).
- Nächster Schritt laut Task: Library-Option und Empfehlung getrennt (nicht
  Teil von T26).

## Ergebnis nach T31 (31.10.2026)
Alle Zahlen stammen aus `docs/VALIDATION.md`, Abschnitte T26 und T31.

- **Library-Option:** `buildOrMatch(q, { stopwords, prefixMin: 4 })` macht jedes
  Wort aus nur Buchstaben ab 4 Zeichen zu `"wort"*`, alles andere bleibt exakt;
  vier Code-Zeilen in `buildOrMatch` (zwei neu). Die Bench-Lane `or-prefix-4`
  nutzt sie und liefert für jede Frage dasselbe Ergebnis wie in T26 (0 von 3 000
  Fragen auf WebFAQ-de 100 000, 0 von 1 000 auf mMARCO-de 1 000 000).
- **E5 für `or-prefix-4` in „mittel“ und „groß“ erfüllt:** die messbaren Teile
  auf allen vier nicht abgestimmten Testsätzen dieser Klassen (T26: +0.0393,
  +0.0330, +0.0174, +0.0281 nDCG@10, Intervalle über null, P@10 nie schlechter,
  p95 im Budget; in den T31-Läufen wieder im Budget), der Code-Teil mit der
  Library-Option. „Klein“ hält weiterhin nicht (GerDaLIRSmall +0.0003).
- **Empfehlung Deutsch ab 50 000 Dokumenten:**
  `buildOrMatch(q, { stopwords: STOPWORDS_DE, prefixMin: 4 })` auf `unicode61`.
  Unter 50 000 Dokumenten unverändert (Trigram, vorläufig).
- **FTS5-Präfix-Index** (`prefix='…'` beim Anlegen): ändert keine Rangfolge,
  kostet das 1.21- bis 1.82-Fache der Indexgröße und senkt die Latenz von
  `or-prefix-4` nicht konsistent. FTS5 nutzt ihn nur für Präfixe genau der
  konfigurierten Länge; `prefix='4'` bedient 7.0 bis 8.7 % der Präfix-Wörter.
  Keine Empfehlung.
