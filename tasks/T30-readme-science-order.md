# T30: README in Science-Reihenfolge (Methode ans Ende des Hauptteils)

Stufe: 1 (nur Doku; keine Messung, kein Code)
Arbeits-Branch: readme-science-2026-10-31 (von master)
Voraussetzung: T29 gemergt.

## Ziel
Der Hauptteil folgt der Reihenfolge von Science/Nature: Kurzfassung, Einleitung, Ergebnisse (mit Fallstudie),
Fazit, danach Methode und Glossar. Nutzung, Reproduktion und Entstehung bleiben am Ende. Kein „Related work“ und kein
Literaturverzeichnis (keine Studie; Quellen und Lizenzen stehen in `docs/VALIDATION.md`). Die Fallstudie sagt
ausdrücklich, dass das Repo eine Bibliothek ist und kein OpenClaw-Plugin.

Erlaubte Dateien:
- README.md
- CHANGELOG.md

## Vorgaben
- Reihenfolge der Abschnitte zweiter Ebene: `Introduction`, `Results`, `Case study: OpenClaw memory and context`,
  `Conclusion`, `How to read the results`, `Quick start`, `Other exports`, `Reproduce`, `How this was built`, `License`.
- Inhalte nur verschoben; einzige neue Aussage: der Satz zur Abgrenzung in der Fallstudie. Jede Zahl der README steht
  in `docs/VALIDATION.md` oder `docs/ZIEL.md`. Inhaltsverzeichnis in der neuen Reihenfolge.
- CHANGELOG: Eintrag unter `## Unreleased` (Doku, kein Release).

## Prüfung
```bash
git diff --quiet origin/master -- lib scripts test docs package.json
node -e "const t=require('fs').readFileSync('README.md','utf8');const want=['Introduction','Results','Case study: OpenClaw memory and context','Conclusion','How to read the results','Quick start','Other exports','Reproduce','How this was built','License'];const got=[...t.matchAll(/^## (.+)$/gm)].map(m=>m[1]);if(JSON.stringify(got)!==JSON.stringify(want)){console.error(got);process.exit(1)}"
node -e "const fs=require('fs');const strip=s=>s.replace(/\`\`\`[\s\S]*?\`\`\`/g,'');const r=strip(fs.readFileSync('README.md','utf8'));const ref=fs.readFileSync('docs/VALIDATION.md','utf8')+fs.readFileSync('docs/ZIEL.md','utf8');const ok=new Set(['22.13','2021','0.3.0','0.2.0']);const bad=[...new Set(r.match(/\d{1,3}(?: \d{3})+(?:\.\d+)?|\d+\.\d+(?:\.\d+)?|\d{3,}/g))].filter(n=>!ok.has(n)&&!ref.includes(n));if(bad.length){console.error(bad);process.exit(1)}"
node -e "const t=require('fs').readFileSync('README.md','utf8');const c=t.split('\n').find(l=>l.startsWith('Contents:'));const block=t.slice(t.indexOf('Contents:'),t.indexOf('## Introduction'));const i=block.indexOf('#conclusion'),j=block.indexOf('#how-to-read-the-results');if(!(i>0&&j>i)){console.error('contents order');process.exit(1)}"
grep -F "not an OpenClaw plugin" README.md
grep -F "## Unreleased" CHANGELOG.md
! grep -nE "/home/|/Users/" README.md
npm test
```

## Nicht Teil dieser Task
- Related work, Literaturverzeichnis, neue Messungen, Release.
