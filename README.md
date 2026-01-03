# Property Tax Calculator

A comprehensive Next.js application for calculating property taxes across multiple states. Currently supports New Jersey with an expandable architecture ready for all 50 states.

## 🚀 Features

- 🏠 Calculate property taxes for any supported state
- 📊 Visual breakdown of tax components with interactive charts
- 📈 5-year tax trend visualization
- 💰 Support for multiple property tax exemptions
- 🎯 SEO-optimized routes for states, counties, and municipalities
- 📱 Responsive design with dark mode support
- ⚡ Fast and efficient with Next.js 15 App Router
- 🔄 Expandable architecture for multi-state support

## 🛠 Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling with Typography plugin
- **Chart.js** - Data visualization
- **Vercel** - Deployment ready

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

## 📁 Project Structure

```
nj-property-tax-calculator/
├── app/
│   ├── layout.tsx                    # Root layout with metadata
│   ├── globals.css                   # Global styles
│   ├── page.tsx                      # Homepage
│   ├── api/
│   │   └── calculate-tax/
│   │       └── route.ts              # API endpoint for tax calculation
│   └── [state]/                      # Dynamic state routes
│       ├── property-tax-calculator/
│       │   └── page.tsx              # State-level calculator
│       └── [county]/
│           ├── property-tax-calculator/
│           │   └── page.tsx          # County-specific calculator
│           └── [town]/
│               └── page.tsx          # Municipality-specific calculator
├── components/
│   ├── TaxForm.tsx                   # Property tax form
│   ├── TaxResults.tsx                # Results display component
│   ├── CountyDropdown.tsx            # County selection dropdown
│   ├── MunicipalityDropdown.tsx     # Municipality selection dropdown
│   └── ChartWrapper.tsx              # Chart.js wrapper component
├── data/
│   ├── nj_county_rates.json          # New Jersey county tax rates
│   ├── nj_municipal_rates.json       # New Jersey municipal tax rates
│   └── nj_exemptions.json            # New Jersey exemptions
├── utils/
│   ├── calculateTax.ts               # Tax calculation logic
│   ├── getCountyRates.ts             # County rate utilities
│   ├── getMunicipalRates.ts          # Municipal rate utilities
│   ├── formatting.ts                 # Number/currency formatting
│   ├── seo.ts                        # SEO utilities
│   └── stateUtils.ts                 # State name formatting utilities
└── public/
    └── favicon.ico                   # Site favicon
```

## 🛣 Routes

### Current Routes (New Jersey)
- `/` - Homepage with overview
- `/new-jersey/property-tax-calculator` - Main calculator
- `/new-jersey/[county]/property-tax-calculator` - County-specific calculator
- `/new-jersey/[county]/[town]` - Municipality-specific calculator

### Dynamic State Routes (Expandable)
- `/[state]/property-tax-calculator` - State-level calculator
- `/[state]/[county]/property-tax-calculator` - County-specific calculator
- `/[state]/[county]/[town]` - Municipality-specific calculator

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

**Response:**
```json
{
  "homeValue": 500000,
  "countyRate": 2.31,
  "municipalRate": 0.34,
  "totalRate": 2.65,
  "annualTax": 13250,
  "monthlyTax": 1104.17,
  "effectiveRate": 2.65,
  "exemptions": 6250,
  "finalTax": 7000,
  "breakdown": {
    "base": 11550,
    "municipalAdjustment": 1700,
    "subtotal": 13250,
    "exemptions": 6250,
    "final": 7000
  },
  "trendData": {
    "years": ["2020", "2021", "2022", "2023", "2024"],
    "values": [13250, 13581, 13926, 14274, 14631]
  }
}
```

## 📊 Data Files

The application uses JSON files for tax rates and exemptions. These can be updated with current rates:

- `data/nj_county_rates.json` - New Jersey county tax rates
- `data/nj_municipal_rates.json` - New Jersey municipal tax rates by county
- `data/nj_exemptions.json` - Available exemptions and amounts

### Adding New States

To add a new state:

1. Create data files following the New Jersey pattern:
   - `data/[state]_county_rates.json`
   - `data/[state]_municipal_rates.json`
   - `data/[state]_exemptions.json`

2. Update `utils/stateUtils.ts` to include the new state in `isValidState()`

3. Update `utils/getCountyRates.ts` and `utils/getMunicipalRates.ts` to support the new state

4. The routes will automatically work with the new state slug!

## 🏗 Building for Production

```bash
# Build the application
npm run build

# Start the production server
npm start
```

The build process will:
- Optimize all assets
- Generate static pages where possible
- Create optimized production bundles
- Generate sitemap and metadata

## 🚀 Deployment

### Vercel (Recommended)

This project is optimized for Vercel deployment:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Configure Environment Variables (if needed):**
   - Add any required environment variables in Vercel dashboard
   - Redeploy if needed

4. **Deploy:**
   - Vercel will automatically deploy on every push to main
   - Preview deployments are created for pull requests

### Other Platforms

The application can also be deployed to:
- **Netlify** - Similar to Vercel, supports Next.js
- **AWS Amplify** - Full Next.js support
- **Railway** - Simple deployment
- **Docker** - Containerized deployment

## 🎨 Tailwind Configuration

The project includes Tailwind CSS with the Typography plugin for beautiful typography:

```js
// tailwind.config.js
plugins: [
  require('@tailwindcss/typography'),
]
```

Use the `prose` class for markdown content:
```jsx
<div className="prose dark:prose-invert">
  {/* Your content */}
</div>
```

## 🔍 SEO Features

- ✅ Dynamic metadata for each route
- ✅ Structured data (JSON-LD) for WebApplication schema
- ✅ Breadcrumb structured data
- ✅ Open Graph tags
- ✅ Semantic HTML structure
- ✅ Descriptive page titles and descriptions
- ✅ Canonical URLs (update with your domain)

## 🗺 Future Expansion Roadmap

### Phase 1: Core States (Q1 2025)
- [x] New Jersey (Complete)
- [ ] New York
- [ ] California
- [ ] Texas
- [ ] Florida

### Phase 2: Major States (Q2 2025)
- [ ] Pennsylvania
- [ ] Illinois
- [ ] Ohio
- [ ] Georgia
- [ ] North Carolina
- [ ] Michigan

### Phase 3: Remaining States (Q3-Q4 2025)
- [ ] All remaining 39 states
- [ ] State-specific exemptions and rules
- [ ] Historical tax data
- [ ] Comparison tools

### Phase 4: Advanced Features (2026)
- [ ] Multi-state comparison
- [ ] Property value estimation
- [ ] Tax savings calculator
- [ ] Mobile app
- [ ] API access for developers

## 🧪 Testing

```bash
# Run linting
npm run lint

# Type checking (if using TypeScript)
npx tsc --noEmit
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Adding a New State

See the "Adding New States" section above for detailed instructions.

## 📝 License

MIT License - feel free to use this project for your own purposes.

## ⚠️ Disclaimer

This calculator provides estimates based on available tax rate data. Actual property taxes may vary based on:
- Local assessment practices
- Recent rate changes
- Property-specific factors
- Exemption eligibility requirements

Please consult with a tax professional or your local tax assessor for accurate tax information.

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Submit a pull request
- Contact the maintainers

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- Chart.js for beautiful data visualizations
- All contributors and users

---

**Built with ❤️ using Next.js 15 and React 19**
