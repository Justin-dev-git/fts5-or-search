# Writing honest retrieval benchmarks

Report hit rate and mean reciprocal depth, not vibes. Exclude cases the
corpus cannot answer so the denominator stays honest, and publish the query
set with expected evidence. Prefer worst-of-N timings because a single lucky
run flatters cold caches.
