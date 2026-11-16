@AGENTS.md

## Nur für Claude Code
- Test-Gate: Ein Stop-Hook (`.claude/hooks/test-gate.mjs`) führt `npm test` aus,
  sobald sich der Arbeitsstand geändert hat, und hält bei Rot einmal an. Dann
  gilt AGENTS.md Schritt 6: beheben, höchstens 3 Versuche, sonst mit Ausgabe melden.
- Cloud-Sitzungen geben einen `claude/…`-Branch vor. Nennt die Task einen
  anderen Arbeits-Branch, vor Schritt 1 den Owner fragen, welcher gilt.
- Ist `gh` nicht nutzbar (Cloud-Sitzung), den Report aus Schritt 8 mit dem
  GitHub-MCP-Tool `add_issue_comment` an den PR des Arbeits-Branchs hängen.
  Gibt es keinen PR, keinen anlegen, sondern im Chat melden.
