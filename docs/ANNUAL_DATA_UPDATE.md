#Annual Property Tax Data Update Checklist

This document defines the annual, low-touch process for keeping property tax data current across states, counties, and towns.

The site is a planning & comparison tool, not an official tax authority.
Accuracy, transparency, and explainability matter more than real-time freshness.

##Update Frequency

Once per year per state (unless a major legislative change occurs).

###Typical cadence:

Data reflects the most recently published tax year (often released with a lag)

Updates usually occur Q1–Q3, depending on state reporting timelines

###Guiding Principles (Read First)

❌ Do not silently overwrite data

✅ Always preserve year context

❌ Do not rewrite copy unless facts changed materially

✅ Update numbers, labels, and metadata together

❌ Do not mass-request indexing

✅ Let Google re-crawl naturally after updates

###Pre-Update Checklist (Before Touching Data)

Confirm the new tax year is officially published

Verify source credibility (state dept. of taxation, assessor report, etc.)

Confirm whether values changed materially or only marginally

Check if exemption rules or methodology changed (rare but important)

If data is not clearly published yet → wait.

Step 1: Update JSON Data (Core Task)
For each affected state:

Open /data/states/{state}.json

Locate the metrics object for:

State

Counties

Towns (if applicable)

For each metric (example: averageResidentialTaxBill)

Append a new entry to the history array:

{
"year": 2025,
"value": 10642,
"unit": "USD",
"source": {
"name": "NJ Division of Taxation",
"reference": "Average Residential Tax Report"
}
}

Ensure:

Array length ≤ 5 (remove oldest if needed)

Entries are sorted by year (ascending)

Update asOfYear / currentYear pointer if present

🚫 Do not delete historical values.

Step 2: Copy & Page Content Verification

You usually do not need to rewrite copy.

Verify instead:

Pages say “As of Tax Year {YEAR}”

Disclaimers still match the data scope

Source citations still point to the correct authority

Only update copy if:

The taxing structure changed

A statement is no longer factually correct

Step 3: Calculator Validation

Load state calculator

Load at least 1 county page

Load at least 1 town page (if applicable)

Confirm:

Latest year is used for default calculations

Historical UI (if present) shows correct year/value pairs

No NaN / undefined values

Step 4: Schema & Data Integrity Checks

Run (or manually verify):

JSON validates against schema

All metrics include:

year

value

unit

source

No metric arrays exceed 5 entries

No missing asOfYear references

If you have a validation script:

npm run validate:data

Step 5: Sitemap & Metadata Hygiene

Confirm <lastmod> updates for pages where data changed

Do not change URLs

Do not submit new sitemaps unless structure changed

Ensure sitemap index still references all state sitemaps

Google will re-crawl naturally.

Step 6: Google Search Console (Light Touch)

In GSC:

Spot-check one updated page via URL Inspection

Confirm:

Page fetch successful

Indexing allowed

Canonical correct

🚫 Do not bulk request indexing.

Step 7: Optional Enhancements (Nice-to-Have)

Only if time allows:

Update “Last updated” labels

Add a short note to Methodology page:

“Updated with {YEAR} tax data”

Review GSC queries for new year-based searches

What NOT To Do

❌ Don’t chase real-time accuracy

❌ Don’t rewrite stable explanatory content yearly

❌ Don’t delete prior years

❌ Don’t flood GSC with indexing requests

❌ Don’t expand towns/states during the same PR unless planned

Expected Time Cost

Per state (once system is in place):

30–90 minutes

Mostly data entry + spot checks

This is intentional and sustainable.

Why This Matters (SEO & Trust)

Handled correctly, annual updates:

Reinforce freshness signals

Improve long-term authority

Encourage natural re-crawling

Reduce risk of “stale data” flags

Google prefers honest, versioned data over silent overwrites.

Summary

✔ Annual updates are expected
✔ They are controlled, not constant
✔ History is a feature, not a liability
✔ Clear years + sources = trust
