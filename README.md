# NJ Property Tax Calculator

A comprehensive Next.js application for calculating property taxes. Currently supports **New Jersey** with an expandable architecture ready for additional states.

## 🚀 Features

- 🏠 Calculate property taxes for any supported state
- 📊 Visual breakdown of tax components with interactive charts (Chart.js & Recharts)
- 📈 5-year tax trend visualization
- 💰 Support for multiple property tax exemptions
- 🎯 SEO-optimized routes for states, counties, and municipalities
- 📱 Responsive design with **dark mode** support
- ⚡ Fast and efficient with Next.js 15 App Router
- 🔄 Expandable architecture for multi-state support
- 📄 **Sitemaps** – auto-generated sitemap index and per-state sitemaps with `lastmod`
- 🤖 **robots.txt** – configurable crawl rules and sitemap reference
- 📧 **Feedback form** – optional email delivery via Resend (see [FEEDBACK_SETUP.md](./FEEDBACK_SETUP.md))
- 🍎 **Favicon set** – favicon.ico, PNG sizes, and Apple touch icon (generated from `public/logo-icon.png`)
- 📈 **Analytics (optional)** – GA4 page views + custom events, Microsoft Clarity; no-op when env vars are unset

## 🛠 Tech Stack

- **Next.js 15** – React framework with App Router
- **React 19** – UI library
- **TypeScript** – Type safety
- **Tailwind CSS** – Styling with Typography plugin
- **Chart.js** & **Recharts** – Data visualization
- **Resend** – Optional feedback email delivery
- **Vercel** – Deployment ready

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Git (for cloning)

## 🚀 Getting Started

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd nj-property-tax-calculator
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Analytics (optional)

Copy [.env.example](.env.example) to `.env.local` and set:

- **NEXT_PUBLIC_GA4_ID** – Google Analytics 4 measurement ID (format: `G-XXXXXXXXXX`)
- **NEXT_PUBLIC_CLARITY_ID** – Microsoft Clarity project ID (format: `abc123xyz`)

If either is missing, that integration is skipped (no errors). Custom events are sent to GA4 and can be viewed under **Reports → Engagement → Events**. Event names: `select_county`, `select_town`, `calculate_tax`, `view_town_page`, `feedback_submit`. Clarity sessions may take a couple of minutes to appear in the dashboard.

## 📁 Project Structure

```
nj-property-tax-calculator/
├── app/
│   ├── layout.tsx                    # Root layout with metadata & favicon
│   ├── globals.css                   # Global styles
│   ├── page.tsx                      # Homepage
│   ├── robots.ts                     # robots.txt (crawl rules, sitemap ref)
│   ├── sitemap.xml/route.ts          # Sitemap index
│   ├── sitemaps/[name]/route.ts      # Per-sitemap (static, states, state towns)
│   ├── api/
│   │   ├── calculate-tax/route.ts    # API endpoint for tax calculation
│   │   └── feedback/route.ts         # Feedback form submission (Resend)
│   ├── about/                        # About page
│   ├── faq/                          # FAQ page
│   ├── methodology/                  # Methodology page
│   ├── privacy/                      # Privacy policy
│   ├── feedback/                     # Feedback form page
│   ├── blog/[slug]/                  # Blog posts
│   ├── [state]/                      # Dynamic state routes
│   │   ├── property-tax-calculator/page.tsx
│   │   └── [county]/
│   │       ├── page.tsx              # County overview
│   │       ├── property-tax-calculator/page.tsx
│   │       └── [town]/page.tsx       # Town page
│   └── [state]/                      # Dynamic state routes (e.g. /new-jersey, /texas)
│       ├── page.tsx
│       ├── property-tax-calculator/page.tsx
│       ├── property-tax-rates/page.tsx
│       └── [county]/
│           ├── page.tsx
│           ├── towns/page.tsx
│           ├── property-tax-calculator/page.tsx
│           └── [town]/page.tsx
├── components/
│   ├── TaxForm.tsx, TaxResults.tsx   # Calculator UI
│   ├── CountyDropdown.tsx, MunicipalityDropdown.tsx
│   ├── charts/                       # CalculatorTaxTrendsChart, etc.
│   ├── landing/                      # Hero, Features, FAQ, CTA, Feedback
│   ├── location/                     # LocationDirectory, LocationFAQ
│   ├── town/                         # TownAtAGlance, TownOverview
│   ├── site/                         # Header, Footer, Logo
│   ├── theme/                        # ThemeProvider, ThemeToggle
│   ├── seo/                          # JsonLd
│   └── ui/                           # Accordion, Badge, Button, Card, etc.
├── lib/
│   ├── data/                         # Adapter, types, metrics, town-helpers
│   ├── geo.ts                        # getStateData, state registry
│   ├── sitemaps.ts                   # Sitemap URL generation, lastmod
│   ├── site.ts                       # SITE_URL
│   ├── jsonld.ts, seo.ts
│   └── town-overview/                # Build, format, validate overviews
├── data/
│   ├── states/new-jersey.json        # Canonical NJ state data (counties, towns, metrics)
│   ├── nj_county_rates.json          # NJ county tax rates (calculator)
│   ├── nj_municipal_rates.json       # NJ municipal tax rates (calculator)
│   ├── nj_exemptions.json            # NJ exemptions
│   ├── faqData.ts, countyFaqData.ts, townFaqData.ts
│   └── schema/state-data.schema.json # State data JSON schema
├── utils/
│   ├── calculateTax.ts, getCountyRates.ts, getMunicipalRates.ts
│   ├── formatting.ts, seo.ts, stateUtils.ts, stateData.ts
│   └── locationUtils.ts
├── scripts/                          # Data pipeline & validation (see below)
├── docs/
│   ├── ANNUAL_DATA_UPDATE.md         # Yearly data update checklist
│   └── YEAR_AWARE_DATA_MODEL.md      # Data model notes
└── public/
    ├── favicon.ico                   # Multi-size favicon
    ├── favicon-16x16.png, favicon-32x32.png
    ├── apple-touch-icon.png          # 180×180
    └── logo-icon.png, logo-*.svg    # Source for favicons
```

