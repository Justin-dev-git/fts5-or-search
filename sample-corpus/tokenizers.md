# Choosing a tokenizer

A tokenizer decides how documents and queries are cut into index tokens.
Diacritic folding, case folding and hyphen handling differ between tokenizers
and silently change which queries match. Measure the tokenizer with probes
instead of assuming its behavior from documentation.
