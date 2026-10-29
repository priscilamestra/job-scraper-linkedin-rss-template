# Setup and Manual Validation

## 1. Prepare your services

Use an n8n instance with the node types included in these JSON exports. Configure Google Sheets OAuth2, Google Drive OAuth2, Gmail OAuth2 for the optional email input, and Groq credentials inside n8n. Do not paste API secrets into workflow parameters.

Create a native Google Sheet from `Docs/job-tracker-template.xlsx`, using the exact tabs and A:Y column order documented in [SPREADSHEET.md](SPREADSHEET.md). Set a compatible day/month/year locale and the intended timezone. Create a Google Drive folder with exactly one active PDF resume.

## 2. Import the Job Saver first

Import `Workflows/TEMPLATE - 02 Job Saver LinkedIn.json`.

In **Config**, replace `YOUR_GOOGLE_SHEET_ID` and `YOUR_CV_ACTIVE_FOLDER_ID`. Set `timezone` to the intended IANA timezone. Keep the twelve `monthly_sheets` in calendar order and consistent across workflows. Optional `publication_start` and `publication_end` use YYYY-MM-DD; blank bounds allow any parseable publication date.

Select Google Sheets credentials in **Check Job IDs - All Months** and **Save New Job**, Google Drive credentials in **Find Active CV** and **Download Active CV**, and Groq credentials in **Groq Chat Model**. After importing, record this workflow's new n8n ID.

## 3. Configure RSS discovery

Import `Workflows/TEMPLATE - 01 Job Scraper LinkedIn.json`.

In **Resolve Search Plan**, replace `YOUR_FETCHRSS_FEED_URL_1` and `YOUR_SEARCH_KEYWORD_1`. Add one object per feed. Set optional `location`, `work_mode`, `max_age_hours`, and `timezone`. Empty `keywords` applies no additional keyword filtering.

In **Send to Job Saver**, replace `YOUR_JOB_SAVER_WORKFLOW_ID` with the newly imported saver. The exported disabled webhook has no connected downstream path; it is not a configured API endpoint. Use the manual trigger or configure the schedule after validation.

## 4. Configure Gmail alerts (optional)

Import `Workflows/TEMPLATE - 04 LinkedIn Job Alerts Gmail.json`.

Create the three labels you intend to use in Gmail, then enter their exact names in **Alert Configuration**: `source_label`, `processed_label`, `review_label`. An example naming scheme is `LinkedIn Job Alerts`, `LinkedIn Job Alerts - Processed`, `LinkedIn Job Alerts - Review`. A Gmail filter or manual labeling must put incoming alerts into the source label; the workflow does not create that filter.

Keep `allowed_sender` only if it matches the official sender of your actual alerts. Set `max_messages_per_run`, `timezone`, and optional `keyword_overrides`. The supplied override list is empty. Each mapping has `alert_identifier` and `search_keyword` fields.

Select Gmail credentials in all five Gmail nodes and your imported saver in **Send to Job Saver**. The current parser expects English LinkedIn alert markers and an English `posted on MM/DD/YYYY` subject. Localized alert formats are sent to review and need parser adaptation before use.

## 5. Configure recruiter messages

Import `Workflows/TEMPLATE - 03 Cover letter generator.json`.

Set **Config** to your spreadsheet, resume folder, timezone and monthly tabs. Select Google Sheets credentials in **Read All Monthly Sheets** and **Update Cover Letter**, Google Drive credentials in both Drive nodes, and Groq credentials in **Groq - Generate Cover Letter** and **Fact Check Cover Letter**.

The export selects `openai/gpt-oss-20b` for drafting and `openai/gpt-oss-120b` for factual review. The saver has its own model setting in **Groq Chat Model**. These are exported settings, not a guarantee of present availability or plan capacity. Adjust models in their respective nodes and validate the response shape after any change.

## 6. Configure retention (optional)

Import `Workflows/TEMPLATE - 05 Job Cleanup.json`.

In **Config**, set `spreadsheet_id`, `timezone`, `monthly_sheets`, `workbook_year`, `age_days` and `target_statuses`. Keep `dry_run: true` initially. Select Google Sheets credentials in **Read Monthly Cleanup Rows** and **Delete Expired Rows**.

The template scans all configured monthly tabs. It differs deliberately from the personal export, which scans September through December of its configured year. Deletion removes complete rows. Test on a disposable spreadsheet with representative rows before setting `dry_run: false`.

## 7. Validate in a disposable environment

Run `node tests/workflows.test.mjs` from the repository first. These offline tests require Node.js 18+ and make no service calls. Then validate the configured integrations using a separate spreadsheet and test alerts:

1. Manually run RSS for one configured feed. Inspect the saver result and the actual destination row.
2. Run the same job again and confirm no extra row appears. Repeat using a second input source to verify shared deduplication. Avoid overlapping saver runs.
3. Use publication dates inside, outside, and at the configured boundaries; confirm the expected monthly tab or skip output.
4. Label one representative LinkedIn email and manually run Gmail. Confirm job rows and the processed label independently. Test an unsupported alert format and confirm the review label.
5. On one disposable row, set `Qualified = Yeap`, supply Description, and leave U blank. Run the cover-letter workflow. Confirm that only U changed and that every claim is supported by the active resume.
6. Run cleanup with `dry_run: true`. Check proposed blocks, protected statuses, invalid dates, and oldest-row thresholds. Confirm that no rows changed. Test actual deletion only on the disposable copy.

Only after these checks should you enable chosen schedule triggers and publish/activate the workflows. All templates ship inactive with schedules disabled. Set the workflow settings timezone as well as each Config timezone. The timezone defaults to UTC; no personal location is assumed.

## Schedule examples included in the exports

| Workflow | Disabled schedule example |
|---|---|
| RSS | 07:00, 12:00, 18:00 |
| Gmail | Hourly at :15 |
| Recruiter messages | 08:00 to 20:00 every two hours |
| Cleanup | Daily at 03:40 |

These are editable examples. Stagger RSS and Gmail based on actual batch duration; a fixed schedule alone does not guarantee non-overlap.
