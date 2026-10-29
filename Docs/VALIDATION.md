# Local Validation Record

Validated on 2026-10-29. This record separates offline checks from integration execution.

## Checks completed

| Area | Result |
|---|---|
| Personal source exports | Five JSON files, 89 nodes, valid connections, existing node references, compilable Code nodes, empty pinData; source workflow logic left unchanged |
| Public workflow exports | Five inactive templates, no credential bindings or instance metadata, disabled schedules/webhook |
| Behavioral fixtures | 18 groups passed, using synthetic data and Node.js built-ins |
| Public configuration | Placeholder guards, configurable monthly tabs, optional publication bounds, explicit timezones, imported saver ID |
| RSS | URL normalization, keyword filtering, freshness enforcement, timezone formatting and duplicate selection |
| Shared saver | Original batch restoration after Config, 25-column row shape, twelve-month duplicate check, next-row allocation |
| Publication dates | Other years with blank bounds, inclusive configured boundaries, out-of-window rejection, missing dates, incoming alert fallback |
| Gmail | User-configured label lookup, missing-label errors, job extraction, repeated-link deduplication, review paths |
| Recruiter messages | Manual qualification gate, existing-output exclusion, empty-output rejection and exact U-cell URL |
| Retention | All configured months, physical row numbers, protected statuses, invalid dates, descending deletion blocks, exact 90-day threshold, timezone difference and dry-run branch |
| Tracker | Twelve calendar-ordered tabs, exact A:Y headers, blank body, Source includes LinkedIn Alert, filters A1:Y1000, frozen row 1 and A:B, existing dropdown categories retained |
| Live schema comparison | All twelve current monthly header rows were read and match the distributed 25-column contract; no live cells were edited |
| Workbook visual review | Original and revised vacancy/qualification column groups reviewed; purple header palette, widths and body layout retained |
| Privacy | Current distribution scanned against source workflow IDs, credential IDs, spreadsheet/folder IDs and private feed tokens; no matches |
| Existing XLSX residue | Thirty vacancy URL cells/hyperlink targets removed from the blank distribution; external hyperlinks absent after export |
| Documentation | Relative document and image links resolve; naming agrees with the intended repository |

## Reproduce

```bash
node tests/workflows.test.mjs
python tests/tracker.test.py
```

Node.js 18+ is sufficient for the workflow fixture suite. Python 3 uses only its standard library for the workbook package checks. No package installation, service credentials, or network access is required.

## Integration boundary

These checks do not run an n8n server or emulate its complete item-linking engine. They do not confirm n8n import compatibility, OAuth connections, current LinkedIn markup, Gmail variations, provider model availability, generated message quality, or Google Sheets conversion behavior.

No live n8n workflows, Gmail labels, or production spreadsheet cells were changed or executed for validation. The checks described here were run locally before publication. Before activation, follow the manual test sequence in SETUP.md using a disposable spreadsheet and representative inputs.

The original XLSX and source export snapshots remain local; this release does not rewrite Git history. The personal four-month retention/date policy remains intact. Generalization and safe import defaults apply only to the public template.
