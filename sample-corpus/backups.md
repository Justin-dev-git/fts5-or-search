# Backups

Hot backups of a growing database need the online backup api, not file copies
taken while writers are active. Verify each snapshot with an integrity check
and row counts before retiring the old copy. Keep backups on a second disk
and schedule them like any other routine maintenance task.
