/**
 * CTR opportunity scoring
 */
import assert from 'node:assert/strict'
import { computeCtrOpportunity } from '@/lib/seo/ctrOpportunity'

function run(): void {
  const high = computeCtrOpportunity({
    impressions: 200,
    clicks: 2,
    ctr: 0.01,
    averagePosition: 12,
    effectivelyPublished: true,
    entityType: 'town',
  })
  assert.equal(high.level, 'high')
  assert.ok(high.priorityScore > 50)

  const held = computeCtrOpportunity({
    impressions: 200,
    clicks: 2,
    ctr: 0.01,
    averagePosition: 12,
    effectivelyPublished: false,
    entityType: 'town',
  })
  assert.equal(held.level, 'high')
  assert.ok(held.priorityScore < high.priorityScore)

  const none = computeCtrOpportunity({
    impressions: 5,
    clicks: 1,
    ctr: 0.2,
    averagePosition: 5,
    effectivelyPublished: true,
  })
  assert.equal(none.level, 'none')

  console.log('[OK] seoCtrOpportunity tests passed')
}

run()
