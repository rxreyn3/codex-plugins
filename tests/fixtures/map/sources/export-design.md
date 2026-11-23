# Saved-document export — fictional Design

Revision: design-1. Entirely fictional; no product implementation or tests.
Design owns the intended behavior. The Plan below has not reached ready.

Approved design decision: the editor sends the exact saved revision identifier
with each export request. The exporter reads that revision and returns failure
when it is unavailable; it never silently switches to a newer revision.
This resolves the engineering question from research-1. Implementing revision
selection and checking failure behavior remain outstanding. No code has appeared.
Retention coordination and the request-owner retry/fallback choice remain open.
Export still leaves the saved document unchanged on failure. Existing document
saving is outside EXPORT-1. This is design progress, not delivery progress.
