/**
 * Relief presentation grouping and town highlights. Run: npm test
 */
import assert from 'node:assert/strict'
import { texasReliefConfig } from '@/lib/relief/states/texasRelief'
import { newJerseyReliefConfig } from '@/lib/relief/states/newJerseyRelief'
import {
  flattenStateGroupsForTest,
  getCountyReliefProgramGroups,
  getStateReliefProgramGroups,
} from '@/lib/relief/groupReliefPrograms'
import { getTownReliefHighlights } from '@/lib/relief/getTownReliefHighlights'

const txGroups = getStateReliefProgramGroups(texasReliefConfig)!
assert.equal(txGroups.calculatorAdjustable.length, 1)
assert.equal(txGroups.calculatorAdjustable[0].id, 'tx_homestead_residence')
assert.ok(txGroups.informationalFilingOrBenefit.some(p => p.id === 'tx_over_65_school_freeze'))
assert.ok(txGroups.informationalOther.some(p => p.id === 'tx_disabled_veteran_exemption'))
assert.equal(
  flattenStateGroupsForTest(txGroups).length,
  texasReliefConfig.programs.length,
  'state groups partition all programs'
)

const txCounty = getCountyReliefProgramGroups(texasReliefConfig)!
assert.equal(txCounty.calculatorAdjustable.length, 1)
assert.equal(txCounty.informational.length, 2)
assert.equal(txCounty.calculatorAdjustable[0].id, txGroups.calculatorAdjustable[0].id)

const njGroups = getStateReliefProgramGroups(newJerseyReliefConfig)!
assert.equal(njGroups.calculatorAdjustable.length, 2)
assert.equal(njGroups.informationalFilingOrBenefit.length, 3)
assert.equal(njGroups.informationalOther.length, 0)

const njTown = getTownReliefHighlights('new-jersey', 3)
assert.equal(njTown.length, 3)
assert.equal(njTown[0].modelingMode, 'calculator_adjustable')
assert.equal(njTown[1].modelingMode, 'calculator_adjustable')
assert.equal(njTown[2].modelingMode, 'informational_only')

const txTown = getTownReliefHighlights('texas', 3)
assert.equal(txTown.length, 3)
assert.equal(txTown[0].id, 'tx_homestead_residence')
assert.equal(txTown[1].id, 'tx_over_65_school_freeze')
assert.equal(txTown[2].id, 'tx_disabled_veteran_exemption')

const txTownCap1 = getTownReliefHighlights('texas', 1)
assert.equal(txTownCap1.length, 1)
assert.equal(txTownCap1[0].id, 'tx_homestead_residence')

console.log('[OK] reliefPresentation tests passed')
