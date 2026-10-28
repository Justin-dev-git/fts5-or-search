# Incremental indexing pipelines

Index ingestion should be additive and idempotent. Replay-safe importers key
each row on a stable identifier and upsert, so a crashed run can simply be
re-executed. Large payloads are externalized to content-addressed storage when
they exceed a token budget.
