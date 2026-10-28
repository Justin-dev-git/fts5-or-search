# Stemming and tokenization

Search engines fold inflected word forms onto a stem so that running matches
ran. English ships with porter stemmers, but many languages have no built-in
stemmer at all. Query-side expansion adds word variants without touching the
index, so recall improves while old fingerprints stay valid.
