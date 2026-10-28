# SQLite full text search

Fts5 stores its own inverted index inside the database file. The match
operator supports phrase queries and boolean combinations, and the rank
column orders results by bm25 relevance. A common mistake is joining every
query term with AND, which makes long user questions fail on the rarest word.
