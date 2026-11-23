# Saved-document export — fictional Research

Revision: research-1. This entire example is invented for acceptance testing.
There is no real product, repository inspection, deployment or test result.

In the fictional baseline the editor already saves named document revisions and
shows existing saved documents. Export and download are agreed additions. They
must use a saved revision and leave the saved document unchanged on failure.
The exporter and downloadable file do not exist in this fictional baseline.

Engineering must determine how an export selects a stable document revision.
The document owner must coordinate how long generated files can be retained.
The request owner must choose whether a failed export offers retry alone or
retry plus a download of the last successful export. Both are feasible in this
fictional design: retry reruns the saved revision; the alternative also requires
retaining a previous generated file and clearly displaying its older revision.
Retry alone uses less retained output but offers no immediate fallback. Showing
the last file offers immediate access but risks confusing an older export with
the current revision. Neither choice is settled. Investigate before recommending.

Normal intended journey: editor requests export; exporter reads the selected
saved document; exporter creates a downloadable file. Failure journey: exporter
fails and returns a visible error to the editor; saved document remains intact.
EXPORT-1 owns the exporter and downloadable result, not existing document saving.
The saved document is an outside prerequisite because export reads its revision.
