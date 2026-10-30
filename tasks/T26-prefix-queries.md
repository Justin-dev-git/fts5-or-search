# T26: Präfix-Abfragen auf dem normalen Index (deutsche Wortteile ohne Trigram-Index)

Stufe: 2 (Bench-Lane, Messung; Library nur, wenn die Bestätigung hält)
Arbeits-Branch: prefix-test-2026-10-30 (von master)
Voraussetzung: T25 gemergt.

## Ziel
Trigram hilft auf nativem Deutsch (WebFAQ-de +0,0304/+0,0239 nDCG@10), weil es Wortteile findet („Hund“ in
„Hundehalter“), kostet aber etwa das Dreifache an Indexgröße und das Sechs- bis Siebenfache an p95 (T25).
Erreichen FTS5-Präfix-Abfragen (`"hund"*`) auf dem `unicode61`-Index ohne zweiten Index einen ähnlichen Gewinn?

Erlaubte Dateien:
- scripts/beir-bench.mjs
- test/
- docs/VALIDATION.md
- docs/ZIEL.md
- README.md
- CHANGELOG.md

## Vorgaben
- Lane `or-prefix-<n>` (`--prefix-min <n,...>`): Wörter aus Buchstaben mit mindestens n Zeichen werden zu `"wort"*`,
  sonst wie `or`; `--stopwords lib`.
- **Abstimmung vor dem Test:** GermanDPR und der mMARCO-de-Abstimmungssplit aus T24 (Fragen 1 001–2 000) bei 10 000,
  100 000 und 1 000 000 Passagen; Gitter n = 4…8; gewählt wird das n mit dem höchsten mittleren ΔnDCG@10 gegen `or`
  (gleiche Gewichte). n = 5 läuft im Test als zweite, nicht gewählte Lane mit.
- **Test (nichts abgestimmt):** WebFAQ-de 100 000 und 891 201 (je 3 000 Fragen), mMARCO-de-Testfragen 1–1 000 bei
  10 000 / 100 000 / 1 000 000, GerDaLIRSmall (1 000 Fragen). GovService wurde vor der Abstimmung angesehen und wird
  nur getrennt als „gesehen“ berichtet. Lanes `and,or,or-trigram,or-prefix-4,or-prefix-5`, ein Lauf je Satz,
  `--repeat 2` (GovService 3).
- E5 je Größenklasse mit 95-%-Bootstrap-Intervallen, Δ aus den Werten pro Frage.

## Prüfung
```bash
git diff --quiet origin/master -- lib package.json
npm test
grep -F "## T26 – Prefix queries on the unicode61 index" docs/VALIDATION.md
! grep -nE "/home/|/Users/" docs/VALIDATION.md README.md
```

## Nicht Teil dieser Task
- Eine Library-Funktion für Präfix-Abfragen (folgt nur, wenn die Bestätigung hält).
