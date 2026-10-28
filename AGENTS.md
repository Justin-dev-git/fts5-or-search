# AGENTS.md – Arbeitsregeln für Coding-Agenten in diesem Repo

Gilt für jeden Agenten, der hier Code ändert.

Vorrang bei Widerspruch:
1. aktuelle ausdrückliche Anweisung des Owners,
2. dieses Dokument,
3. Konventionen im vorhandenen Code.

## Rollen
- **Implementierender Agent:** setzt genau eine Task-Datei aus `tasks/` um.
- **Review:** Ein zweiter Agent prüft jeden Push unabhängig.
- **Owner:** gibt frei. Ohne seine Freigabe gibt es keine Merges, keine
  Default-Wechsel und keine Stufe-3-Aktionen.

## Ablauf pro Task (immer gleich)
1. `git fetch origin && git checkout <Arbeits-Branch aus der Task> && git pull --ff-only`
2. Die Task-Datei **vollständig** lesen. Nur diese eine Task bearbeiten.
3. Baseline: `npm run check -- tasks/<Datei>.md` ausführen und das Ergebnis
   notieren. Vor der Umsetzung ist dieser Lauf normalerweise rot.
4. Umsetzen. Ändern darfst du **nur** die Dateien unter „Erlaubte Dateien“.
5. Jeder Commit beginnt mit der Task-ID: `T7: <was und warum>`.
6. `npm run check -- tasks/<Datei>.md` muss am Ende `CHECK Tn: PASS`
   melden. **Höchstens 3 Versuche.** Danach stoppen und melden, was scheitert.
7. Pushen: `git push origin <Arbeits-Branch>`. Wird der Push abgelehnt
   (non-fast-forward): einmal `git pull --rebase`, dann Schritt 6
   wiederholen, dann erneut pushen. Niemals `--force`.
8. Report schreiben, genau in dieser Reihenfolge, ohne Einleitung:
   - A) `git log --oneline -5`
   - B) die **vollständige** Ausgabe des letzten `npm run check`-Laufs
   - C) Abweichungen und offene Punkte, oder „keine“
   
   Den Report als Datei außerhalb des Repos ablegen, z. B.
   `/tmp/report-Tn.md`, und als PR-Kommentar posten:
   `gh pr comment <Arbeits-Branch> --body-file /tmp/report-Tn.md`.
   Danach denselben Text im Chat ausgeben.
9. **STOPP.** Nicht mit der nächsten Task beginnen. Ausnahme: Der Owner nennt
   ausdrücklich mehrere Tasks in einer Reihenfolge („T8, dann T9“). Dann
   folgen nach jeder Task die Schritte 6–8. Bei `FAIL` wird sofort gestoppt.

Vor Schritt 1 muss `git status --short` leer sein. Lokale Arbeitsdateien
(Reports, Notizen, `*.queries.local.json`) gehören außerhalb des Repos oder in
gitignorierte Pfade. Niemals committen, nur damit der Baum sauber ist.

## Verboten ohne ausdrückliche Freigabe des Owners
- Dateien außerhalb von „Erlaubte Dateien“ ändern, auch „nur kurz“.
- Tests, Testdaten oder Schwellwerte ändern, damit etwas grün wird.
- `sudo`, `git push --force`, History umschreiben, Merges, Branches löschen.
- Irgendetwas unter `~/.openclaw/` schreiben oder ausführen.
- Neue Abhängigkeiten, Cloud- oder kostenpflichtige Dienste.
- Repo-Sichtbarkeit ändern.
- Persönliche Daten ins Repo schreiben: Namen, echte Queries aus privaten
  Korpora, Pfade aus Home-Verzeichnissen. Echte Queries gehören in die
  gitignorierten `*.queries.local.json`.

## Ehrlichkeit
- Keine erfundenen Testergebnisse, keine Erfolgsmeldung ohne Nachweis. Das
  Urteil fällt `npm run check`, nicht deine Zusammenfassung.
- Jede Zahl in README, CHANGELOG oder Commit stammt aus einem Befehl, der in
  dieser Sitzung gelaufen ist.
- Weichen Werte von den Referenzwerten der Task ab, meldest du die
  Abweichung. Zahlen oder Tests werden nicht angepasst.

## Ton
Commits, Kommentare und Doku beschreiben sachlich, was sich geändert hat und
warum. Keine Zielgruppen- oder Marketing-Formulierungen wie „recruiter-ready“,
„portfolio-ready“, „showcase“, „production-grade“ oder „battle-tested“.

## Task-Dateien
Vorlage: `tasks/TEMPLATE.md`. Eine Task kann aus mehreren nummerierten
Schritten bestehen. Arbeite sie in der angegebenen Reihenfolge ab, mit
mindestens einem Commit pro Schritt (`T9: Schritt 2 – …`). Die Prüfbefehle
stehen im `bash`-Block unter „## Prüfung“. Erwartete Ausgaben werden dort mit
`| grep -F "…"` geprüft, Schwellen mit Skript-Flags wie `--min-pair`.