## 🛣 Routes

### Static & info

- `/` – Homepage
- `/about` – About
- `/faq` – FAQ
- `/methodology` – Methodology
- `/privacy` – Privacy policy
- `/feedback` – Feedback form
- `/blog/[slug]` – Blog posts

### New Jersey

- `/:state` – State overview (`/new-jersey`, `/texas`, …)
- `/:state/property-tax-calculator` – State-scoped calculator
- `/:state/property-tax-rates` – Tax rates overview
- `/:state/[county]` – County overview
- `/:state/[county]/towns` – County towns list
- `/:state/[county]/property-tax-calculator` – County calculator
- `/:state/[county]/[town]` – Town page (at-a-glance, overview)
- `/property-tax-calculator` – Primary calculator (multi-state)

### Dynamic state (expandable)

- `/[state]/property-tax-calculator` – State-level calculator
- `/[state]/[county]/property-tax-calculator` – County calculator
- `/[state]/[county]/[town]` – Town page

### SEO & crawlability

- `/sitemap.xml` – Sitemap index (links to static and state sitemaps)
- `/sitemaps/[name]` – Individual sitemaps (static pages, state overview, state towns)
- `/robots.txt` – Allow `/`, disallow `/api/`, `/_next/`; references sitemap
- Favicons at `/favicon.ico`, `/favicon-32x32.png`, `/favicon-16x16.png`, `/apple-touch-icon.png` (declared in `app/layout.tsx` metadata)

## 🔌 API Endpoints

### POST `/api/calculate-tax`

Calculate property tax based on input parameters.

**Request Body:**

```json
{
  "homeValue": 500000,
  "county": "Bergen",
  "town": "Ridgewood",
  "propertyType": "single_family",
  "exemptions": ["senior_freeze", "veteran"]
}
```

**Response:** (structure as in original README – annual tax, breakdown, trend data, etc.)

### POST `/api/feedback`

Submit feedback form. Optional email delivery via Resend when `RESEND_API_KEY` and related env vars are set. See [FEEDBACK_SETUP.md](./FEEDBACK_SETUP.md).

## 📊 Data Files

- **Calculator rates:** `data/nj_county_rates.json`, `data/nj_municipal_rates.json`, `data/nj_exemptions.json` – used by the tax calculator.
- **Canonical state data:** `data/states/new-jersey.json` – counties, towns, metrics, overviews, sources. Used for routing, town pages, and sitemaps. See [docs/ANNUAL_DATA_UPDATE.md](./docs/ANNUAL_DATA_UPDATE.md) and [docs/YEAR_AWARE_DATA_MODEL.md](./docs/YEAR_AWARE_DATA_MODEL.md).

