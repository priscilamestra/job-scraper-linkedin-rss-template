# Spreadsheet Contract

Use `job-tracker-template.xlsx` as a blank distribution workbook. Upload it to Google Drive, open it with Google Sheets, and save/convert it as a native Google Sheets spreadsheet. Configure the ID of that new spreadsheet, not the XLSX file ID.

## Monthly tabs

JANEIRO, FEVEREIRO, MARÇO, ABRIL, MAIO, JUNHO, JULHO, AGOSTO, SETEMBRO, OUTUBRO, NOVEMBRO, DEZEMBRO.

Tabs are ordered January through December. The workflows rely on the exact names. If the template `monthly_sheets` list changes, use the same twelve names in calendar order in every workflow. Do not reuse one yearless monthly tracker across different years without an explicit publication window or annual rollover policy.

## Columns

| Column | Header | Purpose |
|---|---|---|
| A | Job ID | LinkedIn identifier; deduplication key |
| B | Status | Application lifecycle |
| C | Date Scraped | Capture timestamp; cleanup reference |
| D | Source | RSS.app, FetchRSS, or LinkedIn Alert |
| E | Search KeyWord | Feed / alert search label |
| F | Date Posted | Publication date |
| G | Title | Vacancy title |
| H | Work Mode | Remote, Hybrid, On-site |
| I | URL | Canonical vacancy link |
| J | Company Name | Employer |
| K | Location | Geographic location |
| L | Description | Vacancy facts and requirements |
| M | Language | English, Portuguese |
| N | Payment | Hourly, Fixed-price, Weekly, Monthly, Annual, Not specified |
| O | Time Type | Part-time, Full-time |
| P | Job Type | Long-term, Contract, Freelance, CLT, PJ, Temporary, Internship |
| Q | Experience | Senior, Mid, Specialist, Junior, Intern, Lead |
| R | Salary | Source-supported compensation text |
| S | Match | Low, Medium, High |
| T | Qualified | Nope / Yeap; human decision |
| U | Cover  Letter | Fact-checked recruiter message |
| V | Notes | Manual notes |
| W | Interview At | Interview scheduling |
| X | Invite Meet | Meeting reference |
| Y | Attended | Boolean attendance |

`Cover  Letter` deliberately retains two spaces in the existing header. Readers use fixed column positions. Do not insert or reorder columns without adapting every affected workflow.

Status values: To do, Applying, Applied, Closed, Mismatch, Not selected, Selected, Interview, Offer, Hired.

## Dates and retention

C and F display `dd/mm/yyyy hh:mm`. Date-only publication values may be written as literal text to preserve precision. Cleanup reads C as formatted values and accepts `dd/mm/yyyy` with optional time. In the public template, a configured workbook year is used only when the year is absent.

Set the Google Sheets locale to one that interprets day/month/year correctly (for example United Kingdom or Brazil), and set its timezone consistently with the workflows. Test the formatted C value before enabling cleanup. The template workflow defaults to UTC; the personal export uses its existing production timezone conventions.

## Excel distribution limits

The workbook contains no job records, personal URLs, or application messages. Formatting and dropdowns follow the existing tracker. The Source dropdown now includes LinkedIn Alert. All twelve tabs have filters A1:Y1000, frozen row 1 and columns A:B.

Excel list validation is single-select. Google Sheets multi-select chips and native checkboxes are not reproduced exactly by XLSX. Y uses a TRUE/FALSE dropdown. Multiple payment or job-type values written by the workflow may require restoring multi-select dropdown behavior after conversion. Validation behavior and filters should be checked in the converted Google Sheet before use.

The supplied rows extend to 1000. Extend formatting, filters, and validations together when growing the tracker.
