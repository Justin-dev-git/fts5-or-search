# Re-ranking by term coverage

After wide retrieval, score each candidate by the fraction of query terms it
actually contains. Coverage dominates the original relevance order and pushes
rows that mention everything above rows that mention one loud word. The
original ranking only breaks ties.
