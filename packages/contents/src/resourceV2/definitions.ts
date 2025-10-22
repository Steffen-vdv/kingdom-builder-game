import type { ResourceV2Definition } from '@kingdom-builder/protocol';
import { resourceV2 } from '../config/builders';

export const RESOURCE_V2_DEFINITIONS = [
	resourceV2()
		.id('absorption')
		.name('Absorption')
		.icon('🌀')
		.description('Absorption reduces incoming damage by a percentage. It represents magical barriers or tactical advantages that soften blows.')
		.order(1)
		.percent()
		.bounds({ lower: 0, upper: 100 })
		.trackValueBreakdown()
		.trackBoundBreakdown()
		.tierTrack((track) =>
			track
				.id('absorption-tier')
				.title('Absorption Stability')
				.description('Keeps absorption within operational thresholds.')
				.tier((tier) =>
					tier
						.id('stable')
						.range(0, 49)
						.enterEffect({
							type: 'resource',
							method: 'add',
							params: { key: 'absorption', amount: 1 },
						})
						.exitEffect({
							type: 'resource',
							method: 'remove',
							params: { key: 'absorption', amount: 1 },
						})
						.passivePreview({ id: 'stable-preview', effects: [] })
						.text({
							summary: 'Stable',
							description: 'Absorption remains controlled.',
							removal: 'Stable effects cleared.',
						})
						.display({
							icon: 'icon-tier-stable',
							title: 'Stable',
							summaryToken: 'tiers.absorption.stable',
							removalCondition: 'Absorption >= 50',
						}),
				)
				.tier((tier) => tier.id('surge').range(50).text({ summary: 'Surge' })),
		)
		.groupId('defense')
		.metadata({ category: 'defense' })
		.build(),
	resourceV2()
		.id('fortificationStrength')
		.name('Fortification Strength')
		.icon('🛡️')
		.description('Fortification Strength measures the resilience of your defenses. It reduces damage taken when enemies assault your castle.')
		.order(2)
		.lowerBound(0)
		.trackValueBreakdown()
		.groupId('defense')
		.build(),
	resourceV2()
		.id('armyStrength')
		.name('Army Strength')
		.icon('⚔️')
		.description('Army Strength reflects the overall power of your military forces. A higher value makes your attacks more formidable.')
		.order(3)
		.lowerBound(0)
		.groupId('military')
		.build(),
	resourceV2()
		.id('growth')
		.name('Growth')
		.icon('📈')
		.description(
			'Growth increases Army and Fortification Strength during the Raise Strength step. Its effect scales with active Legions and Fortifiers—if you lack Legions or Fortifiers, that side will not gain Strength during the Growth phase.',
		)
		.order(4)
		.percent()
		.bounds({ lower: 0, upper: 200 })
		.groupId('military')
		.build(),
	resourceV2()
		.id('warWeariness')
		.name('War Weariness')
		.icon('💤')
		.description('War Weariness reflects the fatigue from prolonged conflict. High weariness can sap morale and hinder wartime efforts.')
		.order(5)
		.lowerBound(0)
		.groupId('military')
		.build(),
	resourceV2()
		.id('maxPopulation')
		.name('Max Population')
		.icon('👥')
		.description('Max Population determines how many subjects your kingdom can sustain. Expand infrastructure or build houses to increase it.')
		.order(6)
		.lowerBound(0)
		.trackBoundBreakdown()
		.groupId('populationCapacity')
		.metadata({ category: 'capacity' })
		.build(),
] satisfies ReadonlyArray<ResourceV2Definition>;

export type ResourceV2Id = (typeof RESOURCE_V2_DEFINITIONS)[number]['id'];