## 📜 Scripts (data pipeline & tooling)

Scripts live in `scripts/`. For **run order and details**, see [scripts/RUNNING-SCRIPTS.md](./scripts/RUNNING-SCRIPTS.md) and [scripts/README.md](./scripts/README.md).

| Script                    | npm script                 | Purpose                                                               |
| ------------------------- | -------------------------- | --------------------------------------------------------------------- |
| Source Tier-1 metrics     | `scrape-town-metrics`      | Fetch effective tax rate + median home value (Census, NJ PDFs)        |
| Merge Tier-1 metrics      | `merge-town-metrics`       | Merge into `data/states/new-jersey.json`                              |
| Source avg tax bill       | `source-avg-tax-bill`      | Fetch county/town average residential tax bill                        |
| Merge avg tax bill        | `merge-avg-tax-bill`       | Merge into state JSON                                                 |
| Apply town overviews      | `apply-town-overviews`     | Build standardized `town.overview` from metrics                       |
| Validate state data       | `validate:data`            | Validate state JSON structure and constraints                         |
| Validate Tier-1 overviews | `validate:tier1-overviews` | Check Tier-1 towns have metrics/overview (use `--report` for summary) |
| Validate sitemap          | `validate:sitemap`         | Check sitemap URLs (no duplicates, expected routes)                   |
| Generate favicons         | `generate-favicons`        | Generate favicon set from `public/logo-icon.png`                      |

Run favicon generation after changing the logo:

```bash
npm run generate-favicons
```

## 🏗 Building for Production

```bash
npm run build
npm start
```

The build will optimize assets, generate static pages where possible, and produce the sitemap index and metadata.

## 🚀 Deployment

### Vercel (recommended)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com). Next.js is auto-detected.
2. Set environment variables if needed (e.g. `NEXT_PUBLIC_SITE_URL`, Resend keys for feedback – see [FEEDBACK_SETUP.md](./FEEDBACK_SETUP.md)).
3. Deploy; Vercel deploys on push and creates previews for PRs.

The app can also be deployed to Netlify, AWS Amplify, Railway, or Docker.

## 🔍 SEO Features

- Dynamic metadata per route
- Structured data (JSON-LD) for WebApplication and breadcrumbs
- Open Graph and Twitter tags
- Semantic HTML
- Canonical URLs (via `SITE_URL` / `NEXT_PUBLIC_SITE_URL`)
- Sitemap index and per-state sitemaps with `lastmod`
- `robots.txt` with sitemap reference; favicons declared in layout metadata and not blocked

## Adding a New State

1. **Add state data:** Create `data/states/[state-slug].json` following the New Jersey shape (see `data/schema/state-data.schema.json`). Optionally add `data/[state]_county_rates.json`, `[state]_municipal_rates.json`, `[state]_exemptions.json` for the calculator.
2. **Register state:** In `lib/geo.ts`, import the JSON and add the state to `stateDataRegistry` (use `normalizeStateData` from `@/lib/data/adapter`).
3. **Calculator:** Update `utils/getCountyRates.ts` and `utils/getMunicipalRates.ts` (or equivalent) to support the new state if using separate rate files.
4. **Routes:** Dynamic routes `/[state]/...` and sitemaps will pick up the new state from `getStateData()`.

## 🧪 Testing & validation

```bash
npm run lint
npx tsc --noEmit
npm run validate:data
npm run validate:sitemap
npm run validate:tier1-overviews
npm run validate:tier1-overviews:report
```

## 🗺 Future expansion

- **More states** – Add state JSON and register in `lib/geo.ts` (see above).
- **Multi-state comparison, property value estimation, tax savings tools, API access** – possible future enhancements.

## 🤝 Contributing

1. Fork the repo and create a feature branch.
2. Make changes and run lint/validation scripts.
3. Open a Pull Request.

## 📝 License

MIT License – use this project for your own purposes.

## ⚠️ Disclaimer

This calculator provides **estimates** based on available tax rate data. Actual property taxes may vary. Consult a tax professional or your local assessor for accurate information.

## 📞 Support

- Open an issue or pull request on GitHub.
- See [FEEDBACK_SETUP.md](./FEEDBACK_SETUP.md) for feedback form and email setup.

---

**Built with Next.js 15 and React 19**
