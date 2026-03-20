/**
 * Runs all test modules (side-effect assertions + async suites). Usage: npm test
 */
import './resolveDisplayMetrics.test'
import './countyContent.test'
import './enrich-town-overview.test'
import './publishReadiness.test'
import './effectivePublishStatus.test'
import './rates-from-state.test'

import { runSitemapTownIndexableTests } from './sitemapTownIndexable.test'
import './seoPathToEntity.test'
import './seoCtrOpportunity.test'
import './seoImportCsv.test'
import './townMetadata.test'

async function main(): Promise<void> {
  await runSitemapTownIndexableTests()
  console.log('\n✓ All test suites passed\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
