# T29: README „Relevantes zuerst“, Formatierung, Release 0.3.0

Stufe: 1 (nur Doku und Paketdaten; keine Messung, kein Code)
Arbeits-Branch: readme-structure-2026-10-31 (von master)
Voraussetzung: T27 gemergt.

## Ziel
Die README beginnt mit dem, was interessiert: Kurzfassung mit dem Kernbefund, Einleitung, Ergebnisse, Methode,
Fazit. Nutzung (Quick start, weitere Exports), Reproduktion und Entstehung stehen am Ende. Ergebnisse, die bisher im
Quick start standen, kommen zu den Ergebnissen; die einheimisch-deutschen Testsätze (WebFAQ-de, GerDaLIRSmall)
bekommen eine eigene Tabelle. Danach Release 0.3.0 (CHANGELOG datiert, Version in `package.json`).

Erlaubte Dateien:
- README.md
- CHANGELOG.md
- package.json

## Vorgaben
- Reihenfolge der Abschnitte zweiter Ebene: `Introduction`, `Results`, `Case study: OpenClaw memory and context`,
  `How to read the results`, `Conclusion`, `Quick start`, `Other exports`, `Reproduce`, `How this was built`,
  `License`. Überschriften aus T27 bleiben wörtlich erhalten.
- Keine neuen Aussagen über die Messungen hinaus; geprüfte Sätze aus T27 bleiben inhaltlich gleich. Jede Zahl der
  README steht in `docs/VALIDATION.md` oder `docs/ZIEL.md` (Ausnahmen nur Node-Version, Jahreszahlen, Codebeispiele).
- `package.json`: Version 0.3.0, Beschreibung auf den heutigen Stand. CHANGELOG: `## Unreleased` wird
  `## 0.3.0 (2026-10-31)`, mit Eintrag für T29.

## Prüfung
```bash
git diff --quiet origin/master -- lib scripts test docs
node -e "const t=require('fs').readFileSync('README.md','utf8');const want=['Introduction','Results','Case study: OpenClaw memory and context','How to read the results','Conclusion','Quick start','Other exports','Reproduce','How this was built','License'];const got=[...t.matchAll(/^## (.+)$/gm)].map(m=>m[1]);if(JSON.stringify(got)!==JSON.stringify(want)){console.error(got);process.exit(1)}"
node -e "const fs=require('fs');const strip=s=>s.replace(/\`\`\`[\s\S]*?\`\`\`/g,'');const r=strip(fs.readFileSync('README.md','utf8'));const ref=fs.readFileSync('docs/VALIDATION.md','utf8')+fs.readFileSync('docs/ZIEL.md','utf8');const ok=new Set(['22.13','2021','0.3.0','0.2.0']);const bad=[...new Set(r.match(/\d{1,3}(?: \d{3})+(?:\.\d+)?|\d+\.\d+(?:\.\d+)?|\d{3,}/g))].filter(n=>!ok.has(n)&&!ref.includes(n));if(bad.length){console.error(bad);process.exit(1)}"
grep -F '"version": "0.3.0"' package.json
grep -F "## 0.3.0 (2026-10-31)" CHANGELOG.md
! grep -F "## Unreleased" CHANGELOG.md
! grep -nE "/home/|/Users/" README.md
npm test
```

## Nicht Teil dieser Task
- npm-Veröffentlichung (kein Konto), Änderungen an `lib/`, Messungen, neue Empfehlungen.
- GitHub-Topics, Repo-Beschreibung, Git-Tag und GitHub-Release (nach dem Merge, außerhalb der Dateien).
